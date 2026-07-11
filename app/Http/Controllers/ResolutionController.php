<?php

namespace App\Http\Controllers;

use App\Domain\Resolutions\Actions\ResolutionAccess;
use App\Domain\Resolutions\Actions\SubmitResolution;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Domain\Resolutions\Exceptions\ResolutionInvariantException;
use App\Http\Requests\Resolutions\StoreResolutionRequest;
use App\Http\Requests\Resolutions\UpdateResolutionRequest;
use App\Models\LegalCase;
use App\Models\Resolution;
use App\Models\ResolutionDecision;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ResolutionController extends Controller
{
    public function create(LegalCase $case, Request $request, ResolutionAccess $access): Response
    {
        abort_unless($access->canSubmit($request->user(), $case), 403);
        abort_if($case->resolution()->exists(), 409, 'This case already has a Resolution.');

        return Inertia::render('Resolutions/Form', [
            'mode' => 'create',
            'caseRecord' => ['id' => $case->id, 'docket_number' => $case->docket_number],
            'resolution' => null,
            'verdicts' => ResolutionVerdict::submittableValues(),
            'denial_comments' => [],
        ]);
    }

    public function store(StoreResolutionRequest $request, LegalCase $case, SubmitResolution $resolutions): RedirectResponse
    {
        try {
            $resolution = $resolutions->create($case, $request->validated(), $request->user(), $request);
        } catch (ResolutionInvariantException $exception) {
            return back()->withErrors(['resolution' => $exception->getMessage()])->withInput();
        }

        return redirect()->route('resolutions.show', $resolution);
    }

    public function show(Resolution $resolution, Request $request, ResolutionAccess $access): Response
    {
        abort_unless($access->canView($request->user(), $resolution), 403);
        $resolution->load(['case.assignedProsecutor.staffProfile', 'createdBy.staffProfile', 'revisions.submittedBy.staffProfile', 'decisions.decidedBy.staffProfile']);

        return Inertia::render('Resolutions/Show', [
            'resolution' => $this->detail($resolution),
            'revisions' => $this->revisions($resolution),
            'decisions' => $this->decisions($resolution),
            'can_revise' => $access->canRevise($request->user(), $resolution),
        ]);
    }

    public function edit(Resolution $resolution, Request $request, ResolutionAccess $access): Response
    {
        abort_unless($access->canRevise($request->user(), $resolution), 403);
        $resolution->load(['case', 'decisions.decidedBy.staffProfile']);

        return Inertia::render('Resolutions/Form', [
            'mode' => 'edit',
            'caseRecord' => ['id' => $resolution->case->id, 'docket_number' => $resolution->case->docket_number],
            'resolution' => $this->detail($resolution),
            'verdicts' => ResolutionVerdict::submittableValues(),
            'denial_comments' => $this->decisions($resolution, true),
        ]);
    }

    public function update(UpdateResolutionRequest $request, Resolution $resolution, SubmitResolution $resolutions): RedirectResponse
    {
        try {
            $resolutions->revise(
                $resolution,
                $request->validated(),
                $request->user(),
                (int) $request->validated('revision_number'),
                $request,
            );
        } catch (ResolutionInvariantException $exception) {
            return back()->withErrors(['resolution' => $exception->getMessage()])->withInput();
        }

        return redirect()->route('resolutions.show', $resolution);
    }

    /** @return array<string, mixed> */
    private function detail(Resolution $resolution): array
    {
        $resolution->loadMissing(['case', 'createdBy.staffProfile', 'revisions.submittedBy.staffProfile']);
        $currentRevision = $resolution->revisions->firstWhere('revision_number', $resolution->revision_number);

        return [
            'id' => $resolution->id,
            'case_id' => $resolution->case_id,
            'docket_number' => $resolution->case->docket_number,
            'verdict' => $this->verdictValue($resolution->verdict),
            'court' => $resolution->court,
            'verdict_date' => $this->dateString($resolution->verdict_date),
            'status' => $this->statusValue($resolution->status),
            'revision_number' => $resolution->revision_number,
            'created_by' => $resolution->createdBy?->staffProfile?->displayName() ?? $resolution->createdBy?->username,
            'submitted_by' => $currentRevision?->submittedBy?->staffProfile?->displayName() ?? $currentRevision?->submittedBy?->username,
            'report_eligible' => $resolution->isReportEligible(),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function revisions(Resolution $resolution): array
    {
        return $resolution->revisions->sortByDesc('revision_number')->map(fn ($revision): array => [
            'revision_number' => $revision->revision_number,
            'verdict' => $this->verdictValue($revision->verdict),
            'court' => $revision->court,
            'verdict_date' => $this->dateString($revision->verdict_date),
            'submitted_by' => $revision->submittedBy?->staffProfile?->displayName() ?? $revision->submittedBy?->username,
            'submitted_at' => $this->isoString($revision->submitted_at),
        ])->values()->all();
    }

    /** @return list<array<string, mixed>> */
    private function decisions(Resolution $resolution, bool $denialsOnly = false): array
    {
        return $resolution->decisions
            ->when($denialsOnly, fn ($decisions) => $decisions->where('decision', ResolutionStatus::Denied))
            ->sortByDesc('decided_at')
            ->map(fn (ResolutionDecision $decision): array => [
                'revision_number' => $decision->revision_number,
                'decision' => $this->statusValue($decision->decision),
                'comment' => $decision->comment,
                'decided_by' => $decision->decidedBy?->staffProfile?->displayName() ?? $decision->decidedBy?->username,
                'decided_at' => $this->isoString($decision->decided_at),
            ])->values()->all();
    }

    private function verdictValue(mixed $verdict): string
    {
        return $verdict instanceof ResolutionVerdict ? $verdict->value : (string) $verdict;
    }

    private function statusValue(mixed $status): string
    {
        return $status instanceof ResolutionStatus ? $status->value : (string) $status;
    }

    private function dateString(mixed $value): ?string
    {
        return $value === null || $value === '' ? null : Carbon::parse($value)->toDateString();
    }

    private function isoString(mixed $value): ?string
    {
        return $value === null || $value === '' ? null : Carbon::parse($value)->toISOString();
    }
}
