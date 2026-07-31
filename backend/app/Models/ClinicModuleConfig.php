<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClinicModuleConfig extends Model
{
    protected $fillable = [
        'clinic_id',
        'triage_module_enabled',
        'field_rules',
    ];

    protected $casts = [
        'triage_module_enabled' => 'boolean',
        'field_rules' => 'array',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }
}
