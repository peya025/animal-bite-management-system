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
            $requestedBiteId = $request->get('bite_id');

            // Read the selected episode only.  The complete patient history is
            // returned separately as read-only reference data.
            $activeIncident = $requestedBiteId
                ? BiteIncident::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->findOrFail($requestedBiteId)
                : BiteIncident::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('status', '!=', 'completed')
                    ->latest('bite_id')
                    ->first();

            // All past historical records for this patient
            $allRecords = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->whereNotNull('dose_number')
                ->with(['administeredBy', 'inventory'])
                ->orderBy('dose_number')
                ->get();

            // Do not infer a new episode or booster from elapsed time.  A
            // selected incident is the sole treatment context.
            if ($activeIncident) {
                $activeRecords = $allRecords->filter(function ($r) use ($activeIncident) {
                    if ($r->bite_id === $activeIncident->bite_id) return true;
                    // Preserve legacy records where bite_id is null on primary episode
                    if (is_null($r->bite_id) && ((int) ($activeIncident->episode_number ?? 1) === 1)) {
                        return true;
                    }
                    return false;
                })->values();
            } else {
                $activeRecords = $allRecords;
            }

            // Get Tagoloan treatment card
            $card = TagoloanTreatmentCard::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->when($activeIncident, fn($q) => $q->where('bite_id', $activeIncident->bite_id))
                ->latest()
                ->first();

            if (!$card) {
                $card = TagoloanTreatmentCard::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->latest()
                    ->first();
            }

            return response()->json([
                'vaccination_records'  => $activeRecords,
                'past_history_records' => $allRecords,
                'is_returning_new_bite'=> (bool) ($activeIncident?->isReExposure()),
                'active_bite_incident' => $activeIncident,
                'tagoloan_card'        => $card,
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

            $request->merge(['bite_id' => $queue->bite_id]);
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
     * Get list of all administered vaccinations (Nurse Vaccine List)
     * GET /api/vaccination-records/administrations
     */
    public function getAdministrationList(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;

            $query = TreatmentRecord::where('treatment_records.clinic_id', $clinicId)
                ->whereNotNull('treatment_records.dose_number')
                ->where(function ($q) {
                    $q->where('treatment_records.status', 'completed')
                      ->orWhereNotNull('treatment_records.treatment_date')
                      ->orWhereNotNull('treatment_records.administered_at');
                })
                ->with([
                    'patient.details',
                    'administeredBy:id,name,role,professional_license_no,signature_path',
                    'inventory:inventory_id,batch_number,vaccine_type,doses_per_vial',
                    'biteIncident:bite_id,case_number,bite_date,severity,exposure_type,wound_description',
                ]);

            // Filter by patient search (name, ID, or case number)
            if ($request->filled('search')) {
                $search = trim($request->search);
                $query->where(function ($q) use ($search) {
                    $q->whereHas('patient', function ($pq) use ($search) {
                        $pq->where('first_name', 'like', "%{$search}%")
                           ->orWhere('last_name', 'like', "%{$search}%")
                           ->orWhere('patient_id', 'like', "%{$search}%");
                    })
                    ->orWhereHas('biteIncident', function ($bq) use ($search) {
                        $bq->where('case_number', 'like', "%{$search}%");
                    })
                    ->orWhere('treatment_records.batch_no', 'like', "%{$search}%");
                });
            }

            // Filter by vaccine brand or generic
            if ($request->filled('vaccine')) {
                $vaccine = trim($request->vaccine);
                $query->where(function ($q) use ($vaccine) {
                    $q->where('treatment_records.vaccine_brand', 'like', "%{$vaccine}%")
                      ->orWhere('treatment_records.vaccine_generic', 'like', "%{$vaccine}%");
                });
            }

            // Filter by dose number
            if ($request->filled('dose') && $request->dose !== 'all') {
                $query->where('treatment_records.dose_number', (int) $request->dose);
            }

            // Filter by exact date
            if ($request->filled('date')) {
                $query->whereDate('treatment_records.treatment_date', $request->date);
            }

            // Filter by date range
            if ($request->filled('date_from')) {
                $query->whereDate('treatment_records.treatment_date', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $query->whereDate('treatment_records.treatment_date', '<=', $request->date_to);
            }

            // Sort order: latest administration first
            $query->orderByDesc('treatment_records.treatment_date')
                  ->orderByDesc('treatment_records.administered_at')
                  ->orderByDesc('treatment_records.treatment_id');

            $perPage = min(100, max(5, (int) $request->input('per_page', 15)));
            $paginated = $query->paginate($perPage);

            // Compute usage details & format output
            $transformed = $paginated->getCollection()->map(function ($r) {
                $dpv = (int) ($r->inventory?->doses_per_vial ?? 3);
                if ($dpv <= 0) $dpv = 3;
                $units = (int) ($r->inventory_units_used ?? 0);
                $isExternal = (bool) $r->is_external;
                $isShared = ($units === 0 && !$isExternal);

                // Dose label (e.g. Day 0, Day 3, Booster 1)
                $doseMap = [0 => 'Day 0', 3 => 'Day 3', 7 => 'Day 7', 28 => 'Day 28', 90 => 'Booster 1', 365 => 'Booster 2'];
                $doseLabel = $doseMap[$r->dose_number] ?? "Dose {$r->dose_number}";

                // Extract dose index from notes if available (e.g. Dose 1 of 3)
                $doseIndex = 1;
                if (preg_match('/Dose\s+(\d+)\s+of\s+(\d+)/i', (string) ($r->administration_notes ?? $r->remarks), $matches)) {
                    $doseIndex = (int) $matches[1];
                } elseif ($isShared) {
                    $doseIndex = 2; // general shared
                }

                // Fraction string (e.g. "1/3 vial used")
                $fractionText = $isExternal 
                    ? 'External Clinic (0 vials)'
                    : ($dpv > 1 ? "1/{$dpv} vial" : '1 vial');

                // Severity / Diagnosis category
                $sev = strtolower((string) ($r->biteIncident?->severity ?? ''));
                $catMap = ['minor' => 'Category I', 'moderate' => 'Category II', 'severe' => 'Category III'];
                $diagnosisCategory = $catMap[$sev] ?? ($r->biteIncident?->severity ? ucfirst($r->biteIncident->severity) : 'Category II');

                $patient = $r->patient;
                $patientName = $patient 
                    ? trim("{$patient->last_name}, {$patient->first_name} " . ($patient->middle_name ?? ''))
                    : 'Unknown Patient';

                return [
                    'treatment_id' => $r->treatment_id,
                    'patient_id' => $r->patient_id,
                    'patient_name' => $patientName,
                    'patient_age' => $patient?->age ?? $patient?->details?->age,
                    'patient_gender' => $patient?->gender ?? $patient?->details?->gender,
                    'case_number' => $r->biteIncident?->case_number,
                    'vaccine_brand' => $r->vaccine_brand ?: ($r->vaccine_generic ?: 'Anti-Rabies Vaccine'),
                    'batch_no' => $r->batch_no ?: $r->inventory?->batch_number,
                    'dose_number' => $r->dose_number,
                    'dose_label' => $doseLabel,
                    'route' => $r->route ?: 'ID',
                    'injection_site' => $r->injection_site,
                    'treatment_date' => $r->treatment_date ? Carbon::parse($r->treatment_date)->format('Y-m-d') : null,
                    'administered_at' => $r->administered_at ? Carbon::parse($r->administered_at)->format('Y-m-d H:i:s') : null,
                    'administered_by_id' => $r->administered_by,
                    'administered_by_name' => $r->administeredBy?->name ?: 'Staff',
                    'administered_by_license' => $r->administeredBy?->professional_license_no,
                    'administered_by_signature' => $r->administeredBy?->signature_path,
                    'is_external' => $isExternal,
                    'external_facility_name' => $r->external_facility_name,
                    'doses_per_vial' => $dpv,
                    'inventory_units_used' => $units,
                    'is_shared' => $isShared,
                    'dose_index' => $doseIndex,
                    'fraction_used' => $fractionText,
                    'usage_badge' => $isExternal ? 'External' : ($isShared ? 'Shared Open Vial (0 deducted)' : 'New Vial Opened (1 deducted)'),
                    'diagnosis_category' => $diagnosisCategory,
                    'diagnosis_notes' => $r->biteIncident?->wound_description ?: $r->biteIncident?->remarks,
                    'remarks' => $r->remarks,
                    'administration_notes' => $r->administration_notes,
                ];
            });

            // Summary stats for clinic
            $today = Carbon::today()->toDateString();
            $totalCount = TreatmentRecord::where('clinic_id', $clinicId)->whereNotNull('dose_number')->count();
            $todayCount = TreatmentRecord::where('clinic_id', $clinicId)->whereNotNull('dose_number')->whereDate('treatment_date', $today)->count();
            $uniquePatients = TreatmentRecord::where('clinic_id', $clinicId)->whereNotNull('dose_number')->distinct('patient_id')->count('patient_id');

            return response()->json([
                'data' => $transformed,
                'total' => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'stats' => [
                    'total_administrations' => $totalCount,
                    'today_administrations' => $todayCount,
                    'unique_patients' => $uniquePatients,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Get administration list error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load administration list',
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

        $actingUser = $request->user();
        if (!$actingUser) {
            return response()->json([
                'message' => 'An authenticated staff account is required to record a vaccine administration.',
            ], 401);
        }

        // Signature guard — must check BEFORE opening any transaction
        if (empty($actingUser->signature_path)) {
            return response()->json([
                'message' => 'Your signature is not yet on file. Ask a clinic admin to complete your staff profile before administering doses.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $clinicId = $actingUser->clinic_id;
            $patientId = $request->patient_id;
            $biteId = $request->bite_id;
            $userId = $actingUser->id;
            // never manufacture an episode or attach a new dose to the latest
            // patient-wide case based on elapsed time.
            if (!$biteId && $request->filled('queue_id')) {
                $biteId = Queue::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('queue_id', $request->queue_id)
                    ->value('bite_id');
            }

            if (!$biteId) {
                throw ValidationException::withMessages([
                    'bite_id' => 'Select a Doctor-approved bite episode before recording treatment.',
                ]);
            }

            $treatmentIncident = BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->find($biteId);
            if (!$treatmentIncident || $treatmentIncident->isAwaitingAssessment()) {
                throw ValidationException::withMessages([
                    'bite_id' => 'This exposure is awaiting Doctor assessment and cannot be treated yet.',
                ]);
            }

            $planType = \App\Models\TreatmentPlan::where('clinic_id', $clinicId)
                ->where('bite_id', $biteId)
                ->value('plan_type');

            // If plan_type is missing but this episode is active and has a Doctor consultation, auto-heal as full_pep
            if (!$planType && $treatmentIncident && $treatmentIncident->status === 'active' && $treatmentIncident->isPrimary()) {
                $hasConsultation = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('bite_id', $biteId)
                    ->whereNull('dose_number')
                    ->exists();

                if ($hasConsultation) {
                    \App\Models\TreatmentPlan::updateOrCreate(
                        ['bite_id' => $biteId],
                        [
                            'clinic_id' => $clinicId,
                            'patient_id' => $patientId,
                            'plan_type' => 'full_pep',
                            'status' => 'approved',
                            'ordered_dose_days' => [0, 3, 7],
                            'doctor_decision_notes' => 'Primary series - approved from Doctor consultation.',
                            'decided_by' => $treatmentIncident->created_by ?? $userId,
                            'decided_at' => now(),
                        ]
                    );
                    $planType = 'full_pep';
                }
            }

            if (!in_array($planType, ['full_pep', 'single_booster', 'two_dose_booster'], true)) {
                throw ValidationException::withMessages([
                    'bite_id' => 'This episode has no Doctor-approved vaccine treatment order.',
                ]);
            }
            $hasNonDayZeroDose = collect($request->doses)->contains(function ($dose) {
                return !empty($dose['date'])
                    && !empty($dose['vaccine_type'])
                    && ($dose['period'] ?? '') !== 'Day 0';
            });
            if ($planType === 'single_booster' && $hasNonDayZeroDose) {
                throw ValidationException::withMessages([
                    'doses' => 'The Doctor ordered one booster only. No follow-up dose may be recorded for this incident.',
                ]);
            }
            if ($planType === 'two_dose_booster') {
                $hasInvalidBoosterDose = collect($request->doses)->contains(function ($dose) {
                    return !empty($dose['date'])
                        && !empty($dose['vaccine_type'])
                        && !in_array($dose['period'] ?? '', ['Day 0', 'Day 3'], true);
                });
                if ($hasInvalidBoosterDose) {
                    throw ValidationException::withMessages([
                        'doses' => 'The Doctor ordered a 2-dose booster regimen (Day 0 and Day 3). Day 7 is not indicated.',
                    ]);
                }
            }

            // Digital signature is optional. If staff has a digital signature on file,
            // it will be stamped on the record; otherwise, the dose is recorded and hand-signed on the printed card.

            // Map period names to dose numbers
            $periodMapping = [
                'Day 0' => 0,
                'Day 3' => 3,
                'Day 7' => 7,
                'Day 28' => 28,
                'Booster 1' => 90,  // Approximate day 90
                'Booster 2' => 365, // Approximate day 365
                'day_0' => 0,
                'day_3' => 3,
                'day_7' => 7,
                'day_28' => 28,
                'booster_1' => 90,
                'booster_2' => 365,
            ];

            $inventoryUsageService = app(VaccineInventoryUsageService::class);
            $savedDoseNumbers = []; // track which doses were actually saved this request

            // Process each dose
            foreach ($request->doses as $doseData) {
                // If this is a historical locked dose or missing vaccine type, do not touch inventory or re-insert
                if (empty($doseData['vaccine_type']) && empty($doseData['date'])) {
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

                // 22.2 — Prerequisite dose sequence validation
                // Enforce chronological order: Day 3 requires Day 0, Day 7 requires Day 3,
                // Day 28 requires Day 7. Booster 2 (day 365) requires Booster 1 (day 90).
                $prerequisiteMap = [
                    3   => 0,   // Day 3  → Day 0 must be completed
                    7   => 3,   // Day 7  → Day 3 must be completed
                    28  => 7,   // Day 28 → Day 7 must be completed
                    365 => 90,  // Booster 2 → Booster 1 must be completed
                ];
                $doseNumberToLabel = [
                    0   => 'Day 0',
                    3   => 'Day 3',
                    7   => 'Day 7',
                    28  => 'Day 28',
                    90  => 'Booster 1',
                    365 => 'Booster 2',
                ];

                if (isset($prerequisiteMap[$doseNumber])) {
                    $prereqDoseNumber = $prerequisiteMap[$doseNumber];
                    $prereqLabel      = $doseNumberToLabel[$prereqDoseNumber] ?? "Dose {$prereqDoseNumber}";
                    $currentLabel     = $doseNumberToLabel[$doseNumber] ?? "Dose {$doseNumber}";

                    $prereqCompleted = TreatmentRecord::where('clinic_id', $clinicId)
                        ->where('patient_id', $patientId)
                        ->where('bite_id', $biteId)
                        ->where('dose_number', $prereqDoseNumber)
                        ->where('status', 'completed')
                        ->whereNotNull('treatment_date')
                        ->exists();

                    // Also accept if the prerequisite is being submitted in the same request
                    if (!$prereqCompleted) {
                        $prereqInThisBatch = collect($request->doses)->contains(function ($d) use ($prereqDoseNumber, $periodMapping) {
                            return isset($periodMapping[$d['period']]) &&
                                   $periodMapping[$d['period']] === $prereqDoseNumber &&
                                   !empty($d['vaccine_type']) &&
                                   !empty($d['date']);
                        });
                        $prereqCompleted = $prereqInThisBatch;
                    }

                    if (!$prereqCompleted) {
                        throw ValidationException::withMessages([
                            'doses' => "Prerequisite dose [{$prereqLabel}] missing. {$currentLabel} cannot be recorded until {$prereqLabel} has been administered.",
                        ]);
                    }
                }

                if ($inventoryUnitsUsed < 0) {
                    throw ValidationException::withMessages([
                        'doses' => "Enter valid stock units (0 for shared open vial, or 1+ for new vial) for {$doseData['period']}.",
                    ]);
                }

                $existing = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('bite_id', $biteId)
                    ->where('dose_number', $doseNumber)
                    ->where(function ($q) {
                        // Prefer rows already linked to this dose's record,
                        // but skip auto-scheduled rows that haven't been administered yet
                        $q->whereNotNull('treatment_date')
                          ->orWhereNotNull('administered_at')
                          ->orWhereNull('scheduled_by'); // not system-auto-generated
                    })
                    ->whereNull('voided_at')
                    ->latest('treatment_id')
                    ->lockForUpdate()
                    ->first();

                $isExternal = !empty($doseData['is_external']);
                $externalFacility = trim((string) ($doseData['external_facility_name'] ?? ''));

                $remarks = $isExternal
                    ? trim($externalFacility ? "External facility: {$externalFacility}" : "External facility")
                    : ($inventoryUnitsUsed === 0 ? 'Shared Open Vial' : null);

                $treatmentData = [
                    'clinic_id' => $clinicId,
                    'patient_id' => $patientId,
                    'bite_id' => $biteId,
                    'dose_number' => $doseNumber,
                    'treatment_date' => $doseData['date'],
                    'scheduled_date' => $doseData['date'],
                    'route' => $doseData['route'] ?? null,
                    'signature' => $actingUser->signature_path,
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

                // Completed administrations are clinical history.  A repeated
                // form submission must not overwrite or re-deduct stock from
                // this episode (or any earlier one).
                if ($existing && ($existing->status === 'completed' || !empty($existing->treatment_date))) {
                    $savedDoseNumbers[] = $doseNumber;
                    continue;
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
                        'remarks' => trim(($remarks ?: '') . " | Dose {$usage['dose_index']} of {$usage['total_doses']}" . ($usage['is_shared'] ? ' (Shared Open Vial)' : ' (New Vial)')),
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
            $rawBody = is_array($request->body_part_affected)
                ? implode(', ', array_filter($request->body_part_affected))
                : ($request->body_part_affected ?? $request->body_part_exposed);
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
                'bite_id'            => $biteId,
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
            // Form 3 records administration for the already selected episode.
            // It must not edit its incident details or create a replacement case.
            $incident = $treatmentIncident;

            $planType = $incident
                ? \App\Models\TreatmentPlan::where('clinic_id', $clinicId)
                    ->where('bite_id', $incident->bite_id)
                    ->value('plan_type')
                : null;
            $isReExposure = $incident->isReExposure();
            if ($planType === 'full_pep') {
                $isReExposure = false;
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
                        ->where('bite_id', $biteId)
                        ->where('queue_date', Carbon::today()->toDateString())
                        ->whereIn('status', ['waiting', 'called', 'in_consultation', 'serving', 'second_chance', 'final_recall'])
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

                // Mark any scheduled or confirmed appointment for these doses as completed
                Appointment::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('bite_id', $biteId)
                    ->whereIn('status', ['scheduled', 'confirmed', 'missed'])
                    ->where(function ($q) use ($savedDoseNumbers) {
                        $q->whereIn('dose_number', $savedDoseNumbers)
                          ->orWhere(function ($sub) use ($savedDoseNumbers) {
                              $hasBoosterDose = in_array(90, $savedDoseNumbers) || in_array(365, $savedDoseNumbers) || in_array(100, $savedDoseNumbers) || in_array(101, $savedDoseNumbers);
                              if ($hasBoosterDose) {
                                  $sub->whereDate('scheduled_date', '<=', Carbon::today())
                                      ->where(function ($type) {
                                          $type->where('appointment_type', 'booster')
                                               ->orWhere('notes', 'like', '%booster%');
                                      });
                              } else {
                                  $sub->whereRaw('0 = 1');
                              }
                          })
                          ->orWhereNull('dose_number');
                    })
                    ->update(['status' => 'completed']);
            } // end: if doses were saved

            // ──────────────────────────────────────────────────────────────
            // ✨ RESET ANY FUTURE DOSE ROWS INCORRECTLY MARKED COMPLETED
            // Only doses that were actually administered today should be completed
            // ──────────────────────────────────────────────────────────────
            if (!empty($savedDoseNumbers)) {
                TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('bite_id', $biteId)
                    ->where('status', 'completed')
                    ->whereNotNull('dose_number')
                    ->whereNull('administered_at')   // not actually administered
                    ->whereNull('treatment_date')     // no treatment date recorded
                    ->update(['status' => 'scheduled']);

                // Also reset future scheduled dates that were wrongly completed
                TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('bite_id', $biteId)
                    ->where('status', 'completed')
                    ->whereNotNull('dose_number')
                    ->whereNotIn('dose_number', $savedDoseNumbers)
                    ->where('scheduled_date', '>', Carbon::today()->toDateString())
                    ->update(['status' => 'scheduled', 'treatment_date' => null, 'administered_at' => null]);
            }

            // ──────────────────────────────────────────────────────────────
            // ✨ AUTO-COMPLETE APPOINTMENTS FOR ADMINISTERED DOSES (Day 0, Day 3, 7, 28)
            // ──────────────────────────────────────────────────────────────
            if (!empty($savedDoseNumbers)) {
                Appointment::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('bite_id', $biteId)
                    ->whereIn('status', ['scheduled', 'confirmed', 'in_progress'])
                    ->where(function ($q) use ($savedDoseNumbers) {
                        $q->whereIn('dose_number', $savedDoseNumbers);
                        if (in_array(0, $savedDoseNumbers)) {
                            $q->orWhereNull('dose_number')
                              ->orWhere('appointment_type', 'consultation');
                        }
                    })
                    ->update([
                        'status' => 'completed',
                    ]);
            }

            // Task 3.2: Transition BiteIncident to 'completed' if regimen finished
            if ($biteId) {
                $incident = BiteIncident::find($biteId);
                if ($incident && $incident->status !== 'completed') {
                    $planType = \App\Models\TreatmentPlan::where('clinic_id', $clinicId)
                        ->where('bite_id', $incident->bite_id)
                        ->value('plan_type');
                    $isBooster = $incident->isReExposure();
                    if ($planType === 'single_booster' && in_array(0, $savedDoseNumbers)) {
                        $incident->update(['status' => 'completed']);
                    } elseif ($isBooster && in_array(3, $savedDoseNumbers)) {
                        $incident->update(['status' => 'completed']);
                    } elseif (!$isBooster && in_array(7, $savedDoseNumbers)) {
                        $incident->update(['status' => 'completed']);
                    }
                }
            }

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
            $pastDay0 = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $biteId)
                ->where('dose_number', 0)
                ->where('status', 'completed')
                ->whereNotNull('treatment_date')
                ->latest('treatment_date')
                ->first();
            if ($pastDay0) {
                $day0Date = \Carbon\Carbon::parse($pastDay0->treatment_date);
                $hasDay0 = true;
            } else {
                return; // No Day 0 recorded anywhere for this episode, skip appointment creation
            }
        }

        $scheduleService = app(ClinicScheduleService::class);
        $clinic = \App\Models\Clinic::find($clinicId);

        $treatmentPlan = !empty($biteId)
            ? \App\Models\TreatmentPlan::where('clinic_id', $clinicId)
                ->where('bite_id', $biteId)
                ->first()
            : null;

        // A one-booster plan is intentionally a single Station 1 visit. Do not
        // infer a Day 3 appointment from the episode type or previous history.
        if ($treatmentPlan?->plan_type === 'single_booster') {
            \App\Models\Appointment::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $biteId)
                ->where('dose_number', '>', 0)
                ->whereIn('status', ['scheduled', 'confirmed', 'missed'])
                ->update([
                    'status' => 'cancelled',
                    'notes' => 'Cancelled: Doctor ordered a single-booster plan.',
                ]);
            return;
        }

        $isReExposure = false;
        if (!empty($biteId)) {
            $incident = \App\Models\BiteIncident::find($biteId);
            $isReExposure = $incident && $incident->isReExposure();
        }
        if ($treatmentPlan?->plan_type === 'full_pep') {
            $isReExposure = false;
        }

        // Define follow-up schedule (2-Dose Booster for re-exposure vs Standard PEP)
        if ($isReExposure) {
            $schedule = [
                ['period' => 'Day 3', 'days_after' => 3, 'dose_number' => 3],
            ];
            $doseIntervals = [
                3 => 3,
            ];
            // Cancel any residual Days 7/28 appointments for this episode if re-exposure
            Appointment::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $biteId)
                ->whereIn('dose_number', [7, 28, 90, 365])
                ->where('status', 'scheduled')
                ->update(['status' => 'cancelled', 'notes' => 'Cancelled: Re-exposure 2-Dose Booster protocol completed']);
        } else {
            // DOH NRPCP 2-Site Intradermal (ID) Standard Primary PEP: strictly Day 3 and Day 7
            $schedule = [
                ['period' => 'Day 3', 'days_after' => 3, 'dose_number' => 3],
                ['period' => 'Day 7', 'days_after' => 7, 'dose_number' => 7],
            ];
            $doseIntervals = [
                3 => 3, // 3 days after Day 0
                7 => 4, // 4 days after Day 3
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

            if (!$alreadyGiven) {
                $completedDose = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('bite_id', $biteId)
                    ->where('dose_number', $doseNum)
                    ->where('status', 'completed')
                    ->whereNotNull('treatment_date')
                    ->first();
                if ($completedDose) {
                    $alreadyGiven = true;
                    $previousResolvedDate = Carbon::parse($completedDose->treatment_date);
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
            $resolvedDate = $resolution['scheduled_date'];

            // Update tracker for next iteration
            $previousResolvedDate = $resolvedDate->copy();

            $noteText = $resolution['drift_days'] !== 0
                ? "Auto-scheduled: {$followUp['period']} dose ({$resolution['adjustment_reason']})"
                : "Auto-scheduled: {$followUp['period']} dose";

            // Check if appointment already exists for this episode
            $existing = \App\Models\Appointment::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $biteId)
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

    /**
     * Void an administered treatment record with audit reason.
     * POST /api/vaccination-records/{id}/void
     */
    public function voidRecord(Request $request, $id)
    {
        $request->validate([
            'void_reason' => 'required|string|min:5|max:1000',
        ]);

        $clinicId = $request->user()->clinic_id;

        // Fetch before opening transaction so early exits don't leave orphaned transactions
        $record = TreatmentRecord::where('clinic_id', $clinicId)->findOrFail($id);

        if ($record->voided_at) {
            return response()->json([
                'message' => 'This treatment record has already been voided.',
            ], 400);
        }

        DB::beginTransaction();
        try {
            $record->update([
                'voided_at'   => now(),
                'voided_by'   => $request->user()->id,
                'void_reason' => $request->void_reason,
            ]);

            \App\Models\AuditLog::log('voided', 'TreatmentRecord', $record->treatment_id, [
                'description' => "Treatment Record #{$record->treatment_id} (Dose {$record->dose_number}) voided by {$request->user()->name}: {$request->void_reason}",
                'metadata' => [
                    'patient_id'  => $record->patient_id,
                    'dose_number' => $record->dose_number,
                    'void_reason' => $request->void_reason,
                ],
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'message' => 'Treatment record voided successfully.',
            'record'  => $record->fresh()->load(['administeredBy', 'voidedBy']),
        ]);
    }
}
