<?php

namespace App\Domain\Dashboard\Queries;

use App\Domain\Audit\AuditEventPresenter;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Cases\Queries\CaseListQuery;
use App\Domain\Cases\Queries\SubpoenaReviewQuery;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Models\AuditEvent;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Resolution;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class OperationalDashboardQuery
{
    /** @var list<string> */
    private const OPERATIONAL_EVENT_TYPES = [
        'case.created',
        'case.revised',
        'subpoena.approved',
        'subpoena.denied',
        'document.subpoena.generated',
        'resolution.submitted',
        'resolution.revised',
        'resolution.approved',
        'resolution.denied',
    ];

    /** @var list<array{label: string, value: int, description: string}>|null */
    private ?array $cachedAdministratorMetrics = null;

    public function __construct(
        private readonly CaseListQuery $cases,
        private readonly SubpoenaReviewQuery $subpoenaReviews,
        private readonly AuditEventPresenter $auditPresenter,
    ) {}

    /** @return list<array{label: string, value: int, description: string}> */
    public function administratorMetrics(): array
    {
        if ($this->cachedAdministratorMetrics !== null) {
            return $this->cachedAdministratorMetrics;
        }

        $caseCounts = LegalCase::query()
            ->selectRaw('COUNT(*) AS total_cases')
            ->selectRaw('SUM(CASE WHEN subpoena_status = ? THEN 1 ELSE 0 END) AS pending_subpoenas', [SubpoenaStatus::Pending->value])
            ->firstOrFail();
        $resolutionCounts = Resolution::query()
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS pending_resolutions', [ResolutionStatus::Pending->value])
            ->selectRaw('SUM(CASE WHEN status = ? AND verdict = ? THEN 1 ELSE 0 END) AS ready_for_filing', [ResolutionStatus::Approved->value, ResolutionVerdict::ForFiling->value])
            ->firstOrFail();
        $userCounts = User::query()
            ->where('is_active', true)
            ->selectRaw('COUNT(*) AS active_users')
            ->selectRaw('SUM(CASE WHEN role = ? THEN 1 ELSE 0 END) AS active_prosecutors', [StaffRole::Prosecutor->value])
            ->selectRaw('SUM(CASE WHEN role = ? THEN 1 ELSE 0 END) AS active_secretaries', [StaffRole::Secretary->value])
            ->firstOrFail();

        return $this->cachedAdministratorMetrics = [
            $this->metric('Total Cases', $caseCounts->getAttribute('total_cases'), 'All case records in the system.'),
            $this->metric('Pending Subpoenas', $caseCounts->getAttribute('pending_subpoenas'), 'Awaiting assigned Prosecutor review.'),
            $this->metric('Cases Ready for Filing', $resolutionCounts->getAttribute('ready_for_filing'), 'Approved resolutions with a For Filing verdict.'),
            $this->metric('Pending Resolutions', $resolutionCounts->getAttribute('pending_resolutions'), 'Awaiting Administrator review.'),
            $this->metric('Active Users', $userCounts->getAttribute('active_users'), 'Staff accounts currently enabled.'),
            $this->metric('Active Prosecutors', $userCounts->getAttribute('active_prosecutors'), 'Enabled Prosecutor accounts.'),
            $this->metric('Active Secretaries', $userCounts->getAttribute('active_secretaries'), 'Enabled Secretary accounts.'),
            $this->metric('Active Crimes', Offense::query()->where('is_active', true)->count(), 'Selectable entries in the Crime catalog.'),
        ];
    }

    /** @return list<array{label: string, value: int, description: string, href?: string}> */
    public function administratorPendingWork(): array
    {
        $metrics = collect($this->administratorMetrics())->keyBy('label');

        return [
            $metrics['Pending Subpoenas'],
            $this->linkedMetric($metrics['Pending Resolutions'], route('resolution-reviews.index', absolute: false)),
            $this->linkedMetric($metrics['Cases Ready for Filing'], route('cases.index', [
                'filter' => 'resolution_verdict',
                'search' => ResolutionVerdict::ForFiling->value,
            ], absolute: false)),
        ];
    }

    /** @return list<array{label: string, value: int, description: string}> */
    public function landingMetrics(User $user): array
    {
        /** @var Builder<LegalCase> $query */
        $query = $this->cases->visibleTo($user)
            ->leftJoin('resolutions', 'resolutions.case_id', '=', 'cases.id')
            ->selectRaw('COUNT(cases.id) AS visible_cases')
            ->selectRaw('SUM(CASE WHEN cases.subpoena_status = ? THEN 1 ELSE 0 END) AS pending_subpoenas', [SubpoenaStatus::Pending->value])
            ->selectRaw('SUM(CASE WHEN resolutions.status = ? THEN 1 ELSE 0 END) AS pending_resolutions', [ResolutionStatus::Pending->value])
            ->selectRaw('SUM(CASE WHEN resolutions.status = ? AND resolutions.verdict = ? THEN 1 ELSE 0 END) AS for_filing', [ResolutionStatus::Approved->value, ResolutionVerdict::ForFiling->value])
            ->selectRaw('SUM(CASE WHEN resolutions.status = ? AND resolutions.verdict = ? THEN 1 ELSE 0 END) AS dismissed', [ResolutionStatus::Approved->value, ResolutionVerdict::Dismissed->value]);
        $counts = $query->firstOrFail();

        if ($user->hasRole(StaffRole::ProcessServer)) {
            return [
                $this->metric('Visible Cases', $counts->getAttribute('visible_cases'), 'Read-only case records available to Process Server.'),
                $this->metric('For Filing', $counts->getAttribute('for_filing'), 'Cases with an approved For Filing resolution.'),
                $this->metric('Dismissed', $counts->getAttribute('dismissed'), 'Cases with an approved Dismissed resolution.'),
            ];
        }

        if ($user->hasRole(StaffRole::Prosecutor)) {
            return [
                $this->metric('Assigned Cases', $counts->getAttribute('visible_cases'), 'Cases assigned to you.'),
                $this->metric('Pending Subpoena Reviews', $this->subpoenaReviews->countPendingFor($user), 'Subpoenas awaiting your review.'),
                $this->metric('Pending Resolutions', $counts->getAttribute('pending_resolutions'), 'Submitted resolutions for your assigned cases.'),
            ];
        }

        return [
            $this->metric('Assigned Cases', $counts->getAttribute('visible_cases'), 'Cases assigned to your Prosecutor.'),
            $this->metric('Pending Subpoenas', $counts->getAttribute('pending_subpoenas'), 'Subpoenas awaiting Prosecutor review.'),
            $this->metric('Pending Resolutions', $counts->getAttribute('pending_resolutions'), 'Submitted resolutions awaiting review.'),
        ];
    }

    /** @return list<array<string, mixed>> */
    public function recentActivity(int $limit = 10): array
    {
        $events = $this->activityQuery()
            ->whereIn('event_type', self::OPERATIONAL_EVENT_TYPES)
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        if ($events->count() < $limit) {
            $fallback = $this->activityQuery()
                ->whereNotIn('event_type', self::OPERATIONAL_EVENT_TYPES)
                ->orderByDesc('occurred_at')
                ->orderByDesc('id')
                ->limit($limit - $events->count())
                ->get();
            $events = $events->concat($fallback)->values();
        }

        $context = $this->subjectContext($events);

        return $events->map(function (AuditEvent $event) use ($context): array {
            $summary = $this->auditPresenter->summary($event);
            $actor = $this->actorName($event);
            $affectedRecord = $event->subject_id === null
                ? 'System'
                : ($context['labels'][(string) $event->subject_type][$event->subject_id] ?? $this->subjectFallback($event));
            $operational = $this->operationalPresentation($event, $actor, $context);

            return [
                ...$summary,
                'time' => $event->occurred_at === null
                    ? null
                    : Carbon::parse($event->occurred_at)->timezone(config('app.timezone'))->format('H:i'),
                'user' => $actor,
                'affected_record' => $affectedRecord,
                'display_title' => $operational['title'] ?? null,
                'display_context' => $operational['context'] ?? null,
                'display_detail' => $operational['detail'] ?? null,
                'display_docket' => $operational['docket'] ?? null,
            ];
        })->all();
    }

    /** @return Builder<AuditEvent> */
    private function activityQuery(): Builder
    {
        return AuditEvent::query()->with('actor.staffProfile');
    }

    /**
     * @param  Collection<int, AuditEvent>  $events
     * @return array{
     *     labels: array<string, array<string, string>>,
     *     case_labels: array<string, array<string, string>>,
     *     dockets: array<string, array<string, string>>,
     *     police_stations: array<string, array<string, string>>
     * }
     */
    private function subjectContext(Collection $events): array
    {
        $ids = fn (string $type): array => $events
            ->where('subject_type', $type)
            ->pluck('subject_id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $cases = LegalCase::query()
            ->whereIn('id', $ids(LegalCase::class))
            ->get(['id', 'docket_number', 'police_station']);
        $resolutions = Resolution::query()
            ->with('case:id,docket_number,police_station')
            ->whereIn('id', $ids(Resolution::class))
            ->get();

        $caseLabels = $cases->mapWithKeys(fn (LegalCase $case): array => [
            $case->id => 'Case '.$case->docket_number,
        ])->all();
        $caseDockets = $cases->pluck('docket_number', 'id')->all();
        $resolutionCaseLabels = $resolutions->mapWithKeys(function (Resolution $resolution): array {
            $case = $resolution->case;

            return $case instanceof LegalCase
                ? [$resolution->id => 'Case '.$case->docket_number]
                : [];
        })->all();
        $resolutionDockets = $resolutions->mapWithKeys(function (Resolution $resolution): array {
            $case = $resolution->case;

            return $case instanceof LegalCase
                ? [$resolution->id => $case->docket_number]
                : [];
        })->all();

        return [
            'labels' => [
                LegalCase::class => $caseLabels,
                Resolution::class => $resolutions->mapWithKeys(function (Resolution $resolution): array {
                    $case = $resolution->case;

                    return $case instanceof LegalCase
                        ? [$resolution->id => 'Resolution for '.$case->docket_number]
                        : [];
                })->all(),
                User::class => User::query()->whereIn('id', $ids(User::class))->pluck('username', 'id')->map(fn (string $username): string => 'User '.$username)->all(),
                Offense::class => Offense::query()->whereIn('id', $ids(Offense::class))->pluck('name', 'id')->map(fn (string $name): string => 'Crime '.$name)->all(),
            ],
            'case_labels' => [
                LegalCase::class => $caseLabels,
                Resolution::class => $resolutionCaseLabels,
            ],
            'dockets' => [
                LegalCase::class => $caseDockets,
                Resolution::class => $resolutionDockets,
            ],
            'police_stations' => [
                LegalCase::class => $cases->pluck('police_station', 'id')->filter()->all(),
                Resolution::class => $resolutions->mapWithKeys(function (Resolution $resolution): array {
                    $case = $resolution->case;

                    return $case instanceof LegalCase && filled($case->police_station)
                        ? [$resolution->id => $case->police_station]
                        : [];
                })->all(),
            ],
        ];
    }

    /**
     * @param  array{
     *     labels: array<string, array<string, string>>,
     *     case_labels: array<string, array<string, string>>,
     *     dockets: array<string, array<string, string>>,
     *     police_stations: array<string, array<string, string>>
     * }  $context
     * @return array{title: string, context: string, detail: string, docket: string}|array{}
     */
    private function operationalPresentation(AuditEvent $event, string $actor, array $context): array
    {
        $subjectType = (string) $event->subject_type;
        $subjectId = (string) $event->subject_id;
        $caseLabel = $context['case_labels'][$subjectType][$subjectId] ?? null;
        $docket = $context['dockets'][$subjectType][$subjectId] ?? null;
        $title = match ($event->event_type) {
            'case.created' => 'New Case Registered',
            'case.revised' => 'Case Revised',
            'subpoena.approved' => 'Subpoena Approved',
            'subpoena.denied' => 'Subpoena Denied',
            'document.subpoena.generated' => 'Subpoena Generated',
            'resolution.submitted' => 'Resolution Submitted',
            'resolution.revised' => 'Resolution Revised',
            'resolution.approved' => 'Resolution Approved',
            'resolution.denied' => 'Resolution Denied',
            default => null,
        };

        if ($title === null || $caseLabel === null || $docket === null) {
            return [];
        }

        if ($event->event_type === 'case.created') {
            $station = $context['police_stations'][$subjectType][$subjectId] ?? null;

            if (is_string($station) && filled($station)) {
                return [
                    'title' => $title,
                    'context' => $caseLabel,
                    'detail' => 'Filed at '.$station,
                    'docket' => $docket,
                ];
            }
        }

        $verb = [
            'case.created' => 'Registered',
            'case.revised' => 'Revised',
            'subpoena.approved' => 'Approved',
            'subpoena.denied' => 'Denied',
            'document.subpoena.generated' => 'Generated',
            'resolution.submitted' => 'Submitted',
            'resolution.revised' => 'Revised',
            'resolution.approved' => 'Approved',
            'resolution.denied' => 'Denied',
        ][$event->event_type];

        if ($actor === 'System') {
            return [];
        }

        return [
            'title' => $title,
            'context' => $caseLabel,
            'detail' => $verb.' by '.$actor,
            'docket' => $docket,
        ];
    }

    private function subjectFallback(AuditEvent $event): string
    {
        return $event->subject_type === null
            ? 'System'
            : Str::headline(class_basename($event->subject_type));
    }

    private function actorName(AuditEvent $event): string
    {
        $actor = $event->getRelation('actor');

        if (! $actor instanceof User) {
            return 'System';
        }

        return $actor->staffProfile?->displayName() ?? $actor->username;
    }

    /** @return array{label: string, value: int, description: string} */
    private function metric(string $label, mixed $value, string $description): array
    {
        return ['label' => $label, 'value' => (int) $value, 'description' => $description];
    }

    /** @param array{label: string, value: int, description: string} $metric
     * @return array{label: string, value: int, description: string, href: string}
     */
    private function linkedMetric(array $metric, string $href): array
    {
        return [...$metric, 'href' => $href];
    }
}
