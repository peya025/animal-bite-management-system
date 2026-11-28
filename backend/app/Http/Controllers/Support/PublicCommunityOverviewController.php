<?php

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\VaccineInventory;
use App\Services\ProphylaxisService;
use App\Services\CommunityAwareness\PublishedAdvisoryFeed;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/** Public education and approved advisories only. Never queries incident trends. */
class PublicCommunityOverviewController extends Controller
{
    public function __invoke(Request $request, PublishedAdvisoryFeed $feed)
    {
        // Old clients render a hardcoded Normal badge; hide their obsolete card.
        if ($request->header('X-Community-Awareness-Version') !== '2') {
            return response()->noContent()->header('Cache-Control', 'no-store');
        }
        $data = $request->validate(['clinic_id' => 'nullable|integer|min:1|exists:clinics,id']);
        $clinic = isset($data['clinic_id']) ? Clinic::find($data['clinic_id']) : null;
        // Never silently select one clinic in a multi-clinic installation.
        if (!$clinic && Clinic::count() === 1) {
            $clinic = Clinic::first();
        }
        if (!$clinic) {
            return response()->json(['message' => 'Select a clinic to view community updates.'], 503)
                ->header('Cache-Control', 'no-store');
        }
        $now = CarbonImmutable::now('Asia/Manila');
        $todayStr = $now->toDateString();
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


        return response()->json([
            'clinic_name' => $clinic->name,
            'municipality' => $clinic->municipality ?? '',
            'updated_at' => $now->toIso8601String(),
            'status' => 'information',
            'headline' => 'Community Bite Awareness',
            'guidance' => 'Contact the clinic for bite-prevention information and assessment. Do not wait for a community advisory to seek care.',
            'elevated_areas' => [],
            'advisories' => $feed->forClinic($clinic->id),
            'vaccine_availability' => [
                'arv_available' => $hasArv, 'rig_available' => $hasRig, 'status_label' => $vaccineLabel,
            ],
            'disclaimer' => 'Animal bite reports do not by themselves confirm rabies infection. The absence of an advisory does not mean an area is free of risk.',
        ])->header('Cache-Control', 'no-store');
    }
}
