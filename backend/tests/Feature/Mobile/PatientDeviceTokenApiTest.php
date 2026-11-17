<?php

namespace Tests\Feature\Mobile;

use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientDeviceTokenApiTest extends TestCase
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

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->postJson('/api/mobile/device-token', [
            'fcm_token' => 'fcm_token_sample_1234567890',
        ]);

        $response->assertStatus(401);

        $deleteResponse = $this->deleteJson('/api/mobile/device-token', [
            'fcm_token' => 'fcm_token_sample_1234567890',
        ]);

        $deleteResponse->assertStatus(401);
    }

    public function test_staff_user_cannot_access_mobile_device_token_endpoints(): void
    {
        $staff = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        $response = $this->actingAs($staff, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token' => 'fcm_token_sample_1234567890',
        ]);

        $response->assertStatus(403);
        $response->assertJson(['message' => 'Patient account authentication is required.']);

        $deleteResponse = $this->actingAs($staff, 'sanctum')->deleteJson('/api/mobile/device-token', [
            'fcm_token' => 'fcm_token_sample_1234567890',
        ]);

        $deleteResponse->assertStatus(403);
    }

    public function test_registration_validation_rules(): void
    {
        $account = $this->createPatientAccount();

        // Missing fcm_token
        $response = $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['fcm_token']);

        // Invalid device_type
        $invalidTypeResponse = $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token'   => 'fcm_token_sample_1234567890',
            'device_type' => 'windows_phone',
        ]);
        $invalidTypeResponse->assertStatus(422);
        $invalidTypeResponse->assertJsonValidationErrors(['device_type']);

        // Token too short
        $shortResponse = $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token' => 'short',
        ]);
        $shortResponse->assertStatus(422);
        $shortResponse->assertJsonValidationErrors(['fcm_token']);

        // Token exceeds 500 characters database column limit
        $overlongResponse = $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token' => str_repeat('a', 501),
        ]);
        $overlongResponse->assertStatus(422);
        $overlongResponse->assertJsonValidationErrors(['fcm_token']);
    }

    public function test_successful_device_token_registration_masks_token(): void
    {
        $account = $this->createPatientAccount();
        $fullToken = 'fcm_token_super_secret_abcdef1234567890_patient_device';

        $response = $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token'   => $fullToken,
            'device_id'   => 'android_inst_998877',
            'device_type' => 'android',
            'device_name' => 'Pixel 7 Pro',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status'  => 'success',
            'message' => 'Device token registered successfully.',
            'device'  => [
                'device_type'  => 'android',
                'device_name'  => 'Pixel 7 Pro',
                'masked_token' => 'fcm_to...vice',
            ],
        ]);

        // Ensure full token is NOT exposed in response JSON
        $this->assertStringNotContainsString($fullToken, $response->getContent());

        // Verify stored in database
        $this->assertDatabaseHas('patient_device_tokens', [
            'patient_account_id' => $account->id,
            'fcm_token'          => $fullToken,
            'device_id'          => 'android_inst_998877',
            'device_type'        => 'android',
            'device_name'        => 'Pixel 7 Pro',
            'is_active'          => true,
        ]);
    }

    public function test_repeated_registration_is_idempotent(): void
    {
        $account = $this->createPatientAccount();
        $fullToken = 'fcm_idempotent_token_test_1234567890';

        // First registration
        $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token'   => $fullToken,
            'device_id'   => 'inst_1',
            'device_type' => 'android',
        ])->assertStatus(200);

        // Second registration with same token
        $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token'   => $fullToken,
            'device_id'   => 'inst_1',
            'device_type' => 'android',
            'device_name' => 'Updated Device Name',
        ])->assertStatus(200);

        // Still exactly 1 row
        $this->assertDatabaseCount('patient_device_tokens', 1);
        $this->assertDatabaseHas('patient_device_tokens', [
            'patient_account_id' => $account->id,
            'fcm_token'          => $fullToken,
            'device_name'        => 'Updated Device Name',
        ]);
    }

    public function test_supports_multiple_devices_under_one_patient_account(): void
    {
        $account = $this->createPatientAccount();

        // Phone
        $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token'   => 'phone_fcm_token_1234567890',
            'device_id'   => 'phone_device_1',
            'device_type' => 'android',
            'device_name' => 'Galaxy S23',
        ])->assertStatus(200);

        // Tablet
        $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token'   => 'tablet_fcm_token_1234567890',
            'device_id'   => 'tablet_device_2',
            'device_type' => 'android',
            'device_name' => 'Galaxy Tab S9',
        ])->assertStatus(200);

        $this->assertDatabaseCount('patient_device_tokens', 2);
        $this->assertEquals(2, $account->deviceTokens()->count());
    }

    public function test_token_rotation_removes_old_token_for_same_device(): void
    {
        $account = $this->createPatientAccount();
        $deviceId = 'unique_hardware_uuid_123';

        // Old token
        $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token'   => 'old_token_before_rotation_123456',
            'device_id'   => $deviceId,
            'device_type' => 'android',
        ])->assertStatus(200);

        $this->assertDatabaseHas('patient_device_tokens', [
            'fcm_token' => 'old_token_before_rotation_123456',
        ]);

        // Rotated new token from FCM on same hardware device
        $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token'   => 'new_rotated_fcm_token_789012345',
            'device_id'   => $deviceId,
            'device_type' => 'android',
        ])->assertStatus(200);

        // Old token should be removed, new token present
        $this->assertDatabaseMissing('patient_device_tokens', [
            'fcm_token' => 'old_token_before_rotation_123456',
        ]);
        $this->assertDatabaseHas('patient_device_tokens', [
            'fcm_token' => 'new_rotated_fcm_token_789012345',
            'device_id' => $deviceId,
        ]);
        $this->assertDatabaseCount('patient_device_tokens', 1);
    }

    public function test_account_switching_disassociates_token_from_previous_account(): void
    {
        $accountA = $this->createPatientAccount(['email' => 'patientA@example.com']);
        $accountB = $this->createPatientAccount(['email' => 'patientB@example.com']);
        $sharedToken = 'shared_hardware_device_fcm_token_12345';

        // Account A registers device
        $this->actingAs($accountA, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token' => $sharedToken,
            'device_id' => 'shared_phone_1',
        ])->assertStatus(200);

        $this->assertDatabaseHas('patient_device_tokens', [
            'patient_account_id' => $accountA->id,
            'fcm_token'          => $sharedToken,
        ]);

        // Account B logs in on same phone and registers device
        $this->actingAs($accountB, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token' => $sharedToken,
            'device_id' => 'shared_phone_1',
        ])->assertStatus(200);

        // Account A must no longer have this token!
        $this->assertDatabaseMissing('patient_device_tokens', [
            'patient_account_id' => $accountA->id,
            'fcm_token'          => $sharedToken,
        ]);

        // Account B owns the token
        $this->assertDatabaseHas('patient_device_tokens', [
            'patient_account_id' => $accountB->id,
            'fcm_token'          => $sharedToken,
        ]);

        $this->assertDatabaseCount('patient_device_tokens', 1);
    }

    public function test_delete_device_token_removes_registration_on_logout(): void
    {
        $account = $this->createPatientAccount();
        $token = 'logout_fcm_token_to_remove_12345678';

        $this->actingAs($account, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token' => $token,
        ])->assertStatus(200);

        $this->assertDatabaseHas('patient_device_tokens', [
            'patient_account_id' => $account->id,
            'fcm_token'          => $token,
        ]);

        // Logout call to delete device token
        $response = $this->actingAs($account, 'sanctum')->deleteJson('/api/mobile/device-token', [
            'fcm_token' => $token,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status'  => 'success',
            'message' => 'Device registration removed successfully.',
        ]);

        $this->assertDatabaseMissing('patient_device_tokens', [
            'fcm_token' => $token,
        ]);
    }

    public function test_cross_account_deletion_prevention(): void
    {
        $accountA = $this->createPatientAccount(['email' => 'ownerA@example.com']);
        $accountB = $this->createPatientAccount(['email' => 'intruderB@example.com']);

        $tokenA = 'account_a_secure_token_999999999';

        // Account A registers device
        $this->actingAs($accountA, 'sanctum')->postJson('/api/mobile/device-token', [
            'fcm_token' => $tokenA,
        ])->assertStatus(200);

        // Account B attempts to delete Account A's token
        $response = $this->actingAs($accountB, 'sanctum')->deleteJson('/api/mobile/device-token', [
            'fcm_token' => $tokenA,
        ]);

        // Endpoint succeeds idempotently without error...
        $response->assertStatus(200);

        // ...but Account A's token is NOT deleted because deletion is strictly scoped to authenticated user!
        $this->assertDatabaseHas('patient_device_tokens', [
            'patient_account_id' => $accountA->id,
            'fcm_token'          => $tokenA,
        ]);
    }
}
