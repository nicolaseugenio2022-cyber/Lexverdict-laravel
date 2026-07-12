<?php

namespace App\Domain\Reports;

use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Models\CaseParty;
use App\Models\Resolution;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class CaseReportQuery
{
    private const AGE_GROUPS = [
        '0-17' => [0, 17],
        '18-30' => [18, 30],
        '31-45' => [31, 45],
        '46-60' => [46, 60],
        '61+' => [61, null],
    ];

    /** @return array<string, mixed> */
    public function run(ReportFilters $filters): array
    {
        $resolutions = $this->query($filters)
            ->with(['case.offenses:id,name', 'case.parties'])
            ->orderByDesc('verdict_date')
            ->get();

        $offenseCounts = [];
        $stationCounts = [];
        $sexCounts = [];
        $ageCounts = array_fill_keys(array_keys(self::AGE_GROUPS), 0);
        $verdictCounts = [
            ResolutionVerdict::ForFiling->value => 0,
            ResolutionVerdict::Dismissed->value => 0,
        ];
        $rows = [];

        foreach ($resolutions as $resolution) {
            $case = $resolution->case;
            $verdict = $this->verdictValue($resolution->getAttribute('verdict'));
            $verdictCounts[$verdict] = ($verdictCounts[$verdict] ?? 0) + 1;
            $stationCounts[$case->police_station] = ($stationCounts[$case->police_station] ?? 0) + 1;

            $offenseNames = $case->offenses->pluck('name')->sort()->values();
            foreach ($offenseNames as $offense) {
                $offenseCounts[$offense] = ($offenseCounts[$offense] ?? 0) + 1;
            }

            foreach ($case->parties as $party) {
                $sexCounts[$party->sex] = ($sexCounts[$party->sex] ?? 0) + 1;
                $bucket = $this->ageBucket($party);
                if ($bucket !== null) {
                    $ageCounts[$bucket]++;
                }
            }

            $rows[] = [
                'docket_number' => $case->docket_number,
                'date_filed' => CarbonImmutable::parse($case->getAttribute('date'))->toDateString(),
                'verdict' => $verdict,
                'case_type' => $offenseNames->implode(', '),
                'police_station' => $case->police_station,
            ];
        }

        $offenseDistribution = $this->distribution($offenseCounts);

        return [
            'total_cases' => $resolutions->count(),
            'filed' => $verdictCounts[ResolutionVerdict::ForFiling->value],
            'dismissed' => $verdictCounts[ResolutionVerdict::Dismissed->value],
            'most_common_crime' => $offenseDistribution[0]['label'] ?? null,
            'offense_distribution' => $offenseDistribution,
            'verdict_distribution' => $this->distribution($verdictCounts, false),
            'sex_distribution' => $this->distribution($sexCounts),
            'age_distribution' => $this->distribution($ageCounts, false),
            'station_distribution' => array_slice($this->distribution($stationCounts), 0, 5),
            'rows' => $rows,
        ];
    }

    /** @return Builder<Resolution> */
    private function query(ReportFilters $filters): Builder
    {
        $query = Resolution::query()->reportEligible();

        if ($filters->startDate !== null && $filters->endDate !== null) {
            $query->whereHas('case', fn (Builder $case): Builder => $case
                ->whereBetween('date', [$filters->startDate, $filters->endDate]));
        }

        if ($filters->verdict !== null) {
            $query->where('verdict', $filters->verdict);
        }

        if ($filters->offenses !== []) {
            $query->whereHas('case.offenses', fn (Builder $offense): Builder => $offense
                ->whereIn('offenses.id', $filters->offenses));
        }

        if ($filters->station !== null) {
            $query->whereHas('case', fn (Builder $case): Builder => $case
                ->where('police_station', $filters->station));
        }

        if ($filters->sex !== null || $filters->ageGroup !== null) {
            $query->whereHas('case.parties', function (Builder $party) use ($filters): void {
                if ($filters->sex !== null) {
                    $party->where('sex', $filters->sex);
                }

                if ($filters->ageGroup !== null) {
                    $this->applyAgeFilter($party, $filters->ageGroup);
                }
            });
        }

        return $query;
    }

    /** @param Builder<Model> $query */
    private function applyAgeFilter(Builder $query, string $ageGroup): void
    {
        [$minimum, $maximum] = self::AGE_GROUPS[$ageGroup];
        $today = CarbonImmutable::today(config('app.timezone'));
        $latestBirthDate = $today->subYears($minimum)->toDateString();

        $query->whereNotNull('date_of_birth')->whereDate('date_of_birth', '<=', $latestBirthDate);
        if ($maximum !== null) {
            $earliestBirthDate = $today->subYears($maximum + 1)->addDay()->toDateString();
            $query->whereDate('date_of_birth', '>=', $earliestBirthDate);
        }
    }

    private function ageBucket(CaseParty $party): ?string
    {
        if ($party->date_of_birth === null) {
            return null;
        }

        $age = CarbonImmutable::parse($party->getAttribute('date_of_birth'))->age;
        foreach (self::AGE_GROUPS as $label => [$minimum, $maximum]) {
            if ($age >= $minimum && ($maximum === null || $age <= $maximum)) {
                return $label;
            }
        }

        return null;
    }

    private function verdictValue(mixed $verdict): string
    {
        return $verdict instanceof ResolutionVerdict ? $verdict->value : (string) $verdict;
    }

    /**
     * @param  array<string, int>  $counts
     * @return list<array{label: string, count: int, percent: float}>
     */
    private function distribution(array $counts, bool $sortByCount = true): array
    {
        $total = array_sum($counts);

        $distribution = Collection::make($counts)
            ->map(fn (int $count, string $label): array => [
                'label' => $label,
                'count' => $count,
                'percent' => $total > 0 ? round(($count / $total) * 100, 1) : 0.0,
            ]);

        if ($sortByCount) {
            $distribution = $distribution->sort(fn (array $left, array $right): int => $right['count'] <=> $left['count'] ?: $left['label'] <=> $right['label']);
        }

        return $distribution->values()->all();
    }
}
