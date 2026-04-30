<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validação de CNPJ usando o algoritmo oficial de dígitos verificadores.
 * Porta direta da função _validate_cnpj do models.py Python original.
 */
class Cnpj implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $digits = preg_replace('/\D/', '', $value);

        if (strlen($digits) !== 14) {
            $fail('O CNPJ deve ter 14 dígitos.');
            return;
        }

        if (count(array_unique(str_split($digits))) === 1) {
            $fail('CNPJ inválido.');
            return;
        }

        $weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

        if ($this->calcDigit($digits, $weights1) !== (int) $digits[12]) {
            $fail('CNPJ inválido.');
            return;
        }

        if ($this->calcDigit($digits, $weights2) !== (int) $digits[13]) {
            $fail('CNPJ inválido.');
            return;
        }
    }

    private function calcDigit(string $digits, array $weights): int
    {
        $total = 0;
        foreach ($weights as $i => $w) {
            $total += (int) $digits[$i] * $w;
        }
        $r = $total % 11;
        return $r < 2 ? 0 : 11 - $r;
    }
}
