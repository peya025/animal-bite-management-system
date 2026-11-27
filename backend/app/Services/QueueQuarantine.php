<?php

namespace App\Services;

use Illuminate\Contracts\Encryption\Encrypter;
use Illuminate\Database\Connection;
use RuntimeException;

class QueueQuarantine
{
    public const QUEUE = 'quarantine_broadcasts_20261124';

    public const IDS = [1, 2, 3, 4, 5, 6, 7, 8];

    public function __construct(private Connection $db, private string $table, private Encrypter $crypt, private string $directory) {}

    private function require(bool $ok): void
    {
        if (! $ok) {
            throw new RuntimeException('Quarantine validation failed; no changes committed.');
        }
    }

    private function rows(bool $lock = false): array
    {
        $query = $this->db->table($this->table)->whereIn('id', self::IDS)->orderBy('id');
        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->get()->map(fn ($row) => (array) $row)->all();
    }

    private function validate(array $rows, string $queue): void
    {
        $this->require(array_map(fn ($r) => (int) $r['id'], $rows) === self::IDS);
        foreach ($rows as $row) {
            $this->require($row['queue'] === $queue && (int) $row['attempts'] === 0 && $row['reserved_at'] === null);
            $payload = json_decode($row['payload'], true, 512, JSON_THROW_ON_ERROR);
            $type = (int) $row['id'] === 7 ? 'App\\Events\\VaccineStockUpdated' : 'App\\Events\\StaffNotificationBroadcast';
            $this->require(($payload['displayName'] ?? null) === $type
                && ($payload['job'] ?? null) === 'Illuminate\\Queue\\CallQueuedHandler@call'
                && ($payload['data']['commandName'] ?? null) === 'Illuminate\\Broadcasting\\BroadcastEvent');
            // Never instantiate production objects or invoke serialization hooks.
            $job = (array) @unserialize($payload['data']['command'] ?? '', ['allowed_classes' => false]);
            $event = (array) ($job['event'] ?? null);
            $this->require(($job['__PHP_Incomplete_Class_Name'] ?? null) === 'Illuminate\\Broadcasting\\BroadcastEvent'
                && ($event['__PHP_Incomplete_Class_Name'] ?? null) === $type);
        }
    }

    private function checksums(array $rows): array
    {
        return array_map(fn ($row) => hash('sha256', $row['payload']), $rows);
    }

    public function inspect(): array
    {
        $rows = $this->rows();
        $this->validate($rows, 'notifications');

        return $rows;
    }

    protected function secureDirectory(): void
    {
        // Production execution requires Linux/POSIX permissions; do not pretend chmod secures Windows ACLs.
        $this->require(PHP_OS_FAMILY !== 'Windows');
        $this->require(! is_link($this->directory));
        if (! is_dir($this->directory)) {
            $this->require(mkdir($this->directory, 0700, true));
        }
        $dir = realpath($this->directory);
        $public = realpath(public_path());
        $this->require($dir !== false && $public !== false && $dir !== $public && ! str_starts_with($dir, $public.DIRECTORY_SEPARATOR));
        $shared = realpath(storage_path('app/public'));
        $this->require($shared === false || ($dir !== $shared && ! str_starts_with($dir, $shared.DIRECTORY_SEPARATOR)));
        $this->require(chmod($dir, 0700));
        clearstatcache();
        $this->require((fileperms($dir) & 0777) === 0700);
    }

    public function backup(array $rows): string
    {
        $this->secureDirectory();
        $document = ['version' => 1, 'table' => $this->table, 'database' => $this->db->getDatabaseName(),
            'target' => self::QUEUE, 'rows' => $rows, 'checksums' => $this->checksums($rows)];
        $encrypted = $this->crypt->encryptString(json_encode($document, JSON_THROW_ON_ERROR));
        $path = $this->directory.'/'.bin2hex(random_bytes(16)).'.enc';
        $oldMask = umask(0077);
        try {
            $file = fopen($path, 'xb');
            $this->require($file !== false);
            try {
                $this->require(fwrite($file, $encrypted) === strlen($encrypted));
                $this->require(fflush($file) && fsync($file));
            } finally {
                fclose($file);
            }
            $this->require(chmod($path, 0600));
        } finally {
            umask($oldMask);
        }
        $this->require($this->readBackup($path) === $rows);

        return $path;
    }

    public function readBackup(string $path): array
    {
        $this->require(! is_link($path) && is_file($path) && realpath(dirname($path)) === realpath($this->directory));
        if (PHP_OS_FAMILY !== 'Windows') {
            $this->require((fileperms($path) & 0777) === 0600 && (fileperms(dirname($path)) & 0777) === 0700);
        }
        $doc = json_decode($this->crypt->decryptString(file_get_contents($path)), true, 512, JSON_THROW_ON_ERROR);
        $this->require($doc['version'] === 1 && $doc['table'] === $this->table && $doc['database'] === $this->db->getDatabaseName() && $doc['target'] === self::QUEUE);
        $this->validate($doc['rows'], 'notifications');
        $this->require($doc['checksums'] === $this->checksums($doc['rows']));

        return $doc['rows'];
    }

    private function compare(array $current, array $original, string $queue): void
    {
        $this->validate($current, $queue);
        $this->require($this->checksums($current) === $this->checksums($original));
        foreach ($current as $i => $row) {
            $row['queue'] = 'notifications';
            $this->require($row === $original[$i]);
        }
    }

    public function verify(string $path, bool $restored = false): void
    {
        $this->compare($this->rows(), $this->readBackup($path), $restored ? 'notifications' : self::QUEUE);
    }

    public function apply(array $original, bool $restore = false): void
    {
        $this->validate($original, 'notifications');
        $this->db->transaction(function () use ($original, $restore) {
            $from = $restore ? self::QUEUE : 'notifications';
            $to = $restore ? 'notifications' : self::QUEUE;
            $this->compare($this->rows(true), $original, $from);
            $count = $this->db->table($this->table)->whereIn('id', self::IDS)->where('queue', $from)
                ->where('attempts', 0)->whereNull('reserved_at')->update(['queue' => $to]);
            $this->require($count === 8);
            $this->compare($this->rows(true), $original, $to);
        }, 1);
    }
}
