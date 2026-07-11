<?php

namespace App\Models;

use App\Domain\Resolutions\Enums\ResolutionVerdict;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class ResolutionRevision extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = ['resolution_id', 'revision_number', 'verdict', 'court', 'verdict_date', 'submitted_by', 'submitted_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'verdict' => ResolutionVerdict::class,
            'verdict_date' => 'date',
            'revision_number' => 'integer',
            'submitted_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn (): never => throw new LogicException('Resolution revision history is immutable.'));
        static::deleting(fn (): never => throw new LogicException('Resolution revision history is immutable.'));
    }

    /** @return BelongsTo<Resolution, $this> */
    public function resolution(): BelongsTo
    {
        return $this->belongsTo(Resolution::class);
    }

    /** @return BelongsTo<User, $this> */
    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
