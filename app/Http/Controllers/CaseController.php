<?php

namespace App\Http\Controllers;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Actions\ReviseCase;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Cases\Exceptions\CaseDataInvariantException;
use App\Domain\Cases\Queries\CaseListQuery;
use App\Domain\Documents\DocumentAccess;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Actions\ResolutionAccess;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Http\Requests\Cases\StoreCaseRequest;
use App\Http\Requests\Cases\UpdateCaseRequest;
use App\Models\AuditEvent;
use App\Models\CaseParty;
use App\Models\GeneratedDocument;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Resolution;
use App\Models\ResolutionDecision;
use App\Models\ResolutionRevision;
use App\Models\SubpoenaDecision;
use App\Models\SubpoenaRevision;
use App\Models\User;
use App\Support\PhilippineAddressCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class CaseController extends Controller
{
    public function __construct(private readonly PhilippineAddressCatalog $addresses) {}

    public function index(
        Request $request,
        CaseListQuery $cases,
        CaseAccess $access,
        ResolutionAccess $resolutionAccess,
        DocumentAccess $documentAccess,
    ): Response {
        $user = $request->user();
        $isProcessServer = $user->hasRole(StaffRole::ProcessServer);
        $paginatedCases = $cases->paginate($request->user(), $request)
            ->through(fn (LegalCase $case): array => $this->caseListRow(
                $case,
                $user,
                $resolutionAccess,
                $documentAccess,
            ));

        return Inertia::render('Cases/Index', [
            'cases' => $paginatedCases,
            'filters' => $cases->parameters($user, $request),
            'filter_options' => $cases->filterOptions(),
            'sort_options' => $cases->sortOptions($user),
            'can_create_case' => $access->canCreate($user),
            'is_process_server' => $isProcessServer,
            'list_role' => $this->caseListRole($user),
            'list_url' => $isProcessServer ? route('process-server.cases.index', absolute: false) : route('cases.index', absolute: false),
        ]);
    }

    public function create(Request $request, CaseAccess $access): Response
    {
        abort_unless($access->canCreate($request->user()), 403);

        return Inertia::render('Cases/Form', [
            'mode' => 'create',
            'caseRecord' => null,
            'offenses' => $this->offenseOptions(),
            'prosecutors' => $this->prosecutorOptions(),
            'partyRoles' => [PartyRole::Complainant->value, PartyRole::Respondent->value],
            'can_select_prosecutor' => $request->user()->hasRole(StaffRole::Superuser),
            'regions' => $this->addresses->regions(),
        ]);
    }

    public function store(StoreCaseRequest $request, CreateCase $cases): RedirectResponse
    {
        try {
            $result = $request->user()->hasRole(StaffRole::Superuser)
                ? $cases->createForAdmin($request->validated(), $request->user())
                : $cases->create($request->validated(), $request->user());
        } catch (CaseDataInvariantException $exception) {
            return back()->withErrors(['case' => $exception->getMessage()])->withInput();
        }

        return redirect()
            ->route('cases.show', $result['case'])
            ->with('case_pin', $result['pin']);
    }

    public function show(LegalCase $case, Request $request, CaseAccess $access, ResolutionAccess $resolutionAccess, DocumentAccess $documentAccess): Response
    {
        abort_unless($access->canView($request->user(), $case), 403);
        $case->load(['assignedProsecutor.staffProfile', 'createdBy.staffProfile', 'offenses', 'parties', 'subpoenaRevisions.submittedBy.staffProfile', 'subpoenaDecisions.decidedBy.staffProfile', 'resolution.createdBy.staffProfile', 'resolution.revisions.submittedBy.staffProfile', 'resolution.decisions.decidedBy.staffProfile', 'generatedDocuments.requestedBy.staffProfile']);
        $resolution = $case->resolution;
        $canGenerateDocument = $documentAccess->canGenerate($request->user(), $case);

        return Inertia::render('Cases/Show', [
            'caseRecord' => $this->caseDetail($case),
            'timeline' => $this->timeline($case),
            'decision_history' => $this->decisionHistory($case),
            'can_revise' => $access->canRevise($request->user(), $case),
            'resolution' => $resolution ? $this->resolutionSummary($resolution) : null,
            'can_submit_resolution' => $resolution === null && $resolutionAccess->canSubmit($request->user(), $case),
            'can_revise_resolution' => $resolution !== null && $resolutionAccess->canRevise($request->user(), $resolution),
            'case_pin' => session('case_pin'),
            'documents' => $canGenerateDocument ? $case->generatedDocuments->sortByDesc('version')->map(fn (GeneratedDocument $document): array => [
                'id' => $document->id,
                'version' => $document->version,
                'template_version' => $document->template_version,
                'requested_by' => $document->requestedBy?->staffProfile?->displayName() ?? $document->requestedBy?->username,
                'requested_at' => $this->isoString($document->requested_at),
                'generated_at' => $this->isoString($document->generated_at),
                'failed_at' => $this->isoString($document->failed_at),
                'sha256' => $document->sha256,
            ])->values()->all() : [],
            'can_generate_subpoena' => $canGenerateDocument,
        ]);
    }

    public function edit(LegalCase $case, Request $request, CaseAccess $access): Response
    {
        abort_unless($access->canRevise($request->user(), $case), 403);
        $case->load(['offenses', 'parties', 'subpoenaDecisions.decidedBy.staffProfile']);

        return Inertia::render('Cases/Form', [
            'mode' => 'edit',
            'caseRecord' => $this->caseDetail($case),
            'offenses' => $this->offenseOptions($case),
            'prosecutors' => $this->prosecutorOptions(),
            'partyRoles' => [PartyRole::Complainant->value, PartyRole::Respondent->value],
            'can_select_prosecutor' => false,
            'regions' => $this->addresses->regions(),
            'denial_comments' => $this->decisionHistory($case, true),
        ]);
    }

    public function update(UpdateCaseRequest $request, LegalCase $case, ReviseCase $cases): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['parties'] = array_map(function (array $party): array {
                unset($party['source_party_id']);

                return $party;
            }, $data['parties']);

            $cases->revise($case, $data, $request->user());
        } catch (CaseDataInvariantException $exception) {
            return back()->withErrors(['case' => $exception->getMessage()])->withInput();
        }

        return redirect()->route('cases.show', $case);
    }

    /**
     * @return list<array{id: string, name: string, law_reference: string|null, is_selectable: bool}>
     */
    private function offenseOptions(?LegalCase $case = null): array
    {
        $query = Offense::query()->where('is_active', true);

        if ($case !== null) {
            $query->orWhereIn('id', $case->offenses->modelKeys());
        }

        return $query
            ->orderBy('name')
            ->get(['id', 'name', 'law_reference', 'is_active'])
            ->map(fn (Offense $offense): array => [
                'id' => $offense->id,
                'name' => $offense->name,
                'law_reference' => $offense->law_reference,
                'is_selectable' => $offense->is_active,
            ])->all();
    }

    /**
     * @return list<array{id: string, label: string}>
     */
    private function prosecutorOptions(): array
    {
        return User::query()
            ->with('staffProfile')
            ->where('role', StaffRole::Prosecutor->value)
            ->where('is_active', true)
            ->orderBy('username')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'label' => $user->staffProfile?->displayName() ?: $user->username,
            ])->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function caseListRow(
        LegalCase $case,
        User $user,
        ResolutionAccess $resolutionAccess,
        DocumentAccess $documentAccess,
    ): array {
        $resolution = $case->resolution;
        $resolutionStatus = $resolution === null ? null : $this->resolutionStatusValue($resolution->status);
        $resolutionVerdict = $resolution === null ? null : $this->resolutionVerdictValue($resolution->verdict);
        $approvedOutcome = $resolutionStatus === ResolutionStatus::Approved->value
            && in_array($resolutionVerdict, [ResolutionVerdict::ForFiling->value, ResolutionVerdict::Dismissed->value], true);
        $forFiling = $approvedOutcome && $resolutionVerdict === ResolutionVerdict::ForFiling->value;

        $projection = [
            'id' => $case->id,
            'docket_number' => $case->docket_number,
            'date' => $this->dateString($case->date),
            'police_station' => $case->police_station,
            'assigned_prosecutor_name' => $case->assignedProsecutor?->staffProfile?->displayName() ?? $case->assignedProsecutor?->username,
            'offenses' => $case->offenses->pluck('name')->values()->all(),
            'complainants' => $this->partyLastNames($case, PartyRole::Complainant),
            'respondents' => $this->partyLastNames($case, PartyRole::Respondent),
            'resolution_verdict' => $approvedOutcome ? $resolutionVerdict : ResolutionVerdict::Pending->value,
            'court' => $forFiling ? $resolution->court : null,
            'verdict_date' => $approvedOutcome ? $this->dateString($resolution->verdict_date) : null,
        ];

        if ($user->hasRole(StaffRole::ProcessServer)) {
            return $projection;
        }

        return [
            ...$projection,
            'command_status' => $this->caseListCommandStatus($user, $resolutionStatus, $resolutionVerdict),
            'can_submit_resolution' => $resolution === null && $resolutionAccess->canSubmit($user, $case),
            'can_generate_subpoena' => $resolution === null && $documentAccess->canGenerate($user, $case),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function caseDetail(LegalCase $case): array
    {
        $case->loadMissing(['assignedProsecutor.staffProfile', 'createdBy.staffProfile', 'offenses', 'parties']);

        return [
            'id' => $case->id,
            'docket_number' => $case->docket_number,
            'date' => $this->dateString($case->date),
            'police_station' => $case->police_station,
            'subpoena_status' => $this->subpoenaStatusValue($case->subpoena_status),
            'revision_number' => $case->revision_number,
            'assigned_prosecutor_name' => $case->assignedProsecutor?->staffProfile?->displayName() ?? $case->assignedProsecutor?->username,
            'offenses' => $case->offenses->pluck('name')->values()->all(),
            'complainants' => $this->partyLastNames($case, PartyRole::Complainant),
            'respondents' => $this->partyLastNames($case, PartyRole::Respondent),
            'hearing_date_1' => $this->dateTimeInput($case->hearing_date_1),
            'hearing_date_2' => $this->dateTimeInput($case->hearing_date_2),
            'created_by_name' => $case->createdBy?->staffProfile?->displayName() ?? $case->createdBy?->username,
            'offense_ids' => $case->offenses->pluck('id')->values()->all(),
            'parties' => $this->partyDetails($case),
        ];
    }

    private function caseListRole(User $user): string
    {
        return match (true) {
            $user->hasRole(StaffRole::Superuser) => 'administrator',
            $user->hasRole(StaffRole::Secretary) => 'secretary',
            $user->hasRole(StaffRole::Prosecutor) => 'prosecutor',
            default => 'process_server',
        };
    }

    private function caseListCommandStatus(User $user, ?string $resolutionStatus, ?string $resolutionVerdict): ?string
    {
        if ($user->hasRole(StaffRole::ProcessServer)) {
            return null;
        }

        if ($resolutionStatus === ResolutionStatus::Approved->value) {
            return 'Resolved';
        }

        if (in_array($resolutionVerdict, ResolutionVerdict::submittableValues(), true)) {
            return 'Resolving...';
        }

        return $user->hasRole(StaffRole::Prosecutor) ? 'Due for Hearing' : null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function timeline(LegalCase $case): array
    {
        $revisions = collect($case->subpoenaRevisions->all())
            ->map(fn (SubpoenaRevision $revision): array => [
                'type' => 'revision',
                'label' => 'Revision '.$revision->revision_number,
                'at' => $this->isoString($revision->submitted_at),
                'actor' => $revision->submittedBy?->staffProfile?->displayName() ?? $revision->submittedBy?->username,
            ]);

        $audits = AuditEvent::query()
            ->where('subject_type', LegalCase::class)
            ->where('subject_id', $case->id)
            ->orderBy('occurred_at')
            ->get()
            ->map(fn (AuditEvent $event): array => [
                'type' => 'audit',
                'label' => $event->event_type,
                'at' => $this->isoString($event->occurred_at),
                'actor' => null,
            ]);

        $decisions = collect($case->subpoenaDecisions->all())
            ->map(fn (SubpoenaDecision $decision): array => [
                'type' => 'decision',
                'label' => 'Revision '.$decision->revision_number.' '.$this->subpoenaStatusValue($decision->decision),
                'at' => $this->isoString($decision->decided_at),
                'actor' => $decision->decidedBy?->staffProfile?->displayName() ?? $decision->decidedBy?->username,
            ]);

        $resolutionRevisions = $case->resolution
            ? collect($case->resolution->revisions->all())->map(fn (ResolutionRevision $revision): array => [
                'type' => 'resolution_revision',
                'label' => 'Resolution Revision '.$revision->revision_number,
                'at' => $this->isoString($revision->submitted_at),
                'actor' => $revision->submittedBy?->staffProfile?->displayName() ?? $revision->submittedBy?->username,
            ])
            : collect();

        $resolutionDecisions = $case->resolution
            ? collect($case->resolution->decisions->all())->map(fn (ResolutionDecision $decision): array => [
                'type' => 'resolution_decision',
                'label' => 'Resolution Revision '.$decision->revision_number.' '.$this->resolutionStatusValue($decision->decision),
                'at' => $this->isoString($decision->decided_at),
                'actor' => $decision->decidedBy?->staffProfile?->displayName() ?? $decision->decidedBy?->username,
            ])
            : collect();

        $resolutionAudits = $case->resolution
            ? AuditEvent::query()
                ->where('subject_type', Resolution::class)
                ->where('subject_id', $case->resolution->id)
                ->get()
                ->map(fn (AuditEvent $event): array => [
                    'type' => 'audit',
                    'label' => $event->event_type,
                    'at' => $this->isoString($event->occurred_at),
                    'actor' => null,
                ])
            : collect();

        return $revisions
            ->merge($decisions)
            ->merge($resolutionRevisions)
            ->merge($resolutionDecisions)
            ->merge($audits)
            ->merge($resolutionAudits)
            ->sortBy(fn (array $event): ?string => $event['at'])->values()->all();
    }

    /** @return array<string, mixed> */
    private function resolutionSummary(Resolution $resolution): array
    {
        return [
            'id' => $resolution->id,
            'verdict' => $this->resolutionVerdictValue($resolution->verdict),
            'court' => $resolution->court,
            'verdict_date' => $this->dateString($resolution->verdict_date),
            'status' => $this->resolutionStatusValue($resolution->status),
            'revision_number' => $resolution->revision_number,
            'report_eligible' => $resolution->isReportEligible(),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function decisionHistory(LegalCase $case, bool $denialsOnly = false): array
    {
        return $case->subpoenaDecisions
            ->when($denialsOnly, fn ($decisions) => $decisions->where('decision', SubpoenaStatus::Denied))
            ->sortByDesc('decided_at')
            ->map(fn (SubpoenaDecision $decision): array => [
                'revision_number' => $decision->revision_number,
                'decision' => $this->subpoenaStatusValue($decision->decision),
                'comment' => $decision->comment,
                'decided_by' => $decision->decidedBy?->staffProfile?->displayName() ?? $decision->decidedBy?->username,
                'decided_at' => $this->isoString($decision->decided_at),
            ])->values()->all();
    }

    private function subpoenaStatusValue(mixed $status): string
    {
        return $status instanceof SubpoenaStatus ? $status->value : (string) $status;
    }

    private function resolutionVerdictValue(mixed $verdict): string
    {
        return $verdict instanceof ResolutionVerdict ? $verdict->value : (string) $verdict;
    }

    private function resolutionStatusValue(mixed $status): string
    {
        return $status instanceof ResolutionStatus ? $status->value : (string) $status;
    }

    private function partyRoleValue(mixed $role): string
    {
        return $role instanceof PartyRole ? $role->value : (string) $role;
    }

    private function dateString(mixed $value): ?string
    {
        return $value === null || $value === '' ? null : Carbon::parse($value)->toDateString();
    }

    private function dateTimeInput(mixed $value): ?string
    {
        return $value === null || $value === '' ? null : Carbon::parse($value)->format('Y-m-d\TH:i');
    }

    private function isoString(mixed $value): ?string
    {
        return $value === null || $value === '' ? null : Carbon::parse($value)->toISOString();
    }

    /**
     * @return list<string>
     */
    private function partyLastNames(LegalCase $case, PartyRole $role): array
    {
        return $case->parties
            ->filter(fn (CaseParty $party): bool => $this->partyRoleValue($party->role) === $role->value)
            ->pluck('last_name')
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function partyDetails(LegalCase $case): array
    {
        return $case->parties
            ->sortBy('position')
            ->map(function (CaseParty $party): array {
                $selection = $this->addresses->selectionForNames(
                    $party->region,
                    $party->province,
                    $party->municipality,
                    $party->barangay,
                ) ?? [
                    'region_code' => '',
                    'province_code' => '',
                    'municipality_code' => '',
                    'barangay_code' => '',
                ];

                return [
                    'source_party_id' => $party->id,
                    'role' => $this->partyRoleValue($party->role),
                    'first_name' => $party->first_name,
                    'middle_name' => $party->middle_name,
                    'last_name' => $party->last_name,
                    'suffix' => $party->suffix,
                    'date_of_birth' => $this->dateString($party->date_of_birth),
                    'sex' => $party->sex,
                    'street' => $party->street,
                    'barangay' => $party->barangay,
                    'municipality' => $party->municipality,
                    'province' => $party->province,
                    'region' => $party->region,
                    ...$selection,
                ];
            })
            ->values()
            ->all();
    }
}
