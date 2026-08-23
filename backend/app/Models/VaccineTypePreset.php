<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VaccineTypePreset extends Model
{
    use HasFactory;

    protected $table = 'vaccine_type_presets';

    protected $fillable = [
        'clinic_id',
        'vaccine_name',
        'category',
        'default_shelf_life_months',
        'default_open_vial_hours',
        'storage_temperature_notes',
        'dosing_regimen_notes',
        'administration_route',
        'is_multidose',
        'doses_per_vial',
    ];

    protected $casts = [
        'default_shelf_life_months' => 'integer',
        'default_open_vial_hours' => 'integer',
        'is_multidose' => 'boolean',
        'doses_per_vial' => 'integer',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }
}
