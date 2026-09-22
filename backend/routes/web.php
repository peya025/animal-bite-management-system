<?php

use App\Http\Controllers\PrintController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('print/reports')->group(function () {
    Route::get('/exposure-registry', [PrintController::class, 'exposureRegistry']);
    Route::get('/monthly', [PrintController::class, 'monthlyReport']);
    Route::get('/cohort', [PrintController::class, 'cohortReport']);
});