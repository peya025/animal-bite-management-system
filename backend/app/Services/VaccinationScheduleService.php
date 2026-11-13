<?php

namespace App\Services;

use App\Models\Queue;
use App\Models\VaccinationSchedule;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

class VaccinationScheduleService
{
    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Paginated list of vaccination schedules with optional filters.
     */
    public function listSchedules(int $clinicId, array $filters): LengthAwarePaginator
    {
        $query = VaccinationSchedule::where('clinic_id', $clinicId)
            ->whereNotNull('scheduled_date')
            ->whereNotNull('dose_number')
            ->with(['patient', 'biteIncident', 'administeredBy']);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['from_date'])) {
            $query->where('scheduled_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->where('scheduled_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['patient_id'])) {
            $query->where('patient_id', $filters['patient_id']);
        }

        return $query->orderBy('scheduled_date')->paginate(15);
    }

    /**
     * Today's scheduled and missed vaccinations (cached 60 s).
     */
    public function todaySchedules(int $clinicId): array
    {
        $today    = Carbon::today()->toDateString();
        $cacheKey = "web:vaccinations:today:clinic:{$clinicId}:date:{$today}";

        return Cache::remember($cacheKey, 60, function () use ($clinicId, $today) {
            $schedules = VaccinationSchedule::where('clinic_id', $clinicId)
                ->where('scheduled_date', $today)
                ->whereIn('status', ['scheduled', 'missed'])
                ->with(['patient', 'biteIncident'])
                ->orderBy('dose_number')
                ->get();

            return [
                'date'        => $today,
                'total_count' => $schedules->count(),
                'schedules'   => $schedules,
            ];
        });
    }

    /**
     * Upcoming schedules within the next N days (cached 300 s).
     */
    public function upcomingSchedules(int $clinicId, int $days): mixed
    {
        $cacheKey = "web:vaccinations:upcoming:clinic:{$clinicId}:days:{$days}";

        return Cache::remember($cacheKey, 300, function () use ($clinicId, $days) {
            return VaccinationSchedule::where('clinic_id', $clinicId)
                ->where('scheduled_date', '>', Carbon::today())
                ->where('scheduled_date', '<=', Carbon::today()->addDays($days))
                ->where('status', 'scheduled')
                ->with(['patient', 'biteIncident'])
                ->orderBy('scheduled_date')
                ->get();
        });
    }

    /**
     * Overdue (past-date, still scheduled) vaccinations (cached 120 s).
     */
    public function overdueSchedules(int $clinicId): array
    {
        $cacheKey = "web:vaccinations:overdue:clinic:{$clinicId}";

        return Cache::remember($cacheKey, 120, function () use ($clinicId) {
            $schedules = VaccinationSchedule::where('clinic_id', $clinicId)
                ->where('scheduled_date', '<', Carbon::today())
                ->where('status', 'scheduled')
                ->with(['patient', 'biteIncident'])
                ->orderBy('scheduled_date')
                ->get();

            return [
                'count'     => $schedules->count(),
                'schedules' => $schedules,
            ];
        });
    }

    /**
     * Single vaccination schedule with full relations.
     */
    public function findSchedule(int $clinicId, int $id): VaccinationSchedule
    {
        return VaccinationSchedule::where('clinic_id', $clinicId)
            ->with(['patient', 'biteIncident', 'administeredBy', 'scheduledBy'])
            ->findOrFail($id);
    }

    /**
     * Aggregate statistics (cached 180 s).
     */
    public function statistics(int $clinicId): array
    {
        $cacheKey = "web:vaccinations:stats:clinic:{$clinicId}";

        return Cache::remember($cacheKey, 180, function () use ($clinicId) {
            $base = VaccinationSchedule::where('clinic_id', $clinicId)
                ->whereNotNull('scheduled_date')
                ->whereNotNull('dose_number');

            return [
                'total_scheduled' => (clone $base)->count(),
                'completed'       => (clone $base)->where('status', 'completed')->count(),
                'pending'         => (clone $base)->where('status', 'scheduled')->count(),
                'missed'          => (clone $base)->where('status', 'missed')->count(),
                'today_count'     => (clone $base)
                    ->where('scheduled_date', Carbon::today())
                    ->whereIn('status', ['scheduled', 'missed'])
                    ->count(),
                'overdue_count'   => (clone $base)
                    ->where('scheduled_date', '<', Carbon::today())
                    ->where('status', 'scheduled')
                    ->count(),
            ];
        });
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Mark a vaccination schedule as administered and auto-complete the
     * patient's vaccination queue ticket for today.
     */
    public function administer(
        VaccinationSchedule $schedule,
        Authenticatable $user,
        array $data,
    ): VaccinationSchedule {
        $schedule->markAsCompleted($user, $data);

        // Auto-advance queue: complete the patient's Treatment queue entry for today
        Queue::where('clinic_id', $user->clinic_id)
            ->where('patient_id', $schedule->patient_id)
            ->where('queue_date', Carbon::today()->toDateString())
            ->whereIn('status', ['waiting', 'called', 'in_consultation', 'serving'])
            ->where('visit_type', 'vaccination')
            ->whereNull('deleted_at')
            ->latest('queue_id')
            ->first()
            ?->update([
                'status'       => 'completed',
                'completed_at' => now(),
            ]);

        $this->clearCaches($user->clinic_id);

        return $schedule->fresh()->load(['patient', 'biteIncident']);
    }

    /**
     * Update a vaccination schedule's date/status/notes.
     */
    public function update(VaccinationSchedule $schedule, array $data, int $clinicId): VaccinationSchedule
    {
        $schedule->update($data);
        $this->clearCaches($clinicId);
        return $schedule;
    }

    /**
     * Mark a dose as missed.
     */
    public function markAsMissed(VaccinationSchedule $schedule, ?string $reason, int $clinicId): VaccinationSchedule
    {
        $schedule->update([
            'status'               => 'missed',
            'administration_notes' => $reason ?? 'Patient did not show up',
        ]);
        $this->clearCaches($clinicId);
        return $schedule;
    }

    /**
     * Reschedule a vaccination to a new date.
     */
    public function reschedule(
        VaccinationSchedule $schedule,
        string $newDate,
        ?string $reason,
        int $clinicId,
    ): VaccinationSchedule {
        $schedule->update([
            'scheduled_date'       => $newDate,
            'status'               => 'rescheduled',
            'administration_notes' => $reason,
        ]);
        $this->clearCaches($clinicId);
        return $schedule;
    }

    // ── Cache ─────────────────────────────────────────────────────────────────

    /**
     * Invalidate all vaccination-related cache keys for the given clinic.
     */
    public function clearCaches(int $clinicId): void
    {
        $today = Carbon::today()->toDateString();

        Cache::forget("web:vaccinations:today:clinic:{$clinicId}:date:{$today}");

        foreach ([7, 14, 30] as $days) {
            Cache::forget("web:vaccinations:upcoming:clinic:{$clinicId}:days:{$days}");
        }

        Cache::forget("web:vaccinations:overdue:clinic:{$clinicId}");
        Cache::forget("web:vaccinations:stats:clinic:{$clinicId}");
    }
}
