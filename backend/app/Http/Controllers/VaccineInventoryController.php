<?php

namespace App\Http\Controllers;

use App\Models\VaccineInventory;
use App\Models\InventoryTransaction;
use Illuminate\Http\Request;
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

        if ($request->has('status')) {
            $query->where('status', $request->status);
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

        $inventory->getCollection()->transform(function ($item) use ($fifoMap) {
            $type = $item->vaccine_type;
            $ranks = $fifoMap[$type] ?? [];
            $rankIndex = array_search($item->inventory_id, $ranks);

            $item->is_fifo_priority = ($rankIndex === 0 && $item->status === 'active' && $item->current_quantity > 0);
            $item->fifo_rank = $rankIndex !== false ? ($rankIndex + 1) : null;
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
     * Create a new vaccine inventory entry (admin only)
     */
    public function store(Request $request)
    {
        $request->validate([
            'vaccine_type'    => 'required|string|max:100',
            'batch_number'    => 'required|string|max:100',
            'quantity'        => 'required|integer|min:1',
            'expiration_date' => 'required|date|after:today',
            'remarks'         => 'nullable|string|max:500',
        ]);

        $clinicId = $request->user()->clinic_id;

        $inventory = VaccineInventory::create([
            'clinic_id'        => $clinicId,
            'vaccine_type'     => $request->vaccine_type,
            'batch_number'     => $request->batch_number,
            'current_quantity' => $request->quantity,
            'expiration_date'  => $request->expiration_date,
            'status'           => 'active',
        ]);

        // Record the incoming transaction
        InventoryTransaction::create([
            'inventory_id'     => $inventory->inventory_id,
            'staff_id'         => $request->user()->id,
            'transaction_type' => 'received',
            'quantity'         => $request->quantity,
            'transaction_date' => now(),
            'remarks'          => $request->remarks ?? 'Initial stock received',
        ]);

        return response()->json([
            'message'   => 'Vaccine inventory added successfully',
            'inventory' => $inventory,
        ], 201);
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
        $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $request->validate([
            'vaccine_type'    => 'sometimes|string|max:100',
            'batch_number'    => 'sometimes|string|max:100',
            'expiration_date' => 'sometimes|date',
            'status'          => 'sometimes|in:active,expired,depleted',
        ]);

        $inventory->update($request->only([
            'vaccine_type', 'batch_number', 'expiration_date', 'status',
        ]));

        return response()->json([
            'message'   => 'Inventory updated successfully',
            'inventory' => $inventory->fresh(),
        ]);
    }

    /**
     * Delete an inventory record (admin only)
     */
    public function destroy(Request $request, $id)
    {
        $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $inventory->delete();

        return response()->json(['message' => 'Inventory record deleted']);
    }

    /**
     * Adjust stock quantity (admin only)
     * Handles restocking, adjustments, disposal
     */
    public function adjustStock(Request $request, $id)
    {
        $inventory = VaccineInventory::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $request->validate([
            'transaction_type' => 'required|in:received,adjusted,expired,disposed',
            'quantity'         => 'required|integer|min:1',
            'remarks'          => 'nullable|string|max:500',
        ]);

        $type     = $request->transaction_type;
        $quantity = $request->quantity;

        // Determine new stock level
        if ($type === 'received' || $type === 'adjusted') {
            $newQty = $inventory->current_quantity + $quantity;
        } else {
            // expired / disposed — reduce stock
            $newQty = max(0, $inventory->current_quantity - $quantity);
        }

        $inventory->update([
            'current_quantity' => $newQty,
            'status'           => $newQty === 0 ? 'depleted' : $inventory->status,
        ]);

        InventoryTransaction::create([
            'inventory_id'     => $inventory->inventory_id,
            'staff_id'         => $request->user()->id,
            'transaction_type' => $type,
            'quantity'         => $quantity,
            'transaction_date' => now(),
            'remarks'          => $request->remarks,
        ]);

        return response()->json([
            'message'   => 'Stock adjusted successfully',
            'inventory' => $inventory->fresh(),
        ]);
    }

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
            ->findOrFail($id);

        $transactions = InventoryTransaction::where('inventory_id', $id)
            ->with('staff')
            ->orderByDesc('transaction_date')
            ->get();

        return response()->json([
            'inventory'    => $inventory,
            'transactions' => $transactions,
        ]);
    }
}
