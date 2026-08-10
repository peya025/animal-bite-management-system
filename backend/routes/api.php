<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\BiteCaseController;
use App\Http\Controllers\BiteIncidentIntakeController;
use App\Http\Controllers\ClinicModuleConfigController;
use App\Http\Controllers\ClinicSetupController;
use App\Http\Controllers\Mobile\MobileAppointmentController;
use App\Http\Controllers\Mobile\MobileNotificationController;
use App\Http\Controllers\Mobile\MobileVaccinationCardController;
use App\Http\Controllers\Mobile\PatientAccountAuthController;
use App\Http\Controllers\Mobile\PatientProfileController;
use App\Http\Controllers\PatientAccessController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\StaffInvitationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VaccinationController;
use App\Http\Controllers\TagoloanTreatmentCardController;
use App\Http\Controllers\TreatmentRecordController;
use App\Http\Controllers\VaccinationRecordController;
use App\Http\Controllers\VaccineInventoryController;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\LandingPageSettingsController;

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
Route::get('/landing-page-settings', [LandingPageSettingsController::class, 'getSettings']);

// Public setup endpoints (no authentication required)
Route::post('/setup/initialize', [ClinicSetupController::class, 'initialize'])
    ->middleware('throttle:5,60'); // 5 attempts per 60 minutes
Route::get('/setup/check-needed', function () {
    return response()->json([
        'needs_setup' => \App\Models\Clinic::count() === 0,
    ]);
});

use App\Http\Controllers\DeveloperDatabaseExplorerController;

Route::middleware(['auth:sanctum', 'role:developer,admin'])->group(function () {
    Route::post('/developer/landing-page-settings', [LandingPageSettingsController::class, 'updateSettings']);
    Route::put('/developer/landing-page-settings', [LandingPageSettingsController::class, 'updateSettings']);

    // Developer Database Explorer Routes (XAMPP / phpMyAdmin Style)
    Route::get('/developer/database/tables', [DeveloperDatabaseExplorerController::class, 'getTables']);
    Route::get('/developer/database/tables/{tableName}', [DeveloperDatabaseExplorerController::class, 'getTableDetails']);
});

Route::prefix('mobile')->group(function () {
    Route::post('/register', [PatientAccountAuthController::class, 'register']);
    Route::post('/login', [PatientAccountAuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'patient.account'])->group(function () {
        Route::get('/me', [PatientAccountAuthController::class, 'me']);
        Route::patch('/me', [PatientAccountAuthController::class, 'update']);
        Route::post('/logout', [PatientAccountAuthController::class, 'logout']);

        Route::get('/patients', [PatientProfileController::class, 'index']);
        Route::post('/patients', [PatientProfileController::class, 'store']);
        Route::get('/patients/{patient}/vaccination-card', [MobileVaccinationCardController::class, 'show']);

        Route::get('/appointments', [MobileAppointmentController::class, 'index']);
        Route::post('/appointments', [MobileAppointmentController::class, 'store']);
        Route::patch('/appointments/{appointment}/cancel', [MobileAppointmentController::class, 'cancel']);

        Route::get('/notifications', [MobileNotificationController::class, 'index']);
        Route::patch('/notifications/read-all', [MobileNotificationController::class, 'markAllAsRead']);
        Route::patch('/notifications/{notification}/read', [MobileNotificationController::class, 'markAsRead']);
    });
});

// Invitation acceptance (public, token-based)
Route::prefix('staff-invitations')->group(function () {
    Route::get('/validate/{token}', [StaffInvitationController::class, 'validateToken']);
    Route::post('/accept/{token}', [StaffInvitationController::class, 'accept']);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);

    // Staff Invitations (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::post('/staff-invitations', [StaffInvitationController::class, 'invite']);
        Route::get('/staff-invitations', [StaffInvitationController::class, 'index']);
        Route::delete('/staff-invitations/{id}', [StaffInvitationController::class, 'cancel']);
        
        // Audit Logs (staff activity monitoring)
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/audit-logs/summary', [AuditLogController::class, 'summary']);
        Route::get('/audit-logs/user/{userId}', [AuditLogController::class, 'userActivity']);
    });

    // Clinic Module Configuration (all authenticated users can view, admin can update)
    Route::get('/setup/module-config', [ClinicModuleConfigController::class, 'show']);
    Route::put('/setup/module-config', [ClinicModuleConfigController::class, 'update']);
    
    // Staff Module Assignment (admin only)
    Route::put('/users/{id}/assigned-module', [UserController::class, 'updateAssignedModule']);

    // Clinic Setup (admin only)
    Route::prefix('setup')->middleware('role:admin')->group(function () {
        Route::get('/status', [ClinicSetupController::class, 'checkSetup']);
        Route::get('/clinic', [ClinicSetupController::class, 'getProfile']);
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
        // Patient accounts (admin view)
        Route::get('/patient-accounts', [UserController::class, 'patientAccounts']);
        Route::put('/patient-accounts/{id}/toggle', [UserController::class, 'togglePatientAccount']);
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
            Route::post('/{patient}/accounts/{account}/verify', [PatientAccessController::class, 'verify']);
            Route::post('/{patient}/accounts/{account}/reject', [PatientAccessController::class, 'reject']);
        });

        // Delete (admin only)
        Route::delete('/{id}', [PatientController::class, 'destroy'])->middleware('role:admin');
    });

    // Bite Case Management (admin, triage can manage; treatment can view)
    Route::prefix('bite-intakes')->middleware('role:admin,registration,triage')->group(function () {
        Route::get('/', [BiteIncidentIntakeController::class, 'index']);
        Route::get('/{intake}', [BiteIncidentIntakeController::class, 'show']);
        Route::post('/{intake}/reviewed', [BiteIncidentIntakeController::class, 'markReviewed']);
    });

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

    // Treatment Records (Form 2 - Individual Treatment)
    Route::prefix('treatment-records')->middleware('role:admin,triage')->group(function () {
        Route::get('/', [TreatmentRecordController::class, 'index']);
        Route::get('/patient/{patientId}', [TreatmentRecordController::class, 'getByPatient']);
        Route::post('/', [TreatmentRecordController::class, 'store']);
        Route::get('/{id}', [TreatmentRecordController::class, 'show']);
    });

    // Tagoloan RHU Official Treatment Cards
    Route::prefix('tagoloan-treatment-cards')->group(function () {
        Route::get('/', [TagoloanTreatmentCardController::class, 'index']);
        Route::get('/patient/{patientId}', [TagoloanTreatmentCardController::class, 'getPatientCardData']);
        Route::get('/{id}', [TagoloanTreatmentCardController::class, 'show']);
        Route::post('/', [TagoloanTreatmentCardController::class, 'store']);
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
        // View queue (admin, registration, triage, treatment)
        Route::middleware('role:admin,registration,triage,treatment')->group(function () {
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

        // Call & Complete (admin, triage, treatment)
        Route::middleware('role:admin,triage,treatment')->group(function () {
            Route::post('/{id}/call', [QueueController::class, 'call']);
            Route::post('/{id}/complete', [QueueController::class, 'complete']);
        });
    });

    // Vaccination Records (Form 3)
    Route::prefix('vaccination-records')->group(function () {
        // View vaccination records (admin, triage, treatment)
        Route::middleware('role:admin,triage,treatment')->group(function () {
            Route::get('/patient/{patientId}', [VaccinationRecordController::class, 'getByPatient']);
            Route::get('/queue/{queueId}', [VaccinationRecordController::class, 'getByQueue']);
            Route::get('/{id}', [VaccinationRecordController::class, 'show']);
        });

        // Create/Update vaccination records (admin, treatment/nurse only)
        Route::middleware('role:admin,treatment')->group(function () {
            Route::post('/', [VaccinationRecordController::class, 'store']);
            Route::delete('/{id}', [VaccinationRecordController::class, 'destroy']);
        });
    });

    // Appointments (auto-scheduled follow-ups)
    Route::prefix('appointments')->group(function () {
        // View appointments (admin, triage, treatment)
        Route::middleware('role:admin,triage,treatment')->group(function () {
            Route::get('/', [AppointmentController::class, 'index']);
            Route::get('/today', [AppointmentController::class, 'today']);
            Route::get('/upcoming', [AppointmentController::class, 'upcoming']);
            Route::get('/overdue', [AppointmentController::class, 'overdue']);
        });
    });

    // Role-Based Patient Lists
    Route::middleware('role:admin,treatment')->group(function () {
        Route::get('/nurse/patients', [AppointmentController::class, 'nursePatients']);
    });
    Route::middleware('role:admin,triage')->group(function () {
        Route::get('/doctor/patients', [AppointmentController::class, 'doctorPatients']);
    });
});
