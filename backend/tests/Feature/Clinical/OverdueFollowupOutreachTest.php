<?php

namespace Tests\Feature\Clinical;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OverdueFollowupOutreachTest extends TestCase
{
    use RefreshDatabase;

    private function seedOverdueEpisode(): array
    {
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

        $doctor = User::factory()->create([
            'clinic_id' => $clinic->id,
            'name' => 'Dr. Marcelo',
            'role' => 'triage',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PT-2026-0001',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'contact_number' => '09171234567',
            'emergency_contact_name' => 'Ana Dela Cruz',
            'emergency_contact_number' => '09187654321',
        ]);

        $biteDate = today()->subDays(5)->toDateString();

        $incident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-0001',
            'episode_number' => 1,
            'episode_type' => 'primary',
            'bite_date' => $biteDate,
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion, Tagoloan',
            'severity' => 'moderate',
            'animal_type' => 'dog',
            'animal_status' => 'owned',
            'status' => 'active',
            'created_by' => $doctor->id,
        ]);

        TreatmentPlan::create([
            'clinic_id' => $clinic->id,
            'bite_id' => $incident->bite_id,
            'patient_id' => $patient->patient_id,
            'plan_type' => 'full_pep',
            'ordered_dose_days' => [0, 3, 7],
            'status' => 'approved',
            'decided_by' => $doctor->id,
            'decided_at' => today()->subDays(5),
        ]);

        TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'bite_id' => $incident->bite_id,
            'patient_id' => $patient->patient_id,
            'dose_number' => 0,
            'treatment_date' => $biteDate,
            'date_administered' => $biteDate,
            'status' => 'completed',
            'administered_by' => $nurse->id,
        ]);

        Appointment::create([
            'clinic_id' => $clinic->id,
            'bite_id' => $incident->bite_id,
            'patient_id' => $patient->patient_id,
            'dose_number' => 3,
            'scheduled_date' => today()->subDays(3)->toDateString(),
            'appointment_date' => today()->subDays(3)->toDateString(),
            'appointment_type' => 'vaccination',
            'status' => 'scheduled',
        ]);

        return compact('clinic', 'nurse', 'doctor', 'patient', 'incident');
    }

    public function test_location_summary_exposes_overdue_patient_contact_and_respects_conference_privacy(): void
    {
        $ctx = $this->seedOverdueEpisode();
        Sanctum::actingAs($ctx['nurse']);

        $internal = $this->getJson('/api/cases/location-summary')
            ->assertOk();

        $cases = $internal->json('cases');
        $this->assertNotEmpty($cases);
        $row = collect($cases)->firstWhere('bite_id', $ctx['incident']->bite_id);
        $this->assertNotNull($row);
        $this->assertTrue($row['is_overdue']);
        $this->assertGreaterThanOrEqual(1, $row['days_overdue']);
        $this->assertSame('09171234567', $row['follow_up_contact_number']);
        $this->assertSame(3, $row['overdue_dose_day']);

        $conference = $this->getJson('/api/cases/location-summary?privacy_mode=aggregate_only')
            ->assertOk();
        $this->assertNull($conference->json('cases'));
    }

    public function test_send_standardized_doh_sms_reminder_and_log_contact_attempt(): void
    {
        $ctx = $this->seedOverdueEpisode();
        Sanctum::actingAs($ctx['nurse']);

        $smsRes = $this->postJson("/api/cases/{$ctx['incident']->bite_id}/send-reminder", [
            'dose_day' => 3,
        ])->assertOk();

        $expectedText = 'Tagoloan ABTC Reminder: Maayong adlaw. Nalapas na ang imong naka-schedule nga follow-up vaccination (Day 3) sa Tagoloan ABTC. Palihug bisita o kontaka ang clinic taliwala sa 8:00 AM - 4:00 PM para sa imong follow-up. Salamat!';
        $smsRes->assertJsonPath('sms_text', $expectedText);
        $smsRes->assertJsonPath('recipient_number', '+639171234567');
        $smsRes->assertJsonPath('log.contact_type', 'sms');
        $smsRes->assertJsonPath('log.created_by', $ctx['nurse']->id);

        $logRes = $this->postJson("/api/cases/{$ctx['incident']->bite_id}/followup-logs", [
            'contact_type' => 'call',
            'status' => 'promised_visit',
            'notes' => 'Called - Patient promised to visit tomorrow 9am',
        ])->assertCreated();

        $logRes->assertJsonPath('log.status', 'promised_visit');
        $logRes->assertJsonPath('log.notes', 'Called - Patient promised to visit tomorrow 9am');
        $logRes->assertJsonPath('log.created_by', $ctx['nurse']->id);
        $logRes->assertJsonPath('log.created_by_name', 'Nurse Maria Santos');

        $listRes = $this->getJson("/api/cases/{$ctx['incident']->bite_id}/followup-logs")->assertOk();
        $this->assertCount(2, $listRes->json('logs'));
        $this->assertSame('call', $listRes->json('logs.0.contact_type'));
        $this->assertSame('sms', $listRes->json('logs.1.contact_type'));
    }

    public function test_doctor_and_nurse_can_access_overdue_vaccination_schedule_and_clinic_isolation_is_enforced(): void
    {
        $ctx = $this->seedOverdueEpisode();

        // Doctor (triage) can access vaccination journey matrix overdue patients and messaging channels
        Sanctum::actingAs($ctx['doctor']);
        $this->getJson('/api/vaccinations/journey-matrix?status=overdue_missed')
            ->assertOk()
            ->assertJsonPath('patients.0.patient_id', $ctx['patient']->patient_id)
            ->assertJsonPath('patients.0.compliance_status', 'overdue_missed');

        $this->getJson('/api/messaging/channels')->assertOk();

        // Nurse (treatment) can access vaccination journey matrix overdue patients
        Sanctum::actingAs($ctx['nurse']);
        $this->getJson('/api/vaccinations/journey-matrix?status=overdue_missed')
            ->assertOk()
            ->assertJsonPath('patients.0.patient_id', $ctx['patient']->patient_id);

        // Other clinic user cannot read or log follow-up for clinic 1's episode
        $otherClinic = Clinic::create(['name' => 'Other Clinic']);
        $otherNurse = User::factory()->create([
            'clinic_id' => $otherClinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);
        Sanctum::actingAs($otherNurse);
        $this->getJson("/api/cases/{$ctx['incident']->bite_id}/followup-logs")->assertNotFound();
        $this->postJson("/api/cases/{$ctx['incident']->bite_id}/followup-logs", [
            'contact_type' => 'call',
            'status' => 'no_answer',
        ])->assertNotFound();
    }

    public function test_automated_recall_sweep_logs_idempotent_followup_history_for_nurses(): void
    {
        config([
            'messaging.sms_enabled' => true,
            'messaging.sms_provider' => 'fake',
            'messaging.test_mode' => false,
            'messaging.sms_test_mode' => false,
        ]);

        $ctx = $this->seedOverdueEpisode();

        \Illuminate\Support\Facades\DB::table('communication_preferences')->insert([
            'patient_id' => $ctx['patient']->patient_id,
            'sms' => true,
            'email' => false,
            'recorded_by' => $ctx['nurse']->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $reminderService = app(\App\Services\AppointmentReminderService::class);
        $first = $reminderService->runAutomatedSweep('sms', $ctx['clinic']->id);
        $this->assertSame(1, $first['missed_recalls_eligible']);
        $this->assertSame(1, $first['missed_recalls_sent']);

        // Running sweep again on the same day must NOT duplicate patient_followup_logs
        $reminderService->runAutomatedSweep('sms', $ctx['clinic']->id);

        Sanctum::actingAs($ctx['nurse']);
        $listRes = $this->getJson("/api/cases/{$ctx['incident']->bite_id}/followup-logs")->assertOk();
        $logs = $listRes->json('logs');
        $this->assertCount(1, $logs);
        $this->assertSame('Automated Recall', $logs[0]['created_by_name']);
        $this->assertSame('sms', $logs[0]['contact_type']);
        $this->assertSame('Day 3', $logs[0]['dose_label']);
        $this->assertStringContainsString('Automated recall dispatched via SMS', $logs[0]['notes']);
    }
}
