<?php

namespace App\Models;

use App\Domain\Cases\Enums\SubpoenaStatus;
use Database\Factories\LegalCaseFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LegalCase extends Model
{
    /** @use HasFactory<LegalCaseFactory> */
    use HasFactory, HasUuids;

    protected $table = 'cases';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'docket_number',
        'date',
        'hearing_date_1',
        'hearing_date_2',
        'police_station',
        'assigned_prosecutor_id',
        'created_by_user_id',
        'subpoena_status',
        'pin_hash',
        'pin_issued_at',
        'pin_reset_at',
        'revision_number',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'hearing_date_1' => 'datetime',
            'hearing_date_2' => 'datetime',
            'pin_issued_at' => 'datetime',
            'pin_reset_at' => 'datetime',
            'revision_number' => 'integer',
            'subpoena_status' => SubpoenaStatus::class,
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedProsecutor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_prosecutor_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * @return BelongsToMany<Offense, $this>
     */
    public function offenses(): BelongsToMany
    {
        return $this->belongsToMany(Offense::class, 'case_offenses', 'case_id', 'offense_id')
            ->withTimestamps();
    }

    /**
     * @return HasMany<CaseParty, $this>
     */
    public function parties(): HasMany
    {
        return $this->hasMany(CaseParty::class, 'case_id');
    }

    /**
     * @return HasMany<SubpoenaRevision, $this>
     */
    public function subpoenaRevisions(): HasMany
    {
        return $this->hasMany(SubpoenaRevision::class, 'case_id');
    }
}
