<?php

namespace Tests\Feature\M7;

use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\CaseParty;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Resolution;
use App\Support\AuditRecorder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class ReportsAndAuditTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_case_report_counts_only_approved_final_resolutions_and_preserves_legacy_aggregates(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m7_report');
        $theft = Offense::factory()->create(['name' => 'Qualified Theft', 'normalized_name' => 'qualified theft']);
        $estafa = Offense::factory()->create(['name' => 'Estafa', 'normalized_name' => 'estafa']);

        $filingCase = $this->reportCase($prosecutor->id, $secretary->id, '26G-0001', '2026-07-01', 'Station A', [$theft, $estafa], [
            ['Male', '1996-07-01'], ['Female', '1980-01-01'],
        ]);
        $dismissedCase = $this->reportCase($prosecutor->id, $secretary->id, '26G-0002', '2026-07-02', 'Station A', [$theft], [
            ['Female', '1960-01-01'],
        ]);
        $pendingCase = $this->reportCase($prosecutor->id, $secretary->id, '26G-0003', '2026-07-03', 'Station B', [$estafa], [
            ['Male', '1990-01-01'],
        ]);

        Resolution::factory()->for($filingCase, 'case')->forFiling('RTC Cabanatuan')->approved()->create(['created_by_user_id' => $admin->id]);
        Resolution::factory()->for($dismissedCase, 'case')->approved()->create(['created_by_user_id' => $admin->id]);
        Resolution::factory()->for($pendingCase, 'case')->create(['created_by_user_id' => $admin->id]);

        $this->actingAs($admin)->get('/admin/reports?start_date=2026-07-01&end_date=2026-07-31')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Reports/Index')
                ->where('report.total_cases', 2)
                ->where('report.filed', 1)
                ->where('report.dismissed', 1)
                ->where('report.most_common_crime', 'Qualified Theft')
                ->where('report.offense_distribution.0.label', 'Qualified Theft')
                ->where('report.offense_distribution.0.count', 2)
                ->where('report.station_distribution.0.label', 'Station A')
                ->where('report.station_distribution.0.count', 2)
                ->where('report.sex_distribution.0.label', 'Female')
                ->where('report.sex_distribution.0.count', 2)
                ->has('report.age_distribution', 5)
                ->where('report.age_distribution.0.label', '0-17')
                ->where('report.age_distribution.4.label', '61+'));
    }

    public function test_report_filters_use_or_for_case_types_and_same_party_for_demographics(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m7_filters');
        Carbon::setTestNow('2026-07-12 10:00:00');
        $theft = Offense::factory()->create(['name' => 'Theft', 'normalized_name' => 'theft']);
        $estafa = Offense::factory()->create(['name' => 'Estafa', 'normalized_name' => 'estafa']);

        $matching = $this->reportCase($prosecutor->id, $secretary->id, '26G-0010', '2026-07-05', 'Station A', [$theft], [
            ['Female', '1990-07-12'], ['Male', '2000-07-12'],
        ]);
        $other = $this->reportCase($prosecutor->id, $secretary->id, '26G-0011', '2026-07-06', 'Station B', [$estafa], [
            ['Male', '1990-07-12'],
        ]);
        Resolution::factory()->for($matching, 'case')->approved()->create(['created_by_user_id' => $admin->id]);
        Resolution::factory()->for($other, 'case')->approved()->create(['created_by_user_id' => $admin->id]);

        $query = http_build_query([
            'start_date' => '2026-07-01', 'end_date' => '2026-07-31',
            'offenses' => [$theft->id, $estafa->id], 'sex' => 'Female', 'age_group' => '31-45',
        ]);
        $this->actingAs($admin)->get('/admin/reports?'.$query)
            ->assertInertia(fn (Assert $page) => $page
                ->where('report.total_cases', 1)
                ->where('report.station_distribution.0.label', 'Station A')
                ->missing('report.rows'));

        Carbon::setTestNow();
    }

    public function test_reports_and_exports_are_administrator_only_validated_and_audited(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m7_exports');
        $processServer = $this->staff(StaffRole::ProcessServer, 'm7_exports_ps');
        $offense = Offense::factory()->create(['name' => 'Libel', 'normalized_name' => 'libel']);
        $case = $this->reportCase($prosecutor->id, $secretary->id, '26G-0020', '2026-07-07', '=2+2', [$offense], [['Male', '1985-01-01']]);
        Resolution::factory()->for($case, 'case')->forFiling('RTC Gapan')->approved()->create(['created_by_user_id' => $admin->id]);

        foreach ([$prosecutor, $secretary, $processServer] as $staff) {
            $this->actingAs($staff)->get('/admin/reports?verdict=For+Filing')->assertForbidden();
            $this->actingAs($staff)->get('/admin/reports/csv?verdict=For+Filing')->assertForbidden();
        }

        $this->actingAs($admin)->get('/admin/reports?verdict=Invented')->assertSessionHasErrors('verdict');
        $this->actingAs($admin)->get('/admin/reports?offenses[]=not-a-uuid')->assertSessionHasErrors('offenses.0');

        $pdf = $this->actingAs($admin)->get('/admin/reports/pdf?verdict=For+Filing')->assertOk();
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
        $output = getenv('M7_VISUAL_OUTPUT');
        if (is_string($output) && $output !== '') {
            file_put_contents(base_path($output), $pdf->getContent());
        }

        $csv = $this->actingAs($admin)->get('/admin/reports/csv?verdict=For+Filing')->assertOk()->streamedContent();
        $this->assertStringContainsString('"Docket Number","Date Filed",Verdict,"Case Type","Police Station"', $csv);
        $this->assertStringContainsString('III-09-INV-26G-0020', $csv);
        $this->assertStringContainsString("'=2+2", $csv);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'report.exported.pdf', 'actor_user_id' => $admin->id]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'report.exported.csv', 'actor_user_id' => $admin->id]);
    }

    public function test_audit_search_detail_redaction_and_immutability_are_administrator_only(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m7_audit');
        $processServer = $this->staff(StaffRole::ProcessServer, 'm7_audit_ps');
        $event = app(AuditRecorder::class)->record('case.revised', $secretary, 'LegalCase', null, [
            'safe_field' => 'visible',
            'password' => 'never-show',
            'nested' => ['pin_code' => '123456', 'street' => 'Private Street', 'court' => 'RTC Cabanatuan'],
        ]);
        $storedChanges = json_encode($event->changes, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('[REDACTED]', $storedChanges);
        $this->assertStringNotContainsString('never-show', $storedChanges);
        $this->assertStringNotContainsString('123456', $storedChanges);

        foreach ([$prosecutor, $secretary, $processServer] as $staff) {
            $this->actingAs($staff)->get('/admin/audit')->assertForbidden();
            $this->actingAs($staff)->get("/admin/audit/{$event->id}")->assertForbidden();
        }

        $this->actingAs($admin)->get('/admin/audit?search=case.revised&filter=action&sort=timestamp&order=desc')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Audit/Index')
                ->has('events.data', 1)
                ->where('events.data.0.action', 'case.revised'));

        $this->actingAs($admin)->get("/admin/audit/{$event->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Audit/Show')
                ->where('event.changes.safe_field', 'visible')
                ->where('event.changes.password', '[REDACTED]')
                ->where('event.changes.nested.pin_code', '[REDACTED]')
                ->where('event.changes.nested.street', '[REDACTED]')
                ->where('event.changes.nested.court', 'RTC Cabanatuan'));

        $this->actingAs($admin)->get('/admin/audit?sort=occurred_at;drop table users')->assertSessionHasErrors('sort');

        foreach (range(1, 10) as $number) {
            app(AuditRecorder::class)->record('test.event.'.$number, $secretary);
        }
        $this->actingAs($admin)->get('/admin/audit')
            ->assertInertia(fn (Assert $page) => $page
                ->has('events.data', 10)
                ->where('events.last_page', 2));

        $this->expectException(LogicException::class);
        $event->update(['event_type' => 'changed']);
    }

    public function test_reporting_and_audit_indexes_exist_in_postgresql(): void
    {
        $indexes = collect(\DB::select("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"))->pluck('indexname');

        foreach (['case_offenses_report_filter_index', 'case_parties_sex_report_index', 'case_parties_age_report_index', 'audit_events_action_time_index', 'audit_events_occurred_at_index'] as $index) {
            $this->assertContains($index, $indexes);
        }
    }

    /**
     * @param  list<Offense>  $offenses
     * @param  list<array{0: string, 1: string}>  $parties
     */
    private function reportCase(string $prosecutorId, string $secretaryId, string $serial, string $date, string $station, array $offenses, array $parties): LegalCase
    {
        $case = LegalCase::factory()->create([
            'docket_number' => 'III-09-INV-'.$serial,
            'date' => $date,
            'police_station' => $station,
            'assigned_prosecutor_id' => $prosecutorId,
            'created_by_user_id' => $secretaryId,
            'subpoena_status' => 'Approved',
        ]);
        $case->offenses()->sync(collect($offenses)->pluck('id'));

        foreach ($parties as $position => [$sex, $birthDate]) {
            CaseParty::create([
                'case_id' => $case->id,
                'role' => $position === 0 ? PartyRole::Complainant->value : PartyRole::Respondent->value,
                'position' => 1,
                'first_name' => 'Party', 'last_name' => (string) $position,
                'date_of_birth' => $birthDate, 'sex' => $sex,
                'street' => 'Street', 'barangay' => 'Barangay', 'municipality' => 'Cabanatuan', 'province' => 'Nueva Ecija', 'region' => 'III',
            ]);
        }

        return $case;
    }
}
