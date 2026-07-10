<?php

namespace Database\Factories;

use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<LegalCase>
 */
class LegalCaseFactory extends Factory
{
    protected $model = LegalCase::class;

    public function definition(): array
    {
        return [
            'docket_number' => fake()->unique()->bothify('III-09-INV-26A-####'),
            'date' => fake()->date(),
            'hearing_date_1' => null,
            'hearing_date_2' => null,
            'police_station' => 'Test Police Station',
            'assigned_prosecutor_id' => User::factory()->role(StaffRole::Prosecutor),
            'created_by_user_id' => User::factory()->role(StaffRole::Secretary),
            'subpoena_status' => SubpoenaStatus::Pending->value,
            'pin_hash' => Hash::make('000000'),
            'pin_issued_at' => now(),
            'revision_number' => 1,
        ];
    }
}
