<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'professional_id'  => ['required', 'uuid'],
            'service_id'       => ['nullable', 'uuid'],
            'client_id'        => ['nullable', 'uuid'],
            'client_name'      => ['required', 'string', 'max:255'],
            'client_email'     => ['nullable', 'email', 'max:255'],
            'client_phone'     => ['nullable', 'string', 'max:30'],
            'client_cpf'       => ['nullable', 'string', 'max:11'],
            'starts_at'        => ['required', 'date'],
            'duration_minutes' => ['sometimes', 'integer', 'min:1'],
            'notes'            => ['nullable', 'string'],
        ];
    }
}
