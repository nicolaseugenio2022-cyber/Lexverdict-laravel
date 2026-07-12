<?php

namespace App\Http\Requests\Reports;

use App\Domain\Resolutions\Enums\ResolutionVerdict;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('view-reports') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
            'verdict' => ['nullable', Rule::in(ResolutionVerdict::submittableValues())],
            'offenses' => ['nullable', 'array'],
            'offenses.*' => ['uuid', 'distinct', 'exists:offenses,id'],
            'station' => ['nullable', 'string', 'max:255'],
            'sex' => ['nullable', Rule::in(['Male', 'Female'])],
            'age_group' => ['nullable', Rule::in(['0-17', '18-30', '31-45', '46-60', '61+'])],
        ];
    }
}
