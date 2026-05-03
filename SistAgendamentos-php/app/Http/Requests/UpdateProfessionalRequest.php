<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfessionalRequest extends FormRequest
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
            'name'                     => ['sometimes', 'string', 'max:255'],
            'email'                    => ['sometimes', 'email', 'max:255'],
            'cpf'                      => ['sometimes', 'nullable', 'string', 'max:11'],
            'phone'                    => ['sometimes', 'nullable', 'string', 'max:30'],
            'specialty_ids'            => ['sometimes', 'array'],
            'specialty_ids.*'          => ['uuid'],
            'photo_url'                => ['sometimes', 'nullable', 'string', 'max:1024'],
            'color'                    => ['sometimes', 'nullable', 'string', 'max:16'],
            'active'                   => ['sometimes', 'boolean'],
            'default_duration_minutes' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
