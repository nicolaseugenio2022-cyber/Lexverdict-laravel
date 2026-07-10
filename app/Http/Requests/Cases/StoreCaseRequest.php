<?php

namespace App\Http\Requests\Cases;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Cases\Enums\PartyRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(CaseAccess::class)->canCreate($this->user());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'assigned_prosecutor_id' => ['nullable', 'uuid', 'exists:users,id'],
            'date' => ['required', 'date'],
            'hearing_date_1' => ['nullable', 'date'],
            'hearing_date_2' => ['nullable', 'date', 'after:hearing_date_1'],
            'police_station' => ['required', 'string', 'max:255'],
            'offense_ids' => ['required', 'array', 'min:1'],
            'offense_ids.*' => ['required', 'uuid', 'exists:offenses,id'],
            'parties' => ['required', 'array', 'min:2'],
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
            'parties.*.province' => ['required', 'string', 'max:255'],
            'parties.*.region' => ['required', 'string', 'max:255'],
        ];
    }
}
