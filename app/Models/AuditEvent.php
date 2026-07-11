<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use LogicException;

class AuditEvent extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'event_type',
        'actor_user_id',
        'subject_type',
        'subject_id',
        'changes',
        'ip_address',
        'user_agent',
        'correlation_id',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn (): never => throw new LogicException('Audit history is immutable.'));
        static::deleting(fn (): never => throw new LogicException('Audit history is immutable.'));
    }
}
