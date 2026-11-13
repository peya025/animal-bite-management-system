<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;

use App\Http\Requests\Vaccination\BulkRecallRequest;
use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Services\AppointmentReminderService;
use App\Services\VaccinationJourneyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VaccinationJourneyController extends Controller
{
    public function __construct(
        private readonly AppointmentReminderService $reminderService,
        private readonly VaccinationJourneyService  $journeyService,
    ) {}

    /**
     * GET /api/vaccinations/journey-matrix
     * Consolidated PEP Vaccination Journey Matrix for all active patients.
     */
    public function journeyMatrix(Request $request): JsonResponse
    {
        $clinicId    = $request->user()?->clinic_id ?? 1;
        $patientId   = $request->get('patient_id') ? (int) $request->get('patient_id') : null;
        $page        = max(1, (int) $request->get('page', 1));
        $perPage     = max(1, (int) $request->get('per_page', 10));

        $result = $this->journeyService->buildMatrix(
            clinicId:      $clinicId,
            search:        $request->get('search'),
            patientId:     $patientId,
            appointmentId: $request->get('appointment_id') ? (int) $request->get('appointment_id') : null,
            channelFilter: $request->get('channel', 'all'),
            statusFilter:  $request->get('status', 'all'),
            page:          $page,
            perPage:       $perPage,
        );

        return response()->json($result);
    }

    /**
     * POST /api/appointments/{id}/recall
     * Dispatch 1-click multi-channel recall for a single missed appointment.
     */
    public function recallSingle(Request $request, int $id): JsonResponse
    {
        $appointment   = Appointment::findOrFail($id);
        $channel       = $request->get('channel', 'all');
        $customMessage = $request->get('message');
        $senderId      = $request->user()?->id;

        $res = $this->reminderService->sendRecallAlert($appointment, $channel, $senderId, $customMessage);

        return response()->json([
            'message' => $res['success']
                ? "Recall alert successfully dispatched to {$res['patient_name']} via "
                    . implode(', ', $res['channels_dispatched']) . '.'
                : 'Failed to dispatch recall alert: ' . implode(', ', $res['errors'] ?? []),
            'result'  => $res,
        ], $res['success'] ? 200 : 422);
    }

    /**
     * POST /api/appointments/bulk-recall
     * Dispatch bulk recall alerts to all selected overdue appointments.
     */
    public function recallBulk(BulkRecallRequest $request): JsonResponse
    {
        $res = $this->reminderService->sendBulkRecall(
            $request->validated('appointment_ids'),
            $request->get('channel', 'all'),
            $request->user()?->id,
        );

        return response()->json([
            'message' => "Successfully processed recall alerts: {$res['total_sent']} sent, {$res['total_failed']} failed.",
            'result'  => $res,
        ]);
    }

    /**
     * GET /api/appointments/{id}/reminders
     * Reminder history logs for a single appointment.
     */
    public function reminderHistory(int $appointmentId): JsonResponse
    {
        $logs = AppointmentReminder::with('sender')
            ->where('appointment_id', $appointmentId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['logs' => $logs]);
    }

    /**
     * POST /api/appointments/trigger-auto-recall
     * Trigger the full automated reminder & recall sweep on demand.
     */
    public function triggerAutoSweep(Request $request): JsonResponse
    {
        $res = $this->reminderService->runAutomatedSweep($request->get('channel', 'all'));

        return response()->json([
            'message' => "Automated Sweep executed: {$res['advance_reminders_sent']} advance reminders"
                . " & {$res['missed_recalls_sent']} missed recalls dispatched.",
            'result'  => $res,
        ]);
    }
}
