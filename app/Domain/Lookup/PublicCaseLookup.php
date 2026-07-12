<?php

namespace App\Domain\Lookup;

use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Models\LegalCase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class PublicCaseLookup
{
    private readonly string $dummyHash;

    public function __construct()
    {
        // Every lookup pays the same configured hash-generation and verification cost.
        $this->dummyHash = Hash::make(bin2hex(random_bytes(20)));
    }

    /**
     * @return array{
     *   docket_number: string, case_type: string, prosecutor: string,
     *   hearing_date_1: string|null, hearing_date_2: string|null,
     *   status: string, date_filed: string, court_location: string|null
     * }|null
     */
    public function find(string $docketNumber, string $pin): ?array
    {
        $case = LegalCase::query()
            ->with(['offenses', 'assignedProsecutor.staffProfile', 'resolution'])
            ->where('docket_number', trim($docketNumber))
            ->first();

        $verificationHash = $case === null ? $this->dummyHash : $case->pin_hash;
        $verified = Hash::check(trim($pin), $verificationHash);
        if ($case === null || ! $verified) {
            return null;
        }

        $resolution = $case->resolution;
        $approved = $resolution !== null
            && $this->value($resolution->status) === ResolutionStatus::Approved->value
            && in_array($this->value($resolution->verdict), [ResolutionVerdict::ForFiling->value, ResolutionVerdict::Dismissed->value], true);
        $forFiling = $approved && $this->value($resolution->verdict) === ResolutionVerdict::ForFiling->value;

        return [
            'docket_number' => $case->docket_number,
            'case_type' => $case->offenses->pluck('name')->implode(', '),
            'prosecutor' => $case->assignedProsecutor?->staffProfile?->displayName() ?? '',
            'hearing_date_1' => $case->hearing_date_1 === null ? null : Carbon::parse($case->hearing_date_1)->format('Y-m-d H:i:s'),
            'hearing_date_2' => $case->hearing_date_2 === null ? null : Carbon::parse($case->hearing_date_2)->format('Y-m-d H:i:s'),
            'status' => $approved ? $this->value($resolution->verdict) : ResolutionStatus::Pending->value,
            'date_filed' => $approved ? Carbon::parse($resolution->verdict_date)->toDateString() : 'Pending...',
            'court_location' => $forFiling ? $resolution->court : null,
        ];
    }

    private function value(mixed $value): string
    {
        return $value instanceof \BackedEnum ? (string) $value->value : (string) $value;
    }
}
