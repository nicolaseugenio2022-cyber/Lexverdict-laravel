<?php

namespace App\Domain\Cases\Queries;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\LegalCase;
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
            ->with(['assignedProsecutor.staffProfile', 'createdBy.staffProfile', 'offenses', 'parties']);

        $this->scope($query, $user);
        $this->search($query, (string) $request->query('search', ''));
        $this->filterStatus($query, (string) $request->query('status', ''));
        $this->sort($query, (string) $request->query('sort', 'date'), (string) $request->query('direction', 'desc'));

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

        $query->whereRaw('1 = 0');
    }

    /**
     * @param  Builder<LegalCase>  $query
     */
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
    private function sort(Builder $query, string $sort, string $direction): void
    {
        $column = match ($sort) {
            'docket_number' => 'docket_number',
            'police_station' => 'police_station',
            'status' => 'subpoena_status',
            default => 'date',
        };

        $query->orderBy($column, $direction === 'asc' ? 'asc' : 'desc')->orderBy('docket_number');
    }
}
