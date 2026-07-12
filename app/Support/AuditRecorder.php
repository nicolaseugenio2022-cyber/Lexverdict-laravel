<?php

namespace App\Support;

use App\Domain\Audit\AuditRedactor;
use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuditRecorder
{
    public function __construct(private readonly AuditRedactor $redactor) {}

    /**
     * @param  array<string, mixed>|null  $changes
     */
    public function record(
        string $eventType,
        ?User $actor = null,
        ?string $subjectType = null,
        ?string $subjectId = null,
        ?array $changes = null,
        ?Request $request = null,
    ): AuditEvent {
        $correlationId = $request?->attributes->get('correlation_id');
        if (! is_string($correlationId) || ! Str::isUuid($correlationId)) {
            $correlationId = (string) Str::uuid();
            $request?->attributes->set('correlation_id', $correlationId);
        }

        return AuditEvent::create([
            'event_type' => $eventType,
            'actor_user_id' => $actor?->id,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'changes' => $this->redactor->redact($changes),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'correlation_id' => $correlationId,
            'occurred_at' => now(),
        ]);
    }
}
