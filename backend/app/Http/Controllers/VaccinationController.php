<?php

namespace App\Http\Controllers;

use App\Models\VaccinationSchedule;
use Illuminate\Http\Request;
use Carbon\Carbon;

class VaccinationController extends Controller
{
    /**
     * Get all vaccination schedules
     * Access: admin, triage, treatment
     */
    public function index(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $query = VaccinationSchedule::where('clinic_id', $clinicId)
            ->with(['patient', 'biteIncident', 'administeredBy']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('from_date')) {
            $query->where('scheduled_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->where('scheduled_date', '<=', $request->to_date);
        }

        // Filter by patient
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        $schedules = $query->orderBy('scheduled_date')->paginate(15);

        return response()->json($schedules);
    }

    /**
     * Get today's vaccination schedules
     * Access: admin, treatment
     */
    public function today(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $today = Carbon::today()->toDateString();

        $schedules = VaccinationSchedule::where('clinic_id', $clinicId)
            ->where('scheduled_date', $today)
            ->whereIn('status', ['scheduled', 'missed'])
            ->with(['patient', 'biteIncident'])
            ->orderBy('dose_number')
            ->get();

        return response()->json([
            'date' => $today,
            'total_count' => $schedules->count(),
            'schedules' => $schedules,
        ]);
    }

    /**
     * Get upcoming vaccinations
     */
    public function upcoming(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $days = $request->get('days', 7); // Next 7 days by default

        $schedules = VaccinationSchedule::where('clinic_id', $clinicId)
            ->where('scheduled_date', '>', Carbon::today())
            ->where('scheduled_date', '<=', Carbon::today()->addDays($days))
            ->where('status', 'scheduled')
            ->with(['patient', 'biteIncident'])
            ->orderBy('scheduled_date')
            ->get();

        return response()->json($schedules);
    }

    /**
     * Get overdue vaccinations
     */
    public function overdue(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $schedules = VaccinationSchedule::where('clinic_id', $clinicId)
            ->where('scheduled_date', '<', Carbon::today())
            ->where('status', 'scheduled')
            ->with(['patient', 'biteIncident'])
            ->orderBy('scheduled_date')
            ->get();

        return response()->json([
            'count' => $schedules->count(),
            'schedules' => $schedules,
        ]);
    }

    /**
     * Get vaccination schedule details
     */
    public function show(Request $request, $id)
    {
        $schedule = VaccinationSchedule::where('clinic_id', $request->user()->clinic_id)
            ->with(['patient', 'biteIncident', 'administeredBy', 'scheduledBy'])
            ->findOrFail($id);

        return response()->json($schedule);
    }

    /**
     * Record vaccination administration
     * Access: admin, treatment
     */
    public function administer(Request $request, $id)
    {
        $schedule = VaccinationSchedule::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        // Validate schedule can be administered
        if ($schedule->status === 'completed') {
            return response()->json([
                'message' => 'This vaccination has already been administered',
            ], 400);
        }

        $request->validate([
            'vaccine_brand' => 'required|string|max:100',
            'vaccine_batch_number' => 'required|string|max:100',
            'vaccine_expiry_date' => 'nullable|date|after:today',
            'injection_site' => 'required|string|max:100',
            'dosage_ml' => 'nullable|numeric|min:0|max:10',
            'adverse_reaction' => 'nullable|string',
            'administration_notes' => 'nullable|string',
        ]);

        $schedule->markAsCompleted($request->user(), $request->all());

        return response()->json([
            'message' => 'Vaccination recorded successfully',
            'schedule' => $schedule->fresh()->load(['patient', 'biteIncident']),
        ]);
    }

    /**
     * Update vaccination schedule
     * Access: admin, triage
     */
    public function update(Request $request, $id)
    {
        $schedule = VaccinationSchedule::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $request->validate([
            'scheduled_date' => 'sometimes|date',
            'status' => 'sometimes|in:scheduled,completed,missed,rescheduled',
            'administration_notes' => 'nullable|string',
        ]);

        $schedule->update($request->all());

        return response()->json([
            'message' => 'Vaccination schedule updated successfully',
            'schedule' => $schedule,
        ]);
    }

    /**
     * Mark vaccination as missed
     * Access: admin, triage, treatment
     */
    public function markAsMissed(Request $request, $id)
    {
        $schedule = VaccinationSchedule::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $schedule->update([
            'status' => 'missed',
            'administration_notes' => $request->get('reason', 'Patient did not show up'),
        ]);

        return response()->json([
            'message' => 'Vaccination marked as missed',
            'schedule' => $schedule,
        ]);
    }

    /**
     * Reschedule vaccination
     * Access: admin, triage
     */
    public function reschedule(Request $request, $id)
    {
        $schedule = VaccinationSchedule::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $request->validate([
            'new_date' => 'required|date|after_or_equal:today',
            'reason' => 'nullable|string',
        ]);

        $schedule->update([
            'scheduled_date' => $request->new_date,
            'status' => 'rescheduled',
            'administration_notes' => $request->reason,
        ]);

        return response()->json([
            'message' => 'Vaccination rescheduled successfully',
            'schedule' => $schedule,
        ]);
    }

    /**
     * Get statistics
     */
    public function statistics(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $stats = [
            'total_scheduled' => VaccinationSchedule::where('clinic_id', $clinicId)->count(),
            'completed' => VaccinationSchedule::where('clinic_id', $clinicId)->where('status', 'completed')->count(),
            'pending' => VaccinationSchedule::where('clinic_id', $clinicId)->where('status', 'scheduled')->count(),
            'missed' => VaccinationSchedule::where('clinic_id', $clinicId)->where('status', 'missed')->count(),
            'today_count' => VaccinationSchedule::where('clinic_id', $clinicId)
                ->where('scheduled_date', Carbon::today())
                ->whereIn('status', ['scheduled', 'missed'])
                ->count(),
            'overdue_count' => VaccinationSchedule::where('clinic_id', $clinicId)
                ->where('scheduled_date', '<', Carbon::today())
                ->where('status', 'scheduled')
                ->count(),
        ];

        return response()->json($stats);
    }
}
