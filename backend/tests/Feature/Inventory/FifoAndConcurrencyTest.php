<?php

namespace Tests\Feature\Inventory;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\InventoryTransaction;
use App\Models\Role;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Services\VaccineInventoryUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FifoAndConcurrencyTest extends TestCase
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

    public function test_deduction_uses_earliest_expiry_batch_fifo(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic);

        // Create later batch
        $batchLater = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-2027',
            'current_quantity' => 10,
            'expiration_date' => now()->addMonths(12)->toDateString(),
            'status' => 'active',
        ]);

        // Create earlier expiring batch
        $batchEarlier = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-2026',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(2)->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);
        $result = $service->deductForTreatment($clinic->id, $nurse->id, 101, 'Anti-rabies', 2);

        $this->assertEquals('BATCH-2026', $result['batch']->batch_number);
        $this->assertEquals(3, $batchEarlier->fresh()->current_quantity);
        $this->assertEquals(10, $batchLater->fresh()->current_quantity);
    }

    public function test_non_fifo_force_batch_id_is_rejected(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic);

        $batchEarlier = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-EARLY',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(2)->toDateString(),
            'status' => 'active',
        ]);

        $batchLater = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-LATE',
            'current_quantity' => 10,
            'expiration_date' => now()->addMonths(12)->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);

        $this->expectException(ValidationException::class);
        $service->deductForTreatment($clinic->id, $nurse->id, 102, 'Anti-rabies', 1, $batchLater->inventory_id);
    }

    public function test_nurse_cannot_delete_inventory(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-DEL',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($nurse);
        $response = $this->deleteJson('/api/inventory/' . $batch->inventory_id, [
            'reason' => 'Want to delete',
        ]);
        $response->assertStatus(403);
    }

    public function test_admin_can_archive_inventory_with_reason_and_audit_log(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-ARCH',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        // Add a transaction to prove it is preserved after soft-delete
        InventoryTransaction::create([
            'inventory_id' => $batch->inventory_id,
            'staff_id' => $admin->id,
            'transaction_type' => 'received',
            'quantity' => 5,
            'transaction_date' => now(),
        ]);

        Sanctum::actingAs($admin);
        $response = $this->deleteJson('/api/inventory/' . $batch->inventory_id, [
            'reason' => 'Damaged cold chain during transit',
        ]);
        $response->assertStatus(200);

        // Record must be soft-deleted, not hard-deleted
        $this->assertSoftDeleted('vaccine_inventory', [
            'inventory_id' => $batch->inventory_id,
            'archived_reason' => 'Damaged cold chain during transit',
            'archived_by' => $admin->id,
        ]);

        // Transactions must still be intact
        $this->assertDatabaseHas('inventory_transactions', [
            'inventory_id' => $batch->inventory_id,
        ]);

        // Audit log must exist
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'inventory.archive',
            'model' => VaccineInventory::class,
            'model_id' => $batch->inventory_id,
        ]);
    }

    public function test_open_vial_hours_cannot_exceed_safety_policy(): void
    {
        config(['inventory.open_vial_max_hours' => 8]);

        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-OPEN',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        // Attempt to open vial with 48 hours when policy is 8
        $response = $this->postJson('/api/inventory/' . $batch->inventory_id . '/open-vial', [
            'open_vial_hours' => 48,
        ]);
        $response->assertStatus(422);

        // Valid hours within limit
        $validResponse = $this->postJson('/api/inventory/' . $batch->inventory_id . '/open-vial', [
            'open_vial_hours' => 6,
        ]);
        $validResponse->assertStatus(200);
        $this->assertEquals('opened', $batch->fresh()->open_vial_status);
    }
}
