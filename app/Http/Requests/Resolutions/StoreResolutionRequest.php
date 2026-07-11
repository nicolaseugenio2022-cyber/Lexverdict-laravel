<?php

namespace App\Http\Requests\Resolutions;

use App\Domain\Resolutions\Actions\ResolutionAccess;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Models\LegalCase;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreResolutionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $case = $this->route('case');

        return $case instanceof LegalCase
            && $this->user() !== null
            && app(ResolutionAccess::class)->canSubmit($this->user(), $case);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'verdict' => ['required', 'string', Rule::in(ResolutionVerdict::submittableValues())],
            'court' => ['nullable', 'string', 'max:255', 'required_if:verdict,'.ResolutionVerdict::ForFiling->value],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['court' => trim((string) $this->input('court', '')) ?: null]);
    }
}
