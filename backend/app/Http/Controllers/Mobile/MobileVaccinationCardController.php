<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MobileVaccinationCardController extends Controller
{
    public function show(Request $request, int $patient)
    {
        $patient = $request->user()->patients()
            ->whereKey($patient)
            ->wherePivot('status', 'verified')
            ->firstOrFail();

        return response()->json([
            'patient' => $patient,
            'card_token' => $patient->card_token,
            'vaccinations' => $patient->treatmentRecords()
                ->orderBy('scheduled_date')
                ->get(),
        ]);
    }
}
