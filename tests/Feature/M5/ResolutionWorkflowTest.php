<?php

namespace Tests\Feature\M5;

use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Actions\DecideSubpoena;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Actions\DecideResolution;
use App\Domain\Resolutions\Actions\SubmitResolution;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Models\AuditEvent;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Resolution;
use App\Models\ResolutionDecision;
use App\Models\ResolutionRevision;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use RuntimeException;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class ResolutionWorkflowTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_administrator_and_scoped_secretary_submit_exact_resolution_values_for_approved_subpoenas(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m5_submit');
        $filingCase = $this->approvedCaseFor($secretary, $prosecutor);
        $dismissedCase = $this->approvedCaseFor($secretary, $prosecutor);

        $this->actingAs($secretary)
            ->post("/cases/{$filingCase->id}/resolution", ['verdict' => 'For Filing', 'court' => 'RTC Cabanatuan'])
            ->assertRedirect();
        $this->actingAs($admin)
            ->post("/cases/{$dismissedCase->id}/resolution", ['verdict' => 'Dismissed', 'court' => 'Must be cleared'])
            ->assertRedirect();

        $this->assertDatabaseHas('resolutions', [
            'case_id' => $filingCase->id,
            'verdict' => 'For Filing',
            'court' => 'RTC Cabanatuan',
            'status' => 'Pending',
            'created_by_user_id' => $secretary->id,
        ]);
        $this->assertDatabaseHas('resolutions', [
            'case_id' => $dismissedCase->id,
            'verdict' => 'Dismissed',
            'court' => null,
            'status' => 'Pending',
            'created_by_user_id' => $admin->id,
        ]);
        $this->assertDatabaseCount('resolution_revisions', 2);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'resolution.submitted']);
        $audit = AuditEvent::query()->where('event_type', 'resolution.submitted')->firstOrFail();
        $this->assertTrue(Str::isUuid($audit->correlation_id));
    }

    public function test_resolution_submission_requires_approved_subpoena_scope_and_valid_verdict_court_pair(): void
    {
        [, $prosecutor, $secretary] = $this->pairedStaff('m5_validation');
        [, , $otherSecretary] = $this->pairedStaff('m5_validation_other');
        $processServer = $this->staff(StaffRole::ProcessServer, 'm5_validation_ps');
        $pendingCase = $this->caseFor($secretary);
        $approvedCase = $this->approvedCaseFor($secretary, $prosecutor);

        $this->actingAs($secretary)->get("/cases/{$pendingCase->id}/resolution/create")->assertForbidden();
        $this->actingAs($otherSecretary)->get("/cases/{$approvedCase->id}/resolution/create")->assertForbidden();
        $this->actingAs($prosecutor)->get("/cases/{$approvedCase->id}/resolution/create")->assertForbidden();
        $this->actingAs($processServer)->get("/cases/{$approvedCase->id}/resolution/create")->assertForbidden();

        $this->actingAs($secretary)
            ->post("/cases/{$approvedCase->id}/resolution", ['verdict' => 'Pending', 'court' => null])
            ->assertSessionHasErrors('verdict');
        $this->actingAs($secretary)
            ->post("/cases/{$approvedCase->id}/resolution", ['verdict' => 'For Filing', 'court' => ''])
            ->assertSessionHasErrors('court');

        $this->assertDatabaseCount('resolutions', 0);
    }

    public function test_only_administrator_reviews_pending_resolution_and_legacy_allows_admin_self_review(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m5_review');
        $processServer = $this->staff(StaffRole::ProcessServer, 'm5_review_ps');
        $case = $this->approvedCaseFor($secretary, $prosecutor);
        $resolution = app(SubmitResolution::class)->create($case, ['verdict' => 'Dismissed'], $admin);

        $this->actingAs($admin)
            ->get('/resolution-reviews')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reviews/Resolutions/Index')
                ->has('resolutions.data', 1)
                ->where('resolutions.data.0.id', $resolution->id));

        $this->actingAs($secretary)->get('/resolution-reviews')->assertForbidden();
        $this->actingAs($prosecutor)->post("/resolution-reviews/{$resolution->id}/approve", ['revision_number' => 1])->assertForbidden();
        $this->actingAs($processServer)->post("/resolution-reviews/{$resolution->id}/approve", ['revision_number' => 1])->assertForbidden();

        $this->actingAs($admin)
            ->withHeader('User-Agent', 'LexVerdict M5 Test')
            ->post("/resolution-reviews/{$resolution->id}/approve", ['revision_number' => 1])
            ->assertRedirect("/resolutions/{$resolution->id}");

        $resolution->refresh();
        $this->assertSame(ResolutionStatus::Approved, $resolution->status);
        $this->assertSame(today()->toDateString(), Carbon::parse($resolution->verdict_date)->toDateString());
        $this->assertTrue($resolution->isReportEligible());
        $this->assertDatabaseHas('resolution_decisions', ['resolution_id' => $resolution->id, 'decision' => 'Approved', 'decided_by' => $admin->id]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'resolution.approved', 'ip_address' => '127.0.0.1', 'user_agent' => 'LexVerdict M5 Test']);
    }

    public function test_denial_requires_comment_and_denied_resolution_can_be_revised_to_pending(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m5_deny');
        $case = $this->approvedCaseFor($secretary, $prosecutor);
        $resolution = app(SubmitResolution::class)->create($case, ['verdict' => 'For Filing', 'court' => 'RTC Palayan'], $secretary);

        $this->actingAs($admin)
            ->post("/resolution-reviews/{$resolution->id}/deny", ['revision_number' => 1, 'comment' => '   '])
            ->assertSessionHasErrors('comment');
        $this->actingAs($admin)
            ->post("/resolution-reviews/{$resolution->id}/deny", ['revision_number' => 1, 'comment' => 'Revise the disposition.'])
            ->assertRedirect("/resolutions/{$resolution->id}");

        $this->assertDatabaseHas('resolution_decisions', [
            'resolution_id' => $resolution->id,
            'revision_number' => 1,
            'decision' => 'Denied',
            'comment_type' => 'Resolution',
            'comment' => 'Revise the disposition.',
        ]);

        $this->actingAs($secretary)
            ->get("/resolutions/{$resolution->id}/edit")
            ->assertInertia(fn (Assert $page) => $page
                ->component('Resolutions/Form')
                ->has('denial_comments', 1)
                ->where('denial_comments.0.comment', 'Revise the disposition.'));
        $this->actingAs($secretary)
            ->patch("/resolutions/{$resolution->id}", ['revision_number' => 1, 'verdict' => 'Dismissed', 'court' => 'Ignored'])
            ->assertRedirect("/resolutions/{$resolution->id}");

        $resolution->refresh();
        $this->assertSame(ResolutionStatus::Pending, $resolution->status);
        $this->assertSame(ResolutionVerdict::Dismissed, $resolution->verdict);
        $this->assertNull($resolution->court);
        $this->assertSame(2, $resolution->revision_number);
        $this->assertDatabaseCount('resolution_revisions', 2);
        $this->assertDatabaseCount('resolution_decisions', 1);
    }

    public function test_stale_review_is_rejected_and_approved_resolution_is_not_editable(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m5_conflict');
        $case = $this->approvedCaseFor($secretary, $prosecutor);
        $resolution = app(SubmitResolution::class)->create($case, ['verdict' => 'Dismissed'], $secretary);
        app(SubmitResolution::class)->revise($resolution, ['verdict' => 'For Filing', 'court' => 'RTC Gapan'], $secretary, 1);

        $this->actingAs($admin)
            ->post("/resolution-reviews/{$resolution->id}/approve", ['revision_number' => 1])
            ->assertSessionHasErrors('decision');

        $resolution->refresh();
        $this->assertSame(ResolutionStatus::Pending, $resolution->status);
        app(DecideResolution::class)->approve($resolution, $admin, 2);

        $this->actingAs($secretary)->get("/resolutions/{$resolution->id}/edit")->assertForbidden();
        $this->actingAs($admin)->get("/resolutions/{$resolution->id}/edit")->assertForbidden();
    }

    public function test_case_detail_and_resolution_review_show_lifecycle_and_revision_comparison(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m5_ui');
        $case = $this->approvedCaseFor($secretary, $prosecutor);
        $resolution = app(SubmitResolution::class)->create($case, ['verdict' => 'Dismissed'], $secretary);

        $this->actingAs($secretary)
            ->get("/cases/{$case->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('resolution.id', $resolution->id)
                ->where('resolution.verdict', 'Dismissed')
                ->where('can_revise_resolution', true)
                ->where('can_submit_resolution', false)
                ->where('timeline', fn ($timeline) => collect($timeline)->contains('label', 'Resolution Revision 1')));

        $this->actingAs($admin)
            ->get("/resolution-reviews/{$resolution->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reviews/Resolutions/Show')
                ->where('currentRevision.revision_number', 1)
                ->where('currentRevision.verdict', 'Dismissed')
                ->where('previousRevision', null)
                ->where('can_review', true));
    }

    public function test_resolution_read_access_follows_case_assignment_scope(): void
    {
        [, $prosecutor, $secretary] = $this->pairedStaff('m5_read');
        [, $otherProsecutor] = $this->pairedStaff('m5_read_other');
        $processServer = $this->staff(StaffRole::ProcessServer, 'm5_read_ps');
        $case = $this->approvedCaseFor($secretary, $prosecutor);
        $resolution = app(SubmitResolution::class)->create($case, ['verdict' => 'Dismissed'], $secretary);

        $this->actingAs($secretary)->get("/resolutions/{$resolution->id}")->assertOk();
        $this->actingAs($prosecutor)->get("/resolutions/{$resolution->id}")->assertOk();
        $this->actingAs($otherProsecutor)->get("/resolutions/{$resolution->id}")->assertForbidden();
        $this->actingAs($processServer)->get("/resolutions/{$resolution->id}")->assertForbidden();
    }

    public function test_report_eligibility_requires_approved_current_for_filing_or_dismissed_resolution(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m5_report');
        $case = $this->approvedCaseFor($secretary, $prosecutor);
        $resolution = app(SubmitResolution::class)->create($case, ['verdict' => 'For Filing', 'court' => 'RTC Guimba'], $secretary);

        $this->assertFalse($resolution->isReportEligible());
        app(DecideResolution::class)->deny($resolution, $admin, 1, 'Denied');
        $resolution->refresh();
        $this->assertFalse($resolution->isReportEligible());
        app(SubmitResolution::class)->revise($resolution, ['verdict' => 'Dismissed'], $secretary, 1);
        app(DecideResolution::class)->approve($resolution->refresh(), $admin, 2);
        $this->assertTrue($resolution->refresh()->isReportEligible());
        $this->assertSame([$resolution->id], Resolution::query()->reportEligible()->pluck('id')->all());
    }

    public function test_verdict_dates_use_the_authoritative_philippine_office_date(): void
    {
        [, $prosecutor, $secretary] = $this->pairedStaff('m5_timezone');
        $case = $this->approvedCaseFor($secretary, $prosecutor);
        Carbon::setTestNow(Carbon::parse('2026-07-10 16:30:00 UTC'));

        try {
            $resolution = app(SubmitResolution::class)->create($case, ['verdict' => 'Dismissed'], $secretary);
            $this->assertSame('2026-07-11', Carbon::parse($resolution->verdict_date)->toDateString());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_factory_states_create_coherent_resolution_history(): void
    {
        $pending = Resolution::factory()->create();
        $approved = Resolution::factory()->approved()->create();
        $denied = Resolution::factory()->denied()->create();

        $this->assertNotNull($pending->current_revision_id);
        $this->assertNull($pending->current_decision_id);
        $this->assertTrue($approved->refresh()->isReportEligible());
        $this->assertDatabaseHas('resolution_decisions', [
            'id' => $approved->current_decision_id,
            'decision' => 'Approved',
        ]);
        $this->assertDatabaseHas('resolution_decisions', [
            'id' => $denied->refresh()->current_decision_id,
            'decision' => 'Denied',
            'comment_type' => 'Resolution',
        ]);
    }

    public function test_resolution_history_is_append_only_linked_and_populated_rollback_is_refused(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m5_history');
        $case = $this->approvedCaseFor($secretary, $prosecutor);
        $resolution = app(SubmitResolution::class)->create($case, ['verdict' => 'Dismissed'], $secretary);
        app(DecideResolution::class)->approve($resolution, $admin, 1);
        $revision = ResolutionRevision::query()->firstOrFail();
        $decision = ResolutionDecision::query()->firstOrFail();
        $audit = AuditEvent::query()->where('subject_id', $resolution->id)->firstOrFail();

        foreach ([
            [$revision, ['revision_number' => 99], 'Resolution revision history is immutable.'],
            [$decision, ['revision_number' => 99], 'Resolution decision history is immutable.'],
            [$audit, ['event_type' => 'changed'], 'Audit history is immutable.'],
        ] as [$history, $changes, $expectedMessage]) {
            try {
                $history->update($changes);
                $this->fail('History updates must be rejected.');
            } catch (LogicException $exception) {
                $this->assertSame($expectedMessage, $exception->getMessage());
            }
        }

        $this->assertDatabaseRejects(fn () => DB::table('resolution_revisions')->where('id', $revision->id)->delete());
        $this->assertDatabaseRejects(fn () => DB::table('resolution_revisions')->where('id', $revision->id)->update(['verdict_date' => today()->subDay()]));
        $this->assertDatabaseRejects(fn () => DB::statement('TRUNCATE TABLE resolution_revisions CASCADE'));
        $this->assertDatabaseRejects(fn () => DB::table('resolution_decisions')->where('id', $decision->id)->update(['comment' => 'Changed']));
        $this->assertDatabaseRejects(fn () => DB::table('resolution_decisions')->where('id', $decision->id)->delete());
        $this->assertDatabaseRejects(fn () => DB::statement('TRUNCATE TABLE resolution_decisions'));
        $this->assertDatabaseRejects(fn () => DB::table('audit_events')->where('id', $audit->id)->update(['event_type' => 'changed']));
        $this->assertDatabaseRejects(fn () => DB::table('audit_events')->where('id', $audit->id)->delete());
        $this->assertDatabaseRejects(fn () => DB::statement('TRUNCATE TABLE audit_events'));
        $this->assertDatabaseRejects(function () use ($resolution): void {
            DB::table('resolutions')->where('id', $resolution->id)->update([
                'status' => 'Pending',
                'current_decision_id' => null,
            ]);
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE');
        });
        $this->assertDatabaseRejects(fn () => DB::table('resolution_decisions')->insert([
            'id' => (string) Str::uuid(), 'resolution_id' => $resolution->id, 'revision_number' => 999,
            'decision' => 'Approved', 'decided_by' => $admin->id, 'decided_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]));

        try {
            $this->rollBackResolutionMigration();
            $this->fail('Populated Resolution history must not roll back.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Refusing to roll back Resolution history while records exist.', $exception->getMessage());
        }

        try {
            $this->rollBackAuditHardeningMigration();
            $this->fail('Append-only protection must not be removed from populated audit history.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Refusing to remove append-only protection while audit history exists.', $exception->getMessage());
        }
    }

    private function approvedCaseFor(User $secretary, User $prosecutor): LegalCase
    {
        $case = $this->caseFor($secretary);
        app(DecideSubpoena::class)->approve($case, $prosecutor, 1);

        return $case->refresh();
    }

    private function caseFor(User $secretary): LegalCase
    {
        $offense = Offense::factory()->create();

        return app(CreateCase::class)->create([
            'date' => '2026-07-11', 'hearing_date_1' => null, 'hearing_date_2' => null,
            'police_station' => 'Station', 'offense_ids' => [$offense->id],
            'parties' => [
                $this->party(PartyRole::Complainant, 'Juan', 'Dela Cruz'),
                $this->party(PartyRole::Respondent, 'Pedro', 'Santos'),
            ],
        ], $secretary)['case'];
    }

    /** @return array<string, string|null> */
    private function party(PartyRole $role, string $firstName, string $lastName): array
    {
        return [
            'role' => $role->value, 'first_name' => $firstName, 'middle_name' => null, 'last_name' => $lastName,
            'suffix' => null, 'date_of_birth' => '1990-01-01', 'sex' => 'Male', 'street' => 'Street',
            'barangay' => 'Barangay', 'municipality' => 'Municipality', 'province' => 'Province', 'region' => 'Region',
        ];
    }

    /** @param callable(): mixed $operation */
    private function assertDatabaseRejects(callable $operation): void
    {
        $rejected = false;
        try {
            DB::transaction($operation);
        } catch (QueryException) {
            $rejected = true;
        }
        $this->assertTrue($rejected, 'The database should reject this operation.');
    }

    private function rollBackResolutionMigration(): void
    {
        $migration = require database_path('migrations/2026_07_11_000004_create_resolution_workflow_tables.php');
        if (! is_object($migration) || ! method_exists($migration, 'down')) {
            throw new LogicException('Resolution migration could not be loaded.');
        }

        $migration->down();
    }

    private function rollBackAuditHardeningMigration(): void
    {
        $migration = require database_path('migrations/2026_07_11_000003_harden_audit_event_history.php');
        if (! is_object($migration) || ! method_exists($migration, 'down')) {
            throw new LogicException('Audit hardening migration could not be loaded.');
        }

        $migration->down();
    }
}
