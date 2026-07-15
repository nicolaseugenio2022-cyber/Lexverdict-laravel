<?php

namespace Tests\Feature\Acceptance;

use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\LegalCase;
use App\Models\Offense;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class CaseEntryExperienceTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_case_form_uses_only_active_catalog_crimes_and_official_regions(): void
    {
        [, , $secretary] = $this->pairedStaff('case_entry_form');
        $active = Offense::factory()->create(['name' => 'Active Crime', 'is_active' => true]);
        Offense::factory()->create(['name' => 'Inactive Crime', 'is_active' => false]);

        $this->actingAs($secretary)
            ->get('/cases/create')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Cases/Form')
                ->has('regions', 18)
                ->has('offenses', 1)
                ->where('offenses.0.id', $active->id)
                ->where('offenses.0.name', 'Active Crime'));
    }

    public function test_address_options_follow_the_official_parent_child_hierarchy(): void
    {
        [, , $secretary] = $this->pairedStaff('address_options');

        $this->actingAs($secretary)
            ->getJson('/case-entry/address-options?level=provinces&region_code=0300000000')
            ->assertOk()
            ->assertJsonFragment(['code' => '0304900000', 'name' => 'Nueva Ecija'])
            ->assertJsonMissing(['code' => '0702200000', 'name' => 'Cebu']);

        $this->actingAs($secretary)
            ->getJson('/case-entry/address-options?level=municipalities&region_code=0300000000&province_code=0304900000')
            ->assertOk()
            ->assertJsonFragment(['code' => '0304903000', 'name' => 'City of Cabanatuan']);

        $this->actingAs($secretary)
            ->getJson('/case-entry/address-options?level=barangays&municipality_code=0304903000')
            ->assertOk()
            ->assertJsonFragment(['code' => '0304903031', 'name' => 'Dicarma']);

        $this->actingAs($secretary)
            ->getJson('/case-entry/address-options?level=municipalities&region_code=0300000000&province_code=0702200000')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('province_code');
    }

    public function test_duplicate_or_inactive_catalog_crimes_are_rejected(): void
    {
        [, , $secretary] = $this->pairedStaff('crime_validation');
        $active = Offense::factory()->create(['is_active' => true]);
        $inactive = Offense::factory()->create(['is_active' => false]);

        $this->actingAs($secretary)
            ->post('/cases', $this->validPayload([$active->id, strtoupper($active->id)]))
            ->assertSessionHasErrors('offense_ids.1');

        $this->actingAs($secretary)
            ->post('/cases', $this->validPayload([$inactive->id]))
            ->assertSessionHasErrors('offense_ids.0');

        $this->assertDatabaseCount('cases', 0);
    }

    public function test_invalid_address_hierarchy_is_rejected_and_valid_codes_store_canonical_names(): void
    {
        [, , $secretary] = $this->pairedStaff('address_validation');
        $firstOffense = Offense::factory()->create(['is_active' => true]);
        $secondOffense = Offense::factory()->create(['is_active' => true]);
        $invalid = $this->validPayload([$firstOffense->id]);
        $invalid['parties'][0]['province_code'] = '0702200000';

        $this->actingAs($secretary)
            ->post('/cases', $invalid)
            ->assertSessionHasErrors('parties.0.barangay_code');

        $valid = $this->validPayload([$firstOffense->id, $secondOffense->id]);
        foreach ($valid['parties'] as &$party) {
            $party['region'] = 'Untrusted Region';
            $party['province'] = 'Untrusted Province';
            $party['municipality'] = 'Untrusted Municipality';
            $party['barangay'] = 'Untrusted Barangay';
        }
        unset($party);

        $this->actingAs($secretary)
            ->post('/cases', $valid)
            ->assertRedirect();

        $case = LegalCase::query()->with(['offenses', 'parties'])->firstOrFail();
        $this->assertEqualsCanonicalizing(
            [$firstOffense->id, $secondOffense->id],
            $case->offenses->modelKeys(),
        );
        $this->assertTrue($case->parties->every(fn ($party): bool => $party->region === 'Region III (Central Luzon)'
            && $party->province === 'Nueva Ecija'
            && $party->municipality === 'City of Cabanatuan'
            && $party->barangay === 'Dicarma'));
    }

    public function test_malformed_address_code_types_return_validation_errors(): void
    {
        [, , $secretary] = $this->pairedStaff('malformed_address');
        $offense = Offense::factory()->create(['is_active' => true]);
        $payload = $this->validPayload([$offense->id]);
        $payload['parties'][0]['region_code'] = ['0300000000'];

        $this->actingAs($secretary)
            ->post('/cases', $payload)
            ->assertSessionHasErrors(['parties.0.region_code', 'parties.0.barangay_code']);

        $this->assertDatabaseCount('cases', 0);
    }

    public function test_revision_preserves_unchanged_legacy_addresses_and_attached_inactive_crimes(): void
    {
        [, , $secretary] = $this->pairedStaff('legacy_revision');
        $attachedOffense = Offense::factory()->create(['name' => 'Archived Attached Crime', 'is_active' => true]);
        $otherInactiveOffense = Offense::factory()->create(['name' => 'Other Inactive Crime', 'is_active' => false]);
        $legacyPayload = $this->validPayload([$attachedOffense->id]);

        foreach ($legacyPayload['parties'] as &$party) {
            $party['region'] = 'Legacy Region Name';
            $party['province'] = 'Legacy Province Name';
            $party['municipality'] = 'Legacy Municipality Name';
            $party['barangay'] = 'Legacy Barangay Name';
            $party['region_code'] = '';
            $party['province_code'] = '';
            $party['municipality_code'] = '';
            $party['barangay_code'] = '';
        }
        unset($party);

        $case = app(CreateCase::class)->create($legacyPayload, $secretary)['case'];
        $attachedOffense->update(['is_active' => false]);
        $case->load('parties');

        $this->actingAs($secretary)
            ->get("/cases/{$case->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('offenses.0.id', $attachedOffense->id)
                ->where('offenses.0.is_selectable', false)
                ->where('caseRecord.parties.0.region', 'Legacy Region Name')
                ->where('caseRecord.parties.0.region_code', '')
                ->where('caseRecord.parties.0.source_party_id', $case->parties[0]->id));

        foreach ($legacyPayload['parties'] as $index => &$party) {
            $party['source_party_id'] = $case->parties[$index]->id;
        }
        unset($party);
        $legacyPayload['revision_number'] = 1;
        $legacyPayload['police_station'] = 'Updated Police Station';

        $duplicateSource = $legacyPayload;
        $duplicateSource['parties'][1]['source_party_id'] = $duplicateSource['parties'][0]['source_party_id'];
        $this->actingAs($secretary)
            ->patch("/cases/{$case->id}", $duplicateSource)
            ->assertSessionHasErrors('parties.1.source_party_id');

        $this->actingAs($secretary)
            ->patch("/cases/{$case->id}", [
                ...$legacyPayload,
                'offense_ids' => [$attachedOffense->id, $otherInactiveOffense->id],
            ])
            ->assertSessionHasErrors('offense_ids.1');

        $this->actingAs($secretary)
            ->patch("/cases/{$case->id}", $legacyPayload)
            ->assertRedirect("/cases/{$case->id}");

        $case->refresh()->load(['offenses', 'parties']);
        $this->assertSame('Updated Police Station', $case->police_station);
        $this->assertSame([$attachedOffense->id], $case->offenses->modelKeys());
        $this->assertTrue($case->parties->every(fn ($party): bool => $party->region === 'Legacy Region Name'
            && $party->province === 'Legacy Province Name'
            && $party->municipality === 'Legacy Municipality Name'
            && $party->barangay === 'Legacy Barangay Name'));
    }

    public function test_address_endpoint_preserves_case_creation_authorization(): void
    {
        [, $prosecutor] = $this->pairedStaff('address_authorization');
        $processServer = $this->staff(StaffRole::ProcessServer, 'address_process_server');

        $this->actingAs($prosecutor)
            ->getJson('/case-entry/address-options?level=provinces&region_code=0300000000')
            ->assertForbidden();

        $this->actingAs($processServer)
            ->getJson('/case-entry/address-options?level=provinces&region_code=0300000000')
            ->assertForbidden();
    }

    /**
     * @param  list<string>  $offenseIds
     * @return array<string, mixed>
     */
    private function validPayload(array $offenseIds): array
    {
        return [
            'date' => '2026-07-15',
            'hearing_date_1' => '2026-07-20 09:00:00',
            'hearing_date_2' => '2026-07-21 09:00:00',
            'police_station' => 'Cabanatuan City Police Station',
            'offense_ids' => $offenseIds,
            'parties' => [
                $this->party(PartyRole::Complainant, 'Camille', 'Complainant'),
                $this->party(PartyRole::Respondent, 'Ramon', 'Respondent'),
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
            'street' => 'Maharlika Street',
            'barangay' => 'Dicarma',
            'municipality' => 'City of Cabanatuan',
            'province' => 'Nueva Ecija',
            'region' => 'Region III (Central Luzon)',
            'region_code' => '0300000000',
            'province_code' => '0304900000',
            'municipality_code' => '0304903000',
            'barangay_code' => '0304903031',
        ];
    }
}
