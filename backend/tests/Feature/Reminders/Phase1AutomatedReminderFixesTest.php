<?php

namespace Tests\Feature\Reminders;

use App\Events\AppointmentStatusChanged;
use App\Jobs\DeliverOutboundMessage;
use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\OutboundMessage;
use App\Models\Patient;
use App\Models\PatientFollowupLog;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\AppointmentReminderService;
use App\Services\Messaging\OutboundDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\ConfiguresTestEmail;
use Tests\TestCase;

class Phase1AutomatedReminderFixesTest extends TestCase
{
    use ConfiguresTestEmail;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureTestEmail();
        Queue::fake();
        Http::preventStrayRequests();
        config([
            'messaging.sms_enabled' => true,
            'messaging.email_enabled' => true,
            'messaging.test_mode' => false,
            'messaging.sms_test_mode' => true,
            'messaging.sms_test_recipients' => ['+639171234567', '+639187654321'],
            'messaging.sms_provider' => 'unisms',
            'messaging.unisms.api_key' => 'test-unisms-key',
            'messaging.unisms.sender_id' => 'Unisoft',
            'messaging.sms_per_minute' => 30,
        ]);
    }

    private function seedOverdueContext(
        string $appointmentStatus = 'scheduled',
        bool $smsConsent = true,
        bool $emailConsent = false,
        ?string $episodeStatus = 'active',
        ?string $transferredTo = null,
        ?string $planStatus = 'approved',
        string $patientStatus = 'active',
        bool $createAppointment = true,
        int $daysAgo = 2,
    ): array {
        $clinic = Clinic::create([
            'name' => 'Tagoloan ABTC',
            'municipality' => 'Tagoloan',
            'province' => 'Misamis Oriental',
            'contact_number' => '09170001111',
        ]);

        $nurse = User::factory()->create([
            'clinic_id' => $clinic->id,
            'name' => 'Nurse Maria Santos',
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PT-P1-' . uniqid(),
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'contact_number' => '09171234567',
            'emergency_contact_name' => 'Ana Dela Cruz',
            'emergency_contact_number' => '09187654321',
            'email' => 'juan@example.test',
            'status' => $patientStatus,
        ]);

        DB::table('communication_preferences')->insert([
            'patient_id' => $patient->patient_id,
            'sms' => $smsConsent,
            'email' => $emailConsent,
            'recorded_by' => $nurse->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $biteDate = today()->subDays($daysAgo + 3)->toDateString();
        $incident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-P1-' . uniqid(),
            'episode_number' => 1,
            'episode_type' => 'primary',
            'bite_date' => $biteDate,
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion, Tagoloan',
            'severity' => 'moderate',
            'animal_type' => 'dog',
            'animal_status' => 'owned',
            'status' => $episodeStatus,
            'transferred_to_facility' => $transferredTo,
            'created_by' => $nurse->id,
        ]);

        TreatmentPlan::create([
            'clinic_id' => $clinic->id,
            'bite_id' => $incident->bite_id,
            'patient_id' => $patient->patient_id,
            'plan_type' => 'full_pep',
            'ordered_dose_days' => [0, 3, 7],
            'status' => $planStatus,
            'decided_by' => $nurse->id,
            'decided_at' => today()->subDays($daysAgo + 3),
        ]);

        TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'bite_id' => $incident->bite_id,
            'patient_id' => $patient->patient_id,
            'dose_number' => 0,
            'treatment_date' => $biteDate,
            'status' => 'completed',
            'administered_by' => $nurse->id,
        ]);

        $appointment = null;
        if ($createAppointment) {
            $appointment = Appointment::create([
                'clinic_id' => $clinic->id,
                'bite_id' => $incident->bite_id,
                'patient_id' => $patient->patient_id,
                'dose_number' => 3,
                'scheduled_date' => today()->subDays($daysAgo)->toDateString(),
                'appointment_date' => today()->subDays($daysAgo)->toDateString(),
                'appointment_type' => 'follow_up_vaccination',
                'status' => $appointmentStatus,
            ]);
        }

        return compact('clinic', 'nurse', 'patient', 'incident', 'appointment');
    }

    public function test_missed_and_scheduled_overdue_appointments_are_both_eligible_for_automated_and_manual_recall(): void
    {
        Http::fake([
            '*unismsapi.com/api/sms' => Http::response([
                'message' => ['reference_id' => 'unisms_missed_1', 'status' => 'pending'],
            ], 201),
        ]);

        $missedCtx = $this->seedOverdueContext(appointmentStatus: 'missed', daysAgo: 1);
        $scheduledCtx = $this->seedOverdueContext(appointmentStatus: 'scheduled', daysAgo: 3);

        $service = app(AppointmentReminderService::class);
        $missedSweep = $service->runAutomatedSweep('sms', $missedCtx['clinic']->id);
        $scheduledSweep = $service->runAutomatedSweep('sms', $scheduledCtx['clinic']->id);

        $this->assertSame(1, $missedSweep['missed_recalls_eligible']);
        $this->assertSame(1, $missedSweep['missed_recalls_sent']);
        $this->assertSame(1, $scheduledSweep['missed_recalls_eligible']);
        $this->assertSame(1, $scheduledSweep['missed_recalls_sent']);

        $this->assertDatabaseCount('outbound_messages', 2);
        Queue::assertPushed(DeliverOutboundMessage::class, 2);

        // Worker delivers both missed and scheduled recalls via UniSMS
        foreach (OutboundMessage::all() as $msg) {
            app(OutboundDelivery::class)->deliver($msg->id);
            $this->assertSame('accepted', $msg->fresh()->status);
        }

        Http::assertSentCount(2);
    }

    public function test_completed_cancelled_transferred_and_already_administered_appointments_are_blocked(): void
    {
        $service = app(AppointmentReminderService::class);

        $completedCtx = $this->seedOverdueContext(appointmentStatus: 'completed');
        $cancelledCtx = $this->seedOverdueContext(appointmentStatus: 'cancelled');
        $transferredCtx = $this->seedOverdueContext(appointmentStatus: 'missed', episodeStatus: 'transferred_out', transferredTo: 'Northern Mindanao Medical Center');
        $discontinuedCtx = $this->seedOverdueContext(appointmentStatus: 'scheduled', planStatus: 'cancelled');

        // Consultation outcome marked Transferred/Referred even while episode status is still active
        $referredConsultationCtx = $this->seedOverdueContext(appointmentStatus: 'scheduled');
        TreatmentRecord::create([
            'clinic_id' => $referredConsultationCtx['clinic']->id,
            'bite_id' => $referredConsultationCtx['incident']->bite_id,
            'patient_id' => $referredConsultationCtx['patient']->patient_id,
            'treatment_date' => today()->subDays(4)->toDateString(),
            'outcome' => 'Transferred/Referred',
            'status' => 'completed',
            'administered_by' => $referredConsultationCtx['nurse']->id,
        ]);

        // Appointment is still 'missed' in DB, but Day 3 dose was already recorded as completed
        $administeredCtx = $this->seedOverdueContext(appointmentStatus: 'missed');
        TreatmentRecord::create([
            'clinic_id' => $administeredCtx['clinic']->id,
            'bite_id' => $administeredCtx['incident']->bite_id,
            'patient_id' => $administeredCtx['patient']->patient_id,
            'appointment_id' => $administeredCtx['appointment']->appointment_id,
            'dose_number' => 3,
            'treatment_date' => today()->subDay()->toDateString(),
            'status' => 'completed',
            'administered_by' => $administeredCtx['nurse']->id,
        ]);

        foreach ([$completedCtx, $cancelledCtx, $transferredCtx, $discontinuedCtx, $referredConsultationCtx, $administeredCtx] as $ctx) {
            $res = $service->sendRecallAlert($ctx['appointment'], 'sms');
            $this->assertFalse($res['success']);
            $this->assertSame('Appointment is not eligible for this reminder.', $res['errors']['appointment']);

            $sweep = $service->runAutomatedSweep('sms', $ctx['clinic']->id);
            $this->assertSame(0, $sweep['missed_recalls_eligible']);
            $this->assertSame(0, $sweep['missed_recalls_sent']);
        }

        $this->assertDatabaseCount('outbound_messages', 0);
        Queue::assertNothingPushed();
        Http::assertNothingSent();
    }

    public function test_overdue_endpoint_is_read_only_and_does_not_mutate_statuses_or_broadcast(): void
    {
        Event::fake([AppointmentStatusChanged::class]);

        $scheduledCtx = $this->seedOverdueContext(appointmentStatus: 'scheduled');
        $missedAppt = Appointment::create([
            'clinic_id' => $scheduledCtx['clinic']->id,
            'bite_id' => $scheduledCtx['incident']->bite_id,
            'patient_id' => $scheduledCtx['patient']->patient_id,
            'dose_number' => 7,
            'scheduled_date' => today()->subDay()->toDateString(),
            'appointment_date' => today()->subDay()->toDateString(),
            'appointment_type' => 'follow_up_vaccination',
            'status' => 'missed',
        ]);

        Sanctum::actingAs($scheduledCtx['nurse']);
        $res = $this->getJson('/api/appointments/overdue')->assertOk();

        $this->assertSame(2, $res->json('count'));
        $this->assertSame('scheduled', $scheduledCtx['appointment']->fresh()->status);
        $this->assertSame('missed', $missedAppt->fresh()->status);
        Event::assertNotDispatched(AppointmentStatusChanged::class);
    }

    public function test_episode_followup_routes_guardian_and_no_appointment_sms_through_outbox_with_consent_and_allowlist(): void
    {
        Http::fake([
            '*unismsapi.com/api/sms' => Http::response([
                'message' => ['reference_id' => 'unisms_guardian_1', 'status' => 'pending'],
            ], 201),
        ]);

        // 1. Guardian SMS without consent must NOT send or queue
        $noConsentCtx = $this->seedOverdueContext(appointmentStatus: 'missed', smsConsent: false);
        Sanctum::actingAs($noConsentCtx['nurse']);

        $denied = $this->postJson("/api/cases/{$noConsentCtx['incident']->bite_id}/send-reminder", [
            'dose_day' => 3,
            'recipient_number' => '09187654321',
        ])->assertOk();

        $denied->assertJsonPath('delivery_status', 'logged_only');
        $this->assertStringContainsString('consent', strtolower((string) $denied->json('delivery_note')));
        $this->assertDatabaseCount('outbound_messages', 0);
        Http::assertNothingSent();

        // 2. Unauthorized arbitrary number is rejected
        $consentCtx = $this->seedOverdueContext(appointmentStatus: 'missed', smsConsent: true);
        Sanctum::actingAs($consentCtx['nurse']);

        $this->postJson("/api/cases/{$consentCtx['incident']->bite_id}/send-reminder", [
            'dose_day' => 3,
            'recipient_number' => '09190009999',
        ])->assertUnprocessable();

        // 3. Guardian SMS with consent + allowlist queues through OutboundMessage (NOT synchronous HTTP)
        $queued = $this->postJson("/api/cases/{$consentCtx['incident']->bite_id}/send-reminder", [
            'dose_day' => 3,
            'recipient_number' => '09187654321',
        ])->assertOk();

        $queued->assertJsonPath('delivery_status', 'queued');
        $queued->assertJsonPath('reused', false);
        Http::assertNothingSent(); // Must NOT bypass the queue!

        $message = OutboundMessage::firstOrFail();
        $this->assertSame('episode_followup', $message->purpose);
        $this->assertSame('+639187654321', $message->recipient);
        $this->assertSame('guardian', $message->context['recipient_type']);
        Queue::assertPushed(DeliverOutboundMessage::class, 1);

        // 4. Worker delivers through UniSMS
        app(OutboundDelivery::class)->deliver($message->id);
        $this->assertSame('accepted', $message->fresh()->status);
        $this->assertSame('unisms_guardian_1', $message->fresh()->provider_message_id);
        Http::assertSentCount(1);

        // 5. Overdue episode without a linked appointment row also routes through OutboundMessage
        $noApptCtx = $this->seedOverdueContext(smsConsent: true, createAppointment: false);
        Sanctum::actingAs($noApptCtx['nurse']);

        $noApptRes = $this->postJson("/api/cases/{$noApptCtx['incident']->bite_id}/send-reminder", [
            'dose_day' => 3,
        ])->assertOk();

        $noApptRes->assertJsonPath('delivery_status', 'queued');
        $episodeOnlyMsg = OutboundMessage::latest('id')->firstOrFail();
        $this->assertNull($episodeOnlyMsg->appointment_id);
        $this->assertSame('episode_followup', $episodeOnlyMsg->purpose);
        app(OutboundDelivery::class)->deliver($episodeOnlyMsg->id);
        $this->assertSame('accepted', $episodeOnlyMsg->fresh()->status);
        Http::assertSentCount(2);
    }

    public function test_guardian_sms_blocked_when_not_in_sms_test_allowlist(): void
    {
        config(['messaging.sms_test_recipients' => ['+639171234567']]); // Only patient number allowlisted, not guardian

        $ctx = $this->seedOverdueContext(appointmentStatus: 'missed', smsConsent: true, daysAgo: 1);
        Sanctum::actingAs($ctx['nurse']);

        $res = $this->postJson("/api/cases/{$ctx['incident']->bite_id}/send-reminder", [
            'dose_day' => 3,
            'recipient_number' => '09187654321',
        ])->assertOk();

        $res->assertJsonPath('delivery_status', 'logged_only');
        $this->assertStringContainsString('allowlist', strtolower((string) $res->json('delivery_note')));
        $this->assertDatabaseCount('outbound_messages', 0);
        Http::assertNothingSent();
    }

    public function test_queued_messages_revalidate_dose_completion_transfer_and_guardian_consent_at_delivery_time(): void
    {
        Http::fake();

        // A. Dose administered while recall SMS is queued
        $ctxA = $this->seedOverdueContext(appointmentStatus: 'missed', smsConsent: true);
        $resA = app(AppointmentReminderService::class)->sendRecallAlert($ctxA['appointment'], 'sms');
        $this->assertTrue($resA['success']);
        $msgA = OutboundMessage::latest('id')->firstOrFail();

        TreatmentRecord::create([
            'clinic_id' => $ctxA['clinic']->id,
            'bite_id' => $ctxA['incident']->bite_id,
            'patient_id' => $ctxA['patient']->patient_id,
            'dose_number' => 3,
            'treatment_date' => today()->toDateString(),
            'status' => 'completed',
            'administered_by' => $ctxA['nurse']->id,
        ]);

        app(OutboundDelivery::class)->deliver($msgA->id);
        $this->assertSame('skipped', $msgA->fresh()->status);
        $this->assertSame('appointment_changed_or_message_expired', $msgA->fresh()->error_code);

        // B. Episode transferred out while recall SMS is queued
        $ctxB = $this->seedOverdueContext(appointmentStatus: 'scheduled', smsConsent: true);
        app(AppointmentReminderService::class)->sendRecallAlert($ctxB['appointment'], 'sms');
        $msgB = OutboundMessage::latest('id')->firstOrFail();

        $ctxB['incident']->update(['status' => 'transferred_out', 'transferred_to_facility' => 'Other RHU']);
        app(OutboundDelivery::class)->deliver($msgB->id);
        $this->assertSame('skipped', $msgB->fresh()->status);
        $this->assertSame('appointment_changed_or_message_expired', $msgB->fresh()->error_code);

        // C. Guardian consent revoked while episode_followup SMS is queued
        $ctxC = $this->seedOverdueContext(appointmentStatus: 'missed', smsConsent: true);
        Sanctum::actingAs($ctxC['nurse']);
        $this->postJson("/api/cases/{$ctxC['incident']->bite_id}/send-reminder", [
            'dose_day' => 3,
            'recipient_number' => '09187654321',
        ])->assertOk();
        $msgC = OutboundMessage::latest('id')->firstOrFail();

        DB::table('communication_preferences')->where('patient_id', $ctxC['patient']->patient_id)->update(['sms' => false]);
        app(OutboundDelivery::class)->deliver($msgC->id);
        $this->assertSame('skipped', $msgC->fresh()->status);
        $this->assertSame('consent_or_contact_changed', $msgC->fresh()->error_code);

        Http::assertNothingSent();
    }

    public function test_manual_recall_reusing_existing_message_reports_duplicate_honestly(): void
    {
        Http::fake([
            '*unismsapi.com/api/sms' => Http::response([
                'message' => ['reference_id' => 'unisms_once_1', 'status' => 'pending'],
            ], 201),
        ]);

        $ctx = $this->seedOverdueContext(appointmentStatus: 'missed', smsConsent: true, daysAgo: 1);
        Sanctum::actingAs($ctx['nurse']);

        // 1. Automated sweep queues and worker delivers SMS for today
        app(AppointmentReminderService::class)->runAutomatedSweep('sms', $ctx['clinic']->id);
        $msg = OutboundMessage::firstOrFail();
        app(OutboundDelivery::class)->deliver($msg->id);
        $this->assertSame('accepted', $msg->fresh()->status);

        // 2. Manual recall via Bite Cases reuses same-day appointment idempotency key and reports duplicate honestly
        $second = $this->postJson("/api/cases/{$ctx['incident']->bite_id}/send-reminder", [
            'dose_day' => 3,
        ])->assertOk();

        $second->assertJsonPath('reused', true);
        $second->assertJsonPath('delivery_status', 'duplicate_suppressed');
        $second->assertJsonPath('log.status', 'sms_duplicate_skipped');
        $this->assertStringContainsString('Duplicate SMS suppressed', (string) $second->json('delivery_note'));
        $this->assertDatabaseCount('outbound_messages', 1);

        // 3. Manual recall via Vaccination Schedule endpoint also reports reuse honestly
        $journeyDup = $this->postJson("/api/appointments/{$ctx['appointment']->appointment_id}/recall", [
            'channel' => 'sms',
        ])->assertOk();

        $journeyDup->assertJsonPath('result.channel_results.sms.reused', true);
        $this->assertStringContainsString('already queued or sent today', strtolower((string) $journeyDup->json('message')));
        $this->assertDatabaseCount('outbound_messages', 1);
        Http::assertSentCount(1);
    }

    public function test_brevo_appointment_lifecycle_email_behavior_is_preserved(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response([
                'messageId' => '<brevo-preserved-1@example.test>',
            ], 201),
        ]);

        config([
            'services.brevo.key' => 'xkeysib-test-key',
            'services.brevo.sender_email' => 'clinic@example.test',
            'services.brevo.sender_name' => 'Tagoloan ABTC',
            'messaging.appointment_events_enabled' => true,
        ]);

        $ctx = $this->seedOverdueContext(smsConsent: false, emailConsent: true, createAppointment: false);
        $appt = Appointment::create([
            'clinic_id' => $ctx['clinic']->id,
            'bite_id' => $ctx['incident']->bite_id,
            'patient_id' => $ctx['patient']->patient_id,
            'dose_number' => 3,
            'scheduled_date' => today()->addDays(2)->toDateString(),
            'appointment_date' => today()->addDays(2)->toDateString(),
            'appointment_type' => 'follow_up_vaccination',
            'status' => 'scheduled',
        ]);

        $emailMessage = OutboundMessage::where('appointment_id', $appt->appointment_id)
            ->where('channel', 'email')
            ->where('purpose', 'appointment_update')
            ->firstOrFail();

        app(OutboundDelivery::class)->deliver($emailMessage->id);

        $this->assertSame('accepted', $emailMessage->fresh()->status);
        $this->assertSame('brevo', $emailMessage->fresh()->provider);
        $this->assertSame('<brevo-preserved-1@example.test>', $emailMessage->fresh()->provider_message_id);
        Http::assertSentCount(1);
    }
}
