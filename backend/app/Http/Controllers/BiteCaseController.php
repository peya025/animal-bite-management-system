<?php

namespace App\Http\Controllers;

use App\Models\BiteIncident;
use App\Models\VaccinationSchedule;
use Illuminate\Http\Request;
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
            $query->where(function($q) use ($search) {
                $q->where('case_number', 'like', "%{$search}%")
                  ->orWhereHas('patient', function($pq) use ($search) {
                      $pq->searchName($search);
                  });
            });
        }

        $cases = $query->orderBy('bite_date', 'desc')->paginate(15);

        return response()->json($cases);
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

            // Auto-generate vaccination schedule if needed
            if ($incident->requiresVaccination()) {
                VaccinationSchedule::generateWhoSchedule($incident);
            }

            DB::commit();

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
                'vaccinationSchedules' => function($query) {
                    $query->orderBy('dose_number');
                },
                'queueEntries'
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

        return response()->json([
            'message' => 'Bite case deleted successfully',
        ]);
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

        $stats = [
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

        return response()->json($stats);
    }
}
