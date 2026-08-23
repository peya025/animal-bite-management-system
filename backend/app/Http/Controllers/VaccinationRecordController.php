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
                    ->when($biteId, function ($query) use ($biteId) {
                        return $query->where('bite_id', $biteId);
                    })
                    ->first();

                if ($existing && $existing->inventory_id) {
                    $existingType = trim((string) ($existing->vaccine_brand ?? $existing->vaccine_generic ?? ''));
                    $existingUnits = (int) ($existing->inventory_units_used ?? 0);

                    if ($existingType !== '' && $existingType !== $selectedVaccineType) {
                        throw ValidationException::withMessages([
                            'doses' => "{$doseData['period']} is already linked to {$existingType}. Delete and recreate the dose if you need a different vaccine type.",
                        ]);
                    }

                    if ($existingUnits >= 0 && $existingUnits !== $inventoryUnitsUsed) {
                        throw ValidationException::withMessages([
                            'doses' => "{$doseData['period']} is already recorded with {$existingUnits} inventory unit(s). Delete and recreate the dose to change stock usage.",
                        ]);
                    }
                }

                $baseRemarks = 'Given by: ' . ($doseData['given_by'] ?? '');
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
                    'vaccine_brand' => $selectedVaccineType,
                    'vaccine_generic' => $selectedVaccineType,
                    'inventory_units_used' => $inventoryUnitsUsed,
                    'remarks' => trim($baseRemarks . ' | Inventory units used: ' . $inventoryUnitsUsed . ($inventoryUnitsUsed === 0 ? ' (Shared Open Vial)' : '')),
                ];

                $record = $existing;
                if ($record) {
                    $record->update($treatmentData);
                } else {
                    $record = TreatmentRecord::create($treatmentData);
                }

                if (!$record->inventory_id) {
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

            // ── Auto-complete queue: mark patient's treatment queue entry as done ──
            // Use queue_id if provided; otherwise find today's vaccination/treatment queue entry
            $queueEntry = null;
            if (!empty($request->queue_id)) {
                $queueEntry = Queue::where('clinic_id', $clinicId)
                    ->find($request->queue_id);
            }
            if (!$queueEntry) {
                $queueEntry = Queue::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('queue_date', Carbon::today()->toDateString())
                    ->whereIn('status', ['waiting', 'called', 'serving', 'in_consultation'])
                    ->whereIn('visit_type', ['vaccination', 'observation'])
                    ->whereNull('deleted_at')
                    ->latest('queue_id')
                    ->first();
            }

            if ($queueEntry) {
                // Log history before updating (mirrors QueueController::complete())
                \App\Models\QueueHistory::create([
                    'queue_id'     => $queueEntry->queue_id,
                    'clinic_id'    => $queueEntry->clinic_id,
                    'patient_id'   => $queueEntry->patient_id,
                    'action'       => 'completed',
                    'from_status'  => $queueEntry->status,
                    'to_status'    => 'completed',
                    'call_count'   => $queueEntry->call_count ?? 0,
                    'performed_by' => $userId,
                    'notes'        => 'Form 3 saved — treatment/vaccination completed.',
                    'occurred_at'  => now(),
                ]);

                $queueEntry->update([
                    'status'             => 'completed',
                    'completed_at'       => now(),
                    'consultation_notes' => 'Form 3 saved — treatment/vaccination completed.',
                ]);

                // Flush queue cache so the display reflects completion immediately
                Cache::forget("web:queue:clinic:{$clinicId}:date:" . Carbon::today()->toDateString());
            }

            // ──────────────────────────────────────────────────────────────
            // ✨ AUTO-CREATE FOLLOW-UP APPOINTMENTS (Day 3, 7, 28, etc.)
            // ──────────────────────────────────────────────────────────────
            $this->createFollowUpAppointments($request, $clinicId, $patientId, $biteId, $userId);

            // Ensure BiteIncident exists for patient so vaccination shows on Bite Map
            $incident = BiteIncident::where('patient_id', $patientId)->first();
            if (!$incident) {
                $patientObj = Patient::with('details')->find($patientId);
                if ($patientObj) {
                    $street = $patientObj->details->address_purok ?? $patientObj->address_purok ?? 'Zone 1';
                    $brgy = $patientObj->details->address_barangay ?? $patientObj->address_barangay ?? 'Poblacion';
                    $mun = $patientObj->details->address_municipality ?? $patientObj->address_municipality ?? 'Claveria';
                    $bitePlace = "{$street}, {$brgy}, {$mun}";

                    BiteIncident::create([
                        'clinic_id' => $clinicId,
                        'patient_id' => $patientId,
                        'bite_date' => now()->toDateString(),
                        'bite_place' => $bitePlace,
                        'exposure_type' => 'bite',
                        'severity' => 'moderate',
                        'animal_type' => 'dog',
                        'status' => 'completed',
                        'created_by' => $userId,
                    ]);
                }
            } else {
                $incident->update(['status' => 'completed']);
            }

            Cache::forget("web:bite-cases:map-data:clinic:{$clinicId}");

            DB::commit();

            return response()->json([
                'message' => 'Vaccination records saved successfully',
                'records_count' => count($request->doses),
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

        // Get clinic schedule information
        $clinic = \App\Models\Clinic::find($clinicId);
        $workingDays = $clinic->working_days ?? [1, 2, 3, 4, 5]; // Default Mon-Fri
        $holidays = $clinic->holiday_dates ?? [];

        // Define follow-up schedule (WHO Essen Regimen)
        $schedule = [
            ['period' => 'Day 3', 'days_after' => 3, 'dose_number' => 3],
            ['period' => 'Day 7', 'days_after' => 7, 'dose_number' => 7],
            ['period' => 'Day 28', 'days_after' => 28, 'dose_number' => 28],
            ['period' => 'Booster 1', 'days_after' => 90, 'dose_number' => 90],
            ['period' => 'Booster 2', 'days_after' => 365, 'dose_number' => 365],
        ];

        foreach ($schedule as $followUp) {
            // Check if dose was already given in this submission
            $alreadyGiven = false;
            foreach ($request->doses as $dose) {
                if (!empty($dose['date']) && $dose['period'] === $followUp['period']) {
                    $alreadyGiven = true;
                    break;
                }
            }

            if ($alreadyGiven) {
                continue; // Skip if dose already given
            }

            // Calculate appointment date (skip weekends and holidays)
            $appointmentDate = $this->calculateNextWorkingDay(
                $day0Date->copy()->addDays($followUp['days_after']),
                $workingDays,
                $holidays
            );

            // Check if appointment already exists
            $existing = \App\Models\Appointment::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('dose_number', $followUp['dose_number'])
                ->where('status', '!=', 'cancelled')
                ->first();

            if ($existing) {
                continue; // Skip if appointment already exists
            }

            // Create appointment
            \App\Models\Appointment::create([
                'clinic_id' => $clinicId,
                'patient_id' => $patientId,
                'bite_id' => $biteId,
                'appointment_date' => $appointmentDate->toDateString(),
                'appointment_time' => $clinic->opening_time ?? '08:00:00',
                'appointment_type' => 'follow_up_vaccination',
                'dose_number' => $followUp['dose_number'],
                'status' => 'scheduled',
                'notes' => "Auto-scheduled: {$followUp['period']} dose",
                'created_by' => $userId,
            ]);

            \Log::info("Created follow-up appointment for Patient #{$patientId}: {$followUp['period']} on {$appointmentDate->toDateString()}");
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

