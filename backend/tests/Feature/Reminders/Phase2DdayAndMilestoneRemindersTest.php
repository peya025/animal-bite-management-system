<?php

namespace Tests\Feature\Reminders;

use App\Jobs\DeliverOutboundMessage;
use App\Jobs\SendFcmPushNotification;
use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\OutboundMessage;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\AppointmentReminderService;
use App\Services\Clinical\EpisodeFollowupService;
use App\Services\Messaging\OutboundDelivery;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\ConfiguresTestEmail;
use Tests\TestCase;

class Phase2DdayAndMilestoneRemindersTest extends TestCase
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
            'app.timezone' => 'Asia/Manila',
            'messaging.reminders.timezone' => 'Asia/Manila',
            'messaging.reminders.same_day_enabled' => true,
            'messaging.reminders.overdue_milestones' => [1, 3, 7],
            'messaging.sms_enabled' => true,
            'messaging.email_enabled' => true,
            'messaging.test_mode' => false,
            'messaging.sms_test_mode' => true,
            'messaging.sms_test_recipients' => ['+639171234567'],
            'messaging.sms_provider' => 'unisms',
            'messaging.unisms.api_key' => 'test-unisms-key',
            'messaging.unisms.sender_id' => 'Unisoft',
            'messaging.sms_per_minute' => 30,
        ]);
    }

    private function seedAppointmentForDayOffset(
        int $dayOffsetFromToday,
        string $status = 'scheduled',
        bool $smsConsent = true,
        bool $emailConsent = false,
        string $phone = '09171234567',
        string $clinicName = 'Tagoloan ABTC',
        ?string $clinicPhone = null,
        ?string $appointmentTime = null,
        string $episodeStatus = 'active',
        ?string $transferredTo = null,
        bool $linkAccount = false,
    ): array {
        $tz = 'Asia/Manila';
        $targetDate = today($tz)->addDays($dayOffsetFromToday)->toDateString();

        $clinic = Clinic::create([
            'name' => $clinicName,
            'municipality' => 'Tagoloan',
            'province' => 'Misamis Oriental',
            'contact_number' => $clinicPhone,
        ]);

        $nurse = User::factory()->create([
            'clinic_id' => $clinic->id,
            'name' => 'Nurse Maria',
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PT-P2-' . uniqid(),
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'contact_number' => $phone,
            'email' => 'juan.p2@example.test',
        ]);

        DB::table('communication_preferences')->insert([
            'patient_id' => $patient->patient_id,
            'sms' => $smsConsent,
            'email' => $emailConsent,
            'recorded_by' => $nurse->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $account = null;
        if ($linkAccount) {
            $account = PatientAccount::create([
                'name' => 'Juan Portal',
                'email' => 'portal.' . uniqid() . '@example.test',
                'password' => bcrypt('password123'),
                'is_active' => true,
            ]);
            $patient->accounts()->attach($account->id, [
                'relationship' => 'self',
                'is_primary' => true,
                'status' => 'verified',
                'verified_at' => now(),
            ]);
            config(['services.firebase.allowed_patient_account_ids' => (string) $account->id]);
        }

        $biteDate = today($tz)->subDays(10)->toDateString();
        $incident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-P2-' . uniqid(),
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
            'status' => 'approved',
            'decided_by' => $nurse->id,
            'decided_at' => today($tz)->subDays(10),
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

        $appointmentData = [
            'clinic_id' => $clinic->id,
            'bite_id' => $incident->bite_id,
            'patient_id' => $patient->patient_id,
            'dose_number' => 3,
            'scheduled_date' => $targetDate,
            'appointment_date' => $targetDate,
            'appointment_type' => 'follow_up_vaccination',
            'status' => $status,
            'booked_by_account_id' => $account?->id,
        ];
        if ($appointmentTime !== null) {
            $appointmentData['appointment_time'] = $appointmentTime;
        }
        $appointment = Appointment::create($appointmentData);

        return compact('clinic', 'nurse', 'patient', 'incident', 'appointment', 'account');
    }

    public function test_day_before_advance_reminder_is_sent_once_with_neutral_wording(): void
    {
        Http::fake([
            '*unismsapi.com/api/sms' => Http::response([
                'message' => ['reference_id' => 'unisms_adv_1', 'status' => 'pending'],
            ], 201),
        ]);

        $ctx = $this->seedAppointmentForDayOffset(dayOffsetFromToday: 1, clinicPhone: '09170001111');
        $service = app(AppointmentReminderService::class);

        $first = $service->runAutomatedSweep('sms', $ctx['clinic']->id);
        $this->assertSame(1, $first['advance_reminders_eligible']);
        $this->assertSame(1, $first['advance_reminders_sent']);
        $this->assertSame(0, $first['same_day_reminders_sent']);
        $this->assertSame(0, $first['missed_recalls_sent']);

        $msg = OutboundMessage::firstOrFail();
        $this->assertSame('advance', $msg->purpose);
        $this->assertStringContainsString('Tagoloan ABTC Reminder: Your scheduled vaccination is tomorrow', $msg->body);
        $this->assertStringNotContainsString('Juan', $msg->body);

        app(OutboundDelivery::class)->deliver($msg->id);
        $this->assertSame('accepted', $msg->fresh()->status);

        // Duplicate scheduler run on the same day must not create a second message or send again
        $second = $service->runAutomatedSweep('sms', $ctx['clinic']->id);
        $this->assertSame(1, $second['advance_reminders_eligible']);
        $this->assertDatabaseCount('outbound_messages', 1);
        app(OutboundDelivery::class)->deliver($msg->id);
        Http::assertSentCount(1);
    }

    public function test_same_day_dday_reminder_is_sent_once_in_asia_manila_without_mutating_appointment(): void
    {
        Http::fake([
            '*unismsapi.com/api/sms' => Http::response([
                'message' => ['reference_id' => 'unisms_dday_1', 'status' => 'pending'],
            ], 201),
        ]);

        $ctx = $this->seedAppointmentForDayOffset(dayOffsetFromToday: 0, clinicPhone: null);
        $originalStatus = $ctx['appointment']->status;
        $originalDate = $ctx['appointment']->scheduled_date->toDateString();

        $service = app(AppointmentReminderService::class);
        $first = $service->runAutomatedSweep('sms', $ctx['clinic']->id);

        $this->assertSame(1, $first['same_day_reminders_eligible']);
        $this->assertSame(1, $first['same_day_reminders_sent']);
        $this->assertSame(0, $first['advance_reminders_sent']);
        $this->assertSame(0, $first['missed_recalls_sent']);

        $msg = OutboundMessage::firstOrFail();
        $this->assertSame('same_day', $msg->purpose);
        $this->assertStringStartsWith(
            'Tagoloan ABTC Reminder: Your scheduled vaccination is today. Please visit the clinic during your scheduled time.',
            $msg->body
        );
        $this->assertStringEndsWith('Contact the clinic if you need assistance.', $msg->body);

        app(OutboundDelivery::class)->deliver($msg->id);
        $this->assertSame('accepted', $msg->fresh()->status);

        // Duplicate sweep does not resend
        $service->runAutomatedSweep('sms', $ctx['clinic']->id);
        $this->assertDatabaseCount('outbound_messages', 1);
        Http::assertSentCount(1);

        // Appointment schedule and status remain untouched
        $freshAppt = $ctx['appointment']->fresh();
        $this->assertSame($originalStatus, $freshAppt->status);
        $this->assertSame($originalDate, $freshAppt->scheduled_date->toDateString());
    }

    public function test_overdue_automated_recalls_fire_only_on_day_1_day_3_and_day_7_milestones(): void
    {
        Http::fake([
            '*unismsapi.com/api/sms' => Http::response([
                'message' => ['reference_id' => 'unisms_ms_1', 'status' => 'pending'],
            ], 201),
        ]);

        $service = app(AppointmentReminderService::class);

        // Milestone days: Day +1, Day +3, Day +7 (mixing scheduled & missed)
        $day1 = $this->seedAppointmentForDayOffset(-1, status: 'scheduled');
        $day3 = $this->seedAppointmentForDayOffset(-3, status: 'missed');
        $day7 = $this->seedAppointmentForDayOffset(-7, status: 'missed');

        // Non-milestone days: Day +2, Day +4, Day +5, Day +6, Day +8, Day +14
        $nonMilestones = [];
        foreach ([2, 4, 5, 6, 8, 14] as $days) {
            $nonMilestones[$days] = $this->seedAppointmentForDayOffset(-$days, status: 'missed');
        }

        foreach ([$day1, $day3, $day7] as $idx => $ctx) {
            $res = $service->runAutomatedSweep('sms', $ctx['clinic']->id);
            $this->assertSame(1, $res['missed_recalls_eligible'], "Expected eligible on milestone index {$idx}");
            $this->assertSame(1, $res['missed_recalls_sent'], "Expected sent on milestone index {$idx}");
        }

        foreach ($nonMilestones as $days => $ctx) {
            $res = $service->runAutomatedSweep('sms', $ctx['clinic']->id);
            $this->assertSame(0, $res['missed_recalls_eligible'], "Day +{$days} must not trigger automated recall");
            $this->assertSame(0, $res['missed_recalls_sent'], "Day +{$days} must not dispatch automated recall");
        }

        $this->assertDatabaseCount('outbound_messages', 3);

        // Deliver all 3 milestone messages and verify milestone metadata & Day +7 final copy
        $messages = OutboundMessage::orderBy('id')->get();
        $this->assertSame([1, 3, 7], $messages->map(fn ($m) => $m->context['milestone_day'])->all());
        $this->assertStringContainsString('still overdue', $messages->last()->body);

        foreach ($messages as $m) {
            app(OutboundDelivery::class)->deliver($m->id);
            $this->assertSame('accepted', $m->fresh()->status);
        }
        Http::assertSentCount(3);

        // Manual staff recall MUST still work on non-milestone overdue days (e.g. Day +2 and Day +8)
        $manualDay2 = $service->sendRecallAlert($nonMilestones[2]['appointment'], 'sms');
        $manualDay8 = $service->sendRecallAlert($nonMilestones[8]['appointment'], 'sms');
        $this->assertTrue($manualDay2['success']);
        $this->assertTrue($manualDay8['success']);
    }

    public function test_ineligible_statuses_administered_doses_transferred_and_cancelled_are_blocked_for_dday_and_milestones(): void
    {
        $service = app(AppointmentReminderService::class);

        $ddayCompleted = $this->seedAppointmentForDayOffset(0, status: 'completed');
        $ddayCancelled = $this->seedAppointmentForDayOffset(0, status: 'cancelled');
        $ddayMissed = $this->seedAppointmentForDayOffset(0, status: 'missed');
        $ddayTransferred = $this->seedAppointmentForDayOffset(0, status: 'scheduled', episodeStatus: 'transferred_out', transferredTo: 'Other Hospital');

        // D-Day appointment whose dose was already administered early
        $ddayAdministered = $this->seedAppointmentForDayOffset(0, status: 'scheduled');
        TreatmentRecord::create([
            'clinic_id' => $ddayAdministered['clinic']->id,
            'bite_id' => $ddayAdministered['incident']->bite_id,
            'patient_id' => $ddayAdministered['patient']->patient_id,
            'dose_number' => 3,
            'treatment_date' => today('Asia/Manila')->toDateString(),
            'status' => 'completed',
            'administered_by' => $ddayAdministered['nurse']->id,
        ]);

        // Milestone Day +3 appointment whose dose was already administered
        $milestoneAdministered = $this->seedAppointmentForDayOffset(-3, status: 'missed');
        TreatmentRecord::create([
            'clinic_id' => $milestoneAdministered['clinic']->id,
            'bite_id' => $milestoneAdministered['incident']->bite_id,
            'patient_id' => $milestoneAdministered['patient']->patient_id,
            'dose_number' => 3,
            'treatment_date' => today('Asia/Manila')->subDay()->toDateString(),
            'status' => 'administered',
            'administered_by' => $milestoneAdministered['nurse']->id,
        ]);

        foreach ([$ddayCompleted, $ddayCancelled, $ddayMissed, $ddayTransferred, $ddayAdministered, $milestoneAdministered] as $ctx) {
            $res = $service->runAutomatedSweep('sms', $ctx['clinic']->id);
            $this->assertSame(0, $res['same_day_reminders_sent']);
            $this->assertSame(0, $res['missed_recalls_sent']);
        }

        $this->assertDatabaseCount('outbound_messages', 0);
        Queue::assertNothingPushed();
        Http::assertNothingSent();
    }

    public function test_missing_consent_and_non_allowlisted_recipients_are_blocked_for_dday_and_milestones(): void
    {
        $service = app(AppointmentReminderService::class);

        $noConsentDday = $this->seedAppointmentForDayOffset(0, smsConsent: false);
        $unlistedDday = $this->seedAppointmentForDayOffset(0, smsConsent: true, phone: '09189990000');
        $noConsentMilestone = $this->seedAppointmentForDayOffset(-1, smsConsent: false);
        $unlistedMilestone = $this->seedAppointmentForDayOffset(-3, smsConsent: true, phone: '09189990001');

        foreach ([$noConsentDday, $unlistedDday, $noConsentMilestone, $unlistedMilestone] as $ctx) {
            $res = $service->runAutomatedSweep('sms', $ctx['clinic']->id);
            $this->assertSame(0, $res['total_dispatched']);
        }

        $this->assertDatabaseCount('outbound_messages', 0);
        Http::assertNothingSent();
    }

    public function test_queue_worker_revalidates_dday_and_milestone_messages_before_delivery(): void
    {
        Http::fake();

        // 1. D-Day appointment cancelled after queuing
        $ctx1 = $this->seedAppointmentForDayOffset(0);
        app(AppointmentReminderService::class)->runAutomatedSweep('sms', $ctx1['clinic']->id);
        $msg1 = OutboundMessage::latest('id')->firstOrFail();
        $ctx1['appointment']->update(['status' => 'cancelled']);
        app(OutboundDelivery::class)->deliver($msg1->id);
        $this->assertSame('skipped', $msg1->fresh()->status);
        $this->assertSame('appointment_changed_or_message_expired', $msg1->fresh()->error_code);

        // 2. D-Day consent revoked after queuing
        $ctx2 = $this->seedAppointmentForDayOffset(0);
        app(AppointmentReminderService::class)->runAutomatedSweep('sms', $ctx2['clinic']->id);
        $msg2 = OutboundMessage::latest('id')->firstOrFail();
        DB::table('communication_preferences')->where('patient_id', $ctx2['patient']->patient_id)->update(['sms' => false]);
        app(OutboundDelivery::class)->deliver($msg2->id);
        $this->assertSame('skipped', $msg2->fresh()->status);
        $this->assertSame('consent_or_contact_changed', $msg2->fresh()->error_code);

        // 3. Milestone Day +1 dose administered after queuing
        $ctx3 = $this->seedAppointmentForDayOffset(-1, status: 'missed');
        app(AppointmentReminderService::class)->runAutomatedSweep('sms', $ctx3['clinic']->id);
        $msg3 = OutboundMessage::latest('id')->firstOrFail();
        TreatmentRecord::create([
            'clinic_id' => $ctx3['clinic']->id,
            'bite_id' => $ctx3['incident']->bite_id,
            'patient_id' => $ctx3['patient']->patient_id,
            'dose_number' => 3,
            'treatment_date' => today('Asia/Manila')->toDateString(),
            'status' => 'completed',
            'administered_by' => $ctx3['nurse']->id,
        ]);
        app(OutboundDelivery::class)->deliver($msg3->id);
        $this->assertSame('skipped', $msg3->fresh()->status);
        $this->assertSame('appointment_changed_or_message_expired', $msg3->fresh()->error_code);

        Http::assertNothingSent();
    }

    public function test_repeated_console_scheduler_and_api_requests_are_idempotent(): void
    {
        Http::fake([
            '*unismsapi.com/api/sms' => Http::response([
                'message' => ['reference_id' => 'unisms_idem_1', 'status' => 'pending'],
            ], 201),
        ]);

        $ctx = $this->seedAppointmentForDayOffset(0);
        Sanctum::actingAs($ctx['nurse']);

        // Run console command twice + API trigger twice
        $this->artisan('appointments:auto-recall', ['--channel' => 'sms'])->assertSuccessful();
        $this->artisan('appointments:auto-recall', ['--channel' => 'sms'])->assertSuccessful();
        $this->postJson('/api/appointments/trigger-auto-recall', ['channel' => 'sms'])->assertSuccessful();
        $this->postJson('/api/appointments/trigger-auto-recall', ['channel' => 'sms'])->assertSuccessful();

        $this->assertDatabaseCount('outbound_messages', 1);

        $msg = OutboundMessage::firstOrFail();
        app(OutboundDelivery::class)->deliver($msg->id);
        app(OutboundDelivery::class)->deliver($msg->id); // Duplicate worker invocation

        $this->assertSame('accepted', $msg->fresh()->status);
        Http::assertSentCount(1);
    }

    public function test_dday_triggers_fcm_and_brevo_email_without_regressions_and_bisaya_overdue_copy_is_accurate(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response([
                'messageId' => '<brevo-dday-1@example.test>',
            ], 201),
        ]);

        config([
            'services.brevo.key' => 'xkeysib-test-key',
            'services.brevo.sender_email' => 'clinic@example.test',
            'services.brevo.sender_name' => 'Tagoloan ABTC',
            'services.firebase.fcm_enabled' => true,
            'services.firebase.fcm_test_mode' => true,
        ]);

        $ctx = $this->seedAppointmentForDayOffset(0, smsConsent: false, emailConsent: true, linkAccount: true);

        $res = app(AppointmentReminderService::class)->runAutomatedSweep('all', $ctx['clinic']->id);
        $this->assertSame(1, $res['same_day_reminders_sent']);

        // FCM push dispatched for D-Day with zero-PHI message
        Queue::assertPushed(SendFcmPushNotification::class, function (SendFcmPushNotification $job) use ($ctx) {
            return $job->patientAccountId === $ctx['account']->id
                && $job->title === 'Vaccination Reminder'
                && $job->body === 'Your vaccination appointment is scheduled for today. Open the app to view your schedule.';
        });

        // Brevo email delivered cleanly
        $emailMsg = OutboundMessage::where('channel', 'email')->where('purpose', 'same_day')->firstOrFail();
        app(OutboundDelivery::class)->deliver($emailMsg->id);
        $this->assertSame('accepted', $emailMsg->fresh()->status);
        $this->assertSame('brevo', $emailMsg->fresh()->provider);

        // Corrected Bisaya overdue manual follow-up copy does NOT falsely say "Schedule nimo karon"
        $bisaya = app(EpisodeFollowupService::class)->buildStandardDohSms('Juan Dela Cruz', 3);
        $this->assertStringNotContainsString('Schedule nimo karon', $bisaya);
        $this->assertStringContainsString('Nalapas na ang imong naka-schedule', $bisaya);
    }
}
