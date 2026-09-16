<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Station extends Model
{
    protected $fillable = [
        'clinic_id',
        'name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Clinic owning this workstation
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    /**
     * Queues currently or historically served at this station
     */
    public function queues()
    {
        return $this->hasMany(Queue::class, 'station_id');
    }
}
