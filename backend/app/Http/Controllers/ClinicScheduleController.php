<?php

namespace App\Http\Controllers;

use App\Http\Requests\Clinic\StoreScheduleExceptionRequest;
use App\Http\Requests\Clinic\UpdateSchedulePoliciesRequest;
use App\Http\Requests\Clinic\UpdateWeeklyScheduleRequest;
use App\Services\ClinicScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicScheduleController extends Controller
{
    public function __construct(
        protected ClinicScheduleService $scheduleService
    ) {}

    /**
     * Get clinic weekly schedule, exceptions, and policies (Admin)
     * GET /api/clinics/schedule
     */
    public function getSchedule(Request $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $data = $this->scheduleService->getScheduleWithDetails($clinicId);

        return response()->json($data);
    }

    /**
     * Get all schedule exceptions for a clinic (Admin)
     * GET /api/clinics/schedule/exceptions
     */
    public function getExceptions(Request $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $exceptions = $this->scheduleService->getExceptions($clinicId);

        return response()->json($exceptions);
    }

    /**
     * Update weekly recurring operating schedule (Admin)
     * PUT /api/clinics/schedule/weekly
     */
    public function updateWeeklySchedule(UpdateWeeklyScheduleRequest $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $result = $this->scheduleService->updateWeeklySchedule($clinicId, $request->validated('schedules'));
        $shiftedCount = $result['shifted_count'];

        return response()->json([
            'message'       => 'Weekly operating schedule updated successfully' . ($shiftedCount > 0 ? " ({$shiftedCount} upcoming appointment(s) rescheduled)" : ''),
            'schedules'     => $result['schedules'],
            'shifted_count' => $shiftedCount,
        ]);
    }

    /**
     * Store or update a calendar exception / holiday override (Admin)
     * POST /api/clinics/schedule/exceptions
     */
    public function storeException(StoreScheduleExceptionRequest $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $result = $this->scheduleService->storeException($clinicId, $request->validated(), $request->user()?->id);
        $shiftedCount = $result['shifted_count'];

        return response()->json([
            'message'       => 'Schedule exception saved successfully' . ($shiftedCount > 0 ? " ({$shiftedCount} upcoming appointment(s) rescheduled)" : ''),
            'exception'     => $result['exception'],
            'shifted_count' => $shiftedCount,
        ]);
    }

    /**
     * Delete a calendar exception (Admin)
     * DELETE /api/clinics/schedule/exceptions/{id}
     */
    public function deleteException(Request $request, $id): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $shiftedCount = $this->scheduleService->deleteException($clinicId, (int) $id);

        return response()->json([
            'message'       => 'Schedule exception removed successfully' . ($shiftedCount > 0 ? " ({$shiftedCount} upcoming appointment(s) rescheduled)" : ''),
            'shifted_count' => $shiftedCount,
        ]);
    }

    /**
     * Update clinic PEP regimen drift & emergency policies (Admin)
     * PUT /api/clinics/schedule/policies
     */
    public function updatePolicies(UpdateSchedulePoliciesRequest $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $result = $this->scheduleService->updatePolicies($clinicId, $request->validated());
        $shiftedCount = $result['shifted_count'];

        return response()->json([
            'message'       => 'Clinic schedule and emergency policies updated successfully' . ($shiftedCount > 0 ? " ({$shiftedCount} upcoming appointment(s) rescheduled)" : ''),
            'clinic'        => $result['clinic'],
            'shifted_count' => $shiftedCount,
        ]);
    }

    /**
     * Explicit trigger to recalculate and synchronize pending appointments
     * POST /api/clinics/schedule/recalculate
     */
    public function recalculate(Request $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $shiftedCount = $this->scheduleService->recalculatePendingAppointments($clinicId);

        return response()->json([
            'message'       => "Successfully re-evaluated and synchronized scheduled appointments ({$shiftedCount} moved to valid open days).",
            'shifted_count' => $shiftedCount,
        ]);
    }

    /**
     * Public bridge helper for backwards compatibility
     */
    public function recalculatePendingAppointments(int $clinicId): int
    {
        return $this->scheduleService->recalculatePendingAppointments($clinicId);
    }

    /**
     * Public / Mobile Schedule Availability Summary
     * GET /api/clinics/{id}/schedule-summary
     */
    public function getScheduleSummary(Request $request, $clinicId = null): JsonResponse
    {
        $targetClinicId = $clinicId ? (int) $clinicId : $this->resolveClinicId($request);
        $summary = $this->scheduleService->getScheduleSummary($targetClinicId);

        return response()->json($summary);
    }

    /**
     * Resolve target clinic ID
     */
    private function resolveClinicId(Request $request): int
    {
        return (int) ($request->user()?->clinic_id ?? 1);
    }
}
