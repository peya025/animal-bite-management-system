<?php

namespace App\Console\Commands;

use App\Models\CommunityAdvisory;
use App\Models\CommunityAdvisoryDelivery;
use App\Models\SurveillanceRun;
use Illuminate\Console\Command;

class CommunityAwarenessHealthCheck extends Command
{
    protected $signature = 'advisories:health-check';
    protected $description = 'Output a privacy-safe operational and reconciliation summary for surveillance and community advisories.';

    public function handle(): int
    {
        $yesterday = now('Asia/Manila')->subDay()->toDateString();
        $latestRun = SurveillanceRun::latest('id')->first();

        $published = CommunityAdvisory::where('state', 'published')->get();
        $integrityMismatches = $published->filter(
            fn (CommunityAdvisory $a) => $a->approved_by === null
                || $a->approved_by === $a->author_id
                || !hash_equals($a->approved_hash ?? '', $a->contentHash())
        )->count();

        $outbox = CommunityAdvisoryDelivery::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $summary = [
            'checked_at' => now('Asia/Manila')->toIso8601String(),
            'flags' => [
                'publication_enabled' => (bool) config('community_awareness.publication_enabled'),
                'push_enabled' => (bool) config('community_awareness.push_enabled'),
            ],
            'surveillance' => [
                'latest_run_id' => $latestRun?->id,
                'latest_cutoff' => $latestRun?->cutoff,
                'stale' => !$latestRun || $latestRun->cutoff < $yesterday,
            ],
            'advisories' => [
                'pending_review' => CommunityAdvisory::where('state', 'submitted')->count(),
                'approved_unscheduled' => CommunityAdvisory::where('state', 'approved')->count(),
                'scheduled' => CommunityAdvisory::where('state', 'scheduled')->count(),
                'published' => $published->count(),
                'integrity_mismatches' => $integrityMismatches,
            ],
            'delivery_outbox' => [
                'queued' => (int) ($outbox['queued'] ?? 0),
                'deferred' => (int) ($outbox['deferred'] ?? 0),
                'sent' => (int) ($outbox['sent'] ?? 0),
                'cancelled' => (int) ($outbox['cancelled'] ?? 0),
                'failed' => (int) ($outbox['failed'] ?? 0),
            ],
        ];

        $this->line(json_encode($summary, JSON_PRETTY_PRINT));

        return $integrityMismatches === 0 ? self::SUCCESS : self::FAILURE;
    }
}
