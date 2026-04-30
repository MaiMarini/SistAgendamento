<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                      => ['required', 'string', 'max:255'],
            'birth_date'                => ['nullable', 'date'],
            'is_minor'                  => ['sometimes', 'boolean'],
            'observations'              => ['nullable', 'string'],
            'cpf'                       => ['nullable', 'string', 'max:11'],
            'cep'                       => ['nullable', 'string', 'max:8'],
            'street'                    => ['nullable', 'string', 'max:255'],
            'neighborhood'              => ['nullable', 'string', 'max:255'],
            'city'                      => ['nullable', 'string', 'max:255'],
            'state'                     => ['nullable', 'string', 'max:2'],
            'address_number'            => ['nullable', 'string', 'max:20'],
            'complement'                => ['nullable', 'string', 'max:255'],
            'phone'                     => ['nullable', 'string', 'max:30'],
            'phone_is_whatsapp'         => ['sometimes', 'boolean'],
            'email'                     => ['nullable', 'email', 'max:255'],
            'guardian_name'             => ['nullable', 'string', 'max:255'],
            'guardian_birth_date'       => ['nullable', 'date'],
            'guardian_cpf'              => ['nullable', 'string', 'max:11'],
            'guardian_cep'              => ['nullable', 'string', 'max:8'],
            'guardian_street'           => ['nullable', 'string', 'max:255'],
            'guardian_neighborhood'     => ['nullable', 'string', 'max:255'],
            'guardian_city'             => ['nullable', 'string', 'max:255'],
            'guardian_state'            => ['nullable', 'string', 'max:2'],
            'guardian_number'           => ['nullable', 'string', 'max:20'],
            'guardian_complement'       => ['nullable', 'string', 'max:255'],
            'guardian_phone'            => ['nullable', 'string', 'max:30'],
            'guardian_phone_is_whatsapp' => ['sometimes', 'boolean'],
            'guardian_email'            => ['nullable', 'email', 'max:255'],
            'notifications_enabled'     => ['sometimes', 'boolean'],
            'notification_channel'      => ['nullable', 'string', 'in:email,whatsapp'],
            'is_provisional'            => ['sometimes', 'boolean'],
        ];
    }
}
