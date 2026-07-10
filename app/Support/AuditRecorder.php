<?php

namespace App\Support;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Http\Request;

class AuditRecorder
{
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
        return AuditEvent::create([
            'event_type' => $eventType,
            'actor_user_id' => $actor?->id,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'changes' => $changes,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'occurred_at' => now(),
        ]);
    }
}
