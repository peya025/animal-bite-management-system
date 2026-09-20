<?php

namespace App\Database;

use Illuminate\Database\SQLiteConnection;

/**
 * Test-safe SQLite connection that uses SAVEPOINTs when a PDO transaction is
 * already open (e.g. the outer RefreshDatabase transaction).
 *
 * Without this, any controller that calls DB::transaction() or
 * DB::beginTransaction() inside a RefreshDatabase test throws:
 *   PDOException: There is already an active transaction
 * because SQLite does not support nested BEGIN TRANSACTION statements.
 *
 * This class intercepts executeBeginTransactionStatement() and falls back
 * to a SAVEPOINT when PDO reports it is already in a transaction.
 */
class TestSafeSQLiteConnection extends SQLiteConnection
{
    private int $savepointSeq = 0;

    protected function executeBeginTransactionStatement(): void
    {
        if ($this->getPdo()->inTransaction()) {
            // Nested call — use a savepoint instead of BEGIN TRANSACTION
            $sp = 'test_sp_' . (++$this->savepointSeq);
            $this->getPdo()->exec("SAVEPOINT {$sp}");
            // Track the savepoint name so rollback/commit know what to release
            $this->savepoints[] = $sp;
        } else {
            parent::executeBeginTransactionStatement();
        }
    }

    /**
     * Savepoint name stack for nested transaction management.
     * @var string[]
     */
    private array $savepoints = [];

    /**
     * Override rollBack to release the innermost savepoint when nested.
     */
    protected function performRollBack(int $toLevel): void
    {
        if ($toLevel === 0 && !empty($this->savepoints)) {
            // Rolling back the innermost savepoint
            $sp = array_pop($this->savepoints);
            $this->getPdo()->exec("ROLLBACK TO SAVEPOINT {$sp}");
            $this->getPdo()->exec("RELEASE SAVEPOINT {$sp}");
            return;
        }
        parent::performRollBack($toLevel);
    }
}
