<?php

namespace Tests\Feature\M8;

use App\Domain\Reports\CaseReportQuery;
use App\Domain\Reports\ReportFilters;
use App\Jobs\GenerateSubpoenaPdf;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Resolution;
use App\Support\Operations\ReleaseConfigurationCheck;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesStaffPairs;
use Tests\TestCase;

class HardeningAndReleaseReadinessTest extends TestCase
{
    use CreatesStaffPairs;
    use RefreshDatabase;

    public function test_release_check_rejects_unsafe_configuration_and_accepts_hardened_configuration(): void
    {
        $check = app(ReleaseConfigurationCheck::class);
        $this->assertFalse($check->passes());

        Config::set([
            'app.env' => 'production',
            'app.debug' => false,
            'app.url' => 'https://lexverdict.example.gov.ph',
            'app.key' => 'base64:'.base64_encode(random_bytes(32)),
            'app.timezone' => 'Asia/Manila',
            'database.default' => 'pgsql',
            'database.connections.pgsql.sslmode' => 'verify-full',
            'queue.default' => 'database',
            'cache.default' => 'database',
            'session.secure' => true,
            'session.encrypt' => true,
            'session.http_only' => true,
            'session.same_site' => 'lax',
            'operations.document_disk' => 'local',
            'operations.queue_backlog_threshold' => 100,
            'operations.queue_age_threshold_seconds' => 300,
        ]);

        $this->assertTrue($check->passes());
    }

    public function test_readiness_is_minimal_no_store_and_security_headers_are_present(): void
    {
        $this->get('/health/ready')
            ->assertOk()
            ->assertExactJson(['status' => 'ready'])
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'same-origin');

        $this->get('/login')
            ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }

    public function test_document_job_targets_the_dedicated_worker_with_bounded_retries(): void
    {
        $job = new GenerateSubpoenaPdf('00000000-0000-0000-0000-000000000001');

        $this->assertSame('documents', $job->queue);
        $this->assertSame(3, $job->tries);
        $this->assertSame(120, $job->timeout);
        $this->assertTrue($job->failOnTimeout);
    }

    public function test_production_responses_add_transport_and_content_security_policy_headers(): void
    {
        app()->detectEnvironment(fn (): string => 'production');

        $this->get('/login')
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
            ->assertHeader('Content-Security-Policy');
    }

    public function test_operational_health_command_passes_with_healthy_dependencies_and_queue(): void
    {
        $this->artisan('lexverdict:health-check')->assertSuccessful();
    }

    public function test_report_query_is_bounded_and_index_backed_at_synthetic_release_volume(): void
    {
        [$admin, $prosecutor, $secretary] = $this->pairedStaff('m8_profile');
        $offense = Offense::factory()->create(['name' => 'Profile Offense', 'normalized_name' => 'profile offense']);

        foreach (range(1, 250) as $number) {
            $case = LegalCase::factory()->create([
                'docket_number' => sprintf('III-09-INV-26G-%04d', $number),
                'date' => '2026-07-10',
                'assigned_prosecutor_id' => $prosecutor->id,
                'created_by_user_id' => $secretary->id,
                'subpoena_status' => 'Approved',
            ]);
            $case->offenses()->attach($offense);
            Resolution::factory()->for($case, 'case')->approved()->create(['created_by_user_id' => $admin->id]);
        }

        $queries = 0;
        DB::listen(function () use (&$queries): void {
            $queries++;
        });
        $started = hrtime(true);
        $result = app(CaseReportQuery::class)->run(ReportFilters::from([
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-31',
        ]));
        $elapsedMilliseconds = (hrtime(true) - $started) / 1_000_000;
        $reportQueryCount = $queries;

        $this->assertSame(250, $result['total_cases']);
        $this->assertLessThanOrEqual(4, $reportQueryCount);
        $this->assertLessThan(2000, $elapsedMilliseconds);

        DB::statement('SET LOCAL enable_seqscan = off');
        $plan = json_encode(DB::select(<<<'SQL'
            EXPLAIN (FORMAT JSON)
            SELECT id FROM resolutions
            WHERE status = 'Approved'
              AND verdict IN ('For Filing', 'Dismissed')
              AND verdict_date BETWEEN '2026-07-01' AND '2026-07-31'
            SQL), JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('resolutions_status_verdict_verdict_date_index', $plan);

        fwrite(STDOUT, sprintf("\nM8 report profile: 250 cases, %d queries, %.2f ms\n", $reportQueryCount, $elapsedMilliseconds));
    }
}
