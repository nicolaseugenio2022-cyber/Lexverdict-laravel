<?php

namespace Tests\Feature\Acceptance;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\CaseParty;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Resolution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class ProcessServerCaseListTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_process_server_can_search_sort_and_paginate_the_read_only_legacy_case_projection(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('acceptance_ps_list');
        $processServer = $this->staff(StaffRole::ProcessServer, 'acceptance_ps');
        $offense = Offense::factory()->create([
            'name' => 'Qualified Theft',
            'normalized_name' => 'qualified theft',
            'law_reference' => 'Article 310',
        ]);

        $resolvedCase = $this->caseRecord($prosecutor->id, $secretary->id, $offense, 1, 'Camille', 'Ramon');
        $resolvedCase->update(['subpoena_status' => 'Approved']);
        Resolution::factory()->forFiling('RTC Cabanatuan')->approved()->create([
            'case_id' => $resolvedCase->id,
            'created_by_user_id' => $admin->id,
            'verdict_date' => '2026-07-20',
        ]);

        $deniedCase = $this->caseRecord($prosecutor->id, $secretary->id, $offense, 2, 'Denied', 'Internal');
        $deniedCase->update(['subpoena_status' => 'Approved']);
        Resolution::factory()->forFiling('Internal Review Court')->denied()->create([
            'case_id' => $deniedCase->id,
            'created_by_user_id' => $admin->id,
            'verdict_date' => '2026-07-01',
        ]);

        foreach (range(3, 11) as $serial) {
            $this->caseRecord($prosecutor->id, $secretary->id, $offense, $serial, 'Complainant'.$serial, 'Respondent'.$serial);
        }

        $this->actingAs($processServer)
            ->get('/process-server/cases')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Cases/Index')
                ->where('is_process_server', true)
                ->where('can_create_case', false)
                ->where('list_url', '/process-server/cases')
                ->where('cases.total', 11)
                ->has('cases.data', 10)
                ->has('cases.data.0', fn (Assert $case) => $case
                    ->hasAll([
                        'docket_number',
                        'offenses',
                        'complainants',
                        'respondents',
                        'police_station',
                        'date',
                        'assigned_prosecutor_name',
                        'resolution_verdict',
                        'court',
                        'verdict_date',
                    ])
                    ->missing('pin')
                    ->missing('pin_hash')
                    ->missing('pin_document_secret')
                    ->etc()));

        $this->actingAs($processServer)
            ->get('/process-server/cases?search=RTC%20Cabanatuan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('cases.data', 1)
                ->where('cases.data.0.id', $resolvedCase->id)
                ->where('cases.data.0.resolution_verdict', 'For Filing')
                ->where('cases.data.0.court', 'RTC Cabanatuan')
                ->where('cases.data.0.verdict_date', '2026-07-20'));

        $this->actingAs($processServer)
            ->get('/process-server/cases?search=Internal%20Review%20Court')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('cases.total', 0));

        $this->actingAs($processServer)
            ->get('/process-server/cases?search=Pending')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('cases.total', 10)
                ->where('cases.data.0.resolution_verdict', 'Pending')
                ->where('cases.data.0.court', null)
                ->where('cases.data.0.verdict_date', null));

        foreach (['docket_number', 'crime', 'complainant', 'respondent', 'police_station', 'date', 'assigned_prosecutor', 'resolution_verdict', 'court', 'verdict_date'] as $sort) {
            $this->actingAs($processServer)
                ->get('/process-server/cases?sort='.$sort.'&direction=asc')
                ->assertOk();
        }

        foreach (['court', 'verdict_date'] as $sort) {
            $this->actingAs($processServer)
                ->get('/process-server/cases?sort='.$sort.'&direction=asc')
                ->assertInertia(fn (Assert $page) => $page->where('cases.data.0.id', $resolvedCase->id));
        }

        $this->actingAs($processServer)
            ->get('/cases')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('is_process_server', true)
                ->where('cases.total', 11));
    }

    public function test_process_server_is_denied_case_detail_mutations_reviews_documents_and_administration(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('acceptance_ps_denials');
        $processServer = $this->staff(StaffRole::ProcessServer, 'acceptance_ps_denials');
        $offense = Offense::factory()->create();
        $case = $this->caseRecord($prosecutor->id, $secretary->id, $offense, 1, 'Juan', 'Pedro');
        $case->update(['subpoena_status' => 'Approved']);
        $resolution = Resolution::factory()->approved()->create([
            'case_id' => $case->id,
            'created_by_user_id' => $admin->id,
        ]);

        $this->actingAs($admin)->get('/process-server/cases')->assertForbidden();

        $this->actingAs($processServer)->get('/cases/create')->assertForbidden();
        $this->actingAs($processServer)->post('/cases', [])->assertForbidden();
        $this->actingAs($processServer)->get("/cases/{$case->id}")->assertForbidden();
        $this->actingAs($processServer)->get("/cases/{$case->id}/edit")->assertForbidden();
        $this->actingAs($processServer)->patch("/cases/{$case->id}", [])->assertForbidden();
        $this->actingAs($processServer)->get('/subpoena-reviews')->assertForbidden();
        $this->actingAs($processServer)->post("/subpoena-reviews/{$case->id}/approve", ['revision_number' => 1])->assertForbidden();
        $this->actingAs($processServer)->get("/cases/{$case->id}/resolution/create")->assertForbidden();
        $this->actingAs($processServer)->post("/cases/{$case->id}/resolution", [])->assertForbidden();
        $this->actingAs($processServer)->get('/resolution-reviews')->assertForbidden();
        $this->actingAs($processServer)->post("/resolution-reviews/{$resolution->id}/approve", ['revision_number' => 1])->assertForbidden();
        $this->actingAs($processServer)->post("/cases/{$case->id}/documents/subpoena")->assertForbidden();
        $this->actingAs($processServer)->get('/admin/users')->assertForbidden();
        $this->actingAs($processServer)->get('/admin/reports')->assertForbidden();
        $this->actingAs($processServer)->get('/admin/audit')->assertForbidden();

        $this->assertFalse(Gate::forUser($processServer)->allows('manage-offenses'));
    }

    private function caseRecord(string $prosecutorId, string $secretaryId, Offense $offense, int $serial, string $complainant, string $respondent): LegalCase
    {
        $case = LegalCase::factory()->create([
            'docket_number' => sprintf('III-09-INV-26G-%04d', $serial),
            'date' => sprintf('2026-07-%02d', min($serial + 9, 28)),
            'police_station' => $serial === 1 ? 'Cabanatuan City Police Station' : 'Test Police Station '.$serial,
            'assigned_prosecutor_id' => $prosecutorId,
            'created_by_user_id' => $secretaryId,
        ]);
        $case->offenses()->attach($offense);
        $this->party($case, 'Complainant', $complainant, 1);
        $this->party($case, 'Respondent', $respondent, 2);

        return $case;
    }

    private function party(LegalCase $case, string $role, string $lastName, int $position): void
    {
        CaseParty::create([
            'case_id' => $case->id,
            'role' => $role,
            'position' => $position,
            'first_name' => 'Demo',
            'last_name' => $lastName,
            'sex' => 'Male',
            'street' => 'Maharlika Street',
            'barangay' => 'San Josef Sur',
            'municipality' => 'Cabanatuan City',
            'province' => 'Nueva Ecija',
            'region' => 'III',
        ]);
    }
}
