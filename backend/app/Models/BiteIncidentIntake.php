<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BiteIncidentIntake extends Model
{
    protected $primaryKey = 'intake_id';

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'patient_account_id',
        'appointment_id',
        'bite_date',
        'incident_time',
        'bite_place',
        'site_washed',
        'wash_method',
        'wash_duration_minutes',
        'exposure_type',
        'animal_type',
        'animal_type_others',
        'animal_status',
        'animal_captured',
        'wound_location',
        'body_part_exposed',
        'laterality',
        'patient_description',
        'animal_available',
        'animal_condition_reported',
        'care_received',
        'referral_facility',
        'prior_rabies_vaccination',
        'prior_vaccination_date',
        'prior_vaccination_facility',
        'status',
        'submitted_at',
        'checked_in_by',
        'checked_in_at',
        'clinically_reviewed_by',
        'clinically_reviewed_at',
        'reviewed_by',
        'reviewed_at',
        'bite_id',
    ];

    protected $casts = [
        'bite_date' => 'date:Y-m-d',
        'site_washed' => 'boolean',
        'animal_captured' => 'boolean',
        'animal_available' => 'boolean',
        'wash_duration_minutes' => 'integer',
        'prior_vaccination_date' => 'date:Y-m-d',
        'submitted_at' => 'datetime',
        'checked_in_at' => 'datetime',
        'clinically_reviewed_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function account()
    {
        return $this->belongsTo(PatientAccount::class, 'patient_account_id');
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class, 'appointment_id', 'appointment_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function checkedInBy()
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function clinicallyReviewedBy()
    {
        return $this->belongsTo(User::class, 'clinically_reviewed_by');
    }

    public function biteIncident()
    {
        return $this->belongsTo(BiteIncident::class, 'bite_id', 'bite_id');
    }
}
