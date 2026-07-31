<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\Clinic;
use App\Models\User;
use App\Models\ClinicModuleConfig;

class ClinicSetupController extends Controller
{
    /**
     * Initialize clinic with admin account
     * PUBLIC endpoint - no authentication required
     * Only works if NO clinics exist in database
     */
    public function initialize(Request $request)
    {
        // Security: Only allow if database is empty
        if (Clinic::count() > 0) {
            return response()->json([
                'message' => 'Setup has already been completed',
            ], 403);
        }

        $validated = $request->validate([
            'clinic_name' => 'required|string|max:255',
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/',
            ],
        ], [
            'admin_password.regex' => 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        ]);

        try {
            DB::beginTransaction();

            // 1. Create clinic
            $clinic = Clinic::create([
                'name' => $validated['clinic_name'],
                'is_setup_complete' => false, // Will be completed later
            ]);

            // 2. Create admin user
            $admin = User::create([
                'clinic_id' => $clinic->id,
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => Hash::make($validated['admin_password']),
                'role' => 'admin',
                'assigned_module' => 'all',
            ]);

            // 3. Create default module config
            ClinicModuleConfig::create([
                'clinic_id' => $clinic->id,
                'triage_module_enabled' => true,
                'field_rules' => [
                    'bite_location' => 'required',
                    'exposure_category' => 'required',
                    'animal_status' => 'optional',
                    'philhealth_info' => 'optional',
                    'fourps_info' => 'optional',
                    'wound_washing' => 'optional',
                ],
            ]);

            // 4. Create authentication token
            $token = $admin->createToken('setup-token')->plainTextToken;

            DB::commit();

            return response()->json([
                'message' => 'Clinic and admin account created successfully',
                'token' => $token,
                'user' => $admin->load('clinic'),
                'clinic' => $clinic,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to initialize setup',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

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
