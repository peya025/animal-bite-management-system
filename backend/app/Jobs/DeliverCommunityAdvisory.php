<?php

namespace App\Jobs;

use App\Services\CommunityAwareness\AdvisoryDeliveryService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DeliverCommunityAdvisory implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 30;
    public array $backoff = [60, 300, 900];

    public function __construct(public int $deliveryId)
    {
        $this->onConnection(config('services.firebase.queue_connection', config('messaging.queue_connection', 'database')));
        $this->onQueue(config('services.firebase.queue', 'fcm'));
        $this->afterCommit();
    }

    public function handle(AdvisoryDeliveryService $deliveryService): void
    {
        $deliveryService->processDelivery($this->deliveryId);
    }
}
