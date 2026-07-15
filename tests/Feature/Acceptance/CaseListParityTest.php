<?php

namespace Tests\Feature\Acceptance;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\CaseParty;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Resolution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class CaseListParityTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_each_role_receives_the_approved_legacy_projection_and_scope(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('parity_primary');
        [, $otherProsecutor, $otherSecretary] = $this->pairedStaff('parity_other');
        $processServer = $this->staff(StaffRole::ProcessServer, 'parity_process');
        $offense = $this->offense('Qualified Theft');

        foreach (range(1, 7) as $serial) {
            $this->caseRecord($prosecutor->id, $secretary->id, $offense, $serial);
        }

        foreach (range(8, 9) as $serial) {
            $this->caseRecord($otherProsecutor->id, $otherSecretary->id, $offense, $serial);
        }

        foreach ([
            [$admin, '/cases', 'administrator', 9, 'III-09-INV-26G-0009', true, true],
            [$secretary, '/cases', 'secretary', 7, 'III-09-INV-26G-0007', true, true],
            [$prosecutor, '/cases', 'prosecutor', 7, 'III-09-INV-26G-0007', false, true],
            [$processServer, '/process-server/cases', 'process_server', 9, 'III-09-INV-26G-0009', false, false],
        ] as [$user, $url, $role, $total, $firstDocket, $canCreate, $hasCommands]) {
            $this->actingAs($user)
                ->get($url)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Cases/Index')
                    ->where('list_role', $role)
                    ->where('can_create_case', $canCreate)
                    ->where('cases.total', $total)
                    ->has('cases.data', 6)
                    ->where('cases.data.0.docket_number', $firstDocket)
                    ->has('cases.data.0', function (Assert $case) use ($hasCommands): void {
                        $case->hasAll([
                            'id',
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
                        ])->missingAll(['pin', 'pin_hash', 'pin_document_secret', 'subpoena_status']);

                        if ($hasCommands) {
                            $case->hasAll(['command_status', 'can_submit_resolution', 'can_generate_subpoena']);
                        } else {
                            $case->missingAll(['command_status', 'can_submit_resolution', 'can_generate_subpoena']);
                        }

                        $case->etc();
                    }));
        }

        $this->actingAs($secretary)
            ->get('/cases?page=999')
            ->assertInertia(fn (Assert $page) => $page
                ->where('cases.current_page', 2)
                ->has('cases.data', 1));
    }

    public function test_visible_fields_drive_legacy_search_sort_and_pagination(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('parity_query');
        $theft = $this->offense('Qualified Theft');
        $arson = $this->offense('Arson');
        $prosecutor->staffProfile()->update(['first_name' => 'Paolo', 'last_name' => 'Santos']);
        $resolved = $this->caseRecord($prosecutor->id, $secretary->id, $theft, 1, 'Camille', 'Ramon', 'Cabanatuan City Police Station');
        $resolved->update(['subpoena_status' => 'Approved']);
        Resolution::factory()->forFiling('RTC Cabanatuan')->approved()->create([
            'case_id' => $resolved->id,
            'created_by_user_id' => $admin->id,
            'verdict_date' => '2026-07-20',
        ]);
        $pending = $this->caseRecord($prosecutor->id, $secretary->id, $arson, 2, 'Andrea', 'Zamora', 'Aliaga Police Station');
        $pending->update(['subpoena_status' => 'Approved']);
        Resolution::factory()->forFiling('Hidden Internal Court')->denied()->create([
            'case_id' => $pending->id,
            'created_by_user_id' => $admin->id,
            'verdict_date' => '2026-07-01',
        ]);

        $filterOptions = [
            ['value' => 'docket_number', 'label' => 'Docket No.'],
            ['value' => 'crime', 'label' => 'Case'],
            ['value' => 'complainant', 'label' => 'Complainant'],
            ['value' => 'respondent', 'label' => 'Respondent'],
            ['value' => 'police_station', 'label' => 'Police Station'],
            ['value' => 'assigned_prosecutor', 'label' => 'Prosecutor'],
            ['value' => 'resolution_verdict', 'label' => 'Verdict'],
        ];

        $this->actingAs($admin)->get('/cases')
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters', [
                    'search' => '',
                    'filter' => '',
                    'sort' => 'docket_number',
                    'order' => 'desc',
                ])
                ->where('filter_options', $filterOptions)
                ->where('sort_options', [
                    ['value' => 'docket_number', 'label' => 'Docket No.'],
                    ['value' => 'crime', 'label' => 'Case'],
                    ['value' => 'police_station', 'label' => 'Police Station'],
                    ['value' => 'assigned_prosecutor', 'label' => 'Prosecutor'],
                    ['value' => 'resolution_verdict', 'label' => 'Verdict'],
                    ['value' => 'complainant', 'label' => 'Complainant'],
                    ['value' => 'respondent', 'label' => 'Respondent'],
                ]));

        foreach ([
            ['docket_number', '0001', 1, $resolved->id],
            ['crime', 'Qualified', 1, $resolved->id],
            ['complainant', 'Camille', 1, $resolved->id],
            ['respondent', 'Ramon', 1, $resolved->id],
            ['police_station', 'Cabanatuan', 1, $resolved->id],
            ['assigned_prosecutor', 'Paolo Santos', 2, $pending->id],
            ['resolution_verdict', 'For Filing', 1, $resolved->id],
            ['resolution_verdict', 'Pending', 1, $pending->id],
        ] as [$filter, $search, $expectedTotal, $expectedId]) {
            $this->actingAs($admin)
                ->get('/cases?filter='.$filter.'&search='.urlencode($search))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('cases.total', $expectedTotal)
                    ->where('cases.data.0.id', $expectedId));
        }

        $this->actingAs($admin)->get('/cases?search=Hidden%20Internal%20Court')
            ->assertInertia(fn (Assert $page) => $page->where('cases.total', 0));

        $this->actingAs($admin)->get('/cases?filter=complainant&search=Demo')
            ->assertInertia(fn (Assert $page) => $page->where('cases.total', 0));
        $this->actingAs($admin)->get('/cases?filter=assigned_prosecutor&search=prosecutor_parity_query')
            ->assertInertia(fn (Assert $page) => $page->where('cases.total', 0));

        foreach ([
            'docket_number' => $resolved->id,
            'crime' => $pending->id,
            'police_station' => $pending->id,
            'assigned_prosecutor' => $resolved->id,
            'resolution_verdict' => $resolved->id,
            'complainant' => $pending->id,
            'respondent' => $resolved->id,
        ] as $sort => $expectedFirstId) {
            $this->actingAs($admin)
                ->get('/cases?sort='.$sort.'&order=asc')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('filters.sort', $sort)
                    ->where('filters.order', 'asc')
                    ->where('cases.data.0.id', $expectedFirstId));
        }

        $this->actingAs($admin)->get('/cases?sort=unsupported&order=sideways&filter=unsupported&search=Camille')
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.sort', 'docket_number')
                ->where('filters.order', 'desc')
                ->where('filters.filter', '')
                ->where('cases.total', 1));
    }

    public function test_multi_value_sorting_and_verdict_date_nulls_follow_the_visible_legacy_projection(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('parity_aggregate_sort');
        [, $otherProsecutor, $otherSecretary] = $this->pairedStaff('parity_aggregate_other');
        $processServer = $this->staff(StaffRole::ProcessServer, 'parity_aggregate_process');
        $prosecutor->staffProfile()->update(['first_name' => 'Zulu', 'last_name' => 'Prosecutor']);
        $otherProsecutor->staffProfile()->update(['first_name' => 'Alpha', 'last_name' => 'Prosecutor']);
        $common = $this->offense('Common Crime');
        $alpha = $this->offense('Alpha Crime');
        $zulu = $this->offense('Zulu Crime');
        $resolved = $this->caseRecord($prosecutor->id, $secretary->id, $common, 1, 'Common', 'Respondent');
        $pending = $this->caseRecord($otherProsecutor->id, $otherSecretary->id, $common, 2, 'Common', 'Respondent');
        $resolved->offenses()->attach($zulu);
        $pending->offenses()->attach($alpha);
        $this->party($resolved, 'Complainant', 'Zulu', 2);
        $this->party($pending, 'Complainant', 'Alpha', 2);
        $resolved->update(['subpoena_status' => 'Approved']);
        Resolution::factory()->approved()->create([
            'case_id' => $resolved->id,
            'created_by_user_id' => $admin->id,
            'verdict_date' => '2026-07-20',
        ]);

        foreach (['crime', 'complainant'] as $sort) {
            $this->actingAs($admin)
                ->get('/cases?sort='.$sort.'&order=asc')
                ->assertInertia(fn (Assert $page) => $page->where('cases.data.0.id', $pending->id));
        }

        $this->actingAs($admin)
            ->get('/cases?sort=assigned_prosecutor&order=asc')
            ->assertInertia(fn (Assert $page) => $page->where('cases.data.0.id', $pending->id));
        $this->actingAs($admin)
            ->get('/cases?sort=assigned_prosecutor&order=desc')
            ->assertInertia(fn (Assert $page) => $page->where('cases.data.0.id', $resolved->id));

        $this->actingAs($processServer)
            ->get('/process-server/cases?sort=verdict_date&order=asc')
            ->assertInertia(fn (Assert $page) => $page->where('cases.data.0.id', $pending->id));
        $this->actingAs($processServer)
            ->get('/process-server/cases?sort=verdict_date&order=desc')
            ->assertInertia(fn (Assert $page) => $page->where('cases.data.0.id', $resolved->id));
    }

    public function test_role_commands_preserve_legacy_states_and_server_authorization(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('parity_commands');
        $processServer = $this->staff(StaffRole::ProcessServer, 'parity_commands_process');
        $offense = $this->offense('Qualified Theft');
        $unresolved = $this->caseRecord($prosecutor->id, $secretary->id, $offense, 1);
        $unresolved->update([
            'subpoena_status' => 'Approved',
            'hearing_date_1' => '2026-08-01 09:00:00',
            'pin_document_secret' => 'encrypted-document-secret',
        ]);
        $resolving = $this->caseRecord($prosecutor->id, $secretary->id, $offense, 2);
        $resolving->update(['subpoena_status' => 'Approved']);
        Resolution::factory()->denied()->create([
            'case_id' => $resolving->id,
            'created_by_user_id' => $secretary->id,
        ]);
        $resolved = $this->caseRecord($prosecutor->id, $secretary->id, $offense, 3);
        $resolved->update(['subpoena_status' => 'Approved']);
        Resolution::factory()->approved()->create([
            'case_id' => $resolved->id,
            'created_by_user_id' => $secretary->id,
        ]);

        foreach ([$admin, $secretary] as $user) {
            $this->assertCommand($user, $unresolved, null, true, true);
            $this->assertCommand($user, $resolving, 'Resolving...', false, false);
            $this->assertCommand($user, $resolved, 'Resolved', false, false);
        }

        $this->assertCommand($prosecutor, $unresolved, 'Due for Hearing', false, false);
        $this->assertCommand($prosecutor, $resolving, 'Resolving...', false, false);
        $this->assertCommand($prosecutor, $resolved, 'Resolved', false, false);

        $this->actingAs($processServer)
            ->get('/process-server/cases?filter=docket_number&search='.urlencode($unresolved->docket_number))
            ->assertInertia(fn (Assert $page) => $page->has('cases.data.0', fn (Assert $case) => $case
                ->missingAll(['command_status', 'can_submit_resolution', 'can_generate_subpoena'])
                ->etc()));
    }

    private function assertCommand(
        User $user,
        LegalCase $case,
        ?string $status,
        bool $canSubmit,
        bool $canGenerate,
    ): void {
        $this->actingAs($user)
            ->get('/cases?filter=docket_number&search='.urlencode($case->docket_number))
            ->assertInertia(fn (Assert $page) => $page
                ->where('cases.data.0.command_status', $status)
                ->where('cases.data.0.can_submit_resolution', $canSubmit)
                ->where('cases.data.0.can_generate_subpoena', $canGenerate));
    }

    private function offense(string $name): Offense
    {
        return Offense::factory()->create([
            'name' => $name,
            'normalized_name' => mb_strtolower($name),
        ]);
    }

    private function caseRecord(
        string $prosecutorId,
        string $secretaryId,
        Offense $offense,
        int $serial,
        string $complainant = 'Complainant',
        string $respondent = 'Respondent',
        string $station = 'Test Police Station',
    ): LegalCase {
        $case = LegalCase::factory()->create([
            'docket_number' => sprintf('III-09-INV-26G-%04d', $serial),
            'date' => sprintf('2026-07-%02d', min($serial + 9, 28)),
            'police_station' => $station,
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
