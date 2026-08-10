<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MobileVaccinationCardController extends Controller
{
    public function show(Request $request, int $patient)
    {
        $accountId = $request->user()->id;
        $cacheKey = "mobile:vaccination-card:patient:{$patient}:account:{$accountId}";

        // Cache for 5 minutes
        return response()->json(
            Cache::remember($cacheKey, 300, function () use ($request, $patient) {
                $patient = $request->user()->patients()
                    ->whereKey($patient)
                    ->wherePivot('status', 'verified')
                    ->firstOrFail();

                return [
                    'patient' => $patient,
                    'card_token' => $patient->card_token,
                    'vaccinations' => $patient->treatmentRecords()
                        ->orderBy('scheduled_date')
                        ->get(),
                ];
            })
        );
    }
}
