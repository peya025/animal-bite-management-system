<?php

namespace App\Services\Clinical;

use App\Models\Patient;
use Carbon\Carbon;

class PatientRowActions
{
    /**
     * Resolve dynamic actions for a patient table row.
     *
     * @param Patient $patient
     * @return array{
     *   primary: string|null,
     *   check_in_blocked_reason: string|null,
     *   invite: string|null,
     *   invite_disabled_reason: string|null,
     *   view: bool,
     *   invitation_id?: int|null
     * }
     */
    public static function resolve(Patient $patient): array
    {
        $todayStr = Carbon::now('Asia/Manila')->toDateString();

        // 1. Pending Administration
        // A patient with an unfinished prior visit requiring physician reassessment
        $statusSummary = $patient->resolveEpisodeStatusSummary();
        $pendingSummary = $statusSummary['pending_treatment_summary'] ?? null;
        $hasPendingAdministration = !empty($pendingSummary['has_pending_treatment'])
            && !empty($pendingSummary['can_check_in_for_reassessment']);

        // Check active queue tickets today
        $todayQueues = $patient->relationLoaded('queues')
            ? $patient->queues
            : $patient->queues()->where('queue_date', $todayStr)->whereNull('deleted_at')->get();

        $activeStatuses = ['waiting', 'called', 'serving', 'in_consultation', 'second_chance', 'final_recall'];
        $hasActiveQueueToday = $todayQueues->contains(function ($q) use ($activeStatuses, $todayStr) {
            $queueDate = $q->queue_date ? Carbon::parse($q->queue_date)->toDateString() : null;
            return ($queueDate === $todayStr || empty($queueDate))
                && in_array($q->status, $activeStatuses, true);
        });

        // 2. Pending Arrival
        // An intake or appointment waiting to be checked in, or returning patient awaiting triage
        $hasPendingArrival = false;

        $treatmentStatus = strtolower((string) ($statusSummary['treatment_status'] ?? $patient->treatment_status ?? ''));
        $caseStatus = strtolower((string) ($statusSummary['case_status'] ?? $patient->case_status ?? ''));
        $isTransferredOrNoTreatment = $treatmentStatus === 'transferred_referred'
            || $caseStatus === 'transferred_out'
            || $treatmentStatus === 'completed_without_injection'
            || !empty($patient->is_category1_no_treatment);

        $accounts = $patient->relationLoaded('accounts')
            ? $patient->accounts
            : $patient->accounts()->get();

        $isOnline = in_array($patient->registration_source, ['mobile', 'online'], true);

        if (!$hasActiveQueueToday && !$isTransferredOrNoTreatment) {
            // Check pending bite intake due on or before today
            $biteIntakes = $patient->relationLoaded('biteIntakes')
                ? $patient->biteIntakes
                : $patient->biteIntakes()->latest()->get();

            $appointments = $patient->relationLoaded('appointments')
                ? $patient->appointments
                : $patient->appointments()->get();

            $biteIncidents = $patient->relationLoaded('biteIncidents')
                ? $patient->biteIncidents
                : $patient->biteIncidents()->get();

            $isPreRegisteredOnly = ($isOnline || $accounts->isNotEmpty())
                && $appointments->isEmpty()
                && $biteIntakes->isEmpty()
                && $biteIncidents->isEmpty();

            if (!$isPreRegisteredOnly) {
                $hasDueIntake = $biteIntakes->contains(function ($intake) use ($appointments, $todayStr) {
                    if ($intake->status !== 'pending') {
                        return false;
                    }
                    $appt = $appointments->firstWhere('appointment_id', $intake->appointment_id);
                    if (!$appt) {
                        return false;
                    }
                    $scheduledDate = $appt->scheduled_date ?? $appt->appointment_date;
                    if (!$scheduledDate) {
                        return false;
                    }
                    return Carbon::parse($scheduledDate)->toDateString() <= $todayStr;
                });

                // Check scheduled appointment for today
                $hasDueAppointment = $appointments->contains(function ($appt) use ($todayStr) {
                    if (!in_array($appt->status, ['scheduled', 'missed'], true)) {
                        return false;
                    }
                    $scheduledDate = $appt->scheduled_date ?? $appt->appointment_date;
                    if (!$scheduledDate) {
                        return false;
                    }
                    return Carbon::parse($scheduledDate)->toDateString() === $todayStr;
                });

                // Check returning patient awaiting triage check-in
                $isReturningAwaitingTriage = false;
                $regDate = $patient->created_at ? Carbon::parse($patient->created_at)->toDateString() : null;
                $isRegisteredBeforeToday = $regDate && $regDate < $todayStr;

                $hasPastConsultationAppt = $appointments->contains(function ($appt) use ($todayStr) {
                    if ($appt->appointment_type && $appt->appointment_type !== 'consultation') {
                        return false;
                    }
                    if ($appt->dose_number !== null && (int)$appt->dose_number > 0) {
                        return false;
                    }
                    if (!in_array($appt->status, ['scheduled', 'missed'], true)) {
                        return false;
                    }
                    $scheduledDate = $appt->scheduled_date ?? $appt->appointment_date;
                    return $scheduledDate && Carbon::parse($scheduledDate)->toDateString() < $todayStr;
                });

                $latestRecord = $patient->relationLoaded('latestTreatmentRecord')
                    ? $patient->latestTreatmentRecord
                    : $patient->latestTreatmentRecord()->first();
                $hasDosesAdministered = $latestRecord && $latestRecord->dose_number !== null;

                $latestConsultation = $patient->relationLoaded('latestConsultationRecord')
                    ? $patient->latestConsultationRecord
                    : $patient->latestConsultationRecord()->first();
                $hasCompletedConsultation = $latestConsultation && (
                    $latestConsultation->status === 'completed'
                    || !empty($latestConsultation->nature_of_visit)
                    || !empty($latestConsultation->diagnosis)
                );

                $hasConfirmedEpisode = $biteIncidents->contains(function ($bi) {
                    return !empty($bi->confirmed_at)
                        || in_array($bi->status, ['active', 'completed'], true)
                        || in_array($bi->episode_type, ['primary', 're_exposure'], true);
                });

                // Check if patient specifically requires check-in today (after 3 missed calls)
                $latestQueueToday = $todayQueues->sortByDesc('queue_id')->first();
                $completedQueueToday = $latestQueueToday && $latestQueueToday->status === 'completed';
                $requiresCheckinToday = $latestQueueToday && (
                    $latestQueueToday->status === 'requires_checkin'
                    || ($latestQueueToday->status === 'no_response' && (int)$latestQueueToday->call_count >= 3)
                );

                if ($requiresCheckinToday) {
                    $isReturningAwaitingTriage = true;
                } elseif (
                    !$completedQueueToday
                    && ($isRegisteredBeforeToday || $hasPastConsultationAppt)
                    && !$hasDosesAdministered
                    && !$hasCompletedConsultation
                    && !$hasConfirmedEpisode
                    && !$patient->is_category1_no_treatment
                ) {
                    $isReturningAwaitingTriage = true;
                }

                $hasPendingArrival = $hasDueIntake || $hasDueAppointment || $isReturningAwaitingTriage;
            }
        }

        // 3. Precedence
        // Pending administration (with or without pending arrival): Reassess only. Check In is hidden and blocked.
        // Pending arrival, no pending administration: Check In.
        // Neither: none.
        $primary = $hasPendingAdministration ? 'reassess'
                 : ($hasPendingArrival ? 'checkin' : null);

        $checkInBlockedReason = ($hasPendingAdministration && $hasPendingArrival)
                 ? 'REASSESSMENT_REQUIRED' : null;

        // 4. Source & Mobile Account Linkage
        // Walk-in patients are registered with registration_source = 'staff' (or 'walk_in' / null), never 'mobile'/'online'.
        $isWalkIn = !$isOnline;

        $hasVerifiedMobileAccount = $accounts->contains(function ($account) {
            return ($account->pivot->status ?? null) === 'verified';
        });

        // 5. Invite rules:
        // - Not eligible (online patient, or a walk-in who already has a verified account): no button.
        // - Eligible and no invite sent, or the last invite expired: Portal Invite.
        // - Eligible and an invite is pending activation: Resend Invite.
        // - Eligible but the patient has no contact number or email: button shown disabled with reason "NO_CONTACT".
        $eligible = $isWalkIn && !$hasVerifiedMobileAccount;

        $invitations = $patient->relationLoaded('invitations')
            ? $patient->invitations
            : $patient->invitations()->get();

        $latestInvite = $invitations->sortByDesc('id')->first();
        $latestInviteStatus = null;
        if ($latestInvite) {
            if ($latestInvite->status === 'accepted') {
                $latestInviteStatus = 'accepted';
            } elseif ($latestInvite->isExpired()) {
                $latestInviteStatus = 'expired';
            } elseif ($latestInvite->status === 'pending') {
                $latestInviteStatus = 'pending';
            }
        }

        if (!$eligible) {
            $invite = null;
        } else {
            $invite = ($latestInviteStatus === 'pending') ? 'resend' : 'send';
        }

        // Contact info check
        $hasEmail = !empty(trim((string) $patient->email));
        $hasContact = !empty(trim((string) $patient->contact_number)) || $hasEmail;
        $inviteDisabledReason = ($eligible && !$hasContact) ? 'NO_CONTACT' : null;

        return [
            'primary' => $primary,
            'check_in_blocked_reason' => $checkInBlockedReason,
            'invite' => $invite,
            'invite_disabled_reason' => $inviteDisabledReason,
            'has_email' => $hasEmail,
            'view' => true,
            'invitation_id' => $latestInvite?->id,
        ];
    }
}
