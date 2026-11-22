<?php

namespace Tests\Unit\Jobs;

use App\Jobs\SendFcmPushNotification;
use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\Messaging\FcmService;
use App\Services\Messaging\Firebase\FcmResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FcmSecurityAndRetryTest extends TestCase
{
    use RefreshDatabase;

    protected function createPatientAccount(array $attributes = []): PatientAccount
    {
        return PatientAccount::create(array_merge([
            'name'      => 'Juan Dela Cruz',
            'email'     => 'juan' . uniqid() . '@example.com',
            'password'  => bcrypt('password123'),
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

    public function test_partial_retry_targets_only_unsuccessful_devices(): void
    {
        $account = $this->createPatientAccount();
        $deviceA = $this->createDeviceToken($account, ['device_name' => 'Phone A']);
        $deviceB = $this->createDeviceToken($account, ['device_name' => 'Tablet B']);

        $fcmMock = $this->createMock(FcmService::class);

        // Attempt 1: sendToAccount returns deviceA succeeded, deviceB failed retryable
        $fcmMock->expects($this->once())
            ->method('sendToAccount')
            ->willReturn([
                $deviceA->id => FcmResult::success('msg_101'),
                $deviceB->id => FcmResult::failure('UNAVAILABLE', 'Server Busy', 503, isRetryable: true),
            ]);

        $job = $this->getMockBuilder(SendFcmPushNotification::class)
            ->setConstructorArgs([
                'patientAccountId' => $account->id,
                'title'            => 'Vaccination Reminder',
                'body'             => 'You have an upcoming appointment.',
                'data'             => ['category' => 'appointment_reminder'],
            ])
            ->onlyMethods(['release', 'attempts'])
            ->getMock();

        $job->method('attempts')->willReturn(1);
        $job->expects($this->once())->method('release');

        // Execute attempt 1
        $job->handle($fcmMock);

        // Assert deviceA is recorded in deliveredDeviceTokenIds
        $this->assertContains($deviceA->id, $job->deliveredDeviceTokenIds);
        $this->assertNotContains($deviceB->id, $job->deliveredDeviceTokenIds);

        // Now simulate Attempt 2 (retry):
        // Device A MUST NOT be called again! Only Device B should be called via sendToDevice!
        $fcmMock2 = $this->createMock(FcmService::class);
        $fcmMock2->expects($this->never())->method('sendToAccount');

        // Only device B should be retried
        $fcmMock2->expects($this->once())
            ->method('sendToDevice')
            ->with($this->callback(fn ($tok) => $tok->id === $deviceB->id))
            ->willReturn(FcmResult::success('msg_102'));

        $job2 = $this->getMockBuilder(SendFcmPushNotification::class)
            ->setConstructorArgs([
                'patientAccountId' => $account->id,
                'title'            => 'Vaccination Reminder',
                'body'             => 'You have an upcoming appointment.',
                'data'             => ['category' => 'appointment_reminder'],
            ])
            ->onlyMethods(['release', 'attempts'])
            ->getMock();

        // Restore previously delivered token IDs into job state
        $job2->deliveredDeviceTokenIds = $job->deliveredDeviceTokenIds;
        $job2->method('attempts')->willReturn(2);
        $job2->expects($this->never())->method('release');

        // Execute attempt 2
        $job2->handle($fcmMock2);

        // Both devices are now recorded as delivered
        $this->assertContains($deviceA->id, $job2->deliveredDeviceTokenIds);
        $this->assertContains($deviceB->id, $job2->deliveredDeviceTokenIds);
    }

    public function test_persistent_retry_deduplication_survives_worker_restart_and_unserialization(): void
    {
        $account = $this->createPatientAccount();
        $deviceA = $this->createDeviceToken($account, ['device_name' => 'Phone A']);
        $deviceB = $this->createDeviceToken($account, ['device_name' => 'Tablet B']);

        $fcmMock = $this->createMock(FcmService::class);

        // Attempt 1: sendToAccount delivers to deviceA, deviceB fails retryable
        $fcmMock->expects($this->once())
            ->method('sendToAccount')
            ->willReturn([
                $deviceA->id => FcmResult::success('msg_101'),
                $deviceB->id => FcmResult::failure('UNAVAILABLE', 'Server Busy', 503, isRetryable: true),
            ]);

        $idempotencyKey = 'test-idemp-' . uniqid();
        $job1 = $this->getMockBuilder(SendFcmPushNotification::class)
            ->setConstructorArgs([
                'patientAccountId' => $account->id,
                'title'            => 'Vaccination Reminder',
                'body'             => 'You have an upcoming appointment.',
                'data'             => ['category' => 'appointment_reminder'],
                'deviceTokenId'    => null,
                'idempotencyKey'   => $idempotencyKey,
            ])
            ->onlyMethods(['release', 'attempts'])
            ->getMock();

        $job1->method('attempts')->willReturn(1);
        $job1->expects($this->once())->method('release');

        // Execute attempt 1
        $job1->handle($fcmMock);

        $this->assertContains($deviceA->id, $job1->deliveredDeviceTokenIds);

        // Simulate queue worker reboot / process crash:
        // A brand new job instance is deserialized from the queue payload with empty in-memory state:
        $job2 = $this->getMockBuilder(SendFcmPushNotification::class)
            ->setConstructorArgs([
                'patientAccountId' => $account->id,
                'title'            => 'Vaccination Reminder',
                'body'             => 'You have an upcoming appointment.',
                'data'             => ['category' => 'appointment_reminder'],
                'deviceTokenId'    => null,
                'idempotencyKey'   => $idempotencyKey,
            ])
            ->onlyMethods(['release', 'attempts'])
            ->getMock();

        // IN-MEMORY PROPERTY IS EMPTY (as on a worker restart from DB queue)
        $this->assertEmpty($job2->deliveredDeviceTokenIds);

        $fcmMock2 = $this->createMock(FcmService::class);
        $fcmMock2->expects($this->never())->method('sendToAccount');

        // Must NOT send to Device A! Only Device B should be delivered!
        $fcmMock2->expects($this->once())
            ->method('sendToDevice')
            ->with($this->callback(fn ($tok) => $tok->id === $deviceB->id))
            ->willReturn(FcmResult::success('msg_102'));

        $job2->method('attempts')->willReturn(2);
        $job2->expects($this->never())->method('release');

        // Execute attempt 2
        $job2->handle($fcmMock2);

        // Assert that Device A was retrieved from cache and Device B was added
        $this->assertContains($deviceA->id, $job2->deliveredDeviceTokenIds);
        $this->assertContains($deviceB->id, $job2->deliveredDeviceTokenIds);
    }

    public function test_deactivated_account_revokes_device_tokens(): void
    {
        $account = $this->createPatientAccount(['is_active' => true]);
        $device = $this->createDeviceToken($account, ['is_active' => true]);

        $this->assertTrue($device->fresh()->is_active);

        // When account is deleted/deactivated
        app(\App\Services\Mobile\PatientAccountAuthService::class)->deleteAccount($account, 'password123');

        $this->assertFalse($account->fresh()->is_active);
        $this->assertFalse($device->fresh()->is_active);
    }
}
