<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TreatmentPlan extends Model
{
    protected $primaryKey = 'treatment_plan_id';

    protected $fillable = [
        'clinic_id',
        'bite_id',
        'patient_id',
        'plan_type',
        'status',
        'ordered_dose_days',
        'doctor_decision_notes',
        'decided_by',
        'decided_at',
        'continued_from_bite_id',
    ];

    protected $casts = [
        'ordered_dose_days' => 'array',
        'decided_at' => 'datetime',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    public function biteIncident()
    {
        return $this->belongsTo(BiteIncident::class, 'bite_id', 'bite_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function decidedBy()
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function continuedFromIncident()
    {
        return $this->belongsTo(BiteIncident::class, 'continued_from_bite_id', 'bite_id');
    }
}
