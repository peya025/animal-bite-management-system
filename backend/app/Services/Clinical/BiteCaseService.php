<?php

namespace App\Services\Clinical;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\QueueHistory;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\GeocodingService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class BiteCaseService
{
    public function __construct(
        protected NotificationService $notificationService,
        protected GeocodingService $geocodingService
    ) {}

    /**
     * Register a new bite exposure episode for an existing patient.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function registerNewExposure(int $clinicId, array $validated, User $user, array $rawInput): array
    {
        $patient = Patient::where('clinic_id', $clinicId)
            ->where('patient_id', $validated['patient_id'])
            ->first();

        if (!$patient) {
            abort(404);
        }

        if (!$patient->has_completed_primary) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Patient is not eligible for re-exposure registration. The primary anti-rabies series (Days 0, 3, 7) must be completed first.',
                ],
            ];
        }

        $hasPendingAppointments = $patient->appointments()
            ->where('status', 'scheduled')
            ->exists();
        if ($hasPendingAppointments) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Patient cannot register a new exposure while an active treatment appointment is still scheduled.',
                ],
            ];
        }

        $activeQueue = $patient->queues()
            ->whereDate('created_at', Carbon::today())
            ->whereIn('status', ['waiting', 'in_consultation', 'serving', 'called', 'no_response', 'absent', 'second_chance', 'final_recall'])
            ->exists();
        if ($activeQueue) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Patient cannot register a new exposure while currently active in a clinic queue.',
                ],
            ];
        }

        return DB::transaction(function () use ($validated, $clinicId, $user, $rawInput) {
            Patient::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $todayDate = Carbon::today()->toDateString();
            $episodeNumber = (BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->max('episode_number') ?? 0) + 1;

            $incident = BiteIncident::create([
                'clinic_id' => $clinicId,
                'patient_id' => $validated['patient_id'],
                'episode_number' => $episodeNumber,
                'episode_type' => 'pending_assessment',
                'is_previously_vaccinated' => null,
                'bite_date' => $validated['bite_date'],
                'bite_place' => $validated['bite_place'] ?? null,
                'site_washed' => null,
                'exposure_type' => 'unassessed',
                'severity' => 'unassessed',
                'animal_type' => null,
                'animal_status' => 'unassessed',
                'animal_captured' => null,
                'animal_observation_status' => null,
                'site_number' => null,
                'wound_description' => null,
                'status' => 'awaiting_assessment',
                'remarks' => $validated['remarks'] ?? null,
                'created_by' => $user->id,
            ]);

            $consultationDate = $rawInput['consultation_date']
                ?? ($rawInput['reg_date_of_consultation'] ?? Carbon::today()->toDateString());
            $consultationTime = $rawInput['consultation_time']
                ?? ($rawInput['reg_consultation_time'] ?? Carbon::now()->format('H:i'));
            $bloodPressure = $rawInput['blood_pressure']
                ?? ($rawInput['reg_blood_pressure'] ?? null);
            $temperature = $rawInput['temperature']
                ?? ($rawInput['reg_temperature'] ?? null);
            $height = $rawInput['height']
                ?? ($rawInput['reg_height'] ?? null);
            $weight = $rawInput['weight']
                ?? ($rawInput['reg_weight'] ?? null);
            $attendingProvider = $rawInput['attending_provider']
                ?? ($rawInput['reg_attending_provider'] ?? null);
            $referredBy = $rawInput['referred_by']
                ?? ($rawInput['reg_referred_by'] ?? null);

            $modeOfTx = $rawInput['mode_of_transaction'] ?? ($rawInput['reg_mode_of_transaction'] ?? null);
            $validMode = in_array($modeOfTx, ['walk-in', 'visited', 'referral'], true) ? $modeOfTx : 'walk-in';

            $treatmentRecord = TreatmentRecord::create([
                'clinic_id'           => $clinicId,
                'patient_id'          => $validated['patient_id'],
                'bite_id'             => $incident->bite_id,
                'dose_number'         => null,
                'status'              => 'scheduled',
                'consultation_date'   => $consultationDate,
                'treatment_date'      => $consultationDate,
                'consultation_time'   => $consultationTime,
                'blood_pressure'      => $bloodPressure,
                'temperature'         => $temperature,
                'height'              => $height,
                'weight'              => $weight,
                'attending_provider'  => $attendingProvider,
                'referred_by'         => $referredBy,
                'mode_of_transaction' => $validMode,
                'administered_by'     => $user->id,
            ]);

            $lastQueueNumber = DB::table('queues')
                ->where('clinic_id', $clinicId)
                ->where('queue_date', $todayDate)
                ->max('queue_number') ?? 0;

            $queue = Queue::create([
                'clinic_id' => $clinicId,
                'patient_id' => $validated['patient_id'],
                'bite_id' => $incident->bite_id,
                'queue_number' => $lastQueueNumber + 1,
                'queue_date' => $todayDate,
                'visit_type' => 'new_case',
                'queue_category' => 'regular',
                'priority' => 'normal',
                'status' => 'waiting',
                'checked_in_at' => now(),
                'checked_in_by' => $user->id,
                'check_in_notes' => 'Re-exposure registered with vitals — Doctor assessment required before any treatment.',
                'call_count' => 0,
            ]);

            QueueHistory::create([
                'queue_id' => $queue->queue_id,
                'clinic_id' => $clinicId,
                'patient_id' => $queue->patient_id,
                'action' => 'checked_in',
                'from_status' => 'new',
                'to_status' => 'waiting',
                'call_count' => 0,
                'performed_by' => $user->id,
                'notes' => 'New exposure registered and queued for Doctor assessment.',
                'occurred_at' => now(),
            ]);

            Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");
            $this->clearBiteCasesCache($clinicId);

            $this->notificationService->notifyQueueEvent($queue->load('patient'), 'registered', $user);

            return [
                'status' => 201,
                'data' => [
                    'message' => 'New exposure registered and sent to Doctor assessment.',
                    'incident' => $incident,
                    'treatment_record' => $treatmentRecord,
                    'queue' => $queue->load(['patient', 'biteIncident']),
                ],
            ];
        });
    }

    /**
     * Display a listing of bite cases with filtering.
     */
    public function getPaginatedBiteCases(int $clinicId, array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = BiteIncident::where('clinic_id', $clinicId)
            ->with(['patient', 'createdBy', 'vaccinationSchedules', 'treatmentRecords']);

        if (!empty($filters['patient_id'])) {
            $query->where('patient_id', $filters['patient_id']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('case_number', 'like', "%{$search}%")
                  ->orWhere('bite_place', 'like', "%{$search}%")
                  ->orWhereHas('patient', function ($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('patient_number', 'like', "%{$search}%");
                  });
            });
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['severity']) && $filters['severity'] !== 'all') {
            $query->where('severity', $filters['severity']);
        }

        if (!empty($filters['animal_type']) && $filters['animal_type'] !== 'all') {
            $query->where('animal_type', $filters['animal_type']);
        }

        if (!empty($filters['exposure_type']) && $filters['exposure_type'] !== 'all') {
            $query->where('exposure_type', $filters['exposure_type']);
        }

        return $query->orderBy('bite_date', 'desc')->paginate($perPage);
    }

    /**
     * Store Form 3 bite incident creation.
     */
    public function storeBiteCase(int $clinicId, array $validated, User $user, array $rawInput): BiteIncident
    {
        return DB::transaction(function () use ($clinicId, $validated, $user) {
            Patient::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $lastEpisode = BiteIncident::where('patient_id', $validated['patient_id'])->max('episode_number') ?? 0;
            $episodeNumber = $lastEpisode + 1;

            $incident = BiteIncident::create([
                'clinic_id' => $clinicId,
                'patient_id' => $validated['patient_id'],
                'episode_number' => $episodeNumber,
                'episode_type' => $validated['episode_type'] ?? ($episodeNumber > 1 ? 're_exposure' : 'primary'),
                'is_previously_vaccinated' => $validated['is_previously_vaccinated'] ?? ($episodeNumber > 1),
                'bite_date' => $validated['bite_date'],
                'bite_place' => $validated['bite_place'] ?? null,
                'site_washed' => $validated['site_washed'],
                'exposure_type' => $validated['exposure_type'],
                'victim_of_exposure' => $validated['victim_of_exposure'] ?? null,
                'severity' => $validated['severity'],
                'animal_type' => $validated['animal_type'] ?? null,
                'animal_status' => $validated['animal_status'],
                'animal_captured' => $validated['animal_captured'] ?? false,
                'animal_observation_status' => $validated['animal_observation_status'] ?? 'unknown',
                'site_number' => $validated['site_number'] ?? null,
                'wound_description' => $validated['wound_description'] ?? null,
                'referred_from' => $validated['referred_from'] ?? null,
                'remarks' => $validated['remarks'] ?? null,
                'status' => 'active',
                'verification_source' => $validated['verification_source'] ?? null,
                'rig_decision_reason' => $validated['rig_decision_reason'] ?? null,
                'wound_condition' => $validated['wound_condition'] ?? null,
                'created_by' => $user->id,
            ]);

            if (!empty($validated['intake_id'])) {
                $intake = \App\Models\BiteIncidentIntake::where('clinic_id', $clinicId)
                    ->find($validated['intake_id']);
                if ($intake) {
                    $intake->update([
                        'bite_id' => $incident->bite_id,
                        'status' => 'converted',
                        'checked_in_by' => $user->id,
                        'checked_in_at' => now(),
                    ]);
                }
            }

            $this->clearBiteCasesCache($clinicId);

            return $incident->load(['patient', 'createdBy']);
        });
    }

    /**
     * Get single bite case.
     */
    public function getBiteCase(int $clinicId, int $id): BiteIncident
    {
        return BiteIncident::where('clinic_id', $clinicId)
            ->with([
                'patient.details',
                'createdBy',
                'vaccinationSchedules',
                'treatmentRecords.administeredBy',
                'externalProofReviewer',
            ])
            ->findOrFail($id);
    }

    /**
     * Update bite case.
     */
    public function updateBiteCase(int $clinicId, int $id, array $validated): BiteIncident
    {
        $incident = BiteIncident::where('clinic_id', $clinicId)->findOrFail($id);

        $incident->update($validated);

        $this->clearBiteCasesCache($clinicId);
        Cache::forget("web:bite-case:{$id}:clinic:{$clinicId}");

        return $incident;
    }

    /**
     * Soft delete bite case.
     */
    public function deleteBiteCase(int $clinicId, int $id): void
    {
        $incident = BiteIncident::where('clinic_id', $clinicId)->findOrFail($id);
        $incident->delete();

        $this->clearBiteCasesCache($clinicId);
        Cache::forget("web:bite-case:{$id}:clinic:{$clinicId}");
    }

    /**
     * Get vaccination schedules for bite case.
     */
    public function getBiteVaccinations(int $clinicId, int $id): Collection
    {
        $incident = BiteIncident::where('clinic_id', $clinicId)->findOrFail($id);

        return $incident->vaccinationSchedules()
            ->with('administeredBy')
            ->orderBy('scheduled_date')
            ->get();
    }

    /**
     * Get aggregate statistics.
     */
    public function getStatistics(int $clinicId): array
    {
        $cacheKey = "web:bite-cases:stats:clinic:{$clinicId}";

        return Cache::remember($cacheKey, 300, function () use ($clinicId) {
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
        });
    }

    /**
     * Descriptive bite surveillance grouped by place of exposure.
     */
    public function getLocationRiskSummary(int $clinicId, array $validated): array
    {
        $from = isset($validated['from']) ? Carbon::parse($validated['from'])->startOfDay() : null;
        $to = isset($validated['to']) ? Carbon::parse($validated['to'])->endOfDay() : null;

        $makeQuery = function () use ($clinicId, $validated, $from, $to) {
            $query = BiteIncident::where('clinic_id', $clinicId)
                ->with(['patient', 'intake', 'appointments', 'treatmentRecords']);

            if ($from) $query->whereDate('bite_date', '>=', $from);
            if ($to) $query->whereDate('bite_date', '<=', $to);
            if (!empty($validated['status'])) $query->where('status', $validated['status']);
            if (!empty($validated['animal'])) {
                $validated['animal'] === 'other'
                    ? $query->where(fn ($q) => $q->whereNotIn('animal_type', ['dog', 'cat'])->orWhereNull('animal_type'))
                    : $query->where('animal_type', $validated['animal']);
            }
            if (!empty($validated['search'])) {
                $search = $validated['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('case_number', 'like', "%{$search}%")
                        ->orWhere('bite_place', 'like', "%{$search}%")
                        ->orWhereHas('patient', fn ($patient) => $patient->searchName($search));
                });
            }

            return $query;
        };

        $cases = $makeQuery()->get()->filter(function (BiteIncident $case) use ($validated) {
            return empty($validated['severity']) || $case->bite_category === $validated['severity'];
        })->values();

        $periodEnd = $to ? $to->copy()->startOfDay() : Carbon::today();
        $periodStart = $from ? $from->copy()->startOfDay() : $periodEnd->copy()->startOfMonth();
        $periodDays = max(1, $periodStart->diffInDays($periodEnd) + 1);
        $previousStart = $periodStart->copy()->subDays($periodDays);
        $previousEnd = $periodStart->copy()->subDay();

        $previousCases = BiteIncident::where('clinic_id', $clinicId)
            ->whereBetween('bite_date', [$previousStart->toDateString(), $previousEnd->toDateString()])
            ->when(!empty($validated['status']), fn ($q) => $q->where('status', $validated['status']))
            ->when(!empty($validated['animal']), function ($q) use ($validated) {
                $validated['animal'] === 'other'
                    ? $q->where(fn ($inner) => $inner->whereNotIn('animal_type', ['dog', 'cat'])->orWhereNull('animal_type'))
                    : $q->where('animal_type', $validated['animal']);
            })
            ->when(!empty($validated['search']), function ($q) use ($validated) {
                $search = $validated['search'];
                $q->where(function ($inner) use ($search) {
                    $inner->where('case_number', 'like', "%{$search}%")
                        ->orWhere('bite_place', 'like', "%{$search}%")
                        ->orWhereHas('patient', fn ($patient) => $patient->searchName($search));
                });
            })
            ->with('intake')
            ->get()
            ->filter(fn (BiteIncident $case) => empty($validated['severity']) || $case->bite_category === $validated['severity'])
            ->groupBy(fn (BiteIncident $case) => trim((string) $case->bite_place) ?: 'Unknown');

        $hasReceivedDose = function (BiteIncident $case): bool {
            return $case->treatmentRecords->contains(function ($record) {
                return $record->dose_number !== null
                    && ($record->treatment_date || $record->administered_at || in_array($record->status, ['administered', 'completed'], true));
            });
        };

        $hasOverdueDose = function (BiteIncident $case): bool {
            return $case->appointments->contains(function ($appointment) {
                $scheduled = $appointment->scheduled_date ?? $appointment->appointment_date;
                return $scheduled && Carbon::parse($scheduled)->lt(Carbon::today())
                    && !in_array($appointment->status, ['completed', 'cancelled'], true);
            });
        };

        $getOverdueInfo = function (BiteIncident $case) {
            $overdueAppts = $case->appointments->filter(function ($appointment) {
                $scheduled = $appointment->scheduled_date ?? $appointment->appointment_date;
                return $scheduled && Carbon::parse($scheduled)->lt(Carbon::today())
                    && !in_array($appointment->status, ['completed', 'cancelled'], true);
            });
            if ($overdueAppts->isEmpty()) {
                return [
                    'is_overdue' => false,
                    'days_overdue' => 0,
                    'overdue_dose' => null,
                ];
            }
            $earliest = $overdueAppts->sortBy(fn ($a) => $a->scheduled_date ?? $a->appointment_date)->first();
            $scheduledDate = Carbon::parse($earliest->scheduled_date ?? $earliest->appointment_date)->startOfDay();
            $daysOverdue = max(1, abs(Carbon::today()->diffInDays($scheduledDate)));
            $doseLabel = $earliest->dose_number ? "Dose {$earliest->dose_number}" : ($earliest->appointment_type ?: 'PEP Dose');

            return [
                'is_overdue' => true,
                'days_overdue' => $daysOverdue,
                'overdue_dose' => $doseLabel,
            ];
        };

        $locations = $cases->groupBy(fn (BiteIncident $case) => trim((string) $case->bite_place) ?: 'Unknown')
            ->map(function ($locationCases, $location) use ($previousCases, $hasReceivedDose, $hasOverdueDose) {
                $total = $locationCases->count();
                $categories = $locationCases->map(fn (BiteIncident $case) => $case->bite_category);
                $cat1 = $categories->filter(fn ($category) => $category === 'I')->count();
                $cat2 = $categories->filter(fn ($category) => $category === 'II')->count();
                $cat3 = $categories->filter(fn ($category) => $category === 'III')->count();
                $riskScore = $total ? (int) round((($cat3 * 1.5) + $cat2) / $total * 100) : 0;
                $riskLevel = $riskScore >= 65 ? 'high' : ($riskScore >= 35 ? 'medium' : 'low');
                $eligibleCases = $locationCases->reject(fn (BiteIncident $case) => in_array($case->status, ['cancelled', 'abandoned'], true));
                $compliant = $eligibleCases->filter($hasReceivedDose)->count();
                $previousCount = $previousCases->get($location)?->count();
                $lastIncident = $locationCases->sortByDesc('bite_date')->first()?->bite_date;

                $animalTypes = $locationCases->map(function (BiteIncident $case) {
                    return strtolower(trim((string) ($case->intake?->animal_type ?: $case->animal_type ?: 'other')));
                })->map(fn ($type) => in_array($type, ['dog', 'cat'], true) ? $type : 'other')->countBy();

                return [
                    'location' => $location,
                    'location_level' => $location === 'Unknown' ? 'Unknown' : 'Barangay',
                    'risk_score' => $riskScore,
                    'risk_level' => $riskLevel,
                    'total_cases' => $total,
                    'cat_1' => $cat1,
                    'cat_2' => $cat2,
                    'cat_3' => $cat3,
                    'animal_types' => $animalTypes,
                    'pep_compliance' => $eligibleCases->count() ? (int) round($compliant / $eligibleCases->count() * 100) : 0,
                    'overdue_doses' => $locationCases->filter($hasOverdueDose)->count(),
                    'trend' => is_null($previousCount) ? 'new' : ($total > $previousCount ? 'up' : ($total < $previousCount ? 'down' : 'neutral')),
                    'trend_diff' => is_null($previousCount) ? null : $total - $previousCount,
                    'last_incident' => $lastIncident?->format('M d, Y'),
                    'last_incident_days_ago' => $lastIncident ? abs(Carbon::today()->diffInDays($lastIncident)) : null,
                ];
            })->sortByDesc('risk_score')->values();

        $activeCases = BiteIncident::where('clinic_id', $clinicId)->where('status', 'active')
            ->with(['appointments', 'treatmentRecords'])->get();
        $overdueDoses = $activeCases->filter($hasOverdueDose)->count();
        $patientsWithDose = $activeCases->filter($hasReceivedDose)->count();

        return [
            'summary' => [
                'total_cases' => $cases->count(),
                'active_cases' => $cases->where('status', 'active')->count(),
                'completed' => $cases->where('status', 'completed')->count(),
                'high_risk_zones' => $locations->where('risk_level', 'high')->count(),
                'overdue_doses' => $overdueDoses,
                'pep_compliance' => $activeCases->count() ? (int) round($patientsWithDose / $activeCases->count() * 100) : 0,
            ],
            'locations' => $locations,
            'cases' => $cases->sortByDesc('bite_date')->values()->map(function (BiteIncident $case) use ($getOverdueInfo) {
                $overdue = $getOverdueInfo($case);
                return [
                    'bite_id' => $case->bite_id,
                    'case_number' => $case->case_number,
                    'patient_id' => $case->patient_id,
                    'patient_name' => $case->patient?->name ?? 'Unknown patient',
                    'bite_date' => $case->bite_date?->format('M d, Y'),
                    'location' => trim((string) $case->bite_place) ?: 'Unknown',
                    'category' => $case->bite_category,
                    'animal_type' => strtolower(trim((string) ($case->intake?->animal_type ?: $case->animal_type ?: 'other'))),
                    'status' => $case->status,
                    'is_overdue' => $overdue['is_overdue'],
                    'days_overdue' => $overdue['days_overdue'],
                    'overdue_dose' => $overdue['overdue_dose'],
                ];
            }),
            'risk_alerts' => [
                'high_risk_zones' => $locations->where('risk_level', 'high')->pluck('location')->values(),
                'overdue_count' => $overdueDoses,
            ],
        ];
    }

    /**
     * Get GIS map data.
     */
    public function getMapData(int $clinicId, array $filters): array
    {
        $clinic = DB::table('clinics')->find($clinicId);
        $clinicMunicipality = $this->resolveClinicMunicipality($clinic);
        $clinicProvince = $this->resolveClinicProvince($clinic);

        $query = BiteIncident::where('clinic_id', $clinicId)
            ->with(['patient.details'])
            ->whereNotNull('bite_place')
            ->where('bite_place', '!=', '')
            ->whereIn('severity', ['minor', 'moderate', 'severe']);

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        } else {
            $query->whereIn('status', ['active', 'completed', 'finished']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('bite_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('bite_date', '<=', $filters['date_to']);
        }
        if (!empty($filters['severity'])) {
            $query->where('severity', $filters['severity']);
        }

        $cases = $query->get()->map(function ($case) use ($clinicMunicipality, $clinicProvince) {
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

            $coordinates = $this->geocodingService->getCoordinates($barangay, $municipality, $province);
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
                'patient_name' => $case->patient ? "{$case->patient->first_name} {$case->patient->last_name}" : 'Unknown',
                'status' => $case->status,
                'coord_source' => $coordinates['source'],
            ];
        });

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

        $mapCenter = null;
        $mapZoom = 12;

        if ($clinic) {
            if ($clinic->latitude && $clinic->longitude) {
                $mapCenter = [
                    'latitude' => (float) $clinic->latitude,
                    'longitude' => (float) $clinic->longitude
                ];
                $mapZoom = $clinic->map_default_zoom ?? 13;
            } else {
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
                    $coords = $this->geocodingService->getCoordinates('', $mun, $clinicProvince);
                    $mapCenter = [
                        'latitude' => $coords['latitude'],
                        'longitude' => $coords['longitude']
                    ];
                    $mapZoom = 13;

                    DB::table('clinics')->where('id', $clinicId)->update([
                        'municipality' => $mun,
                        'latitude' => $coords['latitude'],
                        'longitude' => $coords['longitude'],
                        'map_default_zoom' => 13,
                    ]);
                }
            }
        }

        if (!$mapCenter && $cases->count() > 0) {
            $firstCase = $cases->first();
            $mapCenter = [
                'latitude' => $firstCase['latitude'],
                'longitude' => $firstCase['longitude']
            ];
        }

        return [
            'cases' => $cases->values(),
            'statistics' => $stats,
            'map_center' => $mapCenter,
            'map_zoom' => $mapZoom,
            'clinic' => [
                'name' => $clinic->name ?? '',
                'municipality' => $clinicMunicipality ?? '',
                'province' => $clinicProvince ?? '',
            ]
        ];
    }

    /**
     * Get all bite episodes for a patient with immunization history summary.
     */
    public function getPatientEpisodes(int $clinicId, int $patientId): array
    {
        $patient = Patient::where('clinic_id', $clinicId)
            ->with(['details'])
            ->findOrFail($patientId);

        $episodes = BiteIncident::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->with([
                'treatmentRecords' => function ($q) {
                    $q->orderByRaw('CASE WHEN dose_number IS NULL THEN 0 ELSE 1 END')
                        ->orderBy('consultation_date')
                        ->orderBy('dose_number')
                        ->orderBy('scheduled_date');
                },
                'treatmentPlan:treatment_plan_id,bite_id,plan_type,status,ordered_dose_days,doctor_decision_notes,decided_at',
                'externalProofReviewer:id,name,role',
                'createdBy:id,name',
            ])
            ->orderByDesc('episode_number')
            ->orderByDesc('bite_id')
            ->get();

        $historySummary = $patient->getImmunizationHistorySummary();

        return [
            'patient_id' => $patientId,
            'patient_name' => $patient->full_name,
            'history_summary' => $historySummary,
            'summary' => $historySummary,
            'episodes' => $episodes,
        ];
    }

    /**
     * Transfer patient case out to external facility.
     */
    public function transferOut(int $clinicId, int $id, array $validated): BiteIncident
    {
        return DB::transaction(function () use ($clinicId, $id, $validated) {
            $incident = BiteIncident::where('clinic_id', $clinicId)->findOrFail($id);
            $transferDate = !empty($validated['transfer_date']) ? Carbon::parse($validated['transfer_date']) : now();

            $incident->update([
                'status' => 'transferred_out',
                'transferred_to_facility' => $validated['transferred_to_facility'],
                'transferred_at' => $transferDate,
                'transfer_reason' => $validated['transfer_reason'] ?? null,
            ]);

            Appointment::where('bite_id', $incident->bite_id)
                ->where('status', 'scheduled')
                ->where('appointment_date', '>=', $transferDate->toDateString())
                ->update([
                    'status' => 'cancelled',
                    'cancellation_reason' => "Patient transferred to {$validated['transferred_to_facility']}",
                ]);

            $incident->load([
                'patient.details',
                'treatmentRecords.administeredBy',
                'clinic',
            ]);

            return $incident;
        });
    }

    /**
     * Review external proof.
     */
    public function reviewExternalProof(int $clinicId, int $id, array $validated, User $user): BiteIncident
    {
        $incident = BiteIncident::where('clinic_id', $clinicId)->findOrFail($id);

        $incident->update([
            'verification_source' => $validated['is_verified'] ? 'external_certificate_reviewed' : 'patient_self_report_unverified',
            'external_proof_reviewed_by' => $user->id,
            'external_proof_reviewed_at' => now(),
            'remarks' => trim(($incident->remarks ?? '') . ' | Proof review: ' . ($validated['remarks'] ?? ($validated['is_verified'] ? 'Verified' : 'Rejected'))),
        ]);

        return $incident->fresh(['externalProofReviewer']);
    }

    /**
     * Get distinct saved Purok/Zone options for a given Barangay and Municipality.
     */
    public function getPuroks(string $barangay, ?string $municipality = null): array
    {
        if (empty($barangay)) {
            return [];
        }

        $puroks = collect();

        $patientPuroks = DB::table('patient_details')
            ->whereNotNull('address_purok')
            ->where('address_purok', '!=', '')
            ->where(function ($q) use ($barangay) {
                $q->where('address_barangay', $barangay)
                  ->orWhere('address_barangay', 'like', "%{$barangay}%");
            })
            ->when(!empty($municipality), function ($q) use ($municipality) {
                $q->where(function ($mq) use ($municipality) {
                    $mq->where('address_municipality', $municipality)
                       ->orWhere('address_municipality', 'like', "%{$municipality}%");
                });
            })
            ->pluck('address_purok');

        $puroks = $puroks->concat($patientPuroks);

        $incidentPlaces = DB::table('bite_incidents')
            ->whereNull('deleted_at')
            ->whereNotNull('bite_place')
            ->where('bite_place', '!=', '')
            ->where('bite_place', 'like', "%{$barangay}%")
            ->pluck('bite_place');

        foreach ($incidentPlaces as $place) {
            $parts = array_map('trim', explode(',', (string) $place));
            $count = count($parts);

            if ($count >= 2) {
                $last = end($parts);
                if (stripos($last, 'Misamis') !== false || stripos($last, 'Oriental') !== false) {
                    array_pop($parts);
                    $count = count($parts);
                }
            }

            if ($count >= 3) {
                $purokCandidate = $parts[$count - 3];
                if (!empty($purokCandidate)) {
                    $puroks->push($purokCandidate);
                }
            }
        }

        return $puroks
            ->map(function ($p) {
                $cleaned = trim(preg_replace('/\s+/', ' ', (string) $p));
                $cleaned = trim($cleaned, ",.- ");
                return preg_replace_callback('/\b(purok|zone|sitio|block|blk|street|st|phase|prk)\b/i', fn($m) => ucfirst(strtolower($m[0])), $cleaned);
            })
            ->filter(fn ($p) => !empty($p) && strlen($p) >= 2)
            ->unique(fn ($p) => strtolower($p))
            ->values()
            ->sort(fn ($a, $b) => strnatcasecmp($a, $b))
            ->values()
            ->all();
    }

    /**
     * Clear bite cases caches.
     */
    public function clearBiteCasesCache(int $clinicId): void
    {
        Cache::forget("web:bite-cases:stats:clinic:{$clinicId}");
        Cache::forget("web:bite-cases:map-data:clinic:{$clinicId}");
        for ($page = 1; $page <= 5; $page++) {
            Cache::forget("web:bite-cases:list:clinic:{$clinicId}:page:{$page}");
        }
    }

    protected function resolveClinicMunicipality(?object $clinic): ?string
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

    protected function resolveClinicProvince(?object $clinic): ?string
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

    protected function splitAddressParts(?string $address): array
    {
        if (! $address) {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', $address)), fn ($part) => $part !== ''));
    }
}
