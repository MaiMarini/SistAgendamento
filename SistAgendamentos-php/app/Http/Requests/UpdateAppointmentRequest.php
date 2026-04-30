<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status'           => ['sometimes', 'string', 'in:scheduled,confirmed,cancelled,completed,no_show'],
            'notes'            => ['sometimes', 'nullable', 'string'],
            'starts_at'        => ['sometimes', 'date'],
            'duration_minutes' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
