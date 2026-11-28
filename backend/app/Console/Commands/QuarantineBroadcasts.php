<?php

namespace App\Console\Commands;

use App\Services\QueueQuarantine;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class QuarantineBroadcasts extends Command
{
    protected $signature = 'queue:quarantine-broadcasts
        {action=quarantine : quarantine, verify, or restore}
        {--backup= : Encrypted backup path required for verify/restore}
        {--restored : Verify restored rows instead of quarantined rows}
        {--execute : Apply changes; otherwise dry-run}
        {--confirm= : Explicit confirmation: quarantine-1-8 or restore-1-8}';

    protected $description = 'Safely isolate or restore the eight audited historical broadcast jobs';

    public function handle(): int
    {
        try {
            $action = $this->argument('action');
            if (! in_array($action, ['quarantine', 'verify', 'restore'], true)
                || ($this->option('restored') && $action !== 'verify')
                || ($action === 'verify' && $this->option('execute'))
                || ($action === 'quarantine' && $this->option('backup'))) {
                $this->error('Invalid action or option combination.');

                return self::FAILURE;
            }
            if ($this->option('execute') && $this->option('confirm') !== $action.'-1-8') {
                $this->error('Execution requires --confirm='.$action.'-1-8. All queue consumers must be stopped.');

                return self::FAILURE;
            }
            if ($this->option('execute') && PHP_OS_FAMILY === 'Windows') {
                $this->error('Execution requires Linux/POSIX backup permissions; Windows supports dry-run only.');

                return self::FAILURE;
            }
            $config = config('queue.connections.database');
            if (($config['driver'] ?? null) !== 'database') {
                throw new \RuntimeException;
            }
            $db = DB::connection($config['connection'] ?? null);
            $db->disableQueryLog();
            // MySQL row locking requires a transactional table. Tests use an isolated SQLite connection.
            if ($db->getDriverName() !== 'mysql') {
                throw new \RuntimeException;
            }
            $engine = $db->selectOne('SELECT ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [$db->getDatabaseName(), $db->getTablePrefix().$config['table']]);
            if (strtolower($engine->engine ?? '') !== 'innodb') {
                throw new \RuntimeException;
            }
            $service = new QueueQuarantine($db, $config['table'], app('encrypter'), config('queue.quarantine_backup_directory'));
            if ($action === 'verify') {
                $service->verify((string) $this->option('backup'), (bool) $this->option('restored'));
                $this->info('Verified 8 complete records and payload checksums; only the expected queue differs.');

                return self::SUCCESS;
            }
            $original = $action === 'quarantine' ? $service->inspect() : $service->readBackup((string) $this->option('backup'));
            if ($action === 'restore') {
                $service->verify((string) $this->option('backup'));
            }
            $this->info('Validated IDs 1-8, expected types, zero attempts, and no reservations.');
            if (! $this->option('execute')) {
                $this->info('DRY RUN: no backup written and no rows changed.');

                return self::SUCCESS;
            }
            $path = $action === 'quarantine' ? $service->backup($original) : (string) $this->option('backup');
            $this->info('Verified encrypted backup: '.$path);
            // Re-read the persisted artifact rather than trusting an in-memory backup.
            $service->apply($service->readBackup($path), $action === 'restore');
            $this->info('Committed: only the queue column changed for IDs 1-8.');

            return self::SUCCESS;
        } catch (Throwable) {
            // Never print/report exception messages: database exceptions may contain raw payload bindings.
            $this->error('Operation failed safely. No partial database changes committed. Check prerequisites and row state; any completed backup is retained.');

            return self::FAILURE;
        }
    }
}
