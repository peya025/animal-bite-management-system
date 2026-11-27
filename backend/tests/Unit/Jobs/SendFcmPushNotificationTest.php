<?php

namespace Tests\Unit\Jobs;

use App\Jobs\SendFcmPushNotification;
use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\Messaging\FcmService;
use App\Services\Messaging\Firebase\FcmResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SendFcmPushNotificationTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_job_configuration_and_queue_properties(): void
    {
        $job = new SendFcmPushNotification(
            patientAccountId: 1,
            title: 'Test Title',
            body: 'Test Body',
            data: ['category' => 'general']
        );

        $this->assertEquals(3, $job->tries);
        $this->assertEquals(30, $job->timeout);
        $this->assertEquals([30, 120, 300], $job->backoff);
        $this->assertEquals('fcm', $job->queue);
        $this->assertEquals(config('services.firebase.queue_connection'), $job->connection);
    }

    public function test_job_verifies_account_is_active_before_dispatch(): void
    {
        $inactiveAccount = $this->createPatientAccount(['is_active' => false]);
        $fcmMock = $this->createMock(FcmService::class);
        $fcmMock->expects($this->never())->method('sendToAccount');
        $fcmMock->expects($this->never())->method('sendToDevice');

        $job = new SendFcmPushNotification(
            patientAccountId: $inactiveAccount->id,
            title: 'Test Title',
            body: 'Test Body'
        );

        $job->handle($fcmMock);
    }

    public function test_job_dispatches_to_account_devices(): void
    {
        $account = $this->createPatientAccount(['is_active' => true]);
        $this->createDeviceToken($account);

        $fcmMock = $this->createMock(FcmService::class);
        $fcmMock->expects($this->once())
            ->method('sendToDevice')
            ->with($this->callback(fn ($token) => $token->patient_account_id === $account->id))
            ->willReturn(FcmResult::success('projects/test/messages/msg_123'));

        $job = new SendFcmPushNotification(
            patientAccountId: $account->id,
            title: 'Test Title',
            body: 'Test Body',
            data: ['category' => 'general']
        );

        $job->handle($fcmMock);
    }

    public function test_job_verifies_single_device_ownership_and_active_state(): void
    {
        $accountA = $this->createPatientAccount(['email' => 'a@example.com']);
        $accountB = $this->createPatientAccount(['email' => 'b@example.com']);
        $tokenB = $this->createDeviceToken($accountB);

        $fcmMock = $this->createMock(FcmService::class);
        // Should NOT dispatch because tokenB does not belong to accountA
        $fcmMock->expects($this->never())->method('sendToDevice');

        $job = new SendFcmPushNotification(
            patientAccountId: $accountA->id,
            title: 'Test Title',
            body: 'Test Body',
            deviceTokenId: $tokenB->id
        );

        $job->handle($fcmMock);
    }

    public function test_job_releases_backoff_on_retryable_failure(): void
    {
        $account = $this->createPatientAccount(['is_active' => true]);
        $token = $this->createDeviceToken($account);

        $fcmMock = $this->createMock(FcmService::class);
        $fcmMock->expects($this->once())
            ->method('sendToDevice')
            ->willReturn(FcmResult::failure('RATE_LIMITED', 'Rate limited', 429, isRetryable: true, retryAfter: 45));

        $job = $this->getMockBuilder(SendFcmPushNotification::class)
            ->setConstructorArgs([
                'patientAccountId' => $account->id,
                'title'            => 'Test Title',
                'body'             => 'Test Body',
                'data'             => [],
                'deviceTokenId'    => $token->id,
            ])
            ->onlyMethods(['release', 'attempts'])
            ->getMock();

        $job->method('attempts')->willReturn(1);
        $job->expects($this->once())->method('release')->with(45);

        $job->handle($fcmMock);
    }

    public function test_job_fails_when_retry_attempts_exhausted(): void
    {
        $account = $this->createPatientAccount(['is_active' => true]);
        $token = $this->createDeviceToken($account);

        $fcmMock = $this->createMock(FcmService::class);
        $fcmMock->expects($this->once())
            ->method('sendToDevice')
            ->willReturn(FcmResult::failure('RATE_LIMITED', 'Rate limited', 429, isRetryable: true, retryAfter: 45));

        $job = $this->getMockBuilder(SendFcmPushNotification::class)
            ->setConstructorArgs([
                'patientAccountId' => $account->id,
                'title'            => 'Test Title',
                'body'             => 'Test Body',
                'data'             => [],
                'deviceTokenId'    => $token->id,
            ])
            ->onlyMethods(['release', 'attempts', 'fail'])
            ->getMock();

        $job->method('attempts')->willReturn(3);
        $job->expects($this->never())->method('release');
        $job->expects($this->once())->method('fail')->with($this->isInstanceOf(\RuntimeException::class));

        $job->handle($fcmMock);
    }
}
