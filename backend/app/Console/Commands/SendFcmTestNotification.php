<?php

namespace App\Console\Commands;

use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\Messaging\FcmService;
use App\Services\Messaging\Firebase\FirebaseAuthService;
use App\Services\Messaging\Firebase\FcmResult;
use Illuminate\Console\Command;
use Throwable;

class SendFcmTestNotification extends Command
{
    protected $signature = 'fcm:test
                            {--account= : Target test patient account ID or email}
                            {--token= : Target explicit FCM registration token}
                            {--device= : Target registered device ID}
                            {--dry-run : Validate payload with Firebase HTTP v1 API without sending to physical device}
                            {--validate-only : Alias for --dry-run}
                            {--force : Skip interactive confirmation prompt}';

    protected $description = 'Test Firebase Cloud Messaging push notification delivery safely to an authorized test account or device.';

    public function handle(FcmService $fcmService, FirebaseAuthService $authService): int
    {
        $this->info('───────────────────────────────────────────────────────');
        $this->info('  ABTC Management System — FCM Delivery Engine Test    ');
        $this->info('───────────────────────────────────────────────────────');

        // 1. Verify Firebase configuration and credentials
        try {
            $metadata = $authService->validateCredentialsFile();
            $this->line("Firebase Project:   <info>{$metadata['project_id']}</info>");
            $this->line("Service Account:    <info>{$metadata['client_email']}</info>");
            $this->line("Android Channel:    <info>{$fcmService->getChannelId()}</info>");
            $this->line("FCM Enabled:        " . ($fcmService->isEnabled() ? '<info>true</info>' : '<comment>false (testing permitted via test command)</comment>'));
        } catch (Throwable $e) {
            $this->error('Firebase configuration error: ' . $e->getMessage());
            return Command::FAILURE;
        }

        $accountOption = $this->option('account');
        $tokenOption   = $this->option('token');
        $deviceOption  = $this->option('device');
        $isDryRun      = (bool) ($this->option('dry-run') || $this->option('validate-only'));

        // 2. Enforce targeted testing — strictly prohibit untargeted bulk sends
        if (empty($accountOption) && empty($tokenOption) && empty($deviceOption)) {
            $this->error('Target required! You must specify --account=<id|email>, --token=<fcm_token>, or --device=<device_id>.');
            $this->comment('Bulk push notification testing is strictly prohibited to protect patient privacy.');
            return Command::FAILURE;
        }

        $title = 'ABTC Test Notification';
        $body  = 'Your mobile push notification connection is working.';
        $data  = [
            'category' => 'general',
            'type'     => 'announcement',
            'route'    => '/notifications',
            'is_test'  => 'true',
        ];

        $results = [];

        // 3. Resolve targets and dispatch
        if (!empty($tokenOption)) {
            $masked = $fcmService->maskToken($tokenOption);
            $this->line("Target: Explicit FCM Token [{$masked}]");

            if (!$isDryRun && !$this->option('force')) {
                if (!$this->confirm("Are you sure you want to dispatch a live test notification to token {$masked}?", false)) {
                    $this->warn('Test push cancelled by user.');
                    return Command::SUCCESS;
                }
            }

            $this->line($isDryRun ? 'Validating payload with Firebase HTTP v1 (validate_only=true)...' : 'Dispatching push to Firebase HTTP v1...');
            $result = $fcmService->sendToToken($tokenOption, $title, $body, $data, validateOnly: $isDryRun);
            $results[] = [$masked, $result];
        } elseif (!empty($deviceOption)) {
            $deviceToken = PatientDeviceToken::where('device_id', $deviceOption)->first();

            if (!$deviceToken) {
                $this->error("No device token found for device_id: {$deviceOption}");
                return Command::FAILURE;
            }

            $masked = $deviceToken->masked_token;
            $this->line("Target: Device ID [{$deviceOption}] (Account ID: {$deviceToken->patient_account_id}, Token: {$masked})");

            if (!$isDryRun && !$this->option('force')) {
                if (!$this->confirm("Are you sure you want to dispatch a live test notification to device {$deviceOption}?", false)) {
                    $this->warn('Test push cancelled by user.');
                    return Command::SUCCESS;
                }
            }

            $this->line($isDryRun ? 'Validating payload with Firebase HTTP v1 (validate_only=true)...' : 'Dispatching push to Firebase HTTP v1...');
            $result = $fcmService->sendToDevice($deviceToken, $title, $body, $data, validateOnly: $isDryRun);
            $results[] = ["Device: {$deviceOption} ({$masked})", $result];
        } else {
            // Target patient account
            $account = PatientAccount::where('id', $accountOption)
                ->orWhere('email', $accountOption)
                ->first();

            if (!$account) {
                $this->error("Patient account not found for: {$accountOption}");
                return Command::FAILURE;
            }

            if (!$account->is_active) {
                $this->error("Patient account [{$account->id}] {$account->email} is inactive. Push notifications cannot be sent.");
                return Command::FAILURE;
            }

            $activeTokens = $account->deviceTokens()->active()->get();

            if ($activeTokens->isEmpty()) {
                $this->warn("Patient account [{$account->id}] {$account->email} has no active registered device tokens.");
                return Command::SUCCESS;
            }

            $tokenCount = $activeTokens->count();
            $this->line("Target: Account [{$account->id}] {$account->email} with {$tokenCount} active device(s).");

            if (!$isDryRun && !$this->option('force')) {
                if (!$this->confirm("Are you sure you want to dispatch a live test notification to all {$tokenCount} device(s) for this account?", false)) {
                    $this->warn('Test push cancelled by user.');
                    return Command::SUCCESS;
                }
            }

            $this->line($isDryRun ? 'Validating payload with Firebase HTTP v1 (validate_only=true)...' : 'Dispatching push to Firebase HTTP v1...');
            $accountResults = $fcmService->sendToAccount($account, $title, $body, $data, validateOnly: $isDryRun);

            foreach ($accountResults as $tokenId => $result) {
                $tokenModel = $activeTokens->firstWhere('id', $tokenId);
                $label = $tokenModel ? "Token #{$tokenId} ({$tokenModel->masked_token})" : "Token #{$tokenId}";
                $results[] = [$label, $result];
            }
        }

        // 4. Report structured results
        $rows = [];
        $hasErrors = false;

        foreach ($results as [$targetLabel, $result]) {
            /** @var FcmResult $result */
            $status = $result->isSuccessful()
                ? '<info>ACCEPTED</info>'
                : ($result->getErrorCode() === 'SKIPPED' ? '<comment>SKIPPED</comment>' : '<error>FAILED</error>');

            if ($result->isSuccessful()) {
                $this->info("✓ [{$targetLabel}] Accepted by Firebase. Message ID: " . ($result->getMessageId() ?? 'accepted'));
            } elseif ($result->getErrorCode() === 'SKIPPED') {
                $this->warn("⚠ [{$targetLabel}] Skipped: " . $result->getErrorMessage());
            } else {
                $hasErrors = true;
                $this->error("✗ [{$targetLabel}] Failed: {$result->getErrorCode()} - " . $result->getErrorMessage());
            }

            $details = $result->isSuccessful()
                ? ($result->getMessageId() ?? 'Accepted')
                : ($result->getErrorCode() . ': ' . $result->getErrorMessage());

            $note = $isDryRun ? 'Validate-only test (not sent to phone)' : 'Dispatched to Firebase';
            if ($result->isUnregistered()) {
                $note .= ' [Token Deactivated]';
            }

            $rows[] = [
                $targetLabel,
                $status,
                $result->getStatusCode(),
                $details,
                $note,
            ];
        }

        $this->table(
            ['Target', 'Firebase Acceptance', 'HTTP Status', 'Message ID / Error', 'Notes'],
            $rows
        );

        $this->info('───────────────────────────────────────────────────────');
        $this->comment('ℹ️ Notice: Firebase HTTP v1 acceptance confirms Firebase servers received');
        $this->comment('the message for routing. It does not verify physical delivery on-device');
        $this->comment('if the phone is offline, powered off, or battery-optimized.');
        $this->info('───────────────────────────────────────────────────────');

        return $hasErrors ? Command::FAILURE : Command::SUCCESS;
    }
}
