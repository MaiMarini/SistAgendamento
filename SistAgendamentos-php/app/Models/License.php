<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class License extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'used',
        'used_by',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'used' => 'boolean',
            'used_at' => 'datetime',
        ];
    }

    /**
     * Busca uma licença válida (existente e não usada) pelo código.
     * Comparação case-insensitive: converte para uppercase.
     */
    public static function findValidByCode(string $code): ?self
    {
        return static::where('code', strtoupper(trim($code)))
            ->where('used', false)
            ->first();
    }

    /**
     * Marca a licença como consumida pelo usuário.
     */
    public function consume(string $userId): void
    {
        $this->update([
            'used' => true,
            'used_by' => $userId,
            'used_at' => now(),
        ]);
    }
}
