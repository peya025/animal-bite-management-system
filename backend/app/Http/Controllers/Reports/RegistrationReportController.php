<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;

use App\Http\Requests\Reports\RegistrationReportRequest;
use App\Services\RegistrationReportService;
use Symfony\Component\HttpFoundation\Response;

class RegistrationReportController extends Controller
{
    public function __construct(
        protected RegistrationReportService $registrationReportService
    ) {}

    /**
     * Handle registration report queries, CSV exports, and print views.
     */
    public function index(RegistrationReportRequest $request): Response
    {
        $clinicId = $request->user()->clinic_id;
        abort_unless($clinicId, 403, 'A clinic assignment is required to view reports.');

        return $this->registrationReportService->generateReportResponse(
            $request->user(),
            $request->validated()
        );
    }
}
