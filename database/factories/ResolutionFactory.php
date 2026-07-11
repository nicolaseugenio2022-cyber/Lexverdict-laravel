<?php

namespace Database\Factories;

use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Models\LegalCase;
use App\Models\Resolution;
use App\Models\ResolutionDecision;
use App\Models\ResolutionRevision;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/** @extends Factory<Resolution> */
class ResolutionFactory extends Factory
{
    protected $model = Resolution::class;

    /**
     * @param  (callable(array<string, mixed>): array<string, mixed>)|array<string, mixed>  $attributes
     * @return Collection<int, Resolution>|Resolution
     */
    public function create($attributes = [], ?Model $parent = null)
    {
        return DB::transaction(fn () => parent::create($attributes, $parent));
    }

    public function definition(): array
    {
        return [
            'created_by_user_id' => User::factory()->role(StaffRole::Superuser),
            'case_id' => LegalCase::factory()->state([
                'subpoena_status' => SubpoenaStatus::Approved->value,
                'created_by_user_id' => User::factory()->role(StaffRole::Superuser),
            ]),
            'verdict' => ResolutionVerdict::Dismissed->value,
            'court' => null,
            'verdict_date' => today(),
            'status' => ResolutionStatus::Pending->value,
            'revision_number' => 1,
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Resolution $resolution): void {
            $revision = ResolutionRevision::create([
                'resolution_id' => $resolution->id,
                'revision_number' => $resolution->revision_number,
                'verdict' => $resolution->verdict instanceof ResolutionVerdict ? $resolution->verdict->value : $resolution->verdict,
                'court' => $resolution->court,
                'verdict_date' => $resolution->verdict_date,
                'submitted_by' => $resolution->created_by_user_id,
                'submitted_at' => now(),
            ]);
            $resolution->update(['current_revision_id' => $revision->id]);

            if ($resolution->status !== ResolutionStatus::Pending) {
                $decision = ResolutionDecision::create([
                    'resolution_id' => $resolution->id,
                    'revision_number' => $resolution->revision_number,
                    'decision' => $resolution->status->value,
                    'comment_type' => $resolution->status === ResolutionStatus::Denied ? 'Resolution' : null,
                    'comment' => $resolution->status === ResolutionStatus::Denied ? 'Factory denial comment.' : null,
                    'decided_by' => $resolution->created_by_user_id,
                    'decided_at' => now(),
                ]);
                $resolution->update(['current_decision_id' => $decision->id]);
            }
        });
    }

    public function forFiling(string $court = 'RTC Cabanatuan'): static
    {
        return $this->state(['verdict' => ResolutionVerdict::ForFiling->value, 'court' => $court]);
    }

    public function approved(): static
    {
        return $this->state(['status' => ResolutionStatus::Approved->value]);
    }

    public function denied(): static
    {
        return $this->state(['status' => ResolutionStatus::Denied->value]);
    }
}
