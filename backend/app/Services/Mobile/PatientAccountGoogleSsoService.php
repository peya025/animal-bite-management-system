<?php

namespace App\Services\Mobile;

use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientInvitation;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PatientAccountGoogleSsoService
{
    /**
     * Authenticate or auto-provision a patient account via Google ID Token.
     */
    public function handleGoogleLogin(string $credential): array
    {
        // ── Step 1: Verify the ID Token with Google's tokeninfo endpoint ──
        $tokenInfo = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $credential,
        ]);

        if ($tokenInfo->failed() || empty($tokenInfo->json('email'))) {
            return [
                'success' => false,
                'status'  => 401,
                'data'    => ['message' => 'Invalid Google credential. Please try again.'],
            ];
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
            $updates = ['last_login_at' => now()];
            if (empty($account->google_id)) {
                $updates['google_id']         = $googleSub;
                $updates['email_verified_at'] = $updates['email_verified_at'] ?? now();
            }
            if (!$account->is_active) {
                return [
                    'success' => false,
                    'status'  => 403,
                    'data'    => ['message' => 'This patient account is inactive. Contact your clinic.'],
                ];
            }
            $account->update($updates);
        } else {
            $account = PatientAccount::create([
                'name'              => $googleName ?? $googleEmail,
                'email'             => $googleEmail,
                'password'          => Hash::make(Str::random(32)),
                'google_id'         => $googleSub,
                'email_verified_at' => now(),
                'is_active'         => true,
                'last_login_at'     => now(),
            ]);
        }

        // ── Step 3: Automatic Patient Record Linking via Invitation ───────
        $linkedPatient = Patient::whereHas('details', function ($q) use ($googleEmail) {
            $q->where('email', $googleEmail);
        })->orWhere('email', $googleEmail)->first();

        if ($linkedPatient) {
            $alreadyLinked = $account->patients()->where('patients.patient_id', $linkedPatient->patient_id)->exists();
            if (!$alreadyLinked) {
                $account->patients()->attach($linkedPatient->patient_id, [
                    'relationship' => 'self',
                    'is_primary'   => true,
                    'status'       => 'verified',
                    'verified_at'  => now(),
                ]);

                PatientInvitation::where('patient_id', $linkedPatient->patient_id)
                    ->where('status', 'pending')
                    ->update(['status' => 'accepted', 'accepted_at' => now()]);
            }
        }

        Cache::forget("mobile:account:me:{$account->id}");
        $token = $account->createToken('mobile')->plainTextToken;

        return [
            'success' => true,
            'status'  => $account->wasRecentlyCreated ? 201 : 200,
            'data'    => [
                'account'    => $account->load(['patients.details']),
                'token'      => $token,
                'token_type' => 'Bearer',
                'sso_method' => 'google',
            ],
        ];
    }
}
