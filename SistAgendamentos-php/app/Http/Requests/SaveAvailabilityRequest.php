<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validação para bulk-replace de availability slots.
 * Usado tanto por company availability quanto professional availability.
 */
class SaveAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'slots'              => ['required', 'array'],
            'slots.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'slots.*.start_time'  => ['required', 'date_format:H:i'],
            'slots.*.end_time'    => ['required', 'date_format:H:i', 'after:slots.*.start_time'],
        ];
    }

    public function messages(): array
    {
        return [
            'slots.*.day_of_week.between' => 'day_of_week deve ser entre 0 (segunda) e 6 (domingo).',
            'slots.*.end_time.after'      => 'end_time deve ser posterior a start_time.',
        ];
    }
}
