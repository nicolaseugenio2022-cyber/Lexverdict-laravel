<?php

namespace Tests\Feature\Acceptance;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\AuditEvent;
use App\Models\LegalCase;
use App\Models\Offense;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class OffenseManagementTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_administrator_can_search_create_and_edit_the_paginated_crime_catalog(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'crime_admin');
        Offense::factory()->count(18)->create();
        Offense::factory()->create([
            'name' => 'Qualified Theft',
            'normalized_name' => 'qualified theft',
            'law_reference' => 'Article 310',
        ]);

        $this->actingAs($admin)->get('/admin/offenses?search=Qualified&status=active')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Offenses/Index')
                ->where('filters.search', 'Qualified')
                ->where('filters.status', 'active')
                ->has('offenses.data', 1)
                ->where('offenses.data.0.name', 'Qualified Theft')
                ->where('auth.can.manage_offenses', true));

        $this->actingAs($admin)->post('/admin/offenses', [
            'name' => 'Cybercrime Prevention Act Offense',
            'law_reference' => 'Republic Act No. 10175',
        ])->assertRedirect('/admin/offenses?search=Qualified&status=active');

        $offense = Offense::query()->where('name', 'Cybercrime Prevention Act Offense')->firstOrFail();
        $this->assertDatabaseHas('audit_events', ['event_type' => 'offense.created', 'subject_id' => $offense->id]);

        $this->actingAs($admin)->patch("/admin/offenses/{$offense->id}", [
            'name' => 'Cybercrime Prevention Act Offense',
            'law_reference' => 'Republic Act No. 10175, Section 4',
        ])->assertRedirect('/admin/offenses?search=Qualified&status=active');

        $this->assertDatabaseHas('offenses', [
            'id' => $offense->id,
            'name' => 'Cybercrime Prevention Act Offense',
            'law_reference' => 'Republic Act No. 10175, Section 4',
        ]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'offense.updated', 'subject_id' => $offense->id]);
    }

    public function test_blank_and_case_insensitive_duplicate_crime_names_are_rejected(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'crime_validation_admin');
        Offense::factory()->create(['name' => 'Estafa', 'normalized_name' => 'estafa']);

        $this->actingAs($admin)->post('/admin/offenses', [
            'name' => '   ',
            'law_reference' => 'Article 315',
        ])->assertSessionHasErrors('name');

        $this->actingAs($admin)->post('/admin/offenses', [
            'name' => '  ESTAFA  ',
            'law_reference' => 'Article 315',
        ])->assertSessionHasErrors('name');

        $this->assertSame(1, Offense::query()->count());
    }

    public function test_referenced_crime_is_deactivated_without_deletion_and_can_be_restored(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'crime_state_admin');
        $offense = Offense::factory()->create(['name' => 'Libel', 'normalized_name' => 'libel']);
        $case = LegalCase::factory()->create();
        $case->offenses()->attach($offense->id);

        $this->from('/admin/offenses?search=Libel&status=active&page=2')
            ->actingAs($admin)
            ->patch("/admin/offenses/{$offense->id}/deactivate")
            ->assertRedirect('/admin/offenses?search=Libel&status=active&page=2');

        $this->assertDatabaseHas('offenses', ['id' => $offense->id, 'is_active' => false]);
        $this->assertDatabaseHas('case_offenses', ['case_id' => $case->id, 'offense_id' => $offense->id]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'offense.deactivated', 'subject_id' => $offense->id]);
        $this->actingAs($admin)->delete("/admin/offenses/{$offense->id}")->assertMethodNotAllowed();

        $this->from('/admin/offenses')->actingAs($admin)->patch("/admin/offenses/{$offense->id}/deactivate")
            ->assertRedirect('/admin/offenses');
        $this->assertSame(1, AuditEvent::query()->where('subject_id', $offense->id)->where('event_type', 'offense.deactivated')->count());

        $this->from('/admin/offenses?search=Libel&status=inactive&page=2')
            ->actingAs($admin)
            ->patch("/admin/offenses/{$offense->id}/restore")
            ->assertRedirect('/admin/offenses?search=Libel&status=inactive&page=2');

        $this->assertDatabaseHas('offenses', ['id' => $offense->id, 'is_active' => true]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'offense.restored', 'subject_id' => $offense->id]);

        $this->from('/admin/offenses')->actingAs($admin)->patch("/admin/offenses/{$offense->id}/restore")
            ->assertRedirect('/admin/offenses');
        $this->assertSame(1, AuditEvent::query()->where('subject_id', $offense->id)->where('event_type', 'offense.restored')->count());

        $this->expectException(LogicException::class);
        $offense->delete();
    }

    public function test_database_rejects_bulk_deletion_of_unreferenced_crime_records(): void
    {
        $offense = Offense::factory()->create();
        $rejected = false;

        try {
            DB::transaction(fn () => DB::table('offenses')->where('id', $offense->id)->delete());
        } catch (QueryException) {
            $rejected = true;
        }

        $this->assertTrue($rejected, 'The database must reject physical Crime deletion.');
        $this->assertDatabaseHas('offenses', ['id' => $offense->id]);
    }

    public function test_database_rejects_truncation_and_preserves_case_offense_references(): void
    {
        $offense = Offense::factory()->create();
        $case = LegalCase::factory()->create();
        $case->offenses()->attach($offense->id);
        $rejected = false;

        try {
            DB::transaction(fn () => DB::table('offenses')->truncate());
        } catch (QueryException) {
            $rejected = true;
        }

        $this->assertTrue($rejected, 'The database must reject Crime catalog truncation.');
        $this->assertDatabaseHas('offenses', ['id' => $offense->id]);
        $this->assertDatabaseHas('case_offenses', ['case_id' => $case->id, 'offense_id' => $offense->id]);
    }

    public function test_all_non_administrator_roles_are_denied_crime_catalog_routes_and_mutations(): void
    {
        $offense = Offense::factory()->create();

        foreach ([StaffRole::Secretary, StaffRole::Prosecutor, StaffRole::ProcessServer] as $role) {
            $user = $this->staff($role, 'denied_'.strtolower($role->value));

            $this->actingAs($user)->get('/admin/offenses')->assertForbidden();
            $this->actingAs($user)->post('/admin/offenses', ['name' => 'Unauthorized Crime'])->assertForbidden();
            $this->actingAs($user)->patch("/admin/offenses/{$offense->id}", ['name' => 'Unauthorized Crime'])->assertForbidden();
            $this->actingAs($user)->patch("/admin/offenses/{$offense->id}/deactivate")->assertForbidden();
            $this->actingAs($user)->patch("/admin/offenses/{$offense->id}/restore")->assertForbidden();
            $this->actingAs($user)->patch('/admin/offenses/00000000-0000-0000-0000-000000000000/restore')->assertForbidden();
        }

        $this->assertDatabaseHas('offenses', ['id' => $offense->id, 'is_active' => true]);
    }
}
