<?php

namespace App\Domain\Cases\Data;

final readonly class DocketAllocation
{
    public function __construct(
        public string $docketNumber,
        public int $firstSerial,
        public int $lastSerial,
        public string $prefix,
    ) {}
}
