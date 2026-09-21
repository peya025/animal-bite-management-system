<?php

namespace Tests\Feature;

use App\Http\Controllers\PatientInvitationController;
use App\Http\Requests\SendPatientInvitationRequest;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PatientInvitationEmailTest extends TestCase
{
    use RefreshDatabase;

    private function patient(?string $email = 'patient@example.com'): Patient
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']));
        return Patient::create([
            'clinic_id' => Clinic::create(['name' => 'Test Clinic'])->id,
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
        Mail::shouldReceive('raw')->twice()->andReturnNull();
        $this->assertSame(201, $this->send($patient)->getStatusCode());
        $invitation = PatientInvitation::firstOrFail();
        $this->assertNull($invitation->phone);
        $token = $invitation->token;
        $response = app(PatientInvitationController::class)->resend($invitation->id);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertNotSame($token, $invitation->fresh()->token);
    }

    public function test_missing_email_is_rejected(): void
    {
        $patient = $this->patient(null);
        Mail::shouldReceive('raw')->never();
        $this->assertSame(422, $this->send($patient)->getStatusCode());
        $this->assertDatabaseCount('patient_invitations', 0);
    }

    public function test_log_mailer_does_not_claim_delivery(): void
    {
        $patient = $this->patient();
        config(['mail.default' => 'log']);
        Mail::shouldReceive('raw')->never();
        $this->assertSame(503, $this->send($patient)->getStatusCode());
        $this->assertSame('expired', PatientInvitation::firstOrFail()->status);
    }

    public function test_failed_resend_preserves_previous_token(): void
    {
        $patient = $this->patient();
        config(['mail.default' => 'smtp']);
        Mail::shouldReceive('raw')->once()->andReturnNull();
        $this->send($patient);
        $invitation = PatientInvitation::firstOrFail();
        config(['mail.default' => 'log']);
        $response = app(PatientInvitationController::class)->resend($invitation->id);
        $this->assertSame(503, $response->getStatusCode());
        $this->assertSame($invitation->token, $invitation->fresh()->token);
    }

    public function test_bulk_counts_failed_delivery_as_skipped(): void
    {
        $patient = $this->patient();
        config(['mail.default' => 'smtp']);
        Mail::shouldReceive('raw')->once()->andThrow(new \RuntimeException('Delivery unavailable'));
        $response = app(PatientInvitationController::class)->bulkStore(
            new Request(['patient_ids' => [$patient->patient_id]])
        );
        $this->assertSame(0, $response->getData(true)['sent_count']);
        $this->assertSame(1, $response->getData(true)['skipped_count']);
        $this->assertSame('expired', PatientInvitation::firstOrFail()->status);
    }
}