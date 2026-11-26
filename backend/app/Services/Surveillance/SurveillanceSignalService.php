<?php

namespace App\Services\Surveillance;

use App\Models\Clinic;
use App\Models\SurveillanceRun;
use App\Models\SurveillanceSignal;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class SurveillanceSignalService
{
    public function __construct(private ExposureDatasetBuilder $dataset) {}

    public function canReview(User $user): bool
    {
        return $user->is_active && $user->clinic_id && $user->role !== 'developer'
            && ($user->role === 'admin' || $user->roles()->where('slug', 'doctor')->exists());
    }

    public function evaluate(int $clinicId, ?string $date = null): SurveillanceRun
    {
        $cutoff = $date ? CarbonImmutable::createFromFormat('!Y-m-d', $date, 'Asia/Manila') : CarbonImmutable::now('Asia/Manila')->subDay()->startOfDay();
        abort_unless($cutoff && $cutoff->lt(CarbonImmutable::now('Asia/Manila')->startOfDay()), 422, 'Use a completed local calendar day.');
        return DB::transaction(function () use ($clinicId, $cutoff) {
            // Serialize evaluation and manual transitions for this clinic, including
            // first signal creation (where a signal row cannot yet be locked).
            $clinic = Clinic::lockForUpdate()->findOrFail($clinicId);
            $previous = SurveillanceRun::where('clinic_id', $clinicId)->latest('id')->first();
            abort_if($previous && $previous->cutoff > $cutoff->toDateString(), 409, 'Historical runs cannot overwrite current review state.');
            $summary = $this->dataset->build($clinic, $cutoff);
            if ($previous && $previous->cutoff === $cutoff->toDateString() && ($previous->summary['source_fingerprint'] ?? null) === $summary['fingerprint']) { return $previous; }
            $summary['source_fingerprint'] = $summary['fingerprint'];
            $existing = SurveillanceRun::where('clinic_id', $clinicId)->where('cutoff', $cutoff->toDateString())
                ->where('fingerprint', $summary['fingerprint'])->first();
            if ($existing && $previous?->id === $existing->id) { return $existing; }
            // A reverted data set must still become the latest observation. Salt
            // only when that historical fingerprint already exists.
            if ($existing) { $summary['fingerprint'] = hash('sha256', $summary['fingerprint'].'|after:'.$previous->id); }
            $summary['suspicious_count_change'] = $previous
                && abs(array_sum(array_column($summary['buckets'], 'current_count')) - array_sum(array_column($previous->summary['buckets'], 'current_count'))) >= 3;
            $run = SurveillanceRun::create(['clinic_id' => $clinicId, 'cutoff' => $cutoff->toDateString(),
                'rule_version' => $summary['rule_version'], 'fingerprint' => $summary['fingerprint'], 'summary' => $summary, 'created_at' => now()]);
            $buckets = collect($summary['buckets'])->keyBy('geography_key');
            $signals = SurveillanceSignal::where('clinic_id', $clinicId)->get()->keyBy('geography_key');
            foreach ($buckets as $key => $metrics) {
                if (!$metrics['priority'] && !$signals->has($key)) { continue; }
                $item = $signals->get($key);
                if (!$item) {
                    $item = SurveillanceSignal::create([
                        'clinic_id' => $clinicId, 'geography_key' => $key, 'barangay' => $metrics['barangay'],
                        'municipality' => $metrics['municipality'], 'province' => $metrics['province'],
                        'priority' => $metrics['priority'], 'latest_run_id' => $run->id, 'metrics' => $metrics,
                        'last_evaluated_cutoff' => $cutoff->toDateString(),
                    ])->refresh();
                    $this->record($item, 'detected');
                } else {
                    $this->updateFromRun($item, $metrics, $run);
                }
            }
            foreach ($signals as $key => $item) {
                if (!$buckets->has($key)) {
                    $metrics = $item->metrics;
                    foreach (['current_count', 'baseline_count', 'finalized_category_iii', 'awaiting_assessment'] as $field) { $metrics[$field] = 0; }
                    $metrics['current_incident_ids'] = $metrics['baseline_incident_ids'] = [];
                    $metrics['priority'] = $metrics['ratio'] = null;
                    $metrics['baseline_weekly_average'] = 0;
                    $this->updateFromRun($item, $metrics, $run);
                }
            }
            return $run;
        });
    }

    private function updateFromRun(SurveillanceSignal $item, array $metrics, SurveillanceRun $run): void
    {
        $action = 'refreshed';
        if ($metrics['priority']) {
            $newEvidence = array_diff($metrics['current_incident_ids'], $item->metrics['current_incident_ids']);
            $escalated = $item->priority !== 'priority_review' && $metrics['priority'] === 'priority_review';
            if (($item->state === 'resolved') || ($item->state === 'dismissed' && ($newEvidence || $escalated))) {
                $item->state = 'new'; $action = 'reopened';
            }
            $item->priority = $metrics['priority'];
            $item->below_threshold_days = 0;
        } else {
            // Missing geography/date evidence is not proof a pattern disappeared.
            $quality = $run->summary['exclusions'];
            $canResolve = !$quality['uncertain_date'] && !$quality['unknown_or_ambiguous_location']
                && ($item->priority !== 'trend_for_review' || $run->summary['baseline_adequate']);
            if (!$canResolve) {
                $item->below_threshold_days = 0;
            } else {
            if ($item->last_evaluated_cutoff !== $run->cutoff) {
                $consecutive = CarbonImmutable::parse($item->last_evaluated_cutoff)->addDay()->toDateString() === $run->cutoff;
                $item->below_threshold_days = $consecutive ? $item->below_threshold_days + 1 : 1;
            } elseif ($item->below_threshold_days === 0) { $item->below_threshold_days = 1; }
            if ($item->below_threshold_days >= 2 && !in_array($item->state, ['dismissed', 'resolved'], true)) {
                $item->state = 'resolved'; $action = 'resolved';
            }
            }
        }
        $item->latest_run_id = $run->id;
        $item->last_evaluated_cutoff = $run->cutoff;
        $item->metrics = $metrics;
        $item->version++;
        $item->save();
        $this->record($item, $action);
    }

    public function review(User $user, int $id, array $data): SurveillanceSignal
    {
        abort_unless($this->canReview($user), 403);
        return DB::transaction(function () use ($user, $id, $data) {
            Clinic::lockForUpdate()->findOrFail($user->clinic_id);
            $item = SurveillanceSignal::where('clinic_id', $user->clinic_id)->lockForUpdate()->findOrFail($id);
            abort_unless($item->version === $data['version'], 409, 'The signal changed. Refresh before reviewing.');
            $action = $data['action'];
            $states = match ($action) {
                'assign' => ['new', 'in_review', 'verified'], 'verify', 'dismiss' => ['new', 'in_review'],
                'reopen' => ['verified', 'dismissed', 'resolved'], default => [],
            };
            abort_unless(in_array($item->state, $states, true), 409, 'Invalid review transition.');
            if ($action === 'assign') {
                $assignee = User::where('clinic_id', $user->clinic_id)->findOrFail($data['assigned_to'] ?? $user->id);
                abort_unless($this->canReview($assignee), 422, 'Choose an active authorized reviewer.');
                $item->assigned_to = $assignee->id;
                $item->state = 'in_review';
            } else {
                $item->state = match ($action) { 'verify' => 'verified', 'dismiss' => 'dismissed', 'reopen' => 'in_review' };
            }
            $item->version++;
            $item->save();
            $this->record($item, $action, $user->id, $data['reason']);
            return $item;
        });
    }

    private function record(SurveillanceSignal $item, string $action, ?int $actor = null, ?string $reason = null): void
    {
        DB::table('surveillance_signal_events')->insert([
            'signal_id' => $item->id, 'actor_id' => $actor, 'version' => $item->version, 'action' => $action,
            'reason' => $reason, 'snapshot' => $item->toJson(), 'created_at' => now(),
        ]);
    }
}
