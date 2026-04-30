<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Professional extends Model
{
    use HasUuids;

    protected $fillable = [
        'id',
        'company_id',
        'name',
        'email',
        'cpf',
        'phone',
        'photo_url',
        'color',
        'default_duration_minutes',
        'active',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'default_duration_minutes' => 'integer',
        ];
    }

    /**
     * Scopes
     */
    public function scopeNotDeleted($query)
    {
        return $query->where('status', '!=', 'deleted');
    }

    public function scopeForCompany($query, string $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    /**
     * Relationships
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id', 'id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function specialties(): BelongsToMany
    {
        return $this->belongsToMany(Specialty::class, 'professional_specialty');
    }

    public function availabilities(): HasMany
    {
        return $this->hasMany(Availability::class);
    }

    public function timeBlocks(): HasMany
    {
        return $this->hasMany(TimeBlock::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
