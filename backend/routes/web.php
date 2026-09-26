<?php

use App\Http\Controllers\PrintController;
use App\Http\Controllers\PublicStorageController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('print/reports')->group(function () {
    Route::get('/exposure-registry', [PrintController::class, 'exposureRegistry']);
    Route::get('/monthly', [PrintController::class, 'monthlyReport']);
    Route::get('/cohort', [PrintController::class, 'cohortReport']);
});

// Fallback storage route in case symlink (storage:link) is missing or unsupported on local OS
Route::get('storage/{path}', [PublicStorageController::class, 'serve'])->where('path', '.*');