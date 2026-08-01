<?php

namespace App\Http\Controllers;

use App\Models\TreatmentRecord;
use App\Models\Patient;
use App\Models\BiteIncident;
use App\Models\Queue;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TreatmentRecordController extends Controller
{
    /**
     * Get treatment record for a patient (for editing)
     */
    public function getByPatient(Request $request, int $patientId)
    {
        $clinicId = $request->user()->clinic_id;

        $patient = Patient::with('details')
            ->where('clinic_id', $clinicId)
            ->findOrFail($patientId);

        // Get latest bite incident
        $latestBite = BiteIncident::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->orderBy('bite_date', 'desc')
            ->first();

        // Get existing treatment records
        $treatments = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->orderBy('treatment_date', 'desc')
            ->get();

        return response()->json([
            'patient' => $patient,
            'latest_bite' => $latestBite,
            'treatments' => $treatments,
        ]);
    }

    /**
     * Store Form 2 data (Individual Treatment Record)
     */
    public function store(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,patient_id',
            'queue_id' => 'nullable|exists:queues,queue_id',
            
            // Exposure Details (Form 2 Section 2)
            'date' => 'nullable|date',
            'registry_no' => 'nullable|string|max:100',
            'hospital_no' => 'nullable|string|max:100',
            'referred_by' => 'nullable|string|max:255',
            'philhealth_pin' => 'nullable|string|max:50',
            'philhealth_type' => 'nullable|in:member,dependent',
            
            'exposure_category' => 'nullable|in:I,II,III',
            'date_of_exposure' => 'nullable|date',
            'date_treatment_started' => 'nullable|date',
            'place_of_exposure' => 'nullable|string|max:255',
            
            // Exposure Details (Detailed) - Form 2 Section 3
            'mode_of_exposure' => 'nullable|array',
            'body_part_affected' => 'nullable|in:head_neck,other_parts,na_ingestion',
            'animal_type' => 'nullable|in:dog,other',
            'animal_type_other' => 'nullable|string|max:255',
            'past_history_bite' => 'nullable|in:yes,no',
            'past_pep_completed' => 'nullable|in:yes,no',
        ]);

        // Create or update bite incident
        $biteData = [
            'clinic_id' => $clinicId,
            'patient_id' => $validated['patient_id'],
            'bite_date' => $validated['date_of_exposure'] ?? Carbon::now()->toDateString(),
            'bite_place' => $validated['place_of_exposure'] ?? null,
            'animal_type' => $validated['animal_type'] === 'other' 
                ? ($validated['animal_type_other'] ?? 'Unknown') 
                : ($validated['animal_type'] ?? 'Dog'),
            'exposure_category' => $validated['exposure_category'] ?? 'II',
            'body_part' => $validated['body_part_affected'] ?? null,
            'referred_from' => $validated['referred_by'] ?? null,
            'status' => 'active',
        ];

        // Check if bite incident already exists for this patient
        $biteIncident = BiteIncident::where('clinic_id', $clinicId)
            ->where('patient_id', $validated['patient_id'])
            ->where('bite_date', $biteData['bite_date'])
            ->first();

        if ($biteIncident) {
            $biteIncident->update($biteData);
        } else {
            $biteIncident = BiteIncident::create($biteData);
        }

        // Create treatment record entry
        $treatmentRecord = TreatmentRecord::create([
            'clinic_id' => $clinicId,
            'patient_id' => $validated['patient_id'],
            'bite_id' => $biteIncident->bite_id,
            'treatment_date' => $validated['date_treatment_started'] ?? Carbon::now(),
            'remarks' => json_encode([
                'mode_of_exposure' => $validated['mode_of_exposure'] ?? [],
                'past_history_bite' => $validated['past_history_bite'] ?? 'no',
                'past_pep_completed' => $validated['past_pep_completed'] ?? 'no',
                'registry_no' => $validated['registry_no'] ?? null,
                'hospital_no' => $validated['hospital_no'] ?? null,
                'philhealth_pin' => $validated['philhealth_pin'] ?? null,
                'philhealth_type' => $validated['philhealth_type'] ?? null,
            ]),
            'status' => 'active',
            'administered_by' => $request->user()->id,
        ]);

        // Update queue status if queue_id provided
        if (!empty($validated['queue_id'])) {
            $queue = Queue::find($validated['queue_id']);
            if ($queue) {
                $queue->update(['status' => 'completed']);
            }
        }

        // Update patient details if hospital_no or philhealth_pin provided
        $patient = Patient::find($validated['patient_id']);
        if ($patient && $patient->details) {
            $updateData = [];
            if (!empty($validated['hospital_no'])) {
                $updateData['hospital_no'] = $validated['hospital_no'];
            }
            if (!empty($validated['philhealth_pin'])) {
                $updateData['philhealth_no'] = $validated['philhealth_pin'];
            }
            if (!empty($validated['philhealth_type'])) {
                $updateData['philhealth_status'] = $validated['philhealth_type'];
            }
            if (!empty($updateData)) {
                $patient->details->update($updateData);
            }
        }

        return response()->json([
            'message' => 'Treatment record saved successfully',
            'bite_incident' => $biteIncident,
            'treatment_record' => $treatmentRecord,
        ], 201);
    }

    /**
     * Get all treatment records
     */
    public function index(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $query = TreatmentRecord::with(['patient', 'biteIncident', 'administeredBy'])
            ->where('clinic_id', $clinicId)
            ->orderBy('treatment_date', 'desc');

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('patient', function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('patient_number', 'like', "%{$search}%");
            });
        }

        $records = $query->paginate($request->get('per_page', 15));

        return response()->json($records);
    }

    /**
     * Show single treatment record
     */
    public function show(Request $request, int $id)
    {
        $clinicId = $request->user()->clinic_id;

        $record = TreatmentRecord::with(['patient', 'biteIncident', 'administeredBy'])
            ->where('clinic_id', $clinicId)
            ->findOrFail($id);

        return response()->json($record);
    }
}
