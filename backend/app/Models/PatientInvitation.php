<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientInvitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'invited_by',
        'phone',
        'token',
        'status',
        'expires_at',
        'accepted_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinic_id');
    }

    public function isExpired(): bool
    {
        return $this->status === 'expired' || ($this->expires_at && $this->expires_at->isPast());
    }

    public function isPending(): bool
    {
        return $this->status === 'pending' && !$this->isExpired();
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending')->where('expires_at', '>', now());
    }
}
