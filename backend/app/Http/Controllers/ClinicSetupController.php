<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
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

        // Auto-geocode if address changed
        if ($request->filled('address') && $request->address !== $clinic->address) {
            $this->geocodeClinicAddress($request->address, $data);
        }

        $clinic->update($data);

        // Clear map cache so new center is used
        Cache::forget("web:bite-cases:map-data:clinic:{$clinic->id}");

        return response()->json([
            'message' => 'Clinic information updated successfully',
            'clinic' => $clinic->fresh(),
        ]);
    }

    /**
     * Geocode clinic address and extract location data
     */
    private function geocodeClinicAddress(string $address, array &$data)
    {
        // Parse address format: "Street, Barangay, Municipality, Province"
        // or "Street, Municipality, Province"
        $parts = array_map('trim', explode(',', $address));
        
        // Try to extract municipality (usually 2nd or 3rd part)
        $municipality = null;
        $province = null;
        
        if (count($parts) >= 3) {
            // Format: Street, Barangay, Municipality, Province
            if (count($parts) >= 4) {
                $municipality = $parts[2];
                $province = $parts[3];
            } else {
                // Format: Street, Municipality, Province
                $municipality = $parts[1];
                $province = $parts[2] ?? null;
            }
        } elseif (count($parts) == 2) {
            // Format: Municipality, Province
            $municipality = $parts[0];
            $province = $parts[1];
        }

        if ($municipality) {
            try {
                $geocodingService = new \App\Services\GeocodingService();
                $coords = $geocodingService->getCoordinates('', $municipality, $province);
                
                $data['municipality'] = $municipality;
                if ($province) {
                    $data['province'] = $province;
                }
                $data['latitude'] = $coords['latitude'];
                $data['longitude'] = $coords['longitude'];
                
                // Set smart zoom based on area type
                $data['map_default_zoom'] = $this->getSmartZoomLevel($municipality);
                
                \Log::info('Clinic address geocoded', [
                    'municipality' => $municipality,
                    'coords' => $coords,
                    'source' => $coords['source']
                ]);
            } catch (\Exception $e) {
                \Log::warning('Failed to geocode clinic address', [
                    'address' => $address,
                    'error' => $e->getMessage()
                ]);
                // Don't fail the update, just skip geocoding
            }
        }
    }

    /**
     * Determine smart zoom level based on area type
     */
    private function getSmartZoomLevel(string $municipality): int
    {
        // Large cities need wider zoom
        $largeCities = [
            'Cagayan de Oro', 'Manila', 'Quezon City', 'Makati', 
            'Pasig', 'Taguig', 'Cebu City', 'Davao City'
        ];
        
        if (in_array($municipality, $largeCities)) {
            return 12; // Wider for large cities
        }
        
        return 13; // Standard for municipalities
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

        $updateData = [
            'is_setup_complete' => true,
            'setup_completed_at' => now(),
        ];

        // Auto-geocode clinic address during setup completion
        if ($clinic->address) {
            $this->geocodeClinicAddress($clinic->address, $updateData);
        }

        $clinic->update($updateData);

        return response()->json([
            'message' => 'Setup completed successfully',
            'clinic' => $clinic->fresh(),
        ]);
    }
}
