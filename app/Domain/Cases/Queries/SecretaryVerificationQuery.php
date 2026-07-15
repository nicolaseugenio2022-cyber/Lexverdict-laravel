<?php

namespace App\Domain\Cases\Queries;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Models\LegalCase;
use App\Models\Resolution;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class SecretaryVerificationQuery
{
    public function __construct(private readonly CaseAccess $access) {}

    /**
     * @param  array{search: string, status: string, sort: string, direction: string}  $filters
     * @return LengthAwarePaginator<int, LegalCase>
     */
    public function subpoenas(User $secretary, array $filters): LengthAwarePaginator
    {
        $query = $this->baseQuery($secretary)
            ->with('subpoenaDecisions');

        $this->search($query, $filters['search']);
        if ($filters['status'] !== '') {
            $query->where('subpoena_status', $filters['status']);
        }

        $column = match ($filters['sort']) {
            'status' => 'subpoena_status',
            'revision' => 'revision_number',
            'date' => 'date',
            default => 'docket_number',
        };

        return $query
            ->orderBy($column, $filters['direction'])
            ->orderBy('docket_number')
            ->paginate(10)
            ->withQueryString();
    }

    /**
     * @param  array{search: string, status: string, sort: string, direction: string}  $filters
     * @return LengthAwarePaginator<int, LegalCase>
     */
    public function resolutions(User $secretary, array $filters): LengthAwarePaginator
    {
        $query = $this->baseQuery($secretary)
            ->where('subpoena_status', SubpoenaStatus::Approved->value)
            ->with(['resolution.createdBy.staffProfile', 'resolution.revisions.submittedBy.staffProfile', 'resolution.decisions']);

        $this->search($query, $filters['search'], true);
        if ($filters['status'] !== '') {
            $query->whereHas('resolution', fn (Builder $query) => $query->where('status', $filters['status']));
        }

        $direction = $filters['direction'];
        $sortQuery = match ($filters['sort']) {
            'status' => Resolution::query()->select('status')->whereColumn('case_id', 'cases.id')->limit(1),
            'revision' => Resolution::query()->select('revision_number')->whereColumn('case_id', 'cases.id')->limit(1),
            'verdict' => Resolution::query()->select('verdict')->whereColumn('case_id', 'cases.id')->limit(1),
            default => null,
        };

        if ($sortQuery !== null) {
            $query->orderBy($sortQuery, $direction)->orderBy('docket_number');
        } else {
            $query->orderBy('docket_number', $direction);
        }

        return $query->paginate(10)->withQueryString();
    }

    /** @return Builder<LegalCase> */
    private function baseQuery(User $secretary): Builder
    {
        $prosecutorId = $this->access->assignedProsecutorIdForSecretary($secretary);

        $query = LegalCase::query()
            ->with(['assignedProsecutor.staffProfile', 'createdBy.staffProfile', 'offenses', 'parties', 'resolution']);

        return $prosecutorId === null
            ? $query->whereRaw('1 = 0')
            : $query->where('assigned_prosecutor_id', $prosecutorId);
    }

    /** @param Builder<LegalCase> $query */
    private function search(Builder $query, string $search, bool $includeResolution = false): void
    {
        $term = trim($search);
        if ($term === '') {
            return;
        }

        $query->where(function (Builder $query) use ($term, $includeResolution): void {
            $query->where('docket_number', 'ilike', '%'.$term.'%')
                ->orWhere('police_station', 'ilike', '%'.$term.'%')
                ->orWhereHas('offenses', fn (Builder $query) => $query->where('name', 'ilike', '%'.$term.'%'))
                ->orWhereHas('parties', fn (Builder $query) => $query
                    ->where('first_name', 'ilike', '%'.$term.'%')
                    ->orWhere('last_name', 'ilike', '%'.$term.'%'))
                ->orWhereHas('assignedProsecutor', fn (Builder $query) => $query
                    ->where('username', 'ilike', '%'.$term.'%')
                    ->orWhereHas('staffProfile', fn (Builder $query) => $query
                        ->where('first_name', 'ilike', '%'.$term.'%')
                        ->orWhere('last_name', 'ilike', '%'.$term.'%')))
                ->orWhereHas('createdBy', fn (Builder $query) => $query
                    ->where('username', 'ilike', '%'.$term.'%')
                    ->orWhereHas('staffProfile', fn (Builder $query) => $query
                        ->where('first_name', 'ilike', '%'.$term.'%')
                        ->orWhere('last_name', 'ilike', '%'.$term.'%')));

            if ($includeResolution) {
                $query->orWhereHas('resolution', fn (Builder $query) => $query
                    ->where('verdict', 'ilike', '%'.$term.'%')
                    ->orWhere('status', 'ilike', '%'.$term.'%')
                    ->orWhere('court', 'ilike', '%'.$term.'%'));
            }
        });
    }
}
