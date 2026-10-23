<?php

namespace App\Services\Mobile;

use App\Models\PatientAccount;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PatientAccountAuthService
{
    /**
     * Register a new mobile patient account.
     */
    public function register(array $data): array
    {
        $account = PatientAccount::create($data);

        return [
            'account'    => $account,
            'token'      => $account->createToken('mobile')->plainTextToken,
            'token_type' => 'Bearer',
        ];
    }

    /**
     * Authenticate mobile patient and issue Sanctum token.
     */
    public function login(string $email, string $password): array
    {
        $account = PatientAccount::where('email', $email)->first();

        if (! $account || ! Hash::check($password, $account->password)) {
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

        return [
            'account'    => $account,
            'token'      => $account->createToken('mobile')->plainTextToken,
            'token_type' => 'Bearer',
        ];
    }

    /**
     * Retrieve cached mobile patient profile.
     */
    public function getMe(PatientAccount $account): PatientAccount
    {
        $cacheKey = "mobile:account:me:{$account->id}";

        return Cache::remember($cacheKey, 300, function () use ($account) {
            return $account->load(['patients.details', 'patients.memberships']);
        });
    }

    /**
     * Update mobile patient account demographics.
     */
    public function updateAccount(PatientAccount $account, array $data): PatientAccount
    {
        $account->update($data);

        Cache::forget("mobile:account:me:{$account->id}");

        return $account->fresh()->load(['patients.details', 'patients.memberships']);
    }

    /**
     * Logout current session.
     */
    public function logout(PatientAccount $account): void
    {
        $account->currentAccessToken()?->delete();
    }

    /**
     * Change account password and revoke other sessions.
     */
    public function changePassword(PatientAccount $account, string $currentPassword, string $newPassword): void
    {
        if (! Hash::check($currentPassword, $account->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password you entered is incorrect.'],
            ]);
        }

        $account->update([
            'password' => $newPassword,
        ]);

        $currentTokenId = $account->currentAccessToken()?->id;
        if ($currentTokenId) {
            $account->tokens()->where('id', '!=', $currentTokenId)->delete();
        } else {
            $account->tokens()->delete();
        }

        Cache::forget("mobile:account:me:{$account->id}");
    }

    /**
     * Terminate sessions on other devices.
     */
    public function logoutOtherDevices(PatientAccount $account): void
    {
        $currentTokenId = $account->currentAccessToken()?->id;

        if ($currentTokenId) {
            $account->tokens()->where('id', '!=', $currentTokenId)->delete();
        } else {
            $account->tokens()->delete();
        }
    }

    /**
     * Deactivate account and revoke all sessions.
     */
    public function deleteAccount(PatientAccount $account, string $password): void
    {
        if (! Hash::check($password, $account->password)) {
            throw ValidationException::withMessages([
                'password' => ['Incorrect password. Account deletion cancelled.'],
            ]);
        }

        $account->tokens()->delete();
        $account->update(['is_active' => false]);

        Cache::forget("mobile:account:me:{$account->id}");
    }

    /**
     * Password reset placeholder.
     */
    public function forgotPassword(string $email): void
    {
        // No-op or notification trigger
    }
}
