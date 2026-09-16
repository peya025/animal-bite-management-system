<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\ClinicModuleConfig;
use App\Models\StaffInvitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Create a default clinic for the admin user
        $clinic = \App\Models\Clinic::create([
            'name' => 'My Clinic',
            'is_setup_complete' => false,
        ]);

        $user = User::create([
            'clinic_id' => $clinic->id,
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'admin', // First user is always admin
            'is_active' => true,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        // Load clinic relationship
        $user->load('clinic');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
                'is_active' => $user->is_active,
                'clinic' => $user->clinic,
            ],
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    /**
     * Login user and create token
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Check if user is active
        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive. Please contact your administrator.'],
            ]);
        }

        // Update last login timestamp
        $user->updateLastLogin();

        // Log successful login
        AuditLog::logLogin($user);

        // Create token
        $token = $user->createToken('auth_token')->plainTextToken;

        // Load clinic and roles relationship
        $user->load(['clinic', 'roles']);

        return response()->json([
            'user' => [
                'id'                      => $user->id,
                'name'                    => $user->name,
                'email'                   => $user->email,
                'role'                    => $user->role,
                'phone'                   => $user->phone,
                'is_active'               => $user->is_active,
                'signature_path'          => $user->signature_path,
                'professional_license_no' => $user->professional_license_no,
                'roles'                   => $user->roles,
                'is_solo_nurse'           => $user->isSoloNurse(),
                'is_nursing'              => $user->isNursing(),
                'clinic'                  => $user->clinic,
            ],
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(Request $request)
    {
        // Log logout before revoking token
        AuditLog::logLogout();
        
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
    {
        $user = $request->user()->load(['clinic', 'roles']);
        
        return response()->json([
            'id'                      => $user->id,
            'name'                    => $user->name,
            'email'                   => $user->email,
            'role'                    => $user->role,
            'phone'                   => $user->phone,
            'is_active'               => $user->is_active,
            'signature_path'          => $user->signature_path,
            'professional_license_no' => $user->professional_license_no,
            'roles'                   => $user->roles,
            'is_solo_nurse'           => $user->isSoloNurse(),
            'is_nursing'              => $user->isNursing(),
            'last_login_at'           => $user->last_login_at,
            'clinic'                  => $user->clinic,
        ]);
    }

    /** Update the authenticated user's own profile. */
    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'current_password' => 'nullable|required_with:password|string',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        $user = $request->user();
        if ($request->filled('password') && !Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['Your current password is incorrect.']]);
        }

        $data = $request->only(['name', 'phone']);
        if ($request->filled('password')) $data['password'] = Hash::make($request->password);
        $user->update($data);
        return response()->json(['message' => 'Profile updated successfully', 'user' => $user->fresh()->load('clinic')]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Tier 9 — Google OAuth SSO for Clinical Staff
    // POST /api/auth/google
    // ─────────────────────────────────────────────────────────────────────
    /**
     * Authenticate a clinical staff member via Google ID Token.
     *
     * Security rules (strictly enforced):
     *   Case 1 — Existing active staff: verify, link google_id if new, issue Sanctum token.
     *   Case 2 — Pending staff invitation: auto-provision user, mark invitation accepted.
     *   Case 3 — No match: REJECT with 403. Never auto-provision unknown Google accounts.
     */
    public function googleLogin(Request $request)
    {
        $request->validate([
            'credential' => 'required|string',   // Google ID Token (JWT) from GIS SDK
        ]);

        // ── Step 1: Verify the ID Token with Google's tokeninfo endpoint ──
        $tokenInfo = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $request->credential,
        ]);

        if ($tokenInfo->failed() || empty($tokenInfo->json('email'))) {
            return response()->json([
                'message' => 'Invalid Google credential. Please try again.',
            ], 401);
        }

        $payload     = $tokenInfo->json();
        $googleEmail = strtolower(trim($payload['email']));
        $googleSub   = $payload['sub'] ?? null;   // Google account unique ID
        $googleName  = $payload['name'] ?? null;

        // Optional: verify the token was issued for this app's client ID
        $clientId = config('services.google.client_id');
        if ($clientId && isset($payload['aud']) && $payload['aud'] !== $clientId) {
            return response()->json([
                'message' => 'Google credential audience mismatch.',
            ], 401);
        }

        // ── Step 2: Case 1 — Look up existing staff account ──────────────
        $user = User::where('email', $googleEmail)->first();

        if ($user) {
            // Reject deactivated accounts
            if (!$user->is_active) {
                return response()->json([
                    'message' => 'Your account has been deactivated. Contact your clinic administrator.',
                ], 403);
            }

            // Reject accounts with no clinic assignment
            if (!$user->clinic_id) {
                return response()->json([
                    'message' => 'Your account is not assigned to any clinic. Contact your administrator.',
                ], 403);
            }

            // Check clinic-level SSO is enabled (if config exists)
            $moduleConfig = ClinicModuleConfig::where('clinic_id', $user->clinic_id)->first();
            if ($moduleConfig && $moduleConfig->google_sso_enabled === false) {
                return response()->json([
                    'message' => 'Google Sign-In is not enabled for this clinic. Use email and password.',
                ], 403);
            }

            // Check role is in the allowed SSO roles list (if configured)
            if ($moduleConfig && !empty($moduleConfig->google_sso_roles)) {
                if (!in_array($user->role, $moduleConfig->google_sso_roles, true)) {
                    return response()->json([
                        'message' => "Your role ({$user->role}) is not permitted to use Google Sign-In at this clinic.",
                    ], 403);
                }
            }

            // Check domain restriction (if configured)
            if ($moduleConfig && !empty($moduleConfig->google_sso_domain)) {
                $allowedDomain = ltrim($moduleConfig->google_sso_domain, '@');
                if (!str_ends_with($googleEmail, '@' . $allowedDomain)) {
                    return response()->json([
                        'message' => "Google Sign-In is restricted to @{$allowedDomain} accounts at this clinic.",
                    ], 403);
                }
            }

            // Link google_id on first Google login
            $updates = ['last_login_at' => now()];
            if (empty($user->google_id)) {
                $updates['google_id'] = $googleSub;
            }
            $user->update($updates);

            AuditLog::logLogin($user);
            $token = $user->createToken('auth_token')->plainTextToken;
            $user->load('clinic');

            return response()->json([
                'user' => [
                    'id'        => $user->id,
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'role'      => $user->role,
                    'phone'     => $user->phone,
                    'is_active' => $user->is_active,
                    'clinic'    => $user->clinic,
                ],
                'token'      => $token,
                'token_type' => 'Bearer',
                'sso_method' => 'google',
            ]);
        }

        // ── Step 3: Case 2 — Check for a pending staff invitation ─────────
        $invitation = StaffInvitation::where('email', $googleEmail)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if ($invitation) {
            // Auto-provision the staff user from the invitation
            $newUser = User::create([
                'clinic_id'          => $invitation->clinic_id,
                'name'               => $googleName ?? $googleEmail,
                'email'              => $googleEmail,
                'password'           => Hash::make(\Illuminate\Support\Str::random(32)),
                'role'               => $invitation->role,
                'is_active'          => true,
                'google_id'          => $googleSub,
                'email_verified_at'  => now(),
                'last_login_at'      => now(),
            ]);

            // Mark invitation accepted
            $invitation->update(['status' => 'accepted', 'accepted_at' => now()]);

            AuditLog::logLogin($newUser);
            $token = $newUser->createToken('auth_token')->plainTextToken;
            $newUser->load('clinic');

            return response()->json([
                'user' => [
                    'id'        => $newUser->id,
                    'name'      => $newUser->name,
                    'email'     => $newUser->email,
                    'role'      => $newUser->role,
                    'phone'     => $newUser->phone,
                    'is_active' => $newUser->is_active,
                    'clinic'    => $newUser->clinic,
                ],
                'token'        => $token,
                'token_type'   => 'Bearer',
                'sso_method'   => 'google',
                'provisioned'  => true,
            ], 201);
        }

        // ── Step 4: Case 3 — Strictly reject unknown Google accounts ─────
        return response()->json([
            'message' => 'Unauthorized: No clinical staff account is registered under this Google email. Contact your clinic administrator.',
        ], 403);
    }
}
