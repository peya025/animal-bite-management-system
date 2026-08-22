<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Services\PsgcLookupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MobileLocationController extends Controller
{
    public function context(Request $request, PsgcLookupService $psgcLookupService): JsonResponse
    {
        $clinic = $this->resolveClinic($request);
        $province = $this->resolveClinicProvince($clinic);
        $provinceRecord = $psgcLookupService->resolveProvinceByName($province);

        return response()->json([
            'clinic_id' => $clinic->id,
            'clinic_name' => $clinic->name,
            'province' => $province,
            'province_code' => $provinceRecord['code'] ?? null,
            'municipality' => $this->resolveClinicMunicipality($clinic),
        ]);
    }

    public function municipalities(Request $request, PsgcLookupService $psgcLookupService): JsonResponse
    {
        $clinic = $this->resolveClinic($request);
        $province = $this->resolveClinicProvince($clinic);
        $provinceRecord = $psgcLookupService->resolveProvinceByName($province);

        return response()->json([
            'clinic_id' => $clinic->id,
            'province' => $province,
            'province_code' => $provinceRecord['code'] ?? null,
            'data' => $psgcLookupService->getMunicipalitiesForProvinceName($province),
        ]);
    }

    public function barangays(Request $request, PsgcLookupService $psgcLookupService): JsonResponse
    {
        $validated = $request->validate([
            'municipality_code' => ['required', 'string', 'max:20'],
        ]);

        return response()->json([
            'data' => $psgcLookupService->getBarangaysForMunicipalityCode($validated['municipality_code']),
        ]);
    }

    private function resolveClinic(Request $request): Clinic
    {
        $clinicId = $request->query('clinic_id');
        if ($clinicId !== null && $clinicId !== '') {
            return Clinic::query()->findOrFail((int) $clinicId);
        }

        $linkedClinicId = $request->user()
            ->patients()
            ->select('patients.clinic_id')
            ->value('patients.clinic_id');

        if ($linkedClinicId) {
            return Clinic::query()->findOrFail((int) $linkedClinicId);
        }

        throw ValidationException::withMessages([
            'clinic_id' => ['A clinic context is required before loading address locations.'],
        ]);
    }

    private function resolveClinicProvince(Clinic $clinic): ?string
    {
        $province = $this->nonEmpty($clinic->province ?? null);
        if ($province) {
            return $province;
        }

        $parts = $this->addressParts($clinic->address);

        return count($parts) >= 2 ? $parts[count($parts) - 1] : null;
    }

    private function resolveClinicMunicipality(Clinic $clinic): ?string
    {
        $municipality = $this->nonEmpty($clinic->municipality ?? null);
        if ($municipality) {
            return $municipality;
        }

        $parts = $this->addressParts($clinic->address);

        return count($parts) >= 2 ? $parts[count($parts) - 2] : null;
    }

    private function addressParts(?string $address): array
    {
        if (! $address) {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', $address)), fn ($part) => $part !== ''));
    }

    private function nonEmpty(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
