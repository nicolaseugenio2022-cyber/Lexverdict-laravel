<?php

namespace Tests\Feature\M4;

use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Actions\ReviseCase;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\SubpoenaRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
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
            ->post("/subpoena-reviews/{$case->id}/approve")
            ->assertRedirect("/cases/{$case->id}");

        $this->assertDatabaseHas('cases', ['id' => $case->id, 'subpoena_status' => SubpoenaStatus::Approved->value]);
        $this->assertDatabaseHas('subpoena_decisions', [
            'case_id' => $case->id,
            'revision_number' => 1,
            'decision' => SubpoenaStatus::Approved->value,
            'comment' => null,
            'decided_by' => $prosecutor->id,
        ]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'subpoena.approved', 'subject_id' => $case->id]);
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
            ->post("/subpoena-reviews/{$case->id}/deny", ['comment' => '   '])
            ->assertSessionHasErrors('comment');

        $this->assertDatabaseHas('cases', ['id' => $case->id, 'subpoena_status' => SubpoenaStatus::Pending->value]);
        $this->assertDatabaseCount('subpoena_decisions', 0);

        $this->actingAs($prosecutor)
            ->post("/subpoena-reviews/{$case->id}/deny", ['comment' => 'Missing supporting details.'])
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

        $this->actingAs($prosecutor)->post("/subpoena-reviews/{$case->id}/deny", ['comment' => 'Revise the submission.']);
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
                ->where('previousRevision.revision_number', 1)
                ->where('can_review', true)
                ->has('decisionHistory', 1));

        $this->actingAs($secretary)
            ->get("/cases/{$case->id}/edit")
            ->assertInertia(fn (Assert $page) => $page
                ->has('denial_comments', 1)
                ->where('denial_comments.0.comment', 'Revise the submission.'));
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
}
