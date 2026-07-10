<?php

namespace Tests\Feature\M2;

use App\Domain\Cases\Actions\AllocateDocketNumber;
use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Actions\IssueCasePin;
use App\Domain\Cases\Actions\ManageOffense;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Cases\Exceptions\CaseDataInvariantException;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\Offense;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class CaseDataFoundationTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_secretary_creates_pending_case_for_assigned_prosecutor_with_docket_pin_revision_and_audit(): void
    {
        [, $assignedProsecutor, $secretary] = $this->pairedStaff('m2_one');
        $otherProsecutor = $this->staff(StaffRole::Prosecutor, 'other_prosecutor');
        $offenses = Offense::factory()->count(2)->create();

        $result = app(CreateCase::class)->create($this->validCaseData($offenses->pluck('id')->all(), [
            'assigned_prosecutor_id' => $otherProsecutor->id,
        ]), $secretary);

        $case = $result['case']->refresh();

        $this->assertSame($assignedProsecutor->id, $case->assigned_prosecutor_id);
        $this->assertSame($secretary->id, $case->created_by_user_id);
        $this->assertSame(SubpoenaStatus::Pending, $case->subpoena_status);
        $this->assertSame('III-09-INV-26G-0001-0002', $case->docket_number);
        $this->assertMatchesRegularExpression('/^\d{6}$/', $result['pin']);
        $this->assertTrue(Hash::check($result['pin'], $case->pin_hash));
        $this->assertDatabaseCount('case_offenses', 2);
        $this->assertDatabaseHas('case_parties', ['case_id' => $case->id, 'role' => PartyRole::Complainant->value]);
        $this->assertDatabaseHas('case_parties', ['case_id' => $case->id, 'role' => PartyRole::Respondent->value]);
        $this->assertDatabaseHas('subpoena_revisions', ['case_id' => $case->id, 'revision_number' => 1]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'case.created', 'subject_id' => $case->id]);
    }

    public function test_case_creation_rejects_unpaired_or_cross_role_creator(): void
    {
        $prosecutor = $this->staff(StaffRole::Prosecutor, 'not_secretary');
        $offense = Offense::factory()->create();

        $this->expectException(CaseDataInvariantException::class);

        app(CreateCase::class)->create($this->validCaseData([$offense->id]), $prosecutor);
    }

    public function test_case_creation_requires_one_offense(): void
    {
        [, , $secretary] = $this->pairedStaff('m2_two');

        $this->expectException(CaseDataInvariantException::class);
        app(CreateCase::class)->create($this->validCaseData([], []), $secretary);
    }

    public function test_case_creation_requires_both_party_roles(): void
    {
        [, , $secretary] = $this->pairedStaff('m2_two_roles');
        $offense = Offense::factory()->create();

        $this->expectException(CaseDataInvariantException::class);
        app(CreateCase::class)->create($this->validCaseData([$offense->id], [
            'parties' => [
                $this->party(PartyRole::Complainant, 'Only', 'Complainant'),
            ],
        ]), $secretary);
    }

    public function test_case_creation_rejects_minor_party(): void
    {
        [, , $secretary] = $this->pairedStaff('m2_three');
        $offense = Offense::factory()->create();

        $this->expectException(CaseDataInvariantException::class);
        app(CreateCase::class)->create($this->validCaseData([$offense->id], [
            'parties' => [
                $this->party(PartyRole::Complainant, 'Minor', 'Party', ['date_of_birth' => now()->subYears(17)->toDateString()]),
                $this->party(PartyRole::Respondent, 'Adult', 'Party'),
            ],
        ]), $secretary);
    }

    public function test_case_creation_rejects_second_hearing_before_first(): void
    {
        [, , $secretary] = $this->pairedStaff('m2_three_hearing');
        $offense = Offense::factory()->create();

        $this->expectException(CaseDataInvariantException::class);
        app(CreateCase::class)->create($this->validCaseData([$offense->id], [
            'hearing_date_1' => '2026-07-20 09:00:00',
            'hearing_date_2' => '2026-07-19 09:00:00',
        ]), $secretary);
    }

    public function test_docket_allocator_reserves_serial_ranges_and_resets_by_month_and_year(): void
    {
        $allocator = app(AllocateDocketNumber::class);

        $first = $allocator->allocate(CarbonImmutable::parse('2026-07-10'), 1);
        $second = $allocator->allocate(CarbonImmutable::parse('2026-07-10'), 3);
        $nextYearJanuary = $allocator->allocate(CarbonImmutable::parse('2027-01-05'), 1);

        $this->assertSame('III-09-INV-26G-0001', $first->docketNumber);
        $this->assertSame('III-09-INV-26G-0002-0004', $second->docketNumber);
        $this->assertSame('III-09-INV-27A-0001', $nextYearJanuary->docketNumber);
        $this->assertDatabaseHas('docket_counters', [
            'year' => 2026,
            'month' => 7,
            'last_serial' => 4,
        ]);
    }

    public function test_offense_catalog_management_is_case_insensitive_and_audited(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'offense_admin');
        $manager = app(ManageOffense::class);

        $offense = $manager->create('Qualified Theft', 'Article 310', $admin);

        $this->assertDatabaseHas('offenses', [
            'id' => $offense->id,
            'normalized_name' => 'qualified theft',
        ]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'offense.created', 'subject_id' => $offense->id]);

        $this->expectException(CaseDataInvariantException::class);
        $manager->create(' qualified   theft ', null, $admin);
    }

    public function test_pin_reset_replaces_hash_and_returns_one_time_pin(): void
    {
        [, , $secretary] = $this->pairedStaff('m2_four');
        $offense = Offense::factory()->create();
        $case = app(CreateCase::class)->create($this->validCaseData([$offense->id]), $secretary)['case'];
        $oldHash = $case->pin_hash;

        $pin = app(IssueCasePin::class)->reset($case);

        $this->assertMatchesRegularExpression('/^\d{6}$/', $pin);
        $this->assertNotSame($oldHash, $case->refresh()->pin_hash);
        $this->assertTrue(Hash::check($pin, $case->pin_hash));
        $this->assertNotNull($case->pin_reset_at);
    }

    /**
     * @param  list<string>  $offenseIds
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function validCaseData(array $offenseIds, array $overrides = []): array
    {
        return [
            'date' => '2026-07-10',
            'hearing_date_1' => '2026-07-20 09:00:00',
            'hearing_date_2' => '2026-07-21 09:00:00',
            'police_station' => 'Sample Police Station',
            'offense_ids' => $offenseIds,
            'parties' => [
                $this->party(PartyRole::Complainant, 'Juan', 'Dela Cruz'),
                $this->party(PartyRole::Respondent, 'Pedro', 'Santos'),
            ],
            ...$overrides,
        ];
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function party(PartyRole $role, string $firstName, string $lastName, array $overrides = []): array
    {
        return [
            'role' => $role->value,
            'first_name' => $firstName,
            'middle_name' => null,
            'last_name' => $lastName,
            'suffix' => null,
            'date_of_birth' => '1990-01-01',
            'sex' => 'Male',
            'street' => 'Street',
            'barangay' => 'Barangay',
            'municipality' => 'Municipality',
            'province' => 'Province',
            'region' => 'Region',
            ...$overrides,
        ];
    }
}
