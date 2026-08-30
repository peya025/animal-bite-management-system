<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Models\Patient;
use App\Services\AppointmentReminderService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VaccinationJourneyController extends Controller
{
    protected AppointmentReminderService $reminderService;

    public function __construct(AppointmentReminderService $reminderService)
    {
        $this->reminderService = $reminderService;
    }

    /**
     * Get the consolidated PEP Vaccination Journey Matrix for all active patients.
     */
    public function journeyMatrix(Request $request): JsonResponse
    {
        $clinicId = 1;
        $search = $request->get('search');
        $channelFilter = $request->get('channel', 'all'); // 'all', 'walk_in', 'online'
        $statusFilter = $request->get('status', 'all');   // 'all', 'due_today', 'overdue', 'on_track', 'completed', 'awaiting_triage'
        $today = Carbon::today();

        $query = Patient::with([
            'biteIncidents',
            'treatmentRecords.administeredBy',
            'appointments' => function ($q) {
                $q->orderBy('scheduled_date', 'asc')->orderBy('appointment_date', 'asc');
            },
            'patientAccounts',
        ])
        ->where('clinic_id', $clinicId);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('patient_number', 'like', "%{$search}%")
                  ->orWhere('contact_number', 'like', "%{$search}%");
            });
        }

        $patients = $query->orderBy('created_at', 'desc')->get();

        $matrix = [];
        $kpi = [
            'total_patients' => $patients->count(),
            'on_track' => 0,
            'due_today' => 0,
            'overdue_missed' => 0,
            'completed' => 0,
            'awaiting_triage' => 0,
            'walk_in_count' => 0,
            'online_count' => 0,
        ];

        foreach ($patients as $p) {
            $isOnline = $p->patientAccounts && $p->patientAccounts->isNotEmpty();
            if (!$isOnline && $p->appointments) {
                $isOnline = $p->appointments->contains(fn($a) => !empty($a->booked_by_account_id));
            }

            if ($isOnline) {
                $kpi['online_count']++;
            } else {
                $kpi['walk_in_count']++;
            }

            if ($channelFilter === 'walk_in' && $isOnline) continue;
            if ($channelFilter === 'online' && !$isOnline) continue;

            $treatmentRecords = $p->treatmentRecords->keyBy('dose_number');
            $appointments = $p->appointments;
            $biteIncident = $p->biteIncidents->first();

            // Build standard PEP Doses list (Day 0, Day 3, Day 7, Day 28)
            $standardDoses = [0, 3, 7, 28];
            $dosesMatrix = [];
            $hasAnyDose = $treatmentRecords->isNotEmpty();
            $hasForm2 = (bool) $biteIncident;

            $patientStatus = 'on_track';
            $nextAppt = null;
            $maxDoseDone = -1;

            foreach ($standardDoses as $doseNum) {
                $record = $treatmentRecords->get($doseNum);
                $appt = $appointments->first(fn($a) => $a->dose_number === $doseNum);

                if ($record) {
                    $maxDoseDone = max($maxDoseDone, $doseNum);
                    $dosesMatrix[] = [
                        'dose_number' => $doseNum,
                        'label' => $doseNum === 0 ? 'Day 0 (Initial)' : "Day {$doseNum}",
                        'status' => 'completed',
                        'administered_date' => $record->date_administered ? Carbon::parse($record->date_administered)->format('Y-m-d') : null,
                        'vaccine_brand' => $record->vaccine_brand,
                        'route' => $record->route,
                        'site' => $record->anatomical_site,
                        'administered_by' => $record->administeredBy ? $record->administeredBy->name : 'Staff Nurse',
                    ];
                } elseif ($appt) {
                    $apptDate = Carbon::parse($appt->scheduled_date ?? $appt->appointment_date);
                    $isPast = $apptDate->lt($today) && $appt->status === 'scheduled';
                    $isToday = $apptDate->isSameDay($today) && $appt->status === 'scheduled';

                    $doseStatus = 'scheduled';
                    if ($isPast) {
                        $doseStatus = 'missed';
                    } elseif ($isToday) {
                        $doseStatus = 'due_today';
                    } elseif ($appt->status === 'cancelled') {
                        $doseStatus = 'cancelled';
                    }

                    if (!$nextAppt && $appt->status === 'scheduled') {
                        $lateDays = $isPast ? abs((int) $today->diffInDays($apptDate, false)) : 0;
                        $nextAppt = [
                            'appointment_id' => $appt->appointment_id,
                            'dose_number' => $doseNum,
                            'label' => $doseNum === 0 ? 'Day 0' : "Day {$doseNum}",
                            'scheduled_date' => $apptDate->format('Y-m-d'),
                            'scheduled_date_formatted' => $apptDate->format('M j, Y'),
                            'time_slot' => $appt->time_slot ?? 'regular',
                            'is_today' => $isToday,
                            'is_missed' => $isPast,
                            'late_days' => $lateDays,
                            'reminder_sent_count' => $appt->reminder_sent_count ?? 0,
                            'last_reminded_at' => $appt->last_reminded_at ? Carbon::parse($appt->last_reminded_at)->diffForHumans() : null,
                        ];
                    }

                    $dosesMatrix[] = [
                        'dose_number' => $doseNum,
                        'label' => $doseNum === 0 ? 'Day 0 (Initial)' : "Day {$doseNum}",
                        'status' => $doseStatus,
                        'scheduled_date' => $apptDate->format('Y-m-d'),
                        'appointment_id' => $appt->appointment_id,
                        'reminder_sent_count' => $appt->reminder_sent_count ?? 0,
                        'last_reminded_at' => $appt->last_reminded_at,
                    ];
                } else {
                    $dosesMatrix[] = [
                        'dose_number' => $doseNum,
                        'label' => $doseNum === 0 ? 'Day 0 (Initial)' : "Day {$doseNum}",
                        'status' => 'pending',
                    ];
                }
            }

            // Determine overall patient compliance status
            if (!$hasForm2 && !$hasAnyDose) {
                $patientStatus = 'awaiting_triage';
                $kpi['awaiting_triage']++;
            } elseif ($maxDoseDone >= 28) {
                $patientStatus = 'completed';
                $kpi['completed']++;
            } elseif ($nextAppt && $nextAppt['is_missed']) {
                $patientStatus = 'overdue_missed';
                $kpi['overdue_missed']++;
            } elseif ($nextAppt && $nextAppt['is_today']) {
                $patientStatus = 'due_today';
                $kpi['due_today']++;
            } else {
                $patientStatus = 'on_track';
                $kpi['on_track']++;
            }

            if ($statusFilter !== 'all' && $patientStatus !== $statusFilter) {
                continue;
            }

            $matrix[] = [
                'patient_id' => $p->patient_id,
                'patient_number' => $p->patient_number,
                'full_name' => "{$p->first_name} {$p->last_name}",
                'age' => $p->age,
                'gender' => $p->gender,
                'contact_number' => $p->contact_number,
                'email' => $p->email,
                'channel' => $isOnline ? 'online' : 'walk_in',
                'compliance_status' => $patientStatus,
                'max_dose_done' => $maxDoseDone,
                'bite_incident' => $biteIncident ? [
                    'bite_id' => $biteIncident->bite_id,
                    'bite_date' => $biteIncident->incident_date ? Carbon::parse($biteIncident->incident_date)->format('M j, Y') : null,
                    'category' => $biteIncident->exposure_category ?? 'Category II',
                    'animal_type' => $biteIncident->animal_type ?? 'Dog',
                    'body_part' => $biteIncident->body_part ?? 'N/A',
                ] : null,
                'doses' => $dosesMatrix,
                'next_appointment' => $nextAppt,
            ];
        }

        $page = max(1, (int) $request->get('page', 1));
        $perPage = max(1, (int) $request->get('per_page', 10));
        $totalRows = count($matrix);
        $offset = ($page - 1) * $perPage;
        $paginatedPatients = array_slice($matrix, $offset, $perPage);

        return response()->json([
            'kpi' => $kpi,
            'pagination' => [
                'total' => $totalRows,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => max(1, (int) ceil($totalRows / $perPage)),
            ],
            'patients' => $paginatedPatients,
        ]);
    }

    /**
     * Dispatch 1-Click Multi-Channel Recall for a single missed appointment.
     */
    public function recallSingle(Request $request, $id): JsonResponse
    {
        $appointment = Appointment::findOrFail($id);
        $channel = $request->get('channel', 'all'); // 'all', 'sms', 'email', 'in_app'
        $customMessage = $request->get('message');
        $senderId = $request->user()?->id;

        $res = $this->reminderService->sendRecallAlert($appointment, $channel, $senderId, $customMessage);

        return response()->json([
            'message' => $res['success']
                ? "Recall alert successfully dispatched to {$res['patient_name']} via " . implode(', ', $res['channels_dispatched']) . "."
                : "Failed to dispatch recall alert: " . implode(', ', $res['errors'] ?? []),
            'result' => $res,
        ], $res['success'] ? 200 : 422);
    }

    /**
     * Dispatch Bulk Recall Alerts to all selected overdue appointments.
     */
    public function recallBulk(Request $request): JsonResponse
    {
        $request->validate([
            'appointment_ids' => 'required|array|min:1',
            'appointment_ids.*' => 'integer|exists:appointments,appointment_id',
            'channel' => 'nullable|in:all,sms,email,in_app',
        ]);

        $appointmentIds = $request->appointment_ids;
        $channel = $request->get('channel', 'all');
        $senderId = $request->user()?->id;

        $res = $this->reminderService->sendBulkRecall($appointmentIds, $channel, $senderId);

        return response()->json([
            'message' => "Successfully processed recall alerts: {$res['total_sent']} sent, {$res['total_failed']} failed.",
            'result' => $res,
        ]);
    }

    /**
     * Get Reminder history logs for an appointment.
     */
    public function reminderHistory($appointmentId): JsonResponse
    {
        $logs = AppointmentReminder::with('sender')
            ->where('appointment_id', $appointmentId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'logs' => $logs,
        ]);
    }

    /**
     * Trigger the full automated reminder & recall sweep on-demand.
     */
    public function triggerAutoSweep(Request $request): JsonResponse
    {
        $channel = $request->get('channel', 'all');
        $res = $this->reminderService->runAutomatedSweep($channel);

        return response()->json([
            'message' => "Automated Sweep executed: {$res['advance_reminders_sent']} advance reminders & {$res['missed_recalls_sent']} missed recalls dispatched.",
            'result' => $res,
        ]);
    }
}
