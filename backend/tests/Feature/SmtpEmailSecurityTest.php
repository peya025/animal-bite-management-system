<?php

namespace Tests\Feature;

use App\Mail\ClinicEmail;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\OutboundMessage;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientInvitation;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Services\Messaging\AppointmentEmailEvents;
use App\Services\Messaging\EmailTransportInterface;
use App\Services\Messaging\InvitationDelivery;
use App\Services\Messaging\OutboundDelivery;
use App\Services\Messaging\SmtpEmailService;
use App\Services\Mobile\PatientPasswordRecovery;
use App\Services\Patient\PatientInvitationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class SmtpEmailSecurityTest extends TestCase
{
    use RefreshDatabase, \Tests\ConfiguresTestEmail;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureTestEmail();
    }

    public function test_configuration_rejects_missing_auth_unsafe_tls_and_wrong_port(): void
    {
        $service = app(SmtpEmailService::class);
        $this->assertNull($service->configurationError());
        config(['mail.mailers.smtp.password' => null]);
        $this->assertSame('smtp_credentials_missing', $service->configurationError());
        config(['mail.mailers.smtp.password' => 'test', 'mail.mailers.smtp.verify_peer' => false]);
        $this->assertSame('smtp_tls_required', $service->configurationError());
        config(['mail.mailers.smtp.verify_peer' => true, 'mail.mailers.smtp.port' => 465]);
        $this->assertSame('smtp_encryption_mismatch', $service->configurationError());
        config(['mail.mailers.smtp.scheme' => 'smtps']);
        $this->assertNull($service->configurationError());
        config(['mail.mailers.smtp.url' => 'smtp://unsafe']);
        $this->assertSame('smtp_url_not_supported', $service->configurationError());
    }

    public function test_invalid_sender_recipient_and_cancelled_send_never_claim_acceptance(): void
    {
        $service = app(SmtpEmailService::class);
        $mail = new ClinicEmail('Clinic message', ['Hello']);
        $this->assertSame('invalid_email', $service->send("bad\r\nBcc: other@example.test", $mail)->error);
        config(['mail.from.address' => 'invalid']);
        $this->assertSame('invalid_sender', $service->send('patient@example.test', $mail)->error);
        config(['mail.from.address' => 'clinic@example.test']);
        Event::listen(MessageSending::class, fn () => false);
        $this->assertSame('email_not_submitted', $service->send('patient@example.test', $mail)->error);
    }

    public function test_temporary_rejections_are_bounded_and_auth_failure_does_not_retry(): void
    {
        $service = app(SmtpEmailService::class);
        $calls = 0;
        $sent = app(InvitationDelivery::class)->send(1, 'patient@example.test', 'patient_invitation', function () use (&$calls, $service) {
            $calls++;

            return $service->failure(new TransportException('secret must never be logged', 451));
        });
        $this->assertFalse($sent);
        $this->assertSame(3, $calls);
        $this->assertDatabaseHas('outbound_messages', ['attempt_count' => 3, 'status' => 'failed', 'error_code' => 'smtp_temporary_rejection']);
        $calls = 0;
        app(InvitationDelivery::class)->send(1, 'staff@example.test', 'staff_invitation', function () use (&$calls, $service) {
            $calls++;

            return $service->failure(new TransportException('secret', 535));
        });
        $this->assertSame(1, $calls);
        $this->assertSame('unknown', $service->failure(new \RuntimeException('timeout'))->status);
        $this->assertStringNotContainsString('secret', json_encode(DB::table('outbound_message_attempts')->get()));
    }

    private function fixture(): array
    {
        $clinic = Clinic::create(['name' => 'Test Clinic']);
        $admin = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'admin', 'is_active' => true]);
        $patient = Patient::create(['clinic_id' => $clinic->id, 'first_name' => '<script>bad</script>', 'last_name' => 'Patient', 'gender' => 'female', 'email' => 'patient@example.test']);

        return [$admin, $patient];
    }

    public function test_patient_token_is_encrypted_one_use_bound_to_email_and_link_is_real(): void
    {
        [$admin, $patient] = $this->fixture();
        $captured = null;
        Event::listen(MessageSending::class, function ($event) use (&$captured) {
            $captured = $event->message;
        });
        $service = app(PatientInvitationService::class);
        $this->assertSame(201, $service->send($patient->patient_id, $admin->id)['status']);
        $invitation = PatientInvitation::firstOrFail();
        $raw = DB::table('patient_invitations')->first();
        $this->assertSame(hash('sha256', $invitation->token), $raw->token);
        $this->assertStringNotContainsString($invitation->token, $raw->encrypted_token);
        $this->assertStringNotContainsString('<script>bad</script>', $captured->getHtmlBody());
        $this->assertStringContainsString('&lt;script&gt;', $captured->getHtmlBody());
        $this->assertStringContainsString('/patient-portal/activate#'.$invitation->token, $captured->getTextBody());
        $this->assertSame('patient@example.test', $captured->getTo()[0]->getAddress());
        $this->assertNotNull(OutboundMessage::first()->provider_message_id);
        $this->get('/patient-portal/activate')->assertOk()->assertHeader('Referrer-Policy', 'no-referrer');
        $data = ['token' => $invitation->token, 'email' => 'other@example.test', 'password' => 'Strong-pass123', 'password_confirmation' => 'Strong-pass123'];
        $this->assertSame(422, $service->activate($data)['status']);
        $data['email'] = $patient->email;
        $this->assertSame(200, $service->activate($data)['status']);
        $this->assertSame(422, $service->activate($data)['status']);
        $this->assertDatabaseCount('patient_accounts', 1);
    }

    public function test_failed_new_send_preserves_old_token_and_double_click_does_not_resend(): void
    {
        [$admin, $patient] = $this->fixture();
        $service = app(PatientInvitationService::class);
        $service->send($patient->patient_id, $admin->id);
        $original = PatientInvitation::firstOrFail();
        // A second send() while a pending invitation exists must be rejected
        // with 422 (duplicate guard), not create a second record.
        $this->assertSame(422, $service->send($patient->patient_id, $admin->id)['status']);
        $this->assertSame('pending', $original->fresh()->status);
        $this->assertSame(1, OutboundMessage::where('status', 'accepted')->count());
        $this->travel(61)->seconds();
        config(['messaging.email_enabled' => false]);
        $this->assertSame(503, $service->resend($original->id)['status']);
        $this->assertSame($original->token, $original->fresh()->token);
    }

    public function test_clinic_isolation_invalid_role_and_admin_diagnostics(): void
    {
        [$admin, $patient] = $this->fixture();
        $other = User::factory()->create(['clinic_id' => Clinic::create(['name' => 'Other'])->id, 'role' => 'admin', 'is_active' => true]);
        $this->actingAs($other)->postJson('/api/patient-invitations', ['patient_id' => $patient->patient_id])->assertNotFound();
        $this->postJson('/api/patient-invitations/bulk', ['patient_ids' => [$patient->patient_id]])->assertNotFound();
        $this->actingAs($admin)->postJson('/api/staff-invitations', ['email' => 'new@example.test', 'workstation_role' => 'superuser'])->assertUnprocessable();
        $this->getJson('/api/email-configuration-status')->assertOk()->assertJsonMissing(['password' => 'test-secret']);
        $admin->update(['role' => 'registration']);
        $this->getJson('/api/email-activity')->assertForbidden();
    }

    public function test_recovery_stores_only_hash_and_resets_once_revoking_sessions(): void
    {
        $account = PatientAccount::create(['name' => 'Test', 'email' => 'patient@example.test', 'password' => 'old-password', 'is_active' => true]);
        $account->createToken('test');
        $code = null;
        Event::listen(MessageSending::class, function ($event) use (&$code) {
            preg_match('/Your Activation Code: ([A-Za-z0-9]{64})/', $event->message->getTextBody(), $matches);
            $code = $matches[1] ?? null;
        });
        $service = app(PatientPasswordRecovery::class);
        $service->request($account->email);
        $this->assertNotNull($code);
        $this->assertDatabaseHas('patient_password_reset_tokens', ['token_hash' => hash('sha256', $code)]);
        $data = ['email' => $account->email, 'token' => $code, 'password' => 'new-password'];
        $this->assertTrue($service->reset($data));
        $this->assertTrue(Hash::check('new-password', $account->fresh()->password));
        $this->assertSame(0, $account->tokens()->count());
        $this->assertFalse($service->reset($data));
    }

    public function test_expired_recovery_and_failed_submission_do_not_change_password(): void
    {
        $account = PatientAccount::create(['name' => 'Test', 'email' => 'patient@example.test', 'password' => 'old-password', 'is_active' => true]);
        DB::table('patient_password_reset_tokens')->insert(['patient_account_id' => $account->id, 'token_hash' => hash('sha256', str_repeat('a', 64)), 'expires_at' => now()->subMinute()]);
        $this->assertFalse(app(PatientPasswordRecovery::class)->reset(['email' => $account->email, 'token' => str_repeat('a', 64), 'password' => 'new-password']));
        config(['mail.default' => 'log']);
        app(PatientPasswordRecovery::class)->request($account->email);
        $this->assertTrue(Hash::check('old-password', $account->fresh()->password));
        $this->assertDatabaseHas('patient_password_reset_tokens', ['token_hash' => hash('sha256', str_repeat('a', 64))]);
    }

    public function test_staff_resend_rotates_once_and_failed_resend_preserves_token(): void
    {
        [$admin] = $this->fixture();
        $this->actingAs($admin);
        $this->postJson('/api/staff-invitations', ['email' => 'staff@example.test', 'workstation_role' => 'doctor'])->assertCreated();
        $invitation = StaffInvitation::firstOrFail();
        $old = $invitation->token;
        $this->travel(61)->seconds();
        $this->postJson('/api/staff-invitations/'.$invitation->id.'/resend')->assertOk();
        $this->assertNotSame($old, $invitation->fresh()->token);
        $this->getJson('/api/staff-invitations/validate/'.$old)->assertNotFound();
        $current = $invitation->fresh()->token;
        $this->travel(61)->seconds();
        config(['messaging.email_enabled' => false]);
        $this->postJson('/api/staff-invitations/'.$invitation->id.'/resend')->assertStatus(503);
        $this->assertSame($current, $invitation->fresh()->token);
        $this->postJson('/api/staff-invitations/accept/'.$current, ['name' => 'Doctor Test', 'password' => 'Password123!', 'password_confirmation' => 'Password123!'])->assertCreated();
        $this->postJson('/api/staff-invitations/accept/'.$current, ['name' => 'Doctor Test', 'password' => 'Password123!', 'password_confirmation' => 'Password123!'])->assertStatus(400);
    }

    public function test_appointment_events_use_recorded_dates_suppress_stale_messages_and_respect_consent(): void
    {
        Queue::fake();
        config(['messaging.appointment_events_enabled' => true]);
        [$admin, $patient] = $this->fixture();
        DB::table('communication_preferences')->insert(['patient_id' => $patient->patient_id, 'email' => true, 'sms' => false, 'recorded_by' => $admin->id, 'created_at' => now(), 'updated_at' => now()]);
        $appointment = Appointment::create(['clinic_id' => $patient->clinic_id, 'patient_id' => $patient->patient_id,
            'scheduled_date' => today()->addDays(11), 'appointment_date' => today()->addDays(11), 'appointment_type' => 'vaccination', 'status' => 'scheduled']);
        $initial = OutboundMessage::firstOrFail();
        $this->assertStringContainsString(today()->addDays(11)->toDateString(), $initial->body);
        $appointment->update(['scheduled_date' => today()->addDays(12), 'appointment_date' => today()->addDays(12)]);
        $rescheduled = OutboundMessage::latest('id')->firstOrFail();
        $delivery = app(OutboundDelivery::class);
        $delivery->deliver($initial->id);
        $this->assertSame('skipped', $initial->fresh()->status);
        $delivery->deliver($rescheduled->id);
        $this->assertSame('accepted', $rescheduled->fresh()->status, json_encode([$rescheduled->fresh()->error_code, $rescheduled->context, AppointmentEmailEvents::snapshot($appointment->fresh())]));
        $appointment->update(['status' => 'cancelled']);
        $cancelled = OutboundMessage::latest('id')->firstOrFail();
        $delivery->deliver($cancelled->id);
        $this->assertSame('accepted', $cancelled->fresh()->status);
        $this->assertNull($cancelled->fresh()->delivered_at);
        $this->assertSame(0, (int) $appointment->fresh()->reminder_sent_count);
        DB::table('communication_preferences')->where('patient_id', $patient->patient_id)->update(['email' => false]);
        $appointment->update(['status' => 'scheduled', 'scheduled_date' => today()->addDays(13)]);
        $this->assertDatabaseCount('outbound_messages', 3);
    }

    public function test_token_migration_round_trip_preserves_existing_links(): void
    {
        [$admin, $patient] = $this->fixture();
        $invitation = PatientInvitation::create(['clinic_id' => $patient->clinic_id, 'patient_id' => $patient->patient_id, 'invited_by' => $admin->id,
            'token' => str_repeat('a', 64), 'status' => 'pending', 'expires_at' => now()->addDays(7)]);
        $migration = require database_path('migrations/2026_11_14_000002_protect_invitation_tokens.php');
        $migration->down();
        $this->assertSame(str_repeat('a', 64), DB::table('patient_invitations')->value('token'));
        $migration->up();
        $this->assertSame(str_repeat('a', 64), $invitation->fresh()->token);
        $this->assertNotNull(PatientInvitation::forToken(str_repeat('a', 64))->first());
    }

    public function test_web_activation_does_not_issue_discarded_mobile_session(): void
    {
        [$admin, $patient] = $this->fixture();
        app(PatientInvitationService::class)->send($patient->patient_id, $admin->id);
        $token = PatientInvitation::firstOrFail()->token;
        $this->post('/patient-portal/activate', ['token' => $token, 'email' => $patient->email, 'password' => 'Password123!', 'password_confirmation' => 'Password123!'])->assertRedirect('/patient-portal/activate');
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseHas('patient_invitations', ['status' => 'accepted']);
    }

    public function test_real_smtp_transport_receives_mandatory_tls_settings_without_connecting(): void
    {
        \Illuminate\Support\Facades\Mail::purge('smtp');
        $transport = \Illuminate\Support\Facades\Mail::mailer('smtp')->getSymfonyTransport();
        $this->assertInstanceOf(\Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport::class, $transport);
        $this->assertTrue($transport->isTlsRequired());
        $this->assertTrue($transport->isAutoTls());
        $this->assertSame('test-user', $transport->getUsername());
        $this->assertNotSame(false, $transport->getStream()->getStreamOptions()['ssl']['verify_peer'] ?? true);
    }

    public function test_patient_contact_change_requires_a_new_invitation(): void
    {
        [$admin, $patient] = $this->fixture();
        $service = app(PatientInvitationService::class);
        $service->send($patient->patient_id, $admin->id);
        $token = PatientInvitation::firstOrFail()->token;
        $patient->update(['email' => 'changed@example.test']);
        $this->assertSame(422, $service->activate(['token' => $token, 'email' => 'changed@example.test', 'password' => 'password123'])['status']);
        $this->assertSame(422, $service->activate(['token' => $token, 'email' => 'patient@example.test', 'password' => 'password123'])['status']);
        $this->assertDatabaseCount('patient_accounts', 0);
    }

    public function test_advance_reminder_uses_saved_schedule_and_smtp_queue_retries(): void
    {
        \Illuminate\Support\Facades\Queue::fake();
        [$admin, $patient] = $this->fixture();
        DB::table('communication_preferences')->insert(['patient_id' => $patient->patient_id, 'email' => true, 'sms' => false, 'recorded_by' => $admin->id, 'created_at' => now(), 'updated_at' => now()]);
        $appointment = \App\Models\Appointment::create(['clinic_id' => $patient->clinic_id, 'patient_id' => $patient->patient_id,
            'scheduled_date' => today()->addDay(), 'appointment_date' => today()->addDay(), 'appointment_time' => '10:30:00', 'appointment_type' => 'vaccination', 'status' => 'scheduled'])->fresh();
        $result = app(\App\Services\AppointmentReminderService::class)->sendAdvanceReminder($appointment, 'email');
        $this->assertTrue($result['success']);
        $message = OutboundMessage::firstOrFail();
        $this->assertStringContainsString(today()->addDay()->format('M j, Y'), $message->body);
        $this->assertStringContainsString('10:30 AM', $message->body);
        $smtpMock = $this->partialMock(SmtpEmailService::class, fn ($mock) => $mock->shouldReceive('send')->times(3)->andReturn(
            new \App\Services\Messaging\Sms\SmsResult('retry', error: 'smtp_temporary_rejection'),
            new \App\Services\Messaging\Sms\SmsResult('retry', error: 'smtp_temporary_rejection'),
            new \App\Services\Messaging\Sms\SmsResult('accepted', messageId: 'test-id')));
        $this->instance(\App\Services\Messaging\EmailTransportInterface::class, $smtpMock);
        for ($i = 0; $i < 3; $i++) {
            app(\App\Services\Messaging\OutboundDelivery::class)->deliver($message->id);
            $this->travel(10)->minutes();
        }
        $this->assertSame('accepted', $message->fresh()->status);
        $this->assertSame(3, $message->fresh()->attempt_count);
        $this->assertNull($message->fresh()->delivered_at);
    }

    public function test_password_change_notice_is_independent_of_reminder_consent(): void
    {
        $account = PatientAccount::create(['name' => 'Test', 'email' => 'patient@example.test', 'password' => 'password123', 'is_active' => true]);
        app(\App\Services\Messaging\AccountSecurityEmail::class)->passwordChanged($account);
        $this->assertDatabaseHas('outbound_messages', ['purpose' => 'password_changed', 'status' => 'accepted']);
        $this->assertDatabaseCount('communication_preferences', 0);
    }

    public function test_invitation_database_errors_do_not_expose_sql_or_token_bindings(): void
    {
        config(['app.debug' => true]);
        \Illuminate\Support\Facades\Log::spy();
        \Illuminate\Support\Facades\Route::get('/api/staff-invitations/schema-test', function () {
            throw new \Illuminate\Database\QueryException('mysql', 'insert into staff_invitations (token) values (?)', ['secret-activation-code'], new \PDOException('Unknown column encrypted_token', 42));
        });
        $this->getJson('/api/staff-invitations/schema-test')->assertStatus(503)->assertExactJson([
            'message' => 'The service is temporarily unavailable. Please contact the system administrator.',
        ]);
        \Illuminate\Support\Facades\Log::shouldHaveReceived('error')->once()->with('Invitation database operation failed.', ['sqlstate' => 42]);
    }
}
