<?php

namespace Tests\Feature\Acceptance;

use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Dashboard\Queries\OperationalDashboardQuery;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\AuditEvent;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Resolution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class OperationalLandingExperienceTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_administrator_dashboard_reports_supported_work_and_existing_audit_activity(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('dashboard');
        $this->staff(StaffRole::ProcessServer, 'dashboard_process_server');
        $this->staff(StaffRole::Prosecutor, 'dashboard_inactive_prosecutor', false);
        Offense::factory()->create(['is_active' => true]);
        Offense::factory()->create(['is_active' => false]);

        $pending = LegalCase::factory()->create([
            'assigned_prosecutor_id' => $prosecutor->id,
            'created_by_user_id' => $secretary->id,
            'subpoena_status' => SubpoenaStatus::Pending->value,
        ]);
        $ready = LegalCase::factory()->create([
            'assigned_prosecutor_id' => $prosecutor->id,
            'created_by_user_id' => $secretary->id,
            'subpoena_status' => SubpoenaStatus::Approved->value,
        ]);
        Resolution::factory()->forFiling('RTC Cabanatuan')->approved()->create([
            'case_id' => $ready->id,
            'created_by_user_id' => $admin->id,
        ]);
        $pendingResolutionCase = LegalCase::factory()->create([
            'assigned_prosecutor_id' => $prosecutor->id,
            'created_by_user_id' => $secretary->id,
            'subpoena_status' => SubpoenaStatus::Approved->value,
        ]);
        Resolution::factory()->create([
            'case_id' => $pendingResolutionCase->id,
            'created_by_user_id' => $secretary->id,
        ]);

        AuditEvent::create([
            'event_type' => 'case.revised',
            'actor_user_id' => $admin->id,
            'subject_type' => LegalCase::class,
            'subject_id' => $pending->id,
            'occurred_at' => now(),
        ]);

        $this->withoutVite();
        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('metrics', 8)
                ->where('metrics.0.label', 'Total Cases')
                ->where('metrics.0.value', 3)
                ->where('metrics.1.label', 'Pending Subpoenas')
                ->where('metrics.1.value', 1)
                ->where('metrics.2.label', 'Cases Ready for Filing')
                ->where('metrics.2.value', 1)
                ->where('metrics.3.label', 'Pending Resolutions')
                ->where('metrics.3.value', 1)
                ->where('metrics.4.label', 'Active Users')
                ->where('metrics.4.value', 4)
                ->where('metrics.5.label', 'Active Prosecutors')
                ->where('metrics.5.value', 1)
                ->where('metrics.6.label', 'Active Secretaries')
                ->where('metrics.6.value', 1)
                ->where('metrics.7.label', 'Active Crimes')
                ->where('metrics.7.value', 1)
                ->where('pending_work.1.href', '/resolution-reviews')
                ->missing('quick_actions')
                ->has('recent_activity', 1)
                ->where('recent_activity.0.action', 'case.revised')
                ->where('recent_activity.0.user', 'Admin_dashboard User')
                ->where('recent_activity.0.affected_record', 'Case '.$pending->docket_number)
                ->where('recent_activity.0.display_title', 'Case Revised')
                ->where('recent_activity.0.display_context', 'Case '.$pending->docket_number)
                ->where('recent_activity.0.display_detail', 'Revised by Admin_dashboard User')
                ->where('recent_activity.0.display_docket', $pending->docket_number));
    }

    public function test_dashboard_prioritizes_case_workflow_activity_over_newer_authentication_events(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('dashboard_priority');
        $case = LegalCase::factory()->create([
            'assigned_prosecutor_id' => $prosecutor->id,
            'created_by_user_id' => $secretary->id,
            'police_station' => 'Cabanatuan City Police Station',
        ]);
        $resolution = Resolution::factory()->create([
            'case_id' => $case->id,
            'created_by_user_id' => $secretary->id,
        ]);
        $events = [
            ['case.created', LegalCase::class, $case->id],
            ['case.revised', LegalCase::class, $case->id],
            ['subpoena.approved', LegalCase::class, $case->id],
            ['document.subpoena.generated', LegalCase::class, $case->id],
            ['resolution.submitted', Resolution::class, $resolution->id],
            ['resolution.approved', Resolution::class, $resolution->id],
        ];

        foreach ($events as $index => [$eventType, $subjectType, $subjectId]) {
            AuditEvent::create([
                'event_type' => $eventType,
                'actor_user_id' => $admin->id,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'occurred_at' => now()->subMinutes($index + 1),
            ]);
        }
        AuditEvent::create([
            'event_type' => 'auth.login',
            'actor_user_id' => $admin->id,
            'subject_type' => User::class,
            'subject_id' => $admin->id,
            'occurred_at' => now(),
        ]);

        $activity = app(OperationalDashboardQuery::class)->recentActivity(6);

        $this->assertCount(6, $activity);
        $this->assertNotContains('auth.login', array_column($activity, 'action'));
        $this->assertSame('New Case Registered', $activity[0]['display_title']);
        $this->assertSame('Case '.$case->docket_number, $activity[0]['display_context']);
        $this->assertSame($case->docket_number, $activity[0]['display_docket']);
        $this->assertSame('Filed at Cabanatuan City Police Station', $activity[0]['display_detail']);
        $approved = collect($activity)->firstWhere('action', 'resolution.approved');
        $this->assertSame('Resolution Approved', $approved['display_title']);
        $this->assertSame('Case '.$case->docket_number, $approved['display_context']);
        $this->assertSame($case->docket_number, $approved['display_docket']);
        $this->assertSame('Approved by Admin_dashboard_priority User', $approved['display_detail']);

        $fallback = collect(app(OperationalDashboardQuery::class)->recentActivity(7))
            ->firstWhere('action', 'auth.login');
        $this->assertNotNull($fallback);
        $this->assertNull($fallback['display_title']);
        $this->assertNull($fallback['display_docket']);
    }

    public function test_role_landing_summaries_preserve_assignment_scope_and_process_server_visibility(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('landing_primary');
        [, $otherProsecutor, $otherSecretary] = $this->pairedStaff('landing_other');
        $processServer = $this->staff(StaffRole::ProcessServer, 'landing_process_server');

        $pending = LegalCase::factory()->create([
            'assigned_prosecutor_id' => $prosecutor->id,
            'created_by_user_id' => $secretary->id,
            'subpoena_status' => SubpoenaStatus::Pending->value,
        ]);
        $pendingResolutionCase = LegalCase::factory()->create([
            'assigned_prosecutor_id' => $prosecutor->id,
            'created_by_user_id' => $secretary->id,
            'subpoena_status' => SubpoenaStatus::Approved->value,
        ]);
        Resolution::factory()->create([
            'case_id' => $pendingResolutionCase->id,
            'created_by_user_id' => $secretary->id,
        ]);
        $forFilingCase = LegalCase::factory()->create([
            'assigned_prosecutor_id' => $prosecutor->id,
            'created_by_user_id' => $secretary->id,
            'subpoena_status' => SubpoenaStatus::Approved->value,
        ]);
        Resolution::factory()->forFiling()->approved()->create([
            'case_id' => $forFilingCase->id,
            'created_by_user_id' => $admin->id,
        ]);
        $dismissedCase = LegalCase::factory()->create([
            'assigned_prosecutor_id' => $otherProsecutor->id,
            'created_by_user_id' => $otherSecretary->id,
            'subpoena_status' => SubpoenaStatus::Approved->value,
        ]);
        Resolution::factory()->approved()->create([
            'case_id' => $dismissedCase->id,
            'created_by_user_id' => $admin->id,
        ]);

        $this->withoutVite();
        $this->actingAs($prosecutor)
            ->get('/subpoena-reviews')
            ->assertInertia(fn (Assert $page) => $page
                ->where('operational_metrics.0.label', 'Assigned Cases')
                ->where('operational_metrics.0.value', 3)
                ->where('operational_metrics.1.label', 'Pending Subpoena Reviews')
                ->where('operational_metrics.1.value', 1)
                ->where('operational_metrics.2.label', 'Pending Resolutions')
                ->where('operational_metrics.2.value', 1)
                ->where('cases.data.0.id', $pending->id));

        $this->actingAs($secretary)
            ->get('/cases')
            ->assertInertia(fn (Assert $page) => $page
                ->where('operational_metrics.0.value', 3)
                ->where('operational_metrics.1.value', 1)
                ->where('operational_metrics.2.value', 1));

        $this->actingAs($processServer)
            ->get('/process-server/cases')
            ->assertInertia(fn (Assert $page) => $page
                ->where('operational_metrics.0.label', 'Visible Cases')
                ->where('operational_metrics.0.value', 4)
                ->where('operational_metrics.1.label', 'For Filing')
                ->where('operational_metrics.1.value', 1)
                ->where('operational_metrics.2.label', 'Dismissed')
                ->where('operational_metrics.2.value', 1));

        foreach ([$prosecutor, $secretary, $processServer] as $user) {
            $this->actingAs($user)->get('/dashboard')->assertForbidden();
        }
    }
}
