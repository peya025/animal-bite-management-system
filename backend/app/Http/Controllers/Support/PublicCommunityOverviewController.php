<?php

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\VaccineInventory;
use App\Services\ProphylaxisService;
use App\Services\Reporting\ClinicalRiskAlertService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Public, aggregate-only Community Bite Watch endpoint for the mobile home page.
 *
 * Privacy & safety guarantees:
 * - Zero patient identifiers (no names, ages, addresses, case numbers, or puroks).
 * - Strictly excludes Unknown / Place not recorded locations and provisional exposure dates.
 * - Never exposes raw small counts (<5); only surfaces calm qualitative barangay caution notices
 *   for areas crossing the clinic's 7-day rolling cluster/surge thresholds.
 */
class PublicCommunityOverviewController extends Controller
{
    public function __invoke(Request $request, ClinicalRiskAlertService $alertService): JsonResponse
    {
        $requestedClinicId = $request->query('clinic_id');
        $clinic = $requestedClinicId
            ? Clinic::find((int) $requestedClinicId)
            : Clinic::orderBy('id')->first();

        if (!$clinic) {
            return response()->json([
                'clinic_name' => 'Animal Bite Treatment Center',
                'municipality' => 'Tagoloan',
                'updated_at' => CarbonImmutable::now('Asia/Manila')->toIso8601String(),
                'status' => 'normal',
                'headline' => 'No unusual bite spikes reported this week.',
                'guidance' => 'If bitten or scratched by a dog or cat, wash the wound immediately with soap and running water for 15 minutes and visit the clinic.',
                'elevated_areas' => [],
                'vaccine_availability' => [
                    'arv_available' => false,
                    'rig_available' => false,
                    'status_label' => 'Check with clinic',
                ],
                'disclaimer' => 'Community bite awareness notice based on facility presentations; does not represent confirmed rabies cases.',
            ]);
        }

        $cacheKey = "public:community-bite-overview:clinic:{$clinic->id}";

        $compute = function () use ($clinic, $alertService): array {
            $now = CarbonImmutable::now('Asia/Manila');
            $todayStr = $now->toDateString();

            $surgeData = $alertService->detectBarangaySurges($clinic->id, $now, $clinic);
            $elevatedAreas = collect($surgeData['alerts'] ?? [])
                ->filter(fn (array $a) => ($a['scope'] ?? '') !== 'unknown')
                ->take(5)
                ->map(fn (array $a) => [
                    'barangay' => $a['barangay'],
                    'municipality' => $a['municipality'],
                    'caution_level' => $a['level'] === 'cluster' ? 'elevated' : 'watch',
                    'label' => $a['level'] === 'cluster' ? 'Higher bite reports' : 'Rising bite reports',
                    'notice' => "Higher animal bite reports recorded in Brgy. {$a['barangay']} over the past 7 days. Keep pets leashed and stay cautious around stray animals.",
                ])
                ->values()
                ->all();

            // Live unexpired ARV / RIG availability (boolean + calm status, no raw vial counts)
            $activeBatches = VaccineInventory::where('clinic_id', $clinic->id)
                ->where('status', 'active')
                ->where('current_quantity', '>', 0)
                ->where(function ($q) use ($todayStr) {
                    $q->whereNull('expiration_date')
                        ->orWhereDate('expiration_date', '>=', $todayStr);
                })
                ->get();

            $rigBrands = ProphylaxisService::configuredRigBrands($clinic->id);
            $hasRig = $activeBatches->contains(function (VaccineInventory $batch) use ($rigBrands) {
                $type = (string) $batch->vaccine_type;
                $cat = (string) $batch->vaccine_category;

                return ProphylaxisService::isRigBrand($type, $rigBrands)
                    || (bool) preg_match('/(?:^|[^a-z])(?:RIG|ERIG|HRIG|immunoglobulin)(?:$|[^a-z])/i', $cat);
            });
            $hasArv = $activeBatches->contains(function (VaccineInventory $batch) use ($rigBrands) {
                $type = (string) $batch->vaccine_type;
                $cat = (string) $batch->vaccine_category;
                $isRig = ProphylaxisService::isRigBrand($type, $rigBrands)
                    || (bool) preg_match('/(?:^|[^a-z])(?:RIG|ERIG|HRIG|immunoglobulin)(?:$|[^a-z])/i', $cat);

                return !$isRig;
            });

            $vaccineLabel = match (true) {
                $hasArv && $hasRig => 'Anti-Rabies Vaccine & RIG Available',
                $hasArv => 'Anti-Rabies Vaccine Available',
                $hasRig => 'RIG Available (Verify ARV at Clinic)',
                default => 'Please Contact Clinic for Stock',
            };

            $municipality = $clinic->municipality ?: 'Tagoloan';
            $hasElevated = count($elevatedAreas) > 0;
            $areaNames = array_map(fn (array $a) => 'Brgy. ' . $a['barangay'], $elevatedAreas);

            $headline = $hasElevated
                ? 'Higher bite reports this week in ' . implode(', ', array_slice($areaNames, 0, 3)) . (count($areaNames) > 3 ? ' and nearby areas.' : '.')
                : "No unusual bite spikes reported in {$municipality} this week.";

            $guidance = $hasElevated
                ? 'Keep pets leashed, supervise children outdoors, and avoid stray animals. If bitten or scratched, wash immediately with soap and running water for 15 minutes and book an ABTC visit.'
                : 'Keep pets vaccinated and leashed. If bitten or scratched, wash immediately with soap and running water for 15 minutes and visit the clinic.';

            return [
                'clinic_name' => $clinic->name ?: 'Animal Bite Treatment Center',
                'municipality' => $municipality,
                'updated_at' => $now->toIso8601String(),
                'window_7d_start' => $surgeData['window_7d_start'] ?? $now->subDays(6)->toDateString(),
                'window_7d_end' => $surgeData['window_7d_end'] ?? $todayStr,
                'status' => $hasElevated ? 'caution' : 'normal',
                'headline' => $headline,
                'guidance' => $guidance,
                'elevated_areas' => $elevatedAreas,
                'vaccine_availability' => [
                    'arv_available' => $hasArv,
                    'rig_available' => $hasRig,
                    'status_label' => $vaccineLabel,
                ],
                'disclaimer' => 'Community bite awareness notice based on clinic bite presentations over the last 7 days; does not represent confirmed rabies cases.',
            ];
        };

        $payload = app()->runningUnitTests()
            ? $compute()
            : Cache::remember($cacheKey, now()->addMinutes(15), $compute);

        return response()->json($payload);
    }
}
