<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;

use App\Http\Requests\Vaccination\StoreVaccinationRecordRequest;
use App\Http\Requests\Vaccination\VoidRecordRequest;
use App\Models\BiteIncident;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\TagoloanTreatmentCard;
use App\Models\TreatmentRecord;
use App\Services\VaccinationRecordService;
use App\Services\VaccineInventoryUsageService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class VaccinationRecordController extends Controller
{
    public function __construct(
        private readonly VaccinationRecordService     $vaccinationRecordService,
        private readonly VaccineInventoryUsageService $inventoryUsageService,
    ) {}

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/vaccination-records/patient/{patientId}
    // ────────────────────────────────────────────────────────────────────────
    public function getByPatient(Request $request, int $patientId): JsonResponse
    {
        $clinicId        = $request->user()->clinic_id;
        $requestedBiteId = $request->get('bite_id');

        $activeIncident = $requestedBiteId
            ? BiteIncident::where('clinic_id', $clinicId)->where('patient_id', $patientId)->findOrFail($requestedBiteId)
            : BiteIncident::where('clinic_id', $clinicId)->where('patient_id', $patientId)
                ->where('status', '!=', 'completed')->latest('bite_id')->first();

        $activeIncident?->loadMissing('intake');

        $allRecords = TreatmentRecord::where('clinic_id', $clinicId)->where('patient_id', $patientId)
            ->whereNotNull('dose_number')->with(['administeredBy', 'inventory'])->orderBy('dose_number')->get();

        $activeRecords = $activeIncident
            ? $allRecords->filter(fn($r) =>
                $r->bite_id === $activeIncident->bite_id ||
                (is_null($r->bite_id) && ((int) ($activeIncident->episode_number ?? 1) === 1))
            )->values()
            : $allRecords;

        $card = TagoloanTreatmentCard::where('clinic_id', $clinicId)->where('patient_id', $patientId)
            ->when($activeIncident, fn($q) => $q->where('bite_id', $activeIncident->bite_id))->latest()->first();

        if (!$card && !$activeIncident) {
            $card = TagoloanTreatmentCard::where('clinic_id', $clinicId)->where('patient_id', $patientId)->latest()->first();
        }
        if ($card && $activeIncident) {
            $card->setRelation('biteIncident', $activeIncident);
        }

        return response()->json([
            'prophylaxis_records'  => $activeIncident
                ? TreatmentRecord::where('clinic_id', $clinicId)->where('patient_id', $patientId)
                    ->where('bite_id', $activeIncident->bite_id)
                    ->where(fn($q) => $q->whereNotNull('medication_given')->orWhereIn('dose_number', [200, 201, 300, 400, 401]))
                    ->where('status', 'completed')->live()->with('administeredBy')->get()
                    ->map(function ($r) {
                        $r->medication_given ??= [200 => 'ERIG', 201 => 'HRIG', 300 => 'TT', 400 => 'ATS', 401 => 'TIG'][$r->dose_number] ?? null;
                        return $r;
                    })
                : [],
            'vaccination_records'  => $activeRecords,
            'past_history_records' => $allRecords,
            'is_returning_new_bite' => (bool) ($activeIncident?->isReExposure()),
            'active_bite_incident' => $activeIncident,
            'tagoloan_card'        => $card,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/vaccination-records/queue/{queueId}
    // ────────────────────────────────────────────────────────────────────────
    public function getByQueue(Request $request, int $queueId): JsonResponse
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)->findOrFail($queueId);
        $request->merge(['bite_id' => $queue->bite_id]);
        return $this->getByPatient($request, (int) $queue->patient_id);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/vaccination-records/administrations
    // ────────────────────────────────────────────────────────────────────────
    public function getAdministrationList(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;

        $query = TreatmentRecord::where('treatment_records.clinic_id', $clinicId)
            ->whereNotNull('treatment_records.dose_number')
            ->where(fn($q) =>
                $q->where('treatment_records.status', 'completed')
                  ->orWhereNotNull('treatment_records.treatment_date')
                  ->orWhereNotNull('treatment_records.administered_at')
            )
            ->with([
                'patient.details',
                'administeredBy:id,name,role,professional_license_no,signature_path',
                'inventory:inventory_id,batch_number,vaccine_type,doses_per_vial',
                'biteIncident:bite_id,case_number,bite_date,severity,exposure_type,wound_description',
            ]);

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(fn($q) =>
                $q->whereHas('patient', fn($pq) =>
                    $pq->where('first_name', 'like', "%{$search}%")
                       ->orWhere('last_name',  'like', "%{$search}%")
                       ->orWhere('patient_id', 'like', "%{$search}%")
                )->orWhereHas('biteIncident', fn($bq) =>
                    $bq->where('case_number', 'like', "%{$search}%")
                )->orWhere('treatment_records.batch_no', 'like', "%{$search}%")
            );
        }
        if ($request->filled('vaccine')) {
            $vaccine = trim($request->vaccine);
            $query->where(fn($q) =>
                $q->where('treatment_records.vaccine_brand',   'like', "%{$vaccine}%")
                  ->orWhere('treatment_records.vaccine_generic','like', "%{$vaccine}%")
            );
        }
        if ($request->filled('dose') && $request->dose !== 'all') {
            $query->where('treatment_records.dose_number', (int) $request->dose);
        }
        if ($request->filled('date')) {
            $query->whereDate('treatment_records.treatment_date', $request->date);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('treatment_records.treatment_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('treatment_records.treatment_date', '<=', $request->date_to);
        }

        $query->orderByDesc('treatment_records.treatment_date')
              ->orderByDesc('treatment_records.administered_at')
              ->orderByDesc('treatment_records.treatment_id');

        $perPage   = min(100, max(5, (int) $request->input('per_page', 15)));
        $paginated = $query->paginate($perPage);

        $doseMap  = [0 => 'Day 0', 3 => 'Day 3', 7 => 'Day 7', 28 => 'Day 28', 90 => 'Booster 1', 365 => 'Booster 2'];
        $catMap   = ['minor' => 'Category I', 'moderate' => 'Category II', 'severe' => 'Category III'];

        $transformed = $paginated->getCollection()->map(function ($r) use ($doseMap, $catMap) {
            $dpv        = max(1, (int) ($r->inventory?->doses_per_vial ?? 3));
            $units      = (int) ($r->inventory_units_used ?? 0);
            $isExternal = (bool) $r->is_external;
            $isShared   = ($units === 0 && !$isExternal);

            $doseLabel  = $doseMap[$r->dose_number] ?? "Dose {$r->dose_number}";
            $doseIndex  = 1;
            if (preg_match('/Dose\s+(\d+)\s+of\s+(\d+)/i', (string) ($r->administration_notes ?? $r->remarks), $matches)) {
                $doseIndex = (int) $matches[1];
            } elseif ($isShared) {
                $doseIndex = 2;
            }

            $sev              = strtolower((string) ($r->biteIncident?->severity ?? ''));
            $patientName      = $r->patient
                ? trim("{$r->patient->last_name}, {$r->patient->first_name} " . ($r->patient->middle_name ?? ''))
                : 'Unknown Patient';

            return [
                'treatment_id'              => $r->treatment_id,
                'patient_id'                => $r->patient_id,
                'patient_name'              => $patientName,
                'patient_age'               => $r->patient?->age ?? $r->patient?->details?->age,
                'patient_gender'            => $r->patient?->gender ?? $r->patient?->details?->gender,
                'case_number'               => $r->biteIncident?->case_number,
                'vaccine_brand'             => $r->vaccine_brand ?: ($r->vaccine_generic ?: 'Anti-Rabies Vaccine'),
                'batch_no'                  => $r->batch_no ?: $r->inventory?->batch_number,
                'dose_number'               => $r->dose_number,
                'dose_label'                => $doseLabel,
                'route'                     => $r->route ?: 'ID',
                'injection_site'            => $r->injection_site,
                'treatment_date'            => $r->treatment_date ? Carbon::parse($r->treatment_date)->format('Y-m-d') : null,
                'administered_at'           => $r->administered_at ? Carbon::parse($r->administered_at)->format('Y-m-d H:i:s') : null,
                'administered_by_id'        => $r->administered_by,
                'administered_by_name'      => $r->administeredBy?->name ?: 'Staff',
                'administered_by_license'   => $r->administeredBy?->professional_license_no,
                'administered_by_signature' => $r->signature,
                'is_external'               => $isExternal,
                'external_facility_name'    => $r->external_facility_name,
                'doses_per_vial'            => $dpv,
                'inventory_units_used'      => $units,
                'is_shared'                 => $isShared,
                'dose_index'                => $doseIndex,
                'fraction_used'             => $isExternal ? 'External Clinic (0 vials)' : ($dpv > 1 ? "1/{$dpv} vial" : '1 vial'),
                'usage_badge'               => $isExternal ? 'External' : ($isShared ? 'Shared Open Vial (0 deducted)' : 'New Vial Opened (1 deducted)'),
                'diagnosis_category'        => $catMap[$sev] ?? ($r->biteIncident?->severity ? ucfirst($r->biteIncident->severity) : 'Category II'),
                'diagnosis_notes'           => $r->biteIncident?->wound_description ?: $r->biteIncident?->remarks,
                'remarks'                   => $r->remarks,
                'administration_notes'      => $r->administration_notes,
            ];
        });

        $today          = Carbon::today()->toDateString();
        $totalCount     = TreatmentRecord::where('clinic_id', $clinicId)->whereNotNull('dose_number')->count();
        $todayCount     = TreatmentRecord::where('clinic_id', $clinicId)->whereNotNull('dose_number')->whereDate('treatment_date', $today)->count();
        $uniquePatients = TreatmentRecord::where('clinic_id', $clinicId)->whereNotNull('dose_number')->distinct('patient_id')->count('patient_id');

        return response()->json([
            'data'         => $transformed,
            'total'        => $paginated->total(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
            'per_page'     => $paginated->perPage(),
            'stats'        => [
                'total_administrations' => $totalCount,
                'today_administrations' => $todayCount,
                'unique_patients'       => $uniquePatients,
            ],
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/vaccination-records  (Form 3 save)
    // ────────────────────────────────────────────────────────────────────────
    public function store(StoreVaccinationRecordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Cross-field business guards (kept in controller per plan rules — no behaviour change)
        foreach ($validated['doses'] as $dose) {
            if (!empty($dose['vaccine_type']) && \App\Services\ProphylaxisService::inventoryMedication($dose['vaccine_type'])) {
                throw ValidationException::withMessages(['doses' => 'ATS, TT and ERIG must be recorded under prescribed prophylaxis, not as a rabies vaccine dose.']);
            }
        }
        if (collect($validated['additional_meds'] ?? [])->contains(fn($given) => (bool) $given)) {
            throw ValidationException::withMessages(['additional_meds' => 'Use the prescribed prophylaxis administration fields, including dose, date, batch and site.']);
        }
        if (empty($validated['doses']) && empty($validated['prophylaxis_administrations'])) {
            throw ValidationException::withMessages(['doses' => 'Record a vaccine dose or a prescribed prophylaxis administration before saving.']);
        }

        $actingUser = $request->user();

        if ($actingUser->isTriage() && !$actingUser->isAdmin() && !$actingUser->isNursing()) {
            return response()->json([
                'message' => 'Unauthorized. Triage doctors are not permitted to record vaccine doses (Form 3). Dose administration is strictly reserved for the Treatment Nurse.',
            ], 403);
        }

        // Resolve bite_id from queue when not directly supplied
        $biteId = $request->bite_id;
        if (!$biteId && $request->filled('queue_id')) {
            $biteId = Queue::where('clinic_id', $actingUser->clinic_id)
                ->where('patient_id', $request->patient_id)
                ->where('queue_id', $request->queue_id)
                ->value('bite_id');
        }
        if (!$biteId) {
            throw ValidationException::withMessages([
                'bite_id' => 'Select a Doctor-approved bite episode before recording treatment.',
            ]);
        }

        $treatmentIncident = BiteIncident::where('clinic_id', $actingUser->clinic_id)
            ->where('patient_id', $request->patient_id)
            ->find($biteId);
        if ($treatmentIncident) {
            $isCat1 = ($treatmentIncident->exposure_category === 'I' || $treatmentIncident->severity === 'minor');
            if ($isCat1) {
                $hasRabiesDose = collect($validated['doses'] ?? [])->contains(fn($d) => !empty($d['date']) && !empty($d['vaccine_type']));
                if ($hasRabiesDose) {
                    throw ValidationException::withMessages([
                        'doses' => 'Rabies vaccine doses cannot be administered for Category I exposures.',
                    ]);
                }
            }
        }

        // Resolve signature
        $signaturePath = null;
        if ($request->boolean('apply_signature')) {
            // Lock the user row to serialize signature validation
            $lockedUser    = \App\Models\User::whereKey($actingUser->id)->lockForUpdate()->firstOrFail();
            $signaturePath = $lockedUser->signature_path;
            if (
                !$signaturePath
                || $request->input('signature_version') !== $signaturePath
                || !app(\App\Services\StaffSignatureService::class)->available($signaturePath)
            ) {
                throw ValidationException::withMessages([
                    'signature_version' => 'Your signature changed or is unavailable. Refresh the preview or save without a signature.',
                ]);
            }
        }

        return $this->vaccinationRecordService->saveVaccinationRecords(
            actingUser:    $actingUser,
            clinicId:      $actingUser->clinic_id,
            patientId:     (int) $request->patient_id,
            biteId:        (int) $biteId,
            validated:     $validated,
            doses:         $request->doses,
            signaturePath: $signaturePath,
        );
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/vaccination-records/{id}
    // ────────────────────────────────────────────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $record = TreatmentRecord::where('clinic_id', $request->user()->clinic_id)
            ->where('treatment_id', $id)
            ->with(['patient', 'biteIncident', 'administeredBy', 'inventory'])
            ->firstOrFail();

        return response()->json($record);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DELETE /api/vaccination-records/{id}
    // ────────────────────────────────────────────────────────────────────────
    public function destroy(Request $request, int $id): JsonResponse
    {
        $record = TreatmentRecord::where('clinic_id', $request->user()->clinic_id)
            ->where('treatment_id', $id)->firstOrFail();

        $record->delete();

        return response()->json(['message' => 'Vaccination record deleted successfully']);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/vaccination-records/{id}/void
    // ────────────────────────────────────────────────────────────────────────
    public function voidRecord(VoidRecordRequest $request, int $id): JsonResponse
    {
        $record = TreatmentRecord::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);

        if ($record->voided_at) {
            return response()->json(['message' => 'This treatment record has already been voided.'], 400);
        }

        DB::beginTransaction();
        try {
            $record->update([
                'voided_at'   => now(),
                'voided_by'   => $request->user()->id,
                'void_reason' => $request->validated('void_reason'),
            ]);

            \App\Models\AuditLog::log('voided', 'TreatmentRecord', $record->treatment_id, [
                'description' => "Treatment Record #{$record->treatment_id} (Dose {$record->dose_number}) voided by {$request->user()->name}: {$request->validated('void_reason')}",
                'metadata'    => [
                    'patient_id'  => $record->patient_id,
                    'dose_number' => $record->dose_number,
                    'void_reason' => $request->validated('void_reason'),
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
