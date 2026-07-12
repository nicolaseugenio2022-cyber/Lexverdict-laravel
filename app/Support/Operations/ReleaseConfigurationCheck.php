<?php

namespace App\Support\Operations;

class ReleaseConfigurationCheck
{
    /** @return array<string, bool> */
    public function checks(): array
    {
        $environment = (string) config('app.env');
        $documentDisk = (string) config('operations.document_disk');

        return [
            'release environment is staging or production' => in_array($environment, ['staging', 'production'], true),
            'debug mode is disabled' => config('app.debug') === false,
            'application URL uses HTTPS' => str_starts_with((string) config('app.url'), 'https://'),
            'application encryption key is configured' => trim((string) config('app.key')) !== '',
            'office timezone is Asia/Manila' => config('app.timezone') === 'Asia/Manila',
            'PostgreSQL is the active database' => config('database.default') === 'pgsql',
            'database SSL mode is required' => in_array(config('database.connections.pgsql.sslmode'), ['require', 'verify-ca', 'verify-full'], true),
            'queue uses an asynchronous durable connection' => in_array(config('queue.default'), ['database', 'redis', 'sqs'], true),
            'cache is persistent' => ! in_array(config('cache.default'), ['array', 'null'], true),
            'session cookies require HTTPS' => config('session.secure') === true,
            'session payloads are encrypted' => config('session.encrypt') === true,
            'session cookies are HTTP only' => config('session.http_only') === true,
            'session SameSite policy is set' => in_array(config('session.same_site'), ['lax', 'strict'], true),
            'private document disk exists' => $documentDisk !== '' && config("filesystems.disks.{$documentDisk}") !== null,
            'private document disk is not public' => config("filesystems.disks.{$documentDisk}.visibility") !== 'public',
            'monitoring thresholds are positive' => (int) config('operations.queue_backlog_threshold') > 0
                && (int) config('operations.queue_age_threshold_seconds') > 0,
        ];
    }

    public function passes(): bool
    {
        return ! in_array(false, $this->checks(), true);
    }
}
