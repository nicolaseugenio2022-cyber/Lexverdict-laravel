<?php

namespace App\Http\Controllers;

use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Resolutions\Actions\DecideResolution;
use App\Domain\Resolutions\Actions\ResolutionAccess;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Domain\Resolutions\Exceptions\ResolutionInvariantException;
use App\Domain\Resolutions\Queries\ResolutionReviewQuery;
use App\Http\Requests\Resolutions\ApproveResolutionRequest;
use App\Http\Requests\Resolutions\DenyResolutionRequest;
use App\Models\CaseParty;
use App\Models\Resolution;
use App\Models\ResolutionDecision;
use App\Models\ResolutionRevision;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ResolutionReviewController extends Controller
{
    public function index(Request $request, ResolutionReviewQuery $reviews, ResolutionAccess $access): Response
    {
        abort_unless($access->canAccessReviewQueue($request->user()), 403);

        $resolutions = $reviews->paginate($request)->through(fn (Resolution $resolution): array => $this->queueRow($resolution));

        return Inertia::render('Reviews/Resolutions/Index', [
            'resolutions' => $resolutions,
            'filters' => [
                'search' => (string) $request->query('search', ''),
                'sort' => (string) $request->query('sort', 'verdict_date'),
                'direction' => (string) $request->query('direction', 'asc'),
            ],
        ]);
    }

    public function show(Resolution $resolution, Request $request, ResolutionAccess $access): Response
    {
        abort_unless($access->canAccessReviewQueue($request->user()), 403);
        $resolution->load(['case.assignedProsecutor.staffProfile', 'case.parties', 'case.offenses', 'createdBy.staffProfile', 'revisions.submittedBy.staffProfile', 'decisions.decidedBy.staffProfile']);
        $revisions = $resolution->revisions->sortByDesc('revision_number')->values();
        /** @var ResolutionRevision|null $current */
        $current = $revisions->first();
        /** @var ResolutionRevision|null $previous */
        $previous = $revisions->skip(1)->first();

        return Inertia::render('Reviews/Resolutions/Show', [
            'resolution' => $this->detail($resolution),
            'currentRevision' => $this->revision($current),
            'previousRevision' => $this->revision($previous),
            'decisionHistory' => $this->decisions($resolution),
            'can_review' => $access->canReview($request->user(), $resolution),
        ]);
    }

    public function approve(ApproveResolutionRequest $request, Resolution $resolution, DecideResolution $decisions): RedirectResponse
    {
        try {
            $decisions->approve($resolution, $request->user(), (int) $request->validated('revision_number'), $request);
        } catch (ResolutionInvariantException $exception) {
            return back()->withErrors(['decision' => $exception->getMessage()]);
        }

        return redirect()->route('resolutions.show', $resolution);
    }

    public function deny(DenyResolutionRequest $request, Resolution $resolution, DecideResolution $decisions): RedirectResponse
    {
        try {
            $decisions->deny(
                $resolution,
                $request->user(),
                (int) $request->validated('revision_number'),
                (string) $request->validated('comment'),
                $request,
            );
        } catch (ResolutionInvariantException $exception) {
            return back()->withErrors(['decision' => $exception->getMessage()]);
        }

        return redirect()->route('resolutions.show', $resolution);
    }

    /** @return array<string, mixed> */
    private function queueRow(Resolution $resolution): array
    {
        $currentRevision = $resolution->revisions->firstWhere('revision_number', $resolution->revision_number);

        return [
            'id' => $resolution->id,
            'case_id' => $resolution->case_id,
            'docket_number' => $resolution->case->docket_number,
            'verdict' => $this->verdictValue($resolution->verdict),
            'court' => $resolution->court,
            'verdict_date' => $this->dateString($resolution->verdict_date),
            'revision_number' => $resolution->revision_number,
            'submitted_by' => $currentRevision?->submittedBy?->staffProfile?->displayName() ?? $currentRevision?->submittedBy?->username,
            'assigned_prosecutor' => $resolution->case->assignedProsecutor?->staffProfile?->displayName() ?? $resolution->case->assignedProsecutor?->username,
            'offenses' => $resolution->case->offenses->pluck('name')->values()->all(),
            'complainants' => $this->partyLastNames($resolution, PartyRole::Complainant),
            'respondents' => $this->partyLastNames($resolution, PartyRole::Respondent),
        ];
    }

    /** @return array<string, mixed> */
    private function detail(Resolution $resolution): array
    {
        return [
            ...$this->queueRow($resolution),
            'status' => $this->statusValue($resolution->status),
            'police_station' => $resolution->case->police_station,
        ];
    }

    /** @return array<string, mixed>|null */
    private function revision(?ResolutionRevision $revision): ?array
    {
        if ($revision === null) {
            return null;
        }

        return [
            'revision_number' => $revision->revision_number,
            'verdict' => $this->verdictValue($revision->verdict),
            'court' => $revision->court,
            'verdict_date' => $this->dateString($revision->verdict_date),
            'submitted_by' => $revision->submittedBy?->staffProfile?->displayName() ?? $revision->submittedBy?->username,
            'submitted_at' => $this->isoString($revision->submitted_at),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function decisions(Resolution $resolution): array
    {
        return $resolution->decisions->sortByDesc('decided_at')->map(fn (ResolutionDecision $decision): array => [
            'revision_number' => $decision->revision_number,
            'decision' => $this->statusValue($decision->decision),
            'comment' => $decision->comment,
            'decided_by' => $decision->decidedBy?->staffProfile?->displayName() ?? $decision->decidedBy?->username,
            'decided_at' => $this->isoString($decision->decided_at),
        ])->values()->all();
    }

    /** @return list<string> */
    private function partyLastNames(Resolution $resolution, PartyRole $role): array
    {
        return $resolution->case->parties
            ->filter(fn (CaseParty $party): bool => $this->partyRoleValue($party->role) === $role->value)
            ->pluck('last_name')->values()->all();
    }

    private function partyRoleValue(mixed $role): string
    {
        return $role instanceof PartyRole ? $role->value : (string) $role;
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
