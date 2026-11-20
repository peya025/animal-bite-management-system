<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientFollowupLog extends Model
{
    protected $table = 'patient_followup_logs';

    protected $fillable = [
        'clinic_id',
        'bite_id',
        'patient_id',
        'appointment_id',
        'dose_label',
        'days_overdue',
        'contact_type',
        'status',
        'recipient_number',
        'message_body',
        'notes',
        'created_by',
        'created_by_name',
    ];

    protected $casts = [
        'days_overdue' => 'integer',
    ];

    public function episode(): BelongsTo
    {
        return $this->belongsTo(BiteIncident::class, 'bite_id', 'bite_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'appointment_id', 'appointment_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }
}
