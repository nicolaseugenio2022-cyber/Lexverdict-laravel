<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PublicLookupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'docket' => ['required', 'string', 'max:50'],
            'pin' => ['required', 'string', 'max:10'],
        ];
    }
}
