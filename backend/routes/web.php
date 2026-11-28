<?php

use App\Http\Controllers\Auth\PortalEmailActionController;
use App\Http\Controllers\Reports\PrintController;
use App\Http\Controllers\Support\PublicStorageController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('print/reports')->group(function () {
    Route::get('/exposure-registry', [PrintController::class, 'exposureRegistry']);
    Route::get('/monthly', [PrintController::class, 'monthlyReport']);
    Route::get('/cohort', [PrintController::class, 'cohortReport']);
    Route::get('/bite-summary', [PrintController::class, 'biteSummaryMeetingPack']);
});

// Fallback storage route in case symlink (storage:link) is missing or unsupported on local OS
Route::get('storage/{path}', [PublicStorageController::class, 'serve'])->where('path', '.*');
Route::get('/patient-portal/activate', [PortalEmailActionController::class, 'activateForm']);
Route::post('/patient-portal/activate', [PortalEmailActionController::class, 'activate'])->middleware('throttle:invite-activation');
Route::get('/patient-portal/reset-password', [PortalEmailActionController::class, 'resetForm']);
Route::post('/patient-portal/reset-password', [PortalEmailActionController::class, 'reset'])->middleware('throttle:password-reset');
