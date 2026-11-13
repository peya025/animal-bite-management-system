<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $table = 'notifications';

    protected $primaryKey = 'notification_id';

    protected $fillable = [
        'clinic_id',
        'user_id',
        'role',
        'patient_id',
        'patient_account_id',
        'appointment_id',
        'type',
        'category',
        'title',
        'message',
        'action_url',
        'data',
        'alert_key',
        'is_active',
        'resolved_at',
        'status',
        'send_time',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'is_active' => 'boolean',
        'resolved_at' => 'datetime',
        'send_time' => 'datetime',
        'read_at' => 'datetime',
    ];

    /**
     * Relationship: Notification belongs to Clinic
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    /**
     * Relationship: Notification belongs to User (targeted staff)
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * Relationship: Notification belongs to Patient
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    /**
     * Relationship: Notification belongs to Appointment
     */
    public function appointment()
    {
        return $this->belongsTo(Appointment::class, 'appointment_id', 'appointment_id');
    }

    public function patientAccount()
    {
        return $this->belongsTo(PatientAccount::class, 'patient_account_id');
    }

    /**
     * Relationship: Reads per user
     */
    public function reads()
    {
        return $this->hasMany(NotificationRead::class, 'notification_id', 'notification_id');
    }
}
