<?php

namespace Tests\Feature\M4;

use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Actions\DecideSubpoena;
use App\Domain\Cases\Actions\ReviseCase;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Cases\Exceptions\CaseDataInvariantException;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\SubpoenaDecision;
use App\Models\SubpoenaRevision;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use RuntimeException;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class SubpoenaReviewWorkflowTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_assigned_prosecutor_receives_pending_review_queue_and_can_approve(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m4_approve');
        $case = $this->createCaseFor($secretary);

        $this->actingAs($prosecutor)
            ->get('/subpoena-reviews')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reviews/Subpoenas/Index')
                ->has('cases.data', 1)
                ->where('cases.data.0.id', $case->id));

        $this->actingAs($admin)->get('/subpoena-reviews')->assertForbidden();

        $this->actingAs($prosecutor)
            ->withHeader('User-Agent', 'LexVerdict M4 Test')
            ->post("/subpoena-reviews/{$case->id}/approve", ['revision_number' => 1])
            ->assertRedirect("/cases/{$case->id}");

        $this->assertDatabaseHas('cases', ['id' => $case->id, 'subpoena_status' => SubpoenaStatus::Approved->value]);
        $this->assertDatabaseHas('subpoena_decisions', [
            'case_id' => $case->id,
            'revision_number' => 1,
            'decision' => SubpoenaStatus::Approved->value,
            'comment' => null,
            'decided_by' => $prosecutor->id,
        ]);
        $this->assertDatabaseHas('audit_events', [
            'event_type' => 'subpoena.approved',
            'subject_id' => $case->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'LexVerdict M4 Test',
        ]);
    }

    public function test_only_assigned_prosecutor_can_review_and_administrator_keeps_read_only_global_visibility(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m4_scope');
        [, $otherProsecutor] = $this->pairedStaff('m4_scope_other');
        $processServer = $this->staff(StaffRole::ProcessServer, 'm4_scope_ps');
        $case = $this->createCaseFor($secretary);

        $this->actingAs($admin)->get("/cases/{$case->id}")->assertOk();
        $this->actingAs($admin)->post("/subpoena-reviews/{$case->id}/approve")->assertForbidden();
        $this->actingAs($secretary)->post("/subpoena-reviews/{$case->id}/approve")->assertForbidden();
        $this->actingAs($otherProsecutor)->post("/subpoena-reviews/{$case->id}/approve")->assertForbidden();
        $this->actingAs($processServer)->post("/subpoena-reviews/{$case->id}/approve")->assertForbidden();

        $this->actingAs($otherProsecutor)
            ->get('/subpoena-reviews')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('cases.data', 0));

        $this->assertDatabaseHas('cases', ['id' => $case->id, 'subpoena_status' => SubpoenaStatus::Pending->value]);
        $this->assertDatabaseCount('subpoena_decisions', 0);
        $this->assertSame($prosecutor->id, $case->assigned_prosecutor_id);
    }

    public function test_denial_requires_nonblank_comment_and_preserves_exact_comment_type(): void
    {
        [, $prosecutor, $secretary] = $this->pairedStaff('m4_deny');
        $case = $this->createCaseFor($secretary);

        $this->actingAs($prosecutor)
            ->post("/subpoena-reviews/{$case->id}/deny", ['revision_number' => 1, 'comment' => '   '])
            ->assertSessionHasErrors('comment');

        $this->assertDatabaseHas('cases', ['id' => $case->id, 'subpoena_status' => SubpoenaStatus::Pending->value]);
        $this->assertDatabaseCount('subpoena_decisions', 0);

        $this->actingAs($prosecutor)
            ->post("/subpoena-reviews/{$case->id}/deny", ['revision_number' => 1, 'comment' => 'Missing supporting details.'])
            ->assertRedirect("/cases/{$case->id}");

        $this->assertDatabaseHas('subpoena_decisions', [
            'case_id' => $case->id,
            'decision' => SubpoenaStatus::Denied->value,
            'comment_type' => 'Subpoena',
            'comment' => 'Missing supporting details.',
            'decided_by' => $prosecutor->id,
        ]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'subpoena.denied', 'subject_id' => $case->id]);

        $this->actingAs($prosecutor)
            ->post("/subpoena-reviews/{$case->id}/approve")
            ->assertForbidden();

        $this->assertDatabaseCount('subpoena_decisions', 1);
    }

    public function test_creator_cannot_review_their_own_submission(): void
    {
        [, $prosecutor] = $this->pairedStaff('m4_self');
        $case = LegalCase::factory()->create([
            'assigned_prosecutor_id' => $prosecutor->id,
            'created_by_user_id' => $prosecutor->id,
        ]);
        SubpoenaRevision::create([
            'case_id' => $case->id,
            'revision_number' => 1,
            'payload' => ['subpoena_status' => SubpoenaStatus::Pending->value],
            'submitted_by' => $prosecutor->id,
            'submitted_at' => now(),
        ]);

        $this->actingAs($prosecutor)
            ->get('/subpoena-reviews')
            ->assertInertia(fn (Assert $page) => $page->has('cases.data', 0));
        $this->actingAs($prosecutor)->get("/subpoena-reviews/{$case->id}")->assertForbidden();
        $this->actingAs($prosecutor)->post("/subpoena-reviews/{$case->id}/approve")->assertForbidden();

        $this->assertDatabaseCount('subpoena_decisions', 0);
    }

    public function test_revision_returns_decided_subpoena_to_pending_and_preserves_decision_history(): void
    {
        [, $prosecutor, $secretary] = $this->pairedStaff('m4_revise');
        $case = $this->createCaseFor($secretary);

        $this->actingAs($prosecutor)->post("/subpoena-reviews/{$case->id}/deny", ['revision_number' => 1, 'comment' => 'Revise the submission.']);
        $case->refresh();
        $offense = Offense::factory()->create(['name' => 'Revised Crime', 'normalized_name' => 'revised crime']);

        app(ReviseCase::class)->revise($case, [
            ...$this->validPayload([$offense->id]),
            'revision_number' => 1,
            'police_station' => 'Revised Station',
        ], $secretary);

        $case->refresh();
        $this->assertSame(SubpoenaStatus::Pending, $case->subpoena_status);
        $this->assertSame(2, $case->revision_number);
        $this->assertDatabaseCount('subpoena_decisions', 1);
        $this->assertDatabaseHas('subpoena_decisions', ['case_id' => $case->id, 'revision_number' => 1, 'comment' => 'Revise the submission.']);

        $this->actingAs($prosecutor)
            ->get("/subpoena-reviews/{$case->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Reviews/Subpoenas/Show')
                ->where('currentRevision.revision_number', 2)
                ->where('currentRevision.submitted_by', $secretary->staffProfile()->firstOrFail()->displayName())
                ->where('currentRevision.payload.offenses.0.name', 'Revised Crime')
                ->where('currentRevision.payload.parties.0.date_of_birth', '1990-01-01')
                ->where('currentRevision.payload.parties.0.sex', 'Male')
                ->where('currentRevision.payload.parties.0.street', 'Street')
                ->where('previousRevision.revision_number', 1)
                ->where('can_review', true)
                ->has('decisionHistory', 1));

        $this->actingAs($secretary)
            ->get("/cases/{$case->id}/edit")
            ->assertInertia(fn (Assert $page) => $page
                ->has('denial_comments', 1)
                ->where('denial_comments.0.comment', 'Revise the submission.'));
    }

    public function test_stale_review_page_cannot_decide_a_newer_revision(): void
    {
        [, $prosecutor, $secretary] = $this->pairedStaff('m4_stale');
        $approveCase = $this->createCaseFor($secretary);
        $denyCase = $this->createCaseFor($secretary);

        app(ReviseCase::class)->revise($approveCase, [
            ...$this->validPayload($approveCase->offenses()->pluck('offenses.id')->all()),
            'revision_number' => 1,
        ], $secretary);
        app(ReviseCase::class)->revise($denyCase, [
            ...$this->validPayload($denyCase->offenses()->pluck('offenses.id')->all()),
            'revision_number' => 1,
        ], $secretary);

        $this->actingAs($prosecutor)
            ->post("/subpoena-reviews/{$approveCase->id}/approve", ['revision_number' => 1])
            ->assertSessionHasErrors('decision');
        $this->actingAs($prosecutor)
            ->post("/subpoena-reviews/{$denyCase->id}/deny", ['revision_number' => 1, 'comment' => 'Stale decision'])
            ->assertSessionHasErrors('decision');

        $this->assertDatabaseHas('cases', ['id' => $approveCase->id, 'subpoena_status' => SubpoenaStatus::Pending->value, 'revision_number' => 2]);
        $this->assertDatabaseHas('cases', ['id' => $denyCase->id, 'subpoena_status' => SubpoenaStatus::Pending->value, 'revision_number' => 2]);
        $this->assertDatabaseCount('subpoena_decisions', 0);
    }

    public function test_decision_action_reloads_reviewer_authorization_inside_transaction(): void
    {
        [, $prosecutor, $secretary] = $this->pairedStaff('m4_reviewer_refresh');
        $case = $this->createCaseFor($secretary);
        DB::table('users')->where('id', $prosecutor->id)->update(['is_active' => false]);

        $this->expectException(CaseDataInvariantException::class);
        app(DecideSubpoena::class)->approve($case, $prosecutor, 1);
    }

    public function test_revision_action_revalidates_current_assignment_inside_transaction(): void
    {
        [, , $secretary] = $this->pairedStaff('m4_revision_scope');
        $case = $this->createCaseFor($secretary);
        ProsecutorSecretaryAssignment::query()->where('secretary_user_id', $secretary->id)->delete();

        $this->expectException(CaseDataInvariantException::class);
        app(ReviseCase::class)->revise($case, [
            ...$this->validPayload($case->offenses()->pluck('offenses.id')->all()),
            'revision_number' => 1,
        ], $secretary);
    }

    public function test_decision_history_is_linked_to_a_revision_and_rejects_mutation(): void
    {
        [, $prosecutor, $secretary] = $this->pairedStaff('m4_immutable');
        $case = $this->createCaseFor($secretary);
        app(DecideSubpoena::class)->approve($case, $prosecutor, 1);
        $decision = SubpoenaDecision::query()->firstOrFail();

        try {
            $decision->update(['comment' => 'Changed']);
            $this->fail('Model updates must be rejected.');
        } catch (LogicException $exception) {
            $this->assertSame('Subpoena decision history is immutable.', $exception->getMessage());
        }

        try {
            $decision->delete();
            $this->fail('Model deletes must be rejected.');
        } catch (LogicException $exception) {
            $this->assertSame('Subpoena decision history is immutable.', $exception->getMessage());
        }

        $this->assertDatabaseRejects(fn () => DB::table('subpoena_decisions')->where('id', $decision->id)->update(['comment' => 'Changed']));
        $this->assertDatabaseRejects(fn () => DB::table('subpoena_decisions')->where('id', $decision->id)->delete());
        $this->assertDatabaseRejects(fn () => DB::statement('TRUNCATE TABLE subpoena_decisions'));
        $this->assertDatabaseRejects(fn () => DB::table('subpoena_decisions')->insert([
            'id' => (string) Str::uuid(),
            'case_id' => $case->id,
            'revision_number' => 999,
            'decision' => SubpoenaStatus::Approved->value,
            'decided_by' => $prosecutor->id,
            'decided_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        $this->assertDatabaseCount('subpoena_decisions', 1);
    }

    public function test_migration_refuses_to_rollback_populated_decision_history(): void
    {
        [, $prosecutor, $secretary] = $this->pairedStaff('m4_rollback_guard');
        $case = $this->createCaseFor($secretary);
        app(DecideSubpoena::class)->approve($case, $prosecutor, 1);

        try {
            $this->rollBackSubpoenaDecisionMigration();
            $this->fail('A populated decision-history migration must not roll back.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Refusing to roll back subpoena decision history while records exist.', $exception->getMessage());
        }

        $this->assertDatabaseHas('subpoena_decisions', ['case_id' => $case->id, 'revision_number' => 1]);
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

    /** @return array<string, string|null> */
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

    private function rollBackSubpoenaDecisionMigration(): void
    {
        $migration = require database_path('migrations/2026_07_10_000003_create_subpoena_decisions_table.php');
        if (! is_object($migration) || ! method_exists($migration, 'down')) {
            throw new LogicException('Subpoena decision migration could not be loaded.');
        }

        $migration->down();
    }
}
