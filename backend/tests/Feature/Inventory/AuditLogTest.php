<?php

namespace Tests\Feature\Inventory;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Services\VaccineInventoryUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan ABTC']);
    }

    private function createAdmin(Clinic $clinic): User
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);
        $roleAdmin = Role::firstOrCreate(['slug' => 'clinic_admin'], [
            'name' => 'clinic_admin',
            'display_name' => 'Clinic Admin',
            'default_route' => '/dashboard',
        ]);
        $admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        return $admin;
    }

    private function createNurse(Clinic $clinic): User
    {
        $nurse = User::create([
            'name' => 'Nurse Joy',
            'email' => 'joy@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);
        $roleNurse = Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'name' => 'intake_nurse',
            'display_name' => 'Intake Nurse',
            'default_route' => '/queue',
        ]);
        $nurse->roles()->attach($roleNurse->id, ['assigned_at' => now()]);

        return $nurse;
    }

    public function test_inventory_create_generates_audit_log(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/inventory', [
            'vaccine_type' => 'Anti-rabies (PVRV)',
            'batch_number' => 'AUDIT-BATCH-001',
            'quantity' => 20,
            'expiration_date' => now()->addYear()->toDateString(),
            'received_from' => 'DOH Regional Office',
        ]);

        $response->assertStatus(201);

        $inventoryId = $response->json('inventory.inventory_id');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'inventory.create',
            'model' => VaccineInventory::class,
            'model_id' => $inventoryId,
            'user_id' => $admin->id,
        ]);
    }

    public function test_inventory_deduct_generates_audit_log(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'AUDIT-DEDUCT-BATCH',
            'current_quantity' => 10,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);
        $service->deductForTreatment($clinic->id, $nurse->id, 201, 'Anti-rabies', 3);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'inventory.deduct',
            'model' => VaccineInventory::class,
            'model_id' => $batch->inventory_id,
            'user_id' => $nurse->id,
        ]);

        $log = AuditLog::where('action', 'inventory.deduct')
            ->where('model_id', $batch->inventory_id)
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals(10, $log->old_values['current_quantity']);
        $this->assertEquals(7, $log->new_values['current_quantity']);
    }

    public function test_inventory_archive_generates_audit_log_with_reason(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'AUDIT-ARCH-BATCH',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->deleteJson('/api/inventory/' . $batch->inventory_id, [
            'reason' => 'Batch compromised due to power outage',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'inventory.archive',
            'model' => VaccineInventory::class,
            'model_id' => $batch->inventory_id,
            'user_id' => $admin->id,
        ]);

        $log = AuditLog::where('action', 'inventory.archive')
            ->where('model_id', $batch->inventory_id)
            ->first();

        $this->assertNotNull($log);
        $this->assertStringContainsString('Batch compromised due to power outage', $log->description);
    }
}
