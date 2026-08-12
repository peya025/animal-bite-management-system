<?php

namespace App\Http\Controllers;

use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\VaccinationSchedule;
use App\Services\GeocodingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class BiteCaseController extends Controller
{
    /**
     * List all bite cases
     * Access: admin, triage, treatment
     */
    public function index(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        
        // Create cache key based on filters
        $cacheKey = sprintf(
            'web:bite-cases:clinic:%s:status:%s:from:%s:to:%s:search:%s:page:%s',
            $clinicId,
            $request->get('status', 'all'),
            $request->get('from_date', 'all'),
            $request->get('to_date', 'all'),
            $request->get('search', 'none'),
            $request->get('page', 1)
        );

        // Cache for 2 minutes
        return response()->json(
            Cache::remember($cacheKey, 120, function () use ($request, $clinicId) {
                $query = BiteIncident::where('clinic_id', $clinicId)
                    ->with(['patient', 'createdBy']);

                // Filter by status
                if ($request->has('status')) {
                    $query->where('status', $request->status);
                }

                // Filter by date range
                if ($request->has('from_date')) {
                    $query->where('bite_date', '>=', $request->from_date);
                }
                if ($request->has('to_date')) {
                    $query->where('bite_date', '<=', $request->to_date);
                }

                // Search
                if ($request->has('search')) {
                    $search = $request->search;
                    $query->where(function ($q) use ($search) {
                        $q->where('case_number', 'like', "%{$search}%")
                            ->orWhereHas('patient', function ($pq) use ($search) {
                                $pq->searchName($search);
                            });
                    });
                }

                return $query->orderBy('bite_date', 'desc')->paginate(15);
            })
        );
    }

    /**
     * Create new bite case with auto vaccination schedule
     * Access: admin, triage
     */
    public function store(Request $request)
    {
        $request->validate([
            'patient_id' => 'required|exists:patients,patient_id',
            'bite_date' => 'required|date|before_or_equal:today',
            'bite_place' => 'nullable|string|max:255',
            'site_washed' => 'required|boolean',
            'exposure_type' => 'required|in:bite,scratch,lick,other',
            'victim_of_exposure' => 'nullable|string',
            'severity' => 'required|in:minor,moderate,severe',
            'animal_type' => 'nullable|string|max:100',
            'animal_status' => 'required|in:owned,stray,unknown',
            'animal_captured' => 'nullable|boolean',
            'animal_observation_status' => 'nullable|in:healthy,sick,died,unknown',
            'site_number' => 'nullable|string',
            'wound_description' => 'nullable|string',
            'referred_from' => 'nullable|string',
            'remarks' => 'nullable|string',
            'intake_id' => 'nullable|exists:bite_incident_intakes,intake_id',
        ]);

        DB::beginTransaction();
        try {
            // Create bite incident
            $incident = BiteIncident::create([
                'clinic_id' => $request->user()->clinic_id,
                'patient_id' => $request->patient_id,
                'bite_date' => $request->bite_date,
                'bite_place' => $request->bite_place,
                'site_washed' => $request->site_washed,
                'exposure_type' => $request->exposure_type,
                'victim_of_exposure' => $request->victim_of_exposure,
                'severity' => $request->severity,
                'animal_type' => $request->animal_type,
                'animal_status' => $request->animal_status,
                'animal_captured' => $request->animal_captured ?? false,
                'animal_observation_status' => $request->animal_observation_status,
                'site_number' => $request->site_number,
                'wound_description' => $request->wound_description,
                'referred_from' => $request->referred_from,
                'status' => 'active',
                'remarks' => $request->remarks,
                'created_by' => $request->user()->id,
            ]);

            if ($request->filled('intake_id')) {
                $intake = BiteIncidentIntake::where('clinic_id', $request->user()->clinic_id)
                    ->where('patient_id', $request->patient_id)
                    ->findOrFail($request->intake_id);
                $intake->update([
                    'status' => 'converted',
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                    'bite_id' => $incident->bite_id,
                ]);
            }

            // Auto-generate vaccination schedule if needed
            if ($incident->requiresVaccination()) {
                VaccinationSchedule::generateWhoSchedule($incident);
            }

            DB::commit();

            // Invalidate bite cases cache
            $this->clearBiteCasesCache($request->user()->clinic_id);

            return response()->json([
                'message' => 'Bite case created successfully',
                'incident' => $incident->load(['patient', 'createdBy', 'vaccinationSchedules']),
                'who_category' => $incident->getWhoCategory(),
                'vaccination_required' => $incident->requiresVaccination(),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to create bite case',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get bite case details
     * Access: admin, triage, treatment
     */
    public function show(Request $request, $id)
    {
        $incident = BiteIncident::where('clinic_id', $request->user()->clinic_id)
            ->with([
                'patient',
                'createdBy',
                'vaccinationSchedules' => function ($query) {
                    $query->orderBy('dose_number');
                },
                'queueEntries',
            ])
            ->findOrFail($id);

        return response()->json([
            'incident' => $incident,
            'who_category' => $incident->getWhoCategory(),
            'vaccination_required' => $incident->requiresVaccination(),
        ]);
    }

    /**
     * Update bite case
     * Access: admin, triage
     */
    public function update(Request $request, $id)
    {
        $incident = BiteIncident::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $request->validate([
            'bite_place' => 'nullable|string|max:255',
            'site_washed' => 'sometimes|boolean',
            'severity' => 'sometimes|in:minor,moderate,severe',
            'animal_observation_status' => 'nullable|in:healthy,sick,died,unknown',
            'wound_description' => 'nullable|string',
            'status' => 'sometimes|in:active,completed,referred,abandoned',
            'remarks' => 'nullable|string',
        ]);

        $incident->update($request->all());

        // Invalidate caches
        $this->clearBiteCasesCache($request->user()->clinic_id);
        Cache::forget("web:bite-case:{$id}:clinic:{$request->user()->clinic_id}");

        return response()->json([
            'message' => 'Bite case updated successfully',
            'incident' => $incident,
        ]);
    }

    /**
     * Delete bite case (soft delete)
     * Access: admin only
     */
    public function destroy(Request $request, $id)
    {
        $incident = BiteIncident::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $incident->delete();

        // Invalidate caches
        $this->clearBiteCasesCache($request->user()->clinic_id);
        Cache::forget("web:bite-case:{$id}:clinic:{$request->user()->clinic_id}");

        return response()->json([
            'message' => 'Bite case deleted successfully',
        ]);
    }

    /**
     * Helper method to clear bite cases cache
     */
    private function clearBiteCasesCache($clinicId)
    {
        $statuses = ['all', 'active', 'completed', 'referred', 'abandoned'];
        
        // Clear first 5 pages of common cache variations
        foreach ($statuses as $status) {
            for ($page = 1; $page <= 5; $page++) {
                $cacheKey = sprintf(
                    'web:bite-cases:clinic:%s:status:%s:from:%s:to:%s:search:%s:page:%s',
                    $clinicId, $status, 'all', 'all', 'none', $page
                );
                Cache::forget($cacheKey);
            }
        }
        
        // Clear statistics cache
        Cache::forget("web:bite-cases:stats:clinic:{$clinicId}");
    }

    /**
     * Get vaccination schedule for a bite case
     */
    public function vaccinations(Request $request, $id)
    {
        $incident = BiteIncident::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $schedules = $incident->vaccinationSchedules()
            ->with(['administeredBy'])
            ->orderBy('dose_number')
            ->get();

        return response()->json($schedules);
    }

    /**
     * Get statistics
     */
    public function statistics(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $cacheKey = "web:bite-cases:stats:clinic:{$clinicId}";

        // Cache for 5 minutes
        return response()->json(
            Cache::remember($cacheKey, 300, function () use ($clinicId) {
                return [
                    'total_cases' => BiteIncident::where('clinic_id', $clinicId)->count(),
                    'active_cases' => BiteIncident::where('clinic_id', $clinicId)->where('status', 'active')->count(),
                    'completed_cases' => BiteIncident::where('clinic_id', $clinicId)->where('status', 'completed')->count(),
                    'by_severity' => BiteIncident::where('clinic_id', $clinicId)
                        ->select('severity', DB::raw('count(*) as count'))
                        ->groupBy('severity')
                        ->pluck('count', 'severity'),
                    'by_animal_type' => BiteIncident::where('clinic_id', $clinicId)
                        ->select('animal_type', DB::raw('count(*) as count'))
                        ->groupBy('animal_type')
                        ->pluck('count', 'animal_type'),
                ];
            })
        );
    }

    /**
     * Get bite cases with location data for map visualization
     * Access: admin
     */
    public function getMapData(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $geocodingService = new GeocodingService();
        
        // Get clinic info for map center
        $clinic = DB::table('clinics')->find($clinicId);
        
        $query = BiteIncident::where('clinic_id', $clinicId)
            ->with(['patient'])
            ->whereNotNull('bite_place')
            ->where('bite_place', '!=', '');
        
        // Filter by date range
        if ($request->has('date_from')) {
            $query->where('bite_date', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->where('bite_date', '<=', $request->date_to);
        }
        
        // Filter by severity
        if ($request->has('severity')) {
            $query->where('severity', $request->severity);
        }
        
        $cases = $query->get()->map(function ($case) use ($geocodingService) {
            // Parse location data from bite_place
            // Format expected: "address, barangay, municipality"
            $locationParts = array_map('trim', explode(',', $case->bite_place));
            $address = $locationParts[0] ?? '';
            $barangay = $locationParts[1] ?? 'Unknown';
            $municipality = $locationParts[2] ?? 'Unknown';
            
            // Get real coordinates using hybrid geocoding
            // Uses lookup table first, then Nominatim API, then municipality center
            $coordinates = $geocodingService->getCoordinates($barangay, $municipality);
            
            return [
                'bite_id' => $case->bite_id,
                'case_number' => $case->case_number,
                'bite_date' => $case->bite_date,
                'latitude' => $coordinates['latitude'],
                'longitude' => $coordinates['longitude'],
                'barangay' => $barangay,
                'municipality' => $municipality,
                'address' => $address,
                'severity' => $case->severity,
                'animal_type' => $case->animal_type ?? 'Unknown',
                'exposure_type' => $case->exposure_type,
                'patient_name' => $case->patient ? 
                    "{$case->patient->first_name} {$case->patient->last_name}" : 'Unknown',
                'status' => $case->status,
                'coord_source' => $coordinates['source'], // For debugging
            ];
        });
        
        // Generate statistics
        $stats = [
            'total_cases' => $cases->count(),
            'by_municipality' => $cases->groupBy('municipality')->map->count(),
            'by_barangay' => $cases->groupBy('barangay')->map->count(),
            'by_severity' => [
                'minor' => $cases->where('severity', 'minor')->count(),
                'moderate' => $cases->where('severity', 'moderate')->count(),
                'severe' => $cases->where('severity', 'severe')->count(),
            ],
            'by_animal' => $cases->groupBy('animal_type')->map->count(),
        ];
        
        // Determine map center and zoom
        $mapCenter = null;
        $mapZoom = 12;
        
        if ($clinic) {
            if ($clinic->latitude && $clinic->longitude) {
                // Use clinic coordinates if available
                $mapCenter = [
                    'latitude' => (float) $clinic->latitude,
                    'longitude' => (float) $clinic->longitude
                ];
                $mapZoom = $clinic->map_default_zoom ?? 13;
            } else {
                // Extract municipality from clinic record or parse from clinic address string
                $mun = $clinic->municipality;
                if (!$mun && $clinic->address) {
                    $parts = array_map('trim', explode(',', $clinic->address));
                    if (count($parts) >= 4) {
                        $mun = $parts[2];
                    } elseif (count($parts) >= 2) {
                        $mun = $parts[count($parts) - 2];
                    }
                }
                if ($mun) {
                    $coords = $geocodingService->getCoordinates('', $mun);
                    $mapCenter = [
                        'latitude' => $coords['latitude'],
                        'longitude' => $coords['longitude']
                    ];
                    $mapZoom = 13;

                    // Update clinic record with geocoded coordinates for future instant loads
                    DB::table('clinics')->where('id', $clinicId)->update([
                        'municipality' => $mun,
                        'latitude' => $coords['latitude'],
                        'longitude' => $coords['longitude'],
                        'map_default_zoom' => 13,
                    ]);
                }
            }
        }
        
        // Fallback: use first case location or default
        if (!$mapCenter && $cases->count() > 0) {
            $firstCase = $cases->first();
            $mapCenter = [
                'latitude' => $firstCase['latitude'],
                'longitude' => $firstCase['longitude']
            ];
        }
        
        return response()->json([
            'cases' => $cases->values(),
            'statistics' => $stats,
            'map_center' => $mapCenter,
            'map_zoom' => $mapZoom,
            'clinic' => [
                'name' => $clinic->name ?? '',
                'municipality' => $clinic->municipality ?? '',
                'province' => $clinic->province ?? 'Misamis Oriental',
            ]
        ]);
    }
}
