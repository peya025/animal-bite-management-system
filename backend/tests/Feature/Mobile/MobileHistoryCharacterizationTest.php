<?php

namespace Tests\Feature\Mobile;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobileHistoryCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private PatientAccount $patientAccount;
    private PatientAccount $otherAccount;
    private User $staffUser;
    private Patient $patient;
    private Patient $patient2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan Animal Bite Treatment Center',
        ]);

        $this->patientAccount = PatientAccount::create([
            'name'      => 'Maria Santos',
            'email'     => 'maria@example.com',
            'phone'     => '09171234567',
            'password'  => Hash::make('Password123!'),
            'is_active' => true,
        ]);

        $this->otherAccount = PatientAccount::create([
            'name'      => 'Other User',
            'email'     => 'other@example.com',
            'phone'     => '09179999999',
            'password'  => Hash::make('Password123!'),
            'is_active' => true,
        ]);

        $this->staffUser = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Staff Nurse',
            'email'     => 'nurse@clinic.gov.ph',
            'password'  => Hash::make('Password123!'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Juan',
            'last_name'     => 'Santos',
            'date_of_birth' => '1990-05-15',
            'gender'        => 'Male',
        ]);

        $this->patient2 = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Baby',
            'last_name'     => 'Santos',
            'date_of_birth' => '2024-01-01',
            'gender'        => 'Female',
        ]);

        $this->patientAccount->patients()->attach($this->patient->patient_id, [
            'relationship' => 'self',
        ]);
        $this->patientAccount->patients()->attach($this->patient2->patient_id, [
            'relationship' => 'child',
        ]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/mobile/history');

        $response->assertStatus(401);
    }

    public function test_staff_user_is_forbidden(): void
    {
        Sanctum::actingAs($this->staffUser, ['*']);

        $response = $this->getJson('/api/mobile/history');

        $response->assertStatus(403);
    }

    public function test_empty_history_when_no_linked_patients(): void
    {
        Sanctum::actingAs($this->otherAccount, ['*']);

        $response = $this->getJson('/api/mobile/history');

        $response->assertOk()
            ->assertExactJson([
                'summary' => [
                    'total_visits' => 0,
                    'total_vaccinations' => 0,
                    'active_cases' => 0,
                ],
                'active_case' => null,
                'records' => [],
            ]);
    }

    public function test_history_returns_past_appointments_and_administered_vaccinations(): void
    {
        Sanctum::actingAs($this->patientAccount, ['*']);

        // 1. Past completed appointment
        $pastDate = Carbon::today()->subDays(5)->format('Y-m-d');
        Appointment::create([
            'clinic_id'             => $this->clinic->id,
            'patient_id'            => $this->patient->patient_id,
            'booked_by_account_id'  => $this->patientAccount->id,
            'appointment_type'      => 'consultation',
            'scheduled_date'        => $pastDate,
            'appointment_date'      => $pastDate,
            'scheduled_time'        => '09:00:00',
            'time_slot'             => 'morning',
            'status'                => 'completed',
            'notes'                 => 'Initial checkup after dog bite',
        ]);

        // 2. Bite incident
        $bite = BiteIncident::create([
            'clinic_id'   => $this->clinic->id,
            'patient_id'  => $this->patient->patient_id,
            'case_number' => 'TAG-2026-001',
            'bite_date'   => $pastDate,
            'created_by'  => $this->staffUser->id,
        ]);

        // 3. Administered treatment record (Day 0)
        TreatmentRecord::create([
            'clinic_id'       => $this->clinic->id,
            'patient_id'      => $this->patient->patient_id,
            'bite_id'         => $bite->bite_id,
            'dose_number'     => 0,
            'treatment_date'  => $pastDate,
            'scheduled_date'  => $pastDate,
            'status'          => 'completed',
            'vaccine_brand'   => 'Verorab',
        ]);

        // 4. Future scheduled dose (Day 3, tomorrow)
        $futureDate = Carbon::today()->addDays(1)->format('Y-m-d');
        TreatmentRecord::create([
            'clinic_id'       => $this->clinic->id,
            'patient_id'      => $this->patient->patient_id,
            'bite_id'         => $bite->bite_id,
            'dose_number'     => 3,
            'scheduled_date'  => $futureDate,
            'status'          => 'scheduled',
            'vaccine_brand'   => 'Verorab',
        ]);

        $response = $this->getJson('/api/mobile/history');

        $response->assertOk()
            ->assertJsonStructure([
                'summary' => [
                    'total_visits',
                    'total_vaccinations',
                    'active_cases',
                    'patients',
                ],
                'active_case' => [
                    'case_number',
                    'next_dose_text',
                    'due_badge_text',
                    'schedule_drift_days',
                    'schedule_adjustment_reason',
                    'ideal_date',
                ],
                'records',
            ]);

        $data = $response->json();

        // 2 history records: 1 appointment + 1 completed vaccination (future dose not in records)
        $this->assertCount(2, $data['records']);
        $this->assertEquals(1, $data['summary']['total_vaccinations']);
        $this->assertEquals(2, $data['summary']['total_visits']);
        $this->assertEquals(1, $data['summary']['active_cases']);

        // Check active case details
        $this->assertEquals('TAG-2026-001', $data['active_case']['case_number']);
        $this->assertEquals('Due in 1 day', $data['active_case']['due_badge_text']);
        $this->assertStringContainsString('Day 3 dose', $data['active_case']['next_dose_text']);

        // Check record formatting
        $recTypes = array_column($data['records'], 'type');
        $this->assertContains('appointments', $recTypes);
        $this->assertContains('vaccinations', $recTypes);

        $vacRecord = collect($data['records'])->firstWhere('type', 'vaccinations');
        $this->assertEquals('Anti-rabies vaccine · Day 0', $vacRecord['title']);
        $this->assertEquals('completed', $vacRecord['status']);
        $this->assertEquals('Verorab', $vacRecord['vaccine_brand']);
        $this->assertEquals('1 of 4 done', $vacRecord['dose_label']);
    }

    public function test_active_case_banner_with_drift_from_appointment(): void
    {
        Sanctum::actingAs($this->patientAccount, ['*']);

        $bite = BiteIncident::create([
            'clinic_id'   => $this->clinic->id,
            'patient_id'  => $this->patient->patient_id,
            'case_number' => 'TAG-2026-002',
            'bite_date'   => Carbon::today()->subDays(2)->format('Y-m-d'),
            'created_by'  => $this->staffUser->id,
        ]);

        $futureDate = Carbon::today()->addDays(3)->format('Y-m-d');
        Appointment::create([
            'clinic_id'                  => $this->clinic->id,
            'patient_id'                 => $this->patient->patient_id,
            'booked_by_account_id'       => $this->patientAccount->id,
            'appointment_type'           => 'vaccination',
            'dose_number'                => 7,
            'scheduled_date'             => $futureDate,
            'appointment_date'           => $futureDate,
            'scheduled_time'             => '10:00:00',
            'status'                     => 'scheduled',
            'schedule_drift_days'        => 2,
            'schedule_adjustment_reason' => 'Holiday rescheduled',
            'ideal_date'                 => Carbon::today()->addDays(1)->format('Y-m-d'),
        ]);

        $response = $this->getJson('/api/mobile/history');

        $response->assertOk();
        $activeCase = $response->json('active_case');

        $this->assertNotNull($activeCase);
        $this->assertEquals('TAG-2026-002', $activeCase['case_number']);
        $this->assertEquals('Due in 3 days', $activeCase['due_badge_text']);
        $this->assertStringContainsString('Day 7 dose', $activeCase['next_dose_text']);
        $this->assertEquals(2, $activeCase['schedule_drift_days']);
        $this->assertEquals('Holiday rescheduled', $activeCase['schedule_adjustment_reason']);
        $this->assertNotNull($activeCase['ideal_date']);
    }

    public function test_active_case_due_today(): void
    {
        Sanctum::actingAs($this->patientAccount, ['*']);

        BiteIncident::create([
            'clinic_id'   => $this->clinic->id,
            'patient_id'  => $this->patient->patient_id,
            'case_number' => 'TAG-2026-003',
            'bite_date'   => Carbon::today()->subDays(3)->format('Y-m-d'),
            'created_by'  => $this->staffUser->id,
        ]);

        TreatmentRecord::create([
            'clinic_id'       => $this->clinic->id,
            'patient_id'      => $this->patient->patient_id,
            'dose_number'     => 3,
            'scheduled_date'  => Carbon::today()->format('Y-m-d'),
            'status'          => 'scheduled',
        ]);

        $response = $this->getJson('/api/mobile/history');

        $response->assertOk();
        $this->assertEquals('Due today', $response->json('active_case.due_badge_text'));
    }

    public function test_active_case_without_pending_doses_shows_completed_banner(): void
    {
        Sanctum::actingAs($this->patientAccount, ['*']);

        BiteIncident::create([
            'clinic_id'   => $this->clinic->id,
            'patient_id'  => $this->patient->patient_id,
            'case_number' => 'TAG-2026-004',
            'bite_date'   => Carbon::today()->subDays(30)->format('Y-m-d'),
            'created_by'  => $this->staffUser->id,
        ]);

        $response = $this->getJson('/api/mobile/history');

        $response->assertOk();
        $activeCase = $response->json('active_case');
        $this->assertNotNull($activeCase);
        $this->assertEquals('Active', $activeCase['due_badge_text']);
        $this->assertEquals('All scheduled doses completed', $activeCase['next_dose_text']);
    }

    public function test_filter_by_patient_id(): void
    {
        Sanctum::actingAs($this->patientAccount, ['*']);

        // Record for Patient 1 (walk-in appointment created at clinic, not booked online)
        $pastDate1 = Carbon::today()->subDays(10)->format('Y-m-d');
        Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'booked_by_account_id' => null,
            'appointment_type'     => 'consultation',
            'scheduled_date'       => $pastDate1,
            'appointment_date'     => $pastDate1,
            'status'               => 'completed',
        ]);

        // Record for Patient 2
        $pastDate2 = Carbon::today()->subDays(3)->format('Y-m-d');
        Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient2->patient_id,
            'booked_by_account_id' => $this->patientAccount->id,
            'appointment_type'     => 'consultation',
            'scheduled_date'       => $pastDate2,
            'appointment_date'     => $pastDate2,
            'status'               => 'completed',
        ]);

        // Request with patient_id for Patient 2 only
        $response = $this->getJson('/api/mobile/history?patient_id=' . $this->patient2->patient_id);

        $response->assertOk();
        $records = $response->json('records');
        $this->assertCount(1, $records);
        $this->assertEquals($this->patient2->patient_id, $records[0]['patient_id']);
        $this->assertEquals('Baby Santos', $records[0]['patient_name']);
        $this->assertEquals('child', $records[0]['relationship']);

        $summaryPatients = $response->json('summary.patients');
        $this->assertCount(1, $summaryPatients);
        $this->assertEquals($this->patient2->patient_id, $summaryPatients[0]['id']);
    }

    public function test_filter_by_unlinked_patient_id_returns_empty(): void
    {
        Sanctum::actingAs($this->patientAccount, ['*']);

        $unlinkedPatient = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Stranger',
            'last_name'     => 'Person',
            'date_of_birth' => '1985-01-01',
            'gender'        => 'Male',
        ]);

        $response = $this->getJson('/api/mobile/history?patient_id=' . $unlinkedPatient->patient_id);

        $response->assertOk()
            ->assertExactJson([
                'summary' => [
                    'total_visits' => 0,
                    'total_vaccinations' => 0,
                    'active_cases' => 0,
                ],
                'active_case' => null,
                'records' => [],
            ]);
    }

    public function test_missed_and_cancelled_appointments_mapped_to_missed_status(): void
    {
        Sanctum::actingAs($this->patientAccount, ['*']);

        $date1 = Carbon::today()->subDays(4)->format('Y-m-d');
        Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'booked_by_account_id' => $this->patientAccount->id,
            'appointment_type'     => 'consultation',
            'scheduled_date'       => $date1,
            'appointment_date'     => $date1,
            'status'               => 'cancelled',
        ]);

        $date2 = Carbon::today()->subDays(2)->format('Y-m-d');
        Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'booked_by_account_id' => $this->patientAccount->id,
            'appointment_type'     => 'consultation',
            'scheduled_date'       => $date2,
            'appointment_date'     => $date2,
            'status'               => 'missed',
        ]);

        $response = $this->getJson('/api/mobile/history');

        $response->assertOk();
        $records = $response->json('records');
        $this->assertCount(2, $records);
        foreach ($records as $rec) {
            $this->assertEquals('missed', $rec['status']);
        }
    }

    public function test_booster_dose_names_and_time_slot_parsing(): void
    {
        Sanctum::actingAs($this->patientAccount, ['*']);

        $pastDate = Carbon::today()->subDays(60)->format('Y-m-d');

        // Booster 1 appointment with notes specifying Booster 1
        Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'booked_by_account_id' => $this->patientAccount->id,
            'appointment_type'     => 'vaccination',
            'dose_number'          => 90,
            'notes'                => 'Patient booster dose: Booster 1',
            'scheduled_date'       => $pastDate,
            'appointment_date'     => $pastDate,
            'appointment_time'     => '13:00:00',
            'status'               => 'completed',
        ]);

        // Vaccination appointment using notes regex pattern for dose name
        $pastDate2 = Carbon::today()->subDays(50)->format('Y-m-d');
        Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'booked_by_account_id' => $this->patientAccount->id,
            'appointment_type'     => 'vaccination',
            'scheduled_date'       => $pastDate2,
            'appointment_date'     => $pastDate2,
            'appointment_time'     => '14:30:00',
            'notes'                => 'Scheduled for Booster 2 dose follow-up',
            'status'               => 'completed',
        ]);

        $response = $this->getJson('/api/mobile/history');

        $response->assertOk();
        $records = $response->json('records');
        $this->assertCount(2, $records);

        $booster1 = collect($records)->firstWhere('title', 'Anti-rabies vaccine · Booster 1');
        $this->assertNotNull($booster1);
        $this->assertStringContainsString('1:00 PM', $booster1['date_time']);

        $booster2 = collect($records)->firstWhere('title', 'Anti-rabies vaccine · Booster 2');
        $this->assertNotNull($booster2);
        $this->assertStringContainsString('2:30 PM', $booster2['date_time']);
    }

    public function test_multi_dose_progress_and_sorting_order(): void
    {
        Sanctum::actingAs($this->patientAccount, ['*']);

        $bite = BiteIncident::create([
            'clinic_id'   => $this->clinic->id,
            'patient_id'  => $this->patient->patient_id,
            'case_number' => 'TAG-2026-PROGRESS',
            'bite_date'   => Carbon::today()->subDays(20)->format('Y-m-d'),
            'created_by'  => $this->staffUser->id,
        ]);

        // Dose 0 - 15 days ago
        TreatmentRecord::create([
            'clinic_id'       => $this->clinic->id,
            'patient_id'      => $this->patient->patient_id,
            'bite_id'         => $bite->bite_id,
            'dose_number'     => 0,
            'treatment_date'  => Carbon::today()->subDays(15)->format('Y-m-d'),
            'scheduled_date'  => Carbon::today()->subDays(15)->format('Y-m-d'),
            'status'          => 'completed',
        ]);

        // Dose 3 - 12 days ago
        TreatmentRecord::create([
            'clinic_id'       => $this->clinic->id,
            'patient_id'      => $this->patient->patient_id,
            'bite_id'         => $bite->bite_id,
            'dose_number'     => 3,
            'treatment_date'  => Carbon::today()->subDays(12)->format('Y-m-d'),
            'scheduled_date'  => Carbon::today()->subDays(12)->format('Y-m-d'),
            'status'          => 'completed',
        ]);

        $response = $this->getJson('/api/mobile/history');

        $response->assertOk();
        $records = $response->json('records');
        $this->assertCount(2, $records);

        // Sorting: Dose 3 (12 days ago) must be first, Dose 0 (15 days ago) second
        $this->assertEquals('Anti-rabies vaccine · Day 3', $records[0]['title']);
        $this->assertEquals('Anti-rabies vaccine · Day 0', $records[1]['title']);

        // Check progress calculation: 2 completed
        $this->assertEquals(2, $records[0]['completed_doses']);
        $this->assertEquals(4, $records[0]['total_doses']);
        $this->assertEquals(2, $response->json('summary.total_vaccinations'));
    }
}
