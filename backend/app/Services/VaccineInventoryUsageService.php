<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\InventoryTransaction;
use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VaccineInventoryUsageService
{
    /**
     * Automated dose administration:
     * - If an active open vial exists with remaining doses, uses it (0 vials deducted).
     * - If no open vial exists, opens a new vial from the earliest expiring FIFO batch (1 vial deducted).
     * Wrapped in DB::transaction with lockForUpdate to guarantee concurrency safety.
     */
    public function administerDoseAutomated(
        int $clinicId,
        int $staffId,
        int $treatmentId,
        string $vaccineType
    ): array {
        return DB::transaction(function () use ($clinicId, $staffId, $treatmentId, $vaccineType) {
            // 1. Check for an active open vial with capacity remaining (with lock)
            $openVial = VaccineInventory::where('clinic_id', $clinicId)
                ->where('vaccine_type', $vaccineType)
                ->where('open_vial_status', 'opened')
                ->whereNotNull('open_vial_discard_at')
                ->where('open_vial_discard_at', '>', now())
                ->whereRaw('open_vial_doses_used < doses_per_vial')
                ->orderBy('open_vial_discard_at', 'asc')
                ->lockForUpdate()
                ->first();

            if ($openVial) {
                $dosesPerVial = max(1, (int) $openVial->doses_per_vial);
                $oldUsed = (int) $openVial->open_vial_doses_used;
                $newDosesUsed = $oldUsed + 1;
                $isComplete = ($newDosesUsed >= $dosesPerVial);

                $openVial->update([
                    'open_vial_doses_used' => $newDosesUsed,
                    'open_vial_status' => $isComplete ? 'unopened' : 'opened',
                    'open_vial_discard_at' => $isComplete ? null : $openVial->open_vial_discard_at,
                ]);

                AuditLog::create([
                    'user_id' => $staffId,
                    'clinic_id' => $clinicId,
                    'action' => 'inventory.open_vial_dose_administered',
                    'model' => VaccineInventory::class,
                    'model_id' => $openVial->inventory_id,
                    'old_values' => ['open_vial_doses_used' => $oldUsed],
                    'new_values' => ['open_vial_doses_used' => $newDosesUsed, 'open_vial_status' => $isComplete ? 'unopened' : 'opened'],
                    'description' => "Dose {$newDosesUsed}/{$dosesPerVial} administered from open vial batch {$openVial->batch_number}",
                ]);

                return [
                    'batch' => $openVial->fresh(),
                    'units_deducted' => 0,
                    'dose_index' => $newDosesUsed,
                    'total_doses' => $dosesPerVial,
                    'is_shared' => true,
                ];
            }

            // 2. No active open vial available -> Open a fresh vial from FIFO stock
            $preset = VaccineTypePreset::where(function ($q) use ($clinicId) {
                $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId);
            })->where('vaccine_name', $vaccineType)->first();

            $dosesPerVial = $preset ? max(1, (int) ($preset->doses_per_vial ?? 1)) : 1;
            $maxAllowedHours = config('inventory.open_vial_max_hours', 8);
            $openVialHours = $preset ? min((int) ($preset->default_open_vial_hours ?? 6), $maxAllowedHours) : min(6, $maxAllowedHours);

            $batch = VaccineInventory::where('clinic_id', $clinicId)
                ->where('vaccine_type', $vaccineType)
                ->where('status', 'active')
                ->where('current_quantity', '>=', 1)
                ->orderBy('expiration_date', 'asc')
                ->orderBy('created_at', 'asc')
                ->lockForUpdate()
                ->first();

            if (!$batch || $batch->current_quantity < 1) {
                throw ValidationException::withMessages([
                    'inventory' => "Insufficient stock for {$vaccineType}. No active inventory batch available.",
                ]);
            }

            $oldQuantity = (int) $batch->current_quantity;
            $newQuantity = $oldQuantity - 1;
            $isMultiDose = ($dosesPerVial > 1);

            $batch->update([
                'current_quantity' => $newQuantity,
                'status' => ($newQuantity === 0 && !$isMultiDose) ? 'depleted' : 'active',
                'doses_per_vial' => $dosesPerVial,
                'open_vial_hours' => $openVialHours,
                'open_vial_doses_used' => 1,
                'opened_at' => $isMultiDose ? now() : null,
                'open_vial_discard_at' => $isMultiDose ? now()->addHours($openVialHours) : null,
                'open_vial_status' => $isMultiDose ? 'opened' : 'unopened',
            ]);

            InventoryTransaction::create([
                'inventory_id' => $batch->inventory_id,
                'staff_id' => $staffId,
                'transaction_type' => 'used',
                'quantity' => 1,
                'dispensed' => 1,
                'reference_id' => (string) $treatmentId,
                'remarks' => "Vial opened from treatment nurse flow (Treatment ID: {$treatmentId})",
            ]);

            AuditLog::create([
                'user_id' => $staffId,
                'clinic_id' => $clinicId,
                'action' => 'inventory.vial_opened',
                'model' => VaccineInventory::class,
                'model_id' => $batch->inventory_id,
                'old_values' => ['current_quantity' => $oldQuantity],
                'new_values' => ['current_quantity' => $newQuantity, 'open_vial_status' => $isMultiDose ? 'opened' : 'unopened'],
                'description' => "Vial opened for batch {$batch->batch_number} (Treatment ID: {$treatmentId})",
            ]);

            return [
                'batch' => $batch->fresh(),
                'units_deducted' => 1,
                'dose_index' => 1,
                'total_doses' => $dosesPerVial,
                'is_shared' => false,
            ];
        });
    }

    /**
     * Preview automated vial allocation for the next dose
     */
    public function getNextAutomatedVialPreview(int $clinicId, string $vaccineType): ?array
    {
        // 1. Check for active open vial
        $openVial = VaccineInventory::where('clinic_id', $clinicId)
            ->where('vaccine_type', $vaccineType)
            ->where('open_vial_status', 'opened')
            ->whereNotNull('open_vial_discard_at')
            ->where('open_vial_discard_at', '>', now())
            ->whereRaw('open_vial_doses_used < doses_per_vial')
            ->orderBy('open_vial_discard_at', 'asc')
            ->first();

        if ($openVial) {
            $dosesPerVial = max(1, (int) $openVial->doses_per_vial);
            $nextDoseIndex = $openVial->open_vial_doses_used + 1;

            return [
                'batch' => $openVial,
                'is_open_vial' => true,
                'next_dose_index' => $nextDoseIndex,
                'total_doses' => $dosesPerVial,
                'units_to_deduct' => 0,
                'discard_at' => $openVial->open_vial_discard_at,
            ];
        }

        // 2. Earliest FIFO batch for a new vial
        $batch = VaccineInventory::where('clinic_id', $clinicId)
            ->where('vaccine_type', $vaccineType)
            ->where('status', 'active')
            ->where('current_quantity', '>=', 1)
            ->orderBy('expiration_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->first();

        if (!$batch) {
            return null;
        }

        $preset = VaccineTypePreset::where(function ($q) use ($clinicId) {
            $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId);
        })->where('vaccine_name', $vaccineType)->first();

        $dosesPerVial = $preset ? max(1, (int) ($preset->doses_per_vial ?? 1)) : 1;

        return [
            'batch' => $batch,
            'is_open_vial' => false,
            'next_dose_index' => 1,
            'total_doses' => $dosesPerVial,
            'units_to_deduct' => 1,
            'discard_at' => null,
        ];
    }

    /**
     * Standard manual deduction with strict FIFO validation and row locking
     */
    public function deductForTreatment(
        int $clinicId,
        int $staffId,
        int $treatmentId,
        string $vaccineType,
        int $quantity,
        ?int $forceBatchId = null
    ): array {
        if ($quantity < 1) {
            throw ValidationException::withMessages([
                'quantity' => 'Inventory units used must be at least 1.',
            ]);
        }

        return DB::transaction(function () use ($clinicId, $staffId, $treatmentId, $vaccineType, $quantity, $forceBatchId) {
            // Find earliest expiring FIFO batch for this vaccine type
            $earliestBatch = VaccineInventory::where('clinic_id', $clinicId)
                ->where('vaccine_type', $vaccineType)
                ->where('status', 'active')
                ->where('current_quantity', '>=', $quantity)
                ->orderBy('expiration_date', 'asc')
                ->orderBy('created_at', 'asc')
                ->lockForUpdate()
                ->first();

            if ($forceBatchId) {
                $batch = VaccineInventory::where('clinic_id', $clinicId)
                    ->where('inventory_id', $forceBatchId)
                    ->where('status', 'active')
                    ->lockForUpdate()
                    ->first();

                if (!$batch || $batch->current_quantity < $quantity) {
                    throw ValidationException::withMessages([
                        'inventory' => 'Selected batch is unavailable or has insufficient stock.',
                    ]);
                }

                // Enforce FIFO: Selected batch cannot have an expiration date later than the earliest available batch
                if ($earliestBatch && $batch->inventory_id !== $earliestBatch->inventory_id && $batch->expiration_date > $earliestBatch->expiration_date) {
                    throw ValidationException::withMessages([
                        'inventory' => "FIFO Policy Violation: Batch {$batch->batch_number} cannot be selected before earlier-expiring batch {$earliestBatch->batch_number} (expires {$earliestBatch->expiration_date->format('Y-m-d')}).",
                    ]);
                }
            } else {
                $batch = $earliestBatch;

                if (!$batch || $batch->current_quantity < $quantity) {
                    throw ValidationException::withMessages([
                        'inventory' => "Insufficient stock for {$vaccineType}.",
                    ]);
                }
            }

            $oldQuantity = (int) $batch->current_quantity;
            $newQuantity = $oldQuantity - $quantity;

            $batch->update([
                'current_quantity' => $newQuantity,
                'status' => $newQuantity === 0 ? 'depleted' : 'active',
            ]);

            InventoryTransaction::create([
                'inventory_id' => $batch->inventory_id,
                'staff_id' => $staffId,
                'transaction_type' => 'used',
                'quantity' => $quantity,
                'dispensed' => $quantity,
                'reference_id' => (string) $treatmentId,
                'remarks' => 'Vaccine administered from treatment nurse flow (Treatment ID: ' . $treatmentId . ')',
            ]);

            AuditLog::create([
                'user_id' => $staffId,
                'clinic_id' => $clinicId,
                'action' => 'inventory.deduct',
                'model' => VaccineInventory::class,
                'model_id' => $batch->inventory_id,
                'old_values' => ['current_quantity' => $oldQuantity],
                'new_values' => ['current_quantity' => $newQuantity],
                'description' => "Deducted {$quantity} unit(s) from batch {$batch->batch_number} (Treatment ID: {$treatmentId})",
            ]);

            return [
                'batch' => $batch->fresh(),
                'quantity_used' => $quantity,
                'remaining_quantity' => $newQuantity,
            ];
        });
    }
}