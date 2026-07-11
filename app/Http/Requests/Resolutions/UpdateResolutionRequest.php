<?php

namespace App\Http\Requests\Resolutions;

use App\Domain\Resolutions\Actions\ResolutionAccess;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Models\Resolution;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateResolutionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $resolution = $this->route('resolution');

        return $resolution instanceof Resolution
            && $this->user() !== null
            && app(ResolutionAccess::class)->canRevise($this->user(), $resolution);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'revision_number' => ['required', 'integer', 'min:1'],
            'verdict' => ['required', 'string', Rule::in(ResolutionVerdict::submittableValues())],
            'court' => ['nullable', 'string', 'max:255', 'required_if:verdict,'.ResolutionVerdict::ForFiling->value],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['court' => trim((string) $this->input('court', '')) ?: null]);
    }
}
