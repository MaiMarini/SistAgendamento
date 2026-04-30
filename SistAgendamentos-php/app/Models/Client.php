<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasUuids;

    protected $fillable = [
        'company_id', 'name', 'birth_date', 'is_minor', 'observations',
        'cpf', 'cep', 'street', 'neighborhood', 'city', 'state',
        'address_number', 'complement', 'phone', 'phone_is_whatsapp', 'email',
        'guardian_name', 'guardian_birth_date', 'guardian_cpf',
        'guardian_cep', 'guardian_street', 'guardian_neighborhood',
        'guardian_city', 'guardian_state', 'guardian_number',
        'guardian_complement', 'guardian_phone', 'guardian_phone_is_whatsapp',
        'guardian_email',
        'notifications_enabled', 'notification_channel',
        'is_provisional', 'active',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'guardian_birth_date' => 'date',
            'is_minor' => 'boolean',
            'phone_is_whatsapp' => 'boolean',
            'guardian_phone_is_whatsapp' => 'boolean',
            'notifications_enabled' => 'boolean',
            'is_provisional' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function clientObservations(): HasMany
    {
        return $this->hasMany(ClientObservation::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ClientDocument::class);
    }

    /**
     * Email de notificação: guardian_email se menor, senão email.
     */
    public function notificationEmail(): ?string
    {
        return $this->is_minor ? $this->guardian_email : $this->email;
    }
}
