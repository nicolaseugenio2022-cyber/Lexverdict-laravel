<?php

namespace App\Http\Requests\Admin;

use App\Models\Offense;
use Illuminate\Foundation\Http\FormRequest;

class StoreOffenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Offense::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'law_reference' => ['nullable', 'string', 'max:255'],
        ];
    }
}
