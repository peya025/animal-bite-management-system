<?php

namespace App\Http\Controllers\Developer;

use App\Http\Controllers\Controller;
use App\Services\AppointmentHealthService;
use Illuminate\Http\Request;

class AppointmentDiagnosticController extends Controller
{
    protected AppointmentHealthService $healthService;

    public function __construct(AppointmentHealthService $healthService)
    {
        $this->healthService = $healthService;
    }

    /**
     * Run full appointment & scheduling diagnostic scan
     * GET /api/developer/diagnostics/appointments
     */
    public function scan(Request $request)
    {
        $user = $request->user();
        $clinicId = $user->clinic_id ?? 1;

        $results = $this->healthService->runFullDiagnostic($clinicId);

        return response()->json($results);
    }

    /**
     * Auto-repair all fixable anomalies
     * POST /api/developer/diagnostics/appointments/repair-all
     */
    public function repairAll(Request $request)
    {
        $user = $request->user();
        $clinicId = $user->clinic_id ?? 1;

        $result = $this->healthService->repairAll($clinicId);

        return response()->json([
            'message' => "Successfully auto-repaired {$result['repaired_count']} out of {$result['total_fixable']} fixable issue(s).",
            'details' => $result,
        ]);
    }

    /**
     * Repair a single anomaly by ID and action
     * POST /api/developer/diagnostics/appointments/repair-single
     */
    public function repairSingle(Request $request)
    {
        $validated = $request->validate([
            'id' => ['required', 'string'],
            'appointment_id' => ['nullable', 'integer'],
            'patient_id' => ['nullable', 'integer'],
            'auto_fix_action' => ['required', 'string'],
            'rule_code' => ['nullable', 'string'],
        ]);

        $success = $this->healthService->repairSingleAnomaly($validated);

        if (!$success) {
            return response()->json([
                'message' => 'Unable to auto-repair this specific issue. Please inspect manual records.',
            ], 422);
        }

        return response()->json([
            'message' => "Issue '{$validated['id']}' repaired successfully.",
        ]);
    }
}
