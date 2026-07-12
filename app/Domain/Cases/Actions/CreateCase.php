<?php

namespace App\Domain\Cases\Actions;

use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Cases\Exceptions\CaseDataInvariantException;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\CaseParty;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\Person;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\SubpoenaRevision;
use App\Models\User;
use App\Support\AuditRecorder;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class CreateCase
{
    public function __construct(
        private readonly AllocateDocketNumber $dockets,
        private readonly IssueCasePin $pins,
        private readonly AuditRecorder $audit,
    ) {}

    /**
     * @param  array{
     *     date: CarbonInterface|string,
     *     hearing_date_1?: CarbonInterface|string|null,
     *     hearing_date_2?: CarbonInterface|string|null,
     *     police_station: string,
     *     offense_ids: list<string>,
     *     parties: list<array{
     *         role: string,
     *         first_name: string,
     *         middle_name?: string|null,
     *         last_name: string,
     *         suffix?: string|null,
     *         date_of_birth?: CarbonInterface|string|null,
     *         sex: string,
     *         street: string,
     *         barangay: string,
     *         municipality: string,
     *         province: string,
     *         region: string
     *     }>
     * }  $data
     * @return array{case: LegalCase, pin: string}
     */
    public function create(array $data, User $secretary): array
    {
        return DB::transaction(function () use ($data, $secretary): array {
            $secretary = User::query()->lockForUpdate()->findOrFail($secretary->id);

            if (! $secretary->hasRole(StaffRole::Secretary) || ! $secretary->is_active) {
                throw new CaseDataInvariantException('Only an active Secretary can create a case.');
            }

            $assignment = ProsecutorSecretaryAssignment::query()
                ->where('secretary_user_id', $secretary->id)
                ->lockForUpdate()
                ->first();

            if (! $assignment) {
                throw new CaseDataInvariantException('Secretary must be assigned to a Prosecutor.');
            }

            return $this->persist($data, $secretary, $assignment->prosecutor_user_id);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{case: LegalCase, pin: string}
     */
    public function createForAdmin(array $data, User $admin): array
    {
        return DB::transaction(function () use ($data, $admin): array {
            $admin = User::query()->lockForUpdate()->findOrFail($admin->id);

            if (! $admin->hasRole(StaffRole::Superuser) || ! $admin->is_active) {
                throw new CaseDataInvariantException('Only an active Administrator can create a case for a selected Prosecutor.');
            }

            $prosecutorId = (string) ($data['assigned_prosecutor_id'] ?? '');
            $prosecutor = User::query()->lockForUpdate()->findOrFail($prosecutorId);

            if (! $prosecutor->hasRole(StaffRole::Prosecutor) || ! $prosecutor->is_active) {
                throw new CaseDataInvariantException('Case creation requires an active Prosecutor.');
            }

            return $this->persist($data, $admin, $prosecutor->id);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{case: LegalCase, pin: string}
     */
    private function persist(array $data, User $actor, string $assignedProsecutorId): array
    {
        $date = $this->date($data['date']);
        $hearingDate1 = $this->optionalDateTime($data['hearing_date_1'] ?? null);
        $hearingDate2 = $this->optionalDateTime($data['hearing_date_2'] ?? null);

        if ($hearingDate1 && $hearingDate2 && $hearingDate2->lessThanOrEqualTo($hearingDate1)) {
            throw new CaseDataInvariantException('Hearing Date 2 must be after Hearing Date 1.');
        }

        $offenseIds = array_values(array_unique($data['offense_ids']));
        $offenseCount = count($offenseIds);

        if ($offenseCount < 1) {
            throw new CaseDataInvariantException('Please select at least one crime.');
        }

        $activeOffenseCount = Offense::query()
            ->whereIn('id', $offenseIds)
            ->where('is_active', true)
            ->count();

        if ($activeOffenseCount !== $offenseCount) {
            throw new CaseDataInvariantException('Every selected crime must exist and be active.');
        }

        $this->assertParties($data['parties']);

        $allocation = $this->dockets->allocate($date, $offenseCount);
        $issuedPin = $this->pins->generate();

        $case = LegalCase::create([
            'docket_number' => $allocation->docketNumber,
            'date' => $date->toDateString(),
            'hearing_date_1' => $hearingDate1,
            'hearing_date_2' => $hearingDate2,
            'police_station' => trim($data['police_station']),
            'assigned_prosecutor_id' => $assignedProsecutorId,
            'created_by_user_id' => $actor->id,
            'subpoena_status' => SubpoenaStatus::Pending->value,
            'pin_hash' => $issuedPin['hash'],
            'pin_document_secret' => $issuedPin['pin'],
            'pin_issued_at' => now(),
            'revision_number' => 1,
        ]);

        $case->offenses()->attach($offenseIds);

        foreach ($data['parties'] as $index => $partyData) {
            $this->createParty($case, $partyData, $index + 1);
        }

        SubpoenaRevision::create([
            'case_id' => $case->id,
            'revision_number' => 1,
            'payload' => $this->revisionPayload($case, $date, $hearingDate1, $hearingDate2, $offenseIds, $data['parties']),
            'submitted_by' => $actor->id,
            'submitted_at' => now(),
        ]);

        $this->audit->record('case.created', $actor, LegalCase::class, $case->id, [
            'docket_number' => $case->docket_number,
            'assigned_prosecutor_id' => $case->assigned_prosecutor_id,
            'offense_count' => $offenseCount,
        ]);

        return ['case' => $case, 'pin' => $issuedPin['pin']];
    }

    private function date(CarbonInterface|string $value): CarbonImmutable
    {
        if ($value instanceof CarbonInterface) {
            return CarbonImmutable::instance($value);
        }

        return CarbonImmutable::parse($value)->startOfDay();
    }

    private function optionalDateTime(CarbonInterface|string|null $value): ?CarbonImmutable
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof CarbonInterface) {
            return CarbonImmutable::instance($value);
        }

        return CarbonImmutable::parse($value);
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

        foreach ($parties as $party) {
            $role = (string) $party['role'];

            if (! in_array($role, [PartyRole::Complainant->value, PartyRole::Respondent->value], true)) {
                throw new CaseDataInvariantException('Invalid party role.');
            }

            foreach (['first_name', 'last_name', 'sex', 'street', 'barangay', 'municipality', 'province', 'region'] as $field) {
                if (trim((string) ($party[$field] ?? '')) === '') {
                    throw new CaseDataInvariantException('Required party fields are missing.');
                }
            }

            $birthDate = $this->optionalDateTime($party['date_of_birth'] ?? null);

            if ($birthDate && $birthDate->greaterThan(now()->subYears(18))) {
                throw new CaseDataInvariantException($role.' must be at least 18 years old.');
            }
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

    /**
     * @param  list<string>  $offenseIds
     * @param  list<array<string, mixed>>  $parties
     * @return array<string, mixed>
     */
    private function revisionPayload(
        LegalCase $case,
        CarbonInterface $date,
        ?CarbonInterface $hearingDate1,
        ?CarbonInterface $hearingDate2,
        array $offenseIds,
        array $parties,
    ): array {
        return [
            'docket_number' => $case->docket_number,
            'date' => $date->toDateString(),
            'hearing_date_1' => $hearingDate1?->toISOString(),
            'hearing_date_2' => $hearingDate2?->toISOString(),
            'police_station' => $case->police_station,
            'assigned_prosecutor_id' => $case->assigned_prosecutor_id,
            'subpoena_status' => SubpoenaStatus::Pending->value,
            'offense_ids' => $offenseIds,
            'offenses' => $this->offenseSnapshot($offenseIds),
            'parties' => $parties,
        ];
    }

    /** @param list<string> $offenseIds
     * @return list<array{id: string, name: string, law_reference: string|null}>
     */
    private function offenseSnapshot(array $offenseIds): array
    {
        return Offense::query()
            ->whereIn('id', $offenseIds)
            ->orderBy('name')
            ->get(['id', 'name', 'law_reference'])
            ->map(fn (Offense $offense): array => [
                'id' => $offense->id,
                'name' => $offense->name,
                'law_reference' => $offense->law_reference,
            ])->all();
    }
}
