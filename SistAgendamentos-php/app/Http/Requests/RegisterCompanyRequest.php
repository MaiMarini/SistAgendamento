<?php

namespace App\Http\Requests;

use App\Rules\Cnpj;
use Illuminate\Foundation\Http\FormRequest;

class RegisterCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // endpoint público
    }

    public function rules(): array
    {
        return [
            'name'         => ['required', 'string', 'max:255'],
            'cnpj'         => ['required', 'string', new Cnpj],
            'phone'        => ['nullable', 'string', 'max:30'],
            'email'        => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'     => ['required', 'string', 'min:6'],
            'license_code' => ['required', 'string', 'max:64'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'Este email já está cadastrado.',
            'license_code.required' => 'O código de licença é obrigatório.',
        ];
    }

    /**
     * Retorna CNPJ apenas com dígitos (sem pontuação).
     */
    public function cnpjDigits(): string
    {
        return preg_replace('/\D/', '', $this->input('cnpj'));
    }
}
