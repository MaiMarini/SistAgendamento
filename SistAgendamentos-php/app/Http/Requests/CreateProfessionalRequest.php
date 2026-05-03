<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateProfessionalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $clean = [];
        if ($this->has('cpf')) $clean['cpf'] = preg_replace('/\D/', '', $this->cpf);
        if ($this->has('phone')) $clean['phone'] = preg_replace('/\D/', '', $this->phone);
        if ($clean) $this->merge($clean);
    }

    public function rules(): array
    {
        return [
            'name'                     => ['required', 'string', 'max:255'],
            'email'                    => ['required', 'email', 'max:255'],
            'cpf'                      => ['nullable', 'string', 'max:11'],
            'phone'                    => ['nullable', 'string', 'max:30'],
            'specialty_ids'            => ['sometimes', 'array'],
            'specialty_ids.*'          => ['uuid'],
            'photo_url'                => ['nullable', 'string', 'max:1024'],
            'color'                    => ['nullable', 'string', 'max:16'],
            'default_duration_minutes' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
