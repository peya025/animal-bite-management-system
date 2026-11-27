<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\Queue;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Station2FollowUpConsultationIsolationTest extends TestCase
{
    use RefreshDatabase;

    private function createFixtures(): array
    {
        $clinic = Clinic::create(['name' => 'ABTC Test Clinic', 'is_active' => true]);

        $nurse = User::create([
            'clinic_id'       => $clinic->id,
            'name'            => 'Station 2 Nurse',
            'email'           => 'nurse-s2@abtc.local',
            'password'        => bcrypt('secret123'),
            'role'            => 'treatment',
            'assigned_module' => 'treatment',
            'is_active'       => true,
        ]);

        $regStaff = User::create([
            'clinic_id'       => $clinic->id,
            'name'            => 'Registration Clerk',
            'email'           => 'reg-s2@abtc.local',
            'password'        => bcrypt('secret123'),
            'role'            => 'registration',
            'assigned_module' => 'registration',
            'is_active'       => true,
        ]);

        $account = PatientAccount::create([
            'name'     => 'Mobile Account',
            'email'    => 'mobile-s2@abtc.local',
            'password' => bcrypt('secret123'),
            'phone'    => '09170001122',
        ]);

        $patient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Alex',
            'last_name'           => 'Reyes',
            'gender'              => 'male',
            'date_of_birth'       => '1995-03-10',
            'registration_source' => 'mobile',
            'status'              => 'active',
        ]);
        $account->patients()->attach($patient->patient_id, [
            'relationship' => 'self',
            'status'       => 'verified',
        ]);

        return [$clinic, $nurse, $regStaff, $account, $patient];
    }

    private function createActivePepEpisode(Clinic $clinic, User $creator, Patient $patient): BiteIncident
    {
        $episode = BiteIncident::create([
            'clinic_id'         => $clinic->id,
            'patient_id'        => $patient->patient_id,
            'created_by'        => $creator->id,
            'episode_number'    => 1,
            'episode_type'      => 'primary',
            'bite_date'         => Carbon::yesterday()->toDateString(),
            'bite_place'        => 'Tagoloan',
            'site_washed'       => true,
            'exposure_type'     => 'transdermal_bite',
            'exposure_category' => 'II',
            'severity'          => 'moderate',
            'animal_type'       => 'dog',
            'animal_status'     => 'owned',
            'status'            => 'active',
        ]);

        TreatmentPlan::create([
            'clinic_id'         => $clinic->id,
            'patient_id'        => $patient->patient_id,
            'bite_id'           => $episode->bite_id,
            'plan_type'         => 'full_pep',
            'status'            => 'approved',
            'ordered_dose_days' => [0, 3, 7],
            'decided_by'        => $creator->id,
            'decided_at'        => now(),
        ]);

        TreatmentRecord::create([
            'clinic_id'      => $clinic->id,
            'patient_id'     => $patient->patient_id,
            'bite_id'        => $episode->bite_id,
            'dose_number'    => 0,
            'status'         => 'completed',
            'treatment_date' => Carbon::yesterday()->toDateString(),
        ]);

        return $episode;
    }

    private function createPendingMobileConsultation(
        Clinic $clinic,
        Patient $patient,
        PatientAccount $account,
        string $date
    ): array {
        $consultation = Appointment::create([
            'clinic_id'            => $clinic->id,
            'patient_id'           => $patient->patient_id,
            'booked_by_account_id' => $account->id,
            'bite_id'              => null,
            'appointment_type'     => 'consultation',
            'dose_number'          => null,
            'appointment_date'     => $date,
            'scheduled_date'       => $date,
            'status'               => 'scheduled',
        ]);

        $intake = BiteIncidentIntake::create([
            'clinic_id'          => $clinic->id,
            'patient_id'         => $patient->patient_id,
            'patient_account_id' => $account->id,
            'appointment_id'     => $consultation->appointment_id,
            'bite_id'            => null,
            'bite_date'          => $date,
            'site_washed'        => true,
            'exposure_type'      => 'bite',
            'animal_type'        => 'dog',
            'animal_status'      => 'owned',
            'status'             => 'pending',
        ]);

        return [$consultation, $intake];
    }

    public function test_station2_lists_and_counts_isolate_follow_up_doses_from_concurrent_mobile_consultation(): void
    {
        [$clinic, $nurse, $regStaff, $account, $patient] = $this->createFixtures();
        $episode = $this->createActivePepEpisode($clinic, $regStaff, $patient);

        $day3Date = Carbon::today()->addDays(4)->toDateString();
        $day7Date = Carbon::today()->addDays(10)->toDateString();

        $day3 = Appointment::create([
            'clinic_id'        => $clinic->id,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $episode->bite_id,
            'appointment_type' => 'follow_up_vaccination',
            'dose_number'      => 3,
            'appointment_date' => $day3Date,
            'scheduled_date'   => $day3Date,
            'status'           => 'scheduled',
        ]);

        Appointment::create([
            'clinic_id'        => $clinic->id,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $episode->bite_id,
            'appointment_type' => 'follow_up_vaccination',
            'dose_number'      => 7,
            'appointment_date' => $day7Date,
            'scheduled_date'   => $day7Date,
            'status'           => 'scheduled',
        ]);

        [$consultation] = $this->createPendingMobileConsultation(
            $clinic,
            $patient,
            $account,
            Carbon::today()->toDateString()
        );

        // Second patient with ONLY a mobile consultation must never appear in Station 2 online bookings
        $consultOnlyPatient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Consult',
            'last_name'           => 'Only',
            'gender'              => 'female',
            'registration_source' => 'mobile',
            'status'              => 'active',
        ]);
        $this->createPendingMobileConsultation($clinic, $consultOnlyPatient, $account, Carbon::today()->toDateString());

        Sanctum::actingAs($nurse);

        // Neither patient has a follow-up due today — today's mobile consultations must NEVER appear in due_today
        $dueTodayResp = $this->getJson('/api/nurse/patients?tab=due_today');
        $dueTodayResp->assertOk();
        $dueTodayResp->assertJsonPath('due_today_count', 0);
        $this->assertCount(0, $dueTodayResp->json('data'));

        foreach (['upcoming', 'online', 'all'] as $tab) {
            $response = $this->getJson("/api/nurse/patients?tab={$tab}");
            $response->assertOk();
            $response->assertJsonPath('online_count', 1);
            $response->assertJsonPath('upcoming_count', 1);
            $response->assertJsonPath('due_today_count', 0);

            $rows = collect($response->json('data'));
            $mixedRow = $rows->firstWhere('patient_id', $patient->patient_id);
            $this->assertNotNull($mixedRow, "Expected mixed patient in tab={$tab}");

            $returnedIds = collect($mixedRow['appointments'])->pluck('appointment_id')->all();
            $this->assertNotContains($consultation->appointment_id, $returnedIds, "Consultation leaked into tab={$tab}");
            $this->assertSame($day3->appointment_id, $mixedRow['appointments'][0]['appointment_id']);
            $this->assertSame(3, (int) $mixedRow['appointments'][0]['dose_number']);
            $this->assertSame($episode->bite_id, (int) $mixedRow['appointments'][0]['bite_id']);

            if ($tab === 'online') {
                $this->assertNull(
                    $rows->firstWhere('patient_id', $consultOnlyPatient->patient_id),
                    'Consultation-only patient must not appear in Station 2 Online Bookings'
                );
            }
            if ($tab === 'all') {
                $consultOnlyRow = $rows->firstWhere('patient_id', $consultOnlyPatient->patient_id);
                $this->assertNotNull($consultOnlyRow);
                $this->assertSame([], $consultOnlyRow['appointments']);
            }
        }
    }

    public function test_future_day3_follow_up_with_today_mobile_consultation_is_not_prematurely_confirmed(): void
    {
        [$clinic, $nurse, $regStaff, $account, $patient] = $this->createFixtures();
        $episode = $this->createActivePepEpisode($clinic, $regStaff, $patient);

        $futureDay3Date = Carbon::today()->addDays(4)->toDateString();
        $day3 = Appointment::create([
            'clinic_id'        => $clinic->id,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $episode->bite_id,
            'appointment_type' => 'follow_up_vaccination',
            'dose_number'      => 3,
            'appointment_date' => $futureDay3Date,
            'scheduled_date'   => $futureDay3Date,
            'status'           => 'scheduled',
        ]);

        [$consultation, $intake] = $this->createPendingMobileConsultation(
            $clinic,
            $patient,
            $account,
            Carbon::today()->toDateString()
        );

        Sanctum::actingAs($nurse);

        // Patient-level Station 2 check-in must report future Day 3 schedule (NOT consultation error, NOT early confirmation)
        $this->postJson("/api/appointments/patient/{$patient->patient_id}/check-in")
            ->assertStatus(422)
            ->assertJsonPath('code', 'appointment_not_yet_due');

        // Direct appointment-level check-in for future Day 3 is also rejected without changing status
        $this->postJson("/api/appointments/{$day3->appointment_id}/check-in")
            ->assertStatus(422)
            ->assertJsonPath('code', 'appointment_not_yet_due');

        // Direct consultation check-in at Station 2 remains strictly blocked
        $this->postJson("/api/appointments/{$consultation->appointment_id}/check-in")
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'Mobile bite consultations must be checked in from Registration using the submitted bite intake before they enter the Doctor queue.'
            );

        // Registration -> Nurse queue check-in also refuses premature future Day 3 and never touches the consultation
        Sanctum::actingAs($regStaff);
        $this->postJson("/api/patients/{$patient->patient_id}/check-in-nurse")
            ->assertStatus(422)
            ->assertJsonPath('code', 'appointment_not_yet_due');

        // All clinical records, appointments, and pending intake remain completely untouched
        $this->assertSame('scheduled', $day3->fresh()->status);
        $this->assertSame($futureDay3Date, Carbon::parse($day3->fresh()->scheduled_date)->toDateString());
        $this->assertSame('scheduled', $consultation->fresh()->status);
        $this->assertNull($consultation->fresh()->bite_id);
        $this->assertSame('pending', $intake->fresh()->status);
        $this->assertNull($intake->fresh()->bite_id);
        $this->assertDatabaseCount('queues', 0);
    }

    public function test_due_today_follow_up_checks_in_cleanly_while_preserving_separate_mobile_consultation(): void
    {
        [$clinic, $nurse, $regStaff, $account, $patient] = $this->createFixtures();
        $episode = $this->createActivePepEpisode($clinic, $regStaff, $patient);

        $todayStr = Carbon::today()->toDateString();
        $day3 = Appointment::create([
            'clinic_id'        => $clinic->id,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $episode->bite_id,
            'appointment_type' => 'follow_up_vaccination',
            'dose_number'      => 3,
            'appointment_date' => $todayStr,
            'scheduled_date'   => $todayStr,
            'status'           => 'scheduled',
        ]);

        [$consultation, $intake] = $this->createPendingMobileConsultation($clinic, $patient, $account, $todayStr);

        Sanctum::actingAs($nurse);

        // Patient-level fallback selects ONLY the due Day 3 follow-up and links queue to appointment_id + bite_id
        $res = $this->postJson("/api/appointments/patient/{$patient->patient_id}/check-in");
        $res->assertOk();
        $res->assertJsonPath('visit_type', 'follow_up');
        $res->assertJsonPath('queue.appointment_id', $day3->appointment_id);
        $res->assertJsonPath('queue.bite_id', $episode->bite_id);

        $this->assertSame('confirmed', $day3->fresh()->status);
        $this->assertSame('scheduled', $consultation->fresh()->status);
        $this->assertNull($consultation->fresh()->bite_id);
        $this->assertSame('pending', $intake->fresh()->status);
        $this->assertNull($intake->fresh()->bite_id);
        $this->assertDatabaseHas('queues', [
            'patient_id'     => $patient->patient_id,
            'appointment_id' => $day3->appointment_id,
            'bite_id'        => $episode->bite_id,
            'visit_type'     => 'follow_up',
            'status'         => 'waiting',
        ]);

        // Cancel check-in restores Day 3 without modifying the separate consultation
        $this->postJson("/api/appointments/patient/{$patient->patient_id}/cancel-check-in")->assertOk();
        $this->assertSame('scheduled', $day3->fresh()->status);
        $this->assertSame('scheduled', $consultation->fresh()->status);
        $this->assertSame('pending', $intake->fresh()->status);

        // Appointment-specific check-in (preferred path from NursePatientListPage) also succeeds cleanly
        $resDirect = $this->postJson("/api/appointments/{$day3->appointment_id}/check-in");
        $resDirect->assertOk();
        $resDirect->assertJsonPath('queue.appointment_id', $day3->appointment_id);
        $resDirect->assertJsonPath('queue.bite_id', $episode->bite_id);
        $this->assertSame('scheduled', $consultation->fresh()->status);
        $this->assertSame('pending', $intake->fresh()->status);
    }

    public function test_consultation_only_and_booster_only_patients_cannot_check_in_via_station2_or_nurse_queue(): void
    {
        [$clinic, $nurse, $regStaff, $account, $patient] = $this->createFixtures();
        $todayStr = Carbon::today()->toDateString();

        [$consultation, $intake] = $this->createPendingMobileConsultation($clinic, $patient, $account, $todayStr);

        Sanctum::actingAs($nurse);
        $this->postJson("/api/appointments/patient/{$patient->patient_id}/check-in")
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'Mobile bite consultations must be checked in from Registration using the submitted bite intake before they enter the Doctor queue.'
            );
        $this->assertSame('scheduled', $consultation->fresh()->status);
        $this->assertSame('pending', $intake->fresh()->status);
        $this->assertDatabaseCount('queues', 0);

        // Even if the patient completed an earlier PEP course, checkInPatientToNurse must not route a new mobile consultation to Nurse
        $priorEpisode = $this->createActivePepEpisode($clinic, $regStaff, $patient);
        foreach ([3, 7] as $dose) {
            TreatmentRecord::create([
                'clinic_id'      => $clinic->id,
                'patient_id'     => $patient->patient_id,
                'bite_id'        => $priorEpisode->bite_id,
                'dose_number'    => $dose,
                'status'         => 'completed',
                'treatment_date' => Carbon::yesterday()->toDateString(),
            ]);
        }

        Sanctum::actingAs($regStaff);
        $this->postJson("/api/patients/{$patient->patient_id}/check-in-nurse")
            ->assertStatus(422)
            ->assertJsonPath('code', 'mobile_consultation_registration_required');

        $this->assertSame('scheduled', $consultation->fresh()->status);
        $this->assertSame('pending', $intake->fresh()->status);
        $this->assertDatabaseCount('queues', 0);

        // Booster-only patient must also remain blocked from Station 2 check-in
        $boosterPatient = Patient::create([
            'clinic_id'  => $clinic->id,
            'first_name' => 'Boost',
            'last_name'  => 'User',
            'gender'     => 'male',
            'status'     => 'active',
        ]);
        Appointment::create([
            'clinic_id'        => $clinic->id,
            'patient_id'       => $boosterPatient->patient_id,
            'appointment_type' => 'booster',
            'dose_number'      => 90,
            'appointment_date' => $todayStr,
            'scheduled_date'   => $todayStr,
            'status'           => 'scheduled',
            'notes'            => 'Booster vaccination request',
        ]);

        Sanctum::actingAs($nurse);
        $this->postJson("/api/appointments/patient/{$boosterPatient->patient_id}/check-in")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Booster requests must be registered and assessed by the Doctor before treatment.');
        $this->assertDatabaseCount('queues', 0);
    }

    public function test_check_in_patient_to_nurse_selects_due_follow_up_and_leaves_mobile_consultation_untouched(): void
    {
        [$clinic, , $regStaff, $account, $patient] = $this->createFixtures();
        $episode = $this->createActivePepEpisode($clinic, $regStaff, $patient);
        $todayStr = Carbon::today()->toDateString();

        $day3 = Appointment::create([
            'clinic_id'        => $clinic->id,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $episode->bite_id,
            'appointment_type' => 'follow_up_vaccination',
            'dose_number'      => 3,
            'appointment_date' => $todayStr,
            'scheduled_date'   => $todayStr,
            'status'           => 'scheduled',
        ]);

        [$consultation, $intake] = $this->createPendingMobileConsultation($clinic, $patient, $account, $todayStr);

        Sanctum::actingAs($regStaff);
        $res = $this->postJson("/api/patients/{$patient->patient_id}/check-in-nurse");
        $res->assertOk();
        $res->assertJsonPath('visit_type', 'follow_up');
        $res->assertJsonPath('queue.appointment_id', $day3->appointment_id);
        $res->assertJsonPath('queue.bite_id', $episode->bite_id);

        $this->assertSame('confirmed', $day3->fresh()->status);
        $this->assertSame('scheduled', $consultation->fresh()->status);
        $this->assertNull($consultation->fresh()->bite_id);
        $this->assertSame('pending', $intake->fresh()->status);
        $this->assertSame(1, Queue::where('patient_id', $patient->patient_id)->count());
    }
}
