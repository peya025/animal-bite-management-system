<?php

namespace Tests\Unit;

use App\Console\Commands\QuarantineBroadcasts;
use App\Events\StaffNotificationBroadcast;
use App\Events\VaccineStockUpdated;
use App\Queue\QuarantineDatabaseConnector;
use App\Queue\QuarantineDatabaseQueue;
use App\Services\QueueQuarantine;
use Illuminate\Broadcasting\BroadcastEvent;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Capsule\Manager;
use Illuminate\Database\Connection;
use Illuminate\Database\ConnectionResolver;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Encryption\Encrypter;
use Illuminate\Foundation\Application;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Tester\CommandTester;

class QueueQuarantineTest extends TestCase
{
    private Connection $db;

    private QueueQuarantine $service;

    private string $directory;

    protected function setUp(): void
    {
        // No Laravel bootstrap, .env, external database, mail, or queue worker.
        $capsule = new Manager;
        $capsule->addConnection(['driver' => 'sqlite', 'database' => ':memory:']);
        $this->db = $capsule->getConnection();
        $this->db->getSchemaBuilder()->create('jobs', function (Blueprint $t) {
            $t->id();
            $t->string('queue');
            $t->text('payload');
            $t->integer('attempts');
            $t->integer('reserved_at')->nullable();
            $t->integer('available_at');
            $t->integer('created_at');
        });
        foreach (QueueQuarantine::IDS as $id) {
            $event = $id === 7
                ? new VaccineStockUpdated(1, 1, 'test', 'test', 10, timestamp: '2026-11-24T00:00:00Z')
                : new StaffNotificationBroadcast(1, $id, 'test', 'test', 'synthetic', 'synthetic', createdAt: '2026-11-24T00:00:00Z');
            $payload = json_encode(['displayName' => get_class($event), 'job' => 'Illuminate\\Queue\\CallQueuedHandler@call',
                'data' => ['commandName' => BroadcastEvent::class, 'command' => serialize(new BroadcastEvent($event))]], JSON_THROW_ON_ERROR);
            $this->db->table('jobs')->insert(['id' => $id, 'queue' => 'notifications', 'payload' => $payload,
                'attempts' => 0, 'reserved_at' => null, 'available_at' => 1, 'created_at' => 1]);
        }
        $this->directory = sys_get_temp_dir().'/queue-quarantine-test-'.bin2hex(random_bytes(8));
        mkdir($this->directory, 0700);
        // Only this test double bypasses POSIX directory checks on Windows; encryption/readback remain real.
        $this->service = new class($this->db, 'jobs', new Encrypter(random_bytes(32), 'AES-256-CBC'), $this->directory) extends QueueQuarantine
        {
            protected function secureDirectory(): void {}
        };
    }

    protected function tearDown(): void
    {
        foreach (glob($this->directory.'/*.enc') as $file) {
            unlink($file);
        }
        rmdir($this->directory);
        $this->db->disconnect();
    }

    public function test_dry_inspection_has_no_writes_and_round_trip_preserves_every_column(): void
    {
        $original = $this->service->inspect();
        self::assertSame([], glob($this->directory.'/*.enc'));
        self::assertSame($original, $this->service->inspect());
        $path = $this->service->backup($original);
        self::assertStringNotContainsString('synthetic', file_get_contents($path));
        self::assertSame($original, $this->service->readBackup($path));
        $this->service->apply($this->service->readBackup($path));
        $this->service->verify($path);
        self::assertSame(8, $this->db->table('jobs')->where('queue', QueueQuarantine::QUEUE)->count());
        $this->service->apply($this->service->readBackup($path), true);
        $this->service->verify($path, true);
        self::assertSame($original, $this->service->inspect());
    }

    public function test_changed_row_aborts_entire_operation(): void
    {
        foreach (['payload' => '{}', 'attempts' => 1, 'reserved_at' => 123, 'available_at' => 2, 'queue' => 'other'] as $column => $value) {
            $original = $this->service->inspect();
            $this->db->table('jobs')->where('id', 8)->update([$column => $value]);
            try {
                $this->service->apply($original);
                self::fail('Expected validation failure');
            } catch (\RuntimeException) {
                self::assertSame(0, $this->db->table('jobs')->where('queue', QueueQuarantine::QUEUE)->count());
            }
            $this->db->table('jobs')->where('id', 8)->update([$column => $original[7][$column]]);
        }
    }

    public function test_missing_job_is_rejected(): void
    {
        $this->db->table('jobs')->where('id', 7)->delete();
        $this->expectException(\RuntimeException::class);
        $this->service->inspect();
    }

    public function test_wrong_event_type_is_rejected_even_with_correct_display_name(): void
    {
        $payload = json_decode($this->db->table('jobs')->where('id', 7)->value('payload'), true);
        $other = json_decode($this->db->table('jobs')->where('id', 1)->value('payload'), true);
        $payload['data'] = $other['data'];
        $this->db->table('jobs')->where('id', 7)->update(['payload' => json_encode($payload)]);
        $this->expectException(\RuntimeException::class);
        $this->service->inspect();
    }

    public function test_tampered_backup_is_rejected(): void
    {
        $path = $this->service->backup($this->service->inspect());
        file_put_contents($path, 'corrupt');
        $this->expectException(DecryptException::class);
        $this->service->readBackup($path);
    }

    public function test_post_update_failure_rolls_back_all_eight_rows(): void
    {
        $original = $this->service->inspect();
        $this->db->statement('CREATE TRIGGER change_timestamp AFTER UPDATE ON jobs WHEN NEW.id = 8 BEGIN UPDATE jobs SET created_at = 999 WHERE id = 8; END');
        try {
            $this->service->apply($original);
            self::fail('Expected verification failure');
        } catch (\RuntimeException) {
            self::assertSame($original, $this->service->inspect());
        }
    }

    public function test_quarantine_cannot_be_reserved_even_as_default_queue(): void
    {
        $this->service->apply($this->service->inspect());
        $resolver = new ConnectionResolver(['local' => $this->db]);
        $resolver->setDefaultConnection('local');
        $queue = (new QuarantineDatabaseConnector($resolver))->connect(['table' => 'jobs', 'queue' => QueueQuarantine::QUEUE]);
        self::assertInstanceOf(QuarantineDatabaseQueue::class, $queue);
        self::assertNull($queue->pop('notifications'));
        foreach ([null, QueueQuarantine::QUEUE, strtoupper(QueueQuarantine::QUEUE)] as $name) {
            try {
                $queue->pop($name);
                self::fail('Expected reservation guard');
            } catch (\RuntimeException) {
                self::assertSame(0, $this->db->table('jobs')->whereNotNull('reserved_at')->count());
            }
        }
    }

    public function test_execute_requires_confirmation_before_database_access(): void
    {
        $command = new QuarantineBroadcasts;
        $app = new Application;
        $app->instance('env', 'testing');
        $command->setLaravel($app);
        $tester = new CommandTester($command);
        foreach (['quarantine', 'restore'] as $action) {
            self::assertSame(1, $tester->execute(['action' => $action, '--execute' => true], ['interactive' => false]));
            self::assertStringContainsString('--confirm='.$action.'-1-8', $tester->getDisplay());
            self::assertSame(8, $this->db->table('jobs')->where('queue', 'notifications')->count());
        }
    }

    public function test_repeat_quarantine_and_changed_restore_fail_without_partial_writes(): void
    {
        $original = $this->service->inspect();
        $path = $this->service->backup($original);
        $this->service->apply($original);
        try {
            $this->service->apply($original);
            self::fail('Expected repeat rejection');
        } catch (\RuntimeException) {
            $this->service->verify($path);
        }
        $this->db->table('jobs')->where('id', 1)->update(['attempts' => 1]);
        try {
            $this->service->apply($original, true);
            self::fail('Expected restore rejection');
        } catch (\RuntimeException) {
            self::assertSame(8, $this->db->table('jobs')->where('queue', QueueQuarantine::QUEUE)->count());
        }
    }
}
