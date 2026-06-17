<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'patient_id';

    protected $fillable = [
        'clinic_id',
        'patient_number',
        'name',
        'gender',
        'age',
        'date_of_birth',
        'address',
        'contact_number',
        'emergency_contact_name',
        'emergency_contact_number',
        'registered_by',
        'registration_date',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'registration_date' => 'datetime',
    ];

    /**
     * Boot method - auto-generate patient number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($patient) {
            if (!$patient->patient_number) {
                $patient->patient_number = static::generatePatientNumber($patient->clinic_id);
            }
            if (!$patient->registration_date) {
                $patient->registration_date = now();
            }
        });
    }

    /**
     * Generate unique patient number: P-2024-0001
     */
    public static function generatePatientNumber($clinicId)
    {
        $year = date('Y');
        $prefix = "P-{$year}-";
        
        // Get last patient number for this clinic and year
        $lastPatient = static::where('clinic_id', $clinicId)
            ->where('patient_number', 'like', "{$prefix}%")
            ->orderBy('patient_id', 'desc')
            ->first();

        if ($lastPatient) {
            // Extract number and increment
            $lastNumber = (int) substr($lastPatient->patient_number, -4);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return sprintf('%s%04d', $prefix, $nextNumber);
    }

    /**
     * Relationships
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    public function registeredBy()
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function biteIncidents()
    {
        return $this->hasMany(BiteIncident::class, 'patient_id', 'patient_id');
    }

    public function vaccinationSchedules()
    {
        return $this->hasMany(VaccinationSchedule::class, 'patient_id', 'patient_id');
    }

    public function queueEntries()
    {
        return $this->hasMany(PatientQueue::class, 'patient_id', 'patient_id');
    }

    /**
     * Helper: Get active bite cases
     */
    public function activeBiteCases()
    {
        return $this->biteIncidents()->where('status', 'active');
    }

    /**
     * Helper: Get pending vaccinations
     */
    public function pendingVaccinations()
    {
        return $this->vaccinationSchedules()
            ->whereIn('status', ['scheduled', 'missed'])
            ->orderBy('scheduled_date');
    }
}
