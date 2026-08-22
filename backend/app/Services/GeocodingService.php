<?php

namespace App\Services;

use App\Models\BarangayCoordinate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeocodingService
{
    /**
     * Get coordinates for a Philippine address
     * Uses hybrid approach: lookup table first, then Nominatim
     */
    public function getCoordinates(string $barangay, string $municipality, ?string $province = null): array
    {
        $province = $this->normalizeProvince($province);

        // Step 1: Check lookup table first (fast)
        $cached = BarangayCoordinate::findByLocation($barangay, $municipality, $province);
        
        if ($cached) {
            return [
                'latitude' => (float) $cached->latitude,
                'longitude' => (float) $cached->longitude,
                'source' => 'cached',
                'cached' => true
            ];
        }

        // Step 2: Try Nominatim geocoding (slow but comprehensive)
        $coords = $this->geocodeWithNominatim($barangay, $municipality, $province);
        
        if ($coords) {
            // Save for next time
            try {
                BarangayCoordinate::create([
                    'barangay' => $barangay,
                    'municipality' => $municipality,
                    'province' => $province,
                    'latitude' => $coords['latitude'],
                    'longitude' => $coords['longitude'],
                    'source' => 'nominatim'
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to cache coordinates', [
                    'barangay' => $barangay,
                    'municipality' => $municipality,
                    'error' => $e->getMessage()
                ]);
            }
            
            return array_merge($coords, ['cached' => false]);
        }

        // Step 3: Fallback to municipality center
        return $this->getMunicipalityCenter($municipality, $province);
    }

    /**
     * Geocode using Nominatim (OpenStreetMap)
     * Free, no API key needed
     */
    private function geocodeWithNominatim(string $barangay, string $municipality, string $province): ?array
    {
        try {
            // Build search query
            $query = "{$barangay}, {$municipality}, {$province}, Philippines";
            
            // Call Nominatim API
            $response = Http::timeout(5)
                ->withHeaders([
                    'User-Agent' => 'AnimalBiteManagementSystem/1.0' // Required by Nominatim
                ])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'q' => $query,
                    'format' => 'json',
                    'limit' => 1,
                    'countrycodes' => 'ph'
                ]);

            if ($response->successful() && count($response->json()) > 0) {
                $data = $response->json()[0];
                
                return [
                    'latitude' => (float) $data['lat'],
                    'longitude' => (float) $data['lon'],
                    'source' => 'nominatim'
                ];
            }

            Log::info('Nominatim geocoding failed', [
                'query' => $query,
                'response' => $response->json()
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('Nominatim geocoding error', [
                'barangay' => $barangay,
                'municipality' => $municipality,
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }

    /**
     * Get municipality center coordinates as fallback
     */
    private function getMunicipalityCenter(string $municipality, string $province): array
    {
        // Known municipality/city centers across Philippines
        $municipalityCenters = [
            // Misamis Oriental
            'Tagoloan' => ['lat' => 8.5408, 'lng' => 124.7461],
            'Cagayan de Oro' => ['lat' => 8.4822, 'lng' => 124.6472],
            'Opol' => ['lat' => 8.5167, 'lng' => 124.5667],
            'Villanueva' => ['lat' => 8.5667, 'lng' => 124.7333],
            'Balingasag' => ['lat' => 8.7500, 'lng' => 124.7833],
            'Alubijid' => ['lat' => 8.5667, 'lng' => 124.4667],
            'Laguindingan' => ['lat' => 8.5667, 'lng' => 124.4500],
            'Gitagum' => ['lat' => 8.6167, 'lng' => 124.4000],
            'Jasaan' => ['lat' => 8.6500, 'lng' => 124.7500],
            'Manticao' => ['lat' => 8.4000, 'lng' => 124.2833],
            'Naawan' => ['lat' => 8.4333, 'lng' => 124.3000],
            'Initao' => ['lat' => 8.5000, 'lng' => 124.3167],
            'Libertad' => ['lat' => 8.9333, 'lng' => 124.9500],
            'Medina' => ['lat' => 8.9000, 'lng' => 124.9333],
            'Salay' => ['lat' => 8.9833, 'lng' => 124.8167],
            
            // Metro Manila (Luzon)
            'Manila' => ['lat' => 14.5995, 'lng' => 120.9842],
            'Quezon City' => ['lat' => 14.6760, 'lng' => 121.0437],
            'Makati' => ['lat' => 14.5547, 'lng' => 121.0244],
            'Pasig' => ['lat' => 14.5764, 'lng' => 121.0851],
            'Taguig' => ['lat' => 14.5176, 'lng' => 121.0509],
            'Mandaluyong' => ['lat' => 14.5794, 'lng' => 121.0359],
            'Pasay' => ['lat' => 14.5378, 'lng' => 120.9896],
            'Caloocan' => ['lat' => 14.6488, 'lng' => 120.9830],
            'Marikina' => ['lat' => 14.6507, 'lng' => 121.1029],
            'Muntinlupa' => ['lat' => 14.3754, 'lng' => 121.0453],
            'Parañaque' => ['lat' => 14.4793, 'lng' => 121.0198],
            'Las Piñas' => ['lat' => 14.4453, 'lng' => 120.9820],
            'Valenzuela' => ['lat' => 14.6990, 'lng' => 120.9830],
            'Malabon' => ['lat' => 14.6625, 'lng' => 120.9559],
            'Navotas' => ['lat' => 14.6686, 'lng' => 120.9409],
            'San Juan' => ['lat' => 14.5995, 'lng' => 121.0354],
            
            // Other Major Luzon Cities
            'Baguio City' => ['lat' => 16.4023, 'lng' => 120.5960],
            'Baguio' => ['lat' => 16.4023, 'lng' => 120.5960],
            'Angeles City' => ['lat' => 15.1450, 'lng' => 120.5887],
            'Angeles' => ['lat' => 15.1450, 'lng' => 120.5887],
            'Olongapo' => ['lat' => 14.8294, 'lng' => 120.2828],
            'San Fernando' => ['lat' => 15.0293, 'lng' => 120.6897], // Pampanga
            'Cabanatuan' => ['lat' => 15.4859, 'lng' => 120.9670],
            
            // Visayas
            'Cebu City' => ['lat' => 10.3157, 'lng' => 123.8854],
            'Cebu' => ['lat' => 10.3157, 'lng' => 123.8854],
            'Mandaue' => ['lat' => 10.3237, 'lng' => 123.9222],
            'Lapu-Lapu' => ['lat' => 10.3103, 'lng' => 123.9494],
            'Iloilo City' => ['lat' => 10.7202, 'lng' => 122.5621],
            'Iloilo' => ['lat' => 10.7202, 'lng' => 122.5621],
            'Bacolod' => ['lat' => 10.6770, 'lng' => 122.9500],
            'Tacloban' => ['lat' => 11.2431, 'lng' => 125.0041],
            
            // Davao Region
            'Davao City' => ['lat' => 7.0731, 'lng' => 125.6128],
            'Davao' => ['lat' => 7.0731, 'lng' => 125.6128],
            'Tagum' => ['lat' => 7.4479, 'lng' => 125.8078],
            'Mati' => ['lat' => 6.9549, 'lng' => 126.2185],
        ];

        // Try exact match first
        if (isset($municipalityCenters[$municipality])) {
            return [
                'latitude' => $municipalityCenters[$municipality]['lat'],
                'longitude' => $municipalityCenters[$municipality]['lng'],
                'source' => 'municipality_center',
                'cached' => false
            ];
        }

        // Try case-insensitive match
        $municipalityLower = strtolower($municipality);
        foreach ($municipalityCenters as $name => $coords) {
            if (strtolower($name) === $municipalityLower) {
                return [
                    'latitude' => $coords['lat'],
                    'longitude' => $coords['lng'],
                    'source' => 'municipality_center',
                    'cached' => false
                ];
            }
        }

        // Province-level fallbacks
        $provinceCenters = [
            'Misamis Oriental' => ['lat' => 8.5000, 'lng' => 124.6000],
            'Metro Manila' => ['lat' => 14.5995, 'lng' => 120.9842],
            'Cebu' => ['lat' => 10.3157, 'lng' => 123.8854],
            'Davao del Sur' => ['lat' => 7.0731, 'lng' => 125.6128],
            'Iloilo' => ['lat' => 10.7202, 'lng' => 122.5621],
            'Negros Occidental' => ['lat' => 10.6770, 'lng' => 122.9500],
            'Benguet' => ['lat' => 16.4023, 'lng' => 120.5960],
            'Pampanga' => ['lat' => 15.0293, 'lng' => 120.6897],
        ];

        $provinceLower = strtolower($province);
        foreach ($provinceCenters as $name => $coords) {
            if (strtolower($name) === $provinceLower) {
                return [
                    'latitude' => $coords['lat'],
                    'longitude' => $coords['lng'],
                    'source' => 'province_center',
                    'cached' => false
                ];
            }
        }

        // Ultimate fallback: Center of Philippines
        return [
            'latitude' => 12.8797,  // Geographic center of Philippines
            'longitude' => 121.7740,
            'source' => 'philippines_center',
            'cached' => false
        ];
    }

    private function normalizeProvince(?string $province): string
    {
        $province = trim((string) $province);

        return $province !== '' ? $province : 'Philippines';
    }

    /**
     * Batch geocode multiple locations (for data migration)
     */
    public function batchGeocode(array $locations): array
    {
        $results = [];
        
        foreach ($locations as $location) {
            $coords = $this->getCoordinates(
                $location['barangay'],
                $location['municipality'],
                $location['province'] ?? null
            );
            
            $results[] = array_merge($location, $coords);
            
            // Rate limiting for Nominatim (1 request/second)
            if ($coords['source'] === 'nominatim' && !$coords['cached']) {
                sleep(1);
            }
        }
        
        return $results;
    }
}
