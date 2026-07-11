<?php

namespace App\Http\Requests\Resolutions;

use App\Domain\Resolutions\Actions\ResolutionAccess;
use App\Models\Resolution;
use Illuminate\Foundation\Http\FormRequest;

class ApproveResolutionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $resolution = $this->route('resolution');

        return $resolution instanceof Resolution
            && $this->user() !== null
            && app(ResolutionAccess::class)->canReview($this->user(), $resolution);
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['revision_number' => ['required', 'integer', 'min:1']];
    }
}
