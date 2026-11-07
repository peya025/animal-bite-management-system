<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\ClinicResource;
use App\Models\PatientAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileClinicResourceController extends Controller
{
    /**
     * List active clinic resources for the patient's clinic ordered by sort_order.
     * GET /api/mobile/clinic-resources
     */
    public function index(Request $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        if (!$clinicId) {
            return response()->json(['data' => []]);
        }

        $resources = ClinicResource::query()
            ->where('clinic_id', $clinicId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get([
                'id',
                'type',
                'title',
                'subtitle',
                'url',
                'thumbnail_url',
                'duration_label',
            ])
            ->filter(function (ClinicResource $resource): bool {
                $url = trim((string) $resource->url);
                if ($url === '' || !str_starts_with(strtolower($url), 'https://')) {
                    return false;
                }
                if (str_contains(strtolower($url), 'replace-with-')) {
                    return false;
                }
                return true;
            })
            ->map(fn (ClinicResource $resource) => [
                'id' => $resource->id,
                'type' => $resource->type,
                'title' => $resource->title,
                'subtitle' => $resource->subtitle,
                'url' => $resource->url,
                'thumbnail_url' => $resource->thumbnail_url,
                'duration_label' => $resource->duration_label,
            ])
            ->values();

        return response()->json([
            'data' => $resources,
        ]);
    }

    private function resolveClinicId(Request $request): ?int
    {
        $user = $request->user('sanctum') ?? $request->user();
        if ($user instanceof PatientAccount) {
            $linkedClinicId = $user->patients()
                ->whereNotNull('patients.clinic_id')
                ->select('patients.clinic_id')
                ->orderByPivot('is_primary', 'desc')
                ->value('patients.clinic_id');

            if ($linkedClinicId) {
                return (int) $linkedClinicId;
            }

            $intakeClinicId = $user->biteIntakes()
                ->whereNotNull('clinic_id')
                ->latest('intake_id')
                ->value('clinic_id');

            if ($intakeClinicId) {
                return (int) $intakeClinicId;
            }
        }

        $queryClinicId = $request->query('clinic_id');
        if ($queryClinicId !== null && $queryClinicId !== '') {
            return (int) $queryClinicId;
        }

        $defaultClinicId = Clinic::query()->orderBy('id')->value('id');

        return $defaultClinicId ? (int) $defaultClinicId : null;
    }
}
