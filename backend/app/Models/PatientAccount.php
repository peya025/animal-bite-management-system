<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class PatientAccount extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'email_verified_at',
        'is_active',
        'last_login_at',
        'google_id',
        'notification_preferences',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'notification_preferences' => 'array',
        ];
    }

    /**
     * Get resolved notification preferences with default fallbacks.
     *
     * @return array<string, bool>
     */
    public function notificationPreferences(): array
    {
        $default = [
            'push_enabled'        => true,
            'appointment_updates' => true,
            'reminders'           => true,
            'digital_card'        => true,
            'announcements'       => true,
            'community_advisories' => false,
        ];

        $raw = $this->getAttribute('notification_preferences');
        if (empty($raw)) {
            return $default;
        }

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? array_merge($default, $decoded) : $default;
        }

        return array_merge($default, (array) $raw);
    }

    /**
     * Determine if this account permits push notifications for a given category.
     */
    public function allowsNotificationCategory(string $category): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $prefs = $this->notificationPreferences();

        if (!($prefs['push_enabled'] ?? true)) {
            return false;
        }

        return match ($category) {
            'appointment', 'appointment_rescheduled', 'appointment_cancelled', 'booking', 'booking_confirmation', 'booking_cancelled'
                => (bool) ($prefs['appointment_updates'] ?? true),
            'appointment_reminder', 'vaccination_due', 'dose_reminder', 'vaccination_schedule', 'pep_reminder', 'pep_schedule', 'vaccination_reminder', 'upcoming_appointment_reminder', 'missed_appointment_recall', 'missed_triage_recall', 'missed_treatment_recall'
                => (bool) ($prefs['reminders'] ?? true),
            'digital_card'
                => (bool) ($prefs['digital_card'] ?? true),
            'announcement'
                => (bool) ($prefs['announcements'] ?? true),
            'community_advisory'
                => (bool) ($prefs['community_advisories'] ?? false),
            default => true,
        };
    }

    /**
     * Update notification preferences safely merging with existing values.
     */
    public function updateNotificationPreferences(array $preferences): self
    {
        $current = $this->notificationPreferences();
        $allowedKeys = array_keys($current);
        $filtered = array_intersect_key($preferences, array_flip($allowedKeys));
        $merged = array_merge($current, $filtered);

        $this->update(['notification_preferences' => $merged]);

        return $this;
    }

    public function patients(): BelongsToMany
    {
        return $this->belongsToMany(
            Patient::class,
            'patient_account_patient',
            'patient_account_id',
            'patient_id',
        )->using(PatientAccountPatient::class)
            ->withPivot(['relationship', 'is_primary', 'status', 'verified_by', 'verified_at'])
            ->withTimestamps();
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'booked_by_account_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'patient_account_id');
    }

    public function biteIntakes(): HasMany
    {
        return $this->hasMany(BiteIncidentIntake::class, 'patient_account_id');
    }

    public function deviceTokens(): HasMany
    {
        return $this->hasMany(PatientDeviceToken::class, 'patient_account_id');
    }
}
