<?php

namespace App\Domain\Cases\Queries;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class CaseListQuery
{
    private const PER_PAGE = 6;

    /** @var array<string, string> */
    private const FILTER_OPTIONS = [
        'docket_number' => 'Docket No.',
        'crime' => 'Case',
        'complainant' => 'Complainant',
        'respondent' => 'Respondent',
        'police_station' => 'Police Station',
        'assigned_prosecutor' => 'Prosecutor',
        'resolution_verdict' => 'Verdict',
    ];

    /** @var array<string, string> */
    private const SORT_OPTIONS = [
        'docket_number' => 'Docket No.',
        'crime' => 'Case',
        'police_station' => 'Police Station',
        'assigned_prosecutor' => 'Prosecutor',
        'resolution_verdict' => 'Verdict',
        'complainant' => 'Complainant',
        'respondent' => 'Respondent',
    ];

    public function __construct(private readonly CaseAccess $access) {}

    /**
     * @return LengthAwarePaginator<int, LegalCase>
     */
    public function paginate(User $user, Request $request): LengthAwarePaginator
    {
        $parameters = $this->parameters($user, $request);
        $query = LegalCase::query()->with([
            'assignedProsecutor.staffProfile',
            'createdBy.staffProfile',
            'offenses' => fn ($query) => $query->orderBy('name'),
            'parties' => fn ($query) => $query->orderBy('role')->orderBy('position'),
            'resolution',
        ]);

        $this->scope($query, $user);
        $this->search($query, $parameters['search'], $parameters['filter']);
        $this->sort($query, $parameters['sort'], $parameters['order'], $user);

        $total = (clone $query)->toBase()->getCountForPagination();
        $lastPage = max((int) ceil($total / self::PER_PAGE), 1);
        $page = min(max($request->integer('page', 1), 1), $lastPage);

        return $query->paginate(self::PER_PAGE, page: $page, total: $total)->withQueryString();
    }

    /**
     * @return array{search: string, filter: string, sort: string, order: string}
     */
    public function parameters(User $user, Request $request): array
    {
        $filter = (string) $request->query('filter', '');
        $sort = (string) $request->query('sort', 'docket_number');
        $allowedSorts = array_keys($this->sortOptionMap($user));

        return [
            'search' => trim((string) $request->query('search', '')),
            'filter' => array_key_exists($filter, self::FILTER_OPTIONS) ? $filter : '',
            'sort' => in_array($sort, $allowedSorts, true) ? $sort : 'docket_number',
            'order' => $request->query('order') === 'asc' ? 'asc' : 'desc',
        ];
    }

    /** @return list<array{value: string, label: string}> */
    public function filterOptions(): array
    {
        return $this->options(self::FILTER_OPTIONS);
    }

    /** @return list<array{value: string, label: string}> */
    public function sortOptions(User $user): array
    {
        return $this->options($this->sortOptionMap($user));
    }

    /**
     * @param  Builder<LegalCase>  $query
     */
    private function scope(Builder $query, User $user): void
    {
        if ($user->hasRole(StaffRole::Superuser) || $user->hasRole(StaffRole::ProcessServer)) {
            return;
        }

        if ($user->hasRole(StaffRole::Prosecutor)) {
            $query->where('assigned_prosecutor_id', $user->id);

            return;
        }

        if ($user->hasRole(StaffRole::Secretary)) {
            $assignedProsecutorId = $this->access->assignedProsecutorIdForSecretary($user);
            $query->where('assigned_prosecutor_id', $assignedProsecutorId ?? '__none__');

            return;
        }

        $query->whereRaw('1 = 0');
    }

    /**
     * @param  Builder<LegalCase>  $query
     */
    private function search(Builder $query, string $term, string $filter): void
    {
        if ($term === '') {
            return;
        }

        $query->where(function (Builder $query) use ($term, $filter): void {
            if ($filter !== '') {
                $this->searchField($query, $filter, $term, false);

                return;
            }

            foreach (['docket_number', 'crime', 'complainant', 'respondent', 'police_station', 'assigned_prosecutor'] as $index => $field) {
                $this->searchField($query, $field, $term, $index > 0);
            }
        });
    }

    /**
     * @param  Builder<LegalCase>  $query
     */
    private function searchField(Builder $query, string $field, string $term, bool $or): void
    {
        $method = $or ? 'orWhere' : 'where';
        $like = '%'.$term.'%';

        if ($field === 'docket_number' || $field === 'police_station') {
            $query->{$method}($field, 'ilike', $like);

            return;
        }

        if ($field === 'crime') {
            $query->{$method.'Raw'}(
                "(SELECT string_agg(offenses.name, ', ' ORDER BY offenses.name) FROM offenses JOIN case_offenses ON case_offenses.offense_id = offenses.id WHERE case_offenses.case_id = cases.id) ILIKE ?",
                [$like],
            );

            return;
        }

        if ($field === 'complainant' || $field === 'respondent') {
            $role = $field === 'complainant' ? PartyRole::Complainant->value : PartyRole::Respondent->value;
            $query->{$method.'Raw'}(
                "(SELECT string_agg(case_parties.last_name, ', ' ORDER BY case_parties.position) FROM case_parties WHERE case_parties.case_id = cases.id AND case_parties.role = ?) ILIKE ?",
                [$role, $like],
            );

            return;
        }

        if ($field === 'assigned_prosecutor') {
            $query->{$method.'Raw'}($this->prosecutorProjection().' ILIKE ?', [$like]);

            return;
        }

        $query->{$method}(function (Builder $query) use ($term): void {
            $query->whereHas('resolution', function (Builder $query) use ($term): void {
                $query->where('status', ResolutionStatus::Approved->value)
                    ->whereIn('verdict', ResolutionVerdict::submittableValues())
                    ->where('verdict', 'ilike', '%'.$term.'%');
            });

            if (stripos(ResolutionVerdict::Pending->value, $term) !== false) {
                $query->orWhereDoesntHave('resolution', function (Builder $query): void {
                    $query->where('status', ResolutionStatus::Approved->value)
                        ->whereIn('verdict', ResolutionVerdict::submittableValues());
                });
            }
        });
    }

    /**
     * @param  Builder<LegalCase>  $query
     */
    private function sort(Builder $query, string $sort, string $direction, User $user): void
    {
        if ($sort === 'resolution_verdict') {
            $query->orderByRaw(
                "COALESCE((SELECT CASE WHEN status = ? AND verdict IN (?, ?) THEN verdict END FROM resolutions WHERE resolutions.case_id = cases.id LIMIT 1), ?) {$direction}",
                [
                    ResolutionStatus::Approved->value,
                    ResolutionVerdict::ForFiling->value,
                    ResolutionVerdict::Dismissed->value,
                    ResolutionVerdict::Pending->value,
                ],
            )->orderBy('docket_number');

            return;
        }

        if ($sort === 'verdict_date' && $user->hasRole(StaffRole::ProcessServer)) {
            $nullOrder = $direction === 'asc' ? 'NULLS FIRST' : 'NULLS LAST';
            $query->orderByRaw(
                "(SELECT CASE WHEN status = ? AND verdict IN (?, ?) THEN verdict_date END FROM resolutions WHERE resolutions.case_id = cases.id LIMIT 1) {$direction} {$nullOrder}",
                [
                    ResolutionStatus::Approved->value,
                    ResolutionVerdict::ForFiling->value,
                    ResolutionVerdict::Dismissed->value,
                ],
            )->orderBy('docket_number');

            return;
        }

        $sortExpression = match ($sort) {
            'crime' => "(SELECT string_agg(offenses.name, ', ' ORDER BY offenses.name) FROM offenses JOIN case_offenses ON case_offenses.offense_id = offenses.id WHERE case_offenses.case_id = cases.id)",
            'complainant' => $this->partyProjection(PartyRole::Complainant),
            'respondent' => $this->partyProjection(PartyRole::Respondent),
            'assigned_prosecutor' => $this->prosecutorProjection(),
            default => null,
        };

        if ($sortExpression !== null) {
            $query->orderByRaw("{$sortExpression} {$direction}")->orderBy('docket_number');

            return;
        }

        $column = $sort === 'police_station' ? 'police_station' : 'docket_number';
        $query->orderBy($column, $direction)->orderBy('docket_number');
    }

    private function partyProjection(PartyRole $role): string
    {
        return "(SELECT string_agg(case_parties.last_name, ', ' ORDER BY case_parties.position) FROM case_parties WHERE case_parties.case_id = cases.id AND case_parties.role = '{$role->value}')";
    }

    private function prosecutorProjection(): string
    {
        return "COALESCE((SELECT NULLIF(trim(concat_ws(' ', staff_profiles.first_name, staff_profiles.middle_name, staff_profiles.last_name, staff_profiles.suffix)), '') FROM staff_profiles WHERE staff_profiles.user_id = cases.assigned_prosecutor_id LIMIT 1), (SELECT users.username FROM users WHERE users.id = cases.assigned_prosecutor_id LIMIT 1))";
    }

    /**
     * @param  array<string, string>  $options
     * @return list<array{value: string, label: string}>
     */
    private function options(array $options): array
    {
        return collect($options)
            ->map(fn (string $label, string $value): array => compact('value', 'label'))
            ->values()
            ->all();
    }

    /** @return array<string, string> */
    private function sortOptionMap(User $user): array
    {
        $options = self::SORT_OPTIONS;

        if ($user->hasRole(StaffRole::ProcessServer)) {
            $options['verdict_date'] = 'Verdict Date';
        }

        return $options;
    }
}
