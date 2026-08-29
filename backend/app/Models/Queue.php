<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Queue extends Model
{
    use HasFactory;

    protected $table = 'queues';
    protected $primaryKey = 'queue_id';

    protected $fillable = [
        'clinic_id', 'patient_id', 'appointment_id', 'bite_id',
        'queue_number', 'queue_date', 'visit_type', 'queue_category', 'priority', 'status',
        'checked_in_at', 'called_at', 'completed_at', 'cancelled_at', 'serving_at',
        'second_chance_at', 'final_recall_at', 'absent_at', 'no_response_at',
        'checked_in_by', 'handled_by',
        'check_in_notes', 'consultation_notes',
        'call_count', 'recall_stage',
        'deleted_at',
    ];

    protected $casts = [
        'queue_number'     => 'integer',
        'call_count'       => 'integer',
        'queue_date'       => 'date:Y-m-d',
        'checked_in_at'    => 'datetime',
        'called_at'        => 'datetime',
        'completed_at'     => 'datetime',
        'cancelled_at'     => 'datetime',
        'serving_at'       => 'datetime',
        'second_chance_at' => 'datetime',
        'final_recall_at'  => 'datetime',
        'absent_at'        => 'datetime',
        'no_response_at'   => 'datetime',
        'deleted_at'       => 'datetime',
    ];

    /**
     * Relationship: Queue belongs to Clinic
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    /**
     * Relationship: Queue belongs to Patient
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    /**
     * Relationship: Queue belongs to Appointment
     */
    public function appointment()
    {
        return $this->belongsTo(Appointment::class, 'appointment_id', 'appointment_id');
    }

    /**
     * Relationship: Queue belongs to BiteIncident
     */
    public function biteIncident()
    {
        return $this->belongsTo(BiteIncident::class, 'bite_id', 'bite_id');
    }

    /**
     * Relationship: Queue belongs to User (checked_in_by)
     */
    public function checkedInBy()
    {
        return $this->belongsTo(User::class, 'checked_in_by', 'id');
    }

    /**
     * Relationship: Queue belongs to User (handled_by)
     */
    public function handledBy()
    {
        return $this->belongsTo(User::class, 'handled_by', 'id');
    }

    /**
     * Relationship: Queue belongs to BiteIncident
     */
    public function biteIncidentRelation()
    {
        return $this->belongsTo(BiteIncident::class, 'bite_id', 'bite_id');
    }

    public function history()
    {
        return $this->hasMany(QueueHistory::class, 'queue_id', 'queue_id')->orderBy('occurred_at', 'asc');
    }

    /**
     * Get patient name attribute
     */
    public function getPatientNameAttribute()
    {
        if (!$this->patient) return 'Unknown';
        $parts = array_filter([
            $this->patient->first_name,
            $this->patient->middle_name,
            $this->patient->last_name,
        ]);
        return implode(' ', $parts);
    }
}
