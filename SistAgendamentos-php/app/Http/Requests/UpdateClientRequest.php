<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                      => ['sometimes', 'string', 'max:255'],
            'birth_date'                => ['sometimes', 'nullable', 'date'],
            'observations'              => ['sometimes', 'nullable', 'string'],
            'cpf'                       => ['sometimes', 'nullable', 'string', 'max:11'],
            'cep'                       => ['sometimes', 'nullable', 'string', 'max:8'],
            'street'                    => ['sometimes', 'nullable', 'string', 'max:255'],
            'neighborhood'              => ['sometimes', 'nullable', 'string', 'max:255'],
            'city'                      => ['sometimes', 'nullable', 'string', 'max:255'],
            'state'                     => ['sometimes', 'nullable', 'string', 'max:2'],
            'address_number'            => ['sometimes', 'nullable', 'string', 'max:20'],
            'complement'                => ['sometimes', 'nullable', 'string', 'max:255'],
            'phone'                     => ['sometimes', 'nullable', 'string', 'max:30'],
            'phone_is_whatsapp'         => ['sometimes', 'boolean'],
            'email'                     => ['sometimes', 'nullable', 'email', 'max:255'],
            'guardian_name'             => ['sometimes', 'nullable', 'string', 'max:255'],
            'guardian_cpf'              => ['sometimes', 'nullable', 'string', 'max:11'],
            'guardian_cep'              => ['sometimes', 'nullable', 'string', 'max:8'],
            'guardian_street'           => ['sometimes', 'nullable', 'string', 'max:255'],
            'guardian_neighborhood'     => ['sometimes', 'nullable', 'string', 'max:255'],
            'guardian_city'             => ['sometimes', 'nullable', 'string', 'max:255'],
            'guardian_state'            => ['sometimes', 'nullable', 'string', 'max:2'],
            'guardian_number'           => ['sometimes', 'nullable', 'string', 'max:20'],
            'guardian_complement'       => ['sometimes', 'nullable', 'string', 'max:255'],
            'guardian_phone'            => ['sometimes', 'nullable', 'string', 'max:30'],
            'guardian_phone_is_whatsapp' => ['sometimes', 'boolean'],
            'guardian_email'            => ['sometimes', 'nullable', 'email', 'max:255'],
            'notifications_enabled'     => ['sometimes', 'boolean'],
            'notification_channel'      => ['sometimes', 'nullable', 'string', 'in:email,whatsapp'],
            'active'                    => ['sometimes', 'boolean'],
            'is_provisional'            => ['sometimes', 'boolean'],
        ];
    }
}
