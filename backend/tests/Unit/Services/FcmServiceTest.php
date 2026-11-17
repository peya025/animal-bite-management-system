<?php

namespace Tests\Unit\Services;

use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\Messaging\FcmService;
use App\Services\Messaging\Firebase\FirebaseAuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FcmServiceTest extends TestCase
{
    use RefreshDatabase;

    protected FirebaseAuthService $authMock;
    protected FcmService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();

        Config::set('services.firebase.project_id', 'abtc-management-system');
        Config::set('services.firebase.channel_id', 'abtcare_reminders');
        Config::set('services.firebase.fcm_enabled', true);
        Config::set('services.firebase.fcm_test_mode', false);

        $this->authMock = $this->createMock(FirebaseAuthService::class);
        $this->authMock->method('getProjectId')->willReturn('abtc-management-system');
        $this->authMock->method('getAccessToken')->willReturn('mock-oauth-access-token');

        $this->service = new FcmService($this->authMock);
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

    public function test_fcm_configuration_and_channel_id(): void
    {
        $this->assertTrue($this->service->isEnabled());
        $this->assertEquals('abtcare_reminders', $this->service->getChannelId());
        $this->assertEquals('***', $this->service->maskToken(null));
        $this->assertEquals('fcm_mo...7890', $this->service->maskToken('fcm_mock_token_abcdef_1234567890'));
    }

    public function test_sanitizes_data_payload_and_converts_all_values_to_strings(): void
    {
        $raw = [
            'id'       => 1234,
            'is_valid' => true,
            'score'    => 99.5,
            'notes'    => null,
            'category' => 'appointment_reminder',
        ];

        $sanitized = $this->service->validateAndSanitizeData($raw);

        $this->assertIsString($sanitized['id']);
        $this->assertEquals('1234', $sanitized['id']);
        $this->assertIsString($sanitized['is_valid']);
        $this->assertEquals('true', $sanitized['is_valid']);
        $this->assertIsString($sanitized['score']);
        $this->assertEquals('99.5', $sanitized['score']);
        $this->assertIsString($sanitized['notes']);
        $this->assertEquals('', $sanitized['notes']);
        $this->assertEquals('appointment_reminder', $sanitized['category']);
    }

    public function test_privacy_filter_strips_prohibited_sensitive_health_fields(): void
    {
        $dataWithPhi = [
            'category'          => 'appointment_reminder',
            'route'             => '/appointments',
            'patient_name'      => 'Juan Dela Cruz',
            'diagnosis'         => 'Rabies Exposure Category III',
            'exposure_category' => 'Category III Bite',
            'medical_history'   => 'Hypertensive, allergic to penicillin',
            'contact_number'    => '+639171234567',
            'phone'             => '09171234567',
            'email'             => 'juan@example.com',
            'dob'               => '1990-01-01',
            'philhealth'        => '1234-5678-9012',
        ];

        $sanitized = $this->service->validateAndSanitizeData($dataWithPhi);

        // Permitted metadata retained
        $this->assertArrayHasKey('category', $sanitized);
        $this->assertArrayHasKey('route', $sanitized);

        // All PHI and PII fields strictly stripped
        $this->assertArrayNotHasKey('patient_name', $sanitized);
        $this->assertArrayNotHasKey('diagnosis', $sanitized);
        $this->assertArrayNotHasKey('exposure_category', $sanitized);
        $this->assertArrayNotHasKey('medical_history', $sanitized);
        $this->assertArrayNotHasKey('contact_number', $sanitized);
        $this->assertArrayNotHasKey('phone', $sanitized);
        $this->assertArrayNotHasKey('email', $sanitized);
        $this->assertArrayNotHasKey('dob', $sanitized);
        $this->assertArrayNotHasKey('philhealth', $sanitized);
    }

    public function test_builds_correct_fcm_http_v1_payload(): void
    {
        $token = 'fcm_sample_token_xyz_1234567890';
        $title = 'Appointment Reminder';
        $body = 'You have an upcoming appointment. Open the app to view your schedule.';
        $data = ['category' => 'appointment_reminder', 'route' => '/appointments'];

        $payload = $this->service->buildPayload($token, $title, $body, $data, validateOnly: false);

        $this->assertArrayNotHasKey('validate_only', $payload);
        $this->assertEquals($token, $payload['message']['token']);
        $this->assertEquals($title, $payload['message']['notification']['title']);
        $this->assertEquals($body, $payload['message']['notification']['body']);
        $this->assertEquals('abtcare_reminders', $payload['message']['android']['notification']['channel_id']);
        $this->assertEquals('HIGH', $payload['message']['android']['priority']);
        $this->assertEquals('appointment_reminder', $payload['message']['data']['category']);
    }

    public function test_builds_payload_with_validate_only_flag(): void
    {
        $payload = $this->service->buildPayload('token_xyz', 'Title', 'Body', [], validateOnly: true);
        $this->assertTrue($payload['validate_only']);
    }

    public function test_send_to_token_returns_success_on_http_200(): void
    {
        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'name' => 'projects/abtc-management-system/messages/mock_message_id_12345',
            ], 200),
        ]);

        $result = $this->service->sendToToken(
            token: 'valid_test_token_1234567890',
            title: 'Appointment Reminder',
            body: 'You have an upcoming appointment.',
            data: ['category' => 'appointment_reminder']
        );

        $this->assertTrue($result->isSuccessful());
        $this->assertEquals('projects/abtc-management-system/messages/mock_message_id_12345', $result->getMessageId());
        $this->assertEquals(200, $result->getStatusCode());
        $this->assertFalse($result->isRetryable());
        $this->assertFalse($result->isUnregistered());

        Http::assertSent(function (Request $request) {
            return $request->hasHeader('Authorization', 'Bearer mock-oauth-access-token')
                && $request['message']['android']['notification']['channel_id'] === 'abtcare_reminders';
        });
    }

    public function test_send_to_token_deactivates_token_on_unregistered_error(): void
    {
        $account = $this->createPatientAccount();
        $deviceToken = $this->createDeviceToken($account, ['is_active' => true]);

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

        $result = $this->service->sendToDevice(
            deviceToken: $deviceToken,
            title: 'Appointment Reminder',
            body: 'You have an upcoming appointment.'
        );

        $this->assertFalse($result->isSuccessful());
        $this->assertTrue($result->isUnregistered());
        $this->assertFalse($result->isRetryable());
        $this->assertEquals('UNREGISTERED', $result->getErrorCode());
        $this->assertEquals(404, $result->getStatusCode());

        // Token record is deactivated in the database
        $deviceToken->refresh();
        $this->assertFalse($deviceToken->is_active);
    }

    public function test_send_to_token_handles_http_401_and_retries_with_fresh_token(): void
    {
        $attempt = 0;
        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => function () use (&$attempt) {
                $attempt++;
                if ($attempt === 1) {
                    return Http::response(['error' => ['code' => 401, 'message' => 'Auth token expired']], 401);
                }
                return Http::response(['name' => 'projects/abtc-management-system/messages/retried_success_msg_id'], 200);
            },
        ]);

        $this->authMock->expects($this->once())->method('invalidateToken');

        $result = $this->service->sendToToken('test_token_1234567890', 'Title', 'Body');

        $this->assertTrue($result->isSuccessful());
        $this->assertEquals('projects/abtc-management-system/messages/retried_success_msg_id', $result->getMessageId());
        $this->assertEquals(2, $attempt);
    }

    public function test_send_to_token_handles_http_429_rate_limit_with_retry_after(): void
    {
        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'error' => [
                    'code' => 429,
                    'message' => 'Quota exceeded',
                    'status' => 'RESOURCE_EXHAUSTED',
                ],
            ], 429, ['Retry-After' => '120']),
        ]);

        $result = $this->service->sendToToken('token_1234567890', 'Title', 'Body');

        $this->assertFalse($result->isSuccessful());
        $this->assertTrue($result->isRetryable());
        $this->assertEquals(429, $result->getStatusCode());
        $this->assertEquals(120, $result->getRetryAfter());
        $this->assertEquals('RATE_LIMITED', $result->getErrorCode());
    }

    public function test_send_to_token_handles_http_503_temporary_server_error(): void
    {
        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'error' => [
                    'code' => 503,
                    'message' => 'Service Unavailable',
                    'status' => 'UNAVAILABLE',
                ],
            ], 503, ['Retry-After' => '60']),
        ]);

        $result = $this->service->sendToToken('token_1234567890', 'Title', 'Body');

        $this->assertFalse($result->isSuccessful());
        $this->assertTrue($result->isRetryable());
        $this->assertEquals(503, $result->getStatusCode());
        $this->assertEquals(60, $result->getRetryAfter());
        $this->assertEquals('SERVER_ERROR', $result->getErrorCode());
    }

    public function test_send_to_token_respects_fcm_disabled_configuration(): void
    {
        Config::set('services.firebase.fcm_enabled', false);
        Config::set('services.firebase.fcm_test_mode', false);

        Http::fake();

        $result = $this->service->sendToToken('token_1234567890', 'Title', 'Body');

        $this->assertFalse($result->isSuccessful());
        $this->assertEquals('SKIPPED', $result->getErrorCode());
        $this->assertStringContainsString('FCM_ENABLED=false', $result->getErrorMessage());

        // Zero HTTP requests sent to Firebase
        Http::assertNothingSent();
    }

    public function test_send_to_device_skips_inactive_device_registration(): void
    {
        $account = $this->createPatientAccount();
        $inactiveToken = $this->createDeviceToken($account, ['is_active' => false]);

        Http::fake();

        $result = $this->service->sendToDevice($inactiveToken, 'Title', 'Body');

        $this->assertFalse($result->isSuccessful());
        $this->assertEquals('SKIPPED', $result->getErrorCode());
        $this->assertStringContainsString('inactive or revoked', $result->getErrorMessage());

        Http::assertNothingSent();
    }

    public function test_send_to_device_skips_when_patient_account_is_inactive(): void
    {
        $inactiveAccount = $this->createPatientAccount(['is_active' => false]);
        $deviceToken = $this->createDeviceToken($inactiveAccount, ['is_active' => true]);

        Http::fake();

        $result = $this->service->sendToDevice($deviceToken, 'Title', 'Body');

        $this->assertFalse($result->isSuccessful());
        $this->assertEquals('SKIPPED', $result->getErrorCode());
        $this->assertStringContainsString('account is inactive', $result->getErrorMessage());

        Http::assertNothingSent();
    }

    public function test_send_to_account_dispatches_to_all_active_registered_devices(): void
    {
        $account = $this->createPatientAccount();
        $token1 = $this->createDeviceToken($account, ['is_active' => true]);
        $token2 = $this->createDeviceToken($account, ['is_active' => true]);
        $inactiveToken = $this->createDeviceToken($account, ['is_active' => false]);

        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'name' => 'projects/abtc-management-system/messages/accepted_msg_id',
            ], 200),
        ]);

        $results = $this->service->sendToAccount($account, 'Title', 'Body', ['category' => 'general']);

        $this->assertCount(2, $results);
        $this->assertArrayHasKey($token1->id, $results);
        $this->assertArrayHasKey($token2->id, $results);
        $this->assertArrayNotHasKey($inactiveToken->id, $results);

        $this->assertTrue($results[$token1->id]->isSuccessful());
        $this->assertTrue($results[$token2->id]->isSuccessful());

        Http::assertSentCount(2);
    }

    public function test_send_to_account_skips_when_no_active_devices(): void
    {
        $account = $this->createPatientAccount();
        Http::fake();

        $results = $this->service->sendToAccount($account, 'Title', 'Body');

        $this->assertEmpty($results);
        Http::assertNothingSent();
    }

    public function test_send_to_account_rejects_inactive_account(): void
    {
        $inactiveAccount = $this->createPatientAccount(['is_active' => false]);
        $this->createDeviceToken($inactiveAccount, ['is_active' => true]);

        Http::fake();

        $results = $this->service->sendToAccount($inactiveAccount, 'Title', 'Body');

        $this->assertCount(1, $results);
        $this->assertEquals('SKIPPED', $results[0]->getErrorCode());

        Http::assertNothingSent();
    }

    public function test_send_to_account_excludes_unauthorized_or_reassigned_device_tokens(): void
    {
        $accountA = $this->createPatientAccount(['email' => 'a@example.com']);
        $accountB = $this->createPatientAccount(['email' => 'b@example.com']);

        $tokenA = $this->createDeviceToken($accountA, ['is_active' => true]);
        $tokenB = $this->createDeviceToken($accountB, ['is_active' => true]);

        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'name' => 'projects/abtc-management-system/messages/account_a_msg',
            ], 200),
        ]);

        $results = $this->service->sendToAccount($accountA, 'Title', 'Body');

        $this->assertCount(1, $results);
        $this->assertArrayHasKey($tokenA->id, $results);
        $this->assertArrayNotHasKey($tokenB->id, $results);

        Http::assertSentCount(1);
    }
}
