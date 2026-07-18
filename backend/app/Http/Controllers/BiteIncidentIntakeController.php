<?php

namespace App\Http\Controllers;

use App\Models\BiteIncidentIntake;
use Illuminate\Http\Request;

class BiteIncidentIntakeController extends Controller
{
    public function index(Request $request)
    {
        $query = BiteIncidentIntake::where('clinic_id', $request->user()->clinic_id)
            ->with(['patient', 'appointment']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function show(Request $request, BiteIncidentIntake $intake)
    {
        abort_unless($intake->clinic_id === $request->user()->clinic_id, 404);

        return response()->json($intake->load(['patient', 'appointment', 'reviewer', 'biteIncident']));
    }

    public function markReviewed(Request $request, BiteIncidentIntake $intake)
    {
        abort_unless($intake->clinic_id === $request->user()->clinic_id, 404);

        $intake->update([
            'status' => 'reviewed',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json($intake->fresh());
    }
}
