<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vaccination\BulkRecallRequest;
use App\Jobs\DeliverOutboundMessage;
use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Models\OutboundMessage;
use App\Services\AppointmentReminderService;
use App\Services\Messaging\DeliveryPolicy;
use App\Services\VaccinationJourneyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VaccinationJourneyController extends Controller
{
    public function __construct(
        private readonly AppointmentReminderService $reminderService,
        private readonly VaccinationJourneyService $journeyService,
    ) {}

    /**
     * GET /api/vaccinations/journey-matrix
     * Consolidated PEP Vaccination Journey Matrix for all active patients.
     */
    public function journeyMatrix(Request $request): JsonResponse
    {
        $clinicId = $request->user()?->clinic_id ?? 1;
        $patientId = $request->get('patient_id') ? (int) $request->get('patient_id') : null;
        $page = max(1, (int) $request->get('page', 1));
        $perPage = max(1, (int) $request->get('per_page', 10));

        $result = $this->journeyService->buildMatrix(
            clinicId: $clinicId,
            search: $request->get('search'),
            patientId: $patientId,
            appointmentId: $request->get('appointment_id') ? (int) $request->get('appointment_id') : null,
            channelFilter: ($request->input('channel') ?? 'all'),
            statusFilter: $request->get('status', 'all'),
            page: $page,
            perPage: $perPage,
        );

        return response()->json($result);
    }

    /**
     * POST /api/appointments/{id}/recall
     * Dispatch 1-click multi-channel recall for a single missed appointment.
     */
    public function recallSingle(Request $request, int $id): JsonResponse
    {
        $request->validate(['channel' => 'sometimes|in:all,sms,email,in_app', 'message' => 'nullable|string|max:1000']);
        $appointment = Appointment::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);
        $channel = ($request->input('channel') ?? 'all');
        $customMessage = $request->get('message');
        $senderId = $request->user()?->id;

        $res = $this->reminderService->sendRecallAlert($appointment, $channel, $senderId, $customMessage);

        return response()->json([
            'message' => $res['success']
                ? "Reminder request processed for {$res['patient_name']} via "
                    .implode(', ', $res['channels_dispatched']).'. External messages may be queued; receipt is not yet confirmed.'.(! empty($res['errors']) ? ' Some channels were skipped or failed: '.implode(', ', $res['errors']) : '')
                : 'Failed to dispatch recall alert: '.implode(', ', $res['errors'] ?? []),
            'result' => $res,
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
            ($request->input('channel') ?? 'all'),
            $request->user()?->id,
            (int) $request->user()->clinic_id,
        );

        return response()->json([
            'message' => "Reminder requests: {$res['total_processed']} processed, {$res['total_failed']} unsuccessful. Check channel results for queued messages and partial failures.",
            'result' => $res,
        ]);
    }

    /**
     * GET /api/appointments/{id}/reminders
     * Reminder history logs for a single appointment.
     */
    public function reminderHistory(Request $request, int $id): JsonResponse
    {
        Appointment::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);
        $logs = AppointmentReminder::with(['sender', 'delivery.attempts'])
            ->where('clinic_id', $request->user()->clinic_id)->where('appointment_id', $id)
            ->latest()->paginate(25);
        $logs->getCollection()->transform(function ($log) {
            $log->setAttribute('sms_estimate', $log->delivery?->context['sms_estimate'] ?? null);
            $log->setAttribute('delivery_status', $log->delivery?->status ?? ($log->channel === 'in_app' ? $log->status : 'legacy_unverified'));

            return $log;
        });

        return response()->json(['logs' => $logs]);
    }

    public function retryMessage(Request $request, int $id, int $messageId): JsonResponse
    {
        Appointment::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);
        $message = OutboundMessage::where('clinic_id', $request->user()->clinic_id)
            ->where('appointment_id', $id)->findOrFail($messageId);
        // Unknown outcomes cannot be retried safely. Failed/skipped messages are revalidated by the worker.
        abort_unless(in_array($message->status, ['failed', 'skipped']) && $message->channel !== 'in_app', 422, 'Only confirmed failed or skipped external messages can be retried.');
        abort_unless(($message->context['occurrence_date'] ?? null) === today()->toDateString(), 422, 'This message has expired. Create a current reminder instead.');
        DB::transaction(function () use ($message, $request) {
            $changed = OutboundMessage::whereKey($message->id)->whereIn('status', ['failed', 'skipped'])
                ->update(['status' => 'queued', 'attempt_count' => 0, 'next_attempt_at' => null, 'error_code' => null]);
            abort_unless($changed, 409, 'Message is already being processed.');
            $message->attempts()->create(['provider' => $message->provider, 'status' => 'manual_retry', 'error_code' => 'staff_'.$request->user()->id]);
            DeliverOutboundMessage::dispatch($message->id);
        });

        return response()->json(['message' => 'Retry queued; delivery is not confirmed.']);
    }

    public function messagingSettings(Request $request, int $id): JsonResponse
    {
        $appointment = Appointment::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);

        return response()->json([
            'channels' => app(DeliveryPolicy::class)->availability(),
            'preferences' => DB::table('communication_preferences')->where('patient_id', $appointment->patient_id)->first(),
        ]);
    }

    public function updateMessagingSettings(Request $request, int $id): JsonResponse
    {
        $appointment = Appointment::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);
        $data = $request->validate(['sms' => 'required|boolean', 'email' => 'required|boolean', 'consent_confirmed' => 'required|accepted']);
        DB::transaction(function () use ($appointment, $request, $data) {
            $values = ['sms' => $data['sms'], 'email' => $data['email'], 'recorded_by' => $request->user()->id, 'updated_at' => now()];
            $query = DB::table('communication_preferences')->where('patient_id', $appointment->patient_id);
            if (! $query->exists()) {
                $values['created_at'] = now();
            }
            DB::table('communication_preferences')->updateOrInsert(['patient_id' => $appointment->patient_id], $values);
            DB::table('communication_preference_events')->insert([
                'patient_id' => $appointment->patient_id, 'sms' => $data['sms'], 'email' => $data['email'],
                'recorded_by' => $request->user()->id, 'created_at' => now(),
            ]);
        });

        return $this->messagingSettings($request, $id);
    }

    /**
     * POST /api/appointments/trigger-auto-recall
     * Trigger the full automated reminder & recall sweep on demand.
     */
    public function triggerAutoSweep(Request $request): JsonResponse
    {
        $request->validate(['channel' => 'sometimes|in:all,sms,email,in_app']);
        $res = $this->reminderService->runAutomatedSweep(($request->input('channel') ?? 'all'), (int) $request->user()->clinic_id);

        return response()->json([
            'message' => "Automated Sweep executed: {$res['advance_reminders_sent']} advance reminders"
                ." & {$res['missed_recalls_sent']} missed recall requests processed; queued delivery is not confirmed receipt.",
            'result' => $res,
        ]);
    }
}
