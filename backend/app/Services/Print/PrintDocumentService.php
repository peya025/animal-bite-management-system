<?php

namespace App\Services\Print;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\DohReportService;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class PrintDocumentService
{
    public function __construct(
        protected DohReportService $dohReportService
    ) {}

    /**
     * Resolve authenticated staff user from session/bearer or non-expired query token.
     */
    public function resolveAuthenticatedUser(Request $request): ?User
    {
        $user = $request->user('sanctum') ?? $request->user();
        if (!$user) {
            $rawToken = $request->query('token') ?? $request->bearerToken();
            if (is_string($rawToken) && $rawToken !== '') {
                $tokenModel = PersonalAccessToken::findToken($rawToken);
                if (
                    $tokenModel
                    && (!$tokenModel->expires_at || !$tokenModel->expires_at->isPast())
                    && $tokenModel->tokenable instanceof User
                ) {
                    $user = $tokenModel->tokenable;
                }
            }
        }

        return $user instanceof User ? $user : null;
    }

    /**
     * Enforce report/print authentication, active staff role, and strict clinic isolation.
     */
    public function authorizePrintRequest(Request $request, ?int $expectedClinicId = null): array
    {
        $user = $this->resolveAuthenticatedUser($request);
        $clinicId = $this->dohReportService->authorizeReportAccess($request, $user, $expectedClinicId);

        return [$user, $clinicId];
    }

    /**
     * Prepare data payload for Form 1 Patient Enrolment Record printout.
     */
    public function getEnrolmentData(Request $request, Patient $patient): array
    {
        [$user, $clinicId] = $this->authorizePrintRequest(
            $request,
            $patient->clinic_id ? (int) $patient->clinic_id : null
        );

        $patient->load(['clinic', 'details']);

        if (!$patient->clinic) {
            $clinic = Clinic::find($clinicId);
            if ($clinic) {
                $patient->setRelation('clinic', $clinic);
            }
        }

        $latestConsultation = TreatmentRecord::where('patient_id', $patient->patient_id)
            ->whereNull('dose_number')
            ->whereNotNull('consultation_date')
            ->latest('consultation_date')
            ->latest('treatment_id')
            ->first();

        return compact('patient', 'latestConsultation');
    }

    /**
     * Prepare data payload for Rabies Exposure Registry printout.
     */
    public function getExposureRegistryData(Request $request): array
    {
        [$user, $clinicId] = $this->authorizePrintRequest($request);

        return $this->dohReportService->getExposureRegistry(
            clinicId: $clinicId,
            fromDate: $request->query('from'),
            toDate: $request->query('to'),
            quarter: $request->query('quarter'),
            year: $request->query('year') ? (int) $request->query('year') : null,
            user: $user,
            category: $request->query('category'),
            cutoffDate: $request->query('cutoff')
        );
    }

    /**
     * Prepare data payload for ABTC Monthly Report printout.
     */
    public function getMonthlyReportData(Request $request): array
    {
        [$user, $clinicId] = $this->authorizePrintRequest($request);

        return $this->dohReportService->getMonthlyReport(
            clinicId: $clinicId,
            monthStr: $request->query('month'),
            user: $user,
            category: $request->query('category'),
            fromDate: $request->query('from'),
            toDate: $request->query('to'),
            cutoffDate: $request->query('cutoff')
        );
    }

    /**
     * Prepare data payload for Cohort Report printout.
     */
    public function getCohortReportData(Request $request): array
    {
        [$user, $clinicId] = $this->authorizePrintRequest($request);

        return $this->dohReportService->getCohortReport(
            clinicId: $clinicId,
            yearParam: $request->query('year') ? (int) $request->query('year') : null,
            user: $user,
            category: $request->query('category'),
            cutoffDate: $request->query('cutoff')
        );
    }

    /**
     * Prepare data payload for the Bite Cases Summary A4 Meeting Pack printout.
     */
    public function getBiteSummaryMeetingPackData(Request $request): array
    {
        [$user, $clinicId] = $this->authorizePrintRequest($request);

        return app(\App\Services\Reporting\MeetingReportService::class)->getMeetingPackPrintData(
            $clinicId,
            $request->query(),
            $user
        );
    }

    /**
     * Phase 4: Prepare aggregate-only (zero PII) Barangay / MAO Advisory Memorandum data.
     */
    public function getBarangayAdvisoryMemoData(Request $request): array
    {
        [$user, $clinicId] = $this->authorizePrintRequest($request);
        $barangay = trim((string) $request->query('barangay', ''));
        if ($barangay === '') {
            abort(422, 'Barangay parameter is required.');
        }

        $clinic = \App\Models\Clinic::find($clinicId);
        $cutoff = \Carbon\CarbonImmutable::now()->endOfDay();
        $alertService = app(\App\Services\Reporting\ClinicalRiskAlertService::class);
        $surgeData = $alertService->detectBarangaySurges($clinicId, $cutoff);

        $matchedAlert = collect($surgeData['alerts'])
            ->first(fn (array $a) => strcasecmp((string) $a['barangay'], $barangay) === 0);

        // Compute aggregate animal breakdown (zero PII) for this barangay over last 7 days
        $reportingQuery = app(\App\Services\Reporting\ExposureReportingQuery::class);
        $windowStart = $surgeData['window_7d_start'];
        $windowEnd = $surgeData['window_7d_end'];
        $municipality = trim((string) ($clinic?->municipality ?: 'Tagoloan'));
        $province = trim((string) ($clinic?->province ?: 'Misamis Oriental'));

        $episodes = \App\Models\BiteIncident::where('clinic_id', $clinicId)
            ->whereDate('bite_date', '>=', $windowStart)
            ->whereDate('bite_date', '<=', $windowEnd)
            ->with(['intake'])
            ->get()
            ->filter(function (\App\Models\BiteIncident $ep) use ($reportingQuery, $municipality, $province, $barangay) {
                if (in_array(strtolower((string) $ep->status), ['void', 'voided', 'duplicate', 'cancelled'], true) || $ep->hasProvisionalBiteDate()) {
                    return false;
                }
                $geo = $reportingQuery->normalizeExposureGeography($ep, $municipality, $province);
                return strcasecmp((string) ($geo['barangay'] ?? ''), $barangay) === 0;
            });

        $dogs = 0;
        $cats = 0;
        $stray = 0;
        $owned = 0;
        foreach ($episodes as $ep) {
            $animal = $reportingQuery->normalizedAnimalCategory($ep);
            if ($animal === 'dog') $dogs++;
            elseif ($animal === 'cat') $cats++;
            $owner = $reportingQuery->normalizedAnimalOwnership($ep);
            if ($owner === 'stray') $stray++;
            elseif ($owner === 'owned') $owned++;
        }

        return [
            'clinic_name' => $clinic?->name ?? 'Tagoloan Animal Bite Treatment Center',
            'municipality' => $municipality,
            'province' => $province,
            'health_officer_name' => $clinic?->health_officer_name ?? 'Municipal Health Officer',
            'prepared_by_name' => $user->name ?? 'ABTC Staff',
            'generated_at' => now()->format('F j, Y g:i A'),
            'memo_date' => now()->format('F j, Y'),
            'barangay' => $matchedAlert['barangay'] ?? $barangay,
            'window_7d_start' => $windowStart,
            'window_7d_end' => $windowEnd,
            'alert_level' => $matchedAlert['level'] ?? 'advisory',
            'total_7d' => (int) ($matchedAlert['total_7d'] ?? $episodes->count()),
            'cat_1_7d' => (int) ($matchedAlert['cat_1_7d'] ?? 0),
            'cat_2_7d' => (int) ($matchedAlert['cat_2_7d'] ?? 0),
            'cat_3_7d' => (int) ($matchedAlert['cat_3_7d'] ?? 0),
            'awaiting_assessment_7d' => (int) ($matchedAlert['awaiting_assessment_7d'] ?? 0),
            'baseline_weekly_avg' => $matchedAlert['baseline_weekly_avg'] ?? null,
            'surge_ratio' => $matchedAlert['surge_ratio'] ?? null,
            'reason' => $matchedAlert['reason'] ?? 'Elevated animal bite presentations reported in this barangay over the past 7 days.',
            'dogs_7d' => $dogs,
            'cats_7d' => $cats,
            'stray_7d' => $stray,
            'owned_7d' => $owned,
        ];
    }

    /**
     * Phase 4: Prepare 1-page Daily Shift Turnover Print Slip data.
     */
    public function getDailyTurnoverSlipData(Request $request): array
    {
        [$user, $clinicId] = $this->authorizePrintRequest($request);
        $clinic = \App\Models\Clinic::find($clinicId);

        $dateParam = trim((string) $request->query('date', ''));
        $targetDate = $dateParam !== ''
            ? \Carbon\CarbonImmutable::parse($dateParam)->startOfDay()
            : \Carbon\CarbonImmutable::today();
        $targetDateStr = $targetDate->toDateString();
        $cutoffEnd = $targetDate->endOfDay();

        // 1. Today's Form 1 / Form 2 / Form 3 volumes
        $form1Today = \App\Models\BiteIncident::where('clinic_id', $clinicId)
            ->whereNotIn('status', ['void', 'voided', 'duplicate', 'cancelled'])
            ->whereDate('created_at', $targetDateStr)
            ->count();

        $form2Today = \App\Models\BiteIncident::where('clinic_id', $clinicId)
            ->whereNotIn('status', ['void', 'voided', 'duplicate', 'cancelled'])
            ->whereDate('confirmed_at', $targetDateStr)
            ->count();

        $form3RecordsToday = \App\Models\TreatmentRecord::where('clinic_id', $clinicId)
            ->whereNull('voided_at')
            ->whereNotNull('dose_number')
            ->whereIn('status', ['completed', 'administered'])
            ->where(fn ($q) => $q->where('is_external', false)->orWhereNull('is_external'))
            ->whereDate('treatment_date', $targetDateStr)
            ->get();

        $arvDosesToday = $form3RecordsToday->filter(fn ($r) => (int) $r->dose_number >= 0 && (int) $r->dose_number < 200)->count();
        $rigDosesToday = $form3RecordsToday->filter(fn ($r) => in_array((int) $r->dose_number, [200, 201], true))->count();

        // 2. Shift endorsement list: RIG Pending + Animal Died/Sick + Day-14 Observation Due
        $recentStart = $targetDate->subDays(30)->toDateString();
        $recentEpisodes = \App\Models\BiteIncident::where('clinic_id', $clinicId)
            ->whereNotIn('status', ['void', 'voided', 'duplicate', 'cancelled'])
            ->where(function ($q) use ($recentStart) {
                $q->whereDate('created_at', '>=', $recentStart)
                    ->orWhereDate('bite_date', '>=', $recentStart);
            })
            ->with(['patient:patient_id,first_name,last_name,contact_number', 'intake', 'treatmentPlan', 'treatmentRecords', 'appointments'])
            ->get();

        $stateResolver = new \App\Services\Reporting\EpisodeReportingStateResolver(
            new \App\Services\Reporting\TreatmentOutcomeResolver()
        );
        $alertService = app(\App\Services\Reporting\ClinicalRiskAlertService::class);
        $reportingQuery = app(\App\Services\Reporting\ExposureReportingQuery::class);
        $biteCaseService = app(\App\Services\Clinical\BiteCaseService::class);

        $rigPendingList = [];
        $highRiskAnimalsList = [];
        $day14DueList = [];

        foreach ($recentEpisodes as $ep) {
            $state = $stateResolver->resolve($ep, $cutoffEnd);
            $patientName = trim((string) (($ep->patient?->first_name ?? '') . ' ' . ($ep->patient?->last_name ?? ''))) ?: 'Unknown';
            $isOpen = !in_array($state['resolved_status'] ?? '', ['completed', 'completed_no_pep', 'transferred'], true);

            if ($alertService->isRigPending($state)) {
                $rigPendingList[] = [
                    'case_number' => $ep->case_number,
                    'patient_name' => $patientName,
                    'contact' => $ep->patient?->contact_number ?: '—',
                    'bite_date' => $ep->bite_date?->format('M j, Y') ?? 'Unknown',
                    'hours_elapsed' => $alertService->rigPendingHours($ep, $state, $cutoffEnd),
                    'rig_indicated' => $state['rig_evidence']['indicated_rig_type'] ?: 'ERIG/HRIG',
                ];
            }

            $cond = $reportingQuery->normalizedAnimalCondition($ep);
            $owner = $reportingQuery->normalizedAnimalOwnership($ep);
            if ($isOpen && in_array($cond, ['died', 'sick'], true)) {
                $highRiskAnimalsList[] = [
                    'case_number' => $ep->case_number,
                    'patient_name' => $patientName,
                    'animal' => ucfirst($reportingQuery->normalizedAnimalCategory($ep)),
                    'condition' => ucfirst($cond),
                    'stage' => $state['stage_summary']['stage_label'] ?? $state['resolved_status'],
                ];
            }

            $obs = $biteCaseService->resolveAnimalObservationMeta($ep, $owner, $cond, $cutoffEnd);
            if ($isOpen && $obs['due']) {
                $day14DueList[] = [
                    'case_number' => $ep->case_number,
                    'patient_name' => $patientName,
                    'animal' => ucfirst($reportingQuery->normalizedAnimalCategory($ep)),
                    'day' => $obs['day'],
                ];
            }
        }

        // 3. Vials opened today & open-vial wastage
        $vialsOpenedToday = \App\Models\VaccineVial::where('clinic_id', $clinicId)
            ->whereDate('opened_at', $targetDateStr)
            ->get();
        $vialsOpenedCount = $vialsOpenedToday->count();
        $portionsExtractedToday = (int) $vialsOpenedToday->sum('administered_portions');
        $portionsWastedToday = (int) \App\Models\VaccineVialWastage::where('clinic_id', $clinicId)
            ->whereDate('disposed_at', $targetDateStr)
            ->sum('portions_discarded');

        // 4. Tomorrow's expected follow-ups & vials to prepare (from SupplyPlanningService)
        $supply = app(\App\Services\Reporting\SupplyPlanningService::class)
            ->buildFollowupVialSchedule($clinicId, 7, $targetDate);
        $tomorrowRow = $supply['daily_schedule'][1] ?? null;
        $vialReadiness = $supply['vial_readiness'];

        return [
            'clinic_name' => $clinic?->name ?? 'Tagoloan Animal Bite Treatment Center',
            'municipality' => $clinic?->municipality ?? 'Tagoloan',
            'province' => $clinic?->province ?? 'Misamis Oriental',
            'turnover_date' => $targetDate->format('F j, Y (l)'),
            'generated_at' => now()->format('F j, Y g:i A'),
            'prepared_by_name' => $user->name ?? 'ABTC Nurse',
            'today_volumes' => [
                'form1_registrations' => $form1Today,
                'form2_assessments' => $form2Today,
                'form3_arv_doses' => $arvDosesToday,
                'form3_rig_doses' => $rigDosesToday,
            ],
            'vial_summary_today' => [
                'vials_opened' => $vialsOpenedCount,
                'portions_extracted' => $portionsExtractedToday,
                'portions_wasted' => $portionsWastedToday,
                'usable_arv_vials' => $vialReadiness['usable_arv_vials'] ?? 0,
                'usable_rig_vials' => $vialReadiness['usable_rig_vials'] ?? 0,
            ],
            'tomorrow_prep' => $tomorrowRow,
            'vial_readiness' => $vialReadiness,
            'rig_pending_list' => $rigPendingList,
            'high_risk_animals_list' => $highRiskAnimalsList,
            'day14_due_list' => $day14DueList,
        ];
    }
}
