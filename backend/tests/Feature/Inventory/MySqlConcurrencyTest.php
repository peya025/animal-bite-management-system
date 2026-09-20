<?php

namespace Tests\Feature\Inventory;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\InventoryTransaction;
use App\Models\Role;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Services\VaccineInventoryUsageService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class MySqlConcurrencyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (env('MYSQL_CONCURRENCY_TESTING') !== '1') {
            $this->markTestSkipped('Set MYSQL_CONCURRENCY_TESTING=1 to run the isolated MySQL concurrency suite.');
        }

        if (DB::getDriverName() !== 'mysql') {
            $this->fail('MySqlConcurrencyTest must run with DB_CONNECTION=mysql, never SQLite.');
        }

        $configuredDatabase = (string) config('database.connections.mysql.database');
        $declaredTestDatabase = (string) env('MYSQL_CONCURRENCY_TEST_DATABASE');
        if ($declaredTestDatabase === '' || $configuredDatabase !== $declaredTestDatabase) {
            $this->fail('MYSQL_CONCURRENCY_TEST_DATABASE must exactly match the configured MySQL database.');
        }

        // This database is explicitly declared as disposable above. Running
        // migrations here avoids applying the regular SQLite test connection
        // to a test that is intended to verify MySQL row locking.
        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_competing_mysql_deductions_preserve_stock_ledger_audit_and_status(): void
    {
        $clinic = Clinic::create(['name' => 'MySQL Concurrency Clinic']);
        $staff = User::create([
            'name' => 'MySQL Test Nurse',
            'email' => 'mysql-concurrency-nurse@example.test',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);
        $role = Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'name' => 'intake_nurse',
            'display_name' => 'Intake Nurse',
            'default_route' => '/queue',
        ]);
        $staff->roles()->attach($role->id, ['assigned_at' => now()]);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'MYSQL-RACE-BATCH',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        $worker = null;
        DB::beginTransaction();

        try {
            // Worker one holds a MySQL row lock after consuming three units.
            app(VaccineInventoryUsageService::class)->deductForTreatment(
                $clinic->id,
                $staff->id,
                9001,
                'Anti-rabies',
                3,
            );

            // Worker two uses a separate PHP process and therefore a separate
            // MySQL connection. It must wait for worker one's lock, then fail
            // because only two units remain.
            $worker = new Process([
                PHP_BINARY,
                base_path('tests/Support/inventory_deduction_worker.php'),
                (string) $clinic->id,
                (string) $staff->id,
                '9002',
                'Anti-rabies',
                '3',
            ], base_path(), $this->workerEnvironment());
            $worker->start();

            $deadline = microtime(true) + 5;
            while (! str_contains($worker->getIncrementalOutput(), 'ready') && microtime(true) < $deadline) {
                usleep(10_000);
            }
            $this->assertTrue($worker->isRunning(), 'The second worker should be waiting on the MySQL row lock.');

            DB::commit();
            $worker->wait();

            $this->assertSame(1, $worker->getExitCode());
            $this->assertStringContainsString('validation_error', $worker->getOutput());
        } finally {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            if ($worker?->isRunning()) {
                $worker->stop();
            }
        }

        $batch->refresh();
        $this->assertSame(2, $batch->current_quantity);
        $this->assertSame('active', $batch->status);
        $this->assertSame(1, InventoryTransaction::where('inventory_id', $batch->inventory_id)->count());
        $this->assertSame(3, (int) InventoryTransaction::where('inventory_id', $batch->inventory_id)->sum('quantity'));
        $this->assertSame(1, AuditLog::where('action', 'inventory.deduct')->where('model_id', $batch->inventory_id)->count());
    }

    private function workerEnvironment(): array
    {
        $connection = config('database.connections.mysql');

        return array_merge($_ENV, [
            'APP_ENV' => 'testing',
            'MYSQL_CONCURRENCY_TESTING' => '1',
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => (string) $connection['host'],
            'DB_PORT' => (string) $connection['port'],
            'DB_DATABASE' => (string) $connection['database'],
            'DB_USERNAME' => (string) $connection['username'],
            'DB_PASSWORD' => (string) $connection['password'],
        ]);
    }
}
