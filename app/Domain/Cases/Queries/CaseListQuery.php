<?php

namespace App\Domain\Cases\Queries;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Models\CaseParty;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class CaseListQuery
{
    public function __construct(private readonly CaseAccess $access) {}

    /**
     * @return LengthAwarePaginator<int, LegalCase>
     */
    public function paginate(User $user, Request $request): LengthAwarePaginator
    {
        $query = LegalCase::query()
            ->with(['assignedProsecutor.staffProfile', 'createdBy.staffProfile', 'offenses', 'parties', 'resolution']);

        $isProcessServer = $user->hasRole(StaffRole::ProcessServer);

        $this->scope($query, $user);
        $this->search($query, (string) $request->query('search', ''), $isProcessServer);
        if (! $isProcessServer) {
            $this->filterStatus($query, (string) $request->query('status', ''));
        }
        $this->sort(
            $query,
            (string) $request->query('sort', $isProcessServer ? 'docket_number' : 'date'),
            (string) $request->query('direction', 'desc'),
            $isProcessServer,
        );

        return $query->paginate(10)->withQueryString();
    }

    /**
     * @param  Builder<LegalCase>  $query
     */
    private function scope(Builder $query, User $user): void
    {
        if ($user->hasRole(StaffRole::Superuser)) {
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

        if ($user->hasRole(StaffRole::ProcessServer)) {
            return;
        }

        $query->whereRaw('1 = 0');
    }

    /**
     * @param  Builder<LegalCase>  $query
     */
    private function search(Builder $query, string $search, bool $includeProcessServerProjection): void
    {
        $term = trim($search);

        if ($term === '') {
            return;
        }

        $query->where(function (Builder $query) use ($term, $includeProcessServerProjection): void {
            $query->where('docket_number', 'ilike', '%'.$term.'%')
                ->orWhere('police_station', 'ilike', '%'.$term.'%')
                ->orWhereHas('parties', function (Builder $query) use ($term): void {
                    $query->where('first_name', 'ilike', '%'.$term.'%')
                        ->orWhere('last_name', 'ilike', '%'.$term.'%');
                })
                ->orWhereHas('offenses', function (Builder $query) use ($term): void {
                    $query->where('name', 'ilike', '%'.$term.'%');
                });

            if ($includeProcessServerProjection) {
                $query->orWhereHas('assignedProsecutor', function (Builder $query) use ($term): void {
                    $query->where('username', 'ilike', '%'.$term.'%')
                        ->orWhereHas('staffProfile', function (Builder $query) use ($term): void {
                            $query->where('first_name', 'ilike', '%'.$term.'%')
                                ->orWhere('middle_name', 'ilike', '%'.$term.'%')
                                ->orWhere('last_name', 'ilike', '%'.$term.'%');
                        });
                })->orWhere(function (Builder $query) use ($term): void {
                    $query->whereHas('resolution', function (Builder $query) use ($term): void {
                        $query->where('status', ResolutionStatus::Approved->value)
                            ->whereIn('verdict', ResolutionVerdict::submittableValues())
                            ->where(function (Builder $query) use ($term): void {
                                $query->where('verdict', 'ilike', '%'.$term.'%')
                                    ->orWhere(function (Builder $query) use ($term): void {
                                        $query->where('verdict', ResolutionVerdict::ForFiling->value)
                                            ->where('court', 'ilike', '%'.$term.'%');
                                    });
                            });
                    });

                    if (stripos(ResolutionVerdict::Pending->value, $term) !== false) {
                        $query->orWhereDoesntHave('resolution', function (Builder $query): void {
                            $query->where('status', ResolutionStatus::Approved->value)
                                ->whereIn('verdict', ResolutionVerdict::submittableValues());
                        });
                    }
                });
            }
        });
    }

    /**
     * @param  Builder<LegalCase>  $query
     */
    private function filterStatus(Builder $query, string $status): void
    {
        if ($status !== '') {
            $query->where('subpoena_status', $status);
        }
    }

    /**
     * @param  Builder<LegalCase>  $query
     */
    private function sort(Builder $query, string $sort, string $direction, bool $isProcessServer): void
    {
        if ($isProcessServer) {
            $this->sortProcessServerProjection($query, $sort, $direction);

            return;
        }

        $column = match ($sort) {
            'docket_number' => 'docket_number',
            'police_station' => 'police_station',
            'status' => 'subpoena_status',
            default => 'date',
        };

        $query->orderBy($column, $direction === 'asc' ? 'asc' : 'desc')->orderBy('docket_number');
    }

    /** @param Builder<LegalCase> $query */
    private function sortProcessServerProjection(Builder $query, string $sort, string $direction): void
    {
        $direction = $direction === 'asc' ? 'asc' : 'desc';

        if ($sort === 'resolution_verdict') {
            $query->orderByRaw(
                "COALESCE((SELECT CASE WHEN status = ? AND verdict IN (?, ?) THEN verdict ELSE ? END FROM resolutions WHERE resolutions.case_id = cases.id LIMIT 1), ?) {$direction}",
                [
                    ResolutionStatus::Approved->value,
                    ResolutionVerdict::ForFiling->value,
                    ResolutionVerdict::Dismissed->value,
                    ResolutionVerdict::Pending->value,
                    ResolutionVerdict::Pending->value,
                ],
            )->orderBy('docket_number');

            return;
        }

        if ($sort === 'court') {
            $query->orderByRaw(
                "(SELECT CASE WHEN status = ? AND verdict = ? THEN court END FROM resolutions WHERE resolutions.case_id = cases.id LIMIT 1) {$direction}",
                [ResolutionStatus::Approved->value, ResolutionVerdict::ForFiling->value],
            )->orderBy('docket_number');

            return;
        }

        if ($sort === 'verdict_date') {
            $query->orderByRaw(
                "(SELECT CASE WHEN status = ? AND verdict IN (?, ?) THEN verdict_date END FROM resolutions WHERE resolutions.case_id = cases.id LIMIT 1) {$direction}",
                [
                    ResolutionStatus::Approved->value,
                    ResolutionVerdict::ForFiling->value,
                    ResolutionVerdict::Dismissed->value,
                ],
            )->orderBy('docket_number');

            return;
        }

        $sortQuery = match ($sort) {
            'crime' => Offense::query()
                ->select('offenses.name')
                ->join('case_offenses', 'case_offenses.offense_id', '=', 'offenses.id')
                ->whereColumn('case_offenses.case_id', 'cases.id')
                ->orderBy('offenses.name')
                ->limit(1),
            'complainant' => CaseParty::query()
                ->select('last_name')
                ->whereColumn('case_id', 'cases.id')
                ->where('role', 'Complainant')
                ->orderBy('position')
                ->limit(1),
            'respondent' => CaseParty::query()
                ->select('last_name')
                ->whereColumn('case_id', 'cases.id')
                ->where('role', 'Respondent')
                ->orderBy('position')
                ->limit(1),
            'assigned_prosecutor' => StaffProfile::query()
                ->select('last_name')
                ->whereColumn('user_id', 'cases.assigned_prosecutor_id')
                ->limit(1),
            default => null,
        };

        if ($sortQuery !== null) {
            $query->orderBy($sortQuery, $direction)->orderBy('docket_number');

            return;
        }

        $column = match ($sort) {
            'date' => 'date',
            'police_station' => 'police_station',
            default => 'docket_number',
        };

        $query->orderBy($column, $direction)->orderBy('docket_number');
    }
}
