<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientQueue extends Model
{
    protected $table = 'patient_queue';

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'bite_incident_id',
        'queue_number',
        'queue_date',
        'visit_type',
        'priority',
        'status',
        'checked_in_at',
        'called_at',
        'completed_at',
        'checked_in_by',
        'handled_by',
        'check_in_notes',
        'consultation_notes',
    ];

    protected $casts = [
        'queue_date' => 'date',
        'checked_in_at' => 'datetime',
        'called_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Boot method - auto-generate daily queue number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($queue) {
            if (!$queue->queue_number) {
                $queue->queue_number = static::generateQueueNumber(
                    $queue->clinic_id, 
                    $queue->queue_date
                );
            }
            if (!$queue->queue_date) {
                $queue->queue_date = now()->toDateString();
            }
        });
    }

    /**
     * Generate daily queue number: 1, 2, 3...
     * Resets every day per clinic
     */
    public static function generateQueueNumber($clinicId, $queueDate)
    {
        $lastQueue = static::where('clinic_id', $clinicId)
            ->where('queue_date', $queueDate)
            ->orderBy('queue_number', 'desc')
            ->first();

        return $lastQueue ? $lastQueue->queue_number + 1 : 1;
    }

    /**
     * Relationships
     */
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
        return $this->belongsTo(BiteIncident::class, 'bite_incident_id', 'bite_id');
    }

    public function checkedInBy()
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function handledBy()
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    /**
     * Helper: Call patient from queue
     */
    public function callPatient(User $user)
    {
        $this->update([
            'status' => 'in_consultation',
            'called_at' => now(),
            'handled_by' => $user->id,
        ]);
    }

    /**
     * Helper: Complete consultation
     */
    public function complete(string $notes = null)
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
            'consultation_notes' => $notes,
        ]);
    }

    /**
     * Scope: Today's queue
     */
    public function scopeToday($query)
    {
        return $query->where('queue_date', now()->toDateString());
    }

    /**
     * Scope: Waiting patients
     */
    public function scopeWaiting($query)
    {
        return $query->where('status', 'waiting');
    }

    /**
     * Scope: For specific clinic
     */
    public function scopeForClinic($query, $clinicId)
    {
        return $query->where('clinic_id', $clinicId);
    }
}
