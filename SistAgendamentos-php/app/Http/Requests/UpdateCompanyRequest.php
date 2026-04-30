<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                  => ['sometimes', 'string', 'max:255'],
            'phone'                 => ['sometimes', 'nullable', 'string', 'max:30'],
            'contact_email'         => ['sometimes', 'nullable', 'email', 'max:255'],
            'cep'                   => ['sometimes', 'nullable', 'string', 'max:8'],
            'street'                => ['sometimes', 'nullable', 'string', 'max:255'],
            'address_number'        => ['sometimes', 'nullable', 'string', 'max:20'],
            'complement'            => ['sometimes', 'nullable', 'string', 'max:255'],
            'neighborhood'          => ['sometimes', 'nullable', 'string', 'max:255'],
            'city'                  => ['sometimes', 'nullable', 'string', 'max:255'],
            'state'                 => ['sometimes', 'nullable', 'string', 'max:2'],
            'active'                => ['sometimes', 'boolean'],
            'reminder_hours_before' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
