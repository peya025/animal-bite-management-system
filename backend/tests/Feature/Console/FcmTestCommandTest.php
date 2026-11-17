<?php

namespace Tests\Feature\Console;

use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\Messaging\Firebase\FirebaseAuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FcmTestCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('services.firebase.project_id', 'abtc-management-system');
        Config::set('services.firebase.channel_id', 'abtcare_reminders');
        Config::set('services.firebase.fcm_enabled', false);
        Config::set('services.firebase.fcm_test_mode', true);
    }

    protected function createPatientAccount(array $attributes = []): PatientAccount
    {
        return PatientAccount::create(array_merge([
            'name'      => 'Juan Dela Cruz',
            'email'     => 'juan' . uniqid() . '@example.com',
            'password'  => 'password123',
            'is_active' => true,
        ], $attributes));
    }

    protected function createDeviceToken(PatientAccount $account, array $attributes = []): PatientDeviceToken
    {
        return $account->deviceTokens()->create(array_merge([
            'fcm_token'    => 'fcm_mock_token_' . uniqid() . '_1234567890',
            'device_id'    => 'device_' . uniqid(),
            'device_type'  => 'android',
            'device_name'  => 'Test Phone',
            'is_active'    => true,
            'last_used_at' => now(),
        ], $attributes));
    }

    public function test_command_requires_target_option(): void
    {
        $this->artisan('fcm:test')
            ->expectsOutputToContain('Target required!')
            ->expectsOutputToContain('Bulk push notification testing is strictly prohibited')
            ->assertExitCode(1);
    }

    public function test_command_accepts_patient_and_user_option_aliases(): void
    {
        $mockAuth = $this->createMock(FirebaseAuthService::class);
        $mockAuth->method('validateCredentialsFile')->willReturn([
            'project_id'   => 'abtc-management-system',
            'client_email' => 'firebase-test@abtc-management-system.iam.gserviceaccount.com',
            'type'         => 'service_account',
        ]);
        $this->app->instance(FirebaseAuthService::class, $mockAuth);

        $account = $this->createPatientAccount();

        // Test --patient alias
        $this->artisan('fcm:test', ['--patient' => $account->id])
            ->expectsOutputToContain("Patient account [{$account->id}] {$account->email} has no active registered device tokens.")
            ->assertExitCode(0);

        // Test --user alias
        $this->artisan('fcm:test', ['--user' => $account->id])
            ->expectsOutputToContain("Patient account [{$account->id}] {$account->email} has no active registered device tokens.")
            ->assertExitCode(0);
    }

    public function test_command_dry_run_with_token(): void
    {
        $mockAuth = $this->createMock(FirebaseAuthService::class);
        $mockAuth->method('validateCredentialsFile')->willReturn([
            'project_id'   => 'abtc-management-system',
            'client_email' => 'firebase-test@abtc-management-system.iam.gserviceaccount.com',
            'type'         => 'service_account',
        ]);
        $mockAuth->method('getProjectId')->willReturn('abtc-management-system');
        $mockAuth->method('getAccessToken')->willReturn('mock-oauth-access-token');
        $this->app->instance(FirebaseAuthService::class, $mockAuth);

        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'name' => 'projects/abtc-management-system/messages/dry_run_valid_message',
            ], 200),
        ]);

        $this->artisan('fcm:test', [
            '--token'   => 'test_fcm_token_1234567890',
            '--dry-run' => true,
        ])
            ->expectsOutputToContain('Validating payload with Firebase HTTP v1 (validate_only=true)...')
            ->expectsOutputToContain('Accepted by Firebase')
            ->expectsOutputToContain('dry_run_valid_message')
            ->assertExitCode(0);

        Http::assertSent(function ($request) {
            return $request['validate_only'] === true
                && $request['message']['token'] === 'test_fcm_token_1234567890';
        });
    }

    public function test_command_prompts_confirmation_and_cancels_when_declined(): void
    {
        $mockAuth = $this->createMock(FirebaseAuthService::class);
        $mockAuth->method('validateCredentialsFile')->willReturn([
            'project_id'   => 'abtc-management-system',
            'client_email' => 'firebase-test@abtc-management-system.iam.gserviceaccount.com',
            'type'         => 'service_account',
        ]);
        $mockAuth->method('getProjectId')->willReturn('abtc-management-system');
        $this->app->instance(FirebaseAuthService::class, $mockAuth);

        $this->artisan('fcm:test', ['--token' => 'sample_token_xyz'])
            ->expectsConfirmation('Are you sure you want to dispatch a live test notification to token sample..._xyz?', 'no')
            ->expectsOutputToContain('Test push cancelled by user.')
            ->assertExitCode(0);
    }

    public function test_command_with_force_flag_bypasses_prompt(): void
    {
        $mockAuth = $this->createMock(FirebaseAuthService::class);
        $mockAuth->method('validateCredentialsFile')->willReturn([
            'project_id'   => 'abtc-management-system',
            'client_email' => 'firebase-test@abtc-management-system.iam.gserviceaccount.com',
            'type'         => 'service_account',
        ]);
        $mockAuth->method('getProjectId')->willReturn('abtc-management-system');
        $mockAuth->method('getAccessToken')->willReturn('mock-oauth-access-token');
        $this->app->instance(FirebaseAuthService::class, $mockAuth);

        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'name' => 'projects/abtc-management-system/messages/forced_msg_id',
            ], 200),
        ]);

        $this->artisan('fcm:test', [
            '--token' => 'sample_token_xyz_1234567890',
            '--force' => true,
        ])
            ->expectsOutputToContain('Accepted by Firebase')
            ->expectsOutputToContain('forced_msg_id')
            ->assertExitCode(0);
    }

    public function test_command_reports_when_account_has_no_active_tokens(): void
    {
        $mockAuth = $this->createMock(FirebaseAuthService::class);
        $mockAuth->method('validateCredentialsFile')->willReturn([
            'project_id'   => 'abtc-management-system',
            'client_email' => 'firebase-test@abtc-management-system.iam.gserviceaccount.com',
            'type'         => 'service_account',
        ]);
        $mockAuth->method('getProjectId')->willReturn('abtc-management-system');
        $this->app->instance(FirebaseAuthService::class, $mockAuth);

        $account = $this->createPatientAccount();

        $this->artisan('fcm:test', ['--account' => (string) $account->id])
            ->expectsOutputToContain('has no active registered device tokens.')
            ->assertExitCode(0);
    }

    public function test_command_with_device_id_target(): void
    {
        $mockAuth = $this->createMock(FirebaseAuthService::class);
        $mockAuth->method('validateCredentialsFile')->willReturn([
            'project_id'   => 'abtc-management-system',
            'client_email' => 'firebase-test@abtc-management-system.iam.gserviceaccount.com',
            'type'         => 'service_account',
        ]);
        $mockAuth->method('getProjectId')->willReturn('abtc-management-system');
        $mockAuth->method('getAccessToken')->willReturn('mock-oauth-access-token');
        $this->app->instance(FirebaseAuthService::class, $mockAuth);

        $account = $this->createPatientAccount();
        $deviceToken = $this->createDeviceToken($account, ['device_id' => 'pixel_phone_001']);

        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'name' => 'projects/abtc-management-system/messages/pixel_msg_accepted',
            ], 200),
        ]);

        $this->artisan('fcm:test', [
            '--device' => 'pixel_phone_001',
            '--force'  => true,
        ])
            ->expectsOutputToContain('Target: Device ID [pixel_phone_001]')
            ->expectsOutputToContain('Accepted by Firebase')
            ->expectsOutputToContain('pixel_msg_accepted')
            ->assertExitCode(0);
    }

    public function test_command_deactivates_unregistered_token_and_reports_status(): void
    {
        $mockAuth = $this->createMock(FirebaseAuthService::class);
        $mockAuth->method('validateCredentialsFile')->willReturn([
            'project_id'   => 'abtc-management-system',
            'client_email' => 'firebase-test@abtc-management-system.iam.gserviceaccount.com',
            'type'         => 'service_account',
        ]);
        $mockAuth->method('getProjectId')->willReturn('abtc-management-system');
        $mockAuth->method('getAccessToken')->willReturn('mock-oauth-access-token');
        $this->app->instance(FirebaseAuthService::class, $mockAuth);

        $account = $this->createPatientAccount();
        $deviceToken = $this->createDeviceToken($account, ['device_id' => 'unregistered_phone']);

        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'error' => [
                    'code' => 404,
                    'message' => 'Requested entity was not found.',
                    'status' => 'NOT_FOUND',
                    'details' => [
                        [
                            '@type' => 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
                            'errorCode' => 'UNREGISTERED',
                        ],
                    ],
                ],
            ], 404),
        ]);

        $this->artisan('fcm:test', [
            '--device' => 'unregistered_phone',
            '--force'  => true,
        ])
            ->expectsOutputToContain('Failed: UNREGISTERED')
            ->assertExitCode(1);

        $deviceToken->refresh();
        $this->assertFalse($deviceToken->is_active);
    }
}
