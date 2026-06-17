<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Clinic extends Model
{
    protected $fillable = [
        'name',
        'address',
        'phone',
        'email',
        'logo_path',
        'is_setup_complete',
        'setup_completed_at',
    ];

    protected $casts = [
        'is_setup_complete' => 'boolean',
        'setup_completed_at' => 'datetime',
    ];

    /**
     * Get all users for this clinic
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get admin users
     */
    public function admins(): HasMany
    {
        return $this->users()->where('role', 'admin');
    }

    /**
     * Get staff users (non-admin)
     */
    public function staff(): HasMany
    {
        return $this->users()->whereIn('role', ['registration', 'triage', 'treatment']);
    }
}
