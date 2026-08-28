<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicSchedule;
use App\Models\ClinicScheduleException;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ClinicScheduleService
{
    /**
     * Resolve the open clinic appointment date for a given dose protocol
     *
     * @param int $clinicId
     * @param Carbon $idealDate
     * @param int $doseNumber (0, 3, 7, 14, 28, 90, 365)
     * @return array{
     *   scheduled_date: Carbon,
     *   ideal_date: Carbon,
     *   drift_days: int,
     *   adjustment_reason: string|null,
     *   is_open: bool,
     *   drift_policy: string
     * }
     */
    public function resolveScheduleDate(int $clinicId, Carbon $idealDate, int $doseNumber = 3): array
    {
        $clinic = Clinic::find($clinicId);
        $policy = $clinic?->schedule_drift_policy ?? 'forward_only';
        $maxBackwardDays = $clinic?->backward_max_days ?? 1;

        // 1. If ideal date is already open, zero drift
        if ($this->isDateOpen($clinicId, $idealDate)) {
            return [
                'scheduled_date' => $idealDate->copy(),
                'ideal_date' => $idealDate->copy(),
                'drift_days' => 0,
                'adjustment_reason' => null,
                'is_open' => true,
                'drift_policy' => $policy,
            ];
        }

        // 2. Resolve open date based on configured drift policy
        $resolvedDate = null;
        $closureReason = $this->getClosureReason($clinicId, $idealDate);

        switch ($policy) {
            case 'nearest':
                $resolvedDate = $this->findNearestOpenDate($clinicId, $idealDate);
                break;

            case 'backward_within_N_days':
                $resolvedDate = $this->findBackwardWithinNDays($clinicId, $idealDate, $maxBackwardDays);
                break;

            case 'forward_only':
            default:
                $resolvedDate = $this->findNextOpenDate($clinicId, $idealDate);
                break;
        }

        $driftDays = (int) $idealDate->diffInDays($resolvedDate, false);
        $driftText = $driftDays > 0 ? "+{$driftDays}d" : ($driftDays < 0 ? "{$driftDays}d" : "0d");
        $adjustmentReason = "{$closureReason} (Moved {$driftText} to " . $resolvedDate->format('D, M j, Y') . ")";

        return [
            'scheduled_date' => $resolvedDate,
            'ideal_date' => $idealDate->copy(),
            'drift_days' => $driftDays,
            'adjustment_reason' => $adjustmentReason,
            'is_open' => true,
            'drift_policy' => $policy,
        ];
    }

    /**
     * Check if a specific date is open for appointments
     * Exceptions (holidays, special closures) take highest priority.
     */
    public function isDateOpen(int $clinicId, Carbon $date): bool
    {
        try {
            $dateStr = $date->toDateString();

            // Priority 1: Check Specific Date Exception
            $exception = ClinicScheduleException::where('clinic_id', $clinicId)
                ->where('exception_date', $dateStr)
                ->first();

            if ($exception !== null) {
                return (bool) $exception->is_open;
            }

            // Priority 2: Check Weekly Recurring Schedule
            $schedule = ClinicSchedule::where('clinic_id', $clinicId)
                ->where('day_of_week', $date->dayOfWeek)
                ->first();

            if ($schedule !== null) {
                return (bool) $schedule->is_open;
            }
        } catch (\Throwable $e) {
            Log::warning("ClinicScheduleService error checking date for clinic {$clinicId}: " . $e->getMessage());
        }

        // Priority 3: Default Fail-Safe (Mon-Fri open, Sat-Sun closed)
        return !in_array($date->dayOfWeek, [0, 6]);
    }

    /**
     * Find the next open clinic date after $date (forward search)
     */
    public function findNextOpenDate(int $clinicId, Carbon $date, int $maxDays = 30): Carbon
    {
        $current = $date->copy()->addDay();
        for ($i = 1; $i <= $maxDays; $i++) {
            if ($this->isDateOpen($clinicId, $current)) {
                return $current;
            }
            $current->addDay();
        }

        // Failsafe if everything is closed
        return $date->copy()->addDay();
    }

    /**
     * Find the nearest open date (checks forward and backward offsets)
     */
    public function findNearestOpenDate(int $clinicId, Carbon $date, int $maxDays = 7): Carbon
    {
        for ($offset = 1; $offset <= $maxDays; $offset++) {
            $forward = $date->copy()->addDays($offset);
            if ($this->isDateOpen($clinicId, $forward)) {
                return $forward;
            }

            $backward = $date->copy()->subDays($offset);
            if ($this->isDateOpen($clinicId, $backward)) {
                return $backward;
            }
        }

        return $this->findNextOpenDate($clinicId, $date);
    }

    /**
     * Check backward up to N days; if no open date found, move forward
     */
    public function findBackwardWithinNDays(int $clinicId, Carbon $date, int $maxBackwardDays = 1, int $maxForwardDays = 30): Carbon
    {
        for ($offset = 1; $offset <= $maxBackwardDays; $offset++) {
            $backward = $date->copy()->subDays($offset);
            if ($this->isDateOpen($clinicId, $backward)) {
                return $backward;
            }
        }

        return $this->findNextOpenDate($clinicId, $date, $maxForwardDays);
    }

    /**
     * Human-readable explanation of why a date is closed
     */
    public function getClosureReason(int $clinicId, Carbon $date): string
    {
        $exception = ClinicScheduleException::where('clinic_id', $clinicId)
            ->where('exception_date', $date->toDateString())
            ->first();

        if ($exception !== null && !$exception->is_open) {
            return $exception->reason ?: 'Holiday / Special Closure';
        }

        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $dayName = $dayNames[$date->dayOfWeek] ?? 'Weekend';

        return "{$dayName} non-operating schedule";
    }

    /**
     * Get open dates and exceptions in a date range for mobile/web calendar pickers
     *
     * @return array{
     *   open_days_of_week: int[],
     *   exceptions: array<string, array{is_open: bool, reason: string}>,
     *   urgent_policy: array
     * }
     */
    public function getScheduleSummary(int $clinicId): array
    {
        $schedules = ClinicSchedule::where('clinic_id', $clinicId)->get();
        $openDays = [];
        foreach ($schedules as $s) {
            if ($s->is_open) {
                $openDays[] = (int) $s->day_of_week;
            }
        }

        if (empty($openDays)) {
            $openDays = [1, 2, 3, 4, 5]; // Default Mon-Fri
        }

        $exceptions = ClinicScheduleException::where('clinic_id', $clinicId)
            ->where('exception_date', '>=', Carbon::today()->toDateString())
            ->get()
            ->keyBy(fn($e) => Carbon::parse($e->exception_date)->format('Y-m-d'))
            ->map(fn($e) => [
                'is_open' => (bool) $e->is_open,
                'reason' => $e->reason,
                'open_time' => $e->open_time,
                'close_time' => $e->close_time,
            ])
            ->toArray();

        return [
            'open_days_of_week' => $openDays,
            'exceptions' => $exceptions,
            'urgent_policy' => $this->getUrgentAccessInfo($clinicId),
        ];
    }

    /**
     * Get Urgent Day-0 Emergency access info
     */
    public function getUrgentAccessInfo(int $clinicId): array
    {
        $clinic = Clinic::find($clinicId);

        return [
            'urgent_access_policy' => $clinic?->urgent_access_policy ?? 'walk_ins_accepted_outside_hours',
            'facility_name' => $clinic?->urgent_referral_facility_name,
            'facility_address' => $clinic?->urgent_referral_facility_address,
            'facility_contact' => $clinic?->urgent_referral_facility_contact,
            'instructions' => $clinic?->urgent_referral_instructions,
        ];
    }
}
