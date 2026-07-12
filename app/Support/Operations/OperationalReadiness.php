<?php

namespace App\Support\Operations;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class OperationalReadiness
{
    /** @return array{ready: bool, checks: array<string, bool>, metrics: array<string, int>} */
    public function inspect(): array
    {
        $checks = [
            'database' => $this->databaseReady(),
            'cache' => $this->cacheReady(),
            'private_storage' => $this->storageReady(),
        ];
        $metrics = $this->queueMetrics();

        return [
            'ready' => ! in_array(false, $checks, true),
            'checks' => $checks,
            'metrics' => $metrics,
        ];
    }

    /** @param array<string, int> $metrics */
    public function queueWithinThresholds(array $metrics): bool
    {
        return $metrics['queued_jobs'] <= (int) config('operations.queue_backlog_threshold')
            && $metrics['oldest_job_age_seconds'] <= (int) config('operations.queue_age_threshold_seconds')
            && $metrics['failed_jobs'] <= (int) config('operations.failed_jobs_threshold');
    }

    private function databaseReady(): bool
    {
        try {
            DB::select('SELECT 1');

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function cacheReady(): bool
    {
        $key = 'health:'.Str::uuid();
        try {
            Cache::put($key, 'ready', 30);

            return Cache::get($key) === 'ready';
        } catch (Throwable) {
            return false;
        } finally {
            try {
                Cache::forget($key);
            } catch (Throwable) {
                // The readiness result already captures an unavailable cache.
            }
        }
    }

    private function storageReady(): bool
    {
        $disk = (string) config('operations.document_disk');
        $path = '.health/'.Str::uuid();
        try {
            $storage = Storage::disk($disk);

            return $storage->put($path, 'ready') && $storage->exists($path);
        } catch (Throwable) {
            return false;
        } finally {
            if (isset($storage)) {
                try {
                    $storage->delete($path);
                } catch (Throwable) {
                    // The readiness result already captures an unavailable disk.
                }
            }
        }
    }

    /** @return array<string, int> */
    private function queueMetrics(): array
    {
        try {
            $queuedJobs = Schema::hasTable('jobs') ? DB::table('jobs')->count() : 0;
            $failedJobs = Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : 0;
            $oldestAvailableAt = Schema::hasTable('jobs') ? DB::table('jobs')->min('available_at') : null;
        } catch (Throwable) {
            return [
                'queued_jobs' => PHP_INT_MAX,
                'failed_jobs' => PHP_INT_MAX,
                'oldest_job_age_seconds' => PHP_INT_MAX,
            ];
        }

        return [
            'queued_jobs' => $queuedJobs,
            'failed_jobs' => $failedJobs,
            'oldest_job_age_seconds' => is_numeric($oldestAvailableAt)
                ? max(0, now()->timestamp - (int) $oldestAvailableAt)
                : 0,
        ];
    }
}
