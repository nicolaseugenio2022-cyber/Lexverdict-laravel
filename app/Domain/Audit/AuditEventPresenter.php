<?php

namespace App\Domain\Audit;

use App\Models\AuditEvent;
use Illuminate\Support\Carbon;

class AuditEventPresenter
{
    public function __construct(private readonly AuditRedactor $redactor) {}

    /** @return array<string, mixed> */
    public function detail(AuditEvent $event): array
    {
        return [
            ...$this->summary($event),
            'subject_type' => $event->subject_type,
            'subject_id' => $event->subject_id,
            'changes' => $this->redactor->redact($event->changes),
            'ip_address' => $event->ip_address,
            'user_agent' => $event->user_agent,
            'correlation_id' => $event->correlation_id,
        ];
    }

    /** @return array<string, mixed> */
    public function summary(AuditEvent $event): array
    {
        return [
            'log_id' => $event->id,
            'user_id' => $event->actor_user_id,
            'full_name' => $event->actor?->staffProfile?->displayName(),
            'role' => $event->actor?->role,
            'action' => $event->event_type,
            'timestamp' => $event->occurred_at === null
                ? null
                : Carbon::parse($event->occurred_at)->timezone(config('app.timezone'))->format('Y-m-d H:i:s'),
        ];
    }
}
