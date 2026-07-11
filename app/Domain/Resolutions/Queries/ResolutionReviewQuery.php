<?php

namespace App\Domain\Resolutions\Queries;

use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Models\Resolution;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class ResolutionReviewQuery
{
    /** @return LengthAwarePaginator<int, Resolution> */
    public function paginate(Request $request): LengthAwarePaginator
    {
        $query = Resolution::query()
            ->with(['case.assignedProsecutor.staffProfile', 'case.parties', 'case.offenses', 'createdBy.staffProfile', 'revisions.submittedBy.staffProfile'])
            ->where('status', ResolutionStatus::Pending->value);

        $term = trim((string) $request->query('search', ''));
        if ($term !== '') {
            $query->whereHas('case', function (Builder $query) use ($term): void {
                $query->where('docket_number', 'ilike', '%'.$term.'%')
                    ->orWhere('police_station', 'ilike', '%'.$term.'%')
                    ->orWhereHas('parties', function (Builder $query) use ($term): void {
                        $query->where('first_name', 'ilike', '%'.$term.'%')->orWhere('last_name', 'ilike', '%'.$term.'%');
                    });
            });
        }

        $sort = (string) $request->query('sort', 'verdict_date');
        $direction = (string) $request->query('direction', 'asc') === 'desc' ? 'desc' : 'asc';
        $column = match ($sort) {
            'verdict' => 'verdict',
            'revision_number' => 'revision_number',
            default => 'verdict_date',
        };

        return $query->orderBy($column, $direction)->orderBy('id')->paginate(10)->withQueryString();
    }
}
