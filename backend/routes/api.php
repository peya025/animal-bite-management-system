<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClinicSetupController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\StaffInvitationController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\BiteCaseController;
use App\Http\Controllers\VaccinationController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\VaccineInventoryController;
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

    // Patient Management (admin, registration, triage, treatment can view)
    Route::prefix('patients')->group(function () {
        Route::get('/', [PatientController::class, 'index']); // All roles
        Route::get('/{id}', [PatientController::class, 'show']); // All roles
        Route::get('/{id}/cases', [PatientController::class, 'biteCases']); // All roles
        Route::get('/{id}/vaccinations', [PatientController::class, 'vaccinations']); // All roles
        
        // Create & Update (admin, registration only)
        Route::middleware('role:admin,registration')->group(function () {
            Route::post('/', [PatientController::class, 'store']);
            Route::put('/{id}', [PatientController::class, 'update']);
        });
        
        // Delete (admin only)
        Route::delete('/{id}', [PatientController::class, 'destroy'])->middleware('role:admin');
    });

    // Bite Case Management (admin, triage can manage; treatment can view)
    Route::prefix('cases')->group(function () {
        Route::get('/', [BiteCaseController::class, 'index']); // All roles
        Route::get('/statistics', [BiteCaseController::class, 'statistics']); // All roles
        Route::get('/{id}', [BiteCaseController::class, 'show']); // All roles
        Route::get('/{id}/vaccinations', [BiteCaseController::class, 'vaccinations']); // All roles
        
        // Create & Update (admin, triage only)
        Route::middleware('role:admin,triage')->group(function () {
            Route::post('/', [BiteCaseController::class, 'store']);
            Route::put('/{id}', [BiteCaseController::class, 'update']);
        });
        
        // Delete (admin only)
        Route::delete('/{id}', [BiteCaseController::class, 'destroy'])->middleware('role:admin');
    });

    // Vaccination Management
    Route::prefix('vaccinations')->group(function () {
        Route::get('/', [VaccinationController::class, 'index']); // All roles
        Route::get('/today', [VaccinationController::class, 'today']); // All roles
        Route::get('/upcoming', [VaccinationController::class, 'upcoming']); // All roles
        Route::get('/overdue', [VaccinationController::class, 'overdue']); // All roles
        Route::get('/statistics', [VaccinationController::class, 'statistics']); // All roles
        Route::get('/{id}', [VaccinationController::class, 'show']); // All roles
        
        // Administration (admin, treatment only)
        Route::middleware('role:admin,treatment')->group(function () {
            Route::post('/{id}/administer', [VaccinationController::class, 'administer']);
            Route::post('/{id}/missed', [VaccinationController::class, 'markAsMissed']);
        });
        
        // Scheduling (admin, triage only)
        Route::middleware('role:admin,triage')->group(function () {
            Route::put('/{id}', [VaccinationController::class, 'update']);
            Route::post('/{id}/reschedule', [VaccinationController::class, 'reschedule']);
        });
    });

    // Vaccine Inventory (admin only)
    Route::prefix('inventory')->middleware('role:admin')->group(function () {
        Route::get('/statistics', [VaccineInventoryController::class, 'statistics']);
        Route::get('/', [VaccineInventoryController::class, 'index']);
        Route::post('/', [VaccineInventoryController::class, 'store']);
        Route::get('/{id}', [VaccineInventoryController::class, 'show']);
        Route::put('/{id}', [VaccineInventoryController::class, 'update']);
        Route::delete('/{id}', [VaccineInventoryController::class, 'destroy']);
        Route::post('/{id}/adjust', [VaccineInventoryController::class, 'adjustStock']);
        Route::get('/{id}/transactions', [VaccineInventoryController::class, 'transactions']);
    });

    // Queue Management
    Route::prefix('queue')->group(function () {
        // View queue (admin, registration, triage)
        Route::middleware('role:admin,registration,triage')->group(function () {
            Route::get('/', [QueueController::class, 'index']);
            Route::get('/waiting', [QueueController::class, 'waiting']);
            Route::get('/next', [QueueController::class, 'next']);
            Route::get('/statistics', [QueueController::class, 'statistics']);
            Route::get('/{id}', [QueueController::class, 'show']);
        });
        
        // Add to queue (admin, registration only)
        Route::middleware('role:admin,registration')->group(function () {
            Route::post('/', [QueueController::class, 'store']);
            Route::post('/{id}/cancel', [QueueController::class, 'cancel']);
            Route::put('/{id}/priority', [QueueController::class, 'updatePriority']);
        });
        
        // Call & Complete (admin, triage only)
        Route::middleware('role:admin,triage')->group(function () {
            Route::post('/{id}/call', [QueueController::class, 'call']);
            Route::post('/{id}/complete', [QueueController::class, 'complete']);
        });
    });
});
