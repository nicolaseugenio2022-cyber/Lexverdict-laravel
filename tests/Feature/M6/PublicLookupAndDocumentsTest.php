<?php

namespace Tests\Feature\M6;

use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Actions\DecideSubpoena;
use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Documents\RequestSubpoenaDocument;
use App\Domain\Documents\SubpoenaPdfRenderer;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Actions\DecideResolution;
use App\Domain\Resolutions\Actions\SubmitResolution;
use App\Jobs\GenerateSubpoenaPdf;
use App\Models\GeneratedDocument;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use RuntimeException;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class PublicLookupAndDocumentsTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_public_lookup_preserves_exact_legacy_projection_for_approved_for_filing_resolution(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m6_lookup_filing');
        [$case, $pin] = $this->caseFor($secretary, 'Cabanatuan', 'Qualified Theft');
        app(DecideSubpoena::class)->approve($case, $prosecutor, 1);
        $resolution = app(SubmitResolution::class)->create($case->refresh(), ['verdict' => 'For Filing', 'court' => 'RTC Cabanatuan'], $secretary);
        app(DecideResolution::class)->approve($resolution, $admin, 1);

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.10'])
            ->post('/docket', ['docket' => " {$case->docket_number} ", 'pin' => $pin])
            ->assertRedirect('/docket');

        $this->get('/docket')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Lookup')
            ->has('case_data', 8)
            ->where('case_data.docket_number', $case->docket_number)
            ->where('case_data.case_type', 'Qualified Theft')
            ->where('case_data.prosecutor', 'Prosecutor_m6_lookup_filing User')
            ->where('case_data.hearing_date_1', '2026-07-21 09:30:00')
            ->where('case_data.hearing_date_2', '2026-07-22 09:30:00')
            ->where('case_data.status', 'For Filing')
            ->where('case_data.date_filed', now()->toDateString())
            ->where('case_data.court_location', 'RTC Cabanatuan'));

        $this->assertDatabaseHas('audit_events', ['event_type' => 'public.lookup.succeeded', 'subject_id' => $case->id]);
    }

    public function test_public_lookup_maps_nonfinal_and_dismissed_outcomes_without_adding_fields(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m6_lookup_outcomes');
        [$pendingCase, $pendingPin] = $this->caseFor($secretary, 'Gapan', 'Estafa');

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.11'])
            ->post('/docket', ['docket' => $pendingCase->docket_number, 'pin' => $pendingPin]);
        $this->get('/docket')->assertInertia(fn (Assert $page) => $page
            ->has('case_data', 8)
            ->where('case_data.status', 'Pending')
            ->where('case_data.date_filed', 'Pending...')
            ->where('case_data.court_location', null));

        [$dismissedCase, $dismissedPin] = $this->caseFor($secretary, 'Palayan', 'Libel');
        app(DecideSubpoena::class)->approve($dismissedCase, $prosecutor, 1);
        $resolution = app(SubmitResolution::class)->create($dismissedCase->refresh(), ['verdict' => 'Dismissed'], $secretary);
        app(DecideResolution::class)->approve($resolution, $admin, 1);

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.12'])
            ->post('/docket', ['docket' => $dismissedCase->docket_number, 'pin' => $dismissedPin]);
        $this->get('/docket')->assertInertia(fn (Assert $page) => $page
            ->has('case_data', 8)
            ->where('case_data.status', 'Dismissed')
            ->where('case_data.court_location', null));
    }

    public function test_lookup_uses_generic_failures_hash_verification_throttling_and_never_audits_pin(): void
    {
        [, , $secretary] = $this->pairedStaff('m6_lookup_abuse');
        [$case, $pin] = $this->caseFor($secretary, 'San Jose', 'Robbery');
        $this->assertTrue(Hash::check($pin, $case->pin_hash));
        $this->assertNotSame($pin, DB::table('cases')->where('id', $case->id)->value('pin_hash'));
        $this->assertNotSame($pin, DB::table('cases')->where('id', $case->id)->value('pin_document_secret'));

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.14'])
            ->post('/docket', ['docket' => $case->docket_number, 'pin' => '12'])
            ->assertSessionHasErrors(['lookup' => 'Invalid Docket Number or PIN'])
            ->assertSessionMissing('_old_input.pin');

        foreach (range(1, 5) as $attempt) {
            $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.13'])
                ->post('/docket', ['docket' => $attempt === 1 ? $case->docket_number : 'unknown', 'pin' => '999999'])
                ->assertSessionHasErrors(['lookup' => 'Invalid Docket Number or PIN']);
        }

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.13'])
            ->post('/docket', ['docket' => $case->docket_number, 'pin' => $pin])
            ->assertTooManyRequests();

        $serializedAudits = DB::table('audit_events')->where('event_type', 'public.lookup.failed')->pluck('changes')->implode(' ');
        $this->assertStringNotContainsString('999999', $serializedAudits);
        $this->assertSame(6, DB::table('audit_events')->where('event_type', 'public.lookup.failed')->count());
    }

    public function test_scoped_staff_generates_and_privately_views_checksummed_legacy_subpoena_pdf(): void
    {
        Storage::fake('local');
        [, $prosecutor, $secretary] = $this->pairedStaff('m6_document');
        [, $otherProsecutor] = $this->pairedStaff('m6_document_other');
        $processServer = $this->staff(StaffRole::ProcessServer, 'm6_document_ps');
        [$case, $pin] = $this->caseFor($secretary, 'Cabanatuan', 'Qualified Theft', true);
        $prosecutor->staffProfile->update(['first_name' => 'Ramon', 'last_name' => 'Prosecutor']);
        $secretary->staffProfile->update(['first_name' => 'Liza', 'last_name' => 'Secretary']);
        $pin = '123456';
        $case->update(['pin_document_secret' => $pin]);

        $this->actingAs($secretary)->post("/cases/{$case->id}/documents/subpoena")->assertRedirect("/cases/{$case->id}");

        $document = GeneratedDocument::query()->firstOrFail();
        $this->assertSame('Subpoena', $document->document_type);
        $this->assertSame('legacy-v1', $document->template_version);
        $this->assertNotNull($document->generated_at);
        $this->assertNotNull($document->storage_path);
        Storage::disk('local')->assertExists($document->storage_path);
        $bytes = Storage::disk('local')->get($document->storage_path);
        $this->assertStringStartsWith('%PDF-', $bytes);
        $this->assertSame(hash('sha256', $bytes), $document->sha256);
        $this->assertSame(strlen($bytes), $document->byte_size);

        $html = app(SubpoenaPdfRenderer::class)->html($document);
        $this->assertSame(2, substr_count($html, 'class="page"'));
        $this->assertStringContainsString('DEPARTMENT OF JUSTICE', $html);
        $this->assertStringContainsString('Under and by virtue of the authority vested in me by law', $html);
        $this->assertStringContainsString('FAIL NOT UNDER THE PENALTY OF LAW.', $html);
        $this->assertStringContainsString('Return:', $html);
        $this->assertStringContainsString('PIN: '.$pin, $html);
        $this->assertStringContainsString('HON. RAMON PROSECUTOR', $html);
        $this->assertStringContainsString('July 21 &amp; 22, 2026', $html);
        $this->assertStringContainsString('09:30 AM', $html);
        $this->assertStringContainsString('Brgy. Barangay, Cabanatuan, Nueva Ecija', $html);
        $this->assertStringContainsString('Brgy. Barangay, Gapan, Nueva Ecija', $html);
        $this->assertStringContainsString('data:image/jpeg;base64,', $html);
        $this->assertStringContainsString('data:image/png;base64,', $html);
        $this->assertMatchesRegularExpression('/\/MediaBox\s*\[0(?:\.0+)?\s+0(?:\.0+)?\s+612(?:\.0+)?\s+936(?:\.0+)?\]/', $bytes);
        $visualOutput = getenv('M6_VISUAL_OUTPUT');
        if (is_string($visualOutput) && $visualOutput !== '') {
            $outputPath = base_path($visualOutput);
            if (! is_dir(dirname($outputPath))) {
                mkdir(dirname($outputPath), 0777, true);
            }
            file_put_contents($outputPath, $bytes);
        }

        (new GenerateSubpoenaPdf($document->id))->handle(app(SubpoenaPdfRenderer::class), app(AuditRecorder::class));
        $this->assertSame($document->sha256, $document->refresh()->sha256);
        $this->assertCount(1, (new GenerateSubpoenaPdf($document->id))->middleware());

        $this->actingAs($secretary)->get("/cases/{$case->id}/documents/{$document->id}")
            ->assertOk()->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Cache-Control', 'max-age=0, no-store, private');
        $this->actingAs($prosecutor)->get("/cases/{$case->id}")->assertInertia(fn (Assert $page) => $page
            ->where('can_generate_subpoena', false)
            ->has('documents', 0));
        $this->actingAs($prosecutor)->get("/cases/{$case->id}/documents/{$document->id}")->assertForbidden();
        $this->actingAs($otherProsecutor)->get("/cases/{$case->id}/documents/{$document->id}")->assertForbidden();
        $this->actingAs($processServer)->get("/cases/{$case->id}/documents/{$document->id}")->assertForbidden();
        $this->post('/logout');
        $this->get("/cases/{$case->id}/documents/{$document->id}")->assertRedirect('/login');
        $this->assertDatabaseHas('audit_events', ['event_type' => 'document.subpoena.generated', 'subject_id' => $case->id]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'document.subpoena.viewed', 'subject_id' => $case->id]);
    }

    public function test_document_generation_revalidates_scope_requires_template_inputs_and_versions_immutably(): void
    {
        Storage::fake('local');
        [$admin, , $secretary] = $this->pairedStaff('m6_document_rules');
        [, , $otherSecretary] = $this->pairedStaff('m6_document_rules_other');
        [$case] = $this->caseFor($secretary, 'Cabanatuan', 'Theft');

        $this->actingAs($otherSecretary)->post("/cases/{$case->id}/documents/subpoena")->assertForbidden();
        $case->update(['hearing_date_1' => null]);
        $this->actingAs($admin)->post("/cases/{$case->id}/documents/subpoena")->assertForbidden();

        $case->update(['hearing_date_1' => '2026-07-21 09:30:00']);
        app(RequestSubpoenaDocument::class)->request($case->refresh(), $secretary);
        app(RequestSubpoenaDocument::class)->request($case->refresh(), $secretary);
        $this->assertSame([1, 2], GeneratedDocument::query()->orderBy('version')->pluck('version')->all());

        $document = GeneratedDocument::query()->firstOrFail();
        try {
            $document->update(['sha256' => str_repeat('a', 64)]);
            $this->fail('Generated document metadata must be immutable.');
        } catch (LogicException $exception) {
            $this->assertSame('Generated document metadata is immutable.', $exception->getMessage());
        }

        $this->assertDatabaseRejects(fn () => DB::table('generated_documents')->where('id', $document->id)->delete());
        $this->assertDatabaseRejects(fn () => DB::table('generated_documents')->where('id', $document->id)->update(['id' => (string) Str::uuid()]));
        $this->assertDatabaseRejects(fn () => DB::statement('TRUNCATE TABLE generated_documents'));

        try {
            $this->rollBackM6Migration();
            $this->fail('Generated Subpoena history must not roll back.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Refusing to roll back generated Subpoena document history or secrets.', $exception->getMessage());
        }
    }

    public function test_queued_document_uses_encrypted_request_time_snapshot_and_records_terminal_failure(): void
    {
        Queue::fake();
        Storage::fake('local');
        [, , $secretary] = $this->pairedStaff('m6_snapshot');
        [$case, $pin] = $this->caseFor($secretary, 'Cabanatuan', 'Estafa');
        $document = app(RequestSubpoenaDocument::class)->request($case, $secretary);
        Queue::assertPushed(GenerateSubpoenaPdf::class, fn (GenerateSubpoenaPdf $job): bool => $job->documentId === $document->id);
        $this->assertSame(3, (new GenerateSubpoenaPdf($document->id))->tries);

        $ciphertext = DB::table('generated_documents')->where('id', $document->id)->value('render_payload');
        $this->assertIsString($ciphertext);
        $this->assertStringNotContainsString($pin, $ciphertext);

        $case->update(['police_station' => 'Changed Station', 'pin_document_secret' => '654321']);
        $case->parties()->firstOrFail()->update(['first_name' => 'Changed']);
        $case->assignedProsecutor->staffProfile->update(['first_name' => 'Changed']);

        $html = app(SubpoenaPdfRenderer::class)->html($document->refresh());
        $this->assertStringContainsString('CABANATUAN CITY POLICE STATION', $html);
        $this->assertStringContainsString('PIN: '.$pin, $html);
        $this->assertStringNotContainsString('Changed Station', $html);
        $this->assertStringNotContainsString('HON. CHANGED USER', $html);

        (new GenerateSubpoenaPdf($document->id))->handle(app(SubpoenaPdfRenderer::class), app(AuditRecorder::class));
        $this->assertNotNull($document->refresh()->generated_at);

        [$failedCase] = $this->caseFor($secretary, 'Gapan', 'Libel');
        $failedDocument = app(RequestSubpoenaDocument::class)->request($failedCase, $secretary);
        (new GenerateSubpoenaPdf($failedDocument->id))->failed(new RuntimeException('Sensitive renderer detail'));
        $this->assertNotNull($failedDocument->refresh()->failed_at);
        $failedAudit = DB::table('audit_events')->where('event_type', 'document.subpoena.failed')->first();
        $this->assertNotNull($failedAudit);
        $this->assertStringNotContainsString('Sensitive renderer detail', (string) $failedAudit->changes);
    }

    /** @return array{0: LegalCase, 1: string} */
    private function caseFor(User $secretary, string $municipality, string $offenseName, bool $multipleMunicipalities = false): array
    {
        $offense = Offense::factory()->create(['name' => $offenseName, 'normalized_name' => mb_strtolower($offenseName)]);
        $parties = [
            $this->party(PartyRole::Complainant, 'Juan', 'Dela Cruz', $municipality),
            $this->party(PartyRole::Respondent, 'Pedro', 'Santos', $municipality),
        ];
        if ($multipleMunicipalities) {
            $parties[] = $this->party(PartyRole::Respondent, 'Maria', 'Reyes', 'Gapan');
        }

        $result = app(CreateCase::class)->create([
            'date' => '2026-07-11',
            'hearing_date_1' => '2026-07-21 09:30:00',
            'hearing_date_2' => '2026-07-22 09:30:00',
            'police_station' => 'Cabanatuan City Police Station',
            'offense_ids' => [$offense->id],
            'parties' => $parties,
        ], $secretary);

        return [$result['case'], $result['pin']];
    }

    /** @return array<string, string|null> */
    private function party(PartyRole $role, string $firstName, string $lastName, string $municipality): array
    {
        return [
            'role' => $role->value, 'first_name' => $firstName, 'middle_name' => null, 'last_name' => $lastName,
            'suffix' => null, 'date_of_birth' => '1990-01-01', 'sex' => 'Male', 'street' => 'Street',
            'barangay' => 'Barangay', 'municipality' => $municipality, 'province' => 'Nueva Ecija', 'region' => 'III',
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

    private function rollBackM6Migration(): void
    {
        $migration = require database_path('migrations/2026_07_12_000005_create_public_lookup_and_document_tables.php');
        if (! is_object($migration) || ! method_exists($migration, 'down')) {
            throw new LogicException('M6 migration could not be loaded.');
        }

        $migration->down();
    }
}
