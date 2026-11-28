<?php

namespace App\Console\Commands;

use App\Models\OutboundMessage;
use Illuminate\Console\Command;

class MessagingStatus extends Command
{
    protected $signature = 'messaging:status {--clinic= : Filter by clinic ID}';

    protected $description = 'Show message backlog, outcomes, and estimated SMS segments without patient data';

    public function handle(): int
    {
        $query = OutboundMessage::query()->when($this->option('clinic'), fn ($q, $id) => $q->where('clinic_id', $id));
        $rows = (clone $query)->selectRaw('channel, provider, status, COUNT(*) AS total')
            ->groupBy('channel', 'provider', 'status')->get();
        $this->table(['Channel', 'Provider', 'Status', 'Count'], $rows->map(fn ($r) => [$r->channel, $r->provider, $r->status, $r->total]));
        $oldest = (clone $query)->where('status', 'queued')->min('created_at');
        $this->line('Oldest queued: '.($oldest ?: 'none'));
        $segments = 0;
        (clone $query)->where('channel', 'sms')->whereDate('created_at', today())->chunkById(100, function ($messages) use (&$segments) {
            foreach ($messages as $message) {
                $segments += $message->context['sms_estimate']['segments'] ?? 0;
            }
        });
        $this->line('Estimated SMS segments requested today: '.$segments.' (not a billing total)');

        return self::SUCCESS;
    }
}
