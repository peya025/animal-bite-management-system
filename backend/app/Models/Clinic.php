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
        'contact_number',
        'license_number',
        'doh_accreditation_no',
        'philhealth_accreditation_no',
        'opening_hours',
        'logo_path',
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
    ];

    protected $casts = [
        'is_setup_complete' => 'boolean',
        'setup_completed_at' => 'datetime',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'opening_time' => 'datetime:H:i',
        'closing_time' => 'datetime:H:i',
        'working_days' => 'array',
        'holiday_dates' => 'array',
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
}
