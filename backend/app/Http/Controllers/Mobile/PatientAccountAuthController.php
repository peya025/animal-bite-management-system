<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\PatientAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
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
}
