<?php

namespace App\Domain\Documents;

use App\Domain\Documents\Exceptions\DocumentInvariantException;
use App\Jobs\GenerateSubpoenaPdf;
use App\Models\CaseParty;
use App\Models\GeneratedDocument;
use App\Models\LegalCase;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RequestSubpoenaDocument
{
    public function __construct(
        private readonly DocumentAccess $access,
        private readonly AuditRecorder $audit,
    ) {}

    public function request(LegalCase $case, User $actor, ?Request $request = null): GeneratedDocument
    {
        $document = DB::transaction(function () use ($case, $actor, $request): GeneratedDocument {
            /** @var User $actor */
            $actor = User::query()->lockForUpdate()->findOrFail($actor->id);
            /** @var LegalCase $case */
            $case = LegalCase::query()->lockForUpdate()->findOrFail($case->id);

            if (! $this->access->canGenerate($actor, $case)) {
                throw new DocumentInvariantException('This Subpoena document cannot be generated.');
            }

            $case->load(['parties', 'offenses', 'assignedProsecutor.staffProfile']);
            $actor->load('staffProfile');

            $version = ((int) GeneratedDocument::query()
                ->where('case_id', $case->id)
                ->where('document_type', 'Subpoena')
                ->max('version')) + 1;

            $document = GeneratedDocument::create([
                'case_id' => $case->id,
                'document_type' => 'Subpoena',
                'template_version' => 'legacy-v1',
                'version' => $version,
                'render_payload' => $this->capture($case, $actor),
                'requested_by' => $actor->id,
                'requested_at' => now(),
            ]);

            $this->audit->record('document.subpoena.requested', $actor, LegalCase::class, $case->id, [
                'document_id' => $document->id,
                'version' => $version,
                'template_version' => 'legacy-v1',
            ], $request);

            return $document;
        });

        GenerateSubpoenaPdf::dispatch($document->id);

        return $document->refresh();
    }

    /** @return array<string, mixed> */
    private function capture(LegalCase $case, User $actor): array
    {
        $prosecutor = $case->assignedProsecutor->staffProfile;
        $requester = $actor->staffProfile;

        return [
            'docket_number' => $case->docket_number,
            'date' => Carbon::parse($case->date)->toDateString(),
            'hearing_date_1' => Carbon::parse($case->hearing_date_1)->format('Y-m-d H:i:s'),
            'hearing_date_2' => $case->hearing_date_2 === null ? null : Carbon::parse($case->hearing_date_2)->format('Y-m-d H:i:s'),
            'police_station' => $case->police_station,
            'pin' => $case->pin_document_secret,
            'prosecutor' => [
                'first_name' => $prosecutor->first_name,
                'last_name' => $prosecutor->last_name,
            ],
            'staff_name' => trim(collect([
                $requester?->first_name,
                $requester?->last_name,
                $requester?->suffix,
            ])->filter()->implode(' ')) ?: $actor->username,
            'offenses' => $case->offenses->sortBy('name')->pluck('name')->values()->all(),
            'parties' => $case->parties->sortBy('position')->map(fn (CaseParty $party): array => [
                'role' => $party->getRawOriginal('role'),
                'position' => $party->position,
                'first_name' => $party->first_name,
                'middle_name' => $party->middle_name,
                'last_name' => $party->last_name,
                'suffix' => $party->suffix,
                'barangay' => $party->barangay,
                'municipality' => $party->municipality,
                'province' => $party->province,
            ])->values()->all(),
        ];
    }
}
