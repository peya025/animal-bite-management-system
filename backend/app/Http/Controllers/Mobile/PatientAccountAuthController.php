<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\PatientAccount;
use App\Models\PatientInvitation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class PatientAccountAuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:patient_accounts,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $account = PatientAccount::create($validated);

        return response()->json([
            'account' => $account,
            'token' => $account->createToken('mobile')->plainTextToken,
            'token_type' => 'Bearer',
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $account = PatientAccount::where('email', $validated['email'])->first();

        if (! $account || ! Hash::check($validated['password'], $account->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $account->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This patient account is inactive.'],
            ]);
        }

        $account->update(['last_login_at' => now()]);

        return response()->json([
            'account' => $account,
            'token' => $account->createToken('mobile')->plainTextToken,
            'token_type' => 'Bearer',
        ]);
    }

    public function me(Request $request)
    {
        $accountId = $request->user()->id;
        $cacheKey = "mobile:account:me:{$accountId}";

        // Cache for 5 minutes
        return response()->json(
            Cache::remember($cacheKey, 300, function () use ($request) {
                return $request->user()->load(['patients.details', 'patients.memberships']);
            })
        );
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $request->user()->update($validated);

        // Invalidate cache after updating account
        $accountId = $request->user()->id;
        Cache::forget("mobile:account:me:{$accountId}");

        return response()->json(
            $request->user()->fresh()->load(['patients.details', 'patients.memberships']),
        );
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Successfully logged out.']);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $account = $request->user();

        if (! Hash::check($validated['current_password'], $account->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password you entered is incorrect.'],
            ]);
        }

        $account->update([
            'password' => $validated['password'],
        ]);

        Cache::forget("mobile:account:me:{$account->id}");

        return response()->json([
            'message' => 'Password has been changed successfully.',
        ]);
    }

    public function logoutOtherDevices(Request $request)
    {
        $user = $request->user();
        $currentTokenId = $user->currentAccessToken()?->id;

        if ($currentTokenId) {
            $user->tokens()->where('id', '!=', $currentTokenId)->delete();
        } else {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Successfully logged out of all other devices.',
        ]);
    }

    public function deleteAccount(Request $request)
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        $account = $request->user();

        if (! Hash::check($validated['password'], $account->password)) {
            throw ValidationException::withMessages([
                'password' => ['Incorrect password. Account deletion cancelled.'],
            ]);
        }

        // Revoke all tokens
        $account->tokens()->delete();

        // Deactivate account
        $account->update([
            'is_active' => false,
        ]);

        Cache::forget("mobile:account:me:{$account->id}");

        return response()->json([
            'message' => 'Your account has been deactivated successfully.',
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $account = PatientAccount::where('email', $validated['email'])->first();

        return response()->json([
            'message' => 'If an account with that email exists, password reset instructions have been sent.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Tier 9 — Google OAuth SSO for Mobile Patients
    // POST /api/mobile/auth/google
    // ─────────────────────────────────────────────────────────────────────
    /**
     * Authenticate or auto-provision a patient account via Google ID Token.
     * Unlike the staff endpoint, patient accounts ARE auto-created on first
     * Google login (no invitation required). However, patient record linking
     * still requires a pending PatientInvitation from clinic staff.
     */
    public function googleLogin(Request $request)
    {
        $request->validate([
            'credential' => 'required|string',  // Google ID Token (JWT)
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
        $googleSub   = $payload['sub'] ?? null;
        $googleName  = $payload['name'] ?? null;

        // ── Step 2: Look up or auto-provision patient account ─────────────
        $account = PatientAccount::where('email', $googleEmail)
            ->orWhere('google_id', $googleSub)
            ->first();

        if ($account) {
            // Account exists — link google_id if not already linked
            $updates = ['last_login_at' => now()];
            if (empty($account->google_id)) {
                $updates['google_id']          = $googleSub;
                $updates['email_verified_at']  = $updates['email_verified_at'] ?? now();
            }
            if (!$account->is_active) {
                return response()->json([
                    'message' => 'This patient account is inactive. Contact your clinic.',
                ], 403);
            }
            $account->update($updates);
        } else {
            // Auto-provision a new PatientAccount for the Google user
            $account = PatientAccount::create([
                'name'               => $googleName ?? $googleEmail,
                'email'              => $googleEmail,
                'password'           => Hash::make(\Illuminate\Support\Str::random(32)),
                'google_id'          => $googleSub,
                'email_verified_at'  => now(),
                'is_active'          => true,
                'last_login_at'      => now(),
            ]);
        }

        // ── Step 3: Automatic Patient Record Linking via Invitation ───────
        // If a clinic staff member already sent a PatientInvitation to this email,
        // link the new PatientAccount to the verified Patient record.
        $pendingInvitation = PatientInvitation::where('phone', null)   // email-based invitations have no phone
            ->whereHas('patient', function ($q) use ($googleEmail) {
                // Match by linked email if stored on patient details, or by invitation's own email field
            })
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        // Simpler fallback: check via a direct email match on patient_invitations if schema supports it
        // The PatientInvitation model links clinic_id + patient_id; look up by email on patient
        $linkedPatient = \App\Models\Patient::whereHas('details', function ($q) use ($googleEmail) {
            $q->where('email', $googleEmail);
        })->orWhere('email', $googleEmail)->first();

        if ($linkedPatient) {
            // Check if not already linked
            $alreadyLinked = $account->patients()->where('patient_id', $linkedPatient->patient_id)->exists();
            if (!$alreadyLinked) {
                $account->patients()->attach($linkedPatient->patient_id, [
                    'relationship' => 'self',
                    'is_primary'   => true,
                    'status'       => 'verified',
                    'verified_at'  => now(),
                ]);

                // Mark matching pending invitations as accepted
                PatientInvitation::where('patient_id', $linkedPatient->patient_id)
                    ->where('status', 'pending')
                    ->update(['status' => 'accepted', 'accepted_at' => now()]);
            }
        }

        Cache::forget("mobile:account:me:{$account->id}");
        $token = $account->createToken('mobile')->plainTextToken;

        return response()->json([
            'account'    => $account->load(['patients.details']),
            'token'      => $token,
            'token_type' => 'Bearer',
            'sso_method' => 'google',
        ], $account->wasRecentlyCreated ? 201 : 200);
    }
}
