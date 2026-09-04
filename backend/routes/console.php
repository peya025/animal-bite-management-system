<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily Automated Rabies PEP Reminders & Missed Dose Recalls at 8:00 AM
Schedule::command('appointments:auto-recall')->dailyAt('08:00');

// Daily Midnight Queue Auto-Expiry Sweep at 23:59
Schedule::command('queue:auto-expire')->dailyAt('23:59');
