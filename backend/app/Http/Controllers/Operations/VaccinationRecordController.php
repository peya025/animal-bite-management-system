<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Concerns\EnforcesStationCapabilities;
use App\Http\Controllers\Controller;
use App\Http\Requests\Vaccination\StoreVaccinationRecordRequest;
use App\Http\Requests\Vaccination\VoidRecordRequest;
use App\Models\BiteIncident;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\TagoloanTreatmentCard;
use App\Models\TreatmentRecord;
use App\Models\VaccineVial;
use App\Models\VaccineVialWastage;
use App\Services\Clinic\StationCapabilityPolicy;
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
    use EnforcesStationCapabilities;

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
            : (BiteIncident::where('clinic_id', $clinicId)->where('patient_id', $patientId)
                ->where('status', '!=', 'completed')->latest('bite_id')->first()
                ?? BiteIncident::where('clinic_id', $clinicId)->where('patient_id', $patientId)
                    ->latest('bite_id')->first());

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
                    ->whereIn('status', ['completed', 'cancelled'])->live()->with('administeredBy')->get()
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
                'inventory:inventory_id,batch_number,vaccine_type,doses_per_vial,expiration_date,status',
                'vial.inventory:inventory_id,batch_number,vaccine_type,expiration_date,status',
                'vial.openedBy:id,name',
                'vial.expiredBy:id,name',
                'vial.disposedBy:id,name',
                'vial.wastages.disposedBy:id,name',
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
                )->orWhereHas('vial', fn($vq) =>
                    $vq->where('vial_code', 'like', "%{$search}%")
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
        if ($request->filled('vial_status') && $request->vial_status !== 'all') {
            $vialStatus = $request->vial_status;
            if ($vialStatus === VaccineVial::STATUS_OPENED) {
                $query->whereHas('vial', fn($vq) =>
                    $vq->where('status', VaccineVial::STATUS_OPENED)
                       ->where(fn($tq) => $tq->whereNull('use_by_at')->orWhere('use_by_at', '>', now()))
                );
            } elseif ($vialStatus === VaccineVial::STATUS_EXPIRED) {
                $query->whereHas('vial', fn($vq) =>
                    $vq->where('status', VaccineVial::STATUS_EXPIRED)
                       ->orWhere(fn($oq) =>
                           $oq->where('status', VaccineVial::STATUS_OPENED)
                              ->whereNotNull('use_by_at')
                              ->where('use_by_at', '<=', now())
                       )
                );
            } elseif ($vialStatus === VaccineVial::STATUS_DEPLETED) {
                $query->whereHas('vial', fn($vq) => $vq->where('status', VaccineVial::STATUS_DEPLETED));
            } elseif ($vialStatus === VaccineVial::STATUS_DISPOSED) {
                $query->whereHas('vial', fn($vq) => $vq->where('status', VaccineVial::STATUS_DISPOSED));
            } elseif ($vialStatus === 'external') {
                $query->where('treatment_records.is_external', true);
            } elseif ($vialStatus === 'unlinked') {
                $query->whereNull('treatment_records.vial_id')
                      ->where(fn($eq) => $eq->whereNull('treatment_records.is_external')->orWhere('treatment_records.is_external', false));
            }
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
            $units      = (int) ($r->inventory_units_used ?? 0);
            $isExternal = (bool) $r->is_external;
            $vial       = $r->vial;
            $isShared   = ($units === 0 && !$isExternal);

            $doseLabel = $doseMap[$r->dose_number] ?? "Dose {$r->dose_number}";

            if ($vial) {
                $dpv       = max(1, (int) $vial->total_portions);
                $doseIndex = (int) ($r->vial_portion_number ?? 1);
            } else {
                $parsedTotal = null;
                $doseIndex   = null;
                if (preg_match('/Dose\s+(\d+)\s+of\s+(\d+)/i', (string) ($r->administration_notes ?? $r->remarks), $matches)) {
                    $doseIndex   = (int) $matches[1];
                    $parsedTotal = (int) $matches[2];
                }
                $dpv = $parsedTotal ?? ($r->inventory?->doses_per_vial ? max(1, (int) $r->inventory->doses_per_vial) : null);
            }

            $sev         = strtolower((string) ($r->biteIncident?->severity ?? ''));
            $patientName = $r->patient
                ? trim("{$r->patient->last_name}, {$r->patient->first_name} " . ($r->patient->middle_name ?? ''))
                : 'Unknown Patient';

            $vialPayload = null;
            if ($vial) {
                $effectiveStatus = $vial->effective_status;
                $vialPayload     = [
                    'vial_id'               => $vial->vial_id,
                    'vial_code'             => $vial->vial_code ?: "V-{$vial->vial_id}",
                    'inventory_id'          => $vial->inventory_id,
                    'vaccine_type'          => $vial->vaccine_type,
                    'batch_number'          => $vial->batch_number,
                    'total_portions'        => (int) $vial->total_portions,
                    'administered_portions' => (int) $vial->administered_portions,
                    'discarded_portions'    => (int) $vial->discarded_portions,
                    'available_portions'    => (int) $vial->available_portions,
                    'undisposed_portions'   => (int) $vial->undisposed_portions,
                    'status'                => $vial->status,
                    'effective_status'      => $effectiveStatus,
                    'is_expired'            => $effectiveStatus === VaccineVial::STATUS_EXPIRED,
                    'is_disposed'           => $effectiveStatus === VaccineVial::STATUS_DISPOSED,
                    'open_vial_hours'       => $vial->open_vial_hours,
                    'opened_at'             => $vial->opened_at?->format('Y-m-d H:i:s'),
                    'use_by_at'             => $vial->use_by_at?->format('Y-m-d H:i:s'),
                    'opened_by_name'        => $vial->openedBy?->name,
                    'expired_at'            => $vial->expired_at?->format('Y-m-d H:i:s'),
                    'expired_by_name'       => $vial->expiredBy?->name,
                    'expired_reason'        => $vial->expired_reason,
                    'disposed_at'           => $vial->disposed_at?->format('Y-m-d H:i:s'),
                    'disposed_by_name'      => $vial->disposedBy?->name,
                    'wastage_reason'        => $vial->wastage_reason,
                    'summary_text'          => $vial->buildSummaryText(),
                    'wastages'              => $vial->wastages->map(fn ($w) => [
                        'wastage_id'         => $w->wastage_id,
                        'portions_discarded' => (int) $w->portions_discarded,
                        'reason'             => $w->reason,
                        'disposed_at'        => $w->disposed_at?->format('Y-m-d H:i:s'),
                        'disposed_by_name'   => $w->disposedBy?->name ?: 'Staff',
                    ])->values(),
                ];
            }

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
                'vial_id'                   => $vial?->vial_id,
                'vial_code'                 => $vialPayload['vial_code'] ?? null,
                'vial_portion_number'       => $vial ? (int) ($r->vial_portion_number ?? 1) : null,
                'vial'                      => $vialPayload,
                'is_legacy_unlinked'        => !$isExternal && !$vial,
                'doses_per_vial'            => $dpv,
                'inventory_units_used'      => $units,
                'is_shared'                 => $isShared,
                'dose_index'                => $doseIndex,
                'fraction_used'             => $isExternal ? 'External (0 vials)' : ($dpv && $dpv > 1 ? "1 dose (1/{$dpv} vial)" : ($dpv ? '1 vial' : 'Legacy record')),
                'usage_badge'               => $isExternal ? 'External · 0 deducted' : ($vial ? ($units === 0 ? 'Shared Open Vial · 0 deducted' : 'New Vial · 1 deducted') : 'Legacy Record'),
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

        $openVialsCount = VaccineVial::where('clinic_id', $clinicId)
            ->where('status', VaccineVial::STATUS_OPENED)
            ->where(fn ($q) => $q->whereNull('use_by_at')->orWhere('use_by_at', '>', now()))
            ->count();

        $expiredPendingDisposalCount = VaccineVial::where('clinic_id', $clinicId)
            ->where(function ($q) {
                $q->where('status', VaccineVial::STATUS_EXPIRED)
                  ->orWhere(function ($oq) {
                      $oq->where('status', VaccineVial::STATUS_OPENED)
                         ->whereNotNull('use_by_at')
                         ->where('use_by_at', '<=', now());
                  });
            })
            ->whereRaw('(total_portions - administered_portions - discarded_portions) > 0')
            ->count();

        $totalDiscardedPortions = (int) VaccineVialWastage::where('clinic_id', $clinicId)->sum('portions_discarded');

        return response()->json([
            'data'         => $transformed,
            'total'        => $paginated->total(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
            'per_page'     => $paginated->perPage(),
            'stats'        => [
                'total_administrations'          => $totalCount,
                'today_administrations'          => $todayCount,
                'unique_patients'                => $uniquePatients,
                'open_vials_count'               => $openVialsCount,
                'expired_pending_disposal_count' => $expiredPendingDisposalCount,
                'total_discarded_portions'       => $totalDiscardedPortions,
            ],
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/vaccination-records  (Form 3 save)
    // ────────────────────────────────────────────────────────────────────────
    public function store(StoreVaccinationRecordRequest $request): JsonResponse
    {
        try {
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
            $isNotAdministeredVisit = ($validated['visit_outcome'] ?? null) === 'not_administered';
            if (empty($validated['doses']) && empty($validated['prophylaxis_administrations']) && !$isNotAdministeredVisit) {
                throw ValidationException::withMessages(['doses' => 'Record a vaccine dose or a prescribed prophylaxis administration before saving.']);
            }

            $actingUser = $request->user();

            if ($actingUser->isTriage() && !$actingUser->isAdmin() && !$actingUser->isNursing()) {
                return response()->json([
                    'message' => 'Unauthorized. Triage doctors are not permitted to record vaccine doses (Form 3). Dose administration is strictly reserved for the Treatment Nurse.',
                ], 403);
            }

            if ($denied = $this->guardStation($actingUser->clinic_id, StationCapabilityPolicy::STATION_TREATMENT, 'record vaccination administration')) {
                return $denied;
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

            $response = $this->vaccinationRecordService->saveVaccinationRecords(
                actingUser:    $actingUser,
                clinicId:      $actingUser->clinic_id,
                patientId:     (int) $request->patient_id,
                biteId:        (int) $biteId,
                validated:     $validated,
                doses:         $request->doses,
                signaturePath: $signaturePath,
            );

            if ($response->getStatusCode() < 400) {
                app(\App\Services\NotificationService::class)
                    ->triggerClinicalSafetySync((int) $actingUser->clinic_id, true);
            }

            return $response;
        } catch (ValidationException $e) {
            \Illuminate\Support\Facades\Log::error('VACCINATION_CONTROLLER_422', [
                'errors' => $e->errors(),
                'payload' => $request->all(),
            ]);
            throw $e;
        }
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
