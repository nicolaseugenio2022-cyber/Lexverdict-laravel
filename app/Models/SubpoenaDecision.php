<?php

namespace App\Models;

use App\Domain\Cases\Enums\SubpoenaStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
