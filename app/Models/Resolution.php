<?php

namespace App\Models;

use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use Database\Factories\ResolutionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resolution extends Model
{
    /** @use HasFactory<ResolutionFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = [
        'case_id',
        'verdict',
        'court',
        'verdict_date',
        'status',
        'revision_number',
        'current_revision_id',
        'current_decision_id',
        'created_by_user_id',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'verdict' => ResolutionVerdict::class,
            'status' => ResolutionStatus::class,
            'verdict_date' => 'date',
            'revision_number' => 'integer',
        ];
    }

    /** @return BelongsTo<LegalCase, $this> */
    public function case(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class, 'case_id');
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** @return HasMany<ResolutionRevision, $this> */
    public function revisions(): HasMany
    {
        return $this->hasMany(ResolutionRevision::class, 'resolution_id');
    }

    /** @return HasMany<ResolutionDecision, $this> */
    public function decisions(): HasMany
    {
        return $this->hasMany(ResolutionDecision::class, 'resolution_id');
    }

    public function isReportEligible(): bool
    {
        $status = $this->getAttribute('status');
        $verdict = $this->getAttribute('verdict');

        $statusValue = $status instanceof ResolutionStatus ? $status->value : (string) $status;
        $verdictValue = $verdict instanceof ResolutionVerdict ? $verdict->value : (string) $verdict;

        return $statusValue === ResolutionStatus::Approved->value
            && in_array($verdictValue, [ResolutionVerdict::ForFiling->value, ResolutionVerdict::Dismissed->value], true)
            && $this->current_revision_id !== null
            && $this->current_decision_id !== null
            && $this->decisions()->whereKey($this->current_decision_id)
                ->where('revision_number', $this->revision_number)
                ->where('decision', ResolutionStatus::Approved->value)
                ->exists();
    }

    /**
     * @param  Builder<Resolution>  $query
     * @return Builder<Resolution>
     */
    public function scopeReportEligible(Builder $query): Builder
    {
        return $query
            ->where('status', ResolutionStatus::Approved->value)
            ->whereIn('verdict', [ResolutionVerdict::ForFiling->value, ResolutionVerdict::Dismissed->value])
            ->whereNotNull('current_revision_id')
            ->whereNotNull('current_decision_id')
            ->whereExists(function ($decision): void {
                $decision->selectRaw('1')
                    ->from('resolution_decisions')
                    ->whereColumn('resolution_decisions.id', 'resolutions.current_decision_id')
                    ->whereColumn('resolution_decisions.resolution_id', 'resolutions.id')
                    ->whereColumn('resolution_decisions.revision_number', 'resolutions.revision_number')
                    ->where('resolution_decisions.decision', ResolutionStatus::Approved->value);
            });
    }
}
