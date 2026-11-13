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
     * Resolve authenticated user from request session/bearer or query token.
     */
    public function resolveAuthenticatedUser(Request $request): ?User
    {
        $user = $request->user();
        if (!$user && $request->query('token')) {
            $tokenModel = PersonalAccessToken::findToken($request->query('token'));
            if ($tokenModel && $tokenModel->tokenable instanceof User) {
                $user = $tokenModel->tokenable;
            }
        }

        return $user;
    }

    /**
     * Prepare data payload for Form 1 Patient Enrolment Record printout.
     */
    public function getEnrolmentData(Request $request, Patient $patient): array
    {
        $patient->load(['clinic', 'details']);

        if (!$patient->clinic) {
            $user = $this->resolveAuthenticatedUser($request);
            $clinicId = $user?->clinic_id ?? $request->query('clinic_id');
            $clinic = ($clinicId ? Clinic::find($clinicId) : null) ?? Clinic::first();
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
        $user = $this->resolveAuthenticatedUser($request);
        $clinicId = $user?->clinic_id ?? $request->query('clinic_id') ?? Clinic::first()?->id;
        abort_unless($clinicId, 403, 'A clinic assignment is required.');

        return $this->dohReportService->getExposureRegistry(
            clinicId: (int) $clinicId,
            fromDate: $request->query('from'),
            toDate: $request->query('to'),
            quarter: $request->query('quarter'),
            year: $request->query('year') ? (int) $request->query('year') : null,
            user: $user,
            category: $request->query('category')
        );
    }

    /**
     * Prepare data payload for ABTC Monthly Report printout.
     */
    public function getMonthlyReportData(Request $request): array
    {
        $user = $this->resolveAuthenticatedUser($request);
        $clinicId = $user?->clinic_id ?? $request->query('clinic_id') ?? Clinic::first()?->id;
        abort_unless($clinicId, 403, 'A clinic assignment is required.');

        return $this->dohReportService->getMonthlyReport(
            clinicId: (int) $clinicId,
            monthStr: $request->query('month'),
            user: $user,
            category: $request->query('category'),
            fromDate: $request->query('from'),
            toDate: $request->query('to')
        );
    }

    /**
     * Prepare data payload for Cohort Report printout.
     */
    public function getCohortReportData(Request $request): array
    {
        $user = $this->resolveAuthenticatedUser($request);
        $clinicId = $user?->clinic_id ?? $request->query('clinic_id') ?? Clinic::first()?->id;
        abort_unless($clinicId, 403, 'A clinic assignment is required.');

        return $this->dohReportService->getCohortReport(
            clinicId: (int) $clinicId,
            yearParam: $request->query('year') ? (int) $request->query('year') : null,
            user: $user,
            category: $request->query('category')
        );
    }
}
