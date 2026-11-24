<?php

namespace Tests\Feature;

use App\Mail\ClinicEmail;
use App\Mail\StaffInvitationMail;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\OutboundMessage;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientInvitation;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Services\Messaging\BrevoEmailService;
use App\Services\Messaging\DeliveryPolicy;
use App\Services\Messaging\EmailTransportInterface;
use App\Services\Messaging\OutboundDelivery;
use App\Services\Messaging\Sms\SmsResult;
use App\Services\Messaging\SmtpEmailService;
use App\Services\Patient\PatientInvitationService;
use App\Services\Staff\StaffInvitationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * Integration tests for BrevoEmailService and the Brevo transport path.
 *
 * All tests use Http::fake() — no real API calls are made.
 * No emails are sent during the test suite.
 */
class BrevoEmailServiceTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Shared setup
    // -------------------------------------------------------------------------

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();

        // Configure the Brevo transport for every test in this file.
        $this->configureBrevo();
    }

    /**
     * Point the container binding at BrevoEmailService and supply valid config.
     */
    private function configureBrevo(): void
    {
        config([
            'services.brevo.key'          => 'test-brevo-api-key',
            'services.brevo.url'          => 'https://api.brevo.com/v3',
            'services.brevo.sender_email' => 'clinic@example.test',
            'services.brevo.sender_name'  => 'Tagoloan ABTC',
            'mail.from.address'           => 'clinic@example.test',
            'mail.from.name'              => 'Tagoloan ABTC',
            'messaging.email_enabled'     => true,
            'messaging.test_mode'         => false,
            'app.url'                     => 'https://api.example.test',
            'app.frontend_url'            => 'https://staff.example.test',
            'messaging.appointment_events_enabled' => false,
        ]);

        // Re-bind so AppServiceProvider picks up the new config key.
        $this->app->bind(EmailTransportInterface::class, fn () => new BrevoEmailService());
    }

    private function brevoSuccess(?string $messageId = 'msg-id-001'): array
    {
        return ['messageId' => $messageId];
    }

    // -------------------------------------------------------------------------
    // BrevoEmailService unit-level tests
    // -------------------------------------------------------------------------

    // --- configurationError() ------------------------------------------------

    public function test_configuration_error_is_null_when_all_credentials_are_present(): void
    {
        Http::fake();
        $this->assertNull(app(BrevoEmailService::class)->configurationError());
    }

    public function test_configuration_error_when_api_key_missing(): void
    {
        Http::fake();
        config(['services.brevo.key' => null]);
        $this->assertSame('brevo_api_key_missing', app(BrevoEmailService::class)->configurationError());
    }

    public function test_configuration_error_when_sender_email_missing(): void
    {
        Http::fake();
        config(['services.brevo.sender_email' => null]);
        $this->assertSame('brevo_sender_email_missing', app(BrevoEmailService::class)->configurationError());
    }

    public function test_configuration_error_when_sender_email_invalid(): void
    {
        Http::fake();
        config(['services.brevo.sender_email' => 'not-an-email']);
        $this->assertSame('brevo_sender_email_missing', app(BrevoEmailService::class)->configurationError());
    }

    public function test_configuration_error_when_sender_name_contains_header_injection(): void
    {
        Http::fake();
        config(['services.brevo.sender_name' => "Legit Name\r\nBcc: attacker@evil.test"]);
        $this->assertSame('brevo_sender_name_invalid', app(BrevoEmailService::class)->configurationError());
    }

    public function test_configuration_error_does_not_make_network_calls(): void
    {
        Http::fake();
        app(BrevoEmailService::class)->configurationError();
        Http::assertNothingSent();
    }

    // --- send() — success ----------------------------------------------------

    public function test_send_returns_accepted_on_brevo_201(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess('id-abc'), 201)]);

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Hello', ['Test body'])
        );

        $this->assertSame('accepted', $result->status);
        $this->assertSame('id-abc', $result->messageId);
        $this->assertNull($result->error);
    }

    public function test_send_posts_to_correct_brevo_endpoint(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess(), 201)]);

        app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Line one'])
        );

        Http::assertSent(fn ($request) =>
            $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && $request->method() === 'POST'
            && $request->header('api-key')[0] === 'test-brevo-api-key'
            && $request['to'][0]['email'] === 'recipient@example.test'
            && $request['sender']['email'] === 'clinic@example.test'
            && $request['sender']['name'] === 'Tagoloan ABTC'
            && $request['subject'] === 'Subject'
            && str_contains($request['htmlContent'], 'Line one')
            && str_contains($request['textContent'], 'Line one')
        );
    }

    public function test_send_includes_both_html_and_text_parts(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess(), 201)]);

        app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Multi-part', ['The body content'])
        );

        Http::assertSent(fn ($request) =>
            ! empty($request['htmlContent'])
            && ! empty($request['textContent'])
            && str_contains($request['htmlContent'], 'The body content')
            && str_contains($request['textContent'], 'The body content')
        );
    }

    public function test_send_renders_activation_code_in_body_when_provided(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess(), 201)]);
        $token = str_repeat('x', 64);

        app(BrevoEmailService::class)->send(
            'patient@example.test',
            new ClinicEmail('Activate', ['Use this code.'], null, 'Open', $token)
        );

        Http::assertSent(fn ($request) =>
            str_contains($request['htmlContent'], $token)
            && str_contains($request['textContent'], $token)
        );
    }

    // --- send() — permanent failures -----------------------------------------

    public function test_send_returns_failed_on_brevo_400(): void
    {
        Http::fake(['*' => Http::response([], 400)]);

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('failed', $result->status);
        $this->assertSame('brevo_bad_request', $result->error);
    }

    public function test_send_returns_failed_on_brevo_401(): void
    {
        Http::fake(['*' => Http::response([], 401)]);

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('failed', $result->status);
        $this->assertSame('brevo_authentication_failed', $result->error);
    }

    public function test_send_returns_failed_on_brevo_403(): void
    {
        Http::fake(['*' => Http::response([], 403)]);

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('failed', $result->status);
        $this->assertSame('brevo_authentication_failed', $result->error);
    }

    // --- send() — transient failures -----------------------------------------

    public function test_send_returns_retry_on_brevo_429(): void
    {
        Http::fake(['*' => Http::response([], 429)]);

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('retry', $result->status);
        $this->assertSame('brevo_rate_limited', $result->error);
    }

    public function test_send_returns_retry_on_brevo_500(): void
    {
        Http::fake(['*' => Http::response([], 500)]);

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('retry', $result->status);
        $this->assertSame('brevo_server_error', $result->error);
    }

    public function test_send_returns_retry_on_brevo_503(): void
    {
        Http::fake(['*' => Http::response([], 503)]);

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('retry', $result->status);
        $this->assertSame('brevo_server_error', $result->error);
    }

    // --- send() — connection timeout -----------------------------------------

    public function test_send_returns_unknown_on_connection_timeout(): void
    {
        Http::fake(fn () => throw new ConnectionException('Connection timed out'));

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('unknown', $result->status);
        $this->assertSame('brevo_connection_timeout', $result->error);
    }

    public function test_failure_method_maps_connection_exception_to_unknown(): void
    {
        Http::fake();
        $result = app(BrevoEmailService::class)->failure(
            new ConnectionException('timed out')
        );

        $this->assertSame('unknown', $result->status);
        $this->assertSame('brevo_connection_timeout', $result->error);
    }

    public function test_failure_method_maps_generic_exception_to_unknown(): void
    {
        Http::fake();
        $result = app(BrevoEmailService::class)->failure(
            new \RuntimeException('some internal error')
        );

        $this->assertSame('unknown', $result->status);
        $this->assertSame('brevo_unexpected_error', $result->error);
    }

    // --- send() — input validation guards ------------------------------------

    public function test_send_rejects_invalid_recipient_address(): void
    {
        Http::fake();
        $result = app(BrevoEmailService::class)->send(
            'not-an-email',
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('failed', $result->status);
        $this->assertSame('invalid_email', $result->error);
        Http::assertNothingSent();
    }

    public function test_send_rejects_header_injection_in_recipient(): void
    {
        Http::fake();
        $result = app(BrevoEmailService::class)->send(
            "valid@example.test\r\nBcc: attacker@evil.test",
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('failed', $result->status);
        $this->assertSame('invalid_email', $result->error);
        Http::assertNothingSent();
    }

    public function test_send_returns_config_error_when_api_key_missing(): void
    {
        Http::fake();
        config(['services.brevo.key' => null]);

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('failed', $result->status);
        $this->assertSame('brevo_api_key_missing', $result->error);
        Http::assertNothingSent();
    }

    // --- API key never logged or leaked --------------------------------------

    public function test_api_key_is_never_exposed_in_logs(): void
    {
        Http::fake(['*' => Http::response([], 401)]);
        Log::spy();

        app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Body'])
        );

        // Any logged context must not include the API key value.
        Log::shouldNotHaveReceived('error', fn ($args) =>
            str_contains(json_encode($args), 'test-brevo-api-key')
        );
    }

    // -------------------------------------------------------------------------
    // Staff invitation — full workflow through BrevoEmailService
    // -------------------------------------------------------------------------

    private function adminAndClinic(): array
    {
        $clinic = Clinic::create(['name' => 'Tagoloan ABTC']);
        $admin  = User::factory()->create([
            'clinic_id' => $clinic->id,
            'role'      => 'admin',
            'is_active' => true,
        ]);

        return [$admin, $clinic];
    }

    public function test_staff_invitation_succeeds_via_brevo_transport(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess('staff-msg-id'), 201)]);
        [$admin] = $this->adminAndClinic();

        $result = app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        $this->assertTrue($result['email_sent']);
        $this->assertSame('accepted', $result['delivery_status']);
        $this->assertSame('Invitation email accepted for delivery to nurse@example.test.', $result['message']);
        $this->assertDatabaseHas('staff_invitations', [
            'email'  => 'nurse@example.test',
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('outbound_messages', [
            'purpose'  => 'staff_invitation',
            'provider' => 'brevo',
            'status'   => 'accepted',
        ]);

        // Verify the Brevo endpoint was actually called once.
        Http::assertSentCount(1);
    }

    public function test_staff_invitation_email_failure_leaves_invitation_pending(): void
    {
        Http::fake(['*' => Http::response([], 401)]);
        [$admin] = $this->adminAndClinic();

        $result = app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        $this->assertFalse($result['email_sent']);

        // Core assertion for Task 5: invitation must remain PENDING, not expired.
        $this->assertDatabaseHas('staff_invitations', [
            'email'  => 'nurse@example.test',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('outbound_messages', [
            'purpose'    => 'staff_invitation',
            'status'     => 'failed',
            'error_code' => 'brevo_authentication_failed',
        ]);
    }

    public function test_staff_invitation_token_is_valid_after_brevo_failure(): void
    {
        Http::fake(['*' => Http::response([], 503)]);
        [$admin] = $this->adminAndClinic();

        app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        $invitation = StaffInvitation::firstOrFail();

        // Token must be queryable by its hash — confirming it was not wiped.
        $this->assertNotNull(StaffInvitation::forToken($invitation->token)->first());
        $this->assertTrue($invitation->isValid());
    }

    public function test_staff_invitation_duplicate_blocked_while_pending_exists(): void
    {
        Http::fake(['*' => Http::response([], 503)]);
        [$admin] = $this->adminAndClinic();

        // First invite fails delivery but leaves invitation pending.
        app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        // Second invite to the same email must be rejected (not create a duplicate).
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);
    }

    public function test_staff_invitation_resend_succeeds_after_initial_delivery_failure(): void
    {
        // Phase 1: three 503s (InvitationDelivery retries 3× on 'retry' result),
        // then Phase 2: 201 for the successful resend.
        Http::fake(['*' => Http::sequence()
            ->push([], 503)  // attempt 1
            ->push([], 503)  // attempt 2
            ->push([], 503)  // attempt 3
            ->push($this->brevoSuccess('resend-msg'), 201), // resend
        ]);

        [$admin] = $this->adminAndClinic();

        app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        $invitation    = StaffInvitation::firstOrFail();
        $originalToken = $invitation->token;

        // Advance past the InvitationDelivery rate-limit window (60 s).
        $this->travel(61)->seconds();

        $result = app(StaffInvitationService::class)->resend($admin, $invitation->id);

        $this->assertTrue($result['email_sent']);
        // Token must rotate on successful resend.
        $this->assertNotSame($originalToken, $invitation->fresh()->token);
        $this->assertSame('pending', $invitation->fresh()->status);
    }

    // -------------------------------------------------------------------------
    // Patient portal invitation — full workflow through BrevoEmailService
    // -------------------------------------------------------------------------

    private function adminAndPatient(?string $email = 'patient@example.test'): array
    {
        $clinic  = Clinic::create(['name' => 'Tagoloan ABTC']);
        $admin   = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'admin', 'is_active' => true]);
        $patient = Patient::create([
            'clinic_id'  => $clinic->id,
            'first_name' => 'Maria',
            'last_name'  => 'Santos',
            'gender'     => 'female',
            'email'      => $email,
        ]);

        return [$admin, $patient];
    }

    public function test_patient_invitation_succeeds_via_brevo_transport(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess('patient-msg-id'), 201)]);
        [$admin, $patient] = $this->adminAndPatient();

        $result = app(PatientInvitationService::class)->send($patient->patient_id, $admin->id);

        $this->assertSame(201, $result['status']);
        $this->assertDatabaseHas('patient_invitations', [
            'patient_id' => $patient->patient_id,
            'status'     => 'pending',
        ]);
        $this->assertDatabaseHas('outbound_messages', [
            'purpose' => 'patient_invitation',
            'status'  => 'accepted',
        ]);
    }

    public function test_patient_invitation_includes_activation_code_in_brevo_payload(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess(), 201)]);
        [$admin, $patient] = $this->adminAndPatient();

        app(PatientInvitationService::class)->send($patient->patient_id, $admin->id);

        $token = PatientInvitation::firstOrFail()->token;

        // Activation code (token) must appear in the HTML payload so the patient
        // can copy-paste it into the mobile app.
        Http::assertSent(fn ($request) =>
            str_contains($request['htmlContent'], $token)
            && str_contains($request['textContent'], $token)
        );
    }

    public function test_patient_invitation_failure_leaves_token_pending(): void
    {
        Http::fake(['*' => Http::response([], 401)]);
        [$admin, $patient] = $this->adminAndPatient();

        $result = app(PatientInvitationService::class)->send($patient->patient_id, $admin->id);

        $this->assertSame(503, $result['status']);

        // Token must remain valid — do not expire on delivery failure.
        $invitation = PatientInvitation::firstOrFail();
        $this->assertSame('pending', $invitation->status);
        $this->assertTrue($invitation->isPending());
    }

    public function test_patient_invitation_duplicate_blocked_while_pending_exists(): void
    {
        Http::fake(['*' => Http::response([], 503)]);
        [$admin, $patient] = $this->adminAndPatient();

        app(PatientInvitationService::class)->send($patient->patient_id, $admin->id);

        // Second send must return 422 (duplicate guard), not create a second record.
        $result = app(PatientInvitationService::class)->send($patient->patient_id, $admin->id);

        $this->assertSame(422, $result['status']);
        $this->assertDatabaseCount('patient_invitations', 1);
    }

    public function test_patient_invitation_resend_rotates_token_after_initial_failure(): void
    {
        // Phase 1: three 503s for the initial failed send,
        // then Phase 2: 201 for the successful resend.
        Http::fake(['*' => Http::sequence()
            ->push([], 503)  // attempt 1
            ->push([], 503)  // attempt 2
            ->push([], 503)  // attempt 3
            ->push($this->brevoSuccess('resent-patient-msg'), 201), // resend
        ]);

        [$admin, $patient] = $this->adminAndPatient();

        app(PatientInvitationService::class)->send($patient->patient_id, $admin->id);
        $invitation    = PatientInvitation::firstOrFail();
        $originalToken = $invitation->token;

        // Advance past the InvitationDelivery rate-limit window (60 s).
        $this->travel(61)->seconds();

        $result = app(PatientInvitationService::class)->resend($invitation->id);

        $this->assertSame(200, $result['status']);
        $this->assertNotSame($originalToken, $invitation->fresh()->token);
        $this->assertSame('pending', $invitation->fresh()->status);
    }

    public function test_patient_token_remains_activatable_after_delivery_failure(): void
    {
        Http::fake(['*' => Http::response([], 500)]);
        [$admin, $patient] = $this->adminAndPatient();

        app(PatientInvitationService::class)->send($patient->patient_id, $admin->id);

        $invitation = PatientInvitation::firstOrFail();

        // The token must still be found by hash — confirming it was stored and
        // not wiped after the failed send.
        $this->assertNotNull(PatientInvitation::forToken($invitation->token)->first());
    }

    // -------------------------------------------------------------------------
    // InvitationDelivery retry behaviour with BrevoEmailService
    // -------------------------------------------------------------------------

    public function test_invitation_delivery_retries_up_to_three_times_on_rate_limit(): void
    {
        $calls = 0;
        Http::fake(function () use (&$calls) {
            $calls++;
            if ($calls < 3) {
                return Http::response([], 429);
            }

            return Http::response($this->brevoSuccess('final-id'), 201);
        });

        [$admin] = $this->adminAndClinic();

        $result = app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        $this->assertTrue($result['email_sent']);
        $this->assertSame(3, $calls);
        $this->assertDatabaseHas('outbound_messages', [
            'status'      => 'accepted',
            'attempt_count' => 3,
        ]);
    }

    public function test_invitation_delivery_stops_retrying_on_permanent_auth_failure(): void
    {
        $calls = 0;
        Http::fake(function () use (&$calls) {
            $calls++;

            return Http::response([], 401);
        });

        [$admin] = $this->adminAndClinic();

        $result = app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        $this->assertFalse($result['email_sent']);
        // A permanent failure (401) must not be retried.
        $this->assertSame(1, $calls);
        $this->assertDatabaseHas('outbound_messages', [
            'status'      => 'failed',
            'error_code'  => 'brevo_authentication_failed',
            'attempt_count' => 1,
        ]);
    }

    public function test_invitation_delivery_treats_timeout_as_unknown_and_does_not_retry(): void
    {
        $calls = 0;
        Http::fake(function () use (&$calls) {
            $calls++;
            throw new ConnectionException('timed out');
        });

        [$admin] = $this->adminAndClinic();

        $result = app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        $this->assertFalse($result['email_sent']);
        // After a timeout outcome is 'unknown'. InvitationDelivery treats unknown
        // as non-retry (not in ['retry']) so the loop breaks after one attempt.
        $this->assertSame(1, $calls);
        $this->assertDatabaseHas('outbound_messages', [
            'status'    => 'unknown',
            'error_code' => 'brevo_connection_timeout',
        ]);
        // Invitation stays pending — do not expire on unknown outcome.
        $this->assertDatabaseHas('staff_invitations', ['status' => 'pending']);
    }

    // -------------------------------------------------------------------------
    // AccountSecurityEmail (password change notice) via Brevo
    // -------------------------------------------------------------------------

    public function test_password_change_security_notice_is_sent_via_brevo(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess('security-msg'), 201)]);

        $clinic   = Clinic::create(['name' => 'Test']);
        $account  = PatientAccount::create([
            'name'     => 'Maria Santos',
            'email'    => 'patient@example.test',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        app(\App\Services\Messaging\AccountSecurityEmail::class)->passwordChanged($account);

        $this->assertDatabaseHas('outbound_messages', [
            'purpose' => 'password_changed',
            'status'  => 'accepted',
        ]);
        Http::assertSentCount(1);
    }

    // -------------------------------------------------------------------------
    // DeliveryPolicy gates Brevo the same way it gated SMTP
    // -------------------------------------------------------------------------

    public function test_delivery_policy_blocks_send_when_email_channel_disabled(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess(), 201)]);
        config(['messaging.email_enabled' => false]);
        [$admin] = $this->adminAndClinic();

        $result = app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        $this->assertFalse($result['email_sent']);
        $this->assertDatabaseHas('outbound_messages', [
            'status'    => 'skipped',
            'error_code' => 'channel_disabled',
        ]);
        Http::assertNothingSent();
    }

    public function test_delivery_policy_blocks_send_in_test_mode_for_unlisted_recipient(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess(), 201)]);
        config(['messaging.test_mode' => true, 'messaging.test_recipients' => ['allowed@example.test']]);
        [$admin] = $this->adminAndClinic();

        $result = app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        $this->assertFalse($result['email_sent']);
        $this->assertDatabaseHas('outbound_messages', ['error_code' => 'recipient_not_allowlisted']);
        Http::assertNothingSent();
    }

    public function test_delivery_policy_mailer_ready_returns_true_when_brevo_is_configured(): void
    {
        Http::fake();
        $this->assertTrue(app(\App\Services\Messaging\DeliveryPolicy::class)->mailerReady());
    }

    public function test_delivery_policy_mailer_ready_returns_false_when_api_key_absent(): void
    {
        Http::fake();
        config(['services.brevo.key' => null]);
        // Re-bind so configurationError() is called on the new config.
        $this->app->bind(EmailTransportInterface::class, fn () => new BrevoEmailService());
        $this->assertFalse(app(\App\Services\Messaging\DeliveryPolicy::class)->mailerReady());
    }

    // -------------------------------------------------------------------------
    // Phase 3 regression tests: sender From header, provider tracking,
    // accepted-vs-delivered semantics, SMTP isolation, and test-mode guards
    // -------------------------------------------------------------------------

    public function test_send_renders_and_succeeds_when_mail_from_address_is_empty(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess('empty-from-msg'), 201)]);

        // Mirror Railway configuration where MAIL_MAILER=log and MAIL_FROM_* are unset.
        config([
            'mail.default'                => 'log',
            'mail.from.address'           => null,
            'mail.from.name'              => null,
            'services.brevo.sender_email' => 'verified-sender@abtc.example.test',
            'services.brevo.sender_name'  => 'Tagoloan ABTC Verified',
        ]);

        $mail = new ClinicEmail('Verify Rendering', ['Line A', 'Line B']);
        $result = app(BrevoEmailService::class)->send('staff@example.test', $mail);

        $this->assertSame('accepted', $result->status);
        $this->assertSame('empty-from-msg', $result->messageId);
        $this->assertNull($result->error);

        // The Mailable must have received the verified Brevo sender From header.
        $this->assertSame([
            ['name' => 'Tagoloan ABTC Verified', 'address' => 'verified-sender@abtc.example.test'],
        ], $mail->from);

        // The Brevo API payload must carry the exact verified sender and rendered HTML + text.
        Http::assertSent(fn ($request) =>
            $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && $request['sender']['email'] === 'verified-sender@abtc.example.test'
            && $request['sender']['name'] === 'Tagoloan ABTC Verified'
            && $request['subject'] === 'Verify Rendering'
            && str_contains($request['htmlContent'], 'Line A')
            && str_contains($request['htmlContent'], 'Line B')
            && str_contains($request['textContent'], 'Line A')
            && str_contains($request['textContent'], 'Line B')
        );
    }

    public function test_staff_invitation_renders_full_email_when_mail_from_address_is_empty_string(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess('staff-empty-from'), 201)]);

        config([
            'mail.default'                => 'log',
            'mail.from.address'           => '',
            'mail.from.name'              => '',
            'services.brevo.sender_email' => 'noreply@abtc.example.test',
            'services.brevo.sender_name'  => 'Tagoloan Animal Bite Treatment Center',
        ]);

        [$admin] = $this->adminAndClinic();

        $result = app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'intake_nurse',
        ]);

        $invitation = StaffInvitation::firstOrFail();
        $expectedLink = 'https://staff.example.test/accept-invitation/'.$invitation->token;

        $this->assertTrue($result['email_sent']);
        $this->assertSame('accepted', $result['delivery_status']);
        $this->assertStringNotContainsString('delivered', strtolower($result['message']));

        Http::assertSent(fn ($request) =>
            $request['sender']['email'] === 'noreply@abtc.example.test'
            && $request['sender']['name'] === 'Tagoloan Animal Bite Treatment Center'
            && $request['to'][0]['email'] === 'nurse@example.test'
            && $request['subject'] === 'Invitation to Join Tagoloan ABTC'
            && str_contains($request['htmlContent'], $expectedLink)
            && str_contains($request['textContent'], $expectedLink)
            && str_contains($request['htmlContent'], 'Intake Nurse')
            && str_contains($request['textContent'], 'Intake Nurse')
            && str_contains($request['htmlContent'], 'This invitation will expire on')
            && str_contains($request['textContent'], 'This invitation will expire on')
        );
    }

    public function test_send_returns_config_error_and_makes_no_http_call_when_brevo_sender_email_missing(): void
    {
        Http::fake();
        config(['services.brevo.sender_email' => null]);

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('Subject', ['Body'])
        );

        $this->assertSame('failed', $result->status);
        $this->assertSame('brevo_sender_email_missing', $result->error);
        Http::assertNothingSent();
    }

    public function test_http_201_records_accepted_not_delivered_in_outbound_ledger(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess('brevo-201-id'), 201)]);
        [$admin] = $this->adminAndClinic();

        $result = app(StaffInvitationService::class)->invite($admin, [
            'email'            => 'nurse@example.test',
            'workstation_role' => 'doctor',
        ]);

        $this->assertSame('accepted', $result['delivery_status']);

        $message = OutboundMessage::where('purpose', 'staff_invitation')->firstOrFail();
        $this->assertSame('accepted', $message->status);
        $this->assertSame('brevo', $message->provider);
        $this->assertSame('brevo-201-id', $message->provider_message_id);
        $this->assertNotNull($message->accepted_at);
        $this->assertNull($message->delivered_at);

        $this->assertDatabaseHas('outbound_message_attempts', [
            'outbound_message_id' => $message->id,
            'provider'            => 'brevo',
            'status'              => 'accepted',
            'provider_message_id' => 'brevo-201-id',
        ]);
    }

    public function test_brevo_transport_does_not_attempt_smtp_connection_even_when_mail_default_is_smtp(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess('no-smtp-id'), 201)]);

        // Point default mailer at an unreachable SMTP port; Brevo must render
        // solely via the in-memory array mailer and never touch SMTP sockets.
        config([
            'mail.default'                 => 'smtp',
            'mail.mailers.smtp.host'       => '127.0.0.1',
            'mail.mailers.smtp.port'       => 1,
            'mail.mailers.smtp.username'   => 'unused',
            'mail.mailers.smtp.password'   => 'unused',
            'mail.from.address'            => null,
        ]);

        $result = app(BrevoEmailService::class)->send(
            'recipient@example.test',
            new ClinicEmail('No SMTP', ['Rendered in memory only.'])
        );

        $this->assertSame('accepted', $result->status);
        $this->assertSame('no-smtp-id', $result->messageId);
        Http::assertSentCount(1);
    }

    public function test_provider_tracking_records_brevo_when_mail_mailer_is_log_and_preserves_smtp_when_smtp_active(): void
    {
        config(['mail.default' => 'log']);
        $this->assertSame('brevo', DeliveryPolicy::emailProvider());

        // When SMTP transport is bound, existing SMTP provider identification is preserved.
        $this->app->bind(EmailTransportInterface::class, fn () => new SmtpEmailService());
        config(['mail.default' => 'smtp']);
        $this->assertSame('smtp', DeliveryPolicy::emailProvider());
        $this->assertSame('smtp', DeliveryPolicy::emailProvider('smtp'));
    }

    public function test_outbound_delivery_records_brevo_provider_and_enforces_test_mode_allowlist(): void
    {
        Http::fake(['*' => Http::response($this->brevoSuccess('outbound-brevo-id'), 201)]);
        config(['mail.default' => 'log']);

        [$admin, $patient] = $this->adminAndPatient('allowed-patient@example.test');
        DB::table('communication_preferences')->insert([
            'patient_id'  => $patient->patient_id,
            'email'       => true,
            'sms'         => false,
            'recorded_by' => $admin->id,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $appointment = Appointment::create([
            'clinic_id'        => $patient->clinic_id,
            'patient_id'       => $patient->patient_id,
            'appointment_date' => now()->toDateString(),
            'scheduled_date'   => now()->toDateString(),
            'status'           => 'scheduled',
        ]);

        // 1. Test mode blocks unlisted recipient in OutboundDelivery.
        config([
            'messaging.test_mode'       => true,
            'messaging.test_recipients' => ['other@example.test'],
        ]);

        $blocked = OutboundMessage::create([
            'clinic_id'       => $patient->clinic_id,
            'patient_id'      => $patient->patient_id,
            'appointment_id'  => $appointment->appointment_id,
            'channel'         => 'email',
            'purpose'         => 'advance',
            'provider'        => 'log',
            'recipient'       => 'allowed-patient@example.test',
            'subject'         => 'Appointment Reminder',
            'body'            => 'Your appointment is today.',
            'status'          => 'queued',
            'idempotency_key' => hash('sha256', 'blocked-outbound-test'),
            'context'         => [
                'scheduled_date'  => now()->toDateString(),
                'occurrence_date' => now()->toDateString(),
            ],
        ]);

        app(OutboundDelivery::class)->deliver($blocked->id);

        $blocked->refresh();
        $this->assertSame('skipped', $blocked->status);
        $this->assertSame('recipient_not_allowlisted', $blocked->error_code);
        $this->assertSame('brevo', $blocked->provider);
        Http::assertNothingSent();

        // 2. Allowlisted recipient succeeds via Brevo, recording provider='brevo', status='accepted', delivered_at=null.
        config([
            'messaging.test_mode'       => true,
            'messaging.test_recipients' => ['allowed-patient@example.test'],
        ]);

        $allowed = OutboundMessage::create([
            'clinic_id'       => $patient->clinic_id,
            'patient_id'      => $patient->patient_id,
            'appointment_id'  => $appointment->appointment_id,
            'channel'         => 'email',
            'purpose'         => 'advance',
            'provider'        => 'log',
            'recipient'       => 'allowed-patient@example.test',
            'subject'         => 'Appointment Reminder',
            'body'            => 'Your appointment is today.',
            'status'          => 'queued',
            'idempotency_key' => hash('sha256', 'allowed-outbound-test'),
            'context'         => [
                'scheduled_date'  => now()->toDateString(),
                'occurrence_date' => now()->toDateString(),
            ],
        ]);

        app(OutboundDelivery::class)->deliver($allowed->id);

        $allowed->refresh();
        $this->assertSame('accepted', $allowed->status);
        $this->assertSame('brevo', $allowed->provider);
        $this->assertSame('outbound-brevo-id', $allowed->provider_message_id);
        $this->assertNotNull($allowed->accepted_at);
        $this->assertNull($allowed->delivered_at);
        Http::assertSentCount(1);
    }
}
