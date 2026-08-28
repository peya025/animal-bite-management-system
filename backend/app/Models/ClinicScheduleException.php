<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicScheduleException extends Model
{
    use HasFactory;

    protected $table = 'clinic_schedule_exceptions';

    protected $fillable = [
        'clinic_id',
        'exception_date',
        'is_open',
        'open_time',
        'close_time',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'exception_date' => 'date:Y-m-d',
        'is_open' => 'boolean',
        'created_by' => 'integer',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
