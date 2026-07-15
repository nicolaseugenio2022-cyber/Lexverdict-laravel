<?php

namespace Tests\Feature\Acceptance;

use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Actions\DecideSubpoena;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Actions\DecideResolution;
use App\Domain\Resolutions\Actions\SubmitResolution;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Resolution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class SecretaryVerificationWorkspaceTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_only_secretary_can_open_workspace_and_navigation_is_role_scoped(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('verification_roles');
        $processServer = $this->staff(StaffRole::ProcessServer, 'verification_process_server');

        $this->actingAs($secretary)->get('/secretary/verifying-cases')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Secretary/Verification/Index')
                ->where('tab', 'subpoenas')
                ->where('auth.can.view_secretary_verification', true));

        foreach ([$admin, $prosecutor, $processServer] as $user) {
            $this->actingAs($user)->get('/secretary/verifying-cases')->assertForbidden();
        }

        $unassignedSecretary = $this->staff(StaffRole::Secretary, 'verification_unassigned');
        $this->actingAs($unassignedSecretary)->get('/secretary/verifying-cases')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('items.total', 0));

        $inactiveSecretary = $this->staff(StaffRole::Secretary, 'verification_inactive');
        $inactiveSecretary->forceFill(['is_active' => false])->save();
        $this->actingAs($inactiveSecretary)->get('/secretary/verifying-cases')->assertRedirect('/login');

        $this->actingAs($secretary)
            ->get('/secretary/verifying-cases?tab=subpoenas&status=Invented&sort=unknown')
            ->assertSessionHasErrors(['status', 'sort']);
        $this->actingAs($secretary)
            ->get('/secretary/verifying-cases?tab=subpoenas&sort=verdict')
            ->assertSessionHasErrors('sort');
        $this->actingAs($secretary)
            ->get('/secretary/verifying-cases?tab=resolutions&sort=date')
            ->assertSessionHasErrors('sort');
    }

    public function test_subpoena_tab_preserves_statuses_denial_feedback_scope_actions_search_sort_and_pagination(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('verification_subpoenas');
        [, $otherProsecutor, $otherSecretary] = $this->pairedStaff('verification_other');
        $offense = Offense::factory()->create(['name' => 'Qualified Theft', 'normalized_name' => 'qualified theft']);
        $pending = $this->case($secretary, $offense, 1, 'Pending Complainant');
        $approved = $this->case($secretary, $offense, 2, 'Approved Complainant');
        app(DecideSubpoena::class)->approve($approved, $prosecutor, 1);
        $denied = $this->case($secretary, $offense, 3, 'Denied Complainant');
        app(DecideSubpoena::class)->deny($denied, $prosecutor, 1, 'Correct the witness address.');
        $crossPair = $this->case($otherSecretary, $offense, 4, 'Hidden Complainant');
        app(DecideSubpoena::class)->approve($crossPair, $otherProsecutor, 1);
        $crossPairDenied = $this->case($otherSecretary, $offense, 16, 'Hidden Denied Complainant');
        app(DecideSubpoena::class)->deny($crossPairDenied, $otherProsecutor, 1, 'Cross-pair confidential denial.');

        foreach ([
            [$pending, SubpoenaStatus::Pending->value],
            [$approved, SubpoenaStatus::Approved->value],
            [$denied, SubpoenaStatus::Denied->value],
        ] as [$case, $status]) {
            $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=subpoenas&search='.urlencode($case->docket_number).'&status='.$status.'&sort=revision&direction=desc')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->has('items.data', 1)
                    ->where('items.data.0.case_id', $case->id)
                    ->where('items.data.0.subpoena_status', $status)
                    ->where('items.data.0.assigned_prosecutor', $prosecutor->staffProfile?->displayName()));
        }

        $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=subpoenas&search='.urlencode($denied->docket_number))
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data.0.denial_reason', 'Correct the witness address.')
                ->where('items.data.0.workflow_label', 'Revision required')
                ->where('items.data.0.can_revise', true));

        $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=subpoenas&search='.urlencode($approved->docket_number))
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data.0.subpoena_status', 'Approved')
                ->where('items.data.0.can_generate_pdf', true));

        $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=subpoenas&search='.urlencode($crossPair->docket_number))
            ->assertInertia(fn (Assert $page) => $page->has('items.data', 0));
        $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=subpoenas&search='.urlencode($crossPairDenied->docket_number))
            ->assertInertia(fn (Assert $page) => $page->has('items.data', 0));

        $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=subpoenas&sort=date&direction=asc')
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data.0.case_id', $pending->id)
                ->where('items.data.1.case_id', $approved->id)
                ->where('items.data.2.case_id', $denied->id));

        for ($number = 5; $number <= 15; $number++) {
            $this->case($secretary, $offense, $number, "Page {$number}");
        }
        DB::flushQueryLog();
        DB::enableQueryLog();
        $response = $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=subpoenas&status=Pending&sort=docket_number&direction=asc');
        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        $response->assertInertia(fn (Assert $page) => $page
            ->where('filters.status', 'Pending')
            ->where('filters.sort', 'docket_number')
            ->where('items.current_page', 1)
            ->where('items.total', 12));
        $this->assertLessThanOrEqual(15, $queryCount, 'Verification query count must remain page-size independent.');

        $this->actingAs($secretary)->post("/subpoena-reviews/{$pending->id}/approve", ['revision_number' => 1])->assertForbidden();
        $this->actingAs($secretary)->post("/subpoena-reviews/{$pending->id}/deny", ['revision_number' => 1, 'comment' => 'Unauthorized'])->assertForbidden();
        $this->actingAs($secretary)->get("/cases/{$crossPair->id}")->assertForbidden();
        $this->actingAs($secretary)->get("/cases/{$crossPair->id}/edit")->assertForbidden();
        $this->actingAs($secretary)->post("/cases/{$crossPair->id}/documents/subpoena")->assertForbidden();
    }

    public function test_resolution_tab_preserves_distinct_verdict_status_denials_scope_and_valid_actions(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('verification_resolutions');
        [, $otherProsecutor, $otherSecretary] = $this->pairedStaff('verification_resolutions_other');
        $offense = Offense::factory()->create(['name' => 'Estafa', 'normalized_name' => 'estafa']);

        $notSubmitted = $this->approvedCase($secretary, $prosecutor, $offense, 16, 'Submit Complainant');
        $pending = $this->resolution($secretary, $prosecutor, $offense, 17, 'Pending Resolution', 'For Filing');
        $denied = $this->resolution($secretary, $prosecutor, $offense, 18, 'Denied Resolution', 'Dismissed');
        app(DecideResolution::class)->deny($denied, $admin, 1, 'Revise the Resolution analysis.');
        $approved = $this->resolution($secretary, $prosecutor, $offense, 19, 'Approved Resolution', 'For Filing');
        app(DecideResolution::class)->approve($approved, $admin, 1);
        $crossPairResolution = $this->resolution($otherSecretary, $otherProsecutor, $offense, 20, 'Hidden Resolution', 'Dismissed');
        app(DecideResolution::class)->deny($crossPairResolution, $admin, 1, 'Cross-pair confidential Resolution denial.');
        $crossPair = $crossPairResolution->case;

        foreach ([
            [$pending, ResolutionStatus::Pending->value, true],
            [$denied, ResolutionStatus::Denied->value, true],
            [$approved, ResolutionStatus::Approved->value, false],
        ] as [$resolution, $status, $canRevise]) {
            $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=resolutions&search='.urlencode($resolution->case->docket_number).'&status='.$status.'&sort=verdict&direction=asc')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->has('items.data', 1)
                    ->where('items.data.0.resolution_id', $resolution->id)
                    ->where('items.data.0.resolution_status', $status)
                    ->where('items.data.0.resolution_verdict', $resolution->getRawOriginal('verdict'))
                    ->where('items.data.0.can_revise', $canRevise));
        }

        $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=resolutions&search='.urlencode($notSubmitted->docket_number))
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data.0.resolution_status', null)
                ->where('items.data.0.resolution_verdict', null)
                ->where('items.data.0.workflow_label', 'Submission required')
                ->where('items.data.0.can_submit', true));

        $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=resolutions&search='.urlencode($denied->case->docket_number))
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data.0.denial_reason', 'Revise the Resolution analysis.')
                ->where('items.data.0.submitted_by', $secretary->staffProfile?->displayName()));

        $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=resolutions&search='.urlencode($crossPair->docket_number))
            ->assertInertia(fn (Assert $page) => $page->has('items.data', 0));

        $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=resolutions&sort=docket_number&direction=desc')
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data.0.case_id', $approved->case_id));

        for ($number = 21; $number <= 26; $number++) {
            if ($number % 2 === 0) {
                $this->resolution($secretary, $prosecutor, $offense, $number, "Resolution Page {$number}", 'Dismissed');
            } else {
                $this->approvedCase($secretary, $prosecutor, $offense, $number, "Submit Page {$number}");
            }
        }

        DB::flushQueryLog();
        DB::enableQueryLog();
        $response = $this->actingAs($secretary)->get('/secretary/verifying-cases?tab=resolutions&sort=docket_number&direction=asc');
        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        $response->assertInertia(fn (Assert $page) => $page
            ->where('items.current_page', 1)
            ->where('items.total', 10)
            ->has('items.data', 10));
        $this->assertLessThanOrEqual(15, $queryCount, 'Resolution verification query count must remain page-size independent.');

        $this->actingAs($secretary)->post("/resolution-reviews/{$pending->id}/approve", ['revision_number' => 1])->assertForbidden();
        $this->actingAs($secretary)->post("/resolution-reviews/{$pending->id}/deny", ['revision_number' => 1, 'comment' => 'Unauthorized'])->assertForbidden();
        $this->actingAs($secretary)->get("/cases/{$crossPair->id}/resolution/create")->assertForbidden();
        $this->actingAs($secretary)->get("/resolutions/{$crossPairResolution->id}")->assertForbidden();
        $this->actingAs($secretary)->get("/resolutions/{$crossPairResolution->id}/edit")->assertForbidden();
        $this->actingAs($secretary)->patch("/resolutions/{$crossPairResolution->id}", [])->assertForbidden();
    }

    private function approvedCase(User $secretary, User $prosecutor, Offense $offense, int $day, string $complainant): LegalCase
    {
        $case = $this->case($secretary, $offense, $day, $complainant);
        app(DecideSubpoena::class)->approve($case, $prosecutor, 1);

        return $case->refresh();
    }

    private function resolution(User $secretary, User $prosecutor, Offense $offense, int $day, string $complainant, string $verdict): Resolution
    {
        $case = $this->approvedCase($secretary, $prosecutor, $offense, $day, $complainant);

        return app(SubmitResolution::class)->create($case, [
            'verdict' => $verdict,
            'court' => $verdict === 'For Filing' ? 'RTC Cabanatuan' : null,
        ], $secretary);
    }

    private function case(User $secretary, Offense $offense, int $day, string $complainant): LegalCase
    {
        return app(CreateCase::class)->create([
            'date' => sprintf('2026-07-%02d', (($day - 1) % 28) + 1),
            'hearing_date_1' => '2026-08-20 09:00:00',
            'hearing_date_2' => '2026-08-21 09:00:00',
            'police_station' => 'Verification Police Station',
            'offense_ids' => [$offense->id],
            'parties' => [
                $this->party('Complainant', $complainant, 'Demo'),
                $this->party('Respondent', 'Respondent', 'Demo'),
            ],
        ], $secretary)['case'];
    }

    /** @return array<string, string> */
    private function party(string $role, string $firstName, string $lastName): array
    {
        return [
            'role' => $role,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'date_of_birth' => '1990-01-01',
            'sex' => 'Female',
            'street' => 'Street',
            'barangay' => 'Barangay',
            'municipality' => 'Municipality',
            'province' => 'Province',
            'region' => 'III',
        ];
    }
}
