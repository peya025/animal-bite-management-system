<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;

use App\Http\Requests\Vaccination\AdministerVaccinationRequest;
use App\Http\Requests\Vaccination\RescheduleVaccinationRequest;
use App\Http\Requests\Vaccination\UpdateVaccinationScheduleRequest;
use App\Models\VaccinationSchedule;
use App\Services\VaccinationScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VaccinationController extends Controller
{
    public function __construct(
        private readonly VaccinationScheduleService $vaccinationService,
    ) {}

    /**
     * GET /api/vaccinations
     * Access: all authenticated staff
     */
    public function index(Request $request): JsonResponse
    {
        $schedules = $this->vaccinationService->listSchedules(
            $request->user()->clinic_id,
            $request->only(['status', 'from_date', 'to_date', 'patient_id']),
        );

        return response()->json($schedules);
    }

    /**
     * GET /api/vaccinations/today
     * Access: all authenticated staff
     */
    public function today(Request $request): JsonResponse
    {
        return response()->json(
            $this->vaccinationService->todaySchedules($request->user()->clinic_id),
        );
    }

    /**
     * GET /api/vaccinations/upcoming
     * Access: all authenticated staff
     */
    public function upcoming(Request $request): JsonResponse
    {
        return response()->json(
            $this->vaccinationService->upcomingSchedules(
                $request->user()->clinic_id,
                (int) $request->get('days', 7),
            ),
        );
    }

    /**
     * GET /api/vaccinations/overdue
     * Access: all authenticated staff
     */
    public function overdue(Request $request): JsonResponse
    {
        return response()->json(
            $this->vaccinationService->overdueSchedules($request->user()->clinic_id),
        );
    }

    /**
     * GET /api/vaccinations/{id}
     * Access: all authenticated staff
     */
    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json(
            $this->vaccinationService->findSchedule($request->user()->clinic_id, $id),
        );
    }

    /**
     * POST /api/vaccinations/{id}/administer
     * Access: admin, treatment (triage doctors explicitly blocked)
     */
    public function administer(AdministerVaccinationRequest $request, int $id): JsonResponse
    {
        $user = $request->user();

        if ($user->isTriage() && !$user->isAdmin() && !$user->isNursing()) {
            return response()->json([
                'message' => 'Unauthorized. Triage doctors are not permitted to administer vaccines.',
            ], 403);
        }

        $schedule = VaccinationSchedule::where('clinic_id', $user->clinic_id)->findOrFail($id);

        if ($schedule->status === 'completed') {
            return response()->json([
                'message' => 'This vaccination has already been administered',
            ], 400);
        }

        $schedule = $this->vaccinationService->administer($schedule, $user, $request->validated());

        return response()->json([
            'message'  => 'Vaccination recorded successfully',
            'schedule' => $schedule,
        ]);
    }

    /**
     * PUT /api/vaccinations/{id}
     * Access: admin, triage
     */
    public function update(UpdateVaccinationScheduleRequest $request, int $id): JsonResponse
    {
        $schedule = VaccinationSchedule::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);

        $schedule = $this->vaccinationService->update(
            $schedule,
            $request->validated(),
            $request->user()->clinic_id,
        );

        return response()->json([
            'message'  => 'Vaccination schedule updated successfully',
            'schedule' => $schedule,
        ]);
    }

    /**
     * POST /api/vaccinations/{id}/missed
     * Access: admin, treatment
     */
    public function markAsMissed(Request $request, int $id): JsonResponse
    {
        $schedule = VaccinationSchedule::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);

        $schedule = $this->vaccinationService->markAsMissed(
            $schedule,
            $request->get('reason'),
            $request->user()->clinic_id,
        );

        return response()->json([
            'message'  => 'Vaccination marked as missed',
            'schedule' => $schedule,
        ]);
    }

    /**
     * POST /api/vaccinations/{id}/reschedule
     * Access: admin, triage
     */
    public function reschedule(RescheduleVaccinationRequest $request, int $id): JsonResponse
    {
        $schedule = VaccinationSchedule::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);

        $schedule = $this->vaccinationService->reschedule(
            $schedule,
            $request->validated('new_date'),
            $request->validated('reason'),
            $request->user()->clinic_id,
        );

        return response()->json([
            'message'  => 'Vaccination rescheduled successfully',
            'schedule' => $schedule,
        ]);
    }

    /**
     * GET /api/vaccinations/statistics
     * Access: all authenticated staff
     */
    public function statistics(Request $request): JsonResponse
    {
        return response()->json(
            $this->vaccinationService->statistics($request->user()->clinic_id),
        );
    }
}
