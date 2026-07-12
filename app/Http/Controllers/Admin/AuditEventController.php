<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Audit\AuditEventPresenter;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AuditIndexRequest;
use App\Models\AuditEvent;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AuditEventController extends Controller
{
    public function __construct(private readonly AuditEventPresenter $presenter) {}

    public function index(AuditIndexRequest $request): Response
    {
        $input = $request->validated();
        $search = trim((string) ($input['search'] ?? ''));
        $filter = (string) ($input['filter'] ?? '');
        $sort = (string) ($input['sort'] ?? 'timestamp');
        $order = (string) ($input['order'] ?? 'desc');

        $query = AuditEvent::query()
            ->select('audit_events.*')
            ->leftJoin('users', 'users.id', '=', 'audit_events.actor_user_id')
            ->leftJoin('staff_profiles', 'staff_profiles.user_id', '=', 'users.id')
            ->with('actor.staffProfile');

        if ($search !== '') {
            $this->applySearch($query, $filter, $search);
        }

        $sortColumns = [
            'log_id' => 'audit_events.id',
            'user_id' => 'audit_events.actor_user_id',
            'full_name' => 'staff_profiles.last_name',
            'role' => 'users.role',
            'action' => 'audit_events.event_type',
            'timestamp' => 'audit_events.occurred_at',
        ];

        $events = $query
            ->orderBy($sortColumns[$sort], $order)
            ->orderBy('audit_events.id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (AuditEvent $event): array => $this->presenter->summary($event));

        return Inertia::render('Admin/Audit/Index', [
            'events' => $events,
            'filters' => compact('search', 'filter', 'sort', 'order'),
        ]);
    }

    public function show(string $auditEvent): Response
    {
        Gate::authorize('view-audit');
        $event = AuditEvent::query()->with('actor.staffProfile')->findOrFail($auditEvent);

        return Inertia::render('Admin/Audit/Show', [
            'event' => $this->presenter->detail($event),
        ]);
    }

    /** @param Builder<AuditEvent> $query */
    private function applySearch(Builder $query, string $filter, string $search): void
    {
        $pattern = '%'.$search.'%';
        $conditions = [
            'user_id' => 'CAST(audit_events.actor_user_id AS TEXT) ILIKE ?',
            'full_name' => "concat_ws(' ', staff_profiles.first_name, staff_profiles.middle_name, staff_profiles.last_name, staff_profiles.suffix) ILIKE ?",
            'role' => 'users.role ILIKE ?',
            'action' => 'audit_events.event_type ILIKE ?',
            'timestamp' => 'CAST(audit_events.occurred_at AS TEXT) ILIKE ?',
        ];

        if ($filter !== '' && isset($conditions[$filter])) {
            $query->whereRaw($conditions[$filter], [$pattern]);

            return;
        }

        $query->where(function (Builder $searchQuery) use ($conditions, $pattern): void {
            foreach (['full_name', 'role', 'action'] as $field) {
                $searchQuery->orWhereRaw($conditions[$field], [$pattern]);
            }
        });
    }
}
