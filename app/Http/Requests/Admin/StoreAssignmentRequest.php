<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-assignments') ?? false;
    }

    public function rules(): array
    {
        return [
            'prosecutor_user_id' => ['required', 'uuid', 'exists:users,id'],
            'secretary_user_id' => ['required', 'uuid', 'exists:users,id'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
