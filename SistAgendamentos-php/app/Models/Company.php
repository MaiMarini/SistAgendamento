<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasUuids;

    protected $fillable = [
        'id',
        'name',
        'cnpj',
        'phone',
        'contact_email',
        'cep',
        'street',
        'address_number',
        'complement',
        'neighborhood',
        'city',
        'state',
        'reminder_hours_before',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'reminder_hours_before' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id', 'id');
    }

    public function professionals(): HasMany
    {
        return $this->hasMany(Professional::class);
    }

    public function specialties(): HasMany
    {
        return $this->hasMany(Specialty::class);
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function availabilities(): HasMany
    {
        return $this->hasMany(CompanyAvailability::class);
    }

    public function timeBlocks(): HasMany
    {
        return $this->hasMany(CompanyTimeBlock::class);
    }
}
