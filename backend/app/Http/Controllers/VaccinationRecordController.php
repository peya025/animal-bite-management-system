<?php

namespace App\Http\Controllers;

use App\Models\TreatmentRecord;
use App\Models\TagoloanTreatmentCard;
use App\Models\Queue;
use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Patient;
use App\Models\Clinic;
use App\Services\VaccineInventoryUsageService;
use App\Services\ClinicScheduleService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

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
                ->with(['administeredBy', 'inventory'])
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
            'exposure_category' => 'nullable|in:I,II,III',
            'date_of_exposure' => 'nullable|date',
            'date_treatment_started' => 'nullable|date',
            'place_of_exposure' => 'nullable|string|max:255',
            'mode_of_exposure' => 'nullable',
            'body_part_affected' => 'nullable',
            'animal_type' => 'nullable|string|max:100',
            'animal_type_other' => 'nullable|string|max:255',
            'past_history_bite' => 'nullable|in:yes,no',
            'pep_completed' => 'nullable|in:yes,no',
            'registry_no' => 'nullable|string|max:100',
            'hospital_no' => 'nullable|string|max:100',
            'referred_by' => 'nullable|string|max:255',
            'doses' => 'required|array',
            'doses.*.period' => 'required|string',
            'doses.*.route' => 'nullable|in:ID,IM',
            'doses.*.date' => 'nullable|date',
            'doses.*.given_by' => 'nullable|string|max:255',
            'doses.*.signature' => 'nullable|string|max:255',
            'doses.*.vaccine_type' => 'nullable|string|max:255',
            'doses.*.inventory_units_used' => 'nullable|integer|min:0|max:999',
            'additional_meds' => 'nullable|array',
            'additional_meds.erig' => 'nullable|boolean',
            'additional_meds.tt' => 'nullable|boolean',
            'additional_meds.ats' => 'nullable|boolean',
            'icd_code' => 'nullable|string|max:20',
        ], [
            'doses.required' => "Please select a Vaccine Type for today's dose before saving.",
            'doses.min' => "Please select a Vaccine Type for today's dose before saving.",
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

            $inventoryUsageService = app(VaccineInventoryUsageService::class);
            $savedDoseNumbers = []; // track which doses were actually saved this request

            // Process each dose
            foreach ($request->doses as $doseData) {
                if (empty($doseData['date'])) {
                    continue;
                }

                $doseNumber = $periodMapping[$doseData['period']] ?? 0;
                $selectedVaccineType = trim((string) ($doseData['vaccine_type'] ?? ''));
                $inventoryUnitsUsed = (int) ($doseData['inventory_units_used'] ?? 0);

                if ($selectedVaccineType === '') {
                    throw ValidationException::withMessages([
                        'doses' => "Select a vaccine type for {$doseData['period']} before saving.",
                    ]);
                }

                if ($inventoryUnitsUsed < 0) {
                    throw ValidationException::withMessages([
                        'doses' => "Enter valid stock units (0 for shared open vial, or 1+ for new vial) for {$doseData['period']}.",
                    ]);
                }

                $existing = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('dose_number', $doseNumber)
                    ->where(function ($q) {
                        // Prefer rows already linked to this dose's record,
                        // but skip auto-scheduled rows that haven't been administered yet
                        $q->whereNotNull('treatment_date')
                          ->orWhereNotNull('administered_at')
                          ->orWhereNull('scheduled_by'); // not system-auto-generated
                    })
                    ->latest('treatment_id')
                    ->first();

                $isExternal = !empty($doseData['is_external']);
                $externalFacility = trim((string) ($doseData['external_facility_name'] ?? ''));

                $baseRemarks = 'Given by: ' . ($doseData['given_by'] ?? '');
                $remarks = $isExternal
                    ? trim(($externalFacility ? "External facility: {$externalFacility} | " : "External facility | ") . $baseRemarks)
                    : trim($baseRemarks . ' | Inventory units used: ' . $inventoryUnitsUsed . ($inventoryUnitsUsed === 0 ? ' (Shared Open Vial)' : ''));

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
                    'is_external' => $isExternal,
                    'external_facility_name' => $isExternal ? $externalFacility : null,
                    'vaccine_brand' => $selectedVaccineType,
                    'vaccine_generic' => $selectedVaccineType,
                    'inventory_units_used' => $isExternal ? 0 : $inventoryUnitsUsed,
                    'remarks' => $remarks,
                ];

                // If already completed/administered, preserve its original clinical data (date, vaccine, route, staff)
                if ($existing && ($existing->status === 'completed' || !empty($existing->treatment_date))) {
                    $selectedVaccineType = $existing->vaccine_brand ?: $existing->vaccine_generic ?: $selectedVaccineType;
                    $inventoryUnitsUsed = (int) ($existing->inventory_units_used ?? $inventoryUnitsUsed);

                    $treatmentData['treatment_date'] = $existing->treatment_date ?? $treatmentData['treatment_date'];
                    $treatmentData['scheduled_date'] = $existing->scheduled_date ?? $treatmentData['scheduled_date'];
                    $treatmentData['vaccine_brand'] = $existing->vaccine_brand ?? $selectedVaccineType;
                    $treatmentData['vaccine_generic'] = $existing->vaccine_generic ?? $selectedVaccineType;
                    $treatmentData['route'] = $existing->route ?? $treatmentData['route'];
                    $treatmentData['administered_by'] = $existing->administered_by ?? $treatmentData['administered_by'];
                    $treatmentData['administered_at'] = $existing->administered_at ?? $treatmentData['administered_at'];
                    $treatmentData['signature'] = $existing->signature ?? $treatmentData['signature'];
                    $treatmentData['remarks'] = $existing->remarks ?? $treatmentData['remarks'];
                    $treatmentData['is_external'] = $existing->is_external ?? $treatmentData['is_external'];
                    $treatmentData['external_facility_name'] = $existing->external_facility_name ?? $treatmentData['external_facility_name'];
                } elseif ($existing && $existing->inventory_id) {
                    $selectedVaccineType = $existing->vaccine_brand ?: $existing->vaccine_generic ?: $selectedVaccineType;
                    $inventoryUnitsUsed = (int) ($existing->inventory_units_used ?? $inventoryUnitsUsed);
                }

                $record = $existing;
                if ($record) {
                    $record->update($treatmentData);
                } else {
                    $record = TreatmentRecord::create($treatmentData);
                }

                $savedDoseNumbers[] = $doseNumber; // track saved doses

                if (!$record->inventory_id && !$isExternal) {
                    $usage = $inventoryUsageService->administerDoseAutomated(
                        $clinicId,
                        $userId,
                        (int) $record->treatment_id,
                        $selectedVaccineType
                    );

                    $batch = $usage['batch'];
                    $record->update([
                        'inventory_id' => $batch->inventory_id,
                        'batch_no' => $batch->batch_number,
                        'expiration_date' => $batch->expiration_date,
                        'inventory_units_used' => $usage['units_deducted'],
                        'administration_notes' => $usage['is_shared']
                            ? "Shared open vial (Dose {$usage['dose_index']} of {$usage['total_doses']}) from batch {$batch->batch_number}"
                            : "New vial opened (Dose 1 of {$usage['total_doses']}) from FIFO batch {$batch->batch_number}",
                        'remarks' => trim($baseRemarks . " | Dose {$usage['dose_index']} of {$usage['total_doses']}" . ($usage['is_shared'] ? ' (Shared Open Vial)' : ' (New Vial)')),
                    ]);
                }
            }

            // ──────────────────────────────────────────────────────────────
            // ✨ SAVE / UPDATE TAGOLOAN TREATMENT CARD (FORM 3 FULL DATA)
            // ──────────────────────────────────────────────────────────────
            $modeMap = [
                'nibbling_uncovered' => 'nibbling_uncovered_skin',
                'nibbling_wounded'   => 'nibbling_broken_skin',
                'scratch_abrasion'   => 'scratch_abrasion',
                'transdermal_bite'   => 'transdermal_bite',
                'handling_ingestion' => 'handling_ingestion_raw_meat',
            ];
            $rawMode = is_array($request->mode_of_exposure) ? ($request->mode_of_exposure[0] ?? null) : $request->mode_of_exposure;
            $modeOfExposure = $modeMap[$rawMode] ?? $rawMode;

            $bodyMap = [
                'head_neck'    => 'head_neck',
                'other_parts'  => 'other_parts',
                'na_ingestion' => 'na_ingestion',
            ];
            $rawBody = is_array($request->body_part_affected) ? ($request->body_part_affected[0] ?? null) : $request->body_part_affected;
            $bodyPartExposed = $bodyMap[$rawBody] ?? $rawBody;

            $card = TagoloanTreatmentCard::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->when($biteId, function ($query) use ($biteId) {
                    return $query->where('bite_id', $biteId);
                })
                ->latest()
                ->first();

            $cardData = [
                'clinic_id'          => $clinicId,
                'patient_id'         => $patientId,
                'card_date'          => $request->date_treatment_started ?? $request->date_of_exposure ?? now()->toDateString(),
                'registry_no'        => $request->registry_no,
                'hospital_no'        => $request->hospital_no,
                'referred_by'        => $request->referred_by,
                'exposure_category'  => $request->exposure_category,
                'mode_of_exposure'   => $modeOfExposure,
                'body_part_exposed'  => $bodyPartExposed,
                'animal_type'        => $request->animal_type ?: 'dog',
                'animal_type_others' => $request->animal_type_other,
                'past_bite_history'  => $request->past_history_bite === 'yes',
                'past_pep_completed' => $request->pep_completed === 'yes',
                'icd10_code'         => $request->icd_code,
                'created_by'         => $userId,
            ];

            if ($card) {
                $card->update(array_filter($cardData, fn($v) => !is_null($v)));
            } else {
                $card = TagoloanTreatmentCard::create($cardData);
            }

            // Store additional medications as treatment records with special markers
            $additionalMeds = $request->input('additional_meds', []);
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
                            'clinic_id'        => $clinicId,
                            'patient_id'       => $patientId,
                            'bite_id'          => $biteId,
                            'medication_given' => strtoupper($med),
                            'treatment_date'   => now(),
                            'administered_by'  => $userId,
                            'administered_at'  => now(),
                            'status'           => 'completed',
                            'remarks'          => 'Additional medication administered',
                        ]);
                    }
                }
            }

            // ──────────────────────────────────────────────────────────────
            // ✨ AUTO-CREATE FOLLOW-UP APPOINTMENTS (Day 3, 7, 28, etc.)
            // ──────────────────────────────────────────────────────────────
            $this->createFollowUpAppointments($request, $clinicId, $patientId, $biteId, $userId);

            // ──────────────────────────────────────────────────────────────
            // ✨ SYNC BITE INCIDENT & MAP CATEGORY/SEVERITY FOR BITE MAP
            // ──────────────────────────────────────────────────────────────
            $severityMap = [
                'I'   => 'minor',
                'II'  => 'moderate',
                'III' => 'severe',
            ];
            $severity = $severityMap[$request->exposure_category ?? ''] ?? 'moderate';

            $patientObj = Patient::with('details')->find($patientId);
            $street = $patientObj?->details->address_purok ?? $patientObj?->address_purok ?? 'Zone 1';
            $brgy = $patientObj?->details->address_barangay ?? $patientObj?->address_barangay ?? 'Poblacion';
            $mun = $patientObj?->details->address_municipality ?? $patientObj?->address_municipality ?? 'Tagoloan';
            $bitePlace = $request->place_of_exposure ?: "{$street}, {$brgy}, {$mun}";
            $biteDate = $request->date_of_exposure ?: ($request->date_treatment_started ?: now()->toDateString());
            $animalType = $request->animal_type === 'other' ? ($request->animal_type_other ?: 'other') : ($request->animal_type ?: 'dog');

            $incident = $biteId 
                ? BiteIncident::where('clinic_id', $clinicId)->find($biteId)
                : BiteIncident::where('clinic_id', $clinicId)->where('patient_id', $patientId)->latest('bite_id')->first();
            if (!$incident) {
                $incident = BiteIncident::create([
                    'clinic_id'     => $clinicId,
                    'patient_id'    => $patientId,
                    'bite_date'     => $biteDate,
                    'bite_place'    => $bitePlace,
                    'exposure_type' => 'bite',
                    'severity'      => $severity,
                    'animal_type'   => $animalType,
                    'status'        => 'completed',
                    'created_by'    => $userId,
                ]);
            } else {
                $incident->update([
                    'severity'      => $severity,
                    'bite_date'     => $biteDate,
                    'bite_place'    => $bitePlace,
                    'animal_type'   => $animalType,
                    'status'        => 'completed',
                ]);
            }

            if ($card) {
                $card->update(['bite_id' => $incident->bite_id]);
            }

            $todayQueue = null; // initialize before the conditional block

            // ──────────────────────────────────────────────────────────────
            // ✨ AUTO-COMPLETE TODAY'S ACTIVE QUEUE FOR TREATMENT NURSE
            // Automatically marks today's active queue ticket as completed whenever
            // ANY administered dose is recorded by the Nurse in Form 3.
            // ──────────────────────────────────────────────────────────────
            if (!empty($savedDoseNumbers)) {
                if (!empty($request->queue_id)) {
                    $todayQueue = Queue::where('clinic_id', $clinicId)
                        ->where('queue_id', $request->queue_id)
                        ->whereNull('deleted_at')
                        ->first();
                }

                if (!$todayQueue) {
                    $todayQueue = Queue::where('clinic_id', $clinicId)
                        ->where('patient_id', $patientId)
                        ->where('queue_date', Carbon::today()->toDateString())
                        ->whereIn('status', ['waiting', 'called', 'in_consultation', 'serving'])
                        ->whereNull('deleted_at')
                        ->latest('queue_id')
                        ->first();
                }

                if ($todayQueue) {
                $completionNotes = 'Vaccination administered (Form 3 completed by Nurse) — Visit Completed.';
                
                \App\Models\QueueHistory::create([
                    'queue_id'     => $todayQueue->queue_id,
                    'clinic_id'    => $todayQueue->clinic_id,
                    'patient_id'   => $todayQueue->patient_id,
                    'action'       => 'completed',
                    'from_status'  => $todayQueue->status,
                    'to_status'    => 'completed',
                    'call_count'   => $todayQueue->call_count ?? 0,
                    'performed_by' => $userId,
                    'notes'        => $completionNotes,
                    'occurred_at'  => now(),
                ]);

                $todayQueue->update([
                    'status'             => 'completed',
                    'completed_at'       => now(),
                    'consultation_notes' => $todayQueue->consultation_notes 
                        ? $todayQueue->consultation_notes . ' | ' . $completionNotes 
                        : $completionNotes,
                    'recall_stage'       => null,
                ]);

                    Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayQueue->queue_date->toDateString()}");
                } // end: if ($todayQueue)
            } // end: if any doses saved

            // ──────────────────────────────────────────────────────────────
            // ✨ RESET ANY FUTURE DOSE ROWS INCORRECTLY MARKED COMPLETED
            // Only doses that were actually administered today should be completed
            // ──────────────────────────────────────────────────────────────
            if (!empty($savedDoseNumbers)) {
                TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('status', 'completed')
                    ->whereNotNull('dose_number')
                    ->whereNull('administered_at')   // not actually administered
                    ->whereNull('treatment_date')     // no treatment date recorded
                    ->update(['status' => 'scheduled']);

                // Also reset future scheduled dates that were wrongly completed
                TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('status', 'completed')
                    ->whereNotNull('dose_number')
                    ->whereNotIn('dose_number', $savedDoseNumbers)
                    ->where('scheduled_date', '>', Carbon::today()->toDateString())
                    ->update(['status' => 'scheduled', 'treatment_date' => null, 'administered_at' => null]);
            }

            // ──────────────────────────────────────────────────────────────
            // ✨ AUTO-COMPLETE TODAY'S INITIAL APPOINTMENT (Day 0 only)
            // ──────────────────────────────────────────────────────────────
            Appointment::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->whereIn('status', ['scheduled', 'confirmed', 'in_progress'])
                ->where(function ($q) {
                    $q->whereNull('dose_number')
                      ->orWhere('dose_number', 0)
                      ->orWhere('appointment_type', 'consultation');
                })
                ->whereDate('appointment_date', '<=', Carbon::today())
                ->update([
                    'status' => 'completed',
                ]);

            Cache::forget("web:bite-cases:map-data:clinic:{$clinicId}");

            DB::commit();

            return response()->json([
                'message' => 'Vaccination records saved successfully',
                'records_count' => count($request->doses),
                'queue' => $todayQueue?->fresh(),
            ], 201);
        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'message' => $e->validator->errors()->first(),
                'errors' => $e->errors(),
            ], 422);
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
                ->with(['patient', 'biteIncident', 'administeredBy', 'inventory'])
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

    /**
     * ✨ AUTO-CREATE FOLLOW-UP APPOINTMENTS
     * Called after Day 0 vaccination is recorded
     */
    private function createFollowUpAppointments($request, $clinicId, $patientId, $biteId, $userId)
    {
        // Check if Day 0 was given
        $hasDay0 = false;
        foreach ($request->doses as $dose) {
            if (!empty($dose['date']) && in_array($dose['period'], ['Day 0'])) {
                $hasDay0 = true;
                $day0Date = \Carbon\Carbon::parse($dose['date']);
                break;
            }
        }

        if (!$hasDay0) {
            return; // No Day 0 recorded, skip appointment creation
        }

        $scheduleService = app(ClinicScheduleService::class);
        $clinic = \App\Models\Clinic::find($clinicId);

        $isReExposure = false;
        if (!empty($biteId)) {
            $incident = \App\Models\BiteIncident::find($biteId);
            $isReExposure = $incident && $incident->isReExposure();
        }
        if (!$isReExposure && !empty($request->episode_type)) {
            $isReExposure = $request->episode_type === 're_exposure';
        }

        // Define follow-up schedule (2-Dose Booster for re-exposure vs Standard PEP)
        if ($isReExposure) {
            $schedule = [
                ['period' => 'Day 3', 'days_after' => 3, 'dose_number' => 3],
            ];
            $doseIntervals = [
                3 => 3,
            ];
        } else {
            $schedule = [
                ['period' => 'Day 3', 'days_after' => 3, 'dose_number' => 3],
                ['period' => 'Day 7', 'days_after' => 7, 'dose_number' => 7],
                ['period' => 'Day 28', 'days_after' => 28, 'dose_number' => 28],
                ['period' => 'Booster 1', 'days_after' => 90, 'dose_number' => 90],
                ['period' => 'Booster 2', 'days_after' => 365, 'dose_number' => 365],
            ];
            $doseIntervals = [
                3   => 3,   // 3 days after Day 0
                7   => 4,   // 4 days after Day 3
                28  => 21,  // 21 days after Day 7
                90  => 62,  // 62 days after Day 28 (Booster 1)
                365 => 275, // 275 days after Day 90 (Booster 2)
            ];
        }

        $previousResolvedDate = $day0Date->copy();

        foreach ($schedule as $followUp) {
            $doseNum = $followUp['dose_number'];
            $daysAfterDay0 = $followUp['days_after'];
            $intervalFromPrev = $doseIntervals[$doseNum] ?? 3;

            // Check if dose was already given in this submission
            $alreadyGiven = false;
            $formSpecifiedDate = null;

            foreach ($request->doses as $dose) {
                if ($dose['period'] === $followUp['period']) {
                    if (!empty($dose['date']) && !empty($dose['vaccine_type'])) {
                        $alreadyGiven = true;
                        $previousResolvedDate = Carbon::parse($dose['date']);
                    } elseif (!empty($dose['date'])) {
                        $formSpecifiedDate = Carbon::parse($dose['date']);
                    }
                    break;
                }
            }

            if ($alreadyGiven) {
                continue; // Skip if dose already given
            }

            // Ideal Date must respect both standard cumulative offset and minimum interval from previous dose
            $standardDay0Ideal = $day0Date->copy()->addDays($daysAfterDay0);
            $minIntervalIdeal = $previousResolvedDate->copy()->addDays($intervalFromPrev);
            $calculatedIdeal = $minIntervalIdeal->greaterThan($standardDay0Ideal) ? $minIntervalIdeal : $standardDay0Ideal;

            $idealDate = $formSpecifiedDate ?: $calculatedIdeal;
            $resolution = $scheduleService->resolveScheduleDate($clinicId, $idealDate, $doseNum);
            $resolvedDate = $formSpecifiedDate ?: $resolution['scheduled_date'];

            // Update tracker for next iteration
            $previousResolvedDate = $resolvedDate->copy();

            $noteText = $resolution['drift_days'] !== 0
                ? "Auto-scheduled: {$followUp['period']} dose ({$resolution['adjustment_reason']})"
                : "Auto-scheduled: {$followUp['period']} dose";

            // Check if appointment already exists for this episode
            $existing = \App\Models\Appointment::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->when($biteId, function ($q) use ($biteId) {
                    return $q->where('bite_id', $biteId);
                })
                ->where('dose_number', $doseNum)
                ->where('status', '!=', 'cancelled')
                ->latest('appointment_id')
                ->first();

            if ($existing) {
                $existing->update([
                    'appointment_date' => $resolvedDate->toDateString(),
                    'scheduled_date' => $resolvedDate->toDateString(),
                    'ideal_date' => $idealDate->toDateString(),
                    'schedule_drift_days' => $resolution['drift_days'],
                    'schedule_adjustment_reason' => $resolution['adjustment_reason'],
                    'notes' => $noteText,
                ]);
                continue;
            }

            // Create appointment
            $appt = \App\Models\Appointment::create([
                'clinic_id' => $clinicId,
                'patient_id' => $patientId,
                'bite_id' => $biteId,
                'appointment_date' => $resolvedDate->toDateString(),
                'scheduled_date' => $resolvedDate->toDateString(),
                'ideal_date' => $idealDate->toDateString(),
                'schedule_drift_days' => $resolution['drift_days'],
                'schedule_adjustment_reason' => $resolution['adjustment_reason'],
                'appointment_time' => $clinic->opening_time ?? '08:00:00',
                'appointment_type' => 'follow_up_vaccination',
                'dose_number' => $followUp['dose_number'],
                'status' => 'scheduled',
                'notes' => $noteText,
                'created_by' => $userId,
            ]);

            // ✨ Create in-app notification for linked mobile accounts
            $patient = \App\Models\Patient::with('accounts')->find($patientId);
            if ($patient && $patient->accounts->isNotEmpty()) {
                foreach ($patient->accounts as $account) {
                    $accId = $account->patient_account_id ?? $account->id;
                    $msg = $resolution['drift_days'] !== 0
                        ? "{$followUp['period']} vaccination scheduled for {$patient->name} on " . $resolvedDate->format('M d, Y') . " ({$resolution['adjustment_reason']})."
                        : "{$followUp['period']} vaccination scheduled for {$patient->name} on " . $resolvedDate->format('M d, Y') . ".";

                    \App\Models\Notification::create([
                        'patient_id' => $patientId,
                        'patient_account_id' => $accId,
                        'appointment_id' => $appt->appointment_id,
                        'type' => 'vaccination_reminder',
                        'message' => $msg,
                        'status' => 'pending',
                        'send_time' => now(),
                    ]);

                    \Illuminate\Support\Facades\Cache::forget("mobile:notifications:account:{$accId}:page:1");
                }
            }

            \Log::info("Created follow-up appointment for Patient #{$patientId}: {$followUp['period']} on {$resolvedDate->toDateString()} (Ideal: {$idealDate->toDateString()}, Drift: {$resolution['drift_days']})");
        }
    }

    /**
     * Calculate next working day (skip weekends and holidays)
     */
    private function calculateNextWorkingDay($date, $workingDays, $holidays)
    {
        $maxIterations = 30; // Prevent infinite loop
        $iterations = 0;

        while ($iterations < $maxIterations) {
            $dayOfWeek = $date->dayOfWeek; // 0=Sunday, 6=Saturday
            $dateString = $date->toDateString();

            // Check if it's a working day and not a holiday
            $isWorkingDay = in_array($dayOfWeek, $workingDays);
            $isHoliday = in_array($dateString, $holidays);

            if ($isWorkingDay && !$isHoliday) {
                return $date;
            }

            // Move to next day
            $date->addDay();
            $iterations++;
        }

        // If we can't find a working day in 30 days, just return the original date
        return $date;
    }
}

