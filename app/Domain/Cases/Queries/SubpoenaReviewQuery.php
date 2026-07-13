<?php

namespace App\Domain\Cases\Queries;

use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class SubpoenaReviewQuery
{
    public function hasPendingFor(User $reviewer): bool
    {
        return $this->baseQuery($reviewer)->exists();
    }

    /** @return LengthAwarePaginator<int, LegalCase> */
    public function paginate(User $reviewer, Request $request): LengthAwarePaginator
    {
        $query = $this->baseQuery($reviewer)
            ->with(['createdBy.staffProfile', 'offenses', 'parties']);

        $this->search($query, (string) $request->query('search', ''));
        $this->sort($query, (string) $request->query('sort', 'date'), (string) $request->query('direction', 'asc'));

        return $query->paginate(10)->withQueryString();
    }

    /** @return Builder<LegalCase> */
    private function baseQuery(User $reviewer): Builder
    {
        return LegalCase::query()
            ->where('assigned_prosecutor_id', $reviewer->id)
            ->where('created_by_user_id', '!=', $reviewer->id)
            ->where('subpoena_status', SubpoenaStatus::Pending->value);
    }

    /** @param Builder<LegalCase> $query */
    private function search(Builder $query, string $search): void
    {
        $term = trim($search);

        if ($term === '') {
            return;
        }

        $query->where(function (Builder $query) use ($term): void {
            $query->where('docket_number', 'ilike', '%'.$term.'%')
                ->orWhere('police_station', 'ilike', '%'.$term.'%')
                ->orWhereHas('parties', function (Builder $query) use ($term): void {
                    $query->where('first_name', 'ilike', '%'.$term.'%')
                        ->orWhere('last_name', 'ilike', '%'.$term.'%');
                })
                ->orWhereHas('offenses', function (Builder $query) use ($term): void {
                    $query->where('name', 'ilike', '%'.$term.'%');
                });
        });
    }

    /** @param Builder<LegalCase> $query */
    private function sort(Builder $query, string $sort, string $direction): void
    {
        $column = match ($sort) {
            'docket_number' => 'docket_number',
            'revision_number' => 'revision_number',
            default => 'date',
        };

        $query->orderBy($column, $direction === 'desc' ? 'desc' : 'asc')->orderBy('docket_number');
    }
}
