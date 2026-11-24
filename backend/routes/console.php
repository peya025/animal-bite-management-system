<?php

use App\Console\Commands\ManageNurseUnattendedSample;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('sample:nurse-unattended {action=seed : seed or remove}', function (string $action = 'seed') {
    return $this->call(ManageNurseUnattendedSample::class, ['action' => $action]);
})->purpose('Seed or remove sample unattended patient for testing Check In to Nurse');

// Daily Morning Clinic Readiness & Risk Alert Sync at 7:30 AM Manila Time (before clinic opening)
Schedule::command('clinic:sync-alerts')
    ->dailyAt('07:30')
    ->timezone(config('app.timezone', 'Asia/Manila'))
    ->withoutOverlapping(15)
    ->onOneServer();

// Daily Automated Rabies PEP Reminders & Missed Dose Recalls at 8:00 AM Manila Time
Schedule::command('appointments:auto-recall')
    ->dailyAt('08:00')
    ->timezone(config('app.timezone', 'Asia/Manila'))
    ->withoutOverlapping(30)
    ->onOneServer();

// Outbound Message Queue Recovery & Delivery Receipt Reconciliation every minute
Schedule::command('messaging:dispatch')
    ->everyMinute()
    ->withoutOverlapping(5)
    ->onOneServer();

// Daily Queue Auto-Expiry Sweep after midnight (00:05 Manila Time)
Schedule::command('queue:auto-expire')
    ->dailyAt('00:05')
    ->timezone(config('app.timezone', 'Asia/Manila'))
    ->withoutOverlapping(15)
    ->onOneServer();

// Daily Pruning of Expired Sanctum Personal Access Tokens (older than 24 hours)
Schedule::command('sanctum:prune-expired --hours=24')
    ->daily()
    ->timezone(config('app.timezone', 'Asia/Manila'))
    ->withoutOverlapping(30)
    ->onOneServer();
