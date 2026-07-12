<?php

namespace App\Jobs;

use App\Domain\Documents\SubpoenaPdfRenderer;
use App\Models\GeneratedDocument;
use App\Models\LegalCase;
use App\Support\AuditRecorder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class GenerateSubpoenaPdf implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 120;

    public bool $failOnTimeout = true;

    public function __construct(public readonly string $documentId)
    {
        $this->onQueue('documents');
    }

    /** @return list<object> */
    public function middleware(): array
    {
        return [(new WithoutOverlapping('subpoena-document-'.$this->documentId))->dontRelease()->expireAfter(300)];
    }

    public function handle(SubpoenaPdfRenderer $renderer, AuditRecorder $audit): void
    {
        $document = GeneratedDocument::query()
            ->with(['case', 'requestedBy.staffProfile'])
            ->findOrFail($this->documentId);

        if ($document->generated_at !== null || $document->failed_at !== null) {
            return;
        }

        $bytes = $renderer->render($document);
        if ($bytes === '' || ! str_starts_with($bytes, '%PDF-')) {
            throw new RuntimeException('Subpoena PDF generation produced an invalid document.');
        }

        $disk = (string) config('operations.document_disk');
        $path = "documents/subpoenas/{$document->case_id}/v{$document->version}.pdf";
        $temporaryPath = "documents/subpoenas/{$document->case_id}/.tmp/{$document->id}-".Str::uuid().'.pdf';
        if (! Storage::disk($disk)->put($temporaryPath, $bytes)) {
            throw new RuntimeException('Subpoena PDF could not be stored.');
        }

        $promoted = false;
        try {
            DB::transaction(function () use ($document, $disk, $path, $temporaryPath, $bytes, $audit, &$promoted): void {
                /** @var GeneratedDocument $locked */
                $locked = GeneratedDocument::query()->lockForUpdate()->findOrFail($document->id);
                if ($locked->generated_at !== null || $locked->failed_at !== null) {
                    return;
                }

                Storage::disk($disk)->delete($path);
                if (! Storage::disk($disk)->move($temporaryPath, $path)) {
                    throw new RuntimeException('Subpoena PDF could not be promoted to private storage.');
                }
                $promoted = true;

                $locked->update([
                    'disk' => $disk,
                    'storage_path' => $path,
                    'sha256' => hash('sha256', $bytes),
                    'byte_size' => strlen($bytes),
                    'generated_at' => now(),
                ]);

                $audit->record('document.subpoena.generated', $document->requestedBy, LegalCase::class, $document->case_id, [
                    'document_id' => $document->id,
                    'version' => $document->version,
                    'template_version' => $document->template_version,
                    'sha256' => hash('sha256', $bytes),
                    'byte_size' => strlen($bytes),
                ]);
            });
        } catch (Throwable $exception) {
            if ($promoted) {
                Storage::disk($disk)->delete($path);
            }
            throw $exception;
        } finally {
            Storage::disk($disk)->delete($temporaryPath);
        }
    }

    public function failed(Throwable $exception): void
    {
        DB::transaction(function (): void {
            /** @var GeneratedDocument|null $document */
            $document = GeneratedDocument::query()->with('requestedBy')->lockForUpdate()->find($this->documentId);
            if ($document === null || $document->generated_at !== null || $document->failed_at !== null) {
                return;
            }

            $document->update(['failed_at' => now()]);
            app(AuditRecorder::class)->record('document.subpoena.failed', $document->requestedBy, LegalCase::class, $document->case_id, [
                'document_id' => $document->id,
                'version' => $document->version,
                'template_version' => $document->template_version,
            ]);
        });
    }
}
