<?php

namespace App\Exceptions;

use RuntimeException;

class DuplicatePatientException extends RuntimeException
{
    /**
     * @param  array<int, array<string, mixed>>  $duplicates
     */
    public function __construct(
        string $message,
        protected array $duplicates = []
    ) {
        parent::__construct($message, 409);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getDuplicates(): array
    {
        return $this->duplicates;
    }
}
