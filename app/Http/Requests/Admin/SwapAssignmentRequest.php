<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class SwapAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-assignments') ?? false;
    }

    public function rules(): array
    {
        return [
            'first_prosecutor_user_id' => ['required', 'uuid', 'exists:users,id'],
            'second_prosecutor_user_id' => ['required', 'uuid', 'exists:users,id', 'different:first_prosecutor_user_id'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
