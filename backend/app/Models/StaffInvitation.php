<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class StaffInvitation extends Model
{
    protected $fillable = [
        'clinic_id',
        'invited_by',
        'email',
        'role',
        'token',
        'status',
        'expires_at',
        'accepted_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
    ];

    /**
     * Get the clinic
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    /**
     * Get the user who sent the invitation
     */
    public function inviter()
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /**
     * Generate a secure random token
     */
    public static function generateToken(): string
    {
        return Str::random(64);
    }

    /**
     * Create a new invitation
     */
    public static function createInvitation(array $data): self
    {
        return self::create([
            'clinic_id' => $data['clinic_id'],
            'invited_by' => $data['invited_by'],
            'email' => $data['email'],
            'role' => $data['role'],
            'token' => self::generateToken(),
            'status' => 'pending',
            'expires_at' => Carbon::now()->addDays(7),
        ]);
    }

    /**
     * Check if invitation is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at < now();
    }

    /**
     * Check if invitation is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if invitation is valid (pending and not expired)
     */
    public function isValid(): bool
    {
        return $this->isPending() && !$this->isExpired();
    }

    /**
     * Mark invitation as accepted
     */
    public function markAsAccepted(): void
    {
        $this->update([
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);
    }
}
