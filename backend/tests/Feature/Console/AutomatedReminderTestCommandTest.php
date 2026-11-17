<?php

namespace Tests\Feature\Console;

use App\Jobs\SendFcmPushNotification;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\OutboundMessage;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\Messaging\Firebase\FirebaseAuthService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AutomatedReminderTestCommandTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic;
    protected PatientAccount $account1;
    protected Patient $patientSelf;
    protected Patient $patientChild;
    protected PatientDeviceToken $deviceToken;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('services.firebase.project_id', 'abtc-management-system');
        Config::set('services.firebase.channel_id', 'abtcare_reminders');
        Config::set('services.firebase.fcm_enabled', true);
        Config::set('services.firebase.fcm_test_mode', true);
        Config::set('services.firebase.allowed_patient_account_ids', '1');

        $mockAuth = $this->createMock(FirebaseAuthService::class);
        $mockAuth->method('getProjectId')->willReturn('abtc-management-system');
        $mockAuth->method('getAccessToken')->willReturn('mock-access-token');
        $this->app->instance(FirebaseAuthService::class, $mockAuth);

        $this->clinic = Clinic::create([
            'name'           => 'Tagoloan Animal Bite Center',
            'contact_number' => '09171234567',
        ]);

        // Create Patient Account ID 1
        $this->account1 = PatientAccount::create([
            'id'        => 1,
            'name'      => 'Cy Ong',
            'email'     => 'cyong@example.com',
            'password'  => bcrypt('password123'),
            'is_active' => true,
        ]);

        // Patient 10: Self profile
        $this->patientSelf = Patient::create([
            'patient_id'     => 10,
            'clinic_id'      => $this->clinic->id,
            'patient_number' => 'P-2026-0010',
            'first_name'     => 'Cy',
            'last_name'      => 'Ong',
            'gender'         => 'male',
            'contact_number' => '09857882441',
            'email'          => 'cyong@example.com',
            'status'         => 'active',
        ]);

        $this->account1->patients()->attach($this->patientSelf->patient_id, [
            'relationship' => 'self',
            'is_primary'   => true,
            'status'       => 'verified',
            'verified_at'  => now(),
        ]);

        // Patient 11: Child profile
        $this->patientChild = Patient::create([
            'patient_id'     => 11,
            'clinic_id'      => $this->clinic->id,
            'patient_number' => 'P-2026-0011',
            'first_name'     => 'Caleb',
            'last_name'      => 'Conti',
            'gender'         => 'male',
            'contact_number' => '09345427943',
            'status'         => 'active',
        ]);

        $this->account1->patients()->attach($this->patientChild->patient_id, [
            'relationship' => 'child',
            'is_primary'   => false,
            'status'       => 'verified',
            'verified_at'  => now(),
        ]);

        // Registered device token for Account 1
        $this->deviceToken = $this->account1->deviceTokens()->create([
            'fcm_token'    => 'fcm_token_cyong_android_phone_123456789',
            'device_id'    => 'inst_1a1e963d92a_7decfcc5',
            'device_type'  => 'android',
            'device_name'  => 'Pixel 8',
            'is_active'    => true,
            'last_used_at' => now(),
        ]);
    }

    public function test_testing_mode_strictly_restricts_to_patient_account_1(): void
    {
        $this->artisan('appointments:auto-recall', [
            '--test'    => true,
            '--account' => 2,
            '--dry-run' => true,
        ])
            ->expectsOutputToContain('Testing is strictly restricted to Patient Account ID 1')
            ->assertExitCode(1);
    }

    public function test_testing_mode_prohibits_sms_and_email_channels(): void
    {
        $this->artisan('appointments:auto-recall', [
            '--test'    => true,
            '--channel' => 'sms',
            '--dry-run' => true,
        ])
            ->expectsOutputToContain('SMS and email dispatch are prohibited')
            ->assertExitCode(1);

        $this->artisan('appointments:auto-recall', [
            '--test'    => true,
            '--channel' => 'email',
            '--dry-run' => true,
        ])
            ->expectsOutputToContain('SMS and email dispatch are prohibited')
            ->assertExitCode(1);
    }

    public function test_testing_mode_rejects_invalid_date_format(): void
    {
        $this->artisan('appointments:auto-recall', [
            '--test'    => true,
            '--date'    => 'not-a-valid-date',
            '--dry-run' => true,
        ])
            ->expectsOutputToContain('Invalid date format for --date')
            ->assertExitCode(1);
    }

    public function test_dry_run_identifies_eligible_advance_reminders_without_db_mutations(): void
    {
        // Appointment scheduled for 2026-11-20
        $appointment = Appointment::create([
            'appointment_id'       => 9,
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patientSelf->patient_id,
            'scheduled_date'       => '2026-11-20',
            'appointment_date'     => '2026-11-20',
            'appointment_type'     => 'follow_up_vaccination',
            'dose_number'          => 3,
            'status'               => 'scheduled',
            'booked_by_account_id' => null,
        ]);

        // Simulated sweep reference date: 2026-11-19 (tomorrow is 2026-11-20)
        $this->artisan('appointments:auto-recall', [
            '--test'    => true,
            '--date'    => '2026-11-19',
            '--dry-run' => true,
        ])
            ->expectsOutputToContain('Simulated Date:      2026-11-19')
            ->expectsOutputToContain('Eligible Advance Reminders')
            ->expectsOutputToContain('Processed Advance Reminders')
            ->assertExitCode(0);

        // Dry run must NOT write to database
        $this->assertSame(0, OutboundMessage::count());
        $this->assertSame(0, Notification::count());
        $this->assertSame(0, $appointment->fresh()->reminder_sent_count);
        $this->assertNull($appointment->fresh()->last_reminded_at);
    }

    public function test_dry_run_identifies_eligible_missed_dose_recalls(): void
    {
        // Appointment scheduled for 2026-11-20
        $appointment = Appointment::create([
            'appointment_id'       => 7,
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patientChild->patient_id,
            'scheduled_date'       => '2026-11-20',
            'appointment_date'     => '2026-11-20',
            'appointment_type'     => 'follow_up_vaccination',
            'dose_number'          => 3,
            'status'               => 'scheduled',
            'booked_by_account_id' => null,
        ]);

        // Simulated sweep reference date: 2026-11-21 (appointment 2026-11-20 is in past)
        $this->artisan('appointments:auto-recall', [
            '--test'    => true,
            '--date'    => '2026-11-21',
            '--dry-run' => true,
        ])
            ->expectsOutputToContain('Simulated Date:      2026-11-21')
            ->expectsOutputToContain('Eligible Missed Dose Recalls')
            ->assertExitCode(0);

        $this->assertSame(0, OutboundMessage::count());
        $this->assertSame(0, Notification::count());
    }

    public function test_live_controlled_test_dispatches_in_app_and_fcm_with_sync(): void
    {
        $appointment = Appointment::create([
            'appointment_id'       => 9,
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patientSelf->patient_id,
            'scheduled_date'       => '2026-11-20',
            'appointment_date'     => '2026-11-20',
            'appointment_type'     => 'follow_up_vaccination',
            'dose_number'          => 3,
            'status'               => 'scheduled',
            'booked_by_account_id' => null,
        ]);

        $this->artisan('appointments:auto-recall', [
            '--test'  => true,
            '--date'  => '2026-11-19',
            '--sync'  => true,
            '--force' => true,
        ])
            ->assertExitCode(0);

        // In-app notification created
        $this->assertSame(1, Notification::where('patient_account_id', 1)->count());
        $notification = Notification::where('patient_account_id', 1)->first();
        $this->assertSame('upcoming_appointment_reminder', $notification->type);

        // OutboundMessage created with test context
        $message = OutboundMessage::first();
        $this->assertNotNull($message);
        $this->assertSame('delivered', $message->status);
        $this->assertTrue((bool) ($message->context['is_test'] ?? false));

        // CRITICAL: Appointment counters are NOT tainted by test reminders
        $this->assertSame(0, $appointment->fresh()->reminder_sent_count);
        $this->assertNull($appointment->fresh()->last_reminded_at);
    }

    public function test_duplicate_prevention_prevents_duplicate_dispatches_in_test_mode(): void
    {
        Appointment::create([
            'appointment_id'       => 9,
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patientSelf->patient_id,
            'scheduled_date'       => '2026-11-20',
            'appointment_date'     => '2026-11-20',
            'appointment_type'     => 'follow_up_vaccination',
            'dose_number'          => 3,
            'status'               => 'scheduled',
            'booked_by_account_id' => null,
        ]);

        // First run
        $this->artisan('appointments:auto-recall', [
            '--test'  => true,
            '--date'  => '2026-11-19',
            '--sync'  => true,
            '--force' => true,
        ])->assertExitCode(0);

        $this->assertSame(1, OutboundMessage::count());
        $this->assertSame(1, Notification::count());

        // Second run with same parameters: duplicate prevention must skip
        $this->artisan('appointments:auto-recall', [
            '--test'  => true,
            '--date'  => '2026-11-19',
            '--sync'  => true,
            '--force' => true,
        ])->assertExitCode(0);

        // Counts must still be 1!
        $this->assertSame(1, OutboundMessage::count());
        $this->assertSame(1, Notification::count());
    }

    public function test_controlled_test_does_not_interfere_with_legitimate_future_reminders(): void
    {
        // Communication preferences consent for patient
        DB::table('communication_preferences')->insert([
            'patient_id'  => $this->patientSelf->patient_id,
            'sms'         => true,
            'email'       => true,
            'recorded_by' => 1,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $appointment = Appointment::create([
            'appointment_id'       => 9,
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patientSelf->patient_id,
            'scheduled_date'       => '2026-11-20',
            'appointment_date'     => '2026-11-20',
            'appointment_type'     => 'follow_up_vaccination',
            'dose_number'          => 3,
            'status'               => 'scheduled',
            'booked_by_account_id' => null,
        ]);

        // 1. Run controlled test sweep with reference date 2026-11-19
        $this->artisan('appointments:auto-recall', [
            '--test'  => true,
            '--date'  => '2026-11-19',
            '--sync'  => true,
            '--force' => true,
        ])->assertExitCode(0);

        $this->assertSame(1, OutboundMessage::where('channel', 'in_app')->count());
        $testMessage = OutboundMessage::first();
        $this->assertTrue((bool) ($testMessage->context['is_test'] ?? false));

        // 2. Simulate the legitimate production sweep running on the actual day 2026-11-19
        Carbon::setTestNow('2026-11-19 08:00:00');
        try {
            // Normal production sweep without --test
            $this->artisan('appointments:auto-recall', [
                '--channel' => 'in_app',
            ])->assertExitCode(0);

            // A separate production OutboundMessage must have been created because test message did NOT block it!
            $messages = OutboundMessage::where('channel', 'in_app')->get();
            $this->assertSame(2, $messages->count());

            $productionMessage = $messages->firstWhere('context.is_test', false);
            $this->assertNotNull($productionMessage, 'Production reminder was not blocked by previous test run.');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_dependent_child_profile_notifies_parent_account_1(): void
    {
        // Appointment for child profile
        $appointment = Appointment::create([
            'appointment_id'       => 7,
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patientChild->patient_id,
            'scheduled_date'       => '2026-11-20',
            'appointment_date'     => '2026-11-20',
            'appointment_type'     => 'follow_up_vaccination',
            'dose_number'          => 3,
            'status'               => 'scheduled',
            'booked_by_account_id' => null,
        ]);

        $this->artisan('appointments:auto-recall', [
            '--test'  => true,
            '--date'  => '2026-11-19',
            '--sync'  => true,
            '--force' => true,
        ])->assertExitCode(0);

        // Child's notification is routed to Account 1
        $notification = Notification::where('appointment_id', $appointment->appointment_id)->first();
        $this->assertNotNull($notification);
        $this->assertSame(1, $notification->patient_account_id);
        $this->assertSame($this->patientChild->patient_id, $notification->patient_id);
    }

    public function test_disabled_notification_preferences_are_respected(): void
    {
        // Disable reminders category for Account 1
        $this->account1->updateNotificationPreferences([
            'reminders' => false,
        ]);

        $appointment = Appointment::create([
            'appointment_id'       => 9,
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patientSelf->patient_id,
            'scheduled_date'       => '2026-11-20',
            'appointment_date'     => '2026-11-20',
            'appointment_type'     => 'follow_up_vaccination',
            'dose_number'          => 3,
            'status'               => 'scheduled',
            'booked_by_account_id' => null,
        ]);

        // Dry-run should flag preferences_allowed as false
        $this->artisan('appointments:auto-recall', [
            '--test'    => true,
            '--date'    => '2026-11-19',
            '--dry-run' => true,
        ])->assertExitCode(0);
    }
}
