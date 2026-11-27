<?php

namespace Tests\Feature\Notifications;

use App\Events\AppointmentStatusChanged;
use App\Jobs\SendFcmPushNotification;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Services\Messaging\Firebase\FirebaseAuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FcmQueueIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_fcm_worker_processes_only_fcm_queue_and_sends_android_heads_up_payload(): void
    {
        config([
            'queue.default' => 'database',
            'messaging.queue_connection' => 'database',
            'messaging.queue' => 'notifications',
            'services.firebase.queue_connection' => 'database',
            'services.firebase.queue' => 'fcm',
            'services.firebase.fcm_enabled' => true,
            'services.firebase.fcm_test_mode' => false,
            'services.firebase.project_id' => 'abtc-management-system',
            'services.firebase.channel_id' => 'abtcare_reminders',
            'services.firebase.allowed_patient_account_ids' => '',
            'broadcasting.default' => 'null',
        ]);

        $authMock = $this->createMock(FirebaseAuthService::class);
        $authMock->method('getProjectId')->willReturn('abtc-management-system');
        $authMock->method('getAccessToken')->willReturn('mock-oauth-access-token');
        $this->app->instance(FirebaseAuthService::class, $authMock);

        $clinic = Clinic::create([
            'name' => 'Tagoloan Animal Bite Treatment Center',
            'contact_number' => '09171234567',
        ]);

        $account = PatientAccount::create([
            'name' => 'Juan Dela Cruz',
            'email' => 'fcm-isolation@example.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        config(['services.firebase.allowed_patient_account_ids' => (string) $account->id]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PAT-FCM-ISO-1',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'contact_number' => '09171234567',
            'email' => 'fcm-isolation@example.com',
            'status' => 'active',
        ]);

        $account->patients()->attach($patient->patient_id, [
            'relationship' => 'self',
            'is_primary' => true,
            'status' => 'verified',
        ]);

        $account->deviceTokens()->create([
            'fcm_token' => 'fcm_isolation_android_token_1234567890',
            'device_id' => 'android_iso_device_1',
            'device_type' => 'android',
            'device_name' => 'Test Android',
            'is_active' => true,
            'last_used_at' => now(),
        ]);

        $appointment = Appointment::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'scheduled_date' => today()->addDays(2),
            'appointment_date' => today()->addDays(2),
            'appointment_type' => 'vaccination',
            'dose_number' => 2,
            'status' => 'confirmed',
            'booked_by_account_id' => $account->id,
        ]);

        // Seed non-executable sentinels on notifications, default, and broadcasts queues
        $dbQueue = app('queue')->connection('database');
        foreach (['notifications', 'default', 'broadcasts'] as $isolatedQueue) {
            $dbQueue->pushRaw('{"sentinel":"' . $isolatedQueue . '"}', $isolatedQueue);
        }

        Http::fake([
            'https://fcm.googleapis.com/v1/projects/abtc-management-system/messages:send' => Http::response([
                'name' => 'projects/abtc-management-system/messages/fcm_iso_msg_1',
            ], 200),
        ]);

        // Trigger real appointment confirmation event -> SendAppointmentFcmNotification -> SendFcmPushNotification on 'fcm'
        AppointmentStatusChanged::dispatch(
            AppointmentStatusChanged::fromModel($appointment, 'confirmed', (int) $account->id)
        );

        // AppointmentStatusChanged queues both BroadcastEvent (broadcasts) and SendFcmPushNotification (fcm)
        $this->assertSame(1, DB::table('jobs')->where('queue', 'fcm')->count());
        $this->assertSame(1, DB::table('jobs')->where('queue', 'notifications')->count());
        $this->assertSame(1, DB::table('jobs')->where('queue', 'default')->count());
        $this->assertSame(2, DB::table('jobs')->where('queue', 'broadcasts')->count());

        // Process ONLY the fcm queue
        Artisan::call('queue:work', [
            'connection' => 'database',
            '--queue' => 'fcm',
            '--once' => true,
            '--sleep' => 0,
            '--tries' => 1,
        ]);

        // Verify Android heads-up banner FCM v1 request was sent with preserved 'appointment' category and zero PHI
        Http::assertSentCount(1);
        Http::assertSent(function ($request) use ($appointment) {
            $msg = $request->data()['message'] ?? [];
            return ($msg['token'] ?? null) === 'fcm_isolation_android_token_1234567890'
                && ($msg['notification']['title'] ?? null) === 'Appointment Confirmed'
                && !str_contains((string) ($msg['notification']['body'] ?? ''), 'Juan')
                && ($msg['data']['category'] ?? null) === 'appointment'
                && ($msg['data']['route'] ?? null) === '/appointments'
                && ($msg['data']['appointment_id'] ?? null) === (string) $appointment->appointment_id
                && ($msg['android']['priority'] ?? null) === 'HIGH'
                && ($msg['android']['notification']['channel_id'] ?? null) === 'abtcare_reminders'
                && ($msg['android']['notification']['notification_priority'] ?? null) === 'PRIORITY_HIGH';
        });

        // Verify fcm queue is drained while notifications (1), default (1), and broadcasts (2) remain untouched
        $this->assertSame(0, DB::table('jobs')->where('queue', 'fcm')->count());
        $this->assertSame(
            4,
            DB::table('jobs')
                ->whereIn('queue', ['notifications', 'default', 'broadcasts'])
                ->whereNull('reserved_at')
                ->where('attempts', 0)
                ->count()
        );
    }

    public function test_disabling_fcm_flag_skips_fcm_queue_delivery_safely(): void
    {
        config([
            'services.firebase.queue_connection' => 'database',
            'services.firebase.queue' => 'fcm',
            'services.firebase.fcm_enabled' => false,
            'services.firebase.fcm_test_mode' => false,
        ]);

        $account = PatientAccount::create([
            'name' => 'Disabled Gate Patient',
            'email' => 'fcm-disabled@example.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        config(['services.firebase.allowed_patient_account_ids' => (string) $account->id]);
        $account->deviceTokens()->create([
            'fcm_token' => 'fcm_disabled_android_token_1234567890',
            'device_id' => 'android_disabled_device_1',
            'device_type' => 'android',
            'is_active' => true,
            'last_used_at' => now(),
        ]);

        Http::fake();

        SendFcmPushNotification::dispatch(
            patientAccountId: $account->id,
            title: 'Vaccination Card Updated',
            body: 'Your digital vaccination card has been updated. Open the app to view your record.',
            data: ['category' => 'digital_card', 'route' => '/menu']
        );

        $this->assertSame(1, DB::table('jobs')->where('queue', 'fcm')->count());

        Artisan::call('queue:work', [
            'connection' => 'database',
            '--queue' => 'fcm',
            '--once' => true,
            '--sleep' => 0,
            '--tries' => 1,
        ]);

        Http::assertNothingSent();
        $this->assertSame(0, DB::table('jobs')->where('queue', 'fcm')->count());
    }
}
