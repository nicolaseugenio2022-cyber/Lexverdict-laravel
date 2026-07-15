<?php

namespace App\Models;

use Database\Factories\OffenseFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use LogicException;

class Offense extends Model
{
    /** @use HasFactory<OffenseFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'normalized_name',
        'law_reference',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(fn (): never => throw new LogicException('Crime catalog records must be deactivated, not deleted.'));
    }

    /**
     * @return BelongsToMany<LegalCase, $this>
     */
    public function cases(): BelongsToMany
    {
        return $this->belongsToMany(LegalCase::class, 'case_offenses', 'offense_id', 'case_id')
            ->withTimestamps();
    }
}
