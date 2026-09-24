<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BiteIncidentIntake extends Model
{
    protected $primaryKey = 'intake_id';

    protected $fillable = [
        'schema_version',
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
        'past_bite_history',
        'past_bite_dates',
        'animal_available',
        'animal_condition_reported',
        'care_received',
        'referral_facility',
        'prior_rabies_vaccination',
        'prior_vaccination_date',
        'prior_vaccination_facility',
        'prior_pep_status',
        'prior_pep_date',
        'prior_pep_facility',
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
        'prior_pep_date' => 'date:Y-m-d',
        'submitted_at' => 'datetime',
        'checked_in_at' => 'datetime',
        'clinically_reviewed_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    protected $appends = [
        'date_of_exposure',
        'time_of_exposure',
        'place_of_exposure',
        'reported_mode_of_exposure',
        'body_part_group',
        'body_part_detail',
        'animal_species',
        'animal_species_other',
        'animal_ownership',
        'incident_narrative',
        'referral_source',
    ];

    public function getDateOfExposureAttribute(): ?string
    {
        return $this->bite_date?->format('Y-m-d');
    }

    public function getTimeOfExposureAttribute(): ?string
    {
        return $this->incident_time;
    }

    public function getPlaceOfExposureAttribute(): ?string
    {
        return $this->bite_place;
    }

    public function getReportedModeOfExposureAttribute(): ?string
    {
        return $this->exposure_type;
    }

    public function getBodyPartGroupAttribute(): ?string
    {
        return $this->body_part_exposed;
    }

    public function getBodyPartDetailAttribute(): ?string
    {
        return $this->wound_location;
    }

    public function getAnimalSpeciesAttribute(): ?string
    {
        return $this->animal_type;
    }

    public function getAnimalSpeciesOtherAttribute(): ?string
    {
        return $this->animal_type_others;
    }

    public function getAnimalOwnershipAttribute(): ?string
    {
        return $this->animal_status;
    }

    public function getIncidentNarrativeAttribute(): ?string
    {
        return $this->patient_description;
    }

    public function getReferralSourceAttribute(): ?string
    {
        return $this->referral_facility;
    }

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
