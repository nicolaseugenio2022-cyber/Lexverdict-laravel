<?php

namespace Tests\Feature\M3;

use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\LegalCase;
use App\Models\Offense;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class CaseUiAndScopedAccessTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_admin_can_create_case_for_selected_prosecutor(): void
    {
        [$admin, $prosecutor] = $this->pairedStaff('m3_admin');
        $offense = Offense::factory()->create();

        $this->actingAs($admin)
            ->post('/cases', [
                ...$this->validPayload([$offense->id]),
                'assigned_prosecutor_id' => $prosecutor->id,
            ])
            ->assertRedirect();

        $case = LegalCase::query()->firstOrFail();
        $this->assertSame($prosecutor->id, $case->assigned_prosecutor_id);
        $this->assertSame($admin->id, $case->created_by_user_id);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'case.created', 'subject_id' => $case->id]);
    }

    public function test_secretary_create_form_and_submission_use_current_assignment_scope(): void
    {
        [, $assignedProsecutor, $secretary] = $this->pairedStaff('m3_secretary');
        [, $otherProsecutor] = $this->pairedStaff('m3_other');
        $offense = Offense::factory()->create();

        $this->actingAs($secretary)
            ->get('/cases/create')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Cases/Form')
                ->where('can_select_prosecutor', false));

        $this->actingAs($secretary)
            ->post('/cases', [
                ...$this->validPayload([$offense->id]),
                'assigned_prosecutor_id' => $otherProsecutor->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('cases', [
            'assigned_prosecutor_id' => $assignedProsecutor->id,
            'created_by_user_id' => $secretary->id,
        ]);
    }

    public function test_case_list_and_detail_are_scoped_by_role_and_assignment(): void
    {
        [, $firstProsecutor, $firstSecretary] = $this->pairedStaff('m3_first');
        [, $secondProsecutor, $secondSecretary] = $this->pairedStaff('m3_second');
        $firstCase = $this->createCaseFor($firstSecretary);
        $secondCase = $this->createCaseFor($secondSecretary);
        $processServer = $this->staff(StaffRole::ProcessServer, 'm3_ps');

        $this->actingAs($firstSecretary)
            ->get('/cases')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Cases/Index')
                ->has('cases.data', 1)
                ->where('cases.data.0.id', $firstCase->id));

        $this->actingAs($firstProsecutor)->get("/cases/{$firstCase->id}")->assertOk();
        $this->actingAs($firstProsecutor)->get("/cases/{$secondCase->id}")->assertForbidden();
        $this->actingAs($secondProsecutor)->get("/cases/{$firstCase->id}")->assertForbidden();
        $this->actingAs($processServer)->get("/cases/{$firstCase->id}")->assertForbidden();
    }

    public function test_admin_and_paired_secretary_can_revise_with_conflict_detection(): void
    {
        [$admin, , $secretary] = $this->pairedStaff('m3_revise');
        $case = $this->createCaseFor($secretary);
        $secondOffense = Offense::factory()->create(['name' => 'Updated Crime', 'normalized_name' => 'updated crime']);

        $this->actingAs($admin)
            ->get("/cases/{$case->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Cases/Form'));

        $this->actingAs($secretary)
            ->patch("/cases/{$case->id}", [
                ...$this->validPayload([$secondOffense->id]),
                'revision_number' => $case->revision_number,
                'police_station' => 'Updated Station',
            ])
            ->assertRedirect("/cases/{$case->id}");

        $case->refresh();
        $this->assertSame(2, $case->revision_number);
        $this->assertSame('Updated Station', $case->police_station);
        $this->assertDatabaseHas('subpoena_revisions', ['case_id' => $case->id, 'revision_number' => 2]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'case.revised', 'subject_id' => $case->id]);

        $this->actingAs($secretary)
            ->patch("/cases/{$case->id}", [
                ...$this->validPayload([$secondOffense->id]),
                'revision_number' => 1,
            ])
            ->assertSessionHasErrors('case');
    }

    public function test_unpaired_secretary_and_process_server_cannot_create_cases(): void
    {
        $secretary = $this->staff(StaffRole::Secretary, 'm3_unpaired_secretary');
        $processServer = $this->staff(StaffRole::ProcessServer, 'm3_process_server');

        $this->actingAs($secretary)->get('/cases/create')->assertForbidden();
        $this->actingAs($processServer)->get('/cases/create')->assertForbidden();
    }

    private function createCaseFor($secretary): LegalCase
    {
        $offense = Offense::factory()->create();

        return app(CreateCase::class)->create($this->validPayload([$offense->id]), $secretary)['case'];
    }

    /**
     * @param  list<string>  $offenseIds
     * @return array<string, mixed>
     */
    private function validPayload(array $offenseIds): array
    {
        return [
            'date' => '2026-07-10',
            'hearing_date_1' => '2026-07-20 09:00:00',
            'hearing_date_2' => '2026-07-21 09:00:00',
            'police_station' => 'Station',
            'offense_ids' => $offenseIds,
            'parties' => [
                $this->party(PartyRole::Complainant, 'Juan', 'Dela Cruz'),
                $this->party(PartyRole::Respondent, 'Pedro', 'Santos'),
            ],
        ];
    }

    /**
     * @return array<string, string|null>
     */
    private function party(PartyRole $role, string $firstName, string $lastName): array
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
        ];
    }
}
