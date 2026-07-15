<?php

namespace App\Http\Controllers;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Cases\Queries\SecretaryVerificationQuery;
use App\Domain\Documents\DocumentAccess;
use App\Domain\Resolutions\Actions\ResolutionAccess;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Http\Requests\SecretaryVerificationRequest;
use App\Models\LegalCase;
use App\Models\ResolutionDecision;
use App\Models\SubpoenaDecision;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class SecretaryVerificationController extends Controller
{
    public function __invoke(
        SecretaryVerificationRequest $request,
        SecretaryVerificationQuery $query,
        CaseAccess $caseAccess,
        ResolutionAccess $resolutionAccess,
        DocumentAccess $documentAccess,
    ): Response {
        /** @var User $secretary */
        $secretary = $request->user();
        $secretary->loadMissing('secretaryAssignment');
        $validated = $request->validated();
        $tab = (string) ($validated['tab'] ?? 'subpoenas');
        $filters = [
            'search' => trim((string) ($validated['search'] ?? '')),
            'status' => (string) ($validated['status'] ?? ''),
            'sort' => (string) ($validated['sort'] ?? ($tab === 'resolutions' ? 'docket_number' : 'date')),
            'direction' => (string) ($validated['direction'] ?? 'desc'),
        ];

        if ($tab === 'resolutions') {
            $items = $query->resolutions($secretary, $filters)
                ->through(fn (LegalCase $case): array => $this->resolutionRow($case, $secretary, $resolutionAccess));
        } else {
            $items = $query->subpoenas($secretary, $filters)
                ->through(fn (LegalCase $case): array => $this->subpoenaRow($case, $secretary, $caseAccess, $documentAccess));
        }

        return Inertia::render('Secretary/Verification/Index', [
            'tab' => $tab,
            'filters' => $filters,
            'items' => $items,
            'statuses' => $tab === 'resolutions'
                ? ResolutionStatus::values()
                : [SubpoenaStatus::Pending->value, SubpoenaStatus::Approved->value, SubpoenaStatus::Denied->value],
        ]);
    }

    /** @return array<string, mixed> */
    private function subpoenaRow(LegalCase $case, User $secretary, CaseAccess $access, DocumentAccess $documents): array
    {
        $status = $this->subpoenaStatus($case->subpoena_status);
        $denial = $status === SubpoenaStatus::Denied->value
            ? $case->subpoenaDecisions->first(fn (SubpoenaDecision $decision): bool => $decision->revision_number === $case->revision_number
                && $this->subpoenaStatus($decision->decision) === SubpoenaStatus::Denied->value)
            : null;

        return [
            ...$this->caseFields($case),
            'subpoena_status' => $status,
            'revision_number' => $case->revision_number,
            'denial_reason' => $denial?->comment,
            'created_by' => $this->userName($case->createdBy),
            'workflow_label' => match ($status) {
                SubpoenaStatus::Denied->value => 'Revision required',
                SubpoenaStatus::Pending->value => 'Waiting for Prosecutor review',
                default => 'Completed',
            },
            'can_revise' => $access->canRevise($secretary, $case),
            'can_generate_pdf' => $documents->canGenerate($secretary, $case),
        ];
    }

    /** @return array<string, mixed> */
    private function resolutionRow(LegalCase $case, User $secretary, ResolutionAccess $access): array
    {
        $resolution = $case->resolution;
        if ($resolution === null) {
            return [
                ...$this->caseFields($case),
                'resolution_id' => null,
                'resolution_verdict' => null,
                'resolution_status' => null,
                'court' => null,
                'revision_number' => null,
                'submitted_by' => null,
                'denial_reason' => null,
                'workflow_label' => 'Submission required',
                'can_submit' => $access->canSubmit($secretary, $case),
                'can_revise' => false,
            ];
        }

        $status = $this->resolutionStatus($resolution->status);
        $resolution->setRelation('case', $case);
        $currentRevision = $resolution->revisions->firstWhere('revision_number', $resolution->revision_number);
        $denial = $status === ResolutionStatus::Denied->value
            ? $resolution->decisions->first(fn (ResolutionDecision $decision): bool => $decision->revision_number === $resolution->revision_number
                && $this->resolutionStatus($decision->decision) === ResolutionStatus::Denied->value)
            : null;

        return [
            ...$this->caseFields($case),
            'resolution_id' => $resolution->id,
            'resolution_verdict' => $this->resolutionVerdict($resolution->verdict),
            'resolution_status' => $status,
            'court' => $resolution->court,
            'revision_number' => $resolution->revision_number,
            'submitted_by' => $this->userName($currentRevision?->submittedBy),
            'denial_reason' => $denial?->comment,
            'workflow_label' => match ($status) {
                ResolutionStatus::Denied->value => 'Revision required',
                ResolutionStatus::Pending->value => 'Waiting for Administrator review',
                default => 'Completed',
            },
            'can_submit' => false,
            'can_revise' => $access->canRevise($secretary, $resolution),
        ];
    }

    /** @return array<string, mixed> */
    private function caseFields(LegalCase $case): array
    {
        return [
            'case_id' => $case->id,
            'docket_number' => $case->docket_number,
            'offenses' => $case->offenses->pluck('name')->values()->all(),
            'complainants' => $case->parties->where('role', PartyRole::Complainant)->pluck('last_name')->values()->all(),
            'respondents' => $case->parties->where('role', PartyRole::Respondent)->pluck('last_name')->values()->all(),
            'police_station' => $case->police_station,
            'date' => Carbon::parse($case->date)->toDateString(),
            'assigned_prosecutor' => $this->userName($case->assignedProsecutor),
        ];
    }

    private function userName(?User $user): ?string
    {
        return $user?->staffProfile?->displayName() ?? $user?->username;
    }

    private function subpoenaStatus(mixed $status): string
    {
        return $status instanceof SubpoenaStatus ? $status->value : (string) $status;
    }

    private function resolutionStatus(mixed $status): string
    {
        return $status instanceof ResolutionStatus ? $status->value : (string) $status;
    }

    private function resolutionVerdict(mixed $verdict): string
    {
        return $verdict instanceof ResolutionVerdict ? $verdict->value : (string) $verdict;
    }
}
