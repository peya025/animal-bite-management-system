<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Patient extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'patient_id';

    protected $fillable = [
        'clinic_id',
        'patient_number',
        'card_token',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'gender',
        'age',
        'date_of_birth',
        'address',
        'contact_number',
        'email',
        'emergency_contact_name',
        'emergency_contact_number',
        'registered_by',
        'registration_source',
        'registration_date',
    ];

    protected $hidden = [
        'card_token',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'registration_date' => 'datetime',
    ];

    protected $appends = [
        'name',
        'age',
    ];

    /**
     * Preserve the legacy API display field without storing duplicate data.
     */
    public function getNameAttribute(): string
    {
        return collect([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
            $this->suffix,
        ])->filter()->implode(' ');
    }

    /**
     * Calculate age from date of birth
     */
    public function getAgeAttribute(): int
    {
        if (!$this->date_of_birth) {
            return $this->attributes['age'] ?? 0;
        }
        return $this->date_of_birth->age;
    }

    /**
     * Search every structured name part while supporting multi-word queries.
     */
    public function scopeSearchName($query, string $search)
    {
        $terms = preg_split('/\s+/', trim($search), -1, PREG_SPLIT_NO_EMPTY);

        foreach ($terms as $term) {
            $query->where(function ($nameQuery) use ($term) {
                $nameQuery->where('first_name', 'like', "%{$term}%")
                    ->orWhere('middle_name', 'like', "%{$term}%")
                    ->orWhere('last_name', 'like', "%{$term}%")
                    ->orWhere('suffix', 'like', "%{$term}%");
            });
        }

        return $query;
    }

    /**
     * Boot method - auto-generate patient number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($patient) {
            if (! $patient->patient_number) {
                $patient->patient_number = static::generatePatientNumber($patient->clinic_id);
            }
            if (! $patient->registration_date) {
                $patient->registration_date = now();
            }
            if (! $patient->card_token) {
                $patient->card_token = (string) Str::uuid();
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

    public function accounts()
    {
        return $this->belongsToMany(
            PatientAccount::class,
            'patient_account_patient',
            'patient_id',
            'patient_account_id',
        )->using(PatientAccountPatient::class)
            ->withPivot(['relationship', 'is_primary', 'status', 'verified_by', 'verified_at'])
            ->withTimestamps();
    }

    public function biteIncidents()
    {
        return $this->hasMany(BiteIncident::class, 'patient_id', 'patient_id');
    }

    public function biteIntakes()
    {
        return $this->hasMany(BiteIncidentIntake::class, 'patient_id', 'patient_id');
    }

    public function treatmentRecords()
    {
        return $this->hasMany(TreatmentRecord::class, 'patient_id', 'patient_id');
    }

    public function vaccinationSchedules()
    {
        return $this->hasMany(VaccinationSchedule::class, 'patient_id', 'patient_id');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'patient_id', 'patient_id');
    }

    public function queues()
    {
        return $this->hasMany(Queue::class, 'patient_id', 'patient_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'patient_id', 'patient_id');
    }

    public function details()
    {
        return $this->hasOne(PatientDetails::class, 'patient_id', 'patient_id');
    }

    public function memberships()
    {
        return $this->hasMany(PatientMembership::class, 'patient_id', 'patient_id');
    }

    /**
     * Helper: Get active bite cases
     */
    public function activeBiteCases()
    {
        return $this->biteIncidents()->where('status', 'active');
    }

    /**
     * Helper: Get pending vaccinations (scheduled treatments)
     */
    public function pendingVaccinations()
    {
        return $this->treatmentRecords()
            ->whereIn('status', ['scheduled', 'missed'])
            ->orderBy('scheduled_date');
    }

    /**
     * Helper: Get latest treatment record (any dose)
     */
    public function latestTreatmentRecord()
    {
        return $this->hasOne(TreatmentRecord::class, 'patient_id', 'patient_id')
            ->whereNotNull('dose_number')
            ->latest('treatment_date');
    }

    /**
     * Helper: Get latest consultation record (Form 2)
     */
    public function latestConsultationRecord()
    {
        return $this->hasOne(TreatmentRecord::class, 'patient_id', 'patient_id')
            ->whereNull('dose_number')
            ->latest('consultation_date');
    }

    /**
     * Helper: Get upcoming appointment
     */
    public function upcomingAppointment()
    {
        return $this->hasOne(Appointment::class, 'patient_id', 'patient_id')
            ->where('appointment_date', '>=', now()->toDateString())
            ->where('status', 'scheduled')
            ->orderBy('appointment_date');
    }

    /**
     * Patient invitations relationship
     */
    public function invitations()
    {
        return $this->hasMany(PatientInvitation::class, 'patient_id', 'patient_id');
    }
}
