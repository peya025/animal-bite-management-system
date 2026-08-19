<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PrintController;
use Illuminate\Http\Middleware\HandleCors;

Route::get('/', function () {
    return view('welcome');
});

// DOH iCLINICSYS Patient Enrolment Record (Form 1 Printout) with CORS middleware
Route::get('/print/patient/{id}/enrolment', [PrintController::class, 'enrolment'])
    ->middleware(HandleCors::class);
