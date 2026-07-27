<?php

namespace Tests\Feature\Acceptance;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\LegalCase;
use App\Models\Offense;
use Database\Seeders\PhilippineRevisedPenalCodeSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class OffenseManagementTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_administrator_can_search_create_and_edit_the_legacy_crime_catalog(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'crime_admin');
        Offense::factory()->count(12)->create();
        Offense::factory()->create([
            'name' => 'Qualified Theft',
            'normalized_name' => 'qualified theft',
            'law_reference' => 'Article 310',
        ]);

        $this->actingAs($admin)->get('/admin/offenses?search=Qualified')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Offenses/Index')
                ->where('filters.search', 'Qualified')
                ->has('offenses.data', 1)
                ->where('offenses.data.0.name', 'Qualified Theft')
                ->where('auth.can.manage_offenses', true));

        $this->actingAs($admin)->post('/admin/offenses', [
            'name' => 'Cybercrime Prevention Act Offense',
            'law_reference' => 'Republic Act No. 10175',
        ])->assertRedirect('/admin/offenses?search=Qualified');

        $offense = Offense::query()->where('name', 'Cybercrime Prevention Act Offense')->firstOrFail();
        $this->actingAs($admin)->patch("/admin/offenses/{$offense->id}", [
            'name' => 'Cybercrime Prevention Act Offense',
            'law_reference' => 'Republic Act No. 10175, Section 4',
        ])->assertRedirect('/admin/offenses?search=Qualified');

        $this->assertDatabaseHas('audit_events', ['event_type' => 'offense.created', 'subject_id' => $offense->id]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'offense.updated', 'subject_id' => $offense->id]);
        $this->assertDatabaseHas('offenses', [
            'id' => $offense->id,
            'name' => 'Cybercrime Prevention Act Offense',
            'law_reference' => 'Republic Act No. 10175, Section 4',
        ]);
    }

    public function test_blank_and_case_insensitive_duplicate_crime_names_are_rejected(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'crime_validation_admin');
        Offense::factory()->create(['name' => 'Estafa', 'normalized_name' => 'estafa']);

        $this->actingAs($admin)->post('/admin/offenses', ['name' => '   '])->assertSessionHasErrors('name');
        $this->actingAs($admin)->post('/admin/offenses', ['name' => '  ESTAFA  '])->assertSessionHasErrors('name');
        $this->assertSame(1, Offense::query()->count());
    }

    public function test_unused_crime_can_be_deleted_with_audit_history(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'crime_delete_admin');
        $offense = Offense::factory()->create(['name' => 'Unused Crime', 'normalized_name' => 'unused crime']);

        $this->from('/admin/offenses?search=Unused&page=2')
            ->actingAs($admin)
            ->delete("/admin/offenses/{$offense->id}")
            ->assertRedirect('/admin/offenses?search=Unused&page=2');

        $this->assertDatabaseMissing('offenses', ['id' => $offense->id]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'offense.deleted', 'subject_id' => $offense->id]);
    }

    public function test_referenced_crime_cannot_be_deleted_and_case_label_is_preserved(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'crime_reference_admin');
        $offense = Offense::factory()->create(['name' => 'Libel', 'normalized_name' => 'libel']);
        $case = LegalCase::factory()->create();
        $case->offenses()->attach($offense->id);

        $this->actingAs($admin)->delete("/admin/offenses/{$offense->id}")
            ->assertSessionHasErrors(['delete_error' => 'This Crime cannot be deleted because it is already referenced by a Case.']);

        $this->assertDatabaseHas('offenses', ['id' => $offense->id, 'name' => 'Libel']);
        $this->assertDatabaseHas('case_offenses', ['case_id' => $case->id, 'offense_id' => $offense->id]);
        $this->assertDatabaseMissing('audit_events', ['event_type' => 'offense.deleted', 'subject_id' => $offense->id]);

        $this->expectException(QueryException::class);
        DB::table('offenses')->where('id', $offense->id)->delete();
    }

    public function test_database_rejects_crime_catalog_truncation(): void
    {
        Offense::factory()->create();

        $this->expectException(QueryException::class);
        DB::table('offenses')->truncate();
    }

    public function test_rpc_catalog_seed_is_idempotent_source_traced_and_preserves_matching_ids(): void
    {
        $existing = Offense::factory()->create([
            'name' => 'Qualified Theft',
            'normalized_name' => 'qualified theft',
            'law_reference' => 'Article 310',
            'is_active' => false,
        ]);
        $legacyEstafa = Offense::factory()->create([
            'name' => 'Estafa',
            'normalized_name' => 'estafa',
        ]);
        $entries = require database_path('data/philippine_revised_penal_code.php');

        $this->seed(PhilippineRevisedPenalCodeSeeder::class);
        $count = Offense::query()->count();
        $this->seed(PhilippineRevisedPenalCodeSeeder::class);

        $this->assertSame($count, Offense::query()->count());
        $this->assertSame(count($entries), $count);
        $this->assertDatabaseHas('offenses', [
            'id' => $existing->id,
            'canonical_key' => 'rpc:310',
            'name' => 'Qualified Theft',
            'law_reference' => 'Article 310',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('offenses', [
            'id' => $legacyEstafa->id,
            'canonical_key' => 'rpc:315',
            'name' => 'Estafa',
        ]);
        $this->assertDatabaseHas('offenses', ['canonical_key' => 'rpc:266-A', 'name' => 'Rape']);
        $this->assertDatabaseHas('offenses', ['canonical_key' => 'rpc:202', 'name' => 'Prostitutes']);
        $this->assertDatabaseMissing('offenses', ['canonical_key' => 'rpc:351']);
        $this->assertNotNull(Offense::query()->where('canonical_key', 'rpc:266-A')->value('source_url'));
        $this->assertDatabaseMissing('offenses', ['canonical_key' => 'rpc:321']);
    }

    public function test_editing_a_seeded_crime_detaches_canonical_source_provenance(): void
    {
        $admin = $this->staff(StaffRole::Superuser, 'canonical_edit_admin');
        $this->seed(PhilippineRevisedPenalCodeSeeder::class);
        $offense = Offense::query()->where('canonical_key', 'rpc:310')->firstOrFail();

        $this->actingAs($admin)->patch("/admin/offenses/{$offense->id}", [
            'name' => 'Office Reviewed Qualified Theft',
            'law_reference' => 'Office catalog reference',
        ])->assertRedirect();

        $this->assertDatabaseHas('offenses', [
            'id' => $offense->id,
            'name' => 'Office Reviewed Qualified Theft',
            'canonical_key' => null,
            'source_url' => null,
            'source_note' => null,
        ]);
    }

    public function test_rpc_catalog_stops_and_reports_an_uncertain_existing_match(): void
    {
        $existing = Offense::factory()->create([
            'name' => 'Qualified Theft Offense',
            'normalized_name' => 'qualified theft offense',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Unresolved Crime catalog match for Qualified Theft: Qualified Theft Offense.');

        try {
            $this->seed(PhilippineRevisedPenalCodeSeeder::class);
        } finally {
            $this->assertDatabaseHas('offenses', [
                'id' => $existing->id,
                'canonical_key' => null,
                'name' => 'Qualified Theft Offense',
            ]);
        }
    }

    public function test_all_non_administrator_roles_are_denied_crime_catalog_mutations(): void
    {
        $offense = Offense::factory()->create();

        foreach ([StaffRole::Secretary, StaffRole::Prosecutor, StaffRole::ProcessServer] as $role) {
            $user = $this->staff($role, 'denied_'.strtolower($role->value));
            $this->actingAs($user)->get('/admin/offenses')->assertForbidden();
            $this->actingAs($user)->post('/admin/offenses', ['name' => 'Unauthorized Crime'])->assertForbidden();
            $this->actingAs($user)->patch("/admin/offenses/{$offense->id}", ['name' => 'Unauthorized Crime'])->assertForbidden();
            $this->actingAs($user)->delete("/admin/offenses/{$offense->id}")->assertForbidden();
        }

        $this->assertDatabaseHas('offenses', ['id' => $offense->id]);
    }
}
