<?php

namespace App\Services\Surveillance;

use App\Models\BarangayCoordinate;
use App\Models\Clinic;

class ExposureGeographyResolver
{
    public function catalog(): array
    {
        // Reuse the local controlled catalog; never geocode health records remotely.
        return BarangayCoordinate::whereIn('source', ['manual', 'psgc'])
            ->get(['barangay', 'municipality', 'province'])->toArray();
    }

    public function resolve(string $place, Clinic $clinic, array $catalog): ?array
    {
        $parts = array_map(fn ($part) => $this->normalize($part), explode(',', $place));
        // Exact barangay + municipality (+ province); address fragments and bare
        // barangay names are ambiguous and go to the data-quality queue.
        if (!in_array(count($parts), [2, 3], true) || in_array('', $parts, true)) {
            return null;
        }
        [$barangay, $municipality] = $parts;
        $province = $parts[2] ?? null;
        if ($province === null) {
            if ($municipality !== $this->normalize((string) $clinic->municipality)) {
                return null;
            }
            $province = $this->normalize((string) $clinic->province);
        }
        $matches = array_values(array_filter($catalog, fn ($row) =>
            $this->normalize($row['barangay']) === $barangay
            && $this->normalize($row['municipality']) === $municipality
            && $this->normalize($row['province']) === $province));
        if (count($matches) !== 1) {
            return null;
        }
        return $matches[0] + ['key' => hash('sha256', json_encode([$province, $municipality, $barangay], JSON_THROW_ON_ERROR))];
    }

    private function normalize(string $value): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/', ' ', preg_replace('/^\s*(?:brgy\.?|barangay)\s+/i', '', $value))));
    }
}
