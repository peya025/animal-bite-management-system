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
        'video_path',
        'thumbnail_url',
        'thumbnail_path',
        'duration_label',
        'sort_order',
        'is_active',
    ];

    protected static function booted(): void
    {
        static::deleting(function (ClinicResource $resource): void {
            if ($resource->video_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($resource->video_path);
            }
            if ($resource->thumbnail_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($resource->thumbnail_path);
            }
        });
    }

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
