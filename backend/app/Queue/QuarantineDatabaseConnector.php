<?php

namespace App\Queue;

use Illuminate\Queue\Connectors\DatabaseConnector;

class QuarantineDatabaseConnector extends DatabaseConnector
{
    public function connect(array $config)
    {
        return new QuarantineDatabaseQueue(
            $this->connections->connection($config['connection'] ?? null),
            $config['table'], $config['queue'], $config['retry_after'] ?? 60, $config['after_commit'] ?? null
        );
    }
}
