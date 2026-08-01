<?php

namespace App\Http\Controllers;

use App\Models\TreatmentRecord;
use App\Models\TagoloanTreatmentCard;
use App\Models\Queue;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class VaccinationRecordController extends Controller
{
    /**
     * Get vaccination records for a patient
     * GET /api/vaccination-records/patient/{patientId}
     */
    public function getByPatient(Request $request, $patientId)
    {
        try {
            $clinicId = $request->user()->clinic_id;

            $records = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->whereNotNull('dose_number')
                ->with(['administeredBy'])
                ->orderBy('dose_number')
                ->get();

            // Get Tagoloan treatment card for ICD code and additional meds
            $card = TagoloanTreatmentCard::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->latest()
                ->first();

            return response()->json([
                'vaccination_records' => $records,
                'tagoloan_card' => $card,
            ]);
        } catch (\Exception $e) {
            \Log::error('Get vaccination records error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load vaccination records',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get vaccination records by queue entry
     * GET /api/vaccination-records/queue/{queueId}
     */
    public function getByQueue(Request $request, $queueId)
    {
        try {
            $clinicId = $request->user()->clinic_id;

            $queue = Queue::where('clinic_id', $clinicId)
                ->findOrFail($queueId);

            return $this->getByPatient($request, $queue->patient_id);
        } catch (\Exception $e) {
            \Log::error('Get vaccination records by queue error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load vaccination records',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store/Update vaccination records (Form 3)
     * POST /api/vaccination-records
     */
    public function store(Request $request)
    {
        $request->validate([
            'patient_id' => 'required|exists:patients,patient_id',
            'bite_id' => 'nullable|exists:bite_incidents,bite_id',
            'queue_id' => 'nullable|exists:queues,queue_id',
            'doses' => 'required|array',
            'doses.*.period' => 'required|string',
            'doses.*.route' => 'nullable|in:ID,IM',
            'doses.*.date' => 'nullable|date',
            'doses.*.given_by' => 'nullable|string|max:255',
            'doses.*.signature' => 'nullable|string|max:255',
            'additional_meds' => 'nullable|array',
            'additional_meds.erig' => 'nullable|boolean',
            'additional_meds.tt' => 'nullable|boolean',
            'additional_meds.ats' => 'nullable|boolean',
            'icd_code' => 'nullable|string|max:20',
        ]);

        DB::beginTransaction();
        try {
            $clinicId = $request->user()->clinic_id;
            $patientId = $request->patient_id;
            $biteId = $request->bite_id;
            $userId = $request->user()->id;

            // Map period names to dose numbers
            $periodMapping = [
                'Day 0' => 0,
                'Day 3' => 3,
                'Day 7' => 7,
                'Day 28' => 28,
                'Booster 1' => 90,  // Approximate day 90
                'Booster 2' => 365, // Approximate day 365
            ];

            // Process each dose
            foreach ($request->doses as $doseData) {
                // Skip empty doses (no date filled)
                if (empty($doseData['date'])) {
                    continue;
                }

                $doseNumber = $periodMapping[$doseData['period']] ?? 0;

                // Check if record exists for this dose
                $existing = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('dose_number', $doseNumber)
                    ->when($biteId, function ($query) use ($biteId) {
                        return $query->where('bite_id', $biteId);
                    })
                    ->first();

                $treatmentData = [
                    'clinic_id' => $clinicId,
                    'patient_id' => $patientId,
                    'bite_id' => $biteId,
                    'dose_number' => $doseNumber,
                    'treatment_date' => $doseData['date'],
                    'scheduled_date' => $doseData['date'],
                    'route' => $doseData['route'] ?? null,
                    'signature' => $doseData['signature'] ?? null,
                    'administered_by' => $userId,
                    'administered_at' => now(),
                    'status' => 'completed',
                    'remarks' => "Given by: " . ($doseData['given_by'] ?? ''),
                ];

                if ($existing) {
                    // Update existing record
                    $existing->update($treatmentData);
                } else {
                    // Create new record
                    TreatmentRecord::create($treatmentData);
                }
            }

            // Update or create Tagoloan treatment card for ICD code and additional meds
            if ($request->has('icd_code') || $request->has('additional_meds')) {
                $card = TagoloanTreatmentCard::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->when($biteId, function ($query) use ($biteId) {
                        return $query->where('bite_id', $biteId);
                    })
                    ->first();

                $cardData = [];
                
                if ($request->has('icd_code')) {
                    $cardData['icd10_code'] = $request->icd_code;
                }

                // Store additional medications in a JSON field or separate logic
                // For now, we'll add them to the treatment records as separate entries
                $additionalMeds = $request->input('additional_meds', []);
                
                if ($card && !empty($cardData)) {
                    $card->update($cardData);
                } elseif (!$card && ($request->has('icd_code') || !empty($additionalMeds))) {
                    // Create card if it doesn't exist
                    TagoloanTreatmentCard::create([
                        'clinic_id' => $clinicId,
                        'patient_id' => $patientId,
                        'bite_id' => $biteId,
                        'card_date' => now()->toDateString(),
                        'icd10_code' => $request->icd_code,
                        'created_by' => $userId,
                    ]);
                }

                // Store additional medications as treatment records with special markers
                foreach (['erig', 'tt', 'ats'] as $med) {
                    if (!empty($additionalMeds[$med])) {
                        $existingMed = TreatmentRecord::where('clinic_id', $clinicId)
                            ->where('patient_id', $patientId)
                            ->where('medication_given', strtoupper($med))
                            ->when($biteId, function ($query) use ($biteId) {
                                return $query->where('bite_id', $biteId);
                            })
                            ->first();

                        if (!$existingMed) {
                            TreatmentRecord::create([
                                'clinic_id' => $clinicId,
                                'patient_id' => $patientId,
                                'bite_id' => $biteId,
                                'medication_given' => strtoupper($med),
                                'treatment_date' => now(),
                                'administered_by' => $userId,
                                'administered_at' => now(),
                                'status' => 'completed',
                                'remarks' => 'Additional medication administered',
                            ]);
                        }
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Vaccination records saved successfully',
                'records_count' => count($request->doses),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Store vaccination records error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to save vaccination records',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single vaccination record
     * GET /api/vaccination-records/{id}
     */
    public function show(Request $request, $id)
    {
        try {
            $clinicId = $request->user()->clinic_id;

            $record = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('treatment_id', $id)
                ->with(['patient', 'biteIncident', 'administeredBy'])
                ->firstOrFail();

            return response()->json($record);
        } catch (\Exception $e) {
            \Log::error('Show vaccination record error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Vaccination record not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Delete vaccination record
     * DELETE /api/vaccination-records/{id}
     */
    public function destroy(Request $request, $id)
    {
        try {
            $clinicId = $request->user()->clinic_id;

            $record = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('treatment_id', $id)
                ->firstOrFail();

            $record->delete();

            return response()->json([
                'message' => 'Vaccination record deleted successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Delete vaccination record error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete vaccination record',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
