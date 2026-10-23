<?php

namespace App\Services\Clinic;

use App\Models\Clinic;
use App\Models\ClinicModuleConfig;
use App\Models\User;
use App\Services\GeocodingService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;

class ClinicSetupService
{
    /**
     * Initialize clinic with admin account or resume in-progress setup
     *
     * @param array<string, mixed> $validated
     * @return array{status: int, payload: array<string, mixed>}
     */
    public function initialize(array $validated, ?string $bearerToken = null): array
    {
        // Resume setup if valid setup token was provided for an in-progress setup
        if ($bearerToken) {
            $personalAccessToken = PersonalAccessToken::findToken($bearerToken);
            if ($personalAccessToken && $user = $personalAccessToken->tokenable) {
                if ($user->clinic && !$user->clinic->is_setup_complete) {
                    return [
                        'status'  => 200,
                        'payload' => [
                            'message' => 'Setup already initialized, resuming setup',
                            'token'   => $bearerToken,
                            'user'    => $user->load('clinic'),
                            'clinic'  => $user->clinic,
                        ],
                    ];
                }
            }
        }

        // Security: Only allow if database is empty or if clinic is completed
        if (Clinic::where('is_setup_complete', true)->exists()) {
            throw new HttpResponseException(
                response()->json([
                    'message' => 'Setup has already been completed',
                ], 403)
            );
        }

        if (Clinic::count() > 0) {
            throw new HttpResponseException(
                response()->json([
                    'message' => 'Setup has already been started. Please log in to complete setup.',
                ], 403)
            );
        }

        return DB::transaction(function () use ($validated) {
            // 1. Create clinic
            $clinic = Clinic::create([
                'name'              => $validated['clinic_name'],
                'is_setup_complete' => false,
            ]);

            // 2. Create admin user
            $admin = User::create([
                'clinic_id'       => $clinic->id,
                'name'            => $validated['admin_name'],
                'email'           => $validated['admin_email'],
                'password'        => Hash::make($validated['admin_password']),
                'role'            => 'admin',
                'assigned_module' => 'all',
                'is_active'       => true,
            ]);

            // 3. Create default module config
            ClinicModuleConfig::create([
                'clinic_id'             => $clinic->id,
                'triage_module_enabled' => true,
                'field_rules'           => [
                    'bite_location'     => 'required',
                    'exposure_category' => 'required',
                    'animal_status'     => 'optional',
                    'philhealth_info'   => 'optional',
                    'fourps_info'       => 'optional',
                    'wound_washing'     => 'optional',
                ],
            ]);

            // 4. Create authentication token
            $token = $admin->createToken('setup-token')->plainTextToken;

            return [
                'status'  => 201,
                'payload' => [
                    'message' => 'Clinic and admin account created successfully',
                    'token'   => $token,
                    'user'    => $admin->load('clinic'),
                    'clinic'  => $clinic,
                ],
            ];
        });
    }

    /**
     * Check setup status
     *
     * @return array{is_setup_complete: bool, clinic: ?Clinic}
     */
    public function checkSetup(?Clinic $clinic): array
    {
        if (!$clinic) {
            return [
                'is_setup_complete' => false,
                'clinic'            => null,
            ];
        }

        return [
            'is_setup_complete' => (bool) $clinic->is_setup_complete,
            'clinic'            => $clinic->is_setup_complete ? $clinic : null,
        ];
    }

    /**
     * Update clinic information with logos and geocoding
     *
     * @param array<string, mixed> $data
     */
    public function updateClinic(Clinic $clinic, array $data, Request $request): Clinic
    {
        $attributes = $data;
        unset(
            $attributes['logo'],
            $attributes['remove_logo'],
            $attributes['left_print_logo'],
            $attributes['remove_left_print_logo'],
            $attributes['right_print_logo'],
            $attributes['remove_right_print_logo']
        );

        // Handle main logo removal
        if ($request->boolean('remove_logo') || $request->input('remove_logo') === '1' || $request->input('remove_logo') === 'true') {
            if ($clinic->logo_path) {
                Storage::disk('public')->delete($clinic->logo_path);
            }
            $attributes['logo_path'] = null;
        }

        // Handle main logo upload
        if ($request->hasFile('logo')) {
            if ($clinic->logo_path) {
                Storage::disk('public')->delete($clinic->logo_path);
            }
            $attributes['logo_path'] = $request->file('logo')->store('clinic-logos', 'public');
        }

        // Handle left print logo removal
        if ($request->boolean('remove_left_print_logo') || $request->input('remove_left_print_logo') === '1' || $request->input('remove_left_print_logo') === 'true') {
            if ($clinic->left_print_logo_path) {
                Storage::disk('public')->delete($clinic->left_print_logo_path);
            }
            $attributes['left_print_logo_path'] = null;
        }

        // Handle left print logo upload
        if ($request->hasFile('left_print_logo')) {
            if ($clinic->left_print_logo_path) {
                Storage::disk('public')->delete($clinic->left_print_logo_path);
            }
            $attributes['left_print_logo_path'] = $request->file('left_print_logo')->store('clinic-logos', 'public');
        }

        // Handle right print logo removal
        if ($request->boolean('remove_right_print_logo') || $request->input('remove_right_print_logo') === '1' || $request->input('remove_right_print_logo') === 'true') {
            if ($clinic->right_print_logo_path) {
                Storage::disk('public')->delete($clinic->right_print_logo_path);
            }
            $attributes['right_print_logo_path'] = null;
        }

        // Handle right print logo upload
        if ($request->hasFile('right_print_logo')) {
            if ($clinic->right_print_logo_path) {
                Storage::disk('public')->delete($clinic->right_print_logo_path);
            }
            $attributes['right_print_logo_path'] = $request->file('right_print_logo')->store('clinic-logos', 'public');
        }

        // Auto-geocode if address changed
        if ($request->filled('address') && $request->address !== $clinic->address) {
            $this->geocodeClinicAddress($request->address, $attributes);
        }

        $clinic->update($attributes);

        // Clear map cache so new center is used
        Cache::forget("web:bite-cases:map-data:clinic:{$clinic->id}");

        return $clinic->fresh();
    }

    /**
     * Complete clinic setup
     */
    public function completeSetup(Clinic $clinic): Clinic
    {
        if (!$clinic->name) {
            throw new HttpResponseException(
                response()->json([
                    'message' => 'Please complete all required fields before finishing setup',
                ], 422)
            );
        }

        $updateData = [
            'is_setup_complete'  => true,
            'setup_completed_at' => now(),
        ];

        // Auto-geocode clinic address during setup completion
        if ($clinic->address) {
            $this->geocodeClinicAddress($clinic->address, $updateData);
        }

        $clinic->update($updateData);

        return $clinic->fresh();
    }

    /**
     * Geocode clinic address and extract location data
     *
     * @param array<string, mixed> $data
     */
    public function geocodeClinicAddress(string $address, array &$data): void
    {
        $parts = array_map('trim', explode(',', $address));
        $municipality = null;
        $province = null;

        if (count($parts) >= 3) {
            if (count($parts) >= 4) {
                $municipality = $parts[2];
                $province = $parts[3];
            } else {
                $municipality = $parts[1];
                $province = $parts[2] ?? null;
            }
        } elseif (count($parts) == 2) {
            $municipality = $parts[0];
            $province = $parts[1];
        }

        if ($municipality) {
            try {
                $geocodingService = new GeocodingService();
                $coords = $geocodingService->getCoordinates('', $municipality, $province);

                $data['municipality'] = $municipality;
                if ($province) {
                    $data['province'] = $province;
                }
                $data['latitude'] = $coords['latitude'];
                $data['longitude'] = $coords['longitude'];
                $data['map_default_zoom'] = $this->getSmartZoomLevel($municipality);

                Log::info('Clinic address geocoded', [
                    'municipality' => $municipality,
                    'coords'       => $coords,
                    'source'       => $coords['source'],
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to geocode clinic address', [
                    'address' => $address,
                    'error'   => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Determine smart zoom level based on area type
     */
    public function getSmartZoomLevel(string $municipality): int
    {
        $largeCities = [
            'Cagayan de Oro', 'Manila', 'Quezon City', 'Makati',
            'Pasig', 'Taguig', 'Cebu City', 'Davao City',
        ];

        if (in_array($municipality, $largeCities)) {
            return 12;
        }

        return 13;
    }
}
