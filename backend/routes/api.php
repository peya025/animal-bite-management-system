<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClinicSetupController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\StaffInvitationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Test route - check if API is working
Route::get('/test', function () {
    return response()->json([
        'message' => '✅ API is working!',
        'timestamp' => now(),
        'laravel_version' => app()->version(),
    ]);
});

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Invitation acceptance (public, token-based)
Route::prefix('invitations')->group(function () {
    Route::get('/{token}/validate', [StaffInvitationController::class, 'validateToken']);
    Route::post('/{token}/accept', [StaffInvitationController::class, 'accept']);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Clinic Setup (admin only)
    Route::prefix('setup')->middleware('role:admin')->group(function () {
        Route::get('/status', [ClinicSetupController::class, 'checkSetup']);
        Route::put('/clinic', [ClinicSetupController::class, 'updateClinic']);
        Route::post('/complete', [ClinicSetupController::class, 'completeSetup']);
    });

    // User Management (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{id}', [UserController::class, 'show']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
    });

    // Staff Invitations (admin only)
    Route::middleware('role:admin')->prefix('invitations')->group(function () {
        Route::post('/', [StaffInvitationController::class, 'invite']);
        Route::get('/', [StaffInvitationController::class, 'index']);
        Route::post('/{id}/cancel', [StaffInvitationController::class, 'cancel']);
    });
});
