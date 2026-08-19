<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BarangayCoordinate extends Model
{
    use HasFactory;

    protected $fillable = [
        'barangay',
        'municipality',
        'province',
        'latitude',
        'longitude',
        'source',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    /**
     * Find coordinates by location
     */
    public static function findByLocation(string $barangay, string $municipality, string $province = 'Misamis Oriental')
    {
        return self::where('barangay', $barangay)
            ->where('municipality', $municipality)
            ->where('province', $province)
            ->first();
    }

    /**
     * Get or create coordinates for a location
     */
    public static function getOrGeocodeLocation(string $barangay, string $municipality, string $province = 'Misamis Oriental')
    {
        // Try to find existing coordinates
        $coords = self::findByLocation($barangay, $municipality, $province);
        
        if ($coords) {
            return [
                'latitude' => (float) $coords->latitude,
                'longitude' => (float) $coords->longitude,
                'source' => $coords->source,
                'cached' => true
            ];
        }

        // If not found, try to geocode and save
        return null; // Will be handled by service
    }
}
