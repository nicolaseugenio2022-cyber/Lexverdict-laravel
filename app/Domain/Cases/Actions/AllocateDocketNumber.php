<?php

namespace App\Domain\Cases\Actions;

use App\Domain\Cases\Data\DocketAllocation;
use App\Domain\Cases\Exceptions\CaseDataInvariantException;
use App\Models\DocketCounter;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AllocateDocketNumber
{
    private const REGION = 'III';

    private const OFFICE = '09';

    private const TYPE_CODE = 'INV';

    public function allocate(CarbonInterface $date, int $offenseCount): DocketAllocation
    {
        if ($offenseCount < 1) {
            throw new CaseDataInvariantException('Please select at least one crime.');
        }

        return DB::transaction(function () use ($date, $offenseCount): DocketAllocation {
            $scope = [
                'region' => self::REGION,
                'office' => self::OFFICE,
                'type_code' => self::TYPE_CODE,
                'year' => $date->year,
                'month' => $date->month,
            ];

            DB::table('docket_counters')->insertOrIgnore([
                'id' => (string) Str::uuid(),
                ...$scope,
                'last_serial' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            /** @var DocketCounter $counter */
            $counter = DocketCounter::query()
                ->where($scope)
                ->lockForUpdate()
                ->firstOrFail();

            $firstSerial = $counter->last_serial + 1;
            $lastSerial = $firstSerial + $offenseCount - 1;

            $counter->update(['last_serial' => $lastSerial]);

            $prefix = sprintf(
                '%s-%s-%s-%s%s',
                self::REGION,
                self::OFFICE,
                self::TYPE_CODE,
                substr((string) $date->year, -2),
                chr(65 + $date->month - 1),
            );

            $serialPart = str_pad((string) $firstSerial, 4, '0', STR_PAD_LEFT);

            if ($offenseCount > 1) {
                $serialPart .= '-'.str_pad((string) $lastSerial, 4, '0', STR_PAD_LEFT);
            }

            return new DocketAllocation(
                docketNumber: $prefix.'-'.$serialPart,
                firstSerial: $firstSerial,
                lastSerial: $lastSerial,
                prefix: $prefix,
            );
        });
    }
}
