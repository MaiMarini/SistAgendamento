<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyAvailability extends Model
{
    use HasUuids;

    protected $fillable = [
        'company_id',
        'day_of_week',
        'start_time',
        'end_time',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
