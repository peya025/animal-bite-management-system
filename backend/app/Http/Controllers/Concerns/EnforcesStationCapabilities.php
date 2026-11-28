<?php

namespace App\Http\Controllers\Concerns;

use App\Services\Clinic\StationCapabilityPolicy;
use Illuminate\Http\JsonResponse;

trait EnforcesStationCapabilities
{
    protected function stationPolicy(): StationCapabilityPolicy
    {
        return app(StationCapabilityPolicy::class);
    }

    protected function guardStation(?int $clinicId, string $station, ?string $actionDescription = null): ?JsonResponse
    {
        return $this->stationPolicy()->guardStation($clinicId, $station, $actionDescription);
    }

    /**
     * @param array<int, string> $stations
     */
    protected function guardStations(?int $clinicId, array $stations, ?string $actionDescription = null): ?JsonResponse
    {
        return $this->stationPolicy()->guardStations($clinicId, $stations, $actionDescription);
    }
}
