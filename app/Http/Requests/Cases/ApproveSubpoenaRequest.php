<?php

namespace App\Http\Requests\Cases;

use App\Domain\Cases\Actions\CaseAccess;
use App\Models\LegalCase;
use Illuminate\Foundation\Http\FormRequest;

class ApproveSubpoenaRequest extends FormRequest
{
    public function authorize(): bool
    {
        $case = $this->route('case');

        return $case instanceof LegalCase
            && $this->user() !== null
            && app(CaseAccess::class)->canReview($this->user(), $case);
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['revision_number' => ['required', 'integer', 'min:1']];
    }
}
