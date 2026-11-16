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
}
