<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicResource extends Model
{
    use HasFactory;

    protected $table = 'clinic_resources';

    protected $fillable = [
        'clinic_id',
        'type',
        'title',
        'subtitle',
        'url',
        'thumbnail_url',
        'duration_label',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'clinic_id' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
