<?php

namespace Tests\Feature;

use App\Http\Controllers\Auth\PatientInvitationController;
use App\Http\Requests\SendPatientInvitationRequest;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientInvitation;
use App\Models\User;
use App\Services\Messaging\Sms\SmsResult;
use App\Services\Messaging\SmtpEmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\ConfiguresTestEmail;
use Tests\TestCase;

class PatientInvitationEmailTest extends TestCase
{
    use ConfiguresTestEmail;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureTestEmail();
        config(['messaging.email_enabled' => true, 'messaging.test_mode' => false]);
    }

    private function patient(?string $email = 'patient@example.com'): Patient
    {
        $clinic = Clinic::create(['name' => 'Test Clinic']);
        $this->actingAs(User::factory()->create(['role' => 'admin', 'clinic_id' => $clinic->id]));

        return Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Test',
            'last_name' => 'Patient',
            'gender' => 'female',
            'email' => $email,
            'contact_number' => null,
        ]);
    }

    private function send(Patient $patient)
    {
        return app(PatientInvitationController::class)->store(
            new SendPatientInvitationRequest(['patient_id' => $patient->patient_id])
        );
    }

    public function test_email_invite_without_phone_and_resend(): void
    {
        $patient = $this->patient();
        config(['mail.default' => 'smtp']);

        $this->assertSame(201, $this->send($patient)->getStatusCode());
        $invitation = PatientInvitation::firstOrFail();
        $this->assertNull($invitation->phone);
        $token = $invitation->token;
        $this->travel(61)->seconds();
        $response = app(PatientInvitationController::class)->resend($invitation->id);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertNotSame($token, $invitation->fresh()->token);
    }

    public function test_missing_email_is_rejected(): void
    {
        $patient = $this->patient(null);

        $this->assertSame(422, $this->send($patient)->getStatusCode());
        $this->assertDatabaseCount('patient_invitations', 0);
    }

    public function test_log_mailer_does_not_claim_delivery(): void
    {
        $patient = $this->patient();
        config(['mail.default' => 'log']);

        $response = $this->send($patient);
        $this->assertSame(503, $response->getStatusCode());
        // Token must remain valid after a delivery failure so staff can retry.
        $this->assertSame('pending', PatientInvitation::firstOrFail()->status);
    }

    public function test_failed_resend_preserves_previous_token(): void
    {
        $patient = $this->patient();
        config(['mail.default' => 'smtp']);

        $this->send($patient);
        $invitation = PatientInvitation::firstOrFail();
        config(['mail.default' => 'log']);
        $this->travel(61)->seconds();
        $response = app(PatientInvitationController::class)->resend($invitation->id);
        $this->assertSame(503, $response->getStatusCode());
        $this->assertSame($invitation->token, $invitation->fresh()->token);
        // Status must remain pending so the original token is still activatable.
        $this->assertSame('pending', $invitation->fresh()->status);
    }

    public function test_bulk_counts_failed_delivery_as_skipped(): void
    {
        $patient = $this->patient();
        config(['mail.default' => 'smtp']);
        $mock = $this->partialMock(SmtpEmailService::class, fn ($mock) => $mock->shouldReceive('send')->once()->andReturn(new SmsResult('failed', error: 'smtp_rejected')));
        $this->instance(\App\Services\Messaging\EmailTransportInterface::class, $mock);
        $response = app(PatientInvitationController::class)->bulkStore(
            new Request(['patient_ids' => [$patient->patient_id]])
        );
        $this->assertSame(0, $response->getData(true)['sent_count']);
        $this->assertSame(1, $response->getData(true)['skipped_count']);
        // Token must remain valid after delivery failure — do not expire.
        $this->assertSame('pending', PatientInvitation::firstOrFail()->status);
    }
}
