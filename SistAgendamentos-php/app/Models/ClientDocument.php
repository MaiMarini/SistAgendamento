<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientDocument extends Model
{
    use HasUuids;

    protected $fillable = [
        'client_id',
        'company_id',
        'observation_id',
        'appointment_id',
        'file_name',
        'file_type',
        'storage_path',
        'file_size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'file_size_bytes' => 'integer',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function observation(): BelongsTo
    {
        return $this->belongsTo(ClientObservation::class, 'observation_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'appointment_id');
    }
}
