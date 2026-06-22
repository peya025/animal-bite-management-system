<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClinicSetupController extends Controller
{
    /**
     * Check setup status
     */
    public function checkSetup(Request $request)
    {
        $clinic = $request->user()->clinic;

        return response()->json([
            'is_setup_complete' => $clinic->is_setup_complete,
            'clinic' => $clinic->is_setup_complete ? $clinic : null,
        ]);
    }

    /**
     * Get clinic profile
     */
    public function getProfile(Request $request)
    {
        $clinic = $request->user()->clinic;

        if (!$clinic) {
            return response()->json([
                'message' => 'No clinic found for this user',
            ], 404);
        }

        return response()->json($clinic);
    }

    /**
     * Update clinic information
     */
    public function updateClinic(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'license_number' => 'nullable|string|max:255',
            'opening_hours' => 'nullable|string',
            'logo' => 'nullable|image|max:2048', // 2MB max
        ]);

        $clinic = $request->user()->clinic;
        
        $data = $request->except('logo');
        
        // Handle logo upload
        if ($request->hasFile('logo')) {
            // Delete old logo if exists
            if ($clinic->logo_path) {
                Storage::disk('public')->delete($clinic->logo_path);
            }
            
            $data['logo_path'] = $request->file('logo')->store('clinic-logos', 'public');
        }

        $clinic->update($data);

        return response()->json([
            'message' => 'Clinic information updated successfully',
            'clinic' => $clinic,
        ]);
    }

    /**
     * Complete clinic setup
     */
    public function completeSetup(Request $request)
    {
        $clinic = $request->user()->clinic;
        
        // Validate required fields are filled
        if (!$clinic->name) {
            return response()->json([
                'message' => 'Please complete all required fields before finishing setup',
            ], 422);
        }

        $clinic->update([
            'is_setup_complete' => true,
            'setup_completed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Setup completed successfully',
            'clinic' => $clinic,
        ]);
    }
}
