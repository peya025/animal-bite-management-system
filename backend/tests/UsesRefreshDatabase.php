<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;

/**
 * Drop-in replacement for RefreshDatabase that wraps the outer test
 * transaction using Laravel's DB::beginTransaction() instead of raw
 * PDO::beginTransaction().  This ensures $connection->transactions is
 * incremented to 1 BEFORE any controller code runs, so nested
 * DB::transaction() / DB::beginTransaction() calls inside controllers
 * correctly fall back to SQLite savepoints rather than issuing a second
 * raw BEGIN TRANSACTION (which PDO/SQLite rejects).
 *
 * Usage: replace `use RefreshDatabase;` with `use UsesRefreshDatabase;`
 * in any test class whose endpoints call DB::transaction() internally.
 */
trait UsesRefreshDatabase
{
    use RefreshDatabase {
        beginDatabaseTransaction as private parentBeginDatabaseTransaction;
    }

    /**
     * Override the RefreshDatabase transaction wrapper to go through
     * Laravel's connection layer (which manages the $transactions counter
     * and uses SAVEPOINTs on SQLite when the level is already > 0).
     */
    protected function beginDatabaseTransaction(): void
    {
        $database = $this->app->make('db');

        foreach ($this->connectionsToTransact() as $name) {
            $connection = $database->connection($name);

            // Use Laravel's DB layer so $connection->transactions is set to 1.
            // Subsequent DB::transaction() calls inside controllers will see
            // transactionLevel() === 1 and use savepoints instead of a raw BEGIN.
            $connection->beginTransaction();

            $this->beforeApplicationDestroyed(function () use ($connection) {
                try {
                    if ($connection->transactionLevel() > 0) {
                        $connection->rollBack();
                    }
                } catch (\Throwable) {
                    // Ignore errors during teardown
                }
            });
        }
    }
}
