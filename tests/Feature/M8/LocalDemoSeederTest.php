<?php

namespace Tests\Feature\M8;

use App\Domain\Documents\DocumentAccess;
use App\Models\AuditEvent;
use App\Models\LegalCase;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\Resolution;
use App\Models\User;
use Database\Seeders\LocalDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

class LocalDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_demo_fixture_is_rejected_outside_local_environment(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('The localhost demo fixture may run only in the local environment.');

        $this->seed(LocalDemoSeeder::class);
    }

    public function test_local_demo_fixture_covers_roles_workflows_reports_audits_and_public_lookup(): void
    {
        $originalEnvironment = $this->app['env'];
        $this->app['env'] = 'local';

        try {
            $this->seed(LocalDemoSeeder::class);
        } finally {
            $this->app['env'] = $originalEnvironment;
        }

        $this->assertSame(4, User::query()->count());
        $this->assertTrue(Hash::check('LocalDemo!2026', User::query()->where('username', 'demo_admin')->value('password')));
        $this->assertSame(1, ProsecutorSecretaryAssignment::query()->count());
        $this->assertSame(6, LegalCase::query()->count());
        $this->assertSame(4, LegalCase::query()->where('subpoena_status', 'Approved')->count());
        $this->assertSame(1, LegalCase::query()->where('subpoena_status', 'Pending')->count());
        $this->assertSame(1, LegalCase::query()->where('subpoena_status', 'Denied')->count());
        $this->assertSame(4, Resolution::query()->count());
        $this->assertSame(2, Resolution::query()->where('status', 'Approved')->count());
        $this->assertSame(1, Resolution::query()->where('status', 'Pending')->count());
        $this->assertSame(1, Resolution::query()->where('status', 'Denied')->count());
        $this->assertGreaterThanOrEqual(20, AuditEvent::query()->count());
        $secretary = User::query()->where('username', 'demo_secretary')->firstOrFail();

        $demoCase = fn (string $docket): LegalCase => LegalCase::query()
            ->with(['subpoenaDecisions', 'resolution.decisions'])
            ->where('docket_number', $docket)
            ->firstOrFail();
        $first = $demoCase('III-09-INV-26G-0001');
        $second = $demoCase('III-09-INV-26G-0002');
        $third = $demoCase('III-09-INV-26G-0003');
        $fourth = $demoCase('III-09-INV-26G-0004');
        $fifth = $demoCase('III-09-INV-26G-0005');
        $sixth = $demoCase('III-09-INV-26G-0006');

        $this->assertSame('Approved', $first->getRawOriginal('subpoena_status'));
        $this->assertNotNull($first->pin_document_secret);
        $this->assertSame('For Filing', $first->resolution->getRawOriginal('verdict'));
        $this->assertSame('Approved', $first->resolution->getRawOriginal('status'));
        $this->assertNotNull($first->hearing_date_1);
        $this->assertTrue(app(DocumentAccess::class)->canGenerate($secretary, $first));
        $this->assertSame('Approved', $second->getRawOriginal('subpoena_status'));
        $this->assertSame('Dismissed', $second->resolution->getRawOriginal('verdict'));
        $this->assertSame('Approved', $second->resolution->getRawOriginal('status'));
        $this->assertSame('Pending', $third->getRawOriginal('subpoena_status'));
        $this->assertNull($third->resolution);
        $this->assertSame('Denied', $fourth->getRawOriginal('subpoena_status'));
        $this->assertNull($fourth->resolution);
        $this->assertNotEmpty($fourth->subpoenaDecisions->first()?->comment);
        $this->assertSame('Approved', $fifth->getRawOriginal('subpoena_status'));
        $this->assertSame('For Filing', $fifth->resolution->getRawOriginal('verdict'));
        $this->assertSame('Pending', $fifth->resolution->getRawOriginal('status'));
        $this->assertSame('Approved', $sixth->getRawOriginal('subpoena_status'));
        $this->assertSame('Dismissed', $sixth->resolution->getRawOriginal('verdict'));
        $this->assertSame('Denied', $sixth->resolution->getRawOriginal('status'));
        $this->assertNotEmpty($sixth->resolution->decisions->first()?->comment);

        $processServer = User::query()->where('username', 'demo_process_server')->firstOrFail();
        $this->actingAs($processServer)
            ->get('/process-server/cases')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('is_process_server', true)
                ->where('cases.total', 6)
                ->has('cases.data', 6));

        $this->actingAs($secretary)
            ->get('/secretary/verifying-cases?tab=subpoenas')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.total', 6));
        $this->get('/secretary/verifying-cases?tab=resolutions')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.total', 4));

        $this->post('/docket', [
            'docket' => 'III-09-INV-26G-0001',
            'pin' => '246810',
        ])->assertRedirect('/docket');

        $this->get('/docket')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Lookup')
            ->where('case_data.docket_number', 'III-09-INV-26G-0001')
            ->where('case_data.status', 'For Filing')
            ->where('case_data.court_location', 'RTC Cabanatuan'));
    }
}
