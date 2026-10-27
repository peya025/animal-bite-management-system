<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;

use App\Http\Requests\Inventory\AdjustStockRequest;
use App\Http\Requests\Inventory\DestroyInventoryRequest;
use App\Http\Requests\Inventory\DiscardVialRequest;
use App\Http\Requests\Inventory\GetNextFifoBatchRequest;
use App\Http\Requests\Inventory\OpenVialRequest;
use App\Http\Requests\Inventory\StoreInventoryRequest;
use App\Http\Requests\Inventory\StorePresetRequest;
use App\Http\Requests\Inventory\UpdateInventoryRequest;
use App\Http\Requests\Inventory\UpdatePresetRequest;
use App\Http\Requests\Inventory\UseVaccineRequest;
use App\Http\Requests\Inventory\ValidateFifoBatchRequest;
use App\Models\InventoryTransaction;
use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use App\Services\VaccineInventoryService;
use App\Services\VaccineInventoryUsageService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VaccineInventoryController extends Controller
{
    public function __construct(
        private readonly VaccineInventoryService      $inventoryService,
        private readonly VaccineInventoryUsageService $usageService,
    ) {}

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/inventory/prophylaxis-stock
    // ────────────────────────────────────────────────────────────────────────
    public function prophylaxisStock(Request $request): JsonResponse
    {
        $clinicId   = $request->user()->clinic_id;
        $allPresets = VaccineTypePreset::where(fn($q) => $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId))->get();

        $tetanusPresets = [];
        $atsPresets     = [];
        foreach ($allPresets as $preset) {
            $cat   = $preset->category ?? '';
            $vName = $preset->vaccine_name;
            if (preg_match('/(?:^|[^a-z])(?:ATS|serum)(?:$|[^a-z])/i', $cat) || preg_match('/(?:^|[^a-z])(?:ATS|anti[- ]?tetanus)(?:$|[^a-z])/i', $vName)) {
                $atsPresets[] = $vName;
            } elseif (preg_match('/(?:^|[^a-z])(?:Tetanus|Toxoid)(?:$|[^a-z])/i', $cat) || preg_match('/(?:^|[^a-z])(?:TT|Td|Tdap|DTaP|tetan|toxoid|tetavax)(?:$|[^a-z])/i', $vName)) {
                if (!preg_match('/(?:^|[^a-z])(?:ATS|serum)(?:$|[^a-z])/i', $cat) && !preg_match('/(?:^|[^a-z])(?:ATS|serum)(?:$|[^a-z])/i', $vName)) {
                    $tetanusPresets[] = $vName;
                }
            }
        }

        $batches = VaccineInventory::where('clinic_id', $clinicId)->where('status', 'active')->where('current_quantity', '>', 0)
            ->whereDate('expiration_date', '>=', now()->toDateString())
            ->orderBy('expiration_date')->orderBy('created_at')
            ->get(['inventory_id', 'vaccine_type', 'batch_number', 'expiration_date', 'current_quantity']);

        $activeTetanusBrands = [];
        $activeAtsBrands     = [];
        foreach ($batches as $batch) {
            $vType         = $batch->vaccine_type;
            $matchedPreset = $allPresets->first(fn($p) => strcasecmp($p->vaccine_name, $vType) === 0);
            if ($matchedPreset) {
                $cat = $matchedPreset->category ?? '';
                if (preg_match('/(?:^|[^a-z])(?:ATS|serum)(?:$|[^a-z])/i', $cat) || preg_match('/(?:^|[^a-z])(?:ATS|anti[- ]?tetanus)(?:$|[^a-z])/i', $vType)) {
                    $activeAtsBrands[] = $vType;
                } elseif (preg_match('/(?:^|[^a-z])(?:Tetanus|Toxoid)(?:$|[^a-z])/i', $cat) || preg_match('/(?:^|[^a-z])(?:TT|Td|Tdap|DTaP|tetan|toxoid|tetavax)(?:$|[^a-z])/i', $vType)) {
                    $activeTetanusBrands[] = $vType;
                }
            } else {
                if (\App\Services\ProphylaxisService::isAtsBrand($vType, $atsPresets))         $activeAtsBrands[] = $vType;
                elseif (\App\Services\ProphylaxisService::isTetanusBrand($vType, $tetanusPresets)) $activeTetanusBrands[] = $vType;
            }
        }

        $activeTetanusBrands = array_values(array_unique($activeTetanusBrands));
        $activeAtsBrands     = array_values(array_unique($activeAtsBrands));
        $tetanusBrands       = !empty($activeTetanusBrands) ? $activeTetanusBrands : array_values(array_unique(array_filter(array_merge(['TT'], $tetanusPresets))));
        $atsBrands           = !empty($activeAtsBrands)     ? array_values(array_unique(array_filter(array_merge(['ATS'], $activeAtsBrands)))) : array_values(array_unique(array_filter(array_merge(['ATS'], $atsPresets))));

        $stock = ['TT' => [], 'ATS' => [], 'ERIG' => []];
        foreach ($tetanusBrands as $brand) { $stock[$brand] = []; }
        foreach ($atsBrands     as $brand) { $stock[$brand] = []; }

        foreach ($batches as $batch) {
            $name = $batch->vaccine_type;
            if (in_array($name, $activeAtsBrands, true) || \App\Services\ProphylaxisService::isAtsBrand($name, $atsBrands)) {
                $stock['ATS'][] = $batch;
                $stock[$name][] = $batch;
            } elseif (in_array($name, $activeTetanusBrands, true) || \App\Services\ProphylaxisService::isTetanusBrand($name, $tetanusBrands)) {
                $stock['TT'][]  = $batch;
                $stock[$name][] = $batch;
            } elseif (preg_match('/(?:^|[^a-z])ERIG(?:$|[^a-z])|equine rabies immunoglobulin/i', $name)) {
                $stock['ERIG'][] = $batch;
                $stock[$name][]  = $batch;
            }
        }

        return response()->json(['stock' => $stock, 'tetanus_brands' => $tetanusBrands, 'ats_brands' => $atsBrands]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/inventory
    // ────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $query    = VaccineInventory::where('clinic_id', $clinicId)->withCount('transactions');

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

        $inventory = $query->orderBy('expiration_date', 'asc')->orderBy('created_at', 'asc')
            ->paginate($request->input('per_page', 50));

        // FIFO rank map
        $activeBatches = VaccineInventory::where('clinic_id', $clinicId)->where('status', 'active')->where('current_quantity', '>', 0)
            ->orderBy('expiration_date', 'asc')->orderBy('created_at', 'asc')->get();
        $fifoMap = [];
        foreach ($activeBatches as $batch) {
            $fifoMap[$batch->vaccine_type][] = $batch->inventory_id;
        }

        $presets = VaccineTypePreset::where(fn($q) => $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId))
            ->get()->keyBy(fn($p) => strtolower(trim($p->vaccine_name)));

        $inventory->getCollection()->transform(function ($item) use ($fifoMap, $presets) {
            $ranks       = $fifoMap[$item->vaccine_type] ?? [];
            $rankIndex   = array_search($item->inventory_id, $ranks);
            $item->is_fifo_priority = $rankIndex === 0 && $item->status === 'active' && $item->current_quantity > 0;
            $item->fifo_rank        = $rankIndex !== false ? ($rankIndex + 1) : null;

            $matchedPreset = $presets->get(strtolower(trim($item->vaccine_type)));
            if ($matchedPreset) {
                $item->doses_per_vial    = $matchedPreset->is_multidose ? max(1, (int) ($matchedPreset->doses_per_vial ?? 1)) : 1;
                $item->vaccine_category  = $matchedPreset->category;
            } else {
                $item->doses_per_vial   = max(1, (int) ($item->doses_per_vial ?? 1));
                $item->vaccine_category = null;
            }

            $item->total_dispensed = max(
                (int) $item->transactions()->where('transaction_type', 'used')->sum('quantity'),
                (int) $item->transactions()->sum('dispensed'),
            );

            $lastReceived        = $item->transactions()->where('transaction_type', 'received')->orderBy('transaction_date', 'desc')->first();
            $item->received_from = $lastReceived
                ? ($lastReceived->received_from ?? $lastReceived->remarks ?? 'DOH Central Supply (National Rabies Prevention Program)')
                : 'DOH Central Supply (National Rabies Prevention Program)';

            return $item;
        });

        return response()->json($inventory);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/inventory/fifo-recommendations
    // ────────────────────────────────────────────────────────────────────────
    public function fifoRecommendations(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;

        $activeBatches = VaccineInventory::where('clinic_id', $clinicId)->where('status', 'active')->where('current_quantity', '>', 0)
            ->orderBy('expiration_date', 'asc')->orderBy('created_at', 'asc')->get()
            ->groupBy('vaccine_type')
            ->map(fn($batches) => [
                'recommended_batch' => $batches->first(),
                'all_batches_fifo'  => $batches,
                'total_stock'       => $batches->sum('current_quantity'),
            ]);

        return response()->json(['fifo_recommendations' => $activeBatches]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/inventory/next-fifo-batch
    // ────────────────────────────────────────────────────────────────────────
    public function getNextFifoBatch(GetNextFifoBatchRequest $request): JsonResponse
    {
        $clinicId    = $request->user()->clinic_id;
        $vaccineType = $request->validated('vaccine_type');
        $preview     = $this->usageService->getNextAutomatedVialPreview($clinicId, $vaccineType);

        if (!$preview) {
            return response()->json(['error' => 'No available stock for the selected vaccine type', 'vaccine_type' => $vaccineType], 404);
        }

        return response()->json([
            'fifo_batch'       => $preview['batch'],
            'is_open_vial'     => $preview['is_open_vial'],
            'next_dose_index'  => $preview['next_dose_index'],
            'total_doses'      => $preview['total_doses'],
            'units_to_deduct'  => $preview['units_to_deduct'],
            'discard_at'       => $preview['discard_at'],
            'message'          => 'FIFO batch and automated vial allocation retrieved successfully',
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/inventory/use-vaccine
    // ────────────────────────────────────────────────────────────────────────
    public function useVaccine(UseVaccineRequest $request): JsonResponse
    {
        try {
            $usage = $this->usageService->deductForTreatment(
                (int) $request->user()->clinic_id,
                (int) $request->user()->id,
                (int) $request->validated('treatment_id'),
                (string) $request->validated('vaccine_type'),
                (int) $request->validated('quantity'),
                $request->filled('force_batch_id') ? (int) $request->validated('force_batch_id') : null,
            );

            return response()->json([
                'message'            => 'Vaccine used successfully (FIFO enforced)',
                'batch_used'         => $usage['batch'],
                'quantity_used'      => $usage['quantity_used'],
                'remaining_quantity' => $usage['remaining_quantity'],
            ]);
        } catch (ValidationException $e) {
            return response()->json(['error' => $e->validator->errors()->first(), 'messages' => $e->errors()], 422);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/inventory/validate-fifo
    // ────────────────────────────────────────────────────────────────────────
    public function validateFifoBatch(ValidateFifoBatchRequest $request): JsonResponse
    {
        $clinicId    = $request->user()->clinic_id;
        $vaccineType = $request->validated('vaccine_type');
        $batchId     = (int) $request->validated('batch_id');

        $fifoBatch = VaccineInventory::where('clinic_id', $clinicId)->where('vaccine_type', $vaccineType)
            ->where('status', 'active')->where('current_quantity', '>', 0)
            ->orderBy('expiration_date', 'asc')->orderBy('created_at', 'asc')->first();

        if (!$fifoBatch) {
            return response()->json(['is_fifo_compliant' => false, 'error' => 'No available stock for the selected vaccine type'], 404);
        }

        $isFifoCompliant = $fifoBatch->inventory_id === $batchId;

        return response()->json([
            'is_fifo_compliant' => $isFifoCompliant,
            'fifo_batch_id'     => $fifoBatch->inventory_id,
            'selected_batch_id' => $batchId,
            'message'           => $isFifoCompliant ? 'Batch selection is FIFO compliant' : 'Warning: Selected batch is NOT the FIFO priority batch',
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/inventory/vaccine-names
    // ────────────────────────────────────────────────────────────────────────
    public function vaccineNames(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $presets  = VaccineTypePreset::where(fn($q) => $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId))
            ->get()->keyBy(fn($p) => strtolower(trim($p->vaccine_name)));

        $antiRabiesNames = VaccineInventory::where('clinic_id', $clinicId)->where('status', 'active')->where('current_quantity', '>', 0)
            ->orderBy('vaccine_type')->pluck('vaccine_type')->unique()->values()
            ->filter(function ($type) use ($presets) {
                $name = trim($type);
                if ($name === '') return false;
                $matched = $presets->get(strtolower($name));
                if ($matched && !empty($matched->category)) {
                    $cat = $matched->category;
                    if (preg_match('/tetanus|toxoid|serum|ats|immunoglobulin|rig/i', $cat)) return false;
                    if (preg_match('/rabies|arv/i', $cat)) return true;
                }
                return !preg_match('/(?:^|[^a-z])(?:TT|Td|Tdap|DTaP|ATS|ERIG|HRIG|RIG)(?:$|[^a-z])|tetan|toxoid|tetav|tetax|anti[- ]?tetanus|serum|equine rabies|rabies immunoglobulin|immune globulin/i', $name);
            })->values();

        return response()->json(['vaccine_names' => $antiRabiesNames]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/inventory/presets
    // ────────────────────────────────────────────────────────────────────────
    public function presets(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;

        $presets = VaccineTypePreset::where(fn($q) => $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId))
            ->orderBy('vaccine_name')->get();

        $presets->transform(function ($preset) use ($clinicId) {
            $batches = VaccineInventory::where('clinic_id', $clinicId)->where('vaccine_type', $preset->vaccine_name)->get();
            $preset->active_batches_count = $batches->where('status', 'active')->where('current_quantity', '>', 0)->count();
            $preset->total_stock          = $batches->where('status', 'active')->sum('current_quantity');
            $preset->total_dispensed      = $batches->sum(fn($b) => $b->transactions()->where('transaction_type', 'used')->sum('quantity'));
            return $preset;
        });

        return response()->json(['presets' => $presets]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/inventory/presets
    // ────────────────────────────────────────────────────────────────────────
    public function storePreset(StorePresetRequest $request): JsonResponse
    {
        $preset = $this->inventoryService->upsertPreset(
            $request->user()->clinic_id,
            $request->user(),
            $request->validated(),
        );

        return response()->json(['message' => 'Vaccine registered successfully', 'preset' => $preset], 201);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PUT /api/inventory/presets/{id}
    // ────────────────────────────────────────────────────────────────────────
    public function updatePreset(UpdatePresetRequest $request, int $id): JsonResponse
    {
        $preset = $this->inventoryService->updatePreset(
            $request->user()->clinic_id,
            $id,
            $request->validated(),
        );

        return response()->json(['message' => 'Vaccine updated successfully', 'preset' => $preset]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DELETE /api/inventory/presets/{id}
    // ────────────────────────────────────────────────────────────────────────
    public function deletePreset(Request $request, int $id): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $preset   = VaccineTypePreset::where(fn($q) => $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId))->findOrFail($id);

        $activeBatchCount = VaccineInventory::where('clinic_id', $clinicId)->where('vaccine_type', $preset->vaccine_name)
            ->where('status', 'active')->where('current_quantity', '>', 0)->count();

        if ($activeBatchCount > 0) {
            return response()->json(['message' => "Cannot delete '{$preset->vaccine_name}' because {$activeBatchCount} active stock batch(es) currently exist in your inventory."], 422);
        }

        $preset->delete();

        return response()->json(['message' => 'Vaccine profile removed from catalog.']);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/inventory/{id}/open-vial
    // ────────────────────────────────────────────────────────────────────────
    public function openVial(OpenVialRequest $request, int $id): JsonResponse
    {
        $maxHours = config('inventory.open_vial_max_hours', 8);
        $requested = $request->filled('open_vial_hours') ? (int) $request->validated('open_vial_hours') : null;

        if ($requested !== null && $requested > $maxHours) {
            return response()->json(['message' => "Open-vial hours cannot exceed {$maxHours} hours per clinical safety policy."], 422);
        }

        $inventory = $this->inventoryService->openVial($request->user()->clinic_id, $request->user(), $id, $requested);
        $discardAt = $inventory->open_vial_discard_at;

        return response()->json([
            'message'   => "Vial opened successfully. Discard by {$discardAt->format('g:i A')}.",
            'inventory' => $inventory,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/inventory/{id}/discard-vial
    // ────────────────────────────────────────────────────────────────────────
    public function discardVial(DiscardVialRequest $request, int $id): JsonResponse
    {
        $inventory = $this->inventoryService->discardVial(
            $request->user()->clinic_id,
            $request->user(),
            $id,
            $request->validated('reason'),
        );

        return response()->json(['message' => 'Open vial discard record updated.', 'inventory' => $inventory]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/inventory
    // ────────────────────────────────────────────────────────────────────────
    public function store(StoreInventoryRequest $request): JsonResponse
    {
        $inventory = $this->inventoryService->createBatch(
            $request->user()->clinic_id,
            $request->user(),
            $request->validated(),
        );

        return response()->json(['message' => 'Vaccine inventory added successfully', 'inventory' => $inventory], 201);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/inventory/{id}
    // ────────────────────────────────────────────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
            ->with(['transactions.staff', 'vaccinePreset'])->findOrFail($id);

        return response()->json($inventory);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PUT /api/inventory/{id}
    // ────────────────────────────────────────────────────────────────────────
    public function update(UpdateInventoryRequest $request, int $id): JsonResponse
    {
        $inventory = $this->inventoryService->updateBatch(
            $request->user()->clinic_id,
            $request->user(),
            $id,
            $request->validated(),
        );

        return response()->json(['message' => 'Vaccine inventory updated successfully', 'inventory' => $inventory]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DELETE /api/inventory/{id}
    // ────────────────────────────────────────────────────────────────────────
    public function destroy(DestroyInventoryRequest $request, int $id): JsonResponse
    {
        $this->inventoryService->archiveBatch(
            $request->user()->clinic_id,
            $request->user(),
            $id,
            $request->validated('reason'),
        );

        return response()->json(['message' => 'Inventory record archived successfully']);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/inventory/{id}/adjust
    // ────────────────────────────────────────────────────────────────────────
    public function adjustStock(AdjustStockRequest $request, int $id): JsonResponse
    {
        $inventory = $this->inventoryService->adjustStock(
            $request->user()->clinic_id,
            $request->user(),
            $id,
            $request->validated('transaction_type'),
            (int) $request->validated('quantity'),
            $request->validated('remarks'),
        );

        return response()->json(['message' => 'Stock adjusted successfully', 'inventory' => $inventory]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/inventory/statistics
    // ────────────────────────────────────────────────────────────────────────
    public function statistics(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $all      = VaccineInventory::where('clinic_id', $clinicId);
        $today    = Carbon::today();
        $soon     = Carbon::today()->addDays(30);

        return response()->json([
            'total_batches'    => (clone $all)->count(),
            'active_batches'   => (clone $all)->where('status', 'active')->count(),
            'depleted_batches' => (clone $all)->where('status', 'depleted')->count(),
            'expired_batches'  => (clone $all)->where('status', 'expired')->count(),
            'total_stock'      => (clone $all)->sum('current_quantity'),
            'expiring_soon'    => (clone $all)->where('expiration_date', '>', $today)->where('expiration_date', '<=', $soon)->count(),
            'low_stock'        => (clone $all)->where('current_quantity', '>', 0)->where('current_quantity', '<=', 10)->count(),
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/inventory/{id}/transactions
    // ────────────────────────────────────────────────────────────────────────
    public function transactions(Request $request, int $id): JsonResponse
    {
        $inventory    = VaccineInventory::where('clinic_id', $request->user()->clinic_id)->withTrashed()->findOrFail($id);
        $transactions = InventoryTransaction::where('inventory_id', $id)->with('staff')
            ->orderBy('transaction_date', 'asc')->orderBy('transaction_id', 'asc')->get();

        return response()->json(['inventory' => $inventory, 'transactions' => $transactions]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/public/vaccine-availability  (unauthenticated)
    // ────────────────────────────────────────────────────────────────────────
    public function publicAvailability(Request $request): JsonResponse
    {
        // The public page represents the same facility named in this response.
        $clinic = \App\Models\Clinic::orderBy('id')->first();
        $inventory = $clinic
            ? VaccineInventory::where('clinic_id', $clinic->id)->get()
            : collect();
        $presets = VaccineTypePreset::where(function ($query) use ($clinic) {
            $query->whereNull('clinic_id');
            if ($clinic) {
                $query->orWhere('clinic_id', $clinic->id);
            }
        })->orderBy('clinic_id')->get()
            ->keyBy(fn ($preset) => strtolower(trim($preset->vaccine_name)));

        $catalog = $inventory->groupBy(fn ($batch) => strtolower(trim($batch->vaccine_type)))
            ->map(function ($batches, $name) use ($presets) {
                $preset = $presets->get($name);
                $available = $batches->filter(fn ($batch) => $batch->status === 'active'
                    && $batch->current_quantity > 0
                    && $batch->expiration_date
                    && $batch->expiration_date->toDateString() >= now()->toDateString());
                $totalVials = (int) $available->sum('current_quantity');
                $status = $totalVials === 0 ? 'Out of Stock' : ($totalVials <= 10 ? 'Limited Stock' : 'In Stock');

                return [
                    'id' => $name,
                    'vaccine_name' => $preset?->vaccine_name ?? trim($batches->first()->vaccine_type),
                    'category' => $preset?->category ?? 'Other Biologicals',
                    'administration_route' => $preset?->administration_route,
                    'storage_temperature_notes' => $preset?->storage_temperature_notes,
                    'availability_status' => $status,
                    'status_color' => $totalVials === 0 ? 'error' : ($totalVials <= 10 ? 'warning' : 'success'),
                    'in_stock' => $totalVials > 0,
                    'available_vials' => $totalVials,
                    'active_batches' => $available->count(),
                ];
            })->sortBy('vaccine_name')->values();

        return response()->json([
            'facility_name' => $clinic?->name ?? 'Tagoloan Animal Bite Treatment Center',
            'facility_address' => $clinic?->address,
            'updated_at' => now()->toIso8601String(),
            'vaccines' => $catalog,
            'categories' => $catalog->groupBy('category'),
        ])->header('Cache-Control', 'no-store');
    }
}
