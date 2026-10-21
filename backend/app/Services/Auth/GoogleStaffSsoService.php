<?php

namespace App\Services\Auth;

use App\Models\AuditLog;
use App\Models\ClinicModuleConfig;
use App\Models\StaffInvitation;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GoogleStaffSsoService
{
    /**
     * Authenticate staff via Google ID token.
     * Handles existing staff (200), pending staff invitations (201), and rejections (401/403).
     *
     * @param string $credential
     * @return array{status: int, data: array<string, mixed>}
     */
    public function authenticate(string $credential): array
    {
        // ── Step 1: Verify the ID Token with Google's tokeninfo endpoint ──
        $tokenInfo = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $credential,
        ]);

        if ($tokenInfo->failed() || empty($tokenInfo->json('email'))) {
            Log::warning('Google SSO: Token verification failed with Google oauth2 endpoint');
            return [
                'status' => 401,
                'data' => ['message' => 'Invalid Google credential. Please try again.'],
            ];
        }

        $payload     = $tokenInfo->json();
        $googleEmail = strtolower(trim($payload['email']));
        $googleSub   = $payload['sub'] ?? null;
        $googleName  = $payload['name'] ?? null;

        // Verify audience if configured
        $clientId = config('services.google.client_id');
        if ($clientId && isset($payload['aud']) && $payload['aud'] !== $clientId) {
            Log::warning('Google SSO: Client ID audience mismatch', ['expected' => $clientId, 'got' => $payload['aud'] ?? null]);
            return [
                'status' => 401,
                'data' => ['message' => 'Google credential audience mismatch.'],
            ];
        }

        // ── Step 2: Case 1 — Look up existing staff account ──────────────
        $user = User::where('email', $googleEmail)->first();

        if ($user) {
            if (!$user->is_active) {
                return [
                    'status' => 403,
                    'data' => ['message' => 'Your account has been deactivated. Contact your clinic administrator.'],
                ];
            }

            if (!$user->clinic_id) {
                return [
                    'status' => 403,
                    'data' => ['message' => 'Your account is not assigned to any clinic. Contact your administrator.'],
                ];
            }

            // Check clinic-level SSO configuration
            $moduleConfig = ClinicModuleConfig::where('clinic_id', $user->clinic_id)->first();
            if ($moduleConfig && $moduleConfig->google_sso_enabled === false) {
                return [
                    'status' => 403,
                    'data' => ['message' => 'Google Sign-In is not enabled for this clinic. Use email and password.'],
                ];
            }

            if ($moduleConfig && !empty($moduleConfig->google_sso_roles)) {
                if (!in_array($user->role, $moduleConfig->google_sso_roles, true)) {
                    return [
                        'status' => 403,
                        'data' => ['message' => "Your role ({$user->role}) is not permitted to use Google Sign-In at this clinic."],
                    ];
                }
            }

            if ($moduleConfig && !empty($moduleConfig->google_sso_domain)) {
                $allowedDomain = ltrim($moduleConfig->google_sso_domain, '@');
                if (!str_ends_with($googleEmail, '@' . $allowedDomain)) {
                    return [
                        'status' => 403,
                        'data' => ['message' => "Google Sign-In is restricted to @{$allowedDomain} accounts at this clinic."],
                    ];
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

            return [
                'status' => 200,
                'data' => [
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
                ],
            ];
        }

        // ── Step 3: Case 2 — Check for a pending staff invitation ─────────
        $invitation = StaffInvitation::where('email', $googleEmail)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if ($invitation) {
            $newUser = User::create([
                'clinic_id'         => $invitation->clinic_id,
                'name'              => $googleName ?? $googleEmail,
                'email'             => $googleEmail,
                'password'          => Hash::make(Str::random(32)),
                'role'              => $invitation->role,
                'is_active'         => true,
                'google_id'         => $googleSub,
                'email_verified_at' => now(),
                'last_login_at'     => now(),
            ]);

            $invitation->update(['status' => 'accepted', 'accepted_at' => now()]);

            AuditLog::logLogin($newUser);
            $token = $newUser->createToken('auth_token')->plainTextToken;
            $newUser->load('clinic');

            return [
                'status' => 201,
                'data' => [
                    'user' => [
                        'id'        => $newUser->id,
                        'name'      => $newUser->name,
                        'email'     => $newUser->email,
                        'role'      => $newUser->role,
                        'phone'     => $newUser->phone,
                        'is_active' => $newUser->is_active,
                        'clinic'    => $newUser->clinic,
                    ],
                    'token'       => $token,
                    'token_type'  => 'Bearer',
                    'sso_method'  => 'google',
                    'provisioned' => true,
                ],
            ];
        }

        // ── Step 4: Case 3 — Strictly reject unknown Google accounts ─────
        return [
            'status' => 403,
            'data' => [
                'message' => 'Unauthorized: No clinical staff account is registered under this Google email. Contact your clinic administrator.',
            ],
        ];
    }
}
