<?php

namespace App\Http\Controllers;

use App\Models\VaccineInventory;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use App\Models\VaccineTypePreset;
use App\Models\InventoryTransaction;
use App\Services\VaccineInventoryUsageService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class VaccineInventoryController extends Controller
{
    /**
     * List all vaccine inventory for the clinic (admin only)
     */
    public function index(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $query = VaccineInventory::where('clinic_id', $clinicId)
            ->withCount('transactions');

        if ($request->has('status') && $request->status !== '') {
            if ($request->status === 'archived') {
                $query->onlyTrashed();
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->has('vaccine_type')) {
            $query->where('vaccine_type', 'like', '%' . $request->vaccine_type . '%');
        }

        // Strict FIFO / FEFO: earliest expiration date first, then creation date
        $inventory = $query->orderBy('expiration_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->paginate($request->input('per_page', 50));

        // Calculate FIFO ranks for active stock
        $activeBatches = VaccineInventory::where('clinic_id', $clinicId)
            ->where('status', 'active')
            ->where('current_quantity', '>', 0)
            ->orderBy('expiration_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->get();

        $fifoMap = [];
        foreach ($activeBatches as $batch) {
            $type = $batch->vaccine_type;
            if (!isset($fifoMap[$type])) {
                $fifoMap[$type] = [];
            }
            $fifoMap[$type][] = $batch->inventory_id;
        }

        // Fetch vaccine presets to ensure accurate doses_per_vial (patients per vial)
        $presets = VaccineTypePreset::where(function ($q) use ($clinicId) {
            $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId);
        })->get()->keyBy(function ($p) {
            return strtolower(trim($p->vaccine_name));
        });

        $inventory->getCollection()->transform(function ($item) use ($fifoMap, $presets) {
            $type = $item->vaccine_type;
            $ranks = $fifoMap[$type] ?? [];
            $rankIndex = array_search($item->inventory_id, $ranks);

            $item->is_fifo_priority = ($rankIndex === 0 && $item->status === 'active' && $item->current_quantity > 0);
            $item->fifo_rank = $rankIndex !== false ? ($rankIndex + 1) : null;

            // Resolve doses_per_vial (patients per vial) from preset if configured
            $matchedPreset = $presets->get(strtolower(trim($item->vaccine_type)));
            if ($matchedPreset) {
                $item->doses_per_vial = $matchedPreset->is_multidose 
                    ? max(1, (int) ($matchedPreset->doses_per_vial ?? 1))
                    : 1;
            } else {
                $item->doses_per_vial = max(1, (int) ($item->doses_per_vial ?? 1));
            }
            
            // Add total dispensed (sum of all 'used' transactions)
            $usedQuantity = $item->transactions()
                ->where('transaction_type', 'used')
                ->sum('quantity');
            $dispensedSum = $item->transactions()
                ->sum('dispensed');
            $item->total_dispensed = max((int)$usedQuantity, (int)$dispensedSum);

            // Get most recent 'received from' source
            $lastReceived = $item->transactions()
                ->where('transaction_type', 'received')
                ->orderBy('transaction_date', 'desc')
                ->first();

            $item->received_from = $lastReceived 
                ? ($lastReceived->received_from ?? $lastReceived->remarks ?? 'DOH Central Supply (National Rabies Prevention Program)')
                : 'DOH Central Supply (National Rabies Prevention Program)';

            return $item;
        });

        return response()->json($inventory);
    }

    /**
     * Get active FIFO recommendations per vaccine type
     */
    public function fifoRecommendations(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $activeBatches = VaccineInventory::where('clinic_id', $clinicId)
            ->where('status', 'active')
            ->where('current_quantity', '>', 0)
            ->orderBy('expiration_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->get()
            ->groupBy('vaccine_type')
            ->map(function ($batches) {
                return [
                    'recommended_batch' => $batches->first(),
                    'all_batches_fifo'  => $batches,
                    'total_stock'       => $batches->sum('current_quantity'),
                ];
            });

        return response()->json(['fifo_recommendations' => $activeBatches]);
    }

    /**
     * Get the next FIFO batch for a specific vaccine type
     * This enforces First In, First Out (FIFO) / First Expire, First Out (FEFO)
     */
    public function getNextFifoBatch(Request $request)
    {
        $request->validate([
            'vaccine_type' => 'required|string|max:100',
        ]);

        $clinicId = $request->user()->clinic_id;
        $vaccineType = $request->vaccine_type;

        $usageService = app(\App\Services\VaccineInventoryUsageService::class);
        $preview = $usageService->getNextAutomatedVialPreview($clinicId, $vaccineType);

        if (!$preview) {
            return response()->json([
                'error' => 'No available stock for the selected vaccine type',
                'vaccine_type' => $vaccineType,
            ], 404);
        }

        return response()->json([
            'fifo_batch' => $preview['batch'],
            'is_open_vial' => $preview['is_open_vial'],
            'next_dose_index' => $preview['next_dose_index'],
            'total_doses' => $preview['total_doses'],
            'units_to_deduct' => $preview['units_to_deduct'],
            'discard_at' => $preview['discard_at'],
            'message' => 'FIFO batch and automated vial allocation retrieved successfully',
        ]);
    }

    /**
     * Use vaccine from inventory (FIFO enforced)
     * This method is called when a vaccine dose is administered
     */
    public function useVaccine(Request $request)
    {
        $request->validate([
            'vaccine_type' => 'required|string|max:100',
            'quantity' => 'required|integer|min:1',
            'treatment_id' => 'required|integer',
            'force_batch_id' => 'nullable|integer',
        ]);

        try {
            $usage = app(VaccineInventoryUsageService::class)->deductForTreatment(
                (int) $request->user()->clinic_id,
                (int) $request->user()->id,
                (int) $request->treatment_id,
                (string) $request->vaccine_type,
                (int) $request->quantity,
                $request->filled('force_batch_id') ? (int) $request->force_batch_id : null,
            );

            return response()->json([
                'message' => 'Vaccine used successfully (FIFO enforced)',
                'batch_used' => $usage['batch'],
                'quantity_used' => $usage['quantity_used'],
                'remaining_quantity' => $usage['remaining_quantity'],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'error' => $e->validator->errors()->first(),
                'messages' => $e->errors(),
            ], 422);
        }
    }

    /**
     * Validate if a batch is the correct FIFO batch for a vaccine type
     * Used for frontend validation
     */
    public function validateFifoBatch(Request $request)
    {
        $request->validate([
            'vaccine_type' => 'required|string|max:100',
            'batch_id' => 'required|integer',
        ]);

        $clinicId = $request->user()->clinic_id;
        $vaccineType = $request->vaccine_type;
        $batchId = $request->batch_id;

        // Get the FIFO batch
        $fifoBatch = VaccineInventory::where('clinic_id', $clinicId)
            ->where('vaccine_type', $vaccineType)
            ->where('status', 'active')
            ->where('current_quantity', '>', 0)
            ->orderBy('expiration_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->first();

        if (!$fifoBatch) {
            return response()->json([
                'is_fifo_compliant' => false,
                'error' => 'No available stock for the selected vaccine type',
            ], 404);
        }

        $isFifoCompliant = ($fifoBatch->inventory_id === $batchId);

        return response()->json([
            'is_fifo_compliant' => $isFifoCompliant,
            'fifo_batch_id' => $fifoBatch->inventory_id,
            'selected_batch_id' => $batchId,
            'message' => $isFifoCompliant 
                ? 'Batch selection is FIFO compliant' 
                : 'Warning: Selected batch is NOT the FIFO priority batch',
        ]);
    }

    /**
     * Get unique vaccine names available in inventory (for form dropdowns).
     * Access: all authenticated staff
     */
    public function vaccineNames(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $names = VaccineInventory::where('clinic_id', $clinicId)
            ->where('status', 'active')
            ->where('current_quantity', '>', 0)
            ->orderBy('vaccine_type')
            ->pluck('vaccine_type')
            ->unique()
            ->values();

        return response()->json(['vaccine_names' => $names]);
    }

    /**
     * Get vaccine type presets (reusable profiles) with live inventory counts
     */
    public function presets(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $presets = VaccineTypePreset::where(function ($q) use ($clinicId) {
            $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId);
        })->orderBy('vaccine_name')->get();

        // Calculate live stock totals and active batch counts per vaccine type
        $presets->transform(function ($preset) use ($clinicId) {
            $batches = VaccineInventory::where('clinic_id', $clinicId)
                ->where('vaccine_type', $preset->vaccine_name)
                ->get();

            $preset->active_batches_count = $batches->where('status', 'active')->where('current_quantity', '>', 0)->count();
            $preset->total_stock = $batches->where('status', 'active')->sum('current_quantity');
            $preset->total_dispensed = $batches->sum(function ($b) {
                return $b->transactions()->where('transaction_type', 'used')->sum('quantity');
            });

            return $preset;
        });

        return response()->json(['presets' => $presets]);
    }

    /**
     * Store a new reusable vaccine type preset profile
     */
    public function storePreset(Request $request)
    {
        $maxHours = config('inventory.open_vial_max_hours', 8);
        $isMultidose = $request->boolean('is_multidose', false);

        $rules = [
            'vaccine_name' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'default_shelf_life_months' => 'nullable|integer|min:1',
            'storage_temperature_notes' => 'nullable|string|max:500',
            'dosing_regimen_notes' => 'nullable|string|max:1000',
            'administration_route' => 'nullable|string|max:150',
            'is_multidose' => 'nullable|boolean',
            'regimen_units_per_patient' => 'nullable|numeric|min:0.1|max:999.99',
        ];

        if ($isMultidose) {
            $rules['default_open_vial_hours'] = 'required|integer|min:1|max:' . $maxHours;
            $rules['doses_per_vial'] = 'required|integer|min:1|max:100';
        } else {
            $rules['default_open_vial_hours'] = 'nullable|integer';
            $rules['doses_per_vial'] = 'nullable|integer';
        }

        $request->validate($rules);

        $clinicId = $request->user()->clinic_id;

        $preset = VaccineTypePreset::updateOrCreate(
            [
                'clinic_id' => $clinicId,
                'vaccine_name' => $request->vaccine_name,
            ],
            [
                'category' => $request->category ?? 'Anti-Rabies Vaccines (ARV)',
                'default_shelf_life_months' => $request->input('default_shelf_life_months', 24),
                'default_open_vial_hours' => $isMultidose ? (int) $request->input('default_open_vial_hours', 6) : null,
                'storage_temperature_notes' => $request->storage_temperature_notes,
                'dosing_regimen_notes' => $request->dosing_regimen_notes,
                'administration_route' => $request->input('administration_route', 'Intradermal (ID) / Intramuscular (IM)'),
                'is_multidose' => $isMultidose,
                'doses_per_vial' => $isMultidose ? max(1, (int) $request->input('doses_per_vial', 1)) : 1,
                'regimen_units_per_patient' => $request->input('regimen_units_per_patient', 1),
            ]
        );

        // Keep inventory batches in sync for this clinic and vaccine name
        VaccineInventory::where('clinic_id', $clinicId)
            ->where('vaccine_type', $preset->vaccine_name)
            ->update([
                'doses_per_vial' => $preset->is_multidose ? max(1, (int) $preset->doses_per_vial) : 1,
                'open_vial_hours' => $preset->is_multidose ? $preset->default_open_vial_hours : null,
            ]);

        return response()->json([
            'message' => 'Vaccine registered successfully',
            'preset' => $preset,
        ], 201);
    }

    /**
     * Update an existing vaccine type preset profile
     */
    public function updatePreset(Request $request, $id)
    {
        $clinicId = $request->user()->clinic_id;
        $preset = VaccineTypePreset::where(function ($q) use ($clinicId) {
            $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId);
        })->findOrFail($id);

        $maxHours = config('inventory.open_vial_max_hours', 8);
        $isMultidose = $request->boolean('is_multidose', false);

        $rules = [
            'vaccine_name' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'default_shelf_life_months' => 'nullable|integer|min:1',
            'storage_temperature_notes' => 'nullable|string|max:500',
            'dosing_regimen_notes' => 'nullable|string|max:1000',
            'administration_route' => 'nullable|string|max:150',
            'is_multidose' => 'nullable|boolean',
            'regimen_units_per_patient' => 'nullable|numeric|min:0.1|max:999.99',
        ];

        if ($isMultidose) {
            $rules['default_open_vial_hours'] = 'required|integer|min:1|max:' . $maxHours;
            $rules['doses_per_vial'] = 'required|integer|min:1|max:100';
        } else {
            $rules['default_open_vial_hours'] = 'nullable|integer';
            $rules['doses_per_vial'] = 'nullable|integer';
        }

        $request->validate($rules);

        $data = $request->only([
            'vaccine_name',
            'category',
            'default_shelf_life_months',
            'storage_temperature_notes',
            'dosing_regimen_notes',
            'administration_route',
            'is_multidose',
            'regimen_units_per_patient',
        ]);

        if (!isset($data['default_shelf_life_months'])) {
            $data['default_shelf_life_months'] = $preset->default_shelf_life_months ?? 24;
        }

        if ($isMultidose) {
            $data['is_multidose'] = true;
            $data['doses_per_vial'] = max(1, (int) $request->input('doses_per_vial', 1));
            $data['default_open_vial_hours'] = (int) $request->input('default_open_vial_hours', 6);
        } else {
            $data['is_multidose'] = false;
            $data['doses_per_vial'] = 1;
            $data['default_open_vial_hours'] = null;
        }

        $preset->update($data);

        // Keep inventory batches in sync for this clinic and vaccine name
        VaccineInventory::where('clinic_id', $clinicId)
            ->where('vaccine_type', $preset->vaccine_name)
            ->update([
                'doses_per_vial' => $preset->is_multidose ? max(1, (int) $preset->doses_per_vial) : 1,
                'open_vial_hours' => $preset->is_multidose ? $preset->default_open_vial_hours : null,
            ]);

        return response()->json([
            'message' => 'Vaccine updated successfully',
            'preset' => $preset->fresh(),
        ]);
    }

    /**
     * Delete a vaccine type preset profile
     */
    public function deletePreset(Request $request, $id)
    {
        $clinicId = $request->user()->clinic_id;
        $preset = VaccineTypePreset::where(function ($q) use ($clinicId) {
            $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId);
        })->findOrFail($id);

        // Check if active stock batches exist for this profile
        $activeBatchCount = VaccineInventory::where('clinic_id', $clinicId)
            ->where('vaccine_type', $preset->vaccine_name)
            ->where('status', 'active')
            ->where('current_quantity', '>', 0)
            ->count();

        if ($activeBatchCount > 0) {
            return response()->json([
                'message' => "Cannot delete '{$preset->vaccine_name}' because {$activeBatchCount} active stock batch(es) currently exist in your inventory.",
            ], 422);
        }

        $preset->delete();

        return response()->json([
            'message' => 'Vaccine profile removed from catalog.',
        ]);
    }

    /**
     * Mark a vial in a batch as opened (starts vial discard countdown)
     */
    public function openVial(Request $request, $id)
    {
        $maxHours = config('inventory.open_vial_max_hours', 8);

        if ($request->has('open_vial_hours') && (int) $request->input('open_vial_hours') > $maxHours) {
            return response()->json([
                'message' => "Open-vial hours cannot exceed {$maxHours} hours per clinical safety policy.",
            ], 422);
        }

        return DB::transaction(function () use ($request, $id, $maxHours) {
            $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
                ->lockForUpdate()
                ->findOrFail($id);

            $hours = $inventory->open_vial_hours ?: ($request->input('open_vial_hours') ?: 6);
            $hours = min((int) $hours, $maxHours);

            $openedAt = Carbon::now();
            $discardAt = (clone $openedAt)->addHours($hours);

            $inventory->update([
                'opened_at' => $openedAt,
                'open_vial_discard_at' => $discardAt,
                'open_vial_status' => 'opened',
            ]);

            // Log transaction note
            InventoryTransaction::create([
                'inventory_id' => $inventory->inventory_id,
                'staff_id' => $request->user()->id,
                'transaction_type' => 'adjusted',
                'quantity' => 0,
                'remarks' => "Vial marked OPENED by {$request->user()->name}. Discard countdown ({$hours}h) active until {$discardAt->format('M d, Y h:i A')}.",
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'clinic_id' => $request->user()->clinic_id,
                'action' => 'inventory.open_vial',
                'model' => VaccineInventory::class,
                'model_id' => $inventory->inventory_id,
                'old_values' => ['open_vial_status' => 'unopened'],
                'new_values' => ['open_vial_status' => 'opened', 'open_vial_discard_at' => $discardAt->toIso8601String()],
                'description' => "Vial opened manually for batch {$inventory->batch_number}",
            ]);

            return response()->json([
                'message' => "Vial opened successfully. Discard by {$discardAt->format('g:i A')}.",
                'inventory' => $inventory->fresh(),
            ]);
        });
    }

    /**
     * Discard / Close an opened vial
     */
    public function discardVial(Request $request, $id)
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:5|max:500',
        ]);

        return DB::transaction(function () use ($request, $id, $validated) {
            $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
                ->lockForUpdate()
                ->findOrFail($id);

            if ($inventory->open_vial_status !== 'opened') {
                throw ValidationException::withMessages([
                    'inventory' => 'Only an opened vial can be discarded.',
                ]);
            }

            $oldValues = [
                'open_vial_status' => $inventory->open_vial_status,
                'opened_at' => $inventory->opened_at?->toIso8601String(),
                'open_vial_discard_at' => $inventory->open_vial_discard_at?->toIso8601String(),
            ];

            $inventory->update([
                'open_vial_status' => 'unopened',
                'opened_at' => null,
                'open_vial_discard_at' => null,
            ]);

            InventoryTransaction::create([
                'inventory_id' => $inventory->inventory_id,
                'staff_id' => $request->user()->id,
                'transaction_type' => 'disposed',
                'quantity' => 0,
                'balanced' => $inventory->current_quantity,
                'remarks' => "Open vial discarded by {$request->user()->name}: {$validated['reason']}",
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'clinic_id' => $request->user()->clinic_id,
                'action' => 'inventory.discard_vial',
                'model' => VaccineInventory::class,
                'model_id' => $inventory->inventory_id,
                'old_values' => $oldValues,
                'new_values' => [
                    'open_vial_status' => 'unopened',
                    'opened_at' => null,
                    'open_vial_discard_at' => null,
                    'current_quantity' => $inventory->current_quantity,
                ],
                'description' => "Open vial discarded for batch {$inventory->batch_number}: {$validated['reason']}",
            ]);

            return response()->json([
                'message' => 'Open vial discard record updated.',
                'inventory' => $inventory->fresh(),
            ]);
        });
    }

    /**
     * Create a new vaccine inventory entry (admin only)
     */
    public function store(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $maxHours = config('inventory.open_vial_max_hours', 8);

        $request->validate([
            'vaccine_type'      => 'required|string|max:100',
            'batch_number'      => [
                'required',
                'string',
                'max:100',
                Rule::unique('vaccine_inventory')->where(function ($query) use ($clinicId) {
                    return $query->where('clinic_id', $clinicId);
                }),
            ],
            'quantity'          => 'required|integer|min:1',
            'expiration_date'   => 'required|date|after:today',
            'received_from'     => 'nullable|string|max:500',
            'manufactured_date' => 'nullable|date',
            'shelf_life_months' => 'nullable|integer|min:1',
            'open_vial_hours'   => 'nullable|integer|min:1|max:' . $maxHours,
            'doses_per_vial'    => 'nullable|integer|min:1|max:100',
            'cold_chain_notes'  => 'nullable|string|max:500',
            'remarks'           => 'nullable|string|max:500',
        ], [
            'batch_number.unique' => 'A batch with this batch / lot number already exists in your clinic inventory.',
        ]);

        try {
            return DB::transaction(function () use ($request, $clinicId) {
                $preset = VaccineTypePreset::where(function ($q) use ($clinicId) {
                    $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId);
                })->where('vaccine_name', $request->vaccine_type)->first();

                $dosesPerVial = $request->filled('doses_per_vial')
                    ? (int) $request->doses_per_vial
                    : ($preset && $preset->is_multidose ? max(1, (int) $preset->doses_per_vial) : 1);

                $inventory = VaccineInventory::create([
                    'clinic_id'          => $clinicId,
                    'vaccine_type'       => $request->vaccine_type,
                    'batch_number'       => $request->batch_number,
                    'received_from'      => $request->received_from ?? 'DOH Central Supply (National Rabies Prevention Program)',
                    'manufactured_date'  => $request->manufactured_date,
                    'shelf_life_months'  => $request->shelf_life_months,
                    'open_vial_hours'    => $request->open_vial_hours,
                    'doses_per_vial'     => $dosesPerVial,
                    'cold_chain_notes'   => $request->cold_chain_notes,
                    'current_quantity'   => $request->quantity,
                    'expiration_date'    => $request->expiration_date,
                    'status'             => 'active',
                    'open_vial_status'   => 'unopened',
                ]);

                // Record the incoming transaction
                InventoryTransaction::create([
                    'inventory_id'     => $inventory->inventory_id,
                    'staff_id'         => $request->user()->id,
                    'transaction_type' => 'received',
                    'quantity'         => $request->quantity,
                    'quantity_received'=> $request->quantity,
                    'received_from'    => $request->received_from ?? 'DOH Central Supply (National Rabies Prevention Program)',
                    'balanced'         => $request->quantity,
                    'remarks'          => $request->remarks ?? 'Initial stock received',
                ]);

                AuditLog::create([
                    'user_id' => $request->user()->id,
                    'clinic_id' => $clinicId,
                    'action' => 'inventory.create',
                    'model' => VaccineInventory::class,
                    'model_id' => $inventory->inventory_id,
                    'new_values' => $inventory->toArray(),
                    'description' => "Initial inventory created for batch {$inventory->batch_number}",
                ]);

                return response()->json([
                    'message'   => 'Vaccine inventory added successfully',
                    'inventory' => $inventory,
                ], 201);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            if (($e->errorInfo[1] ?? null) == 1062 || str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), 'uniq_clinic_batch')) {
                throw ValidationException::withMessages([
                    'batch_number' => "A batch with batch number '{$request->batch_number}' already exists in your clinic inventory. Please use a unique batch number.",
                ]);
            }
            throw $e;
        }
    }

    /**
     * Get a single inventory item with its transaction history
     */
    public function show(Request $request, $id)
    {
        $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
            ->with(['transactions.staff'])
            ->findOrFail($id);

        return response()->json($inventory);
    }

    /**
     * Update vaccine inventory (admin only)
     */
    public function update(Request $request, $id)
    {
        $clinicId = $request->user()->clinic_id;
        $maxHours = config('inventory.open_vial_max_hours', 8);

        $request->validate([
            'vaccine_type'      => 'sometimes|string|max:100',
            'batch_number'      => [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('vaccine_inventory')->where(function ($query) use ($clinicId) {
                    return $query->where('clinic_id', $clinicId);
                })->ignore($id, 'inventory_id'),
            ],
            'received_from'     => 'nullable|string|max:500',
            'manufactured_date' => 'nullable|date',
            'shelf_life_months' => 'nullable|integer|min:1',
            'open_vial_hours'   => 'nullable|integer|min:1|max:' . $maxHours,
            'doses_per_vial'    => 'nullable|integer|min:1|max:100',
            'cold_chain_notes'  => 'nullable|string|max:500',
            'expiration_date'   => 'sometimes|date',
            'status'            => 'sometimes|in:active,expired,depleted',
        ], [
            'batch_number.unique' => 'A batch with this batch / lot number already exists in your clinic inventory.',
        ]);

        try {
            return DB::transaction(function () use ($request, $id) {
                $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
                    ->lockForUpdate()
                    ->findOrFail($id);

                $oldValues = $inventory->toArray();

                $inventory->update($request->only([
                    'vaccine_type',
                    'batch_number',
                    'received_from',
                    'manufactured_date',
                    'shelf_life_months',
                    'open_vial_hours',
                    'doses_per_vial',
                    'cold_chain_notes',
                    'expiration_date',
                    'status',
                ]));

                AuditLog::create([
                    'user_id' => $request->user()->id,
                    'clinic_id' => $request->user()->clinic_id,
                    'action' => 'inventory.update',
                    'model' => VaccineInventory::class,
                    'model_id' => $inventory->inventory_id,
                    'old_values' => $oldValues,
                    'new_values' => $inventory->fresh()->toArray(),
                    'description' => "Inventory updated for batch {$inventory->batch_number}",
                ]);

                return response()->json([
                    'message'   => 'Vaccine inventory updated successfully',
                    'inventory' => $inventory->fresh(),
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            if (($e->errorInfo[1] ?? null) == 1062 || str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), 'uniq_clinic_batch')) {
                throw ValidationException::withMessages([
                    'batch_number' => "A batch with batch number '{$request->batch_number}' already exists in your clinic inventory. Please use a unique batch number.",
                ]);
            }
            throw $e;
        }
    }

    /**
     * Delete an inventory record (admin only)
     */
    public function destroy(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|min:5|max:500',
        ]);

        return DB::transaction(function () use ($request, $id) {
            $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
                ->lockForUpdate()
                ->findOrFail($id);

            $oldState = $inventory->toArray();
            $reason = $request->input('reason');

            $inventory->update([
                'archived_reason' => $reason,
                'archived_by' => $request->user()->id,
            ]);

            $inventory->delete();

            AuditLog::create([
                'user_id' => $request->user()->id,
                'clinic_id' => $request->user()->clinic_id,
                'action' => 'inventory.archive',
                'model' => VaccineInventory::class,
                'model_id' => $inventory->inventory_id,
                'old_values' => $oldState,
                'new_values' => ['archived_reason' => $reason, 'deleted_at' => now()->toIso8601String()],
                'description' => "Inventory batch {$inventory->batch_number} archived: {$reason}",
            ]);

            return response()->json(['message' => 'Inventory record archived successfully']);
        });
    }

    /**
     * Adjust stock quantity (admin only)
     * Handles restocking, adjustments, disposal
     */
    public function adjustStock(Request $request, $id)
    {
        $validated = $request->validate([
            'transaction_type' => 'required|in:received,adjusted,expired,disposed',
            'quantity'         => 'required|integer|min:1',
            'remarks'          => 'nullable|string|max:500',
        ]);

        return DB::transaction(function () use ($request, $id, $validated) {
            $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
                ->lockForUpdate()
                ->findOrFail($id);

            $type = $validated['transaction_type'];
            $quantity = (int) $validated['quantity'];
            $oldQty = (int) $inventory->current_quantity;
            $oldStatus = $inventory->status;

            if (in_array($type, ['expired', 'disposed'], true) && $quantity > $oldQty) {
                throw ValidationException::withMessages([
                    'quantity' => 'The requested stock removal exceeds the available quantity.',
                ]);
            }

        // Determine new stock level
        if (in_array($type, ['received', 'adjusted'], true)) {
            $newQty = $oldQty + $quantity;
        } else {
            // expired / disposed — reduce stock
            $newQty = $oldQty - $quantity;
        }

        $newStatus = $newQty === 0
            ? 'depleted'
            : ($oldStatus === 'depleted' ? 'active' : $oldStatus);
        $inventory->update([
            'current_quantity' => $newQty,
            'status'           => $newStatus,
        ]);

        InventoryTransaction::create([
            'inventory_id'     => $inventory->inventory_id,
            'staff_id'         => $request->user()->id,
            'transaction_type' => $type,
            'quantity'         => $quantity,
            'balanced'         => $newQty,
            'remarks'          => $validated['remarks'] ?? null,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'clinic_id' => $request->user()->clinic_id,
            'action' => 'inventory.adjust',
            'model' => VaccineInventory::class,
            'model_id' => $inventory->inventory_id,
            'old_values' => ['current_quantity' => $oldQty, 'status' => $oldStatus],
            'new_values' => ['current_quantity' => $newQty, 'status' => $newStatus, 'transaction_type' => $type],
            'description' => "Stock adjusted for batch {$inventory->batch_number}: {$type} {$quantity}",
        ]);

        return response()->json([
            'message'   => 'Stock adjusted successfully',
            'inventory' => $inventory->fresh(),
        ]);
        });
    }

    /**
    /**
     * Get inventory statistics for the clinic (admin only)
     */
    public function statistics(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $all     = VaccineInventory::where('clinic_id', $clinicId);
        $today   = Carbon::today();
        $soon    = Carbon::today()->addDays(30);

        $stats = [
            'total_batches'       => (clone $all)->count(),
            'active_batches'      => (clone $all)->where('status', 'active')->count(),
            'depleted_batches'    => (clone $all)->where('status', 'depleted')->count(),
            'expired_batches'     => (clone $all)->where('status', 'expired')->count(),
            'total_stock'         => (clone $all)->sum('current_quantity'),
            'expiring_soon'       => (clone $all)->where('expiration_date', '>', $today)
                                        ->where('expiration_date', '<=', $soon)
                                        ->count(),
            'low_stock'           => (clone $all)->where('current_quantity', '>', 0)
                                        ->where('current_quantity', '<=', 10)
                                        ->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Get transaction history for a specific inventory item
     */
    public function transactions(Request $request, $id)
    {
        $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
            ->withTrashed()
            ->findOrFail($id);

        $transactions = InventoryTransaction::where('inventory_id', $id)
            ->with('staff')
            ->orderBy('transaction_date', 'asc')
            ->orderBy('transaction_id', 'asc')
            ->get();

        return response()->json([
            'inventory'    => $inventory,
            'transactions' => $transactions,
        ]);
    }

    /**
     * Public endpoint for landing page to display live vaccine catalog and availability
     */
    public function publicAvailability(Request $request)
    {
        $presets = VaccineTypePreset::orderBy('category')->orderBy('vaccine_name')->get();

        // If presets empty, auto-seed defaults
        if ($presets->isEmpty()) {
            $this->presets($request);
            $presets = VaccineTypePreset::orderBy('category')->orderBy('vaccine_name')->get();
        }

        $activeInventory = VaccineInventory::where('status', 'active')
            ->where('current_quantity', '>', 0)
            ->get();

        $catalog = $presets->map(function ($preset) use ($activeInventory) {
            $matches = $activeInventory->filter(function ($inv) use ($preset) {
                return strcasecmp($inv->vaccine_type, $preset->vaccine_name) === 0;
            });

            $totalVials = $matches->sum('current_quantity');
            $activeBatches = $matches->count();

            $status = 'In Stock';
            $statusColor = 'success';
            if ($totalVials === 0) {
                $status = 'Available on Demand';
                $statusColor = 'info';
            } elseif ($totalVials <= 5) {
                $status = 'Limited Stock';
                $statusColor = 'warning';
            }

            return [
                'id' => $preset->id,
                'vaccine_name' => $preset->vaccine_name,
                'category' => $preset->category ?? 'Anti-Rabies Vaccines (ARV)',
                'administration_route' => $preset->administration_route ?? 'Intradermal / Intramuscular',
                'dosing_regimen_notes' => $preset->dosing_regimen_notes,
                'storage_temperature_notes' => $preset->storage_temperature_notes ?? 'Store at +2°C to +8°C. Monitored Cold-Chain.',
                'shelf_life_months' => $preset->default_shelf_life_months,
                'open_vial_hours' => $preset->default_open_vial_hours,
                'is_multidose' => $preset->is_multidose,
                'availability_status' => $status,
                'status_color' => $statusColor,
                'in_stock' => $totalVials > 0,
            ];
        });

        $byCategory = $catalog->groupBy('category');

        $clinic = \App\Models\Clinic::first();

        return response()->json([
            'facility_name' => $clinic ? $clinic->name : 'Tagoloan Animal Bite Treatment Center',
            'facility_address' => $clinic ? ($clinic->address ?? 'Poblacion, Tagoloan, Misamis Oriental') : 'Poblacion, Tagoloan, Misamis Oriental',
            'operating_schedule' => 'Mondays & Thursdays (8:00 AM – 5:00 PM)',
            'cold_chain_status' => 'Certified (+2°C to +8°C Active)',
            'who_pep_compliant' => true,
            'vaccines' => $catalog,
            'categories' => $byCategory,
        ]);
    }
}
