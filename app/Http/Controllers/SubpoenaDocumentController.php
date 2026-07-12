<?php

namespace App\Http\Controllers;

use App\Domain\Documents\DocumentAccess;
use App\Domain\Documents\RequestSubpoenaDocument;
use App\Models\GeneratedDocument;
use App\Models\LegalCase;
use App\Support\AuditRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

class SubpoenaDocumentController extends Controller
{
    public function store(LegalCase $case, Request $request, DocumentAccess $access, RequestSubpoenaDocument $documents): RedirectResponse
    {
        abort_unless($access->canGenerate($request->user(), $case), 403);
        $document = $documents->request($case, $request->user(), $request);

        return redirect()->route('cases.show', $case)
            ->with('status', $document->generated_at === null ? 'Subpoena PDF generation queued.' : 'Subpoena PDF generated.');
    }

    public function show(LegalCase $case, GeneratedDocument $document, Request $request, DocumentAccess $access, AuditRecorder $audit): Response
    {
        abort_unless($document->case_id === $case->id && $access->canView($request->user(), $document), 403);
        abort_if($document->generated_at === null || $document->disk === null || $document->storage_path === null, 409, 'Subpoena PDF is still being generated.');

        $bytes = Storage::disk($document->disk)->get($document->storage_path);
        if (! is_string($bytes) || ! hash_equals((string) $document->sha256, hash('sha256', $bytes))) {
            throw new RuntimeException('Stored Subpoena PDF checksum verification failed.');
        }

        $audit->record('document.subpoena.viewed', $request->user(), LegalCase::class, $case->id, [
            'document_id' => $document->id,
            'version' => $document->version,
        ], $request);

        $filename = 'subpoena_'.$case->docket_number.'.pdf';

        return response($bytes, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
