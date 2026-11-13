<?php

namespace Tests\Feature;

use App\Jobs\DeliverOutboundMessage;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\OutboundMessage;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\User;
use App\Services\AppointmentReminderService;
use App\Services\Messaging\OutboundDelivery;
use App\Services\Messaging\Sms\SmsLength;
use App\Services\Messaging\Sms\SmsManager;
use App\Services\Staff\StaffInvitationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MessagingIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        Http::preventStrayRequests();
        config([
            'messaging.sms_enabled' => true, 'messaging.email_enabled' => true,
            'messaging.test_mode' => false, 'messaging.sms_provider' => 'twilio',
            'messaging.twilio.sid' => 'ACtest', 'messaging.twilio.token' => 'test-token',
            'messaging.twilio.sender' => '+15005550006', 'messaging.semaphore.key' => 'test-key',
            'mail.default' => 'smtp',
        ]);
    }

    private function appointment(bool $consent = true): Appointment
    {
        $clinic = Clinic::create(['name' => 'Test clinic', 'contact_number' => '09171234567']);
        $patient = Patient::create(['clinic_id' => $clinic->id, 'patient_number' => 'TEST-'.$clinic->id, 'first_name' => 'Test', 'last_name' => 'Patient', 'gender' => 'female', 'contact_number' => '09171234567', 'email' => 'patient@example.test']);
        DB::table('communication_preferences')->insert(['patient_id' => $patient->patient_id, 'sms' => $consent, 'email' => $consent, 'recorded_by' => 1, 'created_at' => now(), 'updated_at' => now()]);

        return Appointment::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'scheduled_date' => today()->subDay(), 'appointment_date' => today()->subDay(), 'appointment_type' => 'vaccination', 'status' => 'scheduled']);
    }

    private function prepare(Appointment $appointment, string $channel = 'sms'): OutboundMessage
    {
        $result = app(AppointmentReminderService::class)->sendRecallAlert($appointment, $channel);
        $this->assertTrue($result['success'], json_encode($result));

        return OutboundMessage::latest('id')->firstOrFail();
    }

    public function test_provider_switch_preserves_queued_provider_and_duplicate_requests_send_once(): void
    {
        Http::fake(['*twilio.com/*' => Http::response(['sid' => 'SMone', 'status' => 'queued']), '*semaphore.co/*' => Http::response([['message_id' => 22, 'status' => 'Queued']])]);
        $appointment = $this->appointment();
        $message = $this->prepare($appointment);
        $this->prepare($appointment);
        $this->assertDatabaseCount('outbound_messages', 1);
        config(['messaging.sms_provider' => 'semaphore']);
        $delivery = app(OutboundDelivery::class);
        $delivery->deliver($message->id);
        $delivery->deliver($message->id);
        $this->assertSame('accepted', $message->fresh()->status);
        Http::assertSentCount(1);
        Http::assertSent(fn ($r) => str_contains($r->url(), 'twilio.com') && $r['To'] === '+639171234567');
        $next = $this->prepare($this->appointment());
        $delivery->deliver($next->id);
        $this->assertSame('semaphore', $next->fresh()->provider);
        $this->assertSame('accepted', $next->fresh()->status);
        Http::assertSentCount(2);
    }

    public function test_timeout_is_unknown_and_never_automatically_resent(): void
    {
        Http::fake(fn () => throw new ConnectionException('timeout'));
        $message = $this->prepare($this->appointment());
        app(OutboundDelivery::class)->deliver($message->id);
        $this->assertSame('unknown', $message->fresh()->status);
        app(OutboundDelivery::class)->deliver($message->id);
        $this->assertSame(1, $message->fresh()->attempt_count);
    }

    public function test_rate_limit_retries_are_bounded(): void
    {
        Http::fake(['*' => Http::response([], 429)]);
        $message = $this->prepare($this->appointment());
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            app(OutboundDelivery::class)->deliver($message->id);
            $this->assertSame($attempt, $message->fresh()->attempt_count);
            $this->travel(10)->minutes();
        }
        $this->assertSame('failed', $message->fresh()->status);
        Http::assertSentCount(3);
    }

    public function test_invalid_consent_and_test_allowlist_block_transport(): void
    {
        $appointment = $this->appointment(false);
        $result = app(AppointmentReminderService::class)->sendRecallAlert($appointment, 'sms');
        $this->assertSame('communication_consent_required', $result['errors']['sms']);
        config(['messaging.test_mode' => true]);
        $result = app(AppointmentReminderService::class)->sendRecallAlert($this->appointment(), 'sms');
        $this->assertSame('recipient_not_allowlisted', $result['errors']['sms']);
        Http::assertNothingSent();
        $this->assertDatabaseCount('outbound_messages', 0);
    }

    public function test_stale_appointment_and_revoked_consent_are_rechecked(): void
    {
        $appointment = $this->appointment();
        $message = $this->prepare($appointment);
        $appointment->update(['status' => 'cancelled']);
        app(OutboundDelivery::class)->deliver($message->id);
        $this->assertSame('skipped', $message->fresh()->status);
        $appointment = $this->appointment();
        $message = $this->prepare($appointment);
        DB::table('communication_preferences')->where('patient_id', $appointment->patient_id)->update(['sms' => false]);
        app(OutboundDelivery::class)->deliver($message->id);
        $this->assertSame('consent_or_contact_changed', $message->fresh()->error_code);
        Http::assertNothingSent();
    }

    public function test_email_has_recipient_and_is_only_accepted_not_delivered(): void
    {
        Mail::fake();
        $message = $this->prepare($this->appointment(), 'email');
        $this->assertDatabaseHas('appointment_reminders', ['recipient' => 'patient@example.test', 'status' => 'pending']);
        app(OutboundDelivery::class)->deliver($message->id);
        $this->assertSame('accepted', $message->fresh()->status);
        $this->assertNull($message->fresh()->delivered_at);
        $raw = DB::table('outbound_messages')->find($message->id);
        $this->assertNotSame('patient@example.test', $raw->recipient);
        $this->assertStringNotContainsString('Test clinic', $raw->body);
    }

    public function test_in_app_success_does_not_suppress_other_channels(): void
    {
        $appointment = $this->appointment();
        $account = PatientAccount::create(['name' => 'Patient', 'email' => 'account@example.test', 'password' => bcrypt('test-password'), 'is_active' => true]);
        $appointment->patient->accounts()->attach($account->id, ['relationship' => 'self', 'is_primary' => true, 'status' => 'verified']);
        $result = app(AppointmentReminderService::class)->sendRecallAlert($appointment, 'in_app');
        $this->assertSame('delivered', $result['channel_results']['in_app']['status']);
        $this->assertDatabaseCount('notifications', 1);
        $this->prepare($appointment->fresh());
        Queue::assertPushed(DeliverOutboundMessage::class);
        $this->assertDatabaseCount('outbound_messages', 2);
    }

    public function test_receipt_reconciliation_is_idempotent_and_does_not_inflate_counters(): void
    {
        Http::fake(['*' => Http::sequence()->push(['sid' => 'SMone', 'status' => 'queued'])->push(['sid' => 'SMone', 'status' => 'delivered'])]);
        $appointment = $this->appointment();
        $message = $this->prepare($appointment);
        app(OutboundDelivery::class)->deliver($message->id);
        $this->artisan('messaging:dispatch')->assertSuccessful();
        $this->artisan('messaging:dispatch')->assertSuccessful();
        $this->assertSame('delivered', $message->fresh()->status);
        $this->assertSame(1, $appointment->fresh()->reminder_sent_count);
        $this->assertSame(2, $message->attempts()->count());
    }

    public function test_clinic_isolation_and_input_validation(): void
    {
        $appointment = $this->appointment();
        $other = $this->appointment();
        $user = User::factory()->create(['clinic_id' => $appointment->clinic_id, 'role' => 'admin', 'is_active' => true]);
        $this->actingAs($user);
        $this->postJson('/api/appointments/'.$other->appointment_id.'/recall', ['channel' => 'sms'])->assertNotFound();
        $this->getJson('/api/appointments/'.$other->appointment_id.'/reminders')->assertNotFound();
        $this->putJson('/api/appointments/'.$other->appointment_id.'/messaging', ['sms' => true, 'email' => true, 'consent_confirmed' => true])->assertNotFound();
        $this->postJson('/api/appointments/bulk-recall', ['appointment_ids' => [$other->appointment_id]])->assertUnprocessable();
        $this->postJson('/api/appointments/'.$appointment->appointment_id.'/recall', ['channel' => 'invalid'])->assertUnprocessable();
        $this->postJson('/api/appointments/trigger-auto-recall', ['channel' => 'sms'])->assertSuccessful();
        $this->assertDatabaseCount('outbound_messages', 1);
        $this->assertSame($appointment->clinic_id, OutboundMessage::first()->clinic_id);
    }

    public function test_fake_provider_is_simulated_and_log_email_is_unavailable(): void
    {
        config(['messaging.sms_provider' => 'fake', 'mail.default' => 'log']);
        $appointment = $this->appointment();
        $message = $this->prepare($appointment);
        app(OutboundDelivery::class)->deliver($message->id);
        $this->assertSame('simulated', $message->fresh()->status);
        $this->assertNull($message->fresh()->accepted_at);
        $result = app(AppointmentReminderService::class)->sendRecallAlert($appointment, 'email');
        $this->assertSame('delivery_mailer_required', $result['errors']['email']);
        $this->assertSame('+639171234567', SmsManager::normalize('0917 123 4567'));
        Http::assertNothingSent();
    }

    public function test_confirmed_failure_can_be_retried_but_unknown_cannot(): void
    {
        Http::fake(['*' => Http::response([], 400)]);
        $appointment = $this->appointment();
        $message = $this->prepare($appointment);
        app(OutboundDelivery::class)->deliver($message->id);
        $this->assertSame('failed', $message->fresh()->status);
        $this->actingAs(User::factory()->create(['clinic_id' => $appointment->clinic_id, 'role' => 'admin', 'is_active' => true]));
        $url = '/api/appointments/'.$appointment->appointment_id.'/reminders/'.$message->id.'/retry';
        $this->postJson($url)->assertSuccessful();
        $this->assertSame('queued', $message->fresh()->status);
        $message->update(['status' => 'unknown']);
        $this->postJson($url)->assertUnprocessable();
    }

    public function test_preferences_require_confirmation_and_record_an_audit_event(): void
    {
        $appointment = $this->appointment(false);
        $this->actingAs(User::factory()->create(['clinic_id' => $appointment->clinic_id, 'role' => 'admin', 'is_active' => true]));
        $url = '/api/appointments/'.$appointment->appointment_id.'/messaging';
        $this->putJson($url, ['sms' => true, 'email' => false])->assertUnprocessable();
        $this->putJson($url, ['sms' => true, 'email' => false, 'consent_confirmed' => true])->assertSuccessful();
        $this->assertDatabaseHas('communication_preference_events', ['patient_id' => $appointment->patient_id, 'sms' => true, 'email' => false]);
    }

    public function test_staff_invitation_rejects_log_transport_without_claiming_delivery(): void
    {
        config(['mail.default' => 'log']);
        Mail::fake();
        $appointment = $this->appointment();
        $user = User::factory()->create(['clinic_id' => $appointment->clinic_id, 'role' => 'admin', 'is_active' => true]);
        $result = app(StaffInvitationService::class)->invite($user, ['email' => 'staff@example.test', 'role' => 'registration']);
        $this->assertFalse($result['email_sent']);
        Mail::assertNothingSent();
        $this->assertDatabaseHas('outbound_messages', ['purpose' => 'staff_invitation', 'status' => 'skipped', 'error_code' => 'delivery_mailer_required']);
    }

    public function test_worker_crash_is_marked_unknown_and_not_requeued(): void
    {
        $message = $this->prepare($this->appointment());
        $message->update(['status' => 'processing']);
        $this->travel(6)->minutes();
        Queue::fake();
        $this->artisan('messaging:dispatch')->assertSuccessful();
        $this->assertSame('unknown', $message->fresh()->status);
        Queue::assertNothingPushed();
        Http::assertNothingSent();
    }

    public function test_message_segment_estimates_handle_unicode_and_extension_characters(): void
    {
        $this->assertSame(['encoding' => 'GSM-7', 'segments' => 2], SmsLength::estimate(str_repeat('A', 161)));
        $this->assertSame(2, SmsLength::estimate(str_repeat('^', 81))['segments']);
        $this->assertSame(['encoding' => 'Unicode', 'segments' => 2], SmsLength::estimate(str_repeat('中', 71)));
    }
}
