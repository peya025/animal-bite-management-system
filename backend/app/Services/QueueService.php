<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\Queue;
use App\Models\QueueHistory;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Domain service for all queue operations.
 * Extracted from QueueController to make the controller thin while preserving
 * every business rule, concurrency lock, history log, and cache-flush intact.
 */
class QueueService
{
    // ── Status groups (mirrors QueueController constants) ─────────────────
    const MAIN_STATUSES   = ['waiting', 'called', 'in_consultation', 'serving'];
    const SECOND_STATUSES = ['second_chance', 'final_recall'];

    // Priority order for category-based sorting (lower = higher priority)
    const CATEGORY_ORDER = [
        'priority'       => 1,
        'senior_citizen' => 2,
        'pwd'            => 2,
        'pregnant'       => 2,
        'appointment'    => 3,
        'regular'        => 4,
    ];

    // ── Public helpers used by the controller ──────────────────────────────

    /**
     * Append a history record for the given queue transition.
     */
    public function logHistory(
        Queue   $queue,
        string  $action,
        string  $toStatus,
        ?int    $userId,
        ?string $notes = null,
    ): void {
        QueueHistory::create([
            'queue_id'     => $queue->queue_id,
            'clinic_id'    => $queue->clinic_id,
            'patient_id'   => $queue->patient_id,
            'action'       => $action,
            'from_status'  => $queue->status,
            'to_status'    => $toStatus,
            'call_count'   => $queue->call_count ?? 0,
            'performed_by' => $userId,
            'notes'        => $notes,
            'occurred_at'  => now(),
        ]);
    }

    /**
     * Invalidate the per-clinic-per-date queue cache key.
     */
    public function flushCache(int $clinicId, ?string $date = null): void
    {
        Cache::forget('web:queue:clinic:' . $clinicId . ':date:' . ($date ?? Carbon::today()->toDateString()));
    }

    /**
     * Minimal patient field list for eager-loads (avoids loading sensitive columns).
     */
    public function patientFields(): string
    {
        return 'patient_id,first_name,middle_name,last_name,suffix,date_of_birth,gender,contact_number';
    }

    /**
     * Find the next eligible waiting patient for the given station, using
     * priority-aware FIFO ordering (category → priority level → queue_number).
     */
    public function getNextEligible(int $clinicId, string $date, ?string $station = null): ?Queue
    {
        return $this->buildWaitingQuery($clinicId, $date, $station)->first();
    }

    /**
     * Same as getNextEligible() but excludes a specific queue_id (used after skip).
     */
    public function getNextEligibleExcluding(int $clinicId, string $date, ?string $station, int $excludeQueueId): ?Queue
    {
        return $this->buildWaitingQuery($clinicId, $date, $station, $excludeQueueId)->first();
    }

    /**
     * Auto-expire unserved tickets from previous clinic days.
     * Returns the count of expired tickets.
     */
    public function expireStaleTickets(int $clinicId, string $date): int
    {
        $staleStatuses = array_merge(self::MAIN_STATUSES, self::SECOND_STATUSES);

        $staleTickets = Queue::where('clinic_id', $clinicId)
            ->where('queue_date', '<', $date)
            ->whereIn('status', $staleStatuses)
            ->whereNull('deleted_at')
            ->get();

        $count = 0;
        foreach ($staleTickets as $ticket) {
            $ticket->update([
                'status'             => 'no_response',
                'no_response_at'     => now(),
                'consultation_notes' => 'Auto-expired: patient did not complete visit before clinic closed',
            ]);
            $this->logHistory($ticket, 'auto_expired', 'no_response', null,
                'Auto-expired at end of clinic day');
            $count++;
        }

        return $count;
    }

    /**
     * Add a patient to the queue with advisory-lock-safe queue number generation.
     * Fires a notification and syncs today's appointments.
     *
     * @return Queue The newly created (and loaded) queue entry.
     * @throws \Illuminate\Validation\ValidationException  (duplicate patient)
     */
    public function addToQueue(
        int             $clinicId,
        Authenticatable $user,
        int             $patientId,
        ?int            $biteIncidentId,
        string          $visitType,
        string          $priority,
        string          $category,
        ?string         $checkInNotes,
        string          $todayDate,
    ): array {
        // Prevent duplicate — same patient cannot be active in queue twice today
        $existing = Queue::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->where('queue_date', $todayDate)
            ->whereNull('deleted_at')
            ->whereIn('status', array_merge(self::MAIN_STATUSES, self::SECOND_STATUSES))
            ->lockForUpdate()
            ->first();

        if ($existing) {
            return ['duplicate' => true, 'existing' => $existing->load(['patient', 'biteIncident'])];
        }

        $this->expireStaleTickets($clinicId, $todayDate);

        // Normalise visit type
        if ($visitType === 'consultation') $visitType = 'new_case';
        if ($visitType === 'follow_up')    $visitType = 'vaccination';

        $patient = Patient::where('clinic_id', $clinicId)->find($patientId);
        if ($patient && ($patient->is_category1_no_treatment || $patient->treatment_status === 'transferred_referred' || $patient->case_status === 'transferred_out')) {
            if ($visitType === 'vaccination') {
                $reason = ($patient->treatment_status === 'transferred_referred' || $patient->case_status === 'transferred_out')
                    ? 'Patient Transferred/Referred'
                    : 'Category I — No Treatment Required';
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'visit_type' => ["Doctor assessment is completed ({$reason}). Patient cannot enter the treatment queue."],
                ]);
            }
        }

        $isBoosterRequest = ($visitType === 'booster');
        if ($isBoosterRequest) {
            $visitType = 'new_case';
            $checkInNotes = trim(implode(' | ', array_filter([
                $checkInNotes,
                'Booster request: Doctor assessment and Form 2 approval required before treatment.',
            ])));
        }

        // Advisory lock: serialises concurrent check-ins for the same clinic+date
        // so MAX(queue_number)+1 is always safe even when the table is empty.
        $lockName    = "queue_checkin_{$clinicId}_{$todayDate}";
        $lockTimeout = 5;

        DB::statement('SELECT GET_LOCK(?, ?)', [$lockName, $lockTimeout]);

        try {
            $maxNumber = DB::table('queues')
                ->where('clinic_id', $clinicId)
                ->where('queue_date', $todayDate)
                ->max('queue_number');

            $nextQueueNumber = $maxNumber ? ($maxNumber + 1) : 1;

            $queue = Queue::create([
                'clinic_id'      => $clinicId,
                'patient_id'     => $patientId,
                'bite_id'        => $biteIncidentId,
                'queue_number'   => $nextQueueNumber,
                'queue_date'     => $todayDate,
                'visit_type'     => $visitType,
                'priority'       => $priority,
                'queue_category' => $category,
                'status'         => 'waiting',
                'checked_in_at'  => now(),
                'checked_in_by'  => $user->id,
                'check_in_notes' => $checkInNotes,
                'call_count'     => 0,
            ]);

            // Sync today's scheduled appointments with the new queue number
            \App\Models\Appointment::where('patient_id', $patientId)
                ->where('status', 'scheduled')
                ->where(function ($q) use ($todayDate) {
                    $q->whereDate('scheduled_date', $todayDate)
                      ->orWhereDate('appointment_date', $todayDate);
                })
                ->update(['queue_number' => $nextQueueNumber]);

            $this->logHistory($queue, 'checked_in', 'waiting', $user->id,
                "Category: {$category}, Priority: {$priority}");

            $this->flushCache($clinicId, $todayDate);

            app(\App\Services\NotificationService::class)
                ->notifyQueueEvent($queue->load('patient'), 'checked_in', $user);

            return [
                'duplicate'      => false,
                'queue'          => $queue->load(['patient', 'biteIncident']),
                'queue_number'   => $nextQueueNumber,
                'queue_category' => $category,
                'visit_type'     => $visitType,
            ];
        } finally {
            DB::statement('SELECT RELEASE_LOCK(?)', [$lockName]);
        }
    }

    // ── Private ────────────────────────────────────────────────────────────

    /**
     * Build the sorted waiting-patient query with optional station scope and
     * optional exclusion of one queue_id.
     */
    private function buildWaitingQuery(
        int     $clinicId,
        string  $date,
        ?string $station      = null,
        ?int    $excludeQueueId = null,
    ): \Illuminate\Database\Eloquent\Collection {
        $categoryOrder = self::CATEGORY_ORDER;
        $priorityLevel = ['emergency' => 1, 'urgent' => 2, 'normal' => 3];

        $query = Queue::where('clinic_id', $clinicId)
            ->whereNull('deleted_at')
            ->where('status', 'waiting')
            ->where('call_count', '<', 3)
            ->where(function ($q) use ($date) {
                $q->where('queue_date', $date)
                  ->orWhere(function ($s) use ($date) {
                      $s->where('queue_date', '<', $date)
                        ->whereIn('status', self::MAIN_STATUSES);
                  });
            });

        if ($excludeQueueId !== null) {
            $query->where('queue_id', '!=', $excludeQueueId);
        }

        if ($station === 'triage') {
            $query->whereIn('visit_type', ['new_case', 'consultation']);
        } elseif ($station === 'treatment') {
            $query->whereIn('visit_type', ['vaccination', 'follow_up', 'observation', 'booster']);
        }

        $waiting = $query
            ->with(['patient:' . $this->patientFields(), 'biteIncident:bite_id,case_number,patient_id'])
            ->get();

        if ($waiting->isEmpty()) {
            return $waiting; // empty collection — caller checks isEmpty() / first()
        }

        return $waiting->sortBy([
            fn($a, $b) => ($categoryOrder[$a->queue_category] ?? 4) <=> ($categoryOrder[$b->queue_category] ?? 4),
            fn($a, $b) => ($priorityLevel[$a->priority] ?? 3)       <=> ($priorityLevel[$b->priority] ?? 3),
            fn($a, $b) => $a->queue_number <=> $b->queue_number,
        ])->values();
    }
}
