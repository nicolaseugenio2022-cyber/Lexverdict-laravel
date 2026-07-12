<?php

namespace App\Console\Commands;

use App\Support\Operations\ReleaseConfigurationCheck;
use Illuminate\Console\Command;

class ReleaseCheck extends Command
{
    protected $signature = 'lexverdict:release-check';

    protected $description = 'Validate deployment configuration without displaying secrets';

    public function handle(ReleaseConfigurationCheck $configuration): int
    {
        foreach ($configuration->checks() as $label => $passed) {
            $this->line(($passed ? '[PASS] ' : '[FAIL] ').$label);
        }

        return $configuration->passes() ? self::SUCCESS : self::FAILURE;
    }
}
