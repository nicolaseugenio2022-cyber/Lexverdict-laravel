<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AuditIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('view-audit') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $fields = ['user_id', 'full_name', 'role', 'action', 'timestamp'];

        return [
            'search' => ['nullable', 'string', 'max:200'],
            'filter' => ['nullable', Rule::in($fields)],
            'sort' => ['nullable', Rule::in(['log_id', ...$fields])],
            'order' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
