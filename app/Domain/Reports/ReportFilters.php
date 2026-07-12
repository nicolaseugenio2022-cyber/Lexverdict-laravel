<?php

namespace App\Domain\Reports;

final readonly class ReportFilters
{
    /**
     * @param  list<string>  $offenses
     */
    public function __construct(
        public ?string $startDate,
        public ?string $endDate,
        public ?string $verdict,
        public array $offenses,
        public ?string $station,
        public ?string $sex,
        public ?string $ageGroup,
    ) {}

    /** @param array<string, mixed> $data */
    public static function from(array $data): self
    {
        $offenses = array_values(array_filter(
            (array) ($data['offenses'] ?? []),
            fn (mixed $value): bool => is_string($value) && $value !== '',
        ));

        return new self(
            self::stringOrNull($data['start_date'] ?? null),
            self::stringOrNull($data['end_date'] ?? null),
            self::stringOrNull($data['verdict'] ?? null),
            $offenses,
            self::stringOrNull($data['station'] ?? null),
            self::stringOrNull($data['sex'] ?? null),
            self::stringOrNull($data['age_group'] ?? null),
        );
    }

    public function hasAny(): bool
    {
        return $this->startDate !== null
            || $this->endDate !== null
            || $this->verdict !== null
            || $this->offenses !== []
            || $this->station !== null
            || $this->sex !== null
            || $this->ageGroup !== null;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return array_filter([
            'start_date' => $this->startDate,
            'end_date' => $this->endDate,
            'verdict' => $this->verdict,
            'offenses' => $this->offenses,
            'station' => $this->station,
            'sex' => $this->sex,
            'age_group' => $this->ageGroup,
        ], fn (mixed $value): bool => $value !== null && $value !== []);
    }

    private static function stringOrNull(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }
}
