<?php

namespace App\Http\Requests\Admin;

use App\Domain\Identity\Enums\StaffRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-users') ?? false;
    }

    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:255', Rule::unique('users', 'username')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(StaffRole::values())],
            'is_active' => ['sometimes', 'boolean'],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'suffix' => ['nullable', Rule::in(['Jr.', 'Sr.', 'II', 'III', 'IV'])],
            'sex' => ['nullable', Rule::in(['Male', 'Female'])],
            'birth_date' => ['nullable', 'date'],
            'contact_number' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'license_number' => ['nullable', 'string', 'max:255'],
            'office_number' => ['nullable', 'string', 'max:255'],
        ];
    }
}
