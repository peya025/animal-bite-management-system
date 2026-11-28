<?php

namespace Tests\Feature\Notifications;

use App\Events\AppointmentStatusChanged;
use App\Jobs\SendFcmPushNotification;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\AppointmentReminderService;
use App\Services\Messaging\FcmService;
use App\Services\Messaging\Firebase\FcmResult;
use App\Services\Mobile\MobileAppointmentService;
use App\Services\VaccinationRecordService;
use App\Services\VaccinationScheduleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AutomatedFcmNotificationTriggersTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic;
    protected PatientAccount $account;
    protected Patient $patient;
    protected PatientDeviceToken $deviceToken;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.firebase.fcm_enabled' => true,
            'services.firebase.fcm_test_mode' => false,
            'services.firebase.project_id' => 'abtc-management-system',
            'services.firebase.channel_id' => 'abtcare_reminders',
            'messaging.sms_enabled' => true,
            'messaging.email_enabled' => true,
            'mail.default' => 'array',
        ]);

        $authMock = $this->createMock(\App\Services\Messaging\Firebase\FirebaseAuthService::class);
        $authMock->method('getProjectId')->willReturn('abtc-management-system');
        $authMock->method('getAccessToken')->willReturn('mock-oauth-access-token');
        $this->app->instance(\App\Services\Messaging\Firebase\FirebaseAuthService::class, $authMock);

        $this->clinic = Clinic::create([
            'name'           => 'Tagoloan Animal Bite Treatment Center',
            'contact_number' => '09171234567',
        ]);

        $this->account = PatientAccount::create([
            'name'      => 'Maria Santos',
            'email'     => 'maria' . uniqid() . '@example.com',
            'password'  => bcrypt('password123'),
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'clinic_id'      => $this->clinic->id,
            'patient_number' => 'PAT-' . uniqid(),
            'first_name'     => 'Maria',
            'last_name'      => 'Santos',
            'gender'         => 'female',
            'contact_number' => '09171234567',
            'email'          => 'maria@example.com',
            'status'         => 'active',
        ]);

        $this->account->patients()->attach($this->patient->patient_id, [
            'relationship' => 'self',
            'is_primary'   => true,
            'status'       => 'verified',
        ]);

        $this->deviceToken = $this->account->deviceTokens()->create([
            'fcm_token'    => 'fcm_token_test_' . uniqid() . '_1234567890',
            'device_id'    => 'device_' . uniqid(),
            'device_type'  => 'android',
            'device_name'  => 'Pixel 8',
            'is_active'    => true,
            'last_used_at' => now(),
        ]);
    }

    public function test_appointment_confirmation_triggers_fcm(): void
    {
        Queue::fake();

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'scheduled_date'       => today()->addDays(2),
            'appointment_date'     => today()->addDays(2),
            'appointment_type'     => 'consultation',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->account->id,
        ]);

        // Confirmation action dispatches AppointmentStatusChanged
        $appointment->update(['status' => 'confirmed']);
        AppointmentStatusChanged::dispatch(
            AppointmentStatusChanged::fromModel($appointment->fresh(), 'confirmed', (int) $this->account->id)
        );

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) use ($appointment) {
            $this->assertEquals($this->account->id, $job->patientAccountId);
            $this->assertEquals('Appointment Confirmed', $job->title);
            $this->assertEquals('Your appointment has been confirmed. Open the app to view your details.', $job->body);
            $this->assertEquals('appointment', $job->data['category']);
            $this->assertEquals('/appointments', $job->data['route']);
            $this->assertEquals((string) $appointment->appointment_id, $job->data['appointment_id']);

            // Zero PHI
            $this->assertStringNotContainsString('Maria', $job->body);
            $this->assertStringNotContainsString('Santos', $job->body);
            return true;
        });
    }

    public function test_appointment_cancellation_triggers_fcm(): void
    {
        Queue::fake();

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'scheduled_date'       => today()->addDays(3),
            'appointment_date'     => today()->addDays(3),
            'appointment_type'     => 'consultation',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->account->id,
        ]);

        $mobileService = app(MobileAppointmentService::class);
        $mobileService->cancelAppointment($this->account, $appointment->appointment_id, 'Change of schedule');

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) use ($appointment) {
            $this->assertEquals($this->account->id, $job->patientAccountId);
            $this->assertEquals('Appointment Cancelled', $job->title);
            $this->assertEquals('Your appointment has been cancelled. Open the app for more information.', $job->body);
            $this->assertEquals('appointment_cancelled', $job->data['category']);
            $this->assertEquals('/appointments', $job->data['route']);
            $this->assertEquals((string) $appointment->appointment_id, $job->data['appointment_id']);
            return true;
        });
    }

    public function test_appointment_rescheduling_triggers_fcm(): void
    {
        Queue::fake();

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'scheduled_date'       => today()->addDays(3),
            'appointment_date'     => today()->addDays(3),
            'appointment_type'     => 'vaccination',
            'dose_number'          => 3,
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->account->id,
        ]);

        $newDate = today()->addDays(4)->toDateString();
        $appointment->update([
            'scheduled_date'   => $newDate,
            'appointment_date' => $newDate,
        ]);

        AppointmentStatusChanged::dispatch(
            AppointmentStatusChanged::fromModel($appointment->fresh(), 'rescheduled', (int) $this->account->id)
        );

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) use ($appointment) {
            $this->assertEquals($this->account->id, $job->patientAccountId);
            $this->assertEquals('Appointment Updated', $job->title);
            $this->assertEquals('Your appointment schedule has changed. Open the app to view your updated schedule.', $job->body);
            $this->assertEquals('appointment_rescheduled', $job->data['category']);
            $this->assertEquals('/appointments', $job->data['route']);
            $this->assertEquals((string) $appointment->appointment_id, $job->data['appointment_id']);
            return true;
        });
    }

    public function test_upcoming_vaccination_reminder_triggers_fcm(): void
    {
        Queue::fake();

        DB::table('communication_preferences')->insert([
            'patient_id'  => $this->patient->patient_id,
            'sms'         => true,
            'email'       => true,
            'recorded_by' => 1,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'scheduled_date'       => today()->addDay(),
            'appointment_date'     => today()->addDay(),
            'appointment_type'     => 'vaccination',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->account->id,
        ]);

        $reminderService = app(AppointmentReminderService::class);
        $res = $reminderService->sendAdvanceReminder($appointment, 'all');

        $this->assertTrue($res['success']);

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) use ($appointment) {
            $this->assertEquals($this->account->id, $job->patientAccountId);
            $this->assertEquals('Vaccination Reminder', $job->title);
            $this->assertEquals('You have an upcoming appointment. Open the app to view your schedule.', $job->body);
            $this->assertEquals('appointment_reminder', $job->data['category']);
            $this->assertEquals('/calendar', $job->data['route']);
            $this->assertEquals((string) $appointment->appointment_id, $job->data['appointment_id']);
            return true;
        });
    }

    public function test_overdue_appointment_reminder_triggers_fcm(): void
    {
        Queue::fake();

        DB::table('communication_preferences')->insert([
            'patient_id'  => $this->patient->patient_id,
            'sms'         => true,
            'email'       => true,
            'recorded_by' => 1,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'scheduled_date'       => today()->subDays(2),
            'appointment_date'     => today()->subDays(2),
            'appointment_type'     => 'vaccination',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->account->id,
        ]);

        $reminderService = app(AppointmentReminderService::class);
        $res = $reminderService->sendRecallAlert($appointment, 'all');

        $this->assertTrue($res['success']);

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) use ($appointment) {
            $this->assertEquals($this->account->id, $job->patientAccountId);
            $this->assertEquals('Vaccination Reminder', $job->title);
            $this->assertEquals('You have an overdue appointment. Open the app to view your schedule.', $job->body);
            $this->assertEquals('appointment_reminder', $job->data['category']);
            $this->assertEquals('/calendar', $job->data['route']);
            $this->assertEquals((string) $appointment->appointment_id, $job->data['appointment_id']);
            return true;
        });
    }

    public function test_disabled_notification_preferences_prevent_delivery(): void
    {
        $fcmMock = $this->createMock(FcmService::class);
        $fcmMock->expects($this->never())->method('sendToDevice');
        $fcmMock->expects($this->never())->method('sendToAccount');

        // Disable reminders category in patient account preferences
        $this->account->updateNotificationPreferences([
            'reminders' => false,
        ]);

        $job = new SendFcmPushNotification(
            patientAccountId: $this->account->id,
            title: 'Vaccination Reminder',
            body: 'You have an upcoming appointment. Open the app to view your schedule.',
            data: [
                'category' => 'vaccination_due',
                'route'    => '/calendar',
            ]
        );

        $job->handle($fcmMock);

        // Also test master push toggle disabled
        $this->account->updateNotificationPreferences([
            'push_enabled' => false,
            'reminders'    => true,
        ]);

        $jobMaster = new SendFcmPushNotification(
            patientAccountId: $this->account->id,
            title: 'Appointment Confirmed',
            body: 'Your appointment has been confirmed.',
            data: [
                'category' => 'appointment',
                'route'    => '/appointments',
            ]
        );

        $jobMaster->handle($fcmMock);
    }

    public function test_inactive_devices_are_excluded(): void
    {
        $this->deviceToken->update(['is_active' => false]);

        $fcmService = app(FcmService::class);
        $res = $fcmService->sendToDevice(
            deviceToken: $this->deviceToken,
            title: 'Test Title',
            body: 'Test Body',
            data: ['category' => 'general']
        );

        $this->assertTrue($res->isSkipped());
        $this->assertStringContainsString('inactive', $res->getSkippedReason());
    }

    public function test_unauthorized_patient_accounts_are_excluded(): void
    {
        // Account B owns a device token
        $accountB = PatientAccount::create([
            'name'      => 'Unauthorized Account',
            'email'     => 'unauth' . uniqid() . '@example.com',
            'password'  => bcrypt('password123'),
            'is_active' => true,
        ]);

        $tokenB = $accountB->deviceTokens()->create([
            'fcm_token'    => 'fcm_token_b_' . uniqid(),
            'device_type'  => 'android',
            'is_active'    => true,
            'last_used_at' => now(),
        ]);

        $fcmMock = $this->createMock(FcmService::class);
        $fcmMock->expects($this->never())->method('sendToDevice');

        // Trying to dispatch using account A with account B's device token ID must abort
        $job = new SendFcmPushNotification(
            patientAccountId: $this->account->id,
            title: 'Appointment Confirmed',
            body: 'Your appointment has been confirmed.',
            deviceTokenId: $tokenB->id
        );

        $job->handle($fcmMock);
    }

    public function test_duplicate_business_events_do_not_trigger_duplicate_notifications(): void
    {
        DB::table('communication_preferences')->insert([
            'patient_id'  => $this->patient->patient_id,
            'sms'         => true,
            'email'       => true,
            'recorded_by' => 1,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'scheduled_date'       => today()->addDay(),
            'appointment_date'     => today()->addDay(),
            'appointment_type'     => 'vaccination',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->account->id,
        ]);

        $reminderService = app(AppointmentReminderService::class);

        // Run sweep twice in same day
        $res1 = $reminderService->sendAdvanceReminder($appointment, 'in_app');
        $res2 = $reminderService->sendAdvanceReminder($appointment, 'in_app');

        $this->assertTrue($res1['success']);
        // Second call finds existing idempotent outbound message; does not create a second OutboundMessage
        $this->assertEquals(1, DB::table('outbound_messages')->where('appointment_id', $appointment->appointment_id)->count());
        $this->assertEquals(1, Notification::where('appointment_id', $appointment->appointment_id)->count());
    }

    public function test_rolled_back_transactions_do_not_trigger_fcm(): void
    {
        Queue::fake();

        try {
            DB::transaction(function () {
                $appointment = Appointment::create([
                    'clinic_id'            => $this->clinic->id,
                    'patient_id'           => $this->patient->patient_id,
                    'scheduled_date'       => today()->addDays(5),
                    'appointment_date'     => today()->addDays(5),
                    'appointment_type'     => 'consultation',
                    'status'               => 'scheduled',
                    'booked_by_account_id' => $this->account->id,
                ]);

                AppointmentStatusChanged::dispatch(
                    AppointmentStatusChanged::fromModel($appointment, 'confirmed', (int) $this->account->id)
                );

                // Simulate unexpected failure before commit
                throw new \RuntimeException('Simulated rollback error');
            });
        } catch (\RuntimeException) {
            // Expected
        }

        // Because AppointmentStatusChanged and SendFcmPushNotification use afterCommit,
        // no FCM push job is queued on rollback
        Queue::assertNothingPushed();
    }

    public function test_fcm_failures_do_not_interrupt_clinical_transactions(): void
    {
        // Simulate Firebase HTTP 500 server error
        Http::fake([
            'https://fcm.googleapis.com/*' => Http::response([
                'error' => ['code' => 500, 'message' => 'Internal server error'],
            ], 500),
        ]);

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'scheduled_date'       => today()->addDays(3),
            'appointment_date'     => today()->addDays(3),
            'appointment_type'     => 'consultation',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->account->id,
        ]);

        // Clinical status update proceeds cleanly without crashing
        $appointment->update(['status' => 'confirmed']);
        $this->assertEquals('confirmed', $appointment->fresh()->status);

        // Job fails gracefully without throwing an unhandled exception to the clinical layer
        $job = new SendFcmPushNotification(
            patientAccountId: $this->account->id,
            title: 'Appointment Confirmed',
            body: 'Your appointment has been confirmed.',
            data: ['category' => 'appointment'],
            deviceTokenId: $this->deviceToken->id
        );

        $job->handle(app(FcmService::class));
        $this->assertTrue(true, 'Clinical flow was uninterrupted by FCM server error.');
    }

    public function test_disabled_fcm_configuration_prevents_automated_live_sends(): void
    {
        config(['services.firebase.fcm_enabled' => false, 'services.firebase.fcm_test_mode' => false]);
        Http::preventStrayRequests();

        $fcmService = app(FcmService::class);
        $result = $fcmService->sendToToken(
            token: 'sample_token_xyz',
            title: 'Test Title',
            body: 'Test Body',
            data: ['category' => 'general']
        );

        $this->assertTrue($result->isSkipped());
        $this->assertStringContainsString('disabled in application configuration', $result->getSkippedReason());
        Http::assertNothingSent();
    }

    public function test_push_notification_payloads_contain_no_sensitive_clinical_information(): void
    {
        $fcmService = app(FcmService::class);

        $rawPayload = [
            'category'          => 'appointment_reminder',
            'route'             => '/appointments',
            'appointment_id'    => '42',
            // PHI fields that should be stripped
            'patient_name'      => 'Maria Santos',
            'diagnosis'         => 'Category III Bite Exposure',
            'exposure_category' => 'Category III',
            'medical_history'   => 'Hypertension, Rabies Post-Exposure',
            'contact_number'    => '09171234567',
        ];

        $sanitized = $fcmService->validateAndSanitizeData($rawPayload);

        $this->assertArrayHasKey('category', $sanitized);
        $this->assertArrayHasKey('route', $sanitized);
        $this->assertArrayHasKey('appointment_id', $sanitized);

        $this->assertArrayNotHasKey('patient_name', $sanitized);
        $this->assertArrayNotHasKey('diagnosis', $sanitized);
        $this->assertArrayNotHasKey('exposure_category', $sanitized);
        $this->assertArrayNotHasKey('medical_history', $sanitized);
        $this->assertArrayNotHasKey('contact_number', $sanitized);
    }

    public function test_generic_404_project_not_found_does_not_deactivate_valid_token(): void
    {
        Http::fake([
            'https://fcm.googleapis.com/*' => Http::response([
                'error' => [
                    'code'    => 404,
                    'message' => 'Project "abtc-management-system" not found.',
                    'status'  => 'NOT_FOUND',
                ],
            ], 404),
        ]);

        $this->assertTrue($this->deviceToken->fresh()->is_active);

        $result = app(FcmService::class)->sendToDevice(
            deviceToken: $this->deviceToken,
            title: 'Appointment Confirmed',
            body: 'Your appointment has been confirmed.'
        );

        $this->assertFalse($result->isSuccessful());
        $this->assertFalse($result->isUnregistered());
        $this->assertEquals('ENDPOINT_OR_PROJECT_NOT_FOUND', $result->getErrorCode());

        // Token MUST remain active because 404 was generic project/endpoint, not an unregistered device token
        $this->assertTrue($this->deviceToken->fresh()->is_active);
    }

    public function test_patient_account_notification_preferences_api(): void
    {
        // Get preferences
        $response = $this->actingAs($this->account, 'sanctum')->getJson('/api/mobile/notification-preferences');
        $response->assertStatus(200);
        $response->assertJson([
            'status'      => 'success',
            'preferences' => [
                'push_enabled'        => true,
                'appointment_updates' => true,
                'reminders'           => true,
                'digital_card'        => true,
                'announcements'       => true,
            ],
        ]);

        // Update preferences
        $updateResponse = $this->actingAs($this->account, 'sanctum')->putJson('/api/mobile/notification-preferences', [
            'push_enabled' => false,
            'reminders'    => false,
        ]);

        $updateResponse->assertStatus(200);
        $updateResponse->assertJson([
            'status'      => 'success',
            'preferences' => [
                'push_enabled'        => false,
                'reminders'           => false,
                'appointment_updates' => true,
            ],
        ]);

        $this->assertFalse($this->account->fresh()->allowsNotificationCategory('vaccination_due'));
        $this->assertFalse($this->account->fresh()->allowsNotificationCategory('appointment'));
    }

    public function test_follow_up_vaccination_appointment_auto_schedule_triggers_fcm(): void
    {
        Queue::fake();

        $user = \App\Models\User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role'      => 'treatment',
        ]);

        $biteIncident = \App\Models\BiteIncident::create([
            'clinic_id'         => $this->clinic->id,
            'patient_id'        => $this->patient->patient_id,
            'bite_date'         => today(),
            'created_by'        => $user->id,
            'exposure_category' => 'II',
            'case_number'       => 'CASE-' . uniqid(),
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
            patientId: $this->patient->patient_id,
            biteId: $biteIncident->bite_id,
            userId: $user->id,
            doses: $doses,
            validated: []
        );

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) {
            $this->assertEquals($this->account->id, $job->patientAccountId);
            $this->assertEquals('Vaccination Reminder', $job->title);
            $this->assertEquals('You have an upcoming appointment. Open the app to view your schedule.', $job->body);
            $this->assertEquals('vaccination_schedule', $job->data['category']);
            $this->assertEquals('/calendar', $job->data['route']);
            return true;
        });
    }

    public function test_security_alert_fcm_on_password_change(): void
    {
        Queue::fake();

        $authService = app(\App\Services\Mobile\PatientAccountAuthService::class);
        $authService->changePassword($this->account, 'password123', 'newpassword456');

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) {
            $this->assertEquals($this->account->id, $job->patientAccountId);
            $this->assertEquals('Security Alert', $job->title);
            $this->assertEquals('Your account password has been changed. Open the app if this was not you.', $job->body);
            $this->assertEquals('general', $job->data['category']);
            $this->assertEquals('/settings', $job->data['route']);
            return true;
        });
    }

    public function test_dependent_profile_notifications_delivered_strictly_to_authorized_account(): void
    {
        Queue::fake();

        // Dependent child patient
        $child = Patient::create([
            'clinic_id'      => $this->clinic->id,
            'patient_number' => 'PAT-CHILD-' . uniqid(),
            'first_name'     => 'Baby',
            'last_name'      => 'Santos',
            'gender'         => 'male',
            'status'         => 'active',
        ]);

        // Attached to Maria Santos (parent)
        $this->account->patients()->attach($child->patient_id, [
            'relationship' => 'child',
            'is_primary'   => false,
            'status'       => 'verified',
        ]);

        $childAppointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $child->patient_id,
            'scheduled_date'       => today()->addDays(2),
            'appointment_date'     => today()->addDays(2),
            'appointment_type'     => 'consultation',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->account->id,
        ]);

        AppointmentStatusChanged::dispatch(
            AppointmentStatusChanged::fromModel($childAppointment, 'confirmed', (int) $this->account->id)
        );

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) {
            // Must go to Maria's account, not to the child (who has no login)
            $this->assertEquals($this->account->id, $job->patientAccountId);
            $this->assertEquals('Appointment Confirmed', $job->title);
            $this->assertEquals('Your appointment has been confirmed. Open the app to view your details.', $job->body);

            // Payload contains zero PHI
            $this->assertStringNotContainsString('Baby', $job->body);
            $this->assertStringNotContainsString('Santos', $job->body);
            return true;
        });
    }

    public function test_automated_sweep_command_triggers_fcm_reminders(): void
    {
        Queue::fake();

        DB::table('communication_preferences')->insert([
            'patient_id'  => $this->patient->patient_id,
            'sms'         => true,
            'email'       => true,
            'recorded_by' => 1,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'scheduled_date'       => today()->addDay(),
            'appointment_date'     => today()->addDay(),
            'appointment_type'     => 'vaccination',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->account->id,
        ]);

        // Run artisan sweep command
        \Illuminate\Support\Facades\Artisan::call('appointments:auto-recall', ['--channel' => 'all']);

        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) use ($appointment) {
            $this->assertEquals($this->account->id, $job->patientAccountId);
            $this->assertEquals('Vaccination Reminder', $job->title);
            $this->assertEquals('You have an upcoming appointment. Open the app to view your schedule.', $job->body);
            $this->assertEquals('appointment_reminder', $job->data['category']);
            $this->assertEquals('/calendar', $job->data['route']);
            $this->assertEquals((string) $appointment->appointment_id, $job->data['appointment_id']);
            return true;
        });
    }

    public function test_pending_mobile_booking_receives_both_in_app_and_fcm_push_when_follow_up_schedules_are_generated(): void
    {
        config([
            'services.firebase.allowed_patient_account_ids' => (string) $this->account->id,
            'services.firebase.queue_connection' => 'database',
            'services.firebase.queue' => 'fcm',
        ]);
        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'name' => 'projects/abtc-management-system/messages/live_msg_id',
            ], 200),
        ]);

        // Mobile patient profile starts as pending before clinic verification
        $this->account->patients()->updateExistingPivot($this->patient->patient_id, [
            'status'      => 'pending',
            'verified_at' => null,
            'verified_by' => null,
        ]);

        // 1. Mobile booking creates Appointment + booking_confirmation + BiteIncidentIntake
        $mobileService = app(MobileAppointmentService::class);
        $booked = $mobileService->bookAppointment($this->account, [
            'patient_id'       => $this->patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date'   => today()->toDateString(),
            'intake'           => [
                'bite_date'     => today()->toDateString(),
                'exposure_type' => 'bite',
                'animal_type'   => 'dog',
                'animal_status' => 'owned',
                'site_washed'   => true,
            ],
        ]);
        $intake = $booked->biteIntake()->firstOrFail();

        // 2. Clinic Registration checks in mobile booking -> Appointment Confirmed push fires
        $regStaff = \App\Models\User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role'      => 'registration',
        ]);
        $checkInRes = app(\App\Services\Clinical\BiteIncidentIntakeService::class)->checkIn($intake, $regStaff);
        $this->assertSame(201, $checkInRes['status']);
        $biteId = (int) $checkInRes['data']['incident']->bite_id;

        // Doctor approves full PEP plan
        $doctor = \App\Models\User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role'      => 'triage',
        ]);
        $incident = \App\Models\BiteIncident::findOrFail($biteId);
        $incident->update([
            'exposure_category' => 'II',
            'episode_type'      => 'primary',
            'status'            => 'active',
        ]);
        \App\Models\TreatmentPlan::create([
            'clinic_id'  => $this->clinic->id,
            'bite_id'    => $biteId,
            'patient_id' => $this->patient->patient_id,
            'plan_type'  => 'full_pep',
            'status'     => 'approved',
            'decided_by' => $doctor->id,
            'decided_at' => now(),
        ]);

        \App\Models\VaccineInventory::create([
            'clinic_id'        => $this->clinic->id,
            'vaccine_type'     => 'Speeda',
            'batch_number'     => 'BATCH-SP-01',
            'current_quantity' => 50,
            'expiration_date'  => now()->addYear()->toDateString(),
            'status'           => 'active',
            'open_vial_status' => 'unopened',
        ]);

        // 3. Nurse records Day 0 via Form 3 -> auto-generates Day 3 & Day 7 schedules
        $nurse = \App\Models\User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role'      => 'treatment',
        ]);
        $this->actingAs($nurse);

        $doses = [
            [
                'period'       => 'Day 0',
                'date'         => today()->toDateString(),
                'vaccine_type' => 'Speeda',
            ],
        ];
        $response = app(VaccinationRecordService::class)->saveVaccinationRecords(
            actingUser: $nurse,
            clinicId: $this->clinic->id,
            patientId: $this->patient->patient_id,
            biteId: $biteId,
            validated: ['date_treatment_started' => today()->toDateString()],
            doses: $doses,
            signaturePath: null
        );
        $this->assertSame(201, $response->getStatusCode());

        \Illuminate\Support\Facades\Artisan::call('queue:work', [
            'connection'        => 'database',
            '--queue'           => 'fcm',
            '--stop-when-empty' => true,
            '--sleep'           => 0,
            '--tries'           => 1,
        ]);

        // In-app "vaccination_reminder" notifications exist for Day 3 and Day 7
        $inAppReminders = Notification::where('patient_account_id', $this->account->id)
            ->where('patient_id', $this->patient->patient_id)
            ->where('type', 'vaccination_reminder')
            ->get();
        $this->assertCount(2, $inAppReminders);

        // FCM HTTP v1 requests include Appointment Confirmed + 2 Vaccination Reminder pushes
        $recorded = Http::recorded();
        $schedulePayloads = collect($recorded)
            ->map(fn ($pair) => $pair[0]->data())
            ->filter(fn ($payload) => ($payload['message']['data']['category'] ?? null) === 'vaccination_schedule')
            ->values();

        $this->assertCount(2, $schedulePayloads);

        foreach ($schedulePayloads as $payload) {
            $this->assertSame('Vaccination Reminder', $payload['message']['notification']['title']);
            $this->assertSame('You have an upcoming appointment. Open the app to view your schedule.', $payload['message']['notification']['body']);
            $this->assertSame('vaccination_schedule', $payload['message']['data']['category']);
            $this->assertSame('/calendar', $payload['message']['data']['route']);
            $this->assertNotEmpty($payload['message']['data']['appointment_id']);
            $this->assertSame('HIGH', $payload['message']['android']['priority']);
            $this->assertSame('abtcare_reminders', $payload['message']['android']['notification']['channel_id']);
            $this->assertSame('PRIORITY_HIGH', $payload['message']['android']['notification']['notification_priority']);

            // Zero PHI in FCM payload
            $serialized = json_encode($payload, JSON_THROW_ON_ERROR);
            $this->assertStringNotContainsString('Maria', $serialized);
            $this->assertStringNotContainsString('Santos', $serialized);
            $this->assertStringNotContainsString('Speeda', $serialized);
        }
    }

    public function test_unowned_lookalike_pending_link_is_not_verified_or_sent_vaccination_schedule_fcm(): void
    {
        Queue::fake();
        config(['services.firebase.allowed_patient_account_ids' => '*']);

        $this->account->patients()->updateExistingPivot($this->patient->patient_id, [
            'status'      => 'pending',
            'verified_at' => null,
            'verified_by' => null,
        ]);

        $lookalike = PatientAccount::create([
            'name'      => 'Lookalike Account',
            'email'     => 'lookalike' . uniqid() . '@example.com',
            'password'  => bcrypt('password123'),
            'is_active' => true,
        ]);
        $lookalike->patients()->attach($this->patient->patient_id, [
            'relationship' => 'dependent',
            'is_primary'   => false,
            'status'       => 'pending',
        ]);

        $mobileService = app(MobileAppointmentService::class);
        $booked = $mobileService->bookAppointment($this->account, [
            'patient_id'       => $this->patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date'   => today()->toDateString(),
            'intake'           => [
                'bite_date'     => today()->toDateString(),
                'exposure_type' => 'bite',
                'animal_type'   => 'dog',
                'animal_status' => 'owned',
                'site_washed'   => true,
            ],
        ]);

        $regStaff = \App\Models\User::factory()->create(['clinic_id' => $this->clinic->id, 'role' => 'registration']);
        $checkInRes = app(\App\Services\Clinical\BiteIncidentIntakeService::class)->checkIn($booked->biteIntake()->firstOrFail(), $regStaff);
        $biteId = (int) $checkInRes['data']['incident']->bite_id;

        $doctor = \App\Models\User::factory()->create(['clinic_id' => $this->clinic->id, 'role' => 'triage']);
        \App\Models\BiteIncident::findOrFail($biteId)->update([
            'exposure_category' => 'II',
            'episode_type'      => 'primary',
            'status'            => 'active',
        ]);
        \App\Models\TreatmentPlan::create([
            'clinic_id'  => $this->clinic->id,
            'bite_id'    => $biteId,
            'patient_id' => $this->patient->patient_id,
            'plan_type'  => 'full_pep',
            'status'     => 'approved',
            'decided_by' => $doctor->id,
            'decided_at' => now(),
        ]);
        \App\Models\VaccineInventory::create([
            'clinic_id'        => $this->clinic->id,
            'vaccine_type'     => 'Speeda',
            'batch_number'     => 'BATCH-SP-02',
            'current_quantity' => 50,
            'expiration_date'  => now()->addYear()->toDateString(),
            'status'           => 'active',
            'open_vial_status' => 'unopened',
        ]);

        $nurse = \App\Models\User::factory()->create(['clinic_id' => $this->clinic->id, 'role' => 'treatment']);
        $this->actingAs($nurse);

        Queue::fake();
        app(VaccinationRecordService::class)->saveVaccinationRecords(
            actingUser: $nurse,
            clinicId: $this->clinic->id,
            patientId: $this->patient->patient_id,
            biteId: $biteId,
            validated: ['date_treatment_started' => today()->toDateString()],
            doses: [['period' => 'Day 0', 'date' => today()->toDateString(), 'vaccine_type' => 'Speeda']],
            signaturePath: null
        );

        // Booking owner was verified and received vaccination_schedule pushes
        Queue::assertPushed(SendFcmPushNotification::class, fn (SendFcmPushNotification $job) =>
            $job->patientAccountId === $this->account->id && $job->data['category'] === 'vaccination_schedule'
        );

        // Lookalike pending account was NOT verified and received zero FCM jobs
        $this->assertSame('pending', $lookalike->patients()->whereKey($this->patient->patient_id)->first()->pivot->status);
        Queue::assertNotPushed(SendFcmPushNotification::class, fn (SendFcmPushNotification $job) =>
            $job->patientAccountId === $lookalike->id
        );
    }
}
