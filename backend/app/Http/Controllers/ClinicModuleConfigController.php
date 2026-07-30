<?php

namespace App\Http\Controllers;

use App\Models\ClinicModuleConfig;
use Illuminate\Http\Request;

class ClinicModuleConfigController extends Controller
{
    /**
     * Get current clinic's module configuration
     * Access: All authenticated users
     */
    public function show(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        
        $config = ClinicModuleConfig::firstOrCreate(
            ['clinic_id' => $clinicId],
            [
                'triage_module_enabled' => true,
                'field_rules' => [
                    'bite_location' => 'required',
                    'exposure_category' => 'required',
                    'animal_status' => 'optional',
                    'philhealth_info' => 'optional',
                    'fourps_info' => 'optional',
                    'wound_washing' => 'optional',
                ],
            ]
        );
        
        return response()->json($config);
    }

    /**
     * Update clinic module configuration
     * Access: Admin only
     */
    public function update(Request $request)
    {
        // Check if user is admin
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }
        
        $validated = $request->validate([
            'triage_module_enabled' => 'required|boolean',
            'field_rules' => 'required|array',
            'field_rules.bite_location' => 'required|in:required,optional,hidden',
            'field_rules.exposure_category' => 'required|in:required,optional,hidden',
            'field_rules.animal_status' => 'required|in:required,optional,hidden',
            'field_rules.philhealth_info' => 'required|in:required,optional,hidden',
            'field_rules.fourps_info' => 'required|in:required,optional,hidden',
            'field_rules.wound_washing' => 'required|in:required,optional,hidden',
        ]);
        
        $clinicId = $request->user()->clinic_id;
        
        $config = ClinicModuleConfig::updateOrCreate(
            ['clinic_id' => $clinicId],
            $validated
        );
        
        return response()->json([
            'message' => 'Module configuration updated successfully',
            'config' => $config,
        ]);
    }
}
