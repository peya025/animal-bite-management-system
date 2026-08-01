<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TagoloanTreatmentCard extends Model
{
    use HasFactory;

    protected $primaryKey = 'card_id';

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'bite_id',
        'card_date',
        'registry_no',
        'hospital_no',
        'referred_by',
        'exposure_category',
        'mode_of_exposure',
        'body_part_exposed',
        'animal_type',
        'animal_type_others',
        'past_bite_history',
        'past_bite_dates',
        'past_pep_completed',
        'icd10_code',
        'created_by',
    ];

    protected $casts = [
        'card_date' => 'date',
        'past_bite_history' => 'boolean',
        'past_pep_completed' => 'boolean',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function biteIncident()
    {
        return $this->belongsTo(BiteIncident::class, 'bite_id', 'bite_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    public function treatmentRecords()
    {
        return $this->hasMany(TreatmentRecord::class, 'patient_id', 'patient_id');
    }
}
