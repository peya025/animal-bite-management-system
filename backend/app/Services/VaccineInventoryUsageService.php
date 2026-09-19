<?php

namespace App\Services;

use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use App\Models\InventoryTransaction;
use App\Services\AuditLogger;
use App\Exceptions\FifoViolationException;
use App\Exceptions\InsufficientStockException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VaccineInventoryUsageService
{
    /**
     * Administer a single dose using automated open-vial / FIFO allocation
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
                $newDosesUsed = $openVial->open_vial_doses_used + 1;
                $isComplete = ($newDosesUsed >= $dosesPerVial);

                $beforeState = [
                    'current_quantity' => $openVial->current_quantity,
                    'open_vial_doses_used' => $openVial->open_vial_doses_used,
                    'open_vial_status' => $openVial->open_vial_status,
                    'open_vial_discard_at' => $openVial->open_vial_discard_at?->toDateTimeString(),
                ];

                $openVial->update([
                    'open_vial_doses_used' => $newDosesUsed,
                    'open_vial_status' => $isComplete ? 'unopened' : 'opened',
                    'open_vial_discard_at' => $isComplete ? null : $openVial->open_vial_discard_at,
                ]);

                $afterState = [
                    'current_quantity' => $openVial->current_quantity,
                    'open_vial_doses_used' => $newDosesUsed,
                    'open_vial_status' => $isComplete ? 'unopened' : 'opened',
                    'open_vial_discard_at' => $isComplete ? null : $openVial->open_vial_discard_at?->toDateTimeString(),
                ];

                AuditLogger::log(
                    'inventory.deduct',
                    $openVial,
                    $beforeState,
                    $afterState,
                    "Automated dose #{$newDosesUsed}/{$dosesPerVial} from open vial for Treatment ID #{$treatmentId}",
                    $staffId,
                    $clinicId
                );

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
            $openVialHours = $preset ? (int) ($preset->default_open_vial_hours ?? 6) : 6;

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

            $beforeState = [
                'current_quantity' => $batch->current_quantity,
                'status' => $batch->status,
                'open_vial_status' => $batch->open_vial_status,
                'open_vial_doses_used' => $batch->open_vial_doses_used,
            ];

            $newQuantity = $batch->current_quantity - 1;
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

            $afterState = [
                'current_quantity' => $newQuantity,
                'status' => $batch->fresh()->status,
                'open_vial_status' => $batch->fresh()->open_vial_status,
                'open_vial_doses_used' => 1,
            ];

            AuditLogger::log(
                'inventory.deduct',
                $batch,
                $beforeState,
                $afterState,
                "New vial opened and dose administered for Treatment ID #{$treatmentId}",
                $staffId,
                $clinicId
            );

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
        ?int $forceBatchId = null,
        bool $forceOverride = false,
        ?string $overrideReason = null
    ): array {
        if ($quantity < 1) {
            throw ValidationException::withMessages([
                'quantity' => 'Inventory units used must be at least 1.',
            ]);
        }

        return DB::transaction(function () use (
            $clinicId,
            $staffId,
            $treatmentId,
            $vaccineType,
            $quantity,
            $forceBatchId,
            $forceOverride,
            $overrideReason
        ) {
            if ($forceBatchId) {
                // Lock the requested batch
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

                // Strict FIFO verification: batch must have the earliest expiration date among active batches
                $fifoBatch = VaccineInventory::where('clinic_id', $clinicId)
                    ->where('vaccine_type', $vaccineType)
                    ->where('status', 'active')
                    ->where('current_quantity', '>=', $quantity)
                    ->orderBy('expiration_date', 'asc')
                    ->orderBy('created_at', 'asc')
                    ->first();

                if ($fifoBatch && $batch->inventory_id !== $fifoBatch->inventory_id && $batch->expiration_date > $fifoBatch->expiration_date) {
                    if (!$forceOverride) {
                        throw ValidationException::withMessages([
                            'force_batch_id' => "Requested batch (Batch #{$batch->batch_number}) is not the earliest-expiring batch. FIFO policy requires batch #{$fifoBatch->batch_number}.",
                        ]);
                    }
                }
            } else {
                // Lock the earliest FIFO batch
                $batch = VaccineInventory::where('clinic_id', $clinicId)
                    ->where('vaccine_type', $vaccineType)
                    ->where('status', 'active')
                    ->where('current_quantity', '>=', $quantity)
                    ->orderBy('expiration_date', 'asc')
                    ->orderBy('created_at', 'asc')
                    ->lockForUpdate()
                    ->first();

                if (!$batch || $batch->current_quantity < $quantity) {
                    throw ValidationException::withMessages([
                        'inventory' => "Insufficient stock for {$vaccineType}.",
                    ]);
                }
            }

            $beforeState = [
                'current_quantity' => $batch->current_quantity,
                'status' => $batch->status,
            ];

            $newQuantity = $batch->current_quantity - $quantity;

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
                'remarks' => 'Vaccine administered from treatment nurse flow (Treatment ID: ' . $treatmentId . ')'
                    . ($forceOverride ? " [Authorized FIFO Override: {$overrideReason}]" : ''),
            ]);

            $afterState = [
                'current_quantity' => $newQuantity,
                'status' => $newQuantity === 0 ? 'depleted' : 'active',
            ];

            AuditLogger::log(
                'inventory.deduct',
                $batch,
                $beforeState,
                $afterState,
                $forceOverride
                    ? "Admin authorized FIFO override: {$overrideReason}"
                    : "Vaccine administered for Treatment ID #{$treatmentId}",
                $staffId,
                $clinicId
            );

            return [
                'batch' => $batch->fresh(),
                'quantity_used' => $quantity,
                'remaining_quantity' => $newQuantity,
            ];
        });
    }
}
