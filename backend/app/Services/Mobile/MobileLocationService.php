<?php

namespace App\Services\Mobile;

use App\Models\Clinic;
use App\Services\PsgcLookupService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MobileLocationService
{
    public function __construct(
        protected PsgcLookupService $psgcLookupService
    ) {}

    /**
     * Resolve target clinic from query parameter or linked patient account
     *
     * @throws ValidationException
     */
    public function resolveClinic(Request $request): Clinic
    {
        $clinicId = $request->query('clinic_id');
        if ($clinicId !== null && $clinicId !== '') {
            return Clinic::query()->findOrFail((int) $clinicId);
        }

        $linkedClinicId = $request->user()
            ?->patients()
            ->select('patients.clinic_id')
            ->value('patients.clinic_id');

        if ($linkedClinicId) {
            return Clinic::query()->findOrFail((int) $linkedClinicId);
        }

        throw ValidationException::withMessages([
            'clinic_id' => ['A clinic context is required before loading address locations.'],
        ]);
    }

    /**
     * Get clinic geographic context including resolved PSGC province code
     *
     * @return array{clinic_id: int, clinic_name: string, province: ?string, province_code: ?string, municipality: ?string}
     */
    public function getClinicContext(Clinic $clinic): array
    {
        $province = $this->resolveClinicProvince($clinic);
        $provinceRecord = $this->psgcLookupService->resolveProvinceByName($province);

        return [
            'clinic_id'     => $clinic->id,
            'clinic_name'   => $clinic->name,
            'province'      => $province,
            'province_code' => $provinceRecord['code'] ?? null,
            'municipality'  => $this->resolveClinicMunicipality($clinic),
        ];
    }

    /**
     * Get municipalities for the clinic's province
     *
     * @return array{clinic_id: int, province: ?string, province_code: ?string, data: array}
     */
    public function getMunicipalitiesForClinic(Clinic $clinic): array
    {
        $province = $this->resolveClinicProvince($clinic);
        $provinceRecord = $this->psgcLookupService->resolveProvinceByName($province);

        return [
            'clinic_id'     => $clinic->id,
            'province'      => $province,
            'province_code' => $provinceRecord['code'] ?? null,
            'data'          => $this->psgcLookupService->getMunicipalitiesForProvinceName($province),
        ];
    }

    /**
     * Get barangays for a given municipality code
     *
     * @return array<int, array{code: string, name: string}>
     */
    public function getBarangaysForMunicipality(string $municipalityCode): array
    {
        return $this->psgcLookupService->getBarangaysForMunicipalityCode($municipalityCode);
    }

    /**
     * Resolve province name from clinic profile or address string
     */
    public function resolveClinicProvince(Clinic $clinic): ?string
    {
        $province = $this->nonEmpty($clinic->province ?? null);
        if ($province) {
            return $province;
        }

        $parts = $this->addressParts($clinic->address);

        return count($parts) >= 2 ? $parts[count($parts) - 1] : null;
    }

    /**
     * Resolve municipality name from clinic profile or address string
     */
    public function resolveClinicMunicipality(Clinic $clinic): ?string
    {
        $municipality = $this->nonEmpty($clinic->municipality ?? null);
        if ($municipality) {
            return $municipality;
        }

        $parts = $this->addressParts($clinic->address);

        return count($parts) >= 2 ? $parts[count($parts) - 2] : null;
    }

    /**
     * Parse comma-delimited address parts
     *
     * @return array<int, string>
     */
    public function addressParts(?string $address): array
    {
        if (! $address) {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', $address)), fn ($part) => $part !== ''));
    }

    /**
     * Normalize empty strings to null
     */
    public function nonEmpty(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
