<?php

namespace App\Console\Commands;

use App\Jobs\DeliverOutboundMessage;
use App\Models\OutboundMessage;
use App\Services\Messaging\Sms\SmsManager;
use Illuminate\Console\Command;

class DispatchOutboundMessages extends Command
{
    protected $signature = 'messaging:dispatch';

    protected $description = 'Recover queued messages and reconcile supported delivery receipts';

    public function handle(): int
    {
        // A worker may die after provider acceptance. Preserve uncertainty, never resend automatically.
        OutboundMessage::where('status', 'processing')->where('updated_at', '<', now()->subMinutes(5))
            ->update(['status' => 'unknown', 'error_code' => 'worker_interrupted']);
        OutboundMessage::where('status', 'queued')
            ->where(fn ($q) => $q->whereNull('next_attempt_at')->orWhere('next_attempt_at', '<=', now()))
            ->orderBy('id')->limit(200)->get()->each(fn ($message) => DeliverOutboundMessage::dispatch($message->id));
        $pending = OutboundMessage::where('channel', 'sms')->where('status', 'accepted')
            ->whereNotNull('provider_message_id')->where('created_at', '>=', now()->subDays(3))
            ->where(fn ($q) => $q->whereNull('checked_at')->orWhere('checked_at', '<', now()->subMinutes(10)))
            ->orderBy('checked_at')->limit(20)->get();
        foreach ($pending as $message) {
            try {
                $provider = app(SmsManager::class)->provider($message->provider);
                $message->update(['checked_at' => now()]);
                if (! $provider->capabilities()['receipts']) {
                    continue;
                }
                $result = $provider->status($message->provider_message_id);
                // Only an authenticated lookup of this exact ID may establish a terminal status.
                if ($result->messageId !== $message->provider_message_id || ! in_array($result->status, ['delivered', 'failed'])) {
                    continue;
                }
                $changed = OutboundMessage::whereKey($message->id)->where('status', 'accepted')->update([
                    'status' => $result->status, 'error_code' => $result->error,
                    'delivered_at' => $result->status === 'delivered' ? now() : null,
                ]);
                if ($changed) {
                    $message->attempts()->create(['provider' => $message->provider, 'status' => $result->status, 'provider_message_id' => $result->messageId, 'error_code' => $result->error]);
                }
            } catch (\Throwable) {
                // Failed status lookup is not evidence that sending failed.
            }
        }
        $this->info('Outbound queue recovery and receipt reconciliation completed.');

        return self::SUCCESS;
    }
}
