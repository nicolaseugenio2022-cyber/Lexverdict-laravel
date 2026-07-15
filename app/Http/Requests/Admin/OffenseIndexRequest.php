<?php

namespace App\Http\Requests\Admin;

use App\Models\Offense;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OffenseIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', Offense::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ];
    }
}
