<?php

namespace Tests\Feature\Inventory;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\InventoryTransaction;
use App\Models\Role;
use App\Models\User;
use App\Models\VaccineInventory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryMutationSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): array
    {
        $clinic = Clinic::create(['name' => 'Inventory Safety Clinic']);
        $admin = User::create([
            'name' => 'Inventory Admin',
            'email' => 'inventory-admin@example.test',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);
        $role = Role::firstOrCreate(['slug' => 'clinic_admin'], [
            'name' => 'clinic_admin',
            'display_name' => 'Clinic Admin',
            'default_route' => '/dashboard',
        ]);
        $admin->roles()->attach($role->id, ['assigned_at' => now()]);

        return [$clinic, $admin];
    }

    private function batch(Clinic $clinic, array $attributes = []): VaccineInventory
    {
        return VaccineInventory::create(array_merge([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'SAFE-' . fake()->unique()->numerify('#####'),
            'current_quantity' => 10,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
            'open_vial_status' => 'unopened',
        ], $attributes));
    }

    public function test_adjustment_writes_stock_ledger_and_audit_together(): void
    {
        [$clinic, $admin] = $this->admin();
        $batch = $this->batch($clinic);
        Sanctum::actingAs($admin);

        $this->postJson("/api/inventory/{$batch->inventory_id}/adjust", [
            'transaction_type' => 'disposed',
            'quantity' => 3,
            'remarks' => 'Three vials damaged during transport.',
        ])->assertOk()
            ->assertJsonPath('inventory.current_quantity', 7);

        $this->assertDatabaseHas('inventory_transactions', [
            'inventory_id' => $batch->inventory_id,
            'staff_id' => $admin->id,
            'transaction_type' => 'disposed',
            'quantity' => 3,
            'balanced' => 7,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'inventory.adjust',
            'model' => VaccineInventory::class,
            'model_id' => $batch->inventory_id,
            'user_id' => $admin->id,
        ]);

        $log = AuditLog::where('action', 'inventory.adjust')->firstOrFail();
        $this->assertSame(10, $log->old_values['current_quantity']);
        $this->assertSame(7, $log->new_values['current_quantity']);
    }

    public function test_stock_removal_larger_than_available_is_rejected_without_partial_writes(): void
    {
        [$clinic, $admin] = $this->admin();
        $batch = $this->batch($clinic, ['current_quantity' => 2]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/inventory/{$batch->inventory_id}/adjust", [
            'transaction_type' => 'expired',
            'quantity' => 3,
            'remarks' => 'Expired stock count.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('quantity');

        $this->assertSame(2, $batch->fresh()->current_quantity);
        $this->assertDatabaseCount('inventory_transactions', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_open_vial_discard_requires_reason_and_writes_audit_trail(): void
    {
        [$clinic, $admin] = $this->admin();
        $batch = $this->batch($clinic, [
            'open_vial_status' => 'opened',
            'opened_at' => now()->subHour(),
            'open_vial_discard_at' => now()->addHours(7),
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/inventory/{$batch->inventory_id}/discard-vial", [
            'reason' => 'Temperature excursion observed.',
        ])->assertOk()
            ->assertJsonPath('inventory.open_vial_status', 'unopened');

        $this->assertDatabaseHas('inventory_transactions', [
            'inventory_id' => $batch->inventory_id,
            'staff_id' => $admin->id,
            'transaction_type' => 'disposed',
            'quantity' => 0,
            'balanced' => 10,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'inventory.discard_vial',
            'model_id' => $batch->inventory_id,
            'user_id' => $admin->id,
        ]);
    }

    public function test_unopened_vial_cannot_be_discarded_or_create_partial_records(): void
    {
        [$clinic, $admin] = $this->admin();
        $batch = $this->batch($clinic);
        Sanctum::actingAs($admin);

        $this->postJson("/api/inventory/{$batch->inventory_id}/discard-vial", [
            'reason' => 'Attempt to discard unopened vial.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('inventory');

        $this->assertSame('unopened', $batch->fresh()->open_vial_status);
        $this->assertDatabaseCount('inventory_transactions', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }
}
