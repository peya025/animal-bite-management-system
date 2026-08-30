<?php

namespace App\Console\Commands;

use App\Services\AppointmentReminderService;
use Illuminate\Console\Command;

class SendAutomatedAppointmentReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:auto-recall {--channel=all : Delivery channel (all, sms, email, in_app)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically dispatch advance 1-day reminders and urgent missed dose recall alerts';

    /**
     * Execute the console command.
     */
    public function handle(AppointmentReminderService $reminderService): int
    {
        $channel = $this->option('channel') ?? 'all';
        $this->info("🤖 Starting Automated Rabies PEP Reminder & Missed Recall Sweep [Channel: {$channel}]...");

        $res = $reminderService->runAutomatedSweep($channel);

        $this->table(
            ['Metric', 'Count'],
            [
                ['Eligible Tomorrow Reminders', $res['advance_reminders_eligible']],
                ['Dispatched Tomorrow Reminders', $res['advance_reminders_sent']],
                ['Eligible Missed Recalls', $res['missed_recalls_eligible']],
                ['Dispatched Missed Recalls', $res['missed_recalls_sent']],
                ['Total Dispatches Today', $res['total_dispatched']],
            ]
        );

        $this->info("✅ Automated Recall Sweep Completed Successfully at {$res['timestamp']}.");

        return Command::SUCCESS;
    }
}
