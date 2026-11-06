<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clinic\ReorderClinicResourcesRequest;
use App\Http\Requests\Clinic\StoreClinicResourceRequest;
use App\Http\Requests\Clinic\UpdateClinicResourceRequest;
use App\Models\AuditLog;
use App\Models\ClinicResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClinicResourceController extends Controller
{
    /**
     * List all resources for the authenticated admin's clinic.
     */
    public function index(Request $request): JsonResponse
    {
        $clinicId = (int) $request->user()->clinic_id;

        $resources = ClinicResource::query()
            ->where('clinic_id', $clinicId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $resources,
        ]);
    }

    /**
     * Create a new clinic resource and log in audit_logs.
     */
    public function store(StoreClinicResourceRequest $request): JsonResponse
    {
        $clinicId = (int) $request->user()->clinic_id;
        $validated = $request->validated();

        if (!array_key_exists('sort_order', $validated) || $validated['sort_order'] === null) {
            $maxOrder = ClinicResource::query()
                ->where('clinic_id', $clinicId)
                ->max('sort_order');
            $validated['sort_order'] = $maxOrder !== null ? ((int) $maxOrder + 1) : 0;
        }

        if (!array_key_exists('is_active', $validated) || $validated['is_active'] === null) {
            $validated['is_active'] = true;
        }

        $resource = ClinicResource::create([
            ...$validated,
            'clinic_id' => $clinicId,
        ]);

        AuditLog::logCreated('ClinicResource', $resource->id, $resource->toArray());

        return response()->json([
            'message' => 'Resource created successfully.',
            'data' => $resource,
        ], 201);
    }

    /**
     * Update an existing clinic resource and log in audit_logs.
     */
    public function update(UpdateClinicResourceRequest $request, int $id): JsonResponse
    {
        $clinicId = (int) $request->user()->clinic_id;

        $resource = ClinicResource::query()
            ->where('clinic_id', $clinicId)
            ->findOrFail($id);

        $oldValues = $resource->toArray();
        $resource->update($request->validated());
        $fresh = $resource->fresh();

        AuditLog::logUpdated('ClinicResource', $resource->id, $oldValues, $fresh->toArray());

        return response()->json([
            'message' => 'Resource updated successfully.',
            'data' => $fresh,
        ]);
    }

    /**
     * Delete a clinic resource and log in audit_logs.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $clinicId = (int) $request->user()->clinic_id;

        $resource = ClinicResource::query()
            ->where('clinic_id', $clinicId)
            ->findOrFail($id);

        $oldValues = $resource->toArray();
        $resourceId = $resource->id;
        $resource->delete();

        AuditLog::logDeleted('ClinicResource', $resourceId, $oldValues);

        return response()->json([
            'message' => 'Resource deleted successfully.',
        ]);
    }

    /**
     * Reorder clinic resources.
     */
    public function reorder(ReorderClinicResourcesRequest $request): JsonResponse
    {
        $clinicId = (int) $request->user()->clinic_id;
        $validated = $request->validated();

        DB::transaction(function () use ($clinicId, $validated) {
            if (!empty($validated['items'])) {
                foreach ($validated['items'] as $item) {
                    $resource = ClinicResource::query()
                        ->where('clinic_id', $clinicId)
                        ->find($item['id']);

                    if ($resource && (int) $resource->sort_order !== (int) $item['sort_order']) {
                        $oldValues = $resource->toArray();
                        $resource->update(['sort_order' => (int) $item['sort_order']]);
                        AuditLog::logUpdated('ClinicResource', $resource->id, $oldValues, $resource->fresh()->toArray());
                    }
                }
            } elseif (!empty($validated['ordered_ids'])) {
                foreach (array_values($validated['ordered_ids']) as $index => $resourceId) {
                    $resource = ClinicResource::query()
                        ->where('clinic_id', $clinicId)
                        ->find($resourceId);

                    if ($resource && (int) $resource->sort_order !== $index) {
                        $oldValues = $resource->toArray();
                        $resource->update(['sort_order' => $index]);
                        AuditLog::logUpdated('ClinicResource', $resource->id, $oldValues, $resource->fresh()->toArray());
                    }
                }
            }
        });

        $resources = ClinicResource::query()
            ->where('clinic_id', $clinicId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'message' => 'Resources reordered successfully.',
            'data' => $resources,
        ]);
    }
}
