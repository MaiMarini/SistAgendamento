<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeBlock extends Model
{
    use HasUuids;

    protected $fillable = [
        'professional_id',
        'is_recurring',
        'starts_at',
        'ends_at',
        'recurring_start_time',
        'recurring_end_time',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'is_recurring' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function professional(): BelongsTo
    {
        return $this->belongsTo(Professional::class);
    }
}
