<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'clinic_id',
        'name',
        'email',
        'password',
        'role',
        'assigned_module',
        'is_active',
        'phone',
        'signature_path',
        'professional_license_no',
        'last_login_at',
        'google_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * Get the clinic that owns the user
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    /**
     * Get the roles assigned to this user
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles', 'user_id', 'role_id')
            ->withPivot('assigned_by', 'assigned_at');
    }

    /**
     * Check if user holds a specific role by slug
     */
    public function hasRole(string $roleSlug): bool
    {
        return $this->roles->contains('slug', $roleSlug);
    }

    /**
     * Check if user has nursing duties (intake, follow-up, or treatment)
     */
    public function isNursing(): bool
    {
        return $this->hasRole('intake_nurse') || $this->hasRole('follow_up_nurse') || $this->role === 'treatment';
    }

    /**
     * Check if user is a solo nurse handling both intake and follow-up
     */
    public function isSoloNurse(): bool
    {
        return $this->hasRole('intake_nurse') && $this->hasRole('follow_up_nurse');
    }

    /**
     * Check if user is developer
     */
    public function isDeveloper(): bool
    {
        return $this->role === 'developer';
    }

    /**
     * Check if user is admin
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin' || $this->role === 'developer';
    }

    /**
     * Check if user is registration staff
     */
    public function isRegistration(): bool
    {
        return $this->role === 'registration';
    }

    /**
     * Check if user is triage staff
     */
    public function isTriage(): bool
    {
        return $this->role === 'triage';
    }

    /**
     * Check if user is treatment staff
     */
    public function isTreatment(): bool
    {
        return $this->role === 'treatment';
    }

    /**
     * Update last login timestamp
     */
    public function tokens()
    {
        return $this->morphMany(\Laravel\Sanctum\PersonalAccessToken::class, 'tokenable');
    }

    /**
     * Update last login timestamp
     */
    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }
}
