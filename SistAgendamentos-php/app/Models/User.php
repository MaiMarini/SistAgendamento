<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $fillable = [
        'email',
        'password',
        'user_type',
        'company_id',
        'invite_token',
        'invite_token_expires_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'invite_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'invite_token_expires_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isCompany(): bool
    {
        return $this->user_type === 'company';
    }

    public function isProfessional(): bool
    {
        return $this->user_type === 'professional';
    }

    public function company(): HasOne
    {
        return $this->hasOne(Company::class, 'id', 'id');
    }

    public function professional(): HasOne
    {
        return $this->hasOne(Professional::class, 'id', 'id');
    }

    /**
     * Retorna o perfil (Company ou Professional) baseado no user_type.
     */
    public function profile(): HasOne
    {
        return $this->isCompany() ? $this->company() : $this->professional();
    }

    /**
     * Retorna o company_id efetivo:
     * - Company → o próprio user id
     * - Professional → o campo company_id
     */
    public function effectiveCompanyId(): string
    {
        return $this->isCompany() ? $this->id : $this->company_id;
    }
}
