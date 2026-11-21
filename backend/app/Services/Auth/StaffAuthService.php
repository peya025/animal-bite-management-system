<?php

namespace App\Services\Auth;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class StaffAuthService
{
    /**
     * Authenticate staff user, update last login, log audit, and generate token.
     *
     * @param string $email
     * @param string $password
     * @return array{user: User, token: string, token_type: string}
     * @throws ValidationException
     */
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            Log::warning('Staff login failed: invalid credentials', ['email' => $email]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            Log::warning('Staff login rejected: account inactive', ['email' => $email, 'user_id' => $user->id]);
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive. Please contact your administrator.'],
            ]);
        }

        // Update last login timestamp
        $user->updateLastLogin();

        // Audit log login
        AuditLog::logLogin($user);

        // Issue token
        $token = $user->createToken('auth_token')->plainTextToken;

        // Eager-load relations
        $user->load(['clinic', 'roles']);

        return [
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer',
        ];
    }

    /**
     * Revoke current active access token after recording audit log.
     *
     * @param User $user
     * @return void
     */
    public function logout(User $user): void
    {
        // Log logout before deleting token to maintain user context
        AuditLog::logLogout();

        if ($user->currentAccessToken()) {
            $user->currentAccessToken()->delete();
        }
    }

    /**
     * Update user profile, verify current password if password change requested, and revoke tokens.
     *
     * @param User $user
     * @param array $validated
     * @return User
     * @throws ValidationException
     */
    public function updateProfile(User $user, array $validated): User
    {
        $isChangingPassword = !empty($validated['password']);

        if ($isChangingPassword) {
            $currentPassword = $validated['current_password'] ?? '';
            if (!Hash::check($currentPassword, $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Your current password is incorrect.'],
                ]);
            }
        }

        $data = ['name' => $validated['name']];

        if (array_key_exists('phone', $validated)) {
            $data['phone'] = $validated['phone'];
        }

        if ($isChangingPassword) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        // Changing password invalidates active sessions across all devices
        if ($isChangingPassword) {
            $user->tokens()->delete();
        }

        return $user->fresh()->load('clinic');
    }

    /**
     * Register initial administrator user and clinic if enabled.
     *
     * @param array $validated
     * @return array{user: User, token: string, token_type: string}
     */
    public function register(array $validated): array
    {
        if (!config('app.public_registration_enabled', false)) {
            abort(404);
        }

        $clinic = Clinic::create([
            'name' => 'My Clinic',
            'is_setup_complete' => false,
        ]);

        $user = User::create([
            'clinic_id' => $clinic->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;
        $user->load('clinic');

        return [
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer',
        ];
    }
}
