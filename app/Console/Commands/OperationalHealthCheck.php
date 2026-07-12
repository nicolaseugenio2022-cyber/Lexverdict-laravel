<?php

namespace App\Console\Commands;

use App\Support\Operations\OperationalReadiness;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class OperationalHealthCheck extends Command
{
    protected $signature = 'lexverdict:health-check';

    protected $description = 'Check runtime dependencies and queue health';

    public function handle(OperationalReadiness $readiness): int
    {
        $result = $readiness->inspect();
        $healthy = $result['ready'] && $readiness->queueWithinThresholds($result['metrics']);
        $payload = ['healthy' => $healthy, ...$result];

        $this->line((string) json_encode($payload, JSON_THROW_ON_ERROR));
        if (! $healthy) {
            Log::critical('LexVerdict operational health check failed.', $payload);
        }

        return $healthy ? self::SUCCESS : self::FAILURE;
    }
}
