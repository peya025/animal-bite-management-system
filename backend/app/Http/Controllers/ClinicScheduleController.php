<?php

namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Models\ClinicSchedule;
use App\Models\ClinicScheduleException;
use App\Services\ClinicScheduleService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClinicScheduleController extends Controller
{
    protected ClinicScheduleService $scheduleService;

    public function __construct(ClinicScheduleService $scheduleService)
    {
        $this->scheduleService = $scheduleService;
    }

    /**
     * Get clinic weekly schedule, exceptions, and policies (Admin)
     * GET /api/clinics/schedule
     */
    public function getSchedule(Request $request)
    {
        $user = $request->user();
        $clinicId = $user->clinic_id ?? 1;

        $clinic = Clinic::with(['schedules' => function ($q) {
            $q->orderBy('day_of_week');
        }, 'scheduleExceptions' => function ($q) {
            $q->orderBy('exception_date', 'desc');
        }])->findOrFail($clinicId);

        // Ensure 7 days exist
        if ($clinic->schedules->count() < 7) {
            for ($day = 0; $day <= 6; $day++) {
                if (!$clinic->schedules->contains('day_of_week', $day)) {
                    $isOpen = in_array($day, [1, 2, 3, 4, 5]);
                    ClinicSchedule::create([
                        'clinic_id' => $clinicId,
                        'day_of_week' => $day,
                        'is_open' => $isOpen,
                        'open_time' => $isOpen ? '08:00:00' : null,
                        'close_time' => $isOpen ? '17:00:00' : null,
                        'slot_interval_minutes' => 30,
                        'max_patients_per_slot' => 10,
                    ]);
                }
            }
            $clinic->load(['schedules' => function ($q) {
                $q->orderBy('day_of_week');
            }]);
        }

        return response()->json([
            'clinic' => [
                'id' => $clinic->id,
                'name' => $clinic->name,
                'schedule_drift_policy' => $clinic->schedule_drift_policy ?? 'forward_only',
                'backward_max_days' => $clinic->backward_max_days ?? 1,
                'urgent_access_policy' => $clinic->urgent_access_policy ?? 'walk_ins_accepted_outside_hours',
                'urgent_referral_facility_name' => $clinic->urgent_referral_facility_name,
                'urgent_referral_facility_address' => $clinic->urgent_referral_facility_address,
                'urgent_referral_facility_contact' => $clinic->urgent_referral_facility_contact,
                'urgent_referral_instructions' => $clinic->urgent_referral_instructions,
            ],
            'schedules' => $clinic->schedules,
            'exceptions' => $clinic->scheduleExceptions,
        ]);
    }

    /**
     * Update weekly recurring operating schedule (Admin)
     * PUT /api/clinics/schedule/weekly
     */
    public function updateWeeklySchedule(Request $request)
    {
        $user = $request->user();
        $clinicId = $user->clinic_id ?? 1;

        $validated = $request->validate([
            'schedules' => ['required', 'array', 'size:7'],
            'schedules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'schedules.*.is_open' => ['required', 'boolean'],
            'schedules.*.open_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'schedules.*.close_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'schedules.*.slot_interval_minutes' => ['nullable', 'integer', 'min:5', 'max:120'],
            'schedules.*.max_patients_per_slot' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        DB::transaction(function () use ($clinicId, $validated) {
            foreach ($validated['schedules'] as $row) {
                ClinicSchedule::updateOrCreate(
                    [
                        'clinic_id' => $clinicId,
                        'day_of_week' => $row['day_of_week'],
                    ],
                    [
                        'is_open' => $row['is_open'],
                        'open_time' => $row['is_open'] ? ($row['open_time'] ?? '08:00:00') : null,
                        'close_time' => $row['is_open'] ? ($row['close_time'] ?? '17:00:00') : null,
                        'slot_interval_minutes' => $row['slot_interval_minutes'] ?? 30,
                        'max_patients_per_slot' => $row['max_patients_per_slot'] ?? 10,
                    ]
                );
            }
        });

        // Automatically re-evaluate and shift upcoming scheduled appointments
        $shiftedCount = $this->recalculatePendingAppointments($clinicId);

        return response()->json([
            'message' => 'Weekly operating schedule updated successfully' . ($shiftedCount > 0 ? " ({$shiftedCount} upcoming appointment(s) rescheduled)" : ''),
            'schedules' => ClinicSchedule::where('clinic_id', $clinicId)->orderBy('day_of_week')->get(),
            'shifted_count' => $shiftedCount,
        ]);
    }

    /**
     * Store or update a calendar exception / holiday override (Admin)
     * POST /api/clinics/schedule/exceptions
     */
    public function storeException(Request $request)
    {
        $user = $request->user();
        $clinicId = $user->clinic_id ?? 1;

        $validated = $request->validate([
            'id' => ['nullable', 'integer', 'exists:clinic_schedule_exceptions,id'],
            'exception_date' => ['required', 'date_format:Y-m-d'],
            'is_open' => ['required', 'boolean'],
            'open_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'close_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $exception = ClinicScheduleException::updateOrCreate(
            [
                'clinic_id' => $clinicId,
                'exception_date' => $validated['exception_date'],
            ],
            [
                'is_open' => $validated['is_open'],
                'open_time' => $validated['is_open'] ? ($validated['open_time'] ?? '08:00:00') : null,
                'close_time' => $validated['is_open'] ? ($validated['close_time'] ?? '17:00:00') : null,
                'reason' => $validated['reason'],
                'created_by' => $user->id,
            ]
        );

        // Automatically re-evaluate and shift upcoming scheduled appointments
        $shiftedCount = $this->recalculatePendingAppointments($clinicId);

        return response()->json([
            'message' => 'Schedule exception saved successfully' . ($shiftedCount > 0 ? " ({$shiftedCount} upcoming appointment(s) rescheduled)" : ''),
            'exception' => $exception,
            'shifted_count' => $shiftedCount,
        ]);
    }

    /**
     * Delete a calendar exception (Admin)
     * DELETE /api/clinics/schedule/exceptions/{id}
     */
    public function deleteException(Request $request, $id)
    {
        $user = $request->user();
        $clinicId = $user->clinic_id ?? 1;

        $exception = ClinicScheduleException::where('clinic_id', $clinicId)->findOrFail($id);
        $exception->delete();

        // Automatically re-evaluate and shift upcoming scheduled appointments
        $shiftedCount = $this->recalculatePendingAppointments($clinicId);

        return response()->json([
            'message' => 'Schedule exception removed successfully' . ($shiftedCount > 0 ? " ({$shiftedCount} upcoming appointment(s) rescheduled)" : ''),
            'shifted_count' => $shiftedCount,
        ]);
    }

    /**
     * Update clinic PEP regimen drift & emergency policies (Admin)
     * PUT /api/clinics/schedule/policies
     */
    public function updatePolicies(Request $request)
    {
        $user = $request->user();
        $clinicId = $user->clinic_id ?? 1;

        $validated = $request->validate([
            'schedule_drift_policy' => ['required', 'in:forward_only,nearest,backward_within_N_days'],
            'backward_max_days' => ['required', 'integer', 'min:1', 'max:7'],
            'urgent_access_policy' => ['required', 'in:walk_ins_accepted_outside_hours,refer_to_alternate_facility'],
            'urgent_referral_facility_name' => ['nullable', 'string', 'max:255'],
            'urgent_referral_facility_address' => ['nullable', 'string', 'max:255'],
            'urgent_referral_facility_contact' => ['nullable', 'string', 'max:255'],
            'urgent_referral_instructions' => ['nullable', 'string', 'max:1000'],
        ]);

        $clinic = Clinic::findOrFail($clinicId);
        $clinic->update($validated);

        // Automatically re-evaluate and shift upcoming scheduled appointments
        $shiftedCount = $this->recalculatePendingAppointments($clinicId);

        return response()->json([
            'message' => 'Clinic schedule and emergency policies updated successfully' . ($shiftedCount > 0 ? " ({$shiftedCount} upcoming appointment(s) rescheduled)" : ''),
            'clinic' => $clinic->fresh(),
            'shifted_count' => $shiftedCount,
        ]);
    }

    /**
     * Explicit trigger to recalculate and synchronize pending appointments
     * POST /api/clinics/schedule/recalculate
     */
    public function recalculate(Request $request)
    {
        $user = $request->user();
        $clinicId = $user->clinic_id ?? 1;

        $shiftedCount = $this->recalculatePendingAppointments($clinicId);

        return response()->json([
            'message' => "Successfully re-evaluated and synchronized scheduled appointments ({$shiftedCount} moved to valid open days).",
            'shifted_count' => $shiftedCount,
        ]);
    }

    /**
     * Recalculate all future scheduled appointments according to the latest operating pattern
     */
    public function recalculatePendingAppointments(int $clinicId): int
    {
        $futureAppointments = \App\Models\Appointment::where('clinic_id', $clinicId)
            ->where('status', 'scheduled')
            ->where(function ($q) {
                $q->whereDate('scheduled_date', '>=', Carbon::today())
                  ->orWhereDate('appointment_date', '>=', Carbon::today());
            })
            ->get();

        $updatedCount = 0;
        foreach ($futureAppointments as $appt) {
            $idealDate = $appt->ideal_date
                ? Carbon::parse($appt->ideal_date)
                : Carbon::parse($appt->scheduled_date ?? $appt->appointment_date);

            $resolution = $this->scheduleService->resolveScheduleDate(
                $clinicId,
                $idealDate,
                $appt->dose_number
            );

            $newDate = $resolution['scheduled_date']->toDateString();
            $currentDate = Carbon::parse($appt->scheduled_date ?? $appt->appointment_date)->toDateString();

            $doseLabel = $appt->dose_number !== null ? "Day {$appt->dose_number}" : 'Follow-up';
            if ($appt->dose_number === 90) $doseLabel = 'Booster 1';
            if ($appt->dose_number === 365) $doseLabel = 'Booster 2';

            $noteText = $resolution['drift_days'] !== 0
                ? "Auto-scheduled: {$doseLabel} dose ({$resolution['adjustment_reason']})"
                : "Auto-scheduled: {$doseLabel} dose";

            $appt->update([
                'appointment_date' => $newDate,
                'scheduled_date' => $newDate,
                'ideal_date' => $idealDate->toDateString(),
                'schedule_drift_days' => $resolution['drift_days'],
                'schedule_adjustment_reason' => $resolution['adjustment_reason'],
                'notes' => $noteText,
            ]);

            if ($newDate !== $currentDate || $resolution['drift_days'] !== (int)$appt->schedule_drift_days) {
                $updatedCount++;
            }
        }

        // Clear mobile notification caches
        try {
            \Illuminate\Support\Facades\Cache::flush();
        } catch (\Throwable $e) {
            Log::warning("Cache flush failed: " . $e->getMessage());
        }

        return $updatedCount;
    }

    /**
     * Public / Mobile Schedule Availability Summary
     * GET /api/clinics/{id}/schedule-summary
     */
    public function getScheduleSummary(Request $request, $clinicId = null)
    {
        $targetClinicId = $clinicId ? (int) $clinicId : ($request->user()?->clinic_id ?? 1);
        $summary = $this->scheduleService->getScheduleSummary($targetClinicId);

        return response()->json($summary);
    }
}
