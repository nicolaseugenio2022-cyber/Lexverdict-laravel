<?php

namespace App\Http\Requests;

use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SecretaryVerificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->is_active
            && $user->hasRole(StaffRole::Secretary);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        $isResolutionTab = $this->input('tab', 'subpoenas') === 'resolutions';

        return [
            'tab' => ['nullable', Rule::in(['subpoenas', 'resolutions'])],
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in($isResolutionTab
                ? ResolutionStatus::values()
                : array_column(SubpoenaStatus::cases(), 'value'))],
            'sort' => ['nullable', Rule::in($isResolutionTab
                ? ['docket_number', 'status', 'revision', 'verdict']
                : ['docket_number', 'date', 'status', 'revision'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
