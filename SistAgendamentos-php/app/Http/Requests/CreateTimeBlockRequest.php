<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validação de time block (company ou professional).
 *
 * Dois modos:
 *   is_recurring=false → starts_at + ends_at obrigatórios
 *   is_recurring=true  → recurring_start_time + recurring_end_time obrigatórios
 */
class CreateTimeBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'is_recurring' => ['sometimes', 'boolean'],
            'reason'       => ['nullable', 'string', 'max:255'],
        ];

        if ($this->boolean('is_recurring')) {
            $rules['recurring_start_time'] = ['required', 'date_format:H:i'];
            $rules['recurring_end_time']   = ['required', 'date_format:H:i', 'after:recurring_start_time'];
        } else {
            $rules['starts_at'] = ['required', 'date'];
            $rules['ends_at']   = ['required', 'date', 'after:starts_at'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'recurring_end_time.after' => 'recurring_end_time deve ser posterior a recurring_start_time.',
            'ends_at.after'            => 'ends_at deve ser posterior a starts_at.',
        ];
    }
}
