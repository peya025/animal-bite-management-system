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
        'bite_place',
        'site_washed',
        'exposure_type',
        'animal_type',
        'animal_type_others',
        'animal_status',
        'animal_captured',
        'wound_location',
        'body_part_exposed',
        'patient_description',
        'status',
        'reviewed_by',
        'reviewed_at',
        'bite_id',
    ];

    protected $casts = [
        'bite_date' => 'date:Y-m-d',
        'site_washed' => 'boolean',
        'animal_captured' => 'boolean',
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

    public function biteIncident()
    {
        return $this->belongsTo(BiteIncident::class, 'bite_id', 'bite_id');
    }
}
