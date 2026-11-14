<?php

namespace App\Services\Clinical;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\QueueHistory;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\GeocodingService;
use App\Services\NotificationService;
use App\Services\Reporting\EpisodeReportingStateResolver;
use App\Services\Reporting\ExposureReportingQuery;
use App\Services\Reporting\ReportingMetricService;
use App\Services\Reporting\TreatmentOutcomeResolver;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
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
            $patient = Patient::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($course = $patient->ongoing_course) {
                return ['status' => 422, 'data' => [
                    'code' => 'ongoing_treatment_course', 'message' => $course['message'], 'ongoing_course' => $course,
                ]];
            }

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
                ...(BiteIncident::supportsProvisionalBiteDateColumn() ? ['bite_date_is_provisional' => false] : []),
                'bite_place' => $validated['bite_place'] ?? null,
                'site_washed' => null,
                'exposure_type' => 'unassessed',
                'severity' => 'unassessed',
                'animal_type' => null,
                'animal_status' => 'unassessed',
                'animal_captured' => null,
                'animal_observation_status' => null,
                ...\App\Support\RegistrationAnimal::values($validated),
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
            $isUnrecorded = in_array(strtolower(trim($search)), ['unknown', 'not recorded', 'unrecorded', 'place not recorded'], true);
            $query->where(function ($q) use ($search, $isUnrecorded) {
                if ($isUnrecorded) {
                    $q->whereNull('bite_place')
                      ->orWhere('bite_place', '')
                      ->orWhere('bite_place', 'like', '%unknown%');
                } else {
                    $q->where('case_number', 'like', "%{$search}%")
                      ->orWhere('bite_place', 'like', "%{$search}%")
                      ->orWhereHas('patient', function ($pq) use ($search) {
                          $pq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('patient_number', 'like', "%{$search}%");
                      });
                }
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
                ...(BiteIncident::supportsProvisionalBiteDateColumn() ? ['bite_date_is_provisional' => false] : []),
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

        if (!empty($validated['bite_date']) && !array_key_exists('bite_date_is_provisional', $validated)) {
            if (BiteIncident::supportsProvisionalBiteDateColumn()) {
                $validated['bite_date_is_provisional'] = false;
            }
        } elseif (array_key_exists('bite_date_is_provisional', $validated) && !BiteIncident::supportsProvisionalBiteDateColumn()) {
            unset($validated['bite_date_is_provisional']);
        }

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

        if (!empty($validated['cutoff'])) {
            $cutoff = CarbonImmutable::parse($validated['cutoff'])->endOfDay();
        } elseif ($to) {
            $cutoff = $to->gt(Carbon::now())
                ? CarbonImmutable::now()->endOfDay()
                : CarbonImmutable::instance($to)->endOfDay();
        } else {
            $cutoff = CarbonImmutable::now()->endOfDay();
        }

        $clinic = Clinic::find($clinicId);
        $clinicMunicipality = trim((string) ($clinic?->municipality ?: 'Tagoloan'));
        $clinicProvince = trim((string) ($clinic?->province ?: 'Misamis Oriental'));

        $outcomeResolver = app(TreatmentOutcomeResolver::class);
        $stateResolver = new EpisodeReportingStateResolver($outcomeResolver);
        $reportingQuery = new ExposureReportingQuery($stateResolver, $outcomeResolver);

        $rawSeverity = trim((string) ($validated['severity'] ?? ''));
        $lowerSeverity = strtolower($rawSeverity);
        $severityFilter = match (true) {
            $rawSeverity === '' || $lowerSeverity === 'all' => null,
            $lowerSeverity === 'unassessed' => 'Unassessed',
            $lowerSeverity === 'not_yet_assessed' => 'not_yet_assessed',
            $lowerSeverity === 'assessed_category_missing' => 'assessed_category_missing',
            default => strtoupper($rawSeverity),
        };
        $aggregateOnly = !empty($validated['aggregate_only'])
            || (($validated['privacy_mode'] ?? '') === 'aggregate_only');
        $privacyMode = $aggregateOnly ? 'aggregate_only' : 'internal_aggregate';
        $animalFilter = !empty($validated['animal']) ? strtolower(trim((string) $validated['animal'])) : null;
        if ($animalFilter === '' || $animalFilter === 'all') {
            $animalFilter = null;
        }
        $statusFilter = !empty($validated['status']) ? strtolower(trim((string) $validated['status'])) : null;
        $searchFilter = !empty($validated['search']) ? trim((string) $validated['search']) : null;

        $currentResult = $this->resolveLocationSummaryPeriod(
            $clinicId,
            $from,
            $to,
            $cutoff,
            $severityFilter,
            $animalFilter,
            $statusFilter,
            $searchFilter,
            $stateResolver,
            $reportingQuery
        );

        $cases = $currentResult['cases'];
        $resolvedMap = $currentResult['resolved_map'];
        $unknownExposureDateCount = $currentResult['unknown_exposure_date_count'];

        $periodEnd = $to ? $to->copy()->startOfDay() : Carbon::today();
        $periodStart = $from ? $from->copy()->startOfDay() : $periodEnd->copy()->startOfMonth();
        $periodDays = max(1, $periodStart->diffInDays($periodEnd) + 1);
        $previousStart = $periodStart->copy()->subDays($periodDays)->startOfDay();
        $previousEnd = $periodStart->copy()->subDay()->endOfDay();
        $previousCutoff = CarbonImmutable::instance($previousEnd)->endOfDay();

        $previousResult = $this->resolveLocationSummaryPeriod(
            $clinicId,
            $previousStart,
            $previousEnd,
            $previousCutoff,
            $severityFilter,
            $animalFilter,
            $statusFilter,
            $searchFilter,
            $stateResolver,
            $reportingQuery
        );

        $groupByExposureBarangay = fn (BiteIncident $case): string => $reportingQuery->normalizeExposureGeography(
            $case,
            $clinicMunicipality,
            $clinicProvince
        )['barangay'];

        $previousCases = $previousResult['cases']->groupBy($groupByExposureBarangay);

        $locations = $cases->groupBy($groupByExposureBarangay)
            ->map(function ($locationCases, $location) use (
                $previousCases,
                $resolvedMap,
                $outcomeResolver,
                $reportingQuery,
                $clinicMunicipality,
                $clinicProvince,
                $cutoff
            ) {
                $total = $locationCases->count();
                $geo = $reportingQuery->normalizeExposureGeography(
                    $locationCases->first(),
                    $clinicMunicipality,
                    $clinicProvince
                );

                $categories = $locationCases->map(fn (BiteIncident $case) => $case->bite_category);
                $cat1 = $categories->filter(fn ($category) => $category === 'I')->count();
                $cat2 = $categories->filter(fn ($category) => $category === 'II')->count();
                $cat3 = $categories->filter(fn ($category) => $category === 'III')->count();
                $unassessed = $categories->filter(fn ($category) => $category === 'Unassessed')->count();

                $riskScore = $total ? (int) round((($cat3 * 1.5) + $cat2) / $total * 100) : 0;
                $riskLevel = $riskScore >= 65 ? 'high' : ($riskScore >= 35 ? 'medium' : 'low');

                // Calculate vaccine initiation strictly among prescribed PEP courses, never awaiting-assessment or no-PEP rows
                $eligibleCases = $locationCases
                    ->reject(fn (BiteIncident $case) => in_array($case->status, ['cancelled', 'abandoned'], true))
                    ->filter(fn (BiteIncident $case) => in_array($resolvedMap[$case->bite_id]['pep_decision'] ?? '', ['new_course_prescribed', 'continue_course'], true));
                $compliant = $eligibleCases->filter(
                    fn (BiteIncident $case) => (bool) ($resolvedMap[$case->bite_id]['administration_evidence']['has_vaccine_administration'] ?? false)
                )->count();

                $newCoursePrescribedCases = $locationCases->filter(
                    fn (BiteIncident $case) => ($resolvedMap[$case->bite_id]['pep_decision'] ?? '') === 'new_course_prescribed'
                );
                $newCoursePrescribedCount = $newCoursePrescribedCases->count();
                $newCourseStartedCount = $newCoursePrescribedCases->filter(
                    fn (BiteIncident $case) => (bool) ($resolvedMap[$case->bite_id]['administration_evidence']['has_vaccine_administration'] ?? false)
                )->count();
                $initiationRatePct = $newCoursePrescribedCount > 0
                    ? round(($newCourseStartedCount / $newCoursePrescribedCount) * 100, 1)
                    : null;

                $locationStates = $locationCases->map(fn (BiteIncident $case) => $resolvedMap[$case->bite_id]);
                $locationOverdue = $outcomeResolver->summarizeOverdueMetrics($locationStates);

                $hasPriorKey = $previousCases->has($location);
                $previousTotal = (int) ($previousCases->get($location)?->count() ?? 0);
                $change = $total - $previousTotal;
                $pctChange = $previousTotal > 0 ? round(($change / $previousTotal) * 100, 1) : null;
                $pctChangeReason = $previousTotal > 0 ? null : ($total > 0 ? 'prior_period_zero' : 'no_data');

                $lastIncident = $locationCases->sortByDesc('bite_date')->first()?->bite_date;

                $animalTypes = $locationCases->map(
                    fn (BiteIncident $case) => $reportingQuery->normalizedAnimalCategory($case)
                )->countBy();

                $dogs = (int) ($animalTypes['dog'] ?? 0);
                $cats = (int) ($animalTypes['cat'] ?? 0);
                $otherAnimals = (int) ($animalTypes['other'] ?? 0);
                $unknownAnimals = (int) ($animalTypes['unknown'] ?? 0);

                $strayCount = $locationCases->filter(
                    fn (BiteIncident $case) => strtolower(trim((string) ($case->animal_status ?? $case->intake?->animal_status ?? ''))) === 'stray'
                )->count();

                $childrenCount = $locationCases->filter(function (BiteIncident $case) use ($cutoff) {
                    $age = $case->patient?->ageAtDate($case->bite_date ?? $cutoff);

                    return $age !== null && $age < 15;
                })->count();

                $locAge15Above = $locationCases->filter(function (BiteIncident $case) use ($cutoff) {
                    $age = $case->patient?->ageAtDate($case->bite_date ?? $cutoff);

                    return $age !== null && $age >= 15;
                })->count();

                $locAgeUnknown = $total - $childrenCount - $locAge15Above;

                $locMale = $locationCases->filter(
                    fn (BiteIncident $case) => strtolower(trim((string) ($case->patient?->gender ?? ''))) === 'male'
                )->count();
                $locFemale = $locationCases->filter(
                    fn (BiteIncident $case) => strtolower(trim((string) ($case->patient?->gender ?? ''))) === 'female'
                )->count();
                $locUnknownSex = $total - $locMale - $locFemale;

                $locPepPrescribed = $locationStates->filter(
                    fn (array $s) => in_array($s['pep_decision'], ['new_course_prescribed', 'continue_course'], true)
                )->count();
                $locGivenPep = $newCourseStartedCount;
                $locNoAdmin = $locationStates->filter(
                    fn (array $s) => $s['pep_decision'] === 'new_course_prescribed'
                        && !((bool) ($s['administration_evidence']['has_vaccine_administration'] ?? false))
                )->count();
                $locNoPepRequired = $locationStates->where('pep_decision', 'explicit_no_pep')->count();
                $locTransferred = $locationStates->where('encounter_disposition', 'transferred_referred')->count();
                $locCompleted = $locationStates->filter(
                    fn (array $s) => $s['assessment'] === 'finalized'
                        && in_array($s['category'], ['I', 'II', 'III'], true)
                        && $s['pep_decision'] === 'new_course_prescribed'
                        && (bool) ($s['administration_evidence']['has_vaccine_administration'] ?? false)
                        && (bool) ($s['course_outcome']['is_completed'] ?? false)
                        && (bool) ($s['course_outcome']['is_mature'] ?? false)
                )->count();
                $locGivenRig = $locationStates->filter(
                    fn (array $s) => (bool) ($s['rig_evidence']['rig_administered'] ?? false)
                )->count();
                $locErig = $locationStates->filter(
                    fn (array $s) => strtoupper((string) ($s['rig_evidence']['administered_rig_type'] ?? '')) === 'ERIG'
                )->count();
                $locHrig = $locationStates->filter(
                    fn (array $s) => strtoupper((string) ($s['rig_evidence']['administered_rig_type'] ?? '')) === 'HRIG'
                )->count();

                $activeCasesCount = $locationCases->filter(
                    fn (BiteIncident $case) => in_array($resolvedMap[$case->bite_id]['resolved_status'], ['active', 'awaiting_treatment'], true)
                )->count();

                return [
                    'location' => $location,
                    'normalized_barangay' => $geo['barangay'],
                    'municipality' => $geo['municipality'],
                    'geography_scope' => $geo['scope'],
                    'location_level' => $location === 'Unknown' ? 'Unknown' : 'Barangay',
                    'risk_score' => $riskScore,
                    'risk_level' => $riskLevel,
                    'total' => $total,
                    'total_cases' => $total,
                    'previous_total' => $previousTotal,
                    'change' => $change,
                    'pct_change' => $pctChange,
                    'pct_change_reason' => $pctChangeReason,
                    'cat_1' => $cat1,
                    'cat_2' => $cat2,
                    'cat_3' => $cat3,
                    'mild' => $cat1,
                    'moderate' => $cat2,
                    'severe' => $cat3,
                    'unassessed' => $unassessed,
                    'male' => $locMale,
                    'female' => $locFemale,
                    'unknown_sex' => $locUnknownSex,
                    'age_below_15' => $childrenCount,
                    'age_15_above' => $locAge15Above,
                    'age_unknown' => $locAgeUnknown,
                    'stray' => $strayCount,
                    'dogs' => $dogs,
                    'cats' => $cats,
                    'other_animals' => $otherAnimals,
                    'unknown_animals' => $unknownAnimals,
                    'animal_types' => $animalTypes,
                    'children_count' => $childrenCount,
                    'new_course_prescribed' => $newCoursePrescribedCount,
                    'new_course_started' => $newCourseStartedCount,
                    'initiation_rate_pct' => $initiationRatePct,
                    'pep_prescribed' => $locPepPrescribed,
                    'given_pep' => $locGivenPep,
                    'no_administration_recorded' => $locNoAdmin,
                    'no_pep_required' => $locNoPepRequired,
                    'transferred' => $locTransferred,
                    'completed' => $locCompleted,
                    'given_rig' => $locGivenRig,
                    'erig' => $locErig,
                    'hrig' => $locHrig,
                    'active_cases' => $activeCasesCount,
                    'pep_compliance' => $eligibleCases->count() ? (int) round($compliant / $eligibleCases->count() * 100) : 0,
                    'overdue_doses' => $locationOverdue['overdue_episodes'],
                    'overdue_episodes' => $locationOverdue['overdue_episodes'],
                    'overdue_patients' => $locationOverdue['overdue_patients'],
                    'overdue_courses' => $locationOverdue['overdue_courses'],
                    'outstanding_dose_slots' => $locationOverdue['outstanding_dose_slots'],
                    'trend' => !$hasPriorKey ? 'new' : ($total > $previousTotal ? 'up' : ($total < $previousTotal ? 'down' : 'neutral')),
                    'trend_diff' => !$hasPriorKey ? null : $change,
                    'last_incident' => $lastIncident?->format('M d, Y'),
                    'last_incident_days_ago' => $lastIncident ? abs(Carbon::today()->diffInDays($lastIncident)) : null,
                ];
            })->sortByDesc('risk_score')->values();

        $resolvedCollection = $cases->map(fn (BiteIncident $case) => $resolvedMap[$case->bite_id]);
        $overdueMetrics = $outcomeResolver->summarizeOverdueMetrics($resolvedCollection);
        $reconciliation = $stateResolver->reconcileCohort($cases, $cutoff);
        $pepPrescribed = (int) $reconciliation['pep_prescribed'];
        $verifiedInitiation = (int) $reconciliation['verified_vaccine_initiation'];
        $pepCompliancePct = $pepPrescribed > 0 ? (int) round(($verifiedInitiation / $pepPrescribed) * 100) : 0;

        $dohDemographics = ['male' => 0, 'female' => 0, 'unknown_sex' => 0, 'age_below_15' => 0, 'age_15_above' => 0, 'age_unknown' => 0];
        $dohAnimals = ['dog' => 0, 'cat' => 0, 'other' => 0, 'unknown' => 0, 'stray' => 0, 'owned' => 0, 'animal_status_unknown' => 0];
        foreach ($cases as $case) {
            $gender = strtolower(trim((string) ($case->patient?->gender ?? '')));
            if ($gender === 'male') {
                $dohDemographics['male']++;
            } elseif ($gender === 'female') {
                $dohDemographics['female']++;
            } else {
                $dohDemographics['unknown_sex']++;
            }

            $age = $case->patient?->ageAtDate($case->bite_date ?? $cutoff);
            if ($age === null) {
                $dohDemographics['age_unknown']++;
            } elseif ($age < 15) {
                $dohDemographics['age_below_15']++;
            } else {
                $dohDemographics['age_15_above']++;
            }

            $animalKey = $reportingQuery->normalizedAnimalCategory($case);
            $dohAnimals[$animalKey] = ($dohAnimals[$animalKey] ?? 0) + 1;

            $animalStatus = strtolower(trim((string) ($case->animal_status ?? $case->intake?->animal_status ?? '')));
            if ($animalStatus === 'stray') {
                $dohAnimals['stray']++;
            } elseif ($animalStatus === 'owned') {
                $dohAnimals['owned']++;
            } else {
                $dohAnimals['animal_status_unknown']++;
            }
        }

        $isNewStartedCat = fn (array $s, string $cat): bool => $s['assessment'] === 'finalized'
            && $s['category'] === $cat
            && $s['pep_decision'] === 'new_course_prescribed'
            && (bool) ($s['administration_evidence']['has_vaccine_administration'] ?? false);

        $isNewCompletedCat = fn (array $s, string $cat): bool => $isNewStartedCat($s, $cat)
            && (bool) ($s['course_outcome']['is_completed'] ?? false)
            && (bool) ($s['course_outcome']['is_mature'] ?? false);

        $isRigVerifiedCat = fn (array $s, string $cat): bool => $s['assessment'] === 'finalized'
            && $s['category'] === $cat
            && (bool) ($s['rig_evidence']['rig_administered'] ?? false);

        $cohortRows = [];
        foreach (['I', 'II', 'III'] as $catKey) {
            $catStates = $resolvedCollection->filter(
                fn (array $s) => $s['assessment'] === 'finalized' && $s['category'] === $catKey
            );
            $cohortRows[] = [
                'category' => $catKey,
                'cases' => $catStates->count(),
                'given_pep' => $resolvedCollection->filter(fn (array $s) => $isNewStartedCat($s, $catKey))->count(),
                'completed' => $resolvedCollection->filter(fn (array $s) => $isNewCompletedCat($s, $catKey))->count(),
                'given_rig' => $resolvedCollection->filter(fn (array $s) => $isRigVerifiedCat($s, $catKey))->count(),
                'erig' => $catStates->filter(
                    fn (array $s) => strtoupper((string) ($s['rig_evidence']['administered_rig_type'] ?? '')) === 'ERIG'
                )->count(),
                'hrig' => $catStates->filter(
                    fn (array $s) => strtoupper((string) ($s['rig_evidence']['administered_rig_type'] ?? '')) === 'HRIG'
                )->count(),
                'no_administration_recorded' => $catStates->filter(
                    fn (array $s) => $s['pep_decision'] === 'new_course_prescribed'
                        && !((bool) ($s['administration_evidence']['has_vaccine_administration'] ?? false))
                )->count(),
                'transferred' => $catStates->where('encounter_disposition', 'transferred_referred')->count(),
            ];
        }

        $completedCat1 = $cohortRows[0]['completed'];
        $completedCat2 = $cohortRows[1]['completed'];
        $completedCat3 = $cohortRows[2]['completed'];
        $rigIndicatedTotal = $resolvedCollection->filter(
            fn (array $s) => (bool) ($s['rig_evidence']['rig_indicated'] ?? false)
        )->count();
        $rigGivenTotal = $resolvedCollection->filter(
            fn (array $s) => (bool) ($s['rig_evidence']['rig_administered'] ?? false)
        )->count();
        $erigTotal = $resolvedCollection->filter(
            fn (array $s) => strtoupper((string) ($s['rig_evidence']['administered_rig_type'] ?? '')) === 'ERIG'
        )->count();
        $hrigTotal = $resolvedCollection->filter(
            fn (array $s) => strtoupper((string) ($s['rig_evidence']['administered_rig_type'] ?? '')) === 'HRIG'
        )->count();
        $rigUnverifiedTotal = $resolvedCollection->filter(
            fn (array $s) => (bool) ($s['rig_evidence']['rig_administration_unverified'] ?? false)
        )->count();

        $stageCounts = $reconciliation['stage_counts'] ?? [];
        $stageMatrix = $stateResolver->buildStageMatrix($stageCounts);

        $reviewAgeMap = [];
        $ageBuckets = ['0_7_days' => 0, '8_30_days' => 0, 'over_30_days' => 0, 'total' => 0];
        $unknownLocationTotal = 0;
        $externalUnverifiedTotal = 0;

        foreach ($cases as $case) {
            $state = $resolvedMap[$case->bite_id];
            $reviewAge = $stateResolver->computeReviewAgeInfo($case, $state, $cutoff);
            $reviewAgeMap[$case->bite_id] = $reviewAge;
            if ($reviewAge['is_unresolved_review']) {
                $ageBuckets['total']++;
                $bucket = $reviewAge['review_age_bucket'];
                if ($bucket !== null && isset($ageBuckets[$bucket])) {
                    $ageBuckets[$bucket]++;
                }
            }
            if ($reportingQuery->normalizeExposureGeography($case, $clinicMunicipality, $clinicProvince)['scope'] === 'unknown') {
                $unknownLocationTotal++;
            }
            if ($state['encounter_disposition'] === 'transferred_referred'
                && !((bool) ($state['administration_evidence']['has_external_vaccine'] ?? false))
            ) {
                $externalUnverifiedTotal++;
            }
        }

        $completedTotal = $completedCat1 + $completedCat2 + $completedCat3;

        $metricFrom = $from ? $from->copy()->startOfDay() : $periodStart->copy()->startOfDay();
        $metricTo = $to ? $to->copy()->endOfDay() : $periodEnd->copy()->endOfDay();
        $metricFilters = array_filter([
            'category' => $severityFilter,
            'status' => $statusFilter,
            'animal' => $animalFilter,
            'search' => $searchFilter,
        ], fn ($v) => $v !== null && $v !== '');

        $arvPool = $reportingQuery->fetchIncidentsWithArvActivityInRange(
            $clinicId,
            $metricFrom->toDateString(),
            $metricTo->toDateString()
        );
        $d0CohortMetrics = $reportingQuery->computeD0CohortMetrics(
            $clinicId,
            $metricFrom,
            $metricTo,
            $cutoff,
            $metricFilters,
            $clinic,
            $arvPool
        );
        $servicePeriodMetrics = $reportingQuery->computeServicePeriodMetrics(
            $clinicId,
            $metricFrom,
            $metricTo,
            $cutoff,
            $metricFilters,
            $clinic,
            $arvPool
        );

        $priorCases = $previousResult['cases'];
        $priorResolvedMap = $previousResult['resolved_map'];
        $priorResolved = $priorCases->map(fn (BiteIncident $c) => $priorResolvedMap[$c->bite_id]);
        $priorReconciliation = $stateResolver->reconcileCohort($priorCases, $previousCutoff);
        $priorRigGiven = $priorResolved->filter(
            fn (array $s) => (bool) ($s['rig_evidence']['rig_administered'] ?? false)
        )->count();
        $priorCompleted = $this->countCategorizedNewCompleted($priorResolved);

        $dohSummary = [
            'scope' => [
                'privacy_mode' => $privacyMode,
                'period_start' => $metricFrom->toDateString(),
                'period_end' => $metricTo->toDateString(),
                'cutoff' => $cutoff->toDateString(),
            ],
            'demographics' => $dohDemographics,
            'categories' => [
                'I' => (int) $reconciliation['cat_I'],
                'II' => (int) $reconciliation['cat_II'],
                'III' => (int) $reconciliation['cat_III'],
                'categorized_total' => (int) $reconciliation['categorized_cases_total'],
                'not_yet_assessed' => (int) $reconciliation['awaiting_assessment'],
                'assessed_category_missing' => (int) $reconciliation['assessed_category_missing'],
                'unassessed_or_missing_total' => (int) $reconciliation['unassessed_or_missing_category'],
            ],
            'animals' => $dohAnimals,
            'pep_and_biologics' => [
                'recorded_exposures' => (int) $reconciliation['recorded_episodes'],
                'finalized_assessments' => (int) $reconciliation['finalized_assessments'],
                'awaiting_assessment' => (int) $reconciliation['awaiting_assessment'],
                'pep_prescribed' => $pepPrescribed,
                'new_course_prescribed' => (int) $reconciliation['new_course_prescribed'],
                'continuing_episodes' => (int) $reconciliation['continuing_episodes'],
                'given_pep' => (int) $reconciliation['new_course_started'],
                'verified_vaccine_initiation' => $verifiedInitiation,
                'no_administration_recorded' => (int) $reconciliation['new_course_no_receipt'],
                'all_prescribed_no_administration_recorded' => (int) $reconciliation['no_administration_recorded'],
                'explicit_no_pep' => (int) $reconciliation['explicit_no_pep'],
                'decision_missing' => (int) $reconciliation['decision_missing'],
                'rig_indicated' => $rigIndicatedTotal,
                'given_rig' => $rigGivenTotal,
                'erig' => $erigTotal,
                'hrig' => $hrigTotal,
                'rig_unverified' => $rigUnverifiedTotal,
            ],
            'completion_and_outcomes' => [
                'completed_cat_I' => $completedCat1,
                'completed_cat_II' => $completedCat2,
                'completed_cat_III' => $completedCat3,
                'completed_total' => $completedTotal,
                'all_completed_courses' => (int) $reconciliation['completed_courses'],
                'matured_courses' => (int) $reconciliation['matured_courses'],
                'matured_completed' => (int) $reconciliation['matured_completed'],
                'immature_courses' => (int) $reconciliation['immature_courses'],
                'transferred_referred' => (int) $reconciliation['transferred_referred'],
                'overdue_episodes' => (int) $overdueMetrics['overdue_episodes'],
                'outstanding_dose_slots' => (int) $overdueMetrics['outstanding_dose_slots'],
            ],
            'cohort_by_category' => [
                'excluded_unassessed_or_missing_cat' => (int) $reconciliation['unassessed_or_missing_category'],
                'rows' => $cohortRows,
            ],
            'data_quality_and_aging' => [
                'expected_pending' => [
                    'awaiting_assessment' => (int) $reconciliation['awaiting_assessment'],
                    'awaiting_treatment_initiation' => (int) $reconciliation['new_course_no_receipt'],
                    'immature_active_courses' => (int) $reconciliation['immature_courses'],
                ],
                'documentation_gaps' => [
                    'unknown_exposure_date' => (int) $unknownExposureDateCount,
                    'assessed_category_missing' => (int) $reconciliation['assessed_category_missing'],
                    'decision_missing' => (int) $reconciliation['decision_missing'],
                    'rig_indicated_no_verified_admin' => $rigUnverifiedTotal,
                    'external_treatment_unverified' => $externalUnverifiedTotal,
                    'unknown_exposure_location' => $unknownLocationTotal,
                ],
                'unresolved_review_age_buckets' => $ageBuckets,
            ],
            'reconciliation_bridge' => [
                'form_1_exposure_registry' => [
                    'recorded_episodes' => (int) $reconciliation['recorded_episodes'],
                    'unknown_exposure_date_episodes' => (int) $unknownExposureDateCount,
                    'awaiting_assessment' => (int) $reconciliation['awaiting_assessment'],
                    'finalized_assessments' => (int) $reconciliation['finalized_assessments'],
                ],
                'form_2_abtc_monthly' => [
                    'recorded_episodes' => (int) $reconciliation['recorded_episodes'],
                    'assessed_categorized_total' => (int) $reconciliation['categorized_cases_total'],
                    'excluded_unassessed' => (int) $reconciliation['awaiting_assessment'],
                    'excluded_category_missing' => (int) $reconciliation['assessed_category_missing'],
                    'reconciles_recorded_to_assessed' => ((int) $reconciliation['categorized_cases_total'] + (int) $reconciliation['unassessed_or_missing_category']) === (int) $reconciliation['recorded_episodes'],
                    'given_pep' => (int) $reconciliation['new_course_started'],
                    'no_administration_recorded' => (int) $reconciliation['new_course_no_receipt'],
                    'given_rig' => $rigGivenTotal,
                ],
                'form_3_quarterly_cohort' => [
                    'd0_cohort_started_courses' => (int) ($d0CohortMetrics['started_courses'] ?? 0),
                    'd0_mature_started_courses' => (int) ($d0CohortMetrics['mature_started_courses'] ?? 0),
                    'd0_completed_mature_courses' => (int) ($d0CohortMetrics['completed_mature_courses'] ?? 0),
                    'd0_completion_rate_pct' => $d0CohortMetrics['mature_completion_rate_pct'] ?? null,
                    'd0_ongoing_not_mature_courses' => (int) ($d0CohortMetrics['ongoing_not_mature_courses'] ?? 0),
                    'assessed_cohort_completed' => $completedTotal,
                ],
            ],
            'period_comparison' => [
                'prior_period_start' => $previousStart->toDateString(),
                'prior_period_end' => $previousEnd->toDateString(),
                'indicators' => [
                    'recorded_episodes' => $this->compareSummaryMetric((int) $reconciliation['recorded_episodes'], (int) $priorReconciliation['recorded_episodes']),
                    'assessed_cases' => $this->compareSummaryMetric((int) $reconciliation['categorized_cases_total'], (int) $priorReconciliation['categorized_cases_total']),
                    'awaiting_assessment' => $this->compareSummaryMetric((int) $reconciliation['awaiting_assessment'], (int) $priorReconciliation['awaiting_assessment']),
                    'given_pep' => $this->compareSummaryMetric((int) $reconciliation['new_course_started'], (int) $priorReconciliation['new_course_started']),
                    'no_administration_recorded' => $this->compareSummaryMetric((int) $reconciliation['new_course_no_receipt'], (int) $priorReconciliation['new_course_no_receipt']),
                    'given_rig' => $this->compareSummaryMetric($rigGivenTotal, $priorRigGiven),
                    'completed_pep' => $this->compareSummaryMetric($completedTotal, $priorCompleted),
                ],
            ],
            'form_2_decision_pending_count' => (int) ($stageCounts['form_2_decision_pending'] ?? 0),
            'stage_matrix' => $stageMatrix,
            'meeting_narrative' => (string) ($reconciliation['narrative'] ?? ''),
            'planning_projections' => app(\App\Services\Reporting\SupplyPlanningService::class)->computePlanningProjections(
                $clinicId,
                $clinic,
                CarbonImmutable::instance($metricFrom),
                CarbonImmutable::instance($metricTo),
                $cutoff,
                [
                    'reconciliation' => $reconciliation,
                    'unique_patients' => $cases->pluck('patient_id')->filter()->unique()->count(),
                ],
                $servicePeriodMetrics,
                $overdueMetrics
            ),
        ];

        $payload = [
            'rule_version' => ReportingMetricService::RULE_VERSION,
            'privacy_mode' => $privacyMode,
            'cutoff' => $cutoff->toDateString(),
            'summary' => [
                'total_cases' => $cases->count(),
                'active_cases' => $cases->filter(fn ($c) => in_array($resolvedMap[$c->bite_id]['resolved_status'], ['active', 'awaiting_treatment'], true))->count(),
                'awaiting_assessment' => (int) $reconciliation['awaiting_assessment'],
                'awaiting_treatment' => (int) $reconciliation['no_administration_recorded'],
                'completed' => $cases->filter(fn ($c) => in_array($resolvedMap[$c->bite_id]['resolved_status'], ['completed', 'completed_no_pep'], true))->count(),
                'high_risk_zones' => $locations->where('risk_level', 'high')->count(),
                'overdue_doses' => $overdueMetrics['overdue_episodes'],
                'overdue_episodes' => $overdueMetrics['overdue_episodes'],
                'overdue_patients' => $overdueMetrics['overdue_patients'],
                'overdue_courses' => $overdueMetrics['overdue_courses'],
                'outstanding_dose_slots' => $overdueMetrics['outstanding_dose_slots'],
                'pep_prescribed' => $pepPrescribed,
                'verified_vaccine_initiation' => $verifiedInitiation,
                'no_administration_recorded' => (int) $reconciliation['no_administration_recorded'],
                'pep_compliance' => $pepCompliancePct,
                'unknown_exposure_date_count' => $unknownExposureDateCount,
                'cutoff' => $cutoff->toDateString(),
                'journey_reconciliation' => $reconciliation,
            ],
            'journey_reconciliation' => $reconciliation,
            'reconciliation_bridge' => [
                'recorded_episodes_bridge' => $reconciliation['recorded_episodes_bridge'] ?? [],
            ],
            'd0_cohort_metrics' => $d0CohortMetrics,
            'service_period_metrics' => $servicePeriodMetrics,
            'doh_summary' => $dohSummary,
            'locations' => $locations->values()->all(),
            'risk_alerts' => [
                'high_risk_zones' => $locations->where('risk_level', 'high')->pluck('location')->values(),
                'overdue_count' => $overdueMetrics['overdue_episodes'],
            ],
        ];

        $meetingService = app(\App\Services\Reporting\MeetingReportService::class);
        $payload['insights'] = $meetingService->buildDescriptiveFindings(
            ['scope' => array_merge($dohSummary['scope'], ['rule_version' => ReportingMetricService::RULE_VERSION])],
            $dohSummary,
            $payload['locations']
        );
        $payload['limitations'] = $meetingService->buildLimitations(
            array_merge($dohSummary['scope'], ['unknown_exposure_date_count' => $unknownExposureDateCount]),
            $dohSummary
        );

        if ($aggregateOnly) {
            $payload = $meetingService->applyConferencePrivacy($payload, true);
        } else {
            $payload['cases'] = $cases->sortByDesc('bite_date')->values()->map(function (BiteIncident $case) use (
                $resolvedMap,
                $reviewAgeMap,
                $reportingQuery,
                $clinicMunicipality,
                $clinicProvince,
                $cutoff
            ) {
                $state = $resolvedMap[$case->bite_id];
                $stage = $state['stage_summary'];
                $course = $state['course_outcome'];
                $rig = $state['rig_evidence'];
                $reviewAge = $reviewAgeMap[$case->bite_id] ?? ['is_unresolved_review' => false, 'review_age_days' => null, 'review_age_bucket' => null];
                $expGeo = $reportingQuery->normalizeExposureGeography($case, $clinicMunicipality, $clinicProvince);

                return [
                    'bite_id' => $case->bite_id,
                    'case_number' => $case->case_number,
                    'patient_id' => $case->patient_id,
                    'patient_name' => $case->patient?->name ?? 'Unknown patient',
                    'age' => $case->patient?->ageAtDate($case->bite_date ?? $cutoff),
                    'gender' => $case->patient?->gender ? ucfirst(strtolower(trim((string) $case->patient->gender))) : 'Unknown',
                    'bite_date' => $case->bite_date?->format('M d, Y'),
                    'location' => trim((string) $case->bite_place) ?: 'Unknown',
                    'normalized_barangay' => $expGeo['barangay'],
                    'category' => $stage['category_display'],
                    'animal_type' => $reportingQuery->normalizedAnimalCategory($case),
                    'animal_status' => $case->animal_status ?? $case->intake?->animal_status ?? 'unassessed',
                    'status' => $stage['resolved_status'],
                    'last_completed_stage' => $stage['last_completed_stage'],
                    'stage_label' => $stage['stage_label'],
                    'what_can_be_reported' => $stage['what_can_be_reported'],
                    'treatment_decision_display' => $stage['treatment_decision_display'],
                    'administration_display' => $stage['administration_display'],
                    'vaccination_display' => $stage['vaccination_display'],
                    'external_treatment_display' => $stage['external_treatment_display'],
                    'pep_decision' => $state['pep_decision'],
                    'course_outcome' => $course['outcome'],
                    'completed_doses_count' => count($course['received_doses'] ?? []),
                    'required_doses_count' => count($course['required_doses'] ?? []),
                    'encounter_disposition' => $state['encounter_disposition'],
                    'rig_given' => $rig['administered_rig_type'] ?: 'None',
                    'rig_indicated' => $rig['indicated_rig_type'] ?: 'None',
                    'is_overdue' => (bool) ($course['is_overdue'] ?? false),
                    'days_overdue' => (int) ($course['days_overdue'] ?? 0),
                    'overdue_dose' => $course['overdue_dose'] ?? null,
                    'outstanding_dose_slot_count' => (int) ($course['outstanding_dose_slot_count'] ?? 0),
                    'is_unresolved_review' => $reviewAge['is_unresolved_review'],
                    'review_age_days' => $reviewAge['review_age_days'],
                    'review_age_bucket' => $reviewAge['review_age_bucket'],
                ];
            });
        }

        return $payload;
    }

    /**
     * Resolve and filter one comparison period uniformly so current and prior periods share identical rules.
     */
    private function resolveLocationSummaryPeriod(
        int $clinicId,
        ?Carbon $from,
        ?Carbon $to,
        CarbonImmutable $cutoff,
        ?string $severityFilter,
        ?string $animalFilter,
        ?string $statusFilter,
        ?string $searchFilter,
        EpisodeReportingStateResolver $stateResolver,
        ExposureReportingQuery $reportingQuery
    ): array {
        $query = BiteIncident::where('clinic_id', $clinicId)
            ->with(['patient.details', 'intake', 'appointments', 'treatmentRecords', 'treatmentPlan']);

        if ($from) {
            $query->whereDate('bite_date', '>=', $from->toDateString());
        }
        if ($to) {
            $query->whereDate('bite_date', '<=', $to->toDateString());
        }
        if ($searchFilter !== null && $searchFilter !== '') {
            $isUnrecorded = in_array(strtolower(trim($searchFilter)), ['unknown', 'not recorded', 'unrecorded', 'place not recorded'], true);
            $query->where(function ($q) use ($searchFilter, $isUnrecorded) {
                if ($isUnrecorded) {
                    $q->whereNull('bite_place')
                        ->orWhere('bite_place', '')
                        ->orWhere('bite_place', 'like', '%unknown%');
                } else {
                    $q->where('case_number', 'like', "%{$searchFilter}%")
                        ->orWhere('bite_place', 'like', "%{$searchFilter}%")
                        ->orWhereHas('patient', fn ($patient) => $patient->searchName($searchFilter));
                }
            });
        }

        $rawCases = $query->get()
            ->reject(fn (BiteIncident $case) => in_array(strtolower(trim((string) $case->status)), ['void', 'voided', 'duplicate'], true))
            ->filter(fn (BiteIncident $case) => $animalFilter === null || $reportingQuery->normalizedAnimalCategory($case) === $animalFilter)
            ->filter(function (BiteIncident $case) use ($severityFilter): bool {
                if ($severityFilter === null || in_array($severityFilter, ['not_yet_assessed', 'assessed_category_missing'], true)) {
                    return true;
                }

                return $case->bite_category === $severityFilter;
            })
            ->values();

        $unknownExposureDateCount = $rawCases
            ->filter(fn (BiteIncident $case) => $case->hasProvisionalBiteDate())
            ->count();

        $verifiedCases = $rawCases
            ->reject(fn (BiteIncident $case) => $case->hasProvisionalBiteDate())
            ->values();

        $resolvedMap = [];
        $cases = $verifiedCases->filter(function (BiteIncident $case) use ($statusFilter, $severityFilter, $stateResolver, $cutoff, &$resolvedMap) {
            $state = $stateResolver->resolve($case, $cutoff);
            $resolvedMap[$case->bite_id] = $state;
            $case->setAttribute('resolved_status', $state['resolved_status']);

            if ($severityFilter === 'not_yet_assessed' && $state['assessment'] === 'finalized') {
                return false;
            }
            if ($severityFilter === 'assessed_category_missing'
                && ($state['assessment'] !== 'finalized' || in_array($state['category'], ['I', 'II', 'III'], true))
            ) {
                return false;
            }

            if ($statusFilter !== null && $statusFilter !== '' && $statusFilter !== 'all') {
                if (in_array($statusFilter, ['transferred_out', 'transferred_referred'], true)) {
                    return in_array($state['resolved_status'], ['transferred_out', 'transferred_referred'], true)
                        || $state['encounter_disposition'] === 'transferred_referred';
                }

                if (in_array($statusFilter, ['form_1_registration', 'form_1_registration_only'], true)) {
                    return ($state['stage_summary']['last_completed_stage'] ?? '') === 'form_1_registration';
                }

                if (in_array($statusFilter, ['treatment_recorded', 'form_3_treatment_recorded'], true)) {
                    return ($state['stage_summary']['last_completed_stage'] ?? '') === 'form_3_treatment_recorded';
                }

                if (in_array($statusFilter, ['form_2_pep_prescribed', 'form_2_no_pep', 'form_2_transferred'], true)) {
                    return ($state['stage_summary']['last_completed_stage'] ?? '') === $statusFilter;
                }

                if ($statusFilter === 'no_administration_recorded') {
                    return $state['pep_decision'] === 'new_course_prescribed'
                        && !((bool) ($state['administration_evidence']['has_vaccine_administration'] ?? false));
                }

                if ($statusFilter === 'unresolved_review') {
                    return (bool) $stateResolver->computeReviewAgeInfo($case, $state, $cutoff)['is_unresolved_review'];
                }

                if (in_array($statusFilter, ['unresolved_review_0_7_days', 'unresolved_review_8_30_days', 'unresolved_review_over_30_days'], true)) {
                    $targetBucket = str_replace('unresolved_review_', '', $statusFilter);

                    return $stateResolver->computeReviewAgeInfo($case, $state, $cutoff)['review_age_bucket'] === $targetBucket;
                }

                return $state['resolved_status'] === $statusFilter;
            }

            return true;
        })->values();

        return [
            'cases' => $cases,
            'resolved_map' => $resolvedMap,
            'unknown_exposure_date_count' => $unknownExposureDateCount,
        ];
    }

    private function countCategorizedNewCompleted(Collection $resolvedStates): int
    {
        return $resolvedStates->filter(
            fn (array $s) => $s['assessment'] === 'finalized'
                && in_array($s['category'], ['I', 'II', 'III'], true)
                && $s['pep_decision'] === 'new_course_prescribed'
                && (bool) ($s['administration_evidence']['has_vaccine_administration'] ?? false)
                && (bool) ($s['course_outcome']['is_completed'] ?? false)
                && (bool) ($s['course_outcome']['is_mature'] ?? false)
        )->count();
    }

    private function compareSummaryMetric(int|float $current, int|float $prior): array
    {
        $delta = $current - $prior;

        return [
            'current' => $current,
            'prior' => $prior,
            'delta' => $delta,
            'pct_change' => $prior > 0 ? round(($delta / $prior) * 100, 1) : null,
            'pct_change_reason' => $prior > 0 ? null : ($current === 0 ? 'both_zero' : 'prior_period_zero'),
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
            $query->whereIn('status', ['active', 'completed', 'finished', 'transferred_out']);
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
