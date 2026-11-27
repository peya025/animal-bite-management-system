<?php

namespace App\Queue;

use Illuminate\Queue\DatabaseQueue;
use RuntimeException;

class QuarantineDatabaseQueue extends DatabaseQueue
{
    public function pop($queue = null)
    {
        if (str_starts_with(strtolower(trim($this->getQueue($queue))), 'quarantine_')) {
            throw new RuntimeException('Quarantine queues cannot be consumed.');
        }

        return parent::pop($queue);
    }
}
