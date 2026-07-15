<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOffenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-offenses') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'law_reference' => ['nullable', 'string', 'max:255'],
        ];
    }
}
