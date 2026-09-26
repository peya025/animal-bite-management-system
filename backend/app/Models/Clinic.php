<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Clinic extends Model
{
    protected $attributes = [
        'working_days' => '[1,2,3,4,5]',
    ];

    protected $fillable = [
        'name',
        'subtitle',
        'address',
        'phone',
        'email',
        'contact_number',
        'license_number',
        'hospital_no',
        'doh_accreditation_no',
        'philhealth_accreditation_no',
        'opening_hours',
        'logo_path',
        'left_print_logo_path',
        'right_print_logo_path',
        'municipality',
        'province',
        'latitude',
        'longitude',
        'map_default_zoom',
        'is_setup_complete',
        'setup_completed_at',
        'opening_time',
        'closing_time',
        'working_days',
        'holiday_dates',
        'schedule_notes',
        'schedule_drift_policy',
        'backward_max_days',
        'urgent_access_policy',
        'urgent_referral_facility_name',
        'urgent_referral_facility_address',
        'urgent_referral_facility_contact',
        'urgent_referral_instructions',
        'health_officer_name',
        'population',
    ];

    protected $appends = [
        'logo_url',
        'left_print_logo_url',
        'right_print_logo_url',
    ];

    /**
     * Get the full URL to the clinic logo if uploaded
     */
    public function getLogoUrlAttribute(): ?string
    {
        if ($this->logo_path) {
            return asset('storage/' . $this->logo_path);
        }
        return null;
    }

    /**
     * Get the full URL to the left print header logo if uploaded
     */
    public function getLeftPrintLogoUrlAttribute(): ?string
    {
        if ($this->left_print_logo_path) {
            return url('api/storage/' . $this->left_print_logo_path);
        }
        return null;
    }

    /**
     * Get the full URL to the right print header logo if uploaded
     */
    public function getRightPrintLogoUrlAttribute(): ?string
    {
        if ($this->right_print_logo_path) {
            return url('api/storage/' . $this->right_print_logo_path);
        }
        return null;
    }

    protected $casts = [
        'is_setup_complete' => 'boolean',
        'setup_completed_at' => 'datetime',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'opening_time' => 'datetime:H:i',
        'closing_time' => 'datetime:H:i',
        'working_days' => 'array',
        'holiday_dates' => 'array',
        'backward_max_days' => 'integer',
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

    /**
     * Get all patients for this clinic
     */
    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }

    /**
     * Get all bite incidents for this clinic
     */
    public function biteIncidents(): HasMany
    {
        return $this->hasMany(BiteIncident::class);
    }

    /**
     * Get all treatment records for this clinic
     */
    public function treatmentRecords(): HasMany
    {
        return $this->hasMany(TreatmentRecord::class);
    }

    /**
     * Get all queues for this clinic
     */
    public function queues(): HasMany
    {
        return $this->hasMany(Queue::class);
    }

    /**
     * Get all vaccine inventory for this clinic
     */
    public function vaccineInventory(): HasMany
    {
        return $this->hasMany(VaccineInventory::class);
    }

    /**
     * Get clinic module configuration
     */
    public function moduleConfig()
    {
        return $this->hasOne(ClinicModuleConfig::class, 'clinic_id', 'id');
    }

    /**
     * Get weekly operating schedules
     */
    public function schedules(): HasMany
    {
        return $this->hasMany(ClinicSchedule::class, 'clinic_id', 'id');
    }

    /**
     * Get schedule exceptions (holidays, special closures/openings)
     */
    public function scheduleExceptions(): HasMany
    {
        return $this->hasMany(ClinicScheduleException::class, 'clinic_id', 'id');
    }
}
