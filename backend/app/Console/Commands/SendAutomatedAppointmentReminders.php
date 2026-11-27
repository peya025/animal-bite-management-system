<?php

namespace App\Console\Commands;

use App\Models\PatientAccount;
use App\Services\AppointmentReminderService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Throwable;

class SendAutomatedAppointmentReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:auto-recall
                            {--channel=all : Delivery channel (all, in_app, sms, email)}
                            {--test : Enable controlled testing mode restricted to Patient Account ID 1}
                            {--account= : Patient account ID for controlled testing (strictly restricted to Account ID 1)}
                            {--date= : Simulated reminder reference date (YYYY-MM-DD) for time-shifted sweep testing}
                            {--dry-run : Validate and simulate reminder execution without physical device dispatch}
                            {--sync : Dispatch FCM notification synchronously for immediate terminal feedback}
                            {--force : Bypass confirmation prompt for live test dispatch}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically dispatch 1-day advance reminders, D-Day vaccination reminders, and milestone overdue recalls';

    /**
     * Execute the console command.
     */
    public function handle(AppointmentReminderService $reminderService): int
    {
        $isTest = (bool) $this->option('test');

        if (! $isTest) {
            $channel = $this->option('channel') ?? 'all';
            $this->info("🤖 Starting Automated Rabies PEP Reminder & Missed Recall Sweep [Channel: {$channel}]...");

            $res = $reminderService->runAutomatedSweep($channel);

            $this->table(
                ['Metric', 'Count'],
                [
                    ['Eligible Tomorrow Reminders', $res['advance_reminders_eligible']],
                    ['Processed Tomorrow Reminders', $res['advance_reminders_sent']],
                    ['Eligible Same-Day (D-Day) Reminders', $res['same_day_reminders_eligible'] ?? 0],
                    ['Processed Same-Day (D-Day) Reminders', $res['same_day_reminders_sent'] ?? 0],
                    ['Eligible Missed Recalls', $res['missed_recalls_eligible']],
                    ['Processed Missed Recalls', $res['missed_recalls_sent']],
                    ['Total Requests Processed', $res['total_dispatched']],
                ]
            );

            $this->info("✅ Automated Recall Sweep Completed Successfully at {$res['timestamp']}.");

            return Command::SUCCESS;
        }

        // ─────────────────────────────────────────────────────────────
        // Controlled Testing Mode (Patient Account ID 1 Strictly)
        // ─────────────────────────────────────────────────────────────
        $this->info('─────────────────────────────────────────────────────────────────');
        $this->info('  ABTC Automated Vaccination Reminder Sweep — Controlled Test    ');
        $this->info('─────────────────────────────────────────────────────────────────');

        // 1. Enforce strict account restriction to Patient Account ID 1
        $accountOption = $this->option('account');
        if (! empty($accountOption) && (int) $accountOption !== 1 && $accountOption !== 'cyong@gmail.com') {
            $this->error('Testing is strictly restricted to Patient Account ID 1 and its authorized linked test profiles.');

            return Command::FAILURE;
        }

        $account = PatientAccount::find(1);
        if (! $account) {
            $this->error('Target test patient account ID 1 not found in database.');

            return Command::FAILURE;
        }

        if (! $account->is_active) {
            $this->error("Patient account [{$account->id}] {$account->email} is inactive. Notifications cannot be sent.");

            return Command::FAILURE;
        }

        // 2. Enforce channel restriction: only in-app and FCM push permitted
        $channelOption = $this->option('channel');
        if ($channelOption !== null && $channelOption !== 'all' && ! in_array($channelOption, ['in_app', 'fcm', 'push'], true)) {
            $this->error("In test mode, only in-app and FCM push channels are permitted. SMS and email dispatch are prohibited (received: '{$channelOption}').");

            return Command::FAILURE;
        }

        // 3. Resolve simulated reference date
        $dateOption = $this->option('date');
        $referenceDate = null;
        if (! empty($dateOption)) {
            try {
                $referenceDate = Carbon::createFromFormat('Y-m-d', $dateOption)->startOfDay();
            } catch (Throwable) {
                $this->error("Invalid date format for --date: '{$dateOption}'. Expected YYYY-MM-DD (e.g. 2026-11-19).");

                return Command::FAILURE;
            }
        }

        $isDryRun = (bool) $this->option('dry-run');
        $isSync = (bool) $this->option('sync');

        $activeDevices = $account->deviceTokens()->active()->get();
        $deviceCount = $activeDevices->count();

        $this->line("Target Account:      <info>#{$account->id} ({$account->email})</info>");
        $this->line("Active Device(s):    <info>{$deviceCount} registered token(s)</info>");
        $this->line('Simulated Date:      '.($referenceDate ? "<info>{$referenceDate->toDateString()}</info>" : '<comment>Today ('.today()->toDateString().')</comment>'));
        $this->line('Delivery Mode:       '.($isDryRun ? '<comment>DRY-RUN (validate-only, no physical device dispatch)</comment>' : '<info>LIVE (dispatches push to physical Android device)</info>'));
        $this->line('Allowed Channels:    <info>in_app (Database Notification + FCM Push)</info>');
        $this->line('Blocked Channels:    <comment>SMS, Email (transport strictly suppressed)</comment>');
        $this->line('Duplicate Guard:     <info>Active (test namespace prevents legitimate reminder collision)</info>');
        $this->line('Schedule Integrity:  <info>Preserved (vaccination dates and reminder counts untouched)</info>');
        $this->info('─────────────────────────────────────────────────────────────────');

        // 4. Interactive confirmation before live physical delivery
        if (! $isDryRun && ! $this->option('force')) {
            if (! $this->confirm("Are you sure you want to dispatch a LIVE reminder sweep test to Account #1 ({$deviceCount} device(s))?", false)) {
                $this->warn('Test reminder sweep cancelled by user.');

                return Command::SUCCESS;
            }
        }

        $this->line($isDryRun ? '🔍 Running dry-run reminder sweep...' : '🚀 Executing controlled reminder sweep...');

        try {
            $res = $reminderService->runAutomatedSweep(
                channel: 'in_app',
                isTest: true,
                targetAccountId: 1,
                dryRun: $isDryRun,
                sync: $isSync,
                referenceDate: $referenceDate
            );
        } catch (Throwable $e) {
            $this->error('Failed to execute controlled reminder sweep: '.$e->getMessage());

            return Command::FAILURE;
        }

        $this->table(
            ['Metric', 'Count'],
            [
                ['Eligible Advance Reminders', $res['advance_reminders_eligible']],
                ['Processed Advance Reminders', $res['advance_reminders_sent']],
                ['Eligible Same-Day (D-Day) Reminders', $res['same_day_reminders_eligible'] ?? 0],
                ['Processed Same-Day (D-Day) Reminders', $res['same_day_reminders_sent'] ?? 0],
                ['Eligible Missed Dose Recalls', $res['missed_recalls_eligible']],
                ['Processed Missed Dose Recalls', $res['missed_recalls_sent']],
                ['Total Dispatched / Validated', $res['total_dispatched']],
            ]
        );

        if (! empty($res['details'])) {
            $detailRows = [];
            foreach ($res['details'] as $detail) {
                $apptId = $detail['appointment_id'] ?? '-';
                $patientName = $detail['patient_name'] ?? '-';
                $inAppResult = $detail['channel_results']['in_app'] ?? [];
                $isPrefAllowed = $inAppResult['preferences_allowed'] ?? true;
                $status = $detail['success']
                    ? '<info>SUCCESS</info>'
                    : (! $isPrefAllowed ? '<comment>SKIPPED</comment>' : '<comment>SKIPPED / NONE</comment>');
                $inApp = $inAppResult['status'] ?? ($detail['errors']['in_app'] ?? 'none');

                $fcmInfo = 'N/A';
                if (! $isPrefAllowed || ($inAppResult['error'] ?? null) === 'vaccination_reminders_disabled') {
                    $skipReason = $inAppResult['skip_reason'] ?? 'Vaccination reminders disabled';
                    $fcmInfo = "SKIPPED — {$skipReason}";
                } elseif ($isDryRun && isset($inAppResult['fcm_results'])) {
                    $resultsList = $inAppResult['fcm_results'];
                    $fcmInfo = count($resultsList) > 0 ? 'Validated (validate_only=true)' : 'No active devices';
                } elseif (! $isDryRun && $detail['success']) {
                    $fcmInfo = $isSync ? 'Delivered via FCM HTTP v1' : 'Queued (SendFcmPushNotification)';
                }

                $detailRows[] = [
                    $apptId,
                    $patientName,
                    $status,
                    $inApp,
                    $fcmInfo,
                ];
            }

            $this->info('Processed Appointment Details:');
            $this->table(
                ['Appointment ID', 'Patient Name', 'Outcome', 'In-App Status', 'FCM Delivery Status'],
                $detailRows
            );
        }

        if ($isDryRun) {
            $this->info('─────────────────────────────────────────────────────────────────');
            $this->comment('ℹ️ Notice: Dry-run completed. All payloads and eligibility rules were validated.');
            $this->comment('No push notifications were sent to physical devices, and database records were untouched.');
            $this->info('─────────────────────────────────────────────────────────────────');
        } else {
            $this->info("✅ Controlled reminder sweep completed successfully at {$res['timestamp']}.");
        }

        return Command::SUCCESS;
    }
}
