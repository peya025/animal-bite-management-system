<?php

namespace Tests\Feature\Inventory;

use App\Models\Clinic;
use App\Models\User;
use App\Models\AuditLog;
use App\Models\VaccineInventory;
use App\Services\VaccineInventoryUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private function setupClinicAndAdmin(): array
    {
        $clinic = Clinic::create(['name' => 'Tagoloan ABTC']);
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@testclinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        return [$clinic, $admin];
    }

    public function test_inventory_create_generates_audit_log(): void
    {
        [$clinic, $admin] = $this->setupClinicAndAdmin();
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/inventory', [
            'vaccine_type' => 'Rabipur',
            'batch_number' => 'RAB-2026-001',
            'quantity' => 25,
            'expiration_date' => now()->addYear()->toDateString(),
        ]);

        $response->assertCreated();

        $log = AuditLog::where('action', 'inventory.create')->first();
        $this->assertNotNull($log);
        $this->assertEquals($admin->id, $log->user_id);
        $this->assertEquals('Rabipur', $log->new_values['vaccine_type'] ?? null);
    }

    public function test_inventory_deduct_generates_audit_log(): void
    {
        [$clinic, $admin] = $this->setupClinicAndAdmin();

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Rabipur',
            'batch_number' => 'RAB-2026-002',
            'current_quantity' => 20,
            'expiration_date' => now()->addYear()->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);
        $service->deductForTreatment($clinic->id, $admin->id, 301, 'Rabipur', 4);

        $log = AuditLog::where('action', 'inventory.deduct')->first();
        $this->assertNotNull($log);
        $this->assertEquals(20, $log->old_values['current_quantity']);
        $this->assertEquals(16, $log->new_values['current_quantity']);
    }

    public function test_inventory_archive_generates_audit_log_with_reason(): void
    {
        [$clinic, $admin] = $this->setupClinicAndAdmin();
        Sanctum::actingAs($admin);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Rabipur',
            'batch_number' => 'RAB-2026-003',
            'current_quantity' => 10,
            'expiration_date' => now()->addYear()->toDateString(),
            'status' => 'active',
        ]);

        $response = $this->deleteJson("/api/inventory/{$batch->inventory_id}", [
            'reason' => 'Damaged cold storage during storm power outage',
        ]);

        $response->assertOk();

        $log = AuditLog::where('action', 'inventory.archive')->first();
        $this->assertNotNull($log);
        $this->assertEquals('Damaged cold storage during storm power outage', $log->reason);
        $this->assertSoftDeleted('vaccine_inventory', ['inventory_id' => $batch->inventory_id]);
    }
}