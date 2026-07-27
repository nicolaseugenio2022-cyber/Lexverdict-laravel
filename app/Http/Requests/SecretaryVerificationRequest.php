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
        return [
            'sub_search' => ['nullable', 'string', 'max:255'],
            'sub_status' => ['nullable', Rule::in(array_column(SubpoenaStatus::cases(), 'value'))],
            'sub_sort' => ['nullable', Rule::in(['docket_number', 'date', 'status', 'revision'])],
            'sub_direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'sub_page' => ['nullable', 'integer', 'min:1'],
            'res_search' => ['nullable', 'string', 'max:255'],
            'res_status' => ['nullable', Rule::in(ResolutionStatus::values())],
            'res_sort' => ['nullable', Rule::in(['docket_number', 'status', 'revision', 'verdict'])],
            'res_direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'res_page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
