<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\InventoryTransaction;
use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Domain service for all vaccine inventory write operations.
 * Extracted from VaccineInventoryController — every DB::transaction boundary,
 * AuditLog entry, and NotificationService call is preserved exactly.
 */
class VaccineInventoryService
{
    // ── Inventory CRUD ────────────────────────────────────────────────────

    /**
     * Create a new inventory batch with its initial transaction and audit entry.
     * Catches MySQL duplicate-key violations and converts them to ValidationException
     * (same behaviour as the original controller).
     */
    public function createBatch(
        int             $clinicId,
        Authenticatable $user,
        array           $data,
    ): VaccineInventory {
        try {
            return DB::transaction(function () use ($clinicId, $user, $data) {
                $preset = VaccineTypePreset::where(fn($q) => $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId))
                    ->where('vaccine_name', $data['vaccine_type'])
                    ->first();

                $dosesPerVial = isset($data['doses_per_vial'])
                    ? (int) $data['doses_per_vial']
                    : ($preset && $preset->is_multidose ? max(1, (int) $preset->doses_per_vial) : 1);

                $inventory = VaccineInventory::create([
                    'clinic_id'         => $clinicId,
                    'vaccine_type'      => $data['vaccine_type'],
                    'batch_number'      => $data['batch_number'],
                    'received_from'     => $data['received_from'] ?? 'DOH Central Supply (National Rabies Prevention Program)',
                    'manufactured_date' => $data['manufactured_date'] ?? null,
                    'shelf_life_months' => $data['shelf_life_months'] ?? null,
                    'open_vial_hours'   => $data['open_vial_hours'] ?? null,
                    'doses_per_vial'    => $dosesPerVial,
                    'cold_chain_notes'  => $data['cold_chain_notes'] ?? null,
                    'current_quantity'  => $data['quantity'],
                    'expiration_date'   => $data['expiration_date'],
                    'status'            => 'active',
                    'open_vial_status'  => 'unopened',
                ]);

                InventoryTransaction::create([
                    'inventory_id'      => $inventory->inventory_id,
                    'staff_id'          => $user->id,
                    'transaction_type'  => 'received',
                    'quantity'          => $data['quantity'],
                    'quantity_received' => $data['quantity'],
                    'received_from'     => $data['received_from'] ?? 'DOH Central Supply (National Rabies Prevention Program)',
                    'balanced'          => $data['quantity'],
                    'remarks'           => $data['remarks'] ?? 'Initial stock received',
                ]);

                AuditLog::create([
                    'user_id'     => $user->id,
                    'clinic_id'   => $clinicId,
                    'action'      => 'inventory.create',
                    'model'       => VaccineInventory::class,
                    'model_id'    => $inventory->inventory_id,
                    'new_values'  => $inventory->toArray(),
                    'description' => "Initial inventory created for batch {$inventory->batch_number}",
                ]);

                app(NotificationService::class)->notifyStockReceived($inventory, $user, (int) $data['quantity']);

                if ($preset) {
                    $inventory->setRelation('vaccinePreset', $preset);
                    $inventory->vaccine_category = $preset->category;
                }

                return $inventory;
            });
        } catch (\Illuminate\Database\QueryException $e) {
            $this->rethrowDuplicateBatch($e, $data['batch_number'] ?? '');
            throw $e;
        }
    }

    /**
     * Update an existing inventory batch with audit trail.
     */
    public function updateBatch(
        int             $clinicId,
        Authenticatable $user,
        int             $id,
        array           $data,
    ): VaccineInventory {
        try {
            return DB::transaction(function () use ($clinicId, $user, $id, $data) {
                $inventory = VaccineInventory::where('clinic_id', $clinicId)->lockForUpdate()->findOrFail($id);
                $oldValues = $inventory->toArray();

                $inventory->update(array_intersect_key($data, array_flip([
                    'vaccine_type', 'batch_number', 'received_from', 'manufactured_date',
                    'shelf_life_months', 'open_vial_hours', 'doses_per_vial',
                    'cold_chain_notes', 'expiration_date', 'status',
                ])));

                AuditLog::create([
                    'user_id'     => $user->id,
                    'clinic_id'   => $clinicId,
                    'action'      => 'inventory.update',
                    'model'       => VaccineInventory::class,
                    'model_id'    => $inventory->inventory_id,
                    'old_values'  => $oldValues,
                    'new_values'  => $inventory->fresh()->toArray(),
                    'description' => "Inventory updated for batch {$inventory->batch_number}",
                ]);

                return $inventory->fresh();
            });
        } catch (\Illuminate\Database\QueryException $e) {
            $this->rethrowDuplicateBatch($e, $data['batch_number'] ?? '');
            throw $e;
        }
    }

    /**
     * Soft-delete (archive) an inventory batch with audit trail.
     */
    public function archiveBatch(
        int             $clinicId,
        Authenticatable $user,
        int             $id,
        string          $reason,
    ): void {
        DB::transaction(function () use ($clinicId, $user, $id, $reason) {
            $inventory = VaccineInventory::where('clinic_id', $clinicId)->lockForUpdate()->findOrFail($id);
            $oldState  = $inventory->toArray();

            $inventory->update([
                'archived_reason' => $reason,
                'archived_by'     => $user->id,
            ]);
            $inventory->delete();

            AuditLog::create([
                'user_id'     => $user->id,
                'clinic_id'   => $clinicId,
                'action'      => 'inventory.archive',
                'model'       => VaccineInventory::class,
                'model_id'    => $inventory->inventory_id,
                'old_values'  => $oldState,
                'new_values'  => ['archived_reason' => $reason, 'deleted_at' => now()->toIso8601String()],
                'description' => "Inventory batch {$inventory->batch_number} archived: {$reason}",
            ]);
        });
    }

    /**
     * Adjust stock quantity with full transaction record and audit log.
     */
    public function adjustStock(
        int             $clinicId,
        Authenticatable $user,
        int             $id,
        string          $type,
        int             $quantity,
        ?string         $remarks,
    ): VaccineInventory {
        return DB::transaction(function () use ($clinicId, $user, $id, $type, $quantity, $remarks) {
            $inventory = VaccineInventory::where('clinic_id', $clinicId)->lockForUpdate()->findOrFail($id);
            $oldQty    = (int) $inventory->current_quantity;
            $oldStatus = $inventory->status;

            if (in_array($type, ['expired', 'disposed'], true) && $quantity > $oldQty) {
                throw ValidationException::withMessages([
                    'quantity' => 'The requested stock removal exceeds the available quantity.',
                ]);
            }

            $newQty    = in_array($type, ['received', 'adjusted'], true)
                ? $oldQty + $quantity
                : $oldQty - $quantity;

            $newStatus = $newQty === 0
                ? 'depleted'
                : ($oldStatus === 'depleted' ? 'active' : $oldStatus);

            $inventory->update(['current_quantity' => $newQty, 'status' => $newStatus]);

            InventoryTransaction::create([
                'inventory_id'     => $inventory->inventory_id,
                'staff_id'         => $user->id,
                'transaction_type' => $type,
                'quantity'         => $quantity,
                'balanced'         => $newQty,
                'remarks'          => $remarks,
            ]);

            AuditLog::create([
                'user_id'     => $user->id,
                'clinic_id'   => $clinicId,
                'action'      => 'inventory.adjust',
                'model'       => VaccineInventory::class,
                'model_id'    => $inventory->inventory_id,
                'old_values'  => ['current_quantity' => $oldQty, 'status' => $oldStatus],
                'new_values'  => ['current_quantity' => $newQty, 'status' => $newStatus, 'transaction_type' => $type],
                'description' => "Stock adjusted for batch {$inventory->batch_number}: {$type} {$quantity}",
            ]);

            if ($type === 'received') {
                app(NotificationService::class)->notifyStockReceived($inventory, $user, $quantity);
            } else {
                app(NotificationService::class)->syncInventoryAlerts($inventory->clinic_id);
            }

            return $inventory->fresh();
        });
    }

    // ── Vial lifecycle ────────────────────────────────────────────────────

    /**
     * Mark a vial as opened, start the discard countdown, log transaction + audit.
     */
    public function openVial(
        int             $clinicId,
        Authenticatable $user,
        int             $id,
        ?int            $requestedHours,
    ): VaccineInventory {
        $maxHours = config('inventory.open_vial_max_hours', 8);

        if ($requestedHours !== null && $requestedHours > $maxHours) {
            throw ValidationException::withMessages([
                'open_vial_hours' => "Open-vial hours cannot exceed {$maxHours} hours per clinical safety policy.",
            ]);
        }

        return DB::transaction(function () use ($clinicId, $user, $id, $requestedHours, $maxHours) {
            $inventory  = VaccineInventory::where('clinic_id', $clinicId)->lockForUpdate()->findOrFail($id);
            $hours      = min((int) ($inventory->open_vial_hours ?: ($requestedHours ?: 6)), $maxHours);
            $openedAt   = Carbon::now();
            $discardAt  = (clone $openedAt)->addHours($hours);

            $inventory->update([
                'opened_at'             => $openedAt,
                'open_vial_discard_at'  => $discardAt,
                'open_vial_status'      => 'opened',
            ]);

            InventoryTransaction::create([
                'inventory_id'     => $inventory->inventory_id,
                'staff_id'         => $user->id,
                'transaction_type' => 'adjusted',
                'quantity'         => 0,
                'remarks'          => "Vial marked OPENED by {$user->name}. Discard countdown ({$hours}h) active until {$discardAt->format('M d, Y h:i A')}.",
            ]);

            AuditLog::create([
                'user_id'     => $user->id,
                'clinic_id'   => $clinicId,
                'action'      => 'inventory.open_vial',
                'model'       => VaccineInventory::class,
                'model_id'    => $inventory->inventory_id,
                'old_values'  => ['open_vial_status' => 'unopened'],
                'new_values'  => ['open_vial_status' => 'opened', 'open_vial_discard_at' => $discardAt->toIso8601String()],
                'description' => "Vial opened manually for batch {$inventory->batch_number}",
            ]);

            return $inventory->fresh();
        });
    }

    /**
     * Discard an opened vial, reset its state, log transaction + audit.
     */
    public function discardVial(
        int             $clinicId,
        Authenticatable $user,
        int             $id,
        string          $reason,
    ): VaccineInventory {
        return DB::transaction(function () use ($clinicId, $user, $id, $reason) {
            $inventory = VaccineInventory::where('clinic_id', $clinicId)->lockForUpdate()->findOrFail($id);

            if ($inventory->open_vial_status !== 'opened') {
                throw ValidationException::withMessages([
                    'inventory' => 'Only an opened vial can be discarded.',
                ]);
            }

            $oldValues = [
                'open_vial_status'     => $inventory->open_vial_status,
                'opened_at'            => $inventory->opened_at?->toIso8601String(),
                'open_vial_discard_at' => $inventory->open_vial_discard_at?->toIso8601String(),
            ];

            $inventory->update([
                'open_vial_status'     => 'unopened',
                'opened_at'            => null,
                'open_vial_discard_at' => null,
            ]);

            InventoryTransaction::create([
                'inventory_id'     => $inventory->inventory_id,
                'staff_id'         => $user->id,
                'transaction_type' => 'disposed',
                'quantity'         => 0,
                'balanced'         => $inventory->current_quantity,
                'remarks'          => "Open vial discarded by {$user->name}: {$reason}",
            ]);

            AuditLog::create([
                'user_id'     => $user->id,
                'clinic_id'   => $clinicId,
                'action'      => 'inventory.discard_vial',
                'model'       => VaccineInventory::class,
                'model_id'    => $inventory->inventory_id,
                'old_values'  => $oldValues,
                'new_values'  => ['open_vial_status' => 'unopened', 'opened_at' => null, 'open_vial_discard_at' => null, 'current_quantity' => $inventory->current_quantity],
                'description' => "Open vial discarded for batch {$inventory->batch_number}: {$reason}",
            ]);

            return $inventory->fresh();
        });
    }

    // ── Presets ───────────────────────────────────────────────────────────

    /**
     * Create or update a vaccine type preset, then sync matching inventory batches.
     */
    public function upsertPreset(int $clinicId, Authenticatable $user, array $data): VaccineTypePreset
    {
        $isMultidose = (bool) ($data['is_multidose'] ?? false);

        $preset = VaccineTypePreset::updateOrCreate(
            ['clinic_id' => $clinicId, 'vaccine_name' => $data['vaccine_name']],
            [
                'category'                  => $data['category'] ?? 'Anti-Rabies Vaccines (ARV)',
                'default_shelf_life_months' => $data['default_shelf_life_months'] ?? 24,
                'default_open_vial_hours'   => (int) $data['default_open_vial_hours'],
                'storage_temperature_notes' => $data['storage_temperature_notes'] ?? null,
                'dosing_regimen_notes'      => $data['dosing_regimen_notes'] ?? null,
                'administration_route'      => $data['administration_route'] ?? 'Intradermal (ID) / Intramuscular (IM)',
                'is_multidose'              => $isMultidose,
                'doses_per_vial'            => $isMultidose ? max(1, (int) ($data['doses_per_vial'] ?? 1)) : 1,
                'regimen_units_per_patient' => $data['regimen_units_per_patient'] ?? 1,
            ],
        );

        VaccineInventory::where('clinic_id', $clinicId)
            ->where('vaccine_type', $preset->vaccine_name)
            ->update([
                'doses_per_vial'  => $preset->is_multidose ? max(1, (int) $preset->doses_per_vial) : 1,
                'open_vial_hours' => $preset->default_open_vial_hours,
            ]);

        app(NotificationService::class)->notifyVaccinePresetCreated($preset, $user);

        return $preset;
    }

    /**
     * Update an existing preset and sync inventory batches.
     */
    public function updatePreset(int $clinicId, int $id, array $data): VaccineTypePreset
    {
        $preset      = VaccineTypePreset::where(fn($q) => $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId))->findOrFail($id);
        $isMultidose = (bool) ($data['is_multidose'] ?? false);

        $updateData = array_merge(
            array_intersect_key($data, array_flip([
                'vaccine_name', 'category', 'default_shelf_life_months',
                'storage_temperature_notes', 'dosing_regimen_notes',
                'administration_route', 'regimen_units_per_patient',
            ])),
            [
                'is_multidose'           => $isMultidose,
                'doses_per_vial'         => $isMultidose ? max(1, (int) ($data['doses_per_vial'] ?? 1)) : 1,
                'default_open_vial_hours' => (int) $data['default_open_vial_hours'],
                'default_shelf_life_months' => $data['default_shelf_life_months'] ?? $preset->default_shelf_life_months ?? 24,
            ],
        );

        $preset->update($updateData);

        VaccineInventory::where('clinic_id', $clinicId)
            ->where('vaccine_type', $preset->vaccine_name)
            ->update([
                'doses_per_vial'  => $preset->is_multidose ? max(1, (int) $preset->doses_per_vial) : 1,
                'open_vial_hours' => $preset->default_open_vial_hours,
            ]);

        return $preset->fresh();
    }

    // ── Private helpers ───────────────────────────────────────────────────

    /**
     * Convert a MySQL 1062 duplicate-key error into a ValidationException so the
     * client receives a 422 with a field-level error (same as inline behaviour).
     */
    private function rethrowDuplicateBatch(\Illuminate\Database\QueryException $e, string $batchNumber): void
    {
        if (
            ($e->errorInfo[1] ?? null) == 1062
            || str_contains($e->getMessage(), 'Duplicate entry')
            || str_contains($e->getMessage(), 'uniq_clinic_batch')
        ) {
            throw ValidationException::withMessages([
                'batch_number' => "A batch with batch number '{$batchNumber}' already exists in your clinic inventory. Please use a unique batch number.",
            ]);
        }
    }
}
