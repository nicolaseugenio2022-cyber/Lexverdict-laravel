<?php

namespace App\Domain\Cases\Actions;

use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Cases\Exceptions\CaseDataInvariantException;
use App\Models\CaseParty;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Person;
use App\Models\SubpoenaRevision;
use App\Models\User;
use App\Support\AuditRecorder;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class ReviseCase
{
    public function __construct(private readonly AuditRecorder $audit) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function revise(LegalCase $case, array $data, User $actor): LegalCase
    {
        return DB::transaction(function () use ($case, $data, $actor): LegalCase {
            /** @var LegalCase $case */
            $case = LegalCase::query()->lockForUpdate()->findOrFail($case->id);
            $expectedRevision = (int) $data['revision_number'];

            if ($expectedRevision !== $case->revision_number) {
                throw new CaseDataInvariantException('This case has changed. Reload it before saving a revision.');
            }

            $date = $this->date($data['date']);
            $hearingDate1 = $this->optionalDateTime($data['hearing_date_1'] ?? null);
            $hearingDate2 = $this->optionalDateTime($data['hearing_date_2'] ?? null);

            if ($hearingDate1 && $hearingDate2 && $hearingDate2->lessThanOrEqualTo($hearingDate1)) {
                throw new CaseDataInvariantException('Hearing Date 2 must be after Hearing Date 1.');
            }

            $offenseIds = array_values(array_unique($data['offense_ids']));

            if (count($offenseIds) < 1) {
                throw new CaseDataInvariantException('Please select at least one crime.');
            }

            $activeOffenseCount = Offense::query()->whereIn('id', $offenseIds)->where('is_active', true)->count();

            if ($activeOffenseCount !== count($offenseIds)) {
                throw new CaseDataInvariantException('Every selected crime must exist and be active.');
            }

            $parties = $data['parties'];
            $this->assertParties($parties);

            $case->update([
                'date' => $date->toDateString(),
                'hearing_date_1' => $hearingDate1,
                'hearing_date_2' => $hearingDate2,
                'police_station' => trim((string) $data['police_station']),
                'revision_number' => $case->revision_number + 1,
            ]);

            $case->offenses()->sync($offenseIds);
            CaseParty::query()->where('case_id', $case->id)->delete();

            foreach ($parties as $index => $partyData) {
                $this->createParty($case, $partyData, $index + 1);
            }

            SubpoenaRevision::create([
                'case_id' => $case->id,
                'revision_number' => $case->revision_number,
                'payload' => [
                    'docket_number' => $case->docket_number,
                    'date' => $date->toDateString(),
                    'hearing_date_1' => $hearingDate1?->toISOString(),
                    'hearing_date_2' => $hearingDate2?->toISOString(),
                    'police_station' => $case->police_station,
                    'assigned_prosecutor_id' => $case->assigned_prosecutor_id,
                    'subpoena_status' => SubpoenaStatus::Pending->value,
                    'offense_ids' => $offenseIds,
                    'parties' => $parties,
                ],
                'submitted_by' => $actor->id,
                'submitted_at' => now(),
            ]);

            $this->audit->record('case.revised', $actor, LegalCase::class, $case->id, [
                'docket_number' => $case->docket_number,
                'revision_number' => $case->revision_number,
            ]);

            return $case;
        });
    }

    private function date(CarbonInterface|string $value): CarbonImmutable
    {
        return $value instanceof CarbonInterface ? CarbonImmutable::instance($value) : CarbonImmutable::parse($value)->startOfDay();
    }

    private function optionalDateTime(CarbonInterface|string|null $value): ?CarbonImmutable
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $value instanceof CarbonInterface ? CarbonImmutable::instance($value) : CarbonImmutable::parse($value);
    }

    /**
     * @param  list<array<string, mixed>>  $parties
     */
    private function assertParties(array $parties): void
    {
        $roles = array_count_values(array_map(fn (array $party): string => (string) $party['role'], $parties));

        if (($roles[PartyRole::Complainant->value] ?? 0) < 1 || ($roles[PartyRole::Respondent->value] ?? 0) < 1) {
            throw new CaseDataInvariantException('At least one Complainant and one Respondent are required.');
        }
    }

    /**
     * @param  array<string, mixed>  $partyData
     */
    private function createParty(LegalCase $case, array $partyData, int $position): void
    {
        $person = Person::create([
            'first_name' => trim((string) $partyData['first_name']),
            'middle_name' => $this->nullableTrim($partyData['middle_name'] ?? null),
            'last_name' => trim((string) $partyData['last_name']),
            'suffix' => $this->nullableTrim($partyData['suffix'] ?? null),
            'date_of_birth' => $this->optionalDateTime($partyData['date_of_birth'] ?? null)?->toDateString(),
            'sex' => trim((string) $partyData['sex']),
        ]);

        CaseParty::create([
            'case_id' => $case->id,
            'person_id' => $person->id,
            'role' => (string) $partyData['role'],
            'position' => $position,
            'first_name' => $person->first_name,
            'middle_name' => $person->middle_name,
            'last_name' => $person->last_name,
            'suffix' => $person->suffix,
            'date_of_birth' => $person->date_of_birth,
            'sex' => $person->sex,
            'street' => trim((string) $partyData['street']),
            'barangay' => trim((string) $partyData['barangay']),
            'municipality' => trim((string) $partyData['municipality']),
            'province' => trim((string) $partyData['province']),
            'region' => trim((string) $partyData['region']),
        ]);
    }

    private function nullableTrim(mixed $value): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }
}
