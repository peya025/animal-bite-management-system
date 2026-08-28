<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicSchedule extends Model
{
    use HasFactory;

    protected $table = 'clinic_schedules';

    protected $fillable = [
        'clinic_id',
        'day_of_week',
        'is_open',
        'open_time',
        'close_time',
        'slot_interval_minutes',
        'max_patients_per_slot',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'is_open' => 'boolean',
        'slot_interval_minutes' => 'integer',
        'max_patients_per_slot' => 'integer',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
