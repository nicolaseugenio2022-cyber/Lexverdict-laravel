<?php

namespace App\Models;

use App\Domain\Resolutions\Enums\ResolutionStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class ResolutionDecision extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = ['resolution_id', 'revision_number', 'decision', 'comment_type', 'comment', 'decided_by', 'decided_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'decision' => ResolutionStatus::class,
            'revision_number' => 'integer',
            'decided_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn (): never => throw new LogicException('Resolution decision history is immutable.'));
        static::deleting(fn (): never => throw new LogicException('Resolution decision history is immutable.'));
    }

    /** @return BelongsTo<Resolution, $this> */
    public function resolution(): BelongsTo
    {
        return $this->belongsTo(Resolution::class);
    }

    /** @return BelongsTo<User, $this> */
    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
