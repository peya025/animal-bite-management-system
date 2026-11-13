<?php

namespace App\Jobs;

use App\Services\Messaging\OutboundDelivery;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class DeliverOutboundMessage implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 45;

    public function __construct(public int $messageId)
    {
        $this->onConnection(config('messaging.queue_connection'));
        $this->onQueue(config('messaging.queue'));
        $this->afterCommit();
    }

    public function handle(OutboundDelivery $delivery): void
    {
        $delivery->deliver($this->messageId);
    }
}
