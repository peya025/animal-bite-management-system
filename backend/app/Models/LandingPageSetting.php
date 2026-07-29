<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LandingPageSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'app_short_name',
        'app_full_name',
        'abtc_brand_title',
        'abtc_description',
        'developed_for_text',
        'quick_links',
        'support_links',
        'system_info_links',
        'operating_schedule',
        'operating_hours',
        'registration_window',
        'requirement_notice',
    ];

    protected $casts = [
        'quick_links' => 'array',
        'support_links' => 'array',
        'system_info_links' => 'array',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
