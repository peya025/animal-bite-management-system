<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\InventoryTransaction;
use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use App\Models\VaccineVial;
use App\Models\VaccineVialWastage;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VaccineInventoryUsageService
{
    /**
     * Resolve configured vial capacity and open-vial expiry hours for a vaccine product.
     */
    public function resolveProductRules(int $clinicId, string $vaccineType, ?VaccineInventory $batch = null): array
    {
        $normalized = strtolower(trim($vaccineType));

        $preset = VaccineTypePreset::where(function ($q) use ($clinicId) {
            $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId);
        })
            ->whereRaw('LOWER(TRIM(vaccine_name)) = ?', [$normalized])
            ->orderByRaw('CASE WHEN clinic_id IS NOT NULL THEN 0 ELSE 1 END ASC')
            ->first();

        if ($preset) {
            $totalPortions = $preset->is_multidose
                ? max(1, (int) ($preset->doses_per_vial ?? 1))
                : 1;
        } elseif ($batch) {
            $totalPortions = max(1, (int) ($batch->doses_per_vial ?? 1));
        } else {
            $totalPortions = 1;
        }

        $configuredHours = $preset?->default_open_vial_hours ?? $batch?->open_vial_hours;
        $openVialHours = ($configuredHours !== null && (int) $configuredHours > 0)
            ? (int) $configuredHours
            : 6;

        return [
            'preset'          => $preset,
            'total_portions'  => $totalPortions,
            'open_vial_hours' => $openVialHours,
        ];
    }

    /**
     * Synchronize batch-level open vial summary columns from physical VaccineVial records.
     */
    public function syncBatchOpenVialSummary(VaccineInventory $batch): VaccineInventory
    {
        $activeVial = VaccineVial::where('inventory_id', $batch->inventory_id)
            ->where('status', VaccineVial::STATUS_OPENED)
            ->whereRaw('(administered_portions + discarded_portions) < total_portions')
            ->where(function ($q) {
                $q->whereNull('use_by_at')->orWhere('use_by_at', '>', now());
            })
            ->orderByRaw('CASE WHEN use_by_at IS NULL THEN 1 ELSE 0 END ASC')
            ->orderBy('use_by_at', 'asc')
            ->orderBy('opened_at', 'asc')
            ->first();

        if ($activeVial) {
            $batch->update([
                'open_vial_status'     => 'opened',
                'opened_at'            => $activeVial->opened_at,
                'open_vial_discard_at' => $activeVial->use_by_at,
                'open_vial_doses_used' => (int) $activeVial->administered_portions,
                'doses_per_vial'       => (int) $activeVial->total_portions,
                'open_vial_hours'      => $activeVial->open_vial_hours ?? $batch->open_vial_hours,
                'status'               => $batch->status === 'expired' ? 'expired' : 'active',
            ]);
        } else {
            $nextStatus = $batch->status;
            if ($nextStatus !== 'expired' && $nextStatus !== 'deleted') {
                $nextStatus = ((int) $batch->current_quantity <= 0) ? 'depleted' : 'active';
            }

            $batch->update([
                'open_vial_status'     => 'unopened',
                'opened_at'            => null,
                'open_vial_discard_at' => null,
                'open_vial_doses_used' => 0,
                'status'               => $nextStatus,
            ]);
        }

        return $batch->fresh();
    }

    /**
     * Automated dose administration:
     * - If an active usable physical vial exists, uses a portion from it (0 sealed vials deducted).
     * - If no active vial exists, opens a new physical vial from the earliest expiring FIFO batch (1 sealed vial deducted).
     * Wrapped in DB::transaction with lockForUpdate to guarantee concurrency safety.
     */
    public function administerDoseAutomated(
        int $clinicId,
        int $staffId,
        int $treatmentId,
        string $vaccineType
    ): array {
        return DB::transaction(function () use ($clinicId, $staffId, $treatmentId, $vaccineType) {
            // 1. Check for an active usable open physical vial (not expired, portions remaining)
            $openVial = VaccineVial::where('clinic_id', $clinicId)
                ->where('vaccine_type', $vaccineType)
                ->where('status', VaccineVial::STATUS_OPENED)
                ->whereRaw('(administered_portions + discarded_portions) < total_portions')
                ->where(function ($q) {
                    $q->whereNull('use_by_at')->orWhere('use_by_at', '>', now());
                })
                ->whereHas('inventory', function ($q) {
                    $q->whereNull('deleted_at')
                        ->where('status', '!=', 'expired')
                        ->where(function ($dq) {
                            $dq->whereNull('expiration_date')
                                ->orWhereDate('expiration_date', '>=', now()->toDateString());
                        });
                })
                ->orderByRaw('CASE WHEN use_by_at IS NULL THEN 1 ELSE 0 END ASC')
                ->orderBy('use_by_at', 'asc')
                ->orderBy('opened_at', 'asc')
                ->lockForUpdate()
                ->first();

            if ($openVial) {
                $batch = VaccineInventory::where('inventory_id', $openVial->inventory_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $totalPortions = max(1, (int) $openVial->total_portions);
                $oldUsed       = (int) $openVial->administered_portions;
                $newUsed       = $oldUsed + 1;
                $remaining     = max(0, $totalPortions - $newUsed - (int) $openVial->discarded_portions);
                $isComplete    = ($remaining === 0);

                $openVial->update([
                    'administered_portions' => $newUsed,
                    'status'                => $isComplete ? VaccineVial::STATUS_DEPLETED : VaccineVial::STATUS_OPENED,
                ]);

                $batch = $this->syncBatchOpenVialSummary($batch);

                AuditLog::create([
                    'user_id'     => $staffId,
                    'clinic_id'   => $clinicId,
                    'action'      => 'inventory.open_vial_dose_administered',
                    'model'       => VaccineVial::class,
                    'model_id'    => $openVial->vial_id,
                    'old_values'  => ['administered_portions' => $oldUsed, 'status' => VaccineVial::STATUS_OPENED],
                    'new_values'  => ['administered_portions' => $newUsed, 'status' => $openVial->status],
                    'description' => "Portion {$newUsed}/{$totalPortions} administered from Vial {$openVial->vial_code} (batch {$batch->batch_number})",
                ]);

                return [
                    'batch'          => $batch,
                    'vial'           => $openVial->fresh(),
                    'vial_id'        => $openVial->vial_id,
                    'vial_code'      => $openVial->vial_code,
                    'units_deducted' => 0,
                    'dose_index'     => $newUsed,
                    'total_doses'    => $totalPortions,
                    'is_shared'      => ($newUsed > 1),
                ];
            }

            // 2. No usable open vial available -> Open a fresh physical vial from FIFO stock (deduct 1 sealed vial once)
            $batch = VaccineInventory::where('clinic_id', $clinicId)
                ->where('vaccine_type', $vaccineType)
                ->where('status', 'active')
                ->where('current_quantity', '>=', 1)
                ->where(function ($q) {
                    $q->whereNull('expiration_date')
                        ->orWhereDate('expiration_date', '>=', now()->toDateString());
                })
                ->orderBy('expiration_date', 'asc')
                ->orderBy('created_at', 'asc')
                ->lockForUpdate()
                ->first();

            if (!$batch || $batch->current_quantity < 1) {
                throw ValidationException::withMessages([
                    'inventory' => "Insufficient stock for {$vaccineType}. No active inventory batch available.",
                ]);
            }

            $rules         = $this->resolveProductRules($clinicId, $vaccineType, $batch);
            $totalPortions = $rules['total_portions'];
            $openVialHours = $rules['open_vial_hours'];
            $isMultiDose   = ($totalPortions > 1);

            $oldQuantity = (int) $batch->current_quantity;
            $newQuantity = $oldQuantity - 1;
            $openedAt    = now();
            $useByAt     = $isMultiDose ? (clone $openedAt)->addHours($openVialHours) : null;

            if ($useByAt && $batch->expiration_date) {
                $batchEndOfDay = $batch->expiration_date->copy()->endOfDay();
                if ($batchEndOfDay->lt($useByAt)) {
                    $useByAt = $batchEndOfDay;
                }
            }

            $vial = VaccineVial::create([
                'clinic_id'             => $clinicId,
                'inventory_id'          => $batch->inventory_id,
                'vaccine_type'          => $batch->vaccine_type,
                'batch_number'          => $batch->batch_number,
                'total_portions'        => $totalPortions,
                'administered_portions' => 1,
                'discarded_portions'    => 0,
                'open_vial_hours'       => $isMultiDose ? $openVialHours : null,
                'opened_at'             => $openedAt,
                'use_by_at'             => $useByAt,
                'opened_by'             => $staffId,
                'status'                => $isMultiDose ? VaccineVial::STATUS_OPENED : VaccineVial::STATUS_DEPLETED,
                'stock_deducted'        => true,
            ]);
            $vial->update(['vial_code' => 'V-' . (100 + $vial->vial_id)]);

            $batch->update([
                'current_quantity' => $newQuantity,
                'doses_per_vial'   => $totalPortions,
                'open_vial_hours'  => $openVialHours,
            ]);
            $batch = $this->syncBatchOpenVialSummary($batch);

            InventoryTransaction::create([
                'inventory_id'     => $batch->inventory_id,
                'staff_id'         => $staffId,
                'transaction_type' => 'used',
                'quantity'         => 1,
                'dispensed'        => 1,
                'balanced'         => $newQuantity,
                'reference_id'     => $vial->vial_code,
                'remarks'          => "Vial {$vial->vial_code} opened for treatment #{$treatmentId}",
            ]);

            AuditLog::create([
                'user_id'     => $staffId,
                'clinic_id'   => $clinicId,
                'action'      => 'inventory.vial_opened',
                'model'       => VaccineInventory::class,
                'model_id'    => $batch->inventory_id,
                'old_values'  => ['current_quantity' => $oldQuantity],
                'new_values'  => [
                    'current_quantity' => $newQuantity,
                    'vial_id'          => $vial->vial_id,
                    'vial_code'        => $vial->vial_code,
                    'open_vial_status' => $isMultiDose ? 'opened' : 'unopened',
                ],
                'description' => "Vial {$vial->vial_code} opened for batch {$batch->batch_number} (Treatment ID: {$treatmentId})",
            ]);

            return [
                'batch'          => $batch,
                'vial'           => $vial->fresh(),
                'vial_id'        => $vial->vial_id,
                'vial_code'      => $vial->vial_code,
                'units_deducted' => 1,
                'dose_index'     => 1,
                'total_doses'    => $totalPortions,
                'is_shared'      => false,
            ];
        });
    }

    /**
     * Mark a specific physical vial as expired / unavailable.
     * Prevents further patient use WITHOUT recording physical disposal or deducting stock.
     */
    public function markVialExpired(
        int $clinicId,
        Authenticatable $user,
        int $vialId,
        ?string $reason = null
    ): VaccineVial {
        return DB::transaction(function () use ($clinicId, $user, $vialId, $reason) {
            $vial = VaccineVial::where('clinic_id', $clinicId)
                ->lockForUpdate()
                ->findOrFail($vialId);

            if ($vial->status === VaccineVial::STATUS_DISPOSED) {
                throw ValidationException::withMessages([
                    'vial' => 'A disposed vial cannot be marked expired.',
                ]);
            }

            if ($vial->status === VaccineVial::STATUS_DEPLETED || $vial->undisposed_portions <= 0) {
                throw ValidationException::withMessages([
                    'vial' => 'This vial has no remaining unused portions.',
                ]);
            }

            if ($vial->status === VaccineVial::STATUS_EXPIRED) {
                throw ValidationException::withMessages([
                    'vial' => 'This vial is already marked expired / unavailable.',
                ]);
            }

            $oldState = [
                'status'     => $vial->status,
                'expired_at' => $vial->expired_at?->toIso8601String(),
            ];

            $expiredReason = trim((string) $reason) !== ''
                ? trim((string) $reason)
                : 'Marked expired / unavailable for further administration';

            $vial->update([
                'status'         => VaccineVial::STATUS_EXPIRED,
                'expired_at'     => now(),
                'expired_by'     => $user->id,
                'expired_reason' => $expiredReason,
            ]);

            $batch = VaccineInventory::where('inventory_id', $vial->inventory_id)
                ->lockForUpdate()
                ->first();
            if ($batch) {
                $this->syncBatchOpenVialSummary($batch);
            }

            AuditLog::create([
                'user_id'     => $user->id,
                'clinic_id'   => $clinicId,
                'action'      => 'inventory.vial_expired',
                'model'       => VaccineVial::class,
                'model_id'    => $vial->vial_id,
                'old_values'  => $oldState,
                'new_values'  => [
                    'status'         => VaccineVial::STATUS_EXPIRED,
                    'expired_at'     => $vial->expired_at?->toIso8601String(),
                    'expired_reason' => $expiredReason,
                ],
                'description' => "Vial {$vial->vial_code} marked expired / unavailable ({$vial->undisposed_portions} unused portion(s) pending disposal): {$expiredReason}",
            ]);

            return $vial->fresh(['inventory', 'openedBy', 'expiredBy', 'disposedBy', 'wastages.disposedBy']);
        });
    }

    /**
     * Record physical disposal of unused portions on a physical vial.
     * Records wastage separately without deducting another sealed vial from stock.
     */
    public function disposeVial(
        int $clinicId,
        Authenticatable $user,
        int $vialId,
        int $portionsDiscarded,
        string $reason,
        ?string $disposedAt = null
    ): VaccineVial {
        return DB::transaction(function () use ($clinicId, $user, $vialId, $portionsDiscarded, $reason, $disposedAt) {
            $vial = VaccineVial::where('clinic_id', $clinicId)
                ->lockForUpdate()
                ->findOrFail($vialId);

            if ($vial->status === VaccineVial::STATUS_DISPOSED) {
                throw ValidationException::withMessages([
                    'vial' => 'Disposal has already been recorded for this vial.',
                ]);
            }

            $undisposed = max(0, (int) $vial->total_portions - (int) $vial->administered_portions - (int) $vial->discarded_portions);
            if ($undisposed <= 0) {
                throw ValidationException::withMessages([
                    'portions_discarded' => 'No unused portions remain to discard for this vial.',
                ]);
            }

            if ($portionsDiscarded < 1 || $portionsDiscarded > $undisposed) {
                throw ValidationException::withMessages([
                    'portions_discarded' => "Discarded portions must be between 1 and {$undisposed}.",
                ]);
            }

            $batch = VaccineInventory::where('inventory_id', $vial->inventory_id)
                ->lockForUpdate()
                ->firstOrFail();

            $disposedTimestamp = $disposedAt ? Carbon::parse($disposedAt) : now();
            $oldState = [
                'status'             => $vial->status,
                'discarded_portions' => $vial->discarded_portions,
                'disposed_at'        => $vial->disposed_at?->toIso8601String(),
            ];

            VaccineVialWastage::create([
                'clinic_id'          => $clinicId,
                'vial_id'            => $vial->vial_id,
                'inventory_id'       => $vial->inventory_id,
                'vaccine_type'       => $vial->vaccine_type,
                'batch_number'       => $vial->batch_number,
                'portions_discarded' => $portionsDiscarded,
                'reason'             => $reason,
                'disposed_at'        => $disposedTimestamp,
                'disposed_by'        => $user->id,
            ]);

            $vial->update([
                'discarded_portions' => (int) $vial->discarded_portions + $portionsDiscarded,
                'status'             => VaccineVial::STATUS_DISPOSED,
                'disposed_at'        => $disposedTimestamp,
                'disposed_by'        => $user->id,
                'wastage_reason'     => $reason,
            ]);

            $this->syncBatchOpenVialSummary($batch);

            InventoryTransaction::create([
                'inventory_id'     => $batch->inventory_id,
                'staff_id'         => $user->id,
                'transaction_type' => 'disposed',
                'quantity'         => 0,
                'balanced'         => $batch->current_quantity,
                'reference_id'     => $vial->vial_code,
                'remarks'          => "Vial {$vial->vial_code} disposed ({$portionsDiscarded} portion(s)): {$reason}",
            ]);

            AuditLog::create([
                'user_id'     => $user->id,
                'clinic_id'   => $clinicId,
                'action'      => 'inventory.vial_disposed',
                'model'       => VaccineVial::class,
                'model_id'    => $vial->vial_id,
                'old_values'  => $oldState,
                'new_values'  => [
                    'status'             => VaccineVial::STATUS_DISPOSED,
                    'discarded_portions' => $vial->discarded_portions,
                    'disposed_at'        => $disposedTimestamp->toIso8601String(),
                    'wastage_reason'     => $reason,
                ],
                'description' => "Disposed {$portionsDiscarded} unused portion(s) from Vial {$vial->vial_code}: {$reason}",
            ]);

            return $vial->fresh(['inventory', 'openedBy', 'expiredBy', 'disposedBy', 'wastages.disposedBy']);
        });
    }

    /**
     * Preview automated vial allocation for the next dose
     */
    public function getNextAutomatedVialPreview(int $clinicId, string $vaccineType): ?array
    {
        // 1. Check for active usable open vial
        $openVial = VaccineVial::where('clinic_id', $clinicId)
            ->where('vaccine_type', $vaccineType)
            ->where('status', VaccineVial::STATUS_OPENED)
            ->whereRaw('(administered_portions + discarded_portions) < total_portions')
            ->where(function ($q) {
                $q->whereNull('use_by_at')->orWhere('use_by_at', '>', now());
            })
            ->whereHas('inventory', function ($q) {
                $q->whereNull('deleted_at')
                    ->where('status', '!=', 'expired')
                    ->where(function ($dq) {
                        $dq->whereNull('expiration_date')
                            ->orWhereDate('expiration_date', '>=', now()->toDateString());
                    });
            })
            ->with('inventory')
            ->orderByRaw('CASE WHEN use_by_at IS NULL THEN 1 ELSE 0 END ASC')
            ->orderBy('use_by_at', 'asc')
            ->orderBy('opened_at', 'asc')
            ->first();

        if ($openVial && $openVial->inventory) {
            $totalPortions = max(1, (int) $openVial->total_portions);
            $nextDoseIndex = (int) $openVial->administered_portions + 1;

            return [
                'batch'           => $openVial->inventory,
                'vial_id'         => $openVial->vial_id,
                'vial_code'       => $openVial->vial_code,
                'is_open_vial'    => true,
                'next_dose_index' => $nextDoseIndex,
                'total_doses'     => $totalPortions,
                'units_to_deduct' => 0,
                'discard_at'      => $openVial->use_by_at,
            ];
        }

        // 2. Earliest non-expired FIFO batch for a new vial
        $batch = VaccineInventory::where('clinic_id', $clinicId)
            ->where('vaccine_type', $vaccineType)
            ->where('status', 'active')
            ->where('current_quantity', '>=', 1)
            ->where(function ($q) {
                $q->whereNull('expiration_date')
                    ->orWhereDate('expiration_date', '>=', now()->toDateString());
            })
            ->orderBy('expiration_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->first();

        if (!$batch) {
            return null;
        }

        $rules = $this->resolveProductRules($clinicId, $vaccineType, $batch);

        return [
            'batch'           => $batch,
            'vial_id'         => null,
            'vial_code'       => null,
            'is_open_vial'    => false,
            'next_dose_index' => 1,
            'total_doses'     => $rules['total_portions'],
            'units_to_deduct' => 1,
            'discard_at'      => null,
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
                ->whereDate('expiration_date', '>=', now()->toDateString())
                ->where('current_quantity', '>=', $quantity)
                ->orderBy('expiration_date', 'asc')
                ->orderBy('created_at', 'asc')
                ->lockForUpdate()
                ->first();

            if ($forceBatchId) {
                $batch = VaccineInventory::where('clinic_id', $clinicId)
                    ->where('inventory_id', $forceBatchId)
                    ->where('status', 'active')
                    ->whereDate('expiration_date', '>=', now()->toDateString())
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
                'status'           => $newQuantity === 0 ? 'depleted' : 'active',
            ]);

            InventoryTransaction::create([
                'inventory_id'     => $batch->inventory_id,
                'staff_id'         => $staffId,
                'transaction_type' => 'used',
                'quantity'         => $quantity,
                'dispensed'        => $quantity,
                'balanced'         => $newQuantity,
                'reference_id'     => (string) $treatmentId,
                'remarks'          => 'Vaccine administered from treatment nurse flow (Treatment ID: ' . $treatmentId . ')',
            ]);

            AuditLog::create([
                'user_id'     => $staffId,
                'clinic_id'   => $clinicId,
                'action'      => 'inventory.deduct',
                'model'       => VaccineInventory::class,
                'model_id'    => $batch->inventory_id,
                'old_values'  => ['current_quantity' => $oldQuantity],
                'new_values'  => ['current_quantity' => $newQuantity],
                'description' => "Deducted {$quantity} unit(s) from batch {$batch->batch_number} (Treatment ID: {$treatmentId})",
            ]);

            return [
                'batch'              => $batch->fresh(),
                'quantity_used'      => $quantity,
                'remaining_quantity' => $newQuantity,
            ];
        });
    }
}
