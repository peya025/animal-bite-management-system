<?php

namespace Tests\Feature\Notifications;

use App\Events\AppointmentStatusChanged;
use App\Jobs\SendFcmPushNotification;
use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Models\User;
use App\Services\AppointmentReminderService;
use App\Services\Messaging\FcmService;
use App\Services\Messaging\Firebase\FirebaseAuthService;
use App\Services\Messaging\Firebase\FcmResult;
use App\Services\Mobile\PatientAccountAuthService;
use App\Services\VaccinationRecordService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class FcmTestAccountAllowlistTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic;
    protected PatientAccount $allowedAccount;
    protected PatientAccount $blockedAccount;
    protected Patient $allowedPatient;
    protected Patient $blockedPatient;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('services.firebase.fcm_enabled', true);
        Config::set('services.firebase.fcm_test_mode', false);
        Config::set('services.firebase.project_id', 'abtc-management-system');
        Config::set('services.firebase.channel_id', 'abtcare_reminders');
        Config::set('services.firebase.allowed_patient_account_ids', '1');
        Config::set('messaging.sms_enabled', true);
        Config::set('messaging.email_enabled', true);
        Config::set('mail.default', 'array');

        $authMock = $this->createMock(FirebaseAuthService::class);
        $authMock->method('validateCredentialsFile')->willReturn([
            'project_id'   => 'abtc-management-system',
            'client_email' => 'firebase-test@abtc-management-system.iam.gserviceaccount.com',
            'type'         => 'service_account',
        ]);
        $authMock->method('getProjectId')->willReturn('abtc-management-system');
        $authMock->method('getAccessToken')->willReturn('mock-oauth-access-token');
        $this->app->instance(FirebaseAuthService::class, $authMock);

        $this->clinic = Clinic::create([
            'name'           => 'Tagoloan Animal Bite Treatment Center',
            'contact_number' => '09171234567',
        ]);

        // Account 1 (Allowlisted)
        $this->allowedAccount = PatientAccount::create([
            'name'      => 'Allowed Patient',
            'email'     => 'allowed@example.com',
            'password'  => bcrypt('password123'),
            'is_active' => true,
        ]);

        $this->allowedPatient = Patient::create([
            'clinic_id'      => $this->clinic->id,
            'patient_number' => 'PAT-ALLOW-001',
            'first_name'     => 'Allowed',
            'last_name'      => 'Patient',
            'gender'         => 'female',
            'contact_number' => '09171111111',
            'email'          => 'allowed@example.com',
            'status'         => 'active',
        ]);

        $this->allowedAccount->patients()->attach($this->allowedPatient->patient_id, [
            'relationship' => 'self',
            'is_primary'   => true,
            'status'       => 'verified',
        ]);

        $this->allowedAccount->deviceTokens()->create([
            'fcm_token'    => 'fcm_allowed_token_1234567890',
            'device_id'    => 'device_allowed',
            'device_type'  => 'android',
            'is_active'    => true,
            'last_used_at' => now(),
        ]);

        // Account 2 (Blocked / Not in allowlist)
        $this->blockedAccount = PatientAccount::create([
            'name'      => 'Blocked Patient',
            'email'     => 'blocked@example.com',
            'password'  => bcrypt('password123'),
            'is_active' => true,
        ]);

        $this->blockedPatient = Patient::create([
            'clinic_id'      => $this->clinic->id,
            'patient_number' => 'PAT-BLOCK-002',
            'first_name'     => 'Blocked',
            'last_name'      => 'Patient',
            'gender'         => 'male',
            'contact_number' => '09172222222',
            'email'          => 'blocked@example.com',
            'status'         => 'active',
        ]);

        $this->blockedAccount->patients()->attach($this->blockedPatient->patient_id, [
            'relationship' => 'self',
            'is_primary'   => true,
            'status'       => 'verified',
        ]);

        $this->blockedAccount->deviceTokens()->create([
            'fcm_token'    => 'fcm_blocked_token_1234567890',
            'device_id'    => 'device_blocked',
            'device_type'  => 'android',
            'is_active'    => true,
            'last_used_at' => now(),
        ]);
    }

    public function test_allowlist_configuration_parsing(): void
    {
        $fcmService = app(FcmService::class);

        // Single integer ID
        Config::set('services.firebase.allowed_patient_account_ids', '1');
        $this->assertEquals([1], $fcmService->getAllowedPatientAccountIds());
        $this->assertTrue($fcmService->isAccountAllowed(1));
        $this->assertTrue($fcmService->isAccountAllowed($this->allowedAccount));
        $this->assertFalse($fcmService->isAccountAllowed(2));
        $this->assertFalse($fcmService->isAccountAllowed($this->blockedAccount));

        // Multiple comma-separated IDs with spaces
        Config::set('services.firebase.allowed_patient_account_ids', ' 1,  2, 5 ');
        $this->assertEquals([1, 2, 5], $fcmService->getAllowedPatientAccountIds());
        $this->assertTrue($fcmService->isAccountAllowed(1));
        $this->assertTrue($fcmService->isAccountAllowed(2));
        $this->assertFalse($fcmService->isAccountAllowed(3));

        // Array format
        Config::set('services.firebase.allowed_patient_account_ids', [1, 7]);
        $this->assertEquals([1, 7], $fcmService->getAllowedPatientAccountIds());
        $this->assertTrue($fcmService->isAccountAllowed(7));
        $this->assertFalse($fcmService->isAccountAllowed(2));

        // Wildcard '*' (unrestricted)
        Config::set('services.firebase.allowed_patient_account_ids', '*');
        $this->assertNull($fcmService->getAllowedPatientAccountIds());
        $this->assertTrue($fcmService->isAccountAllowed(1));
        $this->assertTrue($fcmService->isAccountAllowed(999));

        // Empty string or null (unrestricted)
        Config::set('services.firebase.allowed_patient_account_ids', '');
        $this->assertNull($fcmService->getAllowedPatientAccountIds());
        $this->assertTrue($fcmService->isAccountAllowed(2));

        Config::set('services.firebase.allowed_patient_account_ids', null);
        $this->assertNull($fcmService->getAllowedPatientAccountIds());
        $this->assertTrue($fcmService->isAccountAllowed(2));
    }

    public function test_appointment_confirmation_dispatches_fcm_for_allowlisted_account(): void
    {
        Queue::fake();

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->allowedPatient->patient_id,
            'scheduled_date'       => today()->addDays(2),
            'appointment_date'     => today()->addDays(2),
            'appointment_type'     => 'consultation',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->allowedAccount->id,
        ]);

        $appointment->update(['status' => 'confirmed']);
        AppointmentStatusChanged::dispatch(
            AppointmentStatusChanged::fromModel($appointment->fresh(), 'confirmed', (int) $this->allowedAccount->id)
        );

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) {
            return $job->patientAccountId === $this->allowedAccount->id
                && $job->title === 'Appointment Confirmed';
        });
    }

    public function test_appointment_confirmation_skips_fcm_for_unallowlisted_account(): void
    {
        Queue::fake();

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->blockedPatient->patient_id,
            'scheduled_date'       => today()->addDays(2),
            'appointment_date'     => today()->addDays(2),
            'appointment_type'     => 'consultation',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->blockedAccount->id,
        ]);

        $appointment->update(['status' => 'confirmed']);
        AppointmentStatusChanged::dispatch(
            AppointmentStatusChanged::fromModel($appointment->fresh(), 'confirmed', (int) $this->blockedAccount->id)
        );

        // SendFcmPushNotification MUST NOT be enqueued for blocked Account 2
        Queue::assertNotPushed(SendFcmPushNotification::class);
    }

    public function test_appointment_cancellation_and_reschedule_skip_unallowlisted_account(): void
    {
        Queue::fake();

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->blockedPatient->patient_id,
            'scheduled_date'       => today()->addDays(3),
            'appointment_date'     => today()->addDays(3),
            'appointment_type'     => 'consultation',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->blockedAccount->id,
        ]);

        // Cancelled action
        AppointmentStatusChanged::dispatch(
            AppointmentStatusChanged::fromModel($appointment->fresh(), 'cancelled', (int) $this->blockedAccount->id)
        );

        // Rescheduled action
        AppointmentStatusChanged::dispatch(
            AppointmentStatusChanged::fromModel($appointment->fresh(), 'rescheduled', (int) $this->blockedAccount->id)
        );

        Queue::assertNotPushed(SendFcmPushNotification::class);
    }

    public function test_scheduled_reminder_sweep_dispatches_for_allowlisted_and_skips_unallowlisted(): void
    {
        Queue::fake();

        // Register communication preferences for both
        DB::table('communication_preferences')->insert([
            [
                'patient_id'  => $this->allowedPatient->patient_id,
                'sms'         => true,
                'email'       => true,
                'recorded_by' => 1,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'patient_id'  => $this->blockedPatient->patient_id,
                'sms'         => true,
                'email'       => true,
                'recorded_by' => 1,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ]);

        // Advance appointment for allowlisted account
        $apptAllowed = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->allowedPatient->patient_id,
            'scheduled_date'       => today()->addDay(),
            'appointment_date'     => today()->addDay(),
            'appointment_type'     => 'vaccination',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->allowedAccount->id,
        ]);

        // Advance appointment for blocked account
        $apptBlocked = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->blockedPatient->patient_id,
            'scheduled_date'       => today()->addDay(),
            'appointment_date'     => today()->addDay(),
            'appointment_type'     => 'vaccination',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->blockedAccount->id,
        ]);

        // Run automated sweep
        Artisan::call('appointments:auto-recall', ['--channel' => 'all']);

        // In-app Notification rows exist for BOTH patients (clinical records intact)
        $this->assertEquals(1, Notification::where('patient_id', $this->allowedPatient->patient_id)->count());
        $this->assertEquals(1, Notification::where('patient_id', $this->blockedPatient->patient_id)->count());

        // But FCM push notification is ONLY pushed for the allowlisted account (Account 1)
        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) {
            return $job->patientAccountId === $this->allowedAccount->id;
        });

        Queue::assertNotPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) {
            return $job->patientAccountId === $this->blockedAccount->id;
        });
    }

    public function test_follow_up_vaccination_auto_schedule_dispatches_only_for_allowlisted(): void
    {
        Queue::fake();

        $user = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role'      => 'treatment',
        ]);

        $biteBlocked = BiteIncident::create([
            'clinic_id'         => $this->clinic->id,
            'patient_id'        => $this->blockedPatient->patient_id,
            'bite_date'         => today(),
            'created_by'        => $user->id,
            'exposure_category' => 'II',
            'case_number'       => 'CASE-BLOCKED-' . uniqid(),
        ]);

        $doses = [
            [
                'period'       => 'Day 0',
                'date'         => today()->toDateString(),
                'vaccine_type' => 'Speeda',
            ],
        ];

        $vaccinationRecordService = app(VaccinationRecordService::class);
        $vaccinationRecordService->createFollowUpAppointments(
            clinicId: $this->clinic->id,
            patientId: $this->blockedPatient->patient_id,
            biteId: $biteBlocked->bite_id,
            userId: $user->id,
            doses: $doses,
            validated: []
        );

        // 2 clinic-side appointment_event notifications + 1 consolidated patient vaccination_reminder notification
        $this->assertEquals(3, Notification::where('patient_id', $this->blockedPatient->patient_id)->count());
        $patientReminder = Notification::where('patient_id', $this->blockedPatient->patient_id)
            ->where('type', 'vaccination_reminder')
            ->firstOrFail();
        $this->assertStringContainsString('Day 3', $patientReminder->message);
        $this->assertStringContainsString('Day 7', $patientReminder->message);

        // But FCM was NOT enqueued because account is not allowlisted
        Queue::assertNotPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) {
            return $job->patientAccountId === $this->blockedAccount->id;
        });
    }

    public function test_queued_job_skips_execution_for_unallowlisted_account(): void
    {
        Http::fake();

        $job = new SendFcmPushNotification(
            patientAccountId: $this->blockedAccount->id,
            title: 'Test Notification',
            body: 'This should not be sent.',
            data: ['category' => 'general']
        );

        $fcmService = app(FcmService::class);
        $job->handle($fcmService);

        // Zero HTTP requests sent to Firebase
        Http::assertNothingSent();
    }

    public function test_direct_fcm_service_skips_unallowlisted_account_for_automatic_delivery(): void
    {
        Http::fake();

        $fcmService = app(FcmService::class);
        $results = $fcmService->sendToAccount(
            account: $this->blockedAccount,
            title: 'Automatic Alert',
            body: 'Blocked account body',
            data: ['category' => 'general'],
            isControlledTest: false
        );

        $this->assertCount(1, $results);
        $this->assertEquals('SKIPPED', $results[0]->getErrorCode());
        $this->assertStringContainsString('not in the automatic FCM allowlist', $results[0]->getErrorMessage());

        Http::assertNothingSent();
    }

    public function test_direct_fcm_service_permits_unallowlisted_account_for_controlled_test(): void
    {
        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'name' => 'projects/abtc-management-system/messages/controlled_test_id',
            ], 200),
        ]);

        $fcmService = app(FcmService::class);
        $results = $fcmService->sendToAccount(
            account: $this->blockedAccount,
            title: 'Manual Test Alert',
            body: 'Controlled test body',
            data: ['category' => 'general'],
            isControlledTest: true
        );

        $this->assertNotEmpty($results);
        $deviceToken = $this->blockedAccount->deviceTokens()->first();
        $this->assertTrue($results[$deviceToken->id]->isSuccessful());

        Http::assertSentCount(1);
    }

    public function test_fcm_test_command_displays_allowlist_status_and_executes(): void
    {
        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'name' => 'projects/abtc-management-system/messages/dry_run_message',
            ], 200),
        ]);

        // Target Allowlisted Account 1
        $this->artisan('fcm:test', [
            '--account' => $this->allowedAccount->id,
            '--dry-run' => true,
        ])
            ->expectsOutputToContain('FCM Allowlist:      1')
            ->expectsOutputToContain("Target: Account [{$this->allowedAccount->id}]")
            ->assertExitCode(0);

        // Target Blocked Account 2 via manual CLI command
        $this->artisan('fcm:test', [
            '--account' => $this->blockedAccount->id,
            '--dry-run' => true,
        ])
            ->expectsOutputToContain('FCM Allowlist:      1')
            ->expectsOutputToContain("Notice: Account [{$this->blockedAccount->id}] is not in the automatic FCM allowlist, but testing is permitted via controlled test command.")
            ->assertExitCode(0);
    }

    public function test_digital_vaccination_card_update_skips_unallowlisted_account(): void
    {
        $fcmService = app(FcmService::class);
        $this->assertFalse($fcmService->isAccountAllowed($this->blockedAccount));
        $this->assertTrue($fcmService->isAccountAllowed($this->allowedAccount));

        Queue::fake();

        // Blocked account queue dispatch is skipped
        $fcmService->queueToAccount(
            $this->blockedAccount,
            'Vaccination Card Updated',
            'Your digital vaccination card has been updated. Open the app to view your record.',
            ['category' => 'digital_card', 'route' => '/menu']
        );

        Queue::assertNotPushed(SendFcmPushNotification::class);

        // Allowed account queue dispatch succeeds
        $fcmService->queueToAccount(
            $this->allowedAccount,
            'Vaccination Card Updated',
            'Your digital vaccination card has been updated. Open the app to view your record.',
            ['category' => 'digital_card', 'route' => '/menu']
        );

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) {
            return $job->patientAccountId === $this->allowedAccount->id
                && $job->data['category'] === 'digital_card';
        });
    }

    public function test_password_change_security_alert_skips_unallowlisted_account(): void
    {
        Queue::fake();

        $authService = app(PatientAccountAuthService::class);
        $authService->changePassword($this->blockedAccount, 'password123', 'newpassword456');

        // SendFcmPushNotification must not be dispatched for blocked account
        Queue::assertNotPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) {
            return $job->patientAccountId === $this->blockedAccount->id;
        });
    }
}
