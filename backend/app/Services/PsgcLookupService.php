<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class PsgcLookupService
{
    private const BASE_URL = 'https://psgc.gitlab.io/api';
    private const CACHE_TTL_SECONDS = 86400;

    public function getProvinces(): array
    {
        return Cache::remember('psgc:provinces', self::CACHE_TTL_SECONDS, function () {
            return $this->fetchLocationList(self::BASE_URL . '/provinces/');
        });
    }

    public function resolveProvinceByName(?string $provinceName): ?array
    {
        $normalizedNeedle = $this->normalizeName($provinceName);
        if ($normalizedNeedle === '') {
            return null;
        }

        $provinces = $this->getProvinces();

        foreach ($provinces as $province) {
            if ($this->normalizeName($province['name'] ?? null) === $normalizedNeedle) {
                return $province;
            }
        }

        foreach ($provinces as $province) {
            $normalizedProvince = $this->normalizeName($province['name'] ?? null);
            if (str_contains($normalizedProvince, $normalizedNeedle) || str_contains($normalizedNeedle, $normalizedProvince)) {
                return $province;
            }
        }

        return null;
    }

    public function getMunicipalitiesForProvinceName(?string $provinceName): array
    {
        $province = $this->resolveProvinceByName($provinceName);
        if (! $province || empty($province['code'])) {
            return [];
        }

        $provinceCode = $province['code'];

        return Cache::remember("psgc:province:{$provinceCode}:municipalities", self::CACHE_TTL_SECONDS, function () use ($provinceCode) {
            return $this->fetchLocationList(self::BASE_URL . "/provinces/{$provinceCode}/cities-municipalities/");
        });
    }

    public function getBarangaysForMunicipalityCode(string $municipalityCode): array
    {
        $municipalityCode = trim($municipalityCode);
        if ($municipalityCode === '') {
            return [];
        }

        return Cache::remember("psgc:municipality:{$municipalityCode}:barangays", self::CACHE_TTL_SECONDS, function () use ($municipalityCode) {
            return $this->fetchLocationList(self::BASE_URL . "/cities-municipalities/{$municipalityCode}/barangays/");
        });
    }

    private function fetchLocationList(string $url): array
    {
        $response = Http::timeout(10)
            ->acceptJson()
            ->get($url);

        if (! $response->successful()) {
            return [];
        }

        $payload = $response->json();
        if (! is_array($payload)) {
            return [];
        }

        return collect($payload)
            ->filter(fn ($item) => is_array($item) && ! empty($item['code']) && ! empty($item['name']))
            ->map(fn (array $item) => [
                'code' => (string) $item['code'],
                'name' => (string) $item['name'],
            ])
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    private function normalizeName(?string $value): string
    {
        $value = strtolower(trim((string) $value));
        $value = str_replace(['province of ', 'city of '], '', $value);
        $value = preg_replace('/\s+/', ' ', $value) ?? $value;

        return $value;
    }
}
