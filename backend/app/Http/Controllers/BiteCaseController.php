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
            'episode_type' => 'nullable|in:primary,re_exposure',
            'is_previously_vaccinated' => 'nullable|boolean',
            'verification_source' => 'nullable|in:system_record,external_certificate_reviewed,patient_self_report_unverified',
            'rig_decision_reason' => 'nullable|string',
            'wound_condition' => 'nullable|string|max:50',
        ]);

        DB::beginTransaction();
        try {
            // Auto-compute next episode number for this patient
            $lastEpisode = BiteIncident::where('patient_id', $request->patient_id)->max('episode_number') ?? 0;
            $episodeNumber = $lastEpisode + 1;

            // Create bite incident
            $incident = BiteIncident::create([
                'clinic_id' => $request->user()->clinic_id,
                'patient_id' => $request->patient_id,
                'episode_number' => $episodeNumber,
                'episode_type' => $request->episode_type ?? ($episodeNumber > 1 ? 're_exposure' : 'primary'),
                'is_previously_vaccinated' => $request->is_previously_vaccinated ?? ($episodeNumber > 1),
                'verification_source' => $request->verification_source,
                'rig_decision_reason' => $request->rig_decision_reason,
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
                'wound_condition' => $request->wound_condition ?? 'clean',
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

            // ── Auto-advance queue: move patient from Triage → Treatment ──
            // Find today's active queue entry for this patient
            $todayQueue = \App\Models\Queue::where('clinic_id', $request->user()->clinic_id)
                ->where('patient_id', $request->patient_id)
                ->where('queue_date', \Carbon\Carbon::today()->toDateString())
                ->whereIn('status', ['waiting', 'called', 'in_consultation', 'serving'])
                ->whereIn('visit_type', ['new_case', 'follow_up', 'observation'])
                ->whereNull('deleted_at')
                ->latest('queue_id')
                ->first();

            if ($todayQueue) {
                $todayQueue->update([
                    'visit_type'  => 'vaccination',
                    'status'      => 'waiting',   // reset to waiting for Treatment nurse
                    'called_at'   => null,
                    'serving_at'  => null,
                    'bite_id'     => $incident->bite_id,
                    'consultation_notes' => 'Referred to Treatment after Triage assessment.',
                ]);
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
        $clinicMunicipality = $this->resolveClinicMunicipality($clinic);
        $clinicProvince = $this->resolveClinicProvince($clinic);
        
        $query = BiteIncident::where('clinic_id', $clinicId)
            ->with(['patient.details'])
            ->whereNotNull('bite_place')
            ->where('bite_place', '!=', '')
            ->whereIn('severity', ['minor', 'moderate', 'severe']);

        // Filter by status (default to active, completed, finished)
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        } else {
            $query->whereIn('status', ['active', 'completed', 'finished']);
        }
        
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
        
        $cases = $query->get()->map(function ($case) use ($geocodingService, $clinicMunicipality, $clinicProvince) {
            // Parse location data from bite_place (Place of Exposure)
            $locationParts = array_map('trim', explode(',', $case->bite_place));
            $count = count($locationParts);

            $homeBrgy = $case->patient->details->address_barangay ?? $case->patient->address_barangay ?? '';
            $homeMun = $case->patient->details->address_municipality ?? $case->patient->address_municipality ?? '';
            $homeProvince = $case->patient->details->province ?? $clinicProvince ?? 'Misamis Oriental';
            $patientResidence = trim(implode(', ', array_filter([$homeBrgy, $homeMun, $homeProvince])), ', ');

            $address = '';
            $barangay = '';
            $municipality = '';
            $province = $clinicProvince ?: 'Misamis Oriental';

            // Check if the last part is a province
            $isLastPartProvince = false;
            if ($count >= 2) {
                $lastPart = end($locationParts);
                if (stripos($lastPart, 'Misamis') !== false || stripos($lastPart, 'Oriental') !== false || stripos($lastPart, 'Bukidnon') !== false || stripos($lastPart, 'Province') !== false || (strcasecmp($lastPart, (string)$clinicProvince) === 0 && !empty($clinicProvince))) {
                    $isLastPartProvince = true;
                    $province = $lastPart;
                }
            }

            if ($isLastPartProvince) {
                if ($count >= 4) {
                    $address = $locationParts[0];
                    $barangay = $locationParts[1];
                    $municipality = $locationParts[2];
                } elseif ($count === 3) {
                    $address = '';
                    $barangay = $locationParts[0];
                    $municipality = $locationParts[1];
                } elseif ($count === 2) {
                    $address = '';
                    $barangay = '';
                    $municipality = $locationParts[0];
                }
            } else {
                if ($count >= 3) {
                    $address = $locationParts[0];
                    $barangay = $locationParts[1];
                    $municipality = $locationParts[2];
                } elseif ($count === 2) {
                    $address = '';
                    $barangay = $locationParts[0];
                    $municipality = $locationParts[1];
                } else {
                    $rawPlace = trim($case->bite_place);
                    if (strcasecmp($rawPlace, 'home') === 0 || stripos($rawPlace, 'residence') !== false) {
                        $address = $rawPlace;
                        $barangay = $homeBrgy ?: 'Poblacion';
                        $municipality = $homeMun ?: ($clinicMunicipality ?: 'Tagoloan');
                    } else {
                        $address = $rawPlace;
                        $barangay = '';
                        $municipality = $clinicMunicipality ?: 'Tagoloan';
                    }
                }
            }

            if (empty($barangay) || $barangay === 'Unknown') {
                $barangay = $homeBrgy ?: '';
            }
            if (empty($municipality) || $municipality === 'Unknown') {
                $municipality = $homeMun ?: ($clinicMunicipality ?: 'Tagoloan');
            }
            if (empty($province)) {
                $province = $homeProvince ?: 'Misamis Oriental';
            }
            
            // Get real coordinates using hybrid geocoding based on Place of Exposure
            $coordinates = $geocodingService->getCoordinates($barangay, $municipality, $province);

            $isResident = !empty($homeMun) && !empty($clinicMunicipality) && (strcasecmp($homeMun, $clinicMunicipality) === 0);
            
            return [
                'bite_id' => $case->bite_id,
                'case_number' => $case->case_number,
                'bite_date' => $case->bite_date,
                'latitude' => $coordinates['latitude'],
                'longitude' => $coordinates['longitude'],
                'barangay' => $barangay,
                'municipality' => $municipality,
                'province' => $province,
                'address' => $address,
                'place_of_exposure' => $case->bite_place,
                'patient_residence' => $patientResidence,
                'patient_home_barangay' => $homeBrgy,
                'patient_home_municipality' => $homeMun,
                'is_resident' => $isResident,
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
                'unclassified' => $cases->whereIn('severity', ['unclassified', 'pending', null, ''])->count(),
            ],
            'by_status' => [
                'active' => $cases->where('status', 'active')->count(),
                'completed' => $cases->whereIn('status', ['completed', 'finished'])->count(),
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
                    $coords = $geocodingService->getCoordinates('', $mun, $clinicProvince);
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
                'municipality' => $clinicMunicipality ?? '',
                'province' => $clinicProvince ?? '',
            ]
        ]);
    }

    private function resolveClinicMunicipality(?object $clinic): ?string
    {
        if (! $clinic) {
            return null;
        }

        $municipality = trim((string) ($clinic->municipality ?? ''));
        if ($municipality !== '') {
            return $municipality;
        }

        $parts = $this->splitAddressParts($clinic->address ?? null);

        return count($parts) >= 2 ? $parts[count($parts) - 2] : null;
    }

    private function resolveClinicProvince(?object $clinic): ?string
    {
        if (! $clinic) {
            return null;
        }

        $province = trim((string) ($clinic->province ?? ''));
        if ($province !== '') {
            return $province;
        }

        $parts = $this->splitAddressParts($clinic->address ?? null);

        return count($parts) >= 1 ? $parts[count($parts) - 1] : null;
    }

    private function splitAddressParts(?string $address): array
    {
        if (! $address) {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', $address)), fn ($part) => $part !== ''));
    }

    /**
     * Get all bite episodes for a patient with immunization history summary
     * GET /api/cases/patient/{patientId}/episodes
     */
    public function patientEpisodes(Request $request, $patientId)
    {
        try {
            $clinicId = $request->user()->clinic_id;

            $patient = \App\Models\Patient::with(['details'])->findOrFail($patientId);

            $episodes = BiteIncident::where('patient_id', $patientId)
                ->with([
                    'treatmentRecords' => function ($q) {
                        $q->orderBy('dose_number');
                    },
                    'externalProofReviewer:id,name,role',
                    'createdBy:id,name',
                ])
                ->orderBy('episode_number', 'desc')
                ->get();

            $historySummary = $patient->getImmunizationHistorySummary();

            return response()->json([
                'patient_id' => $patientId,
                'patient_name' => $patient->full_name,
                'history_summary' => $historySummary,
                'summary' => $historySummary,
                'episodes' => $episodes,
            ]);
        } catch (\Exception $e) {
            \Log::error('Fetch patient episodes error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load patient episodes',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Record outgoing cross-clinic transfer and generate referral certificate data
     * POST /api/cases/{id}/transfer-out
     */
    public function transferOut(Request $request, $id)
    {
        $request->validate([
            'transferred_to_facility' => 'required|string|max:255',
            'transfer_reason' => 'nullable|string',
            'transfer_date' => 'nullable|date',
        ]);

        DB::beginTransaction();
        try {
            $clinicId = $request->user()->clinic_id;

            $incident = BiteIncident::where('clinic_id', $clinicId)->findOrFail($id);

            $transferDate = $request->transfer_date ? \Carbon\Carbon::parse($request->transfer_date) : now();

            $incident->update([
                'status' => 'transferred_out',
                'transferred_to_facility' => $request->transferred_to_facility,
                'transferred_at' => $transferDate,
                'transfer_reason' => $request->transfer_reason,
            ]);

            // Cancel any pending future appointments for this episode at our clinic
            \App\Models\Appointment::where('bite_id', $incident->bite_id)
                ->where('status', 'scheduled')
                ->where('appointment_date', '>=', $transferDate->toDateString())
                ->update([
                    'status' => 'cancelled',
                    'cancellation_reason' => "Patient transferred to {$request->transferred_to_facility}",
                ]);

            DB::commit();

            // Load complete referral data for the DOH Transfer Slip modal
            $incident->load([
                'patient.details',
                'treatmentRecords.administeredBy',
                'clinic',
            ]);

            return response()->json([
                'message' => 'Patient case transferred out successfully',
                'incident' => $incident,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Transfer out error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to transfer patient',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Review and verify external vaccination proof / certificate
     * POST /api/cases/{id}/review-proof
     */
    public function reviewExternalProof(Request $request, $id)
    {
        $request->validate([
            'is_verified' => 'required|boolean',
            'remarks' => 'nullable|string',
        ]);

        try {
            $clinicId = $request->user()->clinic_id;
            $incident = BiteIncident::where('clinic_id', $clinicId)->findOrFail($id);

            $incident->update([
                'verification_source' => $request->is_verified ? 'external_certificate_reviewed' : 'patient_self_report_unverified',
                'external_proof_reviewed_by' => $request->user()->id,
                'external_proof_reviewed_at' => now(),
                'remarks' => trim(($incident->remarks ?? '') . ' | Proof review: ' . ($request->remarks ?? ($request->is_verified ? 'Verified' : 'Rejected'))),
            ]);

            return response()->json([
                'message' => 'External proof review recorded',
                'incident' => $incident->fresh(['externalProofReviewer']),
            ]);
        } catch (\Exception $e) {
            \Log::error('Review proof error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to record proof review',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
