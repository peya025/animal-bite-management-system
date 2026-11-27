<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SurveillanceSignal extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['metrics' => 'array', 'version' => 'integer', 'below_threshold_days' => 'integer'];
}
