<?php

namespace Tests\Feature\Inventory;

use App\Models\Clinic;
use App\Models\InventoryTransaction;
use App\Models\Role;
use App\Models\User;
use App\Models\VaccineInventory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorizationTest extends TestCase
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

    private function createDeveloper(Clinic $clinic): User
    {
        $dev = User::create([
            'name' => 'Developer Dave',
            'email' => 'dev@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'developer',
            'is_active' => true,
        ]);
        $roleDev = Role::firstOrCreate(['slug' => 'developer'], [
            'name' => 'developer',
            'display_name' => 'Developer',
            'default_route' => '/dashboard',
        ]);
        $dev->roles()->attach($roleDev->id, ['assigned_at' => now()]);

        return $dev;
    }

    public function test_nurse_cannot_delete_inventory(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-NO-NURSE-DEL',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($nurse);
        $response = $this->deleteJson('/api/inventory/' . $batch->inventory_id, [
            'reason' => 'Unauthorized nurse deletion',
        ]);
        $response->assertStatus(403);
    }

    public function test_developer_cannot_delete_inventory(): void
    {
        $clinic = $this->createClinic();
        $dev = $this->createDeveloper($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-NO-DEV-DEL',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($dev);
        $response = $this->deleteJson('/api/inventory/' . $batch->inventory_id, [
            'reason' => 'Developer attempting delete',
        ]);
        $response->assertStatus(403);
    }

    public function test_admin_can_archive_inventory_with_reason(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-ADMIN-ARCHIVE',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        InventoryTransaction::create([
            'inventory_id' => $batch->inventory_id,
            'staff_id' => $admin->id,
            'transaction_type' => 'received',
            'quantity' => 5,
            'transaction_date' => now(),
        ]);

        Sanctum::actingAs($admin);
        $response = $this->deleteJson('/api/inventory/' . $batch->inventory_id, [
            'reason' => 'Vials broken in storage',
        ]);
        $response->assertStatus(200);

        $this->assertSoftDeleted('vaccine_inventory', [
            'inventory_id' => $batch->inventory_id,
            'archived_reason' => 'Vials broken in storage',
            'archived_by' => $admin->id,
        ]);

        $this->assertDatabaseHas('inventory_transactions', [
            'inventory_id' => $batch->inventory_id,
        ]);
    }

    public function test_admin_delete_without_reason_returns_422(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-NO-REASON',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->deleteJson('/api/inventory/' . $batch->inventory_id, []);
        $response->assertStatus(422);
    }
}
