<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientDeviceToken extends Model
{
    use HasFactory;

    protected $table = 'patient_device_tokens';

    protected $fillable = [
        'patient_account_id',
        'fcm_token',
        'device_id',
        'device_type',
        'device_name',
        'last_used_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * The patient account owning this device registration.
     */
    public function patientAccount(): BelongsTo
    {
        return $this->belongsTo(PatientAccount::class, 'patient_account_id');
    }

    /**
     * Scope query to only active registrations.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Return a masked representation of the registration token to protect privacy in logs and responses.
     */
    public function getMaskedTokenAttribute(): string
    {
        $token = $this->fcm_token ?? '';
        $len = strlen($token);

        if ($len <= 10) {
            return '***';
        }

        return substr($token, 0, 6) . '...' . substr($token, -4);
    }
}
