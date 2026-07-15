<?php

namespace App\Http\Requests\Cases;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Cases\Enums\PartyRole;
use App\Http\Requests\Cases\Concerns\CanonicalizesCaseEntry;
use App\Models\LegalCase;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCaseRequest extends FormRequest
{
    use CanonicalizesCaseEntry;

    /** @var array<string, array{region: string, province: string, municipality: string, barangay: string}>|null */
    private ?array $originalPartyAddresses = null;

    public function authorize(): bool
    {
        /** @var LegalCase $case */
        $case = $this->route('case');

        return app(CaseAccess::class)->canRevise($this->user(), $case);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var LegalCase $case */
        $case = $this->route('case');
        $existingOffenseIds = $case->offenses()->pluck('offenses.id')->all();

        return [
            'revision_number' => ['required', 'integer', 'min:1'],
            'date' => ['required', 'date'],
            'hearing_date_1' => ['nullable', 'date'],
            'hearing_date_2' => ['nullable', 'date', 'after:hearing_date_1'],
            'police_station' => ['required', 'string', 'max:255'],
            'offense_ids' => ['required', 'array', 'min:1'],
            'offense_ids.*' => [
                'bail',
                'required',
                'uuid',
                'distinct:ignore_case',
                Rule::exists('offenses', 'id')->where(function (Builder $query) use ($existingOffenseIds): void {
                    $query->where(function (Builder $allowed) use ($existingOffenseIds): void {
                        $allowed->where('is_active', true);

                        if ($existingOffenseIds !== []) {
                            $allowed->orWhereIn('id', $existingOffenseIds);
                        }
                    });
                }),
            ],
            'parties' => ['required', 'array', 'min:2'],
            'parties.*.source_party_id' => ['nullable', 'uuid', 'distinct:ignore_case'],
            'parties.*.role' => ['required', Rule::in([PartyRole::Complainant->value, PartyRole::Respondent->value])],
            'parties.*.first_name' => ['required', 'string', 'max:255'],
            'parties.*.middle_name' => ['nullable', 'string', 'max:255'],
            'parties.*.last_name' => ['required', 'string', 'max:255'],
            'parties.*.suffix' => ['nullable', Rule::in(['Jr.', 'Sr.', 'II', 'III', 'IV'])],
            'parties.*.date_of_birth' => ['nullable', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString()],
            'parties.*.sex' => ['required', Rule::in(['Male', 'Female'])],
            'parties.*.street' => ['required', 'string', 'max:255'],
            'parties.*.barangay' => ['required', 'string', 'max:255'],
            'parties.*.municipality' => ['required', 'string', 'max:255'],
            'parties.*.province' => ['nullable', 'string', 'max:255'],
            'parties.*.region' => ['required', 'string', 'max:255'],
            ...$this->canonicalAddressRules(),
        ];
    }

    /** @param array<string, mixed> $party */
    protected function acceptsUnchangedLegacyAddress(array $party): bool
    {
        $sourcePartyId = $party['source_party_id'] ?? null;

        if (! is_string($sourcePartyId)) {
            return false;
        }

        if ($this->originalPartyAddresses === null) {
            /** @var LegalCase $case */
            $case = $this->route('case');
            $this->originalPartyAddresses = $case->parties()
                ->get(['id', 'region', 'province', 'municipality', 'barangay'])
                ->mapWithKeys(fn ($original): array => [$original->id => [
                    'region' => $original->region,
                    'province' => $original->province,
                    'municipality' => $original->municipality,
                    'barangay' => $original->barangay,
                ]])
                ->all();
        }

        $original = $this->originalPartyAddresses[$sourcePartyId] ?? null;

        return $original !== null
            && $original['region'] === ($party['region'] ?? null)
            && $original['province'] === ($party['province'] ?? null)
            && $original['municipality'] === ($party['municipality'] ?? null)
            && $original['barangay'] === ($party['barangay'] ?? null);
    }
}
