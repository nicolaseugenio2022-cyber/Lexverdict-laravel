<?php

namespace App\Models;

use App\Domain\Cases\Enums\SubpoenaStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class SubpoenaDecision extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = [
        'case_id',
        'revision_number',
        'decision',
        'comment_type',
        'comment',
        'decided_by',
        'decided_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'decision' => SubpoenaStatus::class,
            'revision_number' => 'integer',
            'decided_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new LogicException('Subpoena decision history is immutable.');
        });

        static::deleting(function (): never {
            throw new LogicException('Subpoena decision history is immutable.');
        });
    }

    /** @return BelongsTo<LegalCase, $this> */
    public function case(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class, 'case_id');
    }

    /** @return BelongsTo<User, $this> */
    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
