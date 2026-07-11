<?php

namespace App\Http\Controllers;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Cases\Actions\DecideSubpoena;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Cases\Exceptions\CaseDataInvariantException;
use App\Domain\Cases\Queries\SubpoenaReviewQuery;
use App\Http\Requests\Cases\ApproveSubpoenaRequest;
use App\Http\Requests\Cases\DenySubpoenaRequest;
use App\Models\CaseParty;
use App\Models\LegalCase;
use App\Models\SubpoenaRevision;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class SubpoenaReviewController extends Controller
{
    public function index(Request $request, SubpoenaReviewQuery $reviews, CaseAccess $access): Response
    {
        abort_unless($access->canAccessReviewQueue($request->user()), 403);

        $cases = $reviews->paginate($request->user(), $request)
            ->through(fn (LegalCase $case): array => $this->queueRow($case));

        return Inertia::render('Reviews/Subpoenas/Index', [
            'cases' => $cases,
            'filters' => [
                'search' => (string) $request->query('search', ''),
                'sort' => (string) $request->query('sort', 'date'),
                'direction' => (string) $request->query('direction', 'asc'),
            ],
        ]);
    }

    public function show(LegalCase $case, Request $request, CaseAccess $access): Response
    {
        abort_unless($access->canViewReview($request->user(), $case), 403);

        $case->load(['createdBy.staffProfile', 'assignedProsecutor.staffProfile', 'offenses', 'parties', 'subpoenaRevisions.submittedBy.staffProfile', 'subpoenaDecisions.decidedBy.staffProfile']);
        $revisions = $case->subpoenaRevisions->sortByDesc('revision_number')->values();
        /** @var SubpoenaRevision|null $current */
        $current = $revisions->first();
        /** @var SubpoenaRevision|null $previous */
        $previous = $revisions->skip(1)->first();

        return Inertia::render('Reviews/Subpoenas/Show', [
            'caseRecord' => $this->reviewDetail($case),
            'currentRevision' => $this->revision($current),
            'previousRevision' => $this->revision($previous),
            'decisionHistory' => $case->subpoenaDecisions->sortByDesc('decided_at')->values()->map(fn ($decision): array => [
                'revision_number' => $decision->revision_number,
                'decision' => $this->statusValue($decision->decision),
                'comment' => $decision->comment,
                'decided_by' => $decision->decidedBy?->staffProfile?->displayName() ?? $decision->decidedBy?->username,
                'decided_at' => $this->isoString($decision->decided_at),
            ])->all(),
            'can_review' => $access->canReview($request->user(), $case),
        ]);
    }

    public function approve(ApproveSubpoenaRequest $request, LegalCase $case, DecideSubpoena $decisions): RedirectResponse
    {
        try {
            $decisions->approve($case, $request->user(), (int) $request->validated('revision_number'), $request);
        } catch (CaseDataInvariantException $exception) {
            return back()->withErrors(['decision' => $exception->getMessage()]);
        }

        return redirect()->route('cases.show', $case);
    }

    public function deny(DenySubpoenaRequest $request, LegalCase $case, DecideSubpoena $decisions): RedirectResponse
    {
        try {
            $decisions->deny(
                $case,
                $request->user(),
                (int) $request->validated('revision_number'),
                (string) $request->validated('comment'),
                $request,
            );
        } catch (CaseDataInvariantException $exception) {
            return back()->withErrors(['decision' => $exception->getMessage()]);
        }

        return redirect()->route('cases.show', $case);
    }

    /** @return array<string, mixed> */
    private function queueRow(LegalCase $case): array
    {
        return [
            'id' => $case->id,
            'docket_number' => $case->docket_number,
            'date' => $this->dateString($case->date),
            'police_station' => $case->police_station,
            'revision_number' => $case->revision_number,
            'created_by_name' => $case->createdBy?->staffProfile?->displayName() ?? $case->createdBy?->username,
            'offenses' => $case->offenses->pluck('name')->values()->all(),
            'complainants' => $this->partyLastNames($case, PartyRole::Complainant),
            'respondents' => $this->partyLastNames($case, PartyRole::Respondent),
        ];
    }

    /** @return array<string, mixed> */
    private function reviewDetail(LegalCase $case): array
    {
        return [
            ...$this->queueRow($case),
            'subpoena_status' => $this->statusValue($case->subpoena_status),
            'hearing_date_1' => $this->isoString($case->hearing_date_1),
            'hearing_date_2' => $this->isoString($case->hearing_date_2),
            'assigned_prosecutor_name' => $case->assignedProsecutor?->staffProfile?->displayName() ?? $case->assignedProsecutor?->username,
        ];
    }

    /** @return array<string, mixed>|null */
    private function revision(?SubpoenaRevision $revision): ?array
    {
        if ($revision === null) {
            return null;
        }

        return [
            'revision_number' => $revision->revision_number,
            'submitted_by' => $revision->submittedBy?->staffProfile?->displayName() ?? $revision->submittedBy?->username,
            'submitted_at' => $this->isoString($revision->submitted_at),
            'payload' => $revision->payload,
        ];
    }

    /** @return list<string> */
    private function partyLastNames(LegalCase $case, PartyRole $role): array
    {
        return $case->parties
            ->filter(fn (CaseParty $party): bool => $this->partyRoleValue($party->role) === $role->value)
            ->pluck('last_name')->values()->all();
    }

    private function partyRoleValue(mixed $role): string
    {
        return $role instanceof PartyRole ? $role->value : (string) $role;
    }

    private function statusValue(mixed $status): string
    {
        return $status instanceof SubpoenaStatus ? $status->value : (string) $status;
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
