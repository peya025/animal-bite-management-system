<?php

namespace Tests\Feature\Reports;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\Clinical\BiteCaseService;
use App\Services\DohReportService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase3IncompleteJourneysAndOutcomesTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $staff;
    private User $doctor;
    private User $nurse;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::create(2026, 11, 15, 10, 0, 0));

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan ABTC',
            'municipality' => 'Tagoloan',
            'province' => 'Misamis Oriental',
            'population' => 75000,
            'health_officer_name' => 'Dr. Jennifer Advincula',
            'status' => 'active',
        ]);

        $this->staff = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->doctor = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'triage',
            'is_active' => true,
        ]);

        $this->nurse = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->staff);
    }

    private function createPatient(string $firstName = 'Patient', string $lastName = 'Test', string $gender = 'male'): Patient
    {
        return Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'date_of_birth' => '1995-06-15',
            'gender' => $gender,
            'contact_number' => '09170000001',
        ]);
    }

    public function test_all_five_incomplete_journey_stages_report_exact_visibility_labels(): void
    {
        $p1 = $this->createPatient('FormOne', 'RegistrationOnly');
        $e1 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'case_number' => 'BC-2026-ST1',
            'episode_type' => 'pending_assessment',
            'bite_date' => '2026-11-05',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'unassessed',
            'animal_type' => 'dog',
            'status' => 'awaiting_assessment',
            'created_by' => $this->staff->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $e1->bite_id,
            'dose_number' => null,
            'status' => 'scheduled',
            'consultation_date' => '2026-11-05',
            'blood_pressure' => '120/80',
            'administered_by' => $this->staff->id,
        ]);

        $p2 = $this->createPatient('FormTwo', 'PepPrescribedNoNurse');
        $e2 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p2->patient_id,
            'case_number' => 'BC-2026-ST2',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-06',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'severe',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-06 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->staff->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p2->patient_id,
            'bite_id' => $e2->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-06',
            'nature_of_visit' => 'new_consultation',
            'chief_complaints' => 'Deep dog bite on leg',
            'diagnosis' => 'Category III Bite',
            'prescribed_vaccine_type' => 'Speeda',
            'prophylaxis_orders' => [
                'consultation_exposure_category' => 'III',
                'consultation_treatment_plan' => 'full_pep',
            ],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p2->patient_id,
            'bite_id' => $e2->bite_id,
            'plan_type' => 'full_pep',
            'status' => 'approved',
            'ordered_dose_days' => [0, 3, 7],
            'decided_by' => $this->doctor->id,
            'decided_at' => '2026-11-06 10:00:00',
        ]);

        $p3 = $this->createPatient('FormTwo', 'NoPepRequired');
        $e3 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p3->patient_id,
            'case_number' => 'BC-2026-ST3',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-07',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Casinglot',
            'severity' => 'minor',
            'animal_type' => 'cat',
            'status' => 'completed',
            'confirmed_at' => '2026-11-07 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->staff->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p3->patient_id,
            'bite_id' => $e3->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-07',
            'nature_of_visit' => 'new_consultation',
            'diagnosis' => 'Category I Licking on Intact Skin',
            'outcome' => 'completed_without_injection',
            'prophylaxis_orders' => [
                'consultation_exposure_category' => 'I',
                'consultation_treatment_plan' => 'no_vaccine',
            ],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p3->patient_id,
            'bite_id' => $e3->bite_id,
            'plan_type' => 'no_vaccine',
            'status' => 'completed',
            'ordered_dose_days' => [],
            'decided_by' => $this->doctor->id,
            'decided_at' => '2026-11-07 10:00:00',
        ]);

        $p4 = $this->createPatient('FormTwo', 'TransferredOut');
        $e4 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p4->patient_id,
            'case_number' => 'BC-2026-ST4',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-08',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Sta. Cruz',
            'severity' => 'severe',
            'animal_type' => 'dog',
            'status' => 'transferred_out',
            'transferred_to_facility' => 'NMMC Cagayan de Oro',
            'transferred_at' => '2026-11-08 11:00:00',
            'transfer_reason' => 'Stock-out / patient relocation',
            'confirmed_at' => '2026-11-08 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->staff->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p4->patient_id,
            'bite_id' => $e4->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-08',
            'nature_of_visit' => 'new_consultation',
            'mode_of_transaction' => 'referral',
            'referred_to' => 'NMMC Cagayan de Oro',
            'reason_for_referral' => 'Stock-out / patient relocation',
            'outcome' => 'Transferred/Referred',
            'prophylaxis_orders' => [
                'consultation_exposure_category' => 'III',
                'consultation_treatment_plan' => 'no_vaccine',
            ],
            'administered_by' => $this->doctor->id,
        ]);

        $p5 = $this->createPatient('FormThree', 'TreatmentRecorded');
        $e5 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p5->patient_id,
            'case_number' => 'BC-2026-ST5',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-09',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'moderate',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-09 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->staff->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p5->patient_id,
            'bite_id' => $e5->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-09',
            'nature_of_visit' => 'new_consultation',
            'prescribed_vaccine_type' => 'Speeda',
            'prophylaxis_orders' => [
                'consultation_exposure_category' => 'II',
                'consultation_treatment_plan' => 'full_pep',
            ],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p5->patient_id,
            'bite_id' => $e5->bite_id,
            'plan_type' => 'full_pep',
            'status' => 'approved',
            'ordered_dose_days' => [0, 3, 7],
            'decided_by' => $this->doctor->id,
            'decided_at' => '2026-11-09 10:00:00',
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p5->patient_id,
            'bite_id' => $e5->bite_id,
            'dose_number' => 0,
            'treatment_date' => '2026-11-09',
            'vaccine_brand' => 'Speeda',
            'status' => 'completed',
            'administered_by' => $this->nurse->id,
        ]);

        $registry = $this->getJson('/api/reports/exposure-registry?from=2026-11-01&to=2026-11-30')->assertOk();
        $cases = collect($registry->json('patient_cases'))->keyBy('case_number');

        $this->assertCount(5, $cases);

        // 1. Form 1: Registration only
        $this->assertSame('form_1_registration', $cases['BC-2026-ST1']['last_completed_stage']);
        $this->assertSame('Awaiting Assessment', $cases['BC-2026-ST1']['stage_label']);
        $this->assertSame('Not yet assessed', $cases['BC-2026-ST1']['category']);
        $this->assertSame('Not yet determined', $cases['BC-2026-ST1']['treatment_decision_display']);

        // 2. Form 2: Doctor assessment; PEP prescribed, no nurse treatment
        $this->assertSame('form_2_pep_prescribed', $cases['BC-2026-ST2']['last_completed_stage']);
        $this->assertSame('Awaiting Treatment', $cases['BC-2026-ST2']['stage_label']);
        $this->assertSame('III', $cases['BC-2026-ST2']['category']);
        $this->assertSame('No administration recorded', $cases['BC-2026-ST2']['administration_display']);

        // 3. Form 2: No PEP required
        $this->assertSame('form_2_no_pep', $cases['BC-2026-ST3']['last_completed_stage']);
        $this->assertSame('Completed – No PEP Required', $cases['BC-2026-ST3']['stage_label']);
        $this->assertSame('I', $cases['BC-2026-ST3']['category']);
        $this->assertSame('Not applicable', $cases['BC-2026-ST3']['vaccination_display']);

        // 4. Form 2: Transferred/Referred
        $this->assertSame('form_2_transferred', $cases['BC-2026-ST4']['last_completed_stage']);
        $this->assertSame('Transferred/Referred', $cases['BC-2026-ST4']['stage_label']);
        $this->assertSame('Unknown unless verified', $cases['BC-2026-ST4']['external_treatment_display']);

        // 5. Form 3: Nurse treatment recorded
        $this->assertSame('form_3_treatment_recorded', $cases['BC-2026-ST5']['last_completed_stage']);
        $this->assertSame('Treatment started', $cases['BC-2026-ST5']['stage_label']);
        $this->assertSame('II', $cases['BC-2026-ST5']['category']);
        $this->assertSame('Yes', $cases['BC-2026-ST5']['pep_given']);

        // Also verify Bite Cases Summary API carries identical stage visibility and excludes awaiting/no-PEP from pep_compliance denominator
        $summaryRes = $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30')->assertOk();
        $summaryRes->assertJsonPath('summary.total_cases', 5)
            ->assertJsonPath('summary.awaiting_assessment', 1)
            ->assertJsonPath('summary.pep_prescribed', 2)
            ->assertJsonPath('summary.verified_vaccine_initiation', 1)
            ->assertJsonPath('summary.no_administration_recorded', 1)
            ->assertJsonPath('summary.pep_compliance', 50);
    }

    public function test_hundred_episode_cohort_reconciliation_benchmark_matches_exact_figures(): void
    {
        $patient = $this->createPatient('Cohort', 'Benchmark');
        $date = '2026-11-05';

        // 20 Form 1 awaiting assessment
        for ($i = 1; $i <= 20; $i++) {
            BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'case_number' => "BC-BM-F1-{$i}",
                'episode_type' => 'pending_assessment',
                'bite_date' => $date,
                'bite_date_is_provisional' => false,
                'bite_place' => 'Poblacion',
                'severity' => 'unassessed',
                'animal_type' => 'dog',
                'status' => 'awaiting_assessment',
                'created_by' => $this->staff->id,
            ]);
        }

        // 50 PEP prescribed WITH recorded administration
        for ($i = 1; $i <= 50; $i++) {
            $inc = BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'case_number' => "BC-BM-PEP-ADMIN-{$i}",
                'episode_type' => 'primary',
                'bite_date' => $date,
                'bite_date_is_provisional' => false,
                'bite_place' => 'Poblacion',
                'severity' => 'severe',
                'animal_type' => 'dog',
                'status' => 'active',
                'confirmed_at' => '2026-11-05 10:00:00',
                'confirmed_by' => $this->doctor->id,
                'created_by' => $this->staff->id,
            ]);
            TreatmentRecord::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $inc->bite_id,
                'dose_number' => null,
                'status' => 'completed',
                'consultation_date' => $date,
                'nature_of_visit' => 'new_consultation',
                'prescribed_vaccine_type' => 'Speeda',
                'prophylaxis_orders' => ['consultation_treatment_plan' => 'full_pep'],
                'administered_by' => $this->doctor->id,
            ]);
            TreatmentPlan::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $inc->bite_id,
                'plan_type' => 'full_pep',
                'status' => 'approved',
                'ordered_dose_days' => [0, 3, 7],
                'decided_by' => $this->doctor->id,
                'decided_at' => '2026-11-05 10:00:00',
            ]);
            TreatmentRecord::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $inc->bite_id,
                'dose_number' => 0,
                'treatment_date' => $date,
                'vaccine_brand' => 'Speeda',
                'status' => 'completed',
                'administered_by' => $this->nurse->id,
            ]);
        }

        // 10 PEP prescribed WITH NO administration recorded (5 new course + 5 continue course)
        for ($i = 1; $i <= 10; $i++) {
            $inc = BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'case_number' => "BC-BM-PEP-NONE-{$i}",
                'episode_type' => $i <= 5 ? 'primary' : 're_exposure',
                'bite_date' => $date,
                'bite_date_is_provisional' => false,
                'bite_place' => 'Poblacion',
                'severity' => 'moderate',
                'animal_type' => 'dog',
                'status' => 'active',
                'confirmed_at' => '2026-11-05 10:00:00',
                'confirmed_by' => $this->doctor->id,
                'created_by' => $this->staff->id,
            ]);
            TreatmentRecord::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $inc->bite_id,
                'dose_number' => null,
                'status' => 'completed',
                'consultation_date' => $date,
                'nature_of_visit' => 'new_consultation',
                'prescribed_vaccine_type' => 'Speeda',
                'prophylaxis_orders' => ['consultation_treatment_plan' => $i <= 5 ? 'full_pep' : 'continue_existing_schedule'],
                'administered_by' => $this->doctor->id,
            ]);
            TreatmentPlan::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $inc->bite_id,
                'plan_type' => $i <= 5 ? 'full_pep' : 'two_dose_booster',
                'status' => 'approved',
                'ordered_dose_days' => $i <= 5 ? [0, 3, 7] : [0, 3],
                'continued_from_bite_id' => $i > 5 ? $inc->bite_id : null,
                'decided_by' => $this->doctor->id,
                'decided_at' => '2026-11-05 10:00:00',
            ]);
        }

        // 15 Explicit No PEP (Category I)
        for ($i = 1; $i <= 15; $i++) {
            $inc = BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'case_number' => "BC-BM-NOPEP-{$i}",
                'episode_type' => 'primary',
                'bite_date' => $date,
                'bite_date_is_provisional' => false,
                'bite_place' => 'Poblacion',
                'severity' => 'minor',
                'animal_type' => 'cat',
                'status' => 'completed',
                'confirmed_at' => '2026-11-05 10:00:00',
                'confirmed_by' => $this->doctor->id,
                'created_by' => $this->staff->id,
            ]);
            TreatmentRecord::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $inc->bite_id,
                'dose_number' => null,
                'status' => 'completed',
                'consultation_date' => $date,
                'nature_of_visit' => 'new_consultation',
                'outcome' => 'completed_without_injection',
                'prophylaxis_orders' => ['consultation_treatment_plan' => 'no_vaccine'],
                'administered_by' => $this->doctor->id,
            ]);
            TreatmentPlan::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $inc->bite_id,
                'plan_type' => 'no_vaccine',
                'status' => 'completed',
                'ordered_dose_days' => [],
                'decided_by' => $this->doctor->id,
                'decided_at' => '2026-11-05 10:00:00',
            ]);
        }

        // 5 Assessed consultations with missing PEP treatment decision
        for ($i = 1; $i <= 5; $i++) {
            $inc = BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'case_number' => "BC-BM-MISS-{$i}",
                'episode_type' => 'primary',
                'bite_date' => $date,
                'bite_date_is_provisional' => false,
                'bite_place' => 'Poblacion',
                'severity' => 'moderate',
                'animal_type' => 'dog',
                'status' => 'active',
                'confirmed_at' => '2026-11-05 10:00:00',
                'confirmed_by' => $this->doctor->id,
                'created_by' => $this->staff->id,
            ]);
            TreatmentRecord::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $inc->bite_id,
                'dose_number' => null,
                'status' => 'completed',
                'consultation_date' => $date,
                'nature_of_visit' => 'new_consultation',
                'diagnosis' => 'Category II pending PEP order',
                'administered_by' => $this->doctor->id,
            ]);
        }

        $monthly = $this->getJson('/api/reports/monthly?month=2026-11')->assertOk();
        $monthly->assertJsonPath('journey_reconciliation.recorded_episodes', 100)
            ->assertJsonPath('journey_reconciliation.finalized_assessments', 80)
            ->assertJsonPath('journey_reconciliation.awaiting_assessment', 20)
            ->assertJsonPath('journey_reconciliation.pep_prescribed', 60)
            ->assertJsonPath('journey_reconciliation.new_course_prescribed', 55)
            ->assertJsonPath('journey_reconciliation.continue_course', 5)
            ->assertJsonPath('journey_reconciliation.explicit_no_pep', 15)
            ->assertJsonPath('journey_reconciliation.decision_missing', 5)
            ->assertJsonPath('journey_reconciliation.verified_vaccine_initiation', 50)
            ->assertJsonPath('journey_reconciliation.no_administration_recorded', 10)
            ->assertJsonPath(
                'journey_reconciliation.narrative',
                'Of 100 recorded exposure episodes, 80 had a completed doctor assessment and 20 were awaiting assessment. Of 60 episodes prescribed PEP, 50 had recorded administration and 10 had no administration recorded as of the reporting cutoff.'
            );

        // Initiation rate = 50 / 60 = 83% (excludes the 20 awaiting assessment and 15 explicit no PEP)
        $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30')
            ->assertOk()
            ->assertJsonPath('summary.total_cases', 100)
            ->assertJsonPath('summary.pep_prescribed', 60)
            ->assertJsonPath('summary.verified_vaccine_initiation', 50)
            ->assertJsonPath('summary.no_administration_recorded', 10)
            ->assertJsonPath('summary.pep_compliance', 83);
    }

    public function test_prior_completed_primary_series_does_not_mark_new_episode_completed_a04(): void
    {
        $patient = $this->createPatient('Prior', 'PrimaryHolder');

        // Completed Episode 1 in August 2026 ([0, 3, 7] all completed -> has_completed_primary === true)
        $ep1 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-EP1',
            'episode_number' => 1,
            'episode_type' => 'primary',
            'bite_date' => '2026-08-01',
            'bite_date_is_provisional' => false,
            'severity' => 'severe',
            'animal_type' => 'dog',
            'status' => 'completed',
            'confirmed_at' => '2026-08-01 09:00:00',
            'created_by' => $this->staff->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $ep1->bite_id,
            'plan_type' => 'full_pep',
            'status' => 'completed',
            'ordered_dose_days' => [0, 3, 7],
            'decided_at' => '2026-08-01 09:00:00',
        ]);
        foreach ([0 => '2026-08-01', 3 => '2026-08-04', 7 => '2026-08-08'] as $dose => $dt) {
            TreatmentRecord::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $ep1->bite_id,
                'dose_number' => $dose,
                'treatment_date' => $dt,
                'vaccine_brand' => 'Speeda',
                'status' => 'completed',
                'administered_by' => $this->nurse->id,
            ]);
        }
        $this->assertTrue($patient->fresh()->has_completed_primary);

        // Brand-new Episode 2 in November 2026 with only Day 0 of a 2-dose booster ([0, 3])
        $ep2 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-EP2',
            'episode_number' => 2,
            'episode_type' => 're_exposure',
            'bite_date' => '2026-11-05',
            'bite_date_is_provisional' => false,
            'severity' => 'severe',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-05 09:00:00',
            'created_by' => $this->staff->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $ep2->bite_id,
            'plan_type' => 'two_dose_booster',
            'status' => 'approved',
            'ordered_dose_days' => [0, 3],
            'decided_at' => '2026-11-05 09:00:00',
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $ep2->bite_id,
            'dose_number' => 0,
            'treatment_date' => '2026-11-05',
            'vaccine_brand' => 'Speeda',
            'status' => 'completed',
            'administered_by' => $this->nurse->id,
        ]);

        // Episode 3 in November 2026 awaiting assessment
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-EP3',
            'episode_number' => 3,
            'episode_type' => 'pending_assessment',
            'bite_date' => '2026-11-06',
            'bite_date_is_provisional' => false,
            'severity' => 'unassessed',
            'animal_type' => 'dog',
            'status' => 'awaiting_assessment',
            'created_by' => $this->staff->id,
        ]);

        // Neither EP2 nor EP3 may inherit Episode 1's completion in Monthly or Cohort reports
        $this->getJson('/api/reports/monthly?month=2026-11')
            ->assertOk()
            ->assertJsonPath('total_cases', 2)
            ->assertJsonPath('given_pep', 1)
            ->assertJsonPath('completed_cat_3', 0)
            ->assertJsonPath('total_completed', 0)
            ->assertJsonPath('completion_rate', '0%');

        $this->getJson('/api/reports/cohort?year=2026')
            ->assertOk()
            ->assertJsonPath('quarters.q3.cat_III.completed', 1)
            ->assertJsonPath('quarters.q4.cat_III.cases', 1)
            ->assertJsonPath('quarters.q4.cat_III.completed', 0)
            ->assertJsonPath('quarters.q4.cat_III.completion_rate', '0%')
            ->assertJsonPath('quarters.q4.unassessed_cases', 1);
    }

    public function test_rig_indication_text_is_not_counted_as_administered_rig_a05(): void
    {
        $patient = $this->createPatient('Rig', 'Separation');
        $incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-RIG1',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-05',
            'bite_date_is_provisional' => false,
            'severity' => 'severe',
            'animal_type' => 'dog',
            'rig_decision_reason' => 'HRIG indicated due to multiple deep head wounds',
            'status' => 'active',
            'confirmed_at' => '2026-11-05 09:00:00',
            'created_by' => $this->staff->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-05',
            'nature_of_visit' => 'new_consultation',
            'prescribed_vaccine_type' => 'Speeda',
            'prophylaxis_orders' => [
                'consultation_exposure_category' => 'III',
                'consultation_treatment_plan' => 'full_pep',
                'rig' => 'ERIG',
                'rig_weight_kg' => 60,
            ],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'plan_type' => 'full_pep',
            'status' => 'approved',
            'ordered_dose_days' => [0, 3, 7],
            'decided_at' => '2026-11-05 09:00:00',
        ]);

        // Before actual ERIG TreatmentRecord: rig_indicated = 1, but hrig/erig/given_rig MUST be 0
        $this->getJson('/api/reports/exposure-registry?from=2026-11-01&to=2026-11-30')
            ->assertOk()
            ->assertJsonPath('totals.rig_indicated', 1)
            ->assertJsonPath('totals.hrig', 0)
            ->assertJsonPath('totals.erig', 0)
            ->assertJsonPath('patient_cases.0.rig_indicated', 'ERIG')
            ->assertJsonPath('patient_cases.0.rig_given', 'None');

        $this->getJson('/api/reports/monthly?month=2026-11')
            ->assertOk()
            ->assertJsonPath('rig_indicated', 1)
            ->assertJsonPath('given_rig', 0);

        // Cancelled not_administered ERIG record must still NOT count
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => null,
            'medication_given' => 'ERIG',
            'scheduled_date' => '2026-11-05',
            'treatment_date' => null,
            'status' => 'cancelled',
            'outcome' => 'not_administered',
            'administered_by' => $this->nurse->id,
        ]);

        $this->getJson('/api/reports/monthly?month=2026-11')
            ->assertOk()
            ->assertJsonPath('given_rig', 0);

        // Verified completed ERIG administration on 2026-11-06 counts at cutoff >= 2026-11-06
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => null,
            'medication_given' => 'ERIG',
            'treatment_date' => '2026-11-06',
            'status' => 'completed',
            'administered_by' => $this->nurse->id,
        ]);

        $this->getJson('/api/reports/monthly?month=2026-11&cutoff=2026-11-05')
            ->assertOk()
            ->assertJsonPath('given_rig', 0);

        $this->getJson('/api/reports/monthly?month=2026-11&cutoff=2026-11-10')
            ->assertOk()
            ->assertJsonPath('given_rig', 1);

        $this->getJson('/api/reports/exposure-registry?from=2026-11-01&to=2026-11-30&cutoff=2026-11-10')
            ->assertOk()
            ->assertJsonPath('totals.erig', 1)
            ->assertJsonPath('totals.hrig', 0);
    }

    public function test_cutoff_bounds_and_excludes_voided_or_cancelled_doses_a06_a08(): void
    {
        $patient = $this->createPatient('Cutoff', 'Boundary');
        $incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-CUT',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-02',
            'bite_date_is_provisional' => false,
            'severity' => 'severe',
            'animal_type' => 'dog',
            'status' => 'completed',
            'confirmed_at' => '2026-11-02 09:00:00',
            'created_by' => $this->staff->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'plan_type' => 'full_pep',
            'status' => 'completed',
            'ordered_dose_days' => [0, 3, 7],
            'decided_at' => '2026-11-02 09:00:00',
        ]);

        // Voided D0 dose & cancelled D3 dose must NOT count
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => 0,
            'treatment_date' => '2026-11-02',
            'vaccine_brand' => 'Speeda',
            'status' => 'completed',
            'voided_at' => '2026-11-02 12:00:00',
            'administered_by' => $this->nurse->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => 3,
            'scheduled_date' => '2026-11-05',
            'treatment_date' => null,
            'status' => 'cancelled',
            'outcome' => 'not_administered',
            'administered_by' => $this->nurse->id,
        ]);

        // Real D0 on Nov 02, D3 on Nov 05, D7 on Nov 09
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => 0,
            'treatment_date' => '2026-11-02',
            'vaccine_brand' => 'Speeda',
            'status' => 'completed',
            'administered_by' => $this->nurse->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => 3,
            'treatment_date' => '2026-11-05',
            'vaccine_brand' => 'Speeda',
            'status' => 'completed',
            'administered_by' => $this->nurse->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => 7,
            'treatment_date' => '2026-11-09',
            'vaccine_brand' => 'Speeda',
            'status' => 'completed',
            'administered_by' => $this->nurse->id,
        ]);

        // As of Nov 06 cutoff: initiated (D0 + D3) but D7 not yet administered => not completed
        $this->getJson('/api/reports/cohort?year=2026&cutoff=2026-11-06')
            ->assertOk()
            ->assertJsonPath('quarters.q4.cat_III.given_pep', 1)
            ->assertJsonPath('quarters.q4.cat_III.completed', 0)
            ->assertJsonPath('journey_reconciliation.immature_courses', 1);

        // As of Nov 09 cutoff: D0, D3, D7 all given => mature & completed
        $this->getJson('/api/reports/cohort?year=2026&cutoff=2026-11-09')
            ->assertOk()
            ->assertJsonPath('quarters.q4.cat_III.completed', 1)
            ->assertJsonPath('quarters.q4.cat_III.completion_rate', '100%')
            ->assertJsonPath('quarters.q4.cat_III.matured_completion_rate', '100%');
    }

    public function test_category_one_with_pending_tt_order_remains_open_until_administered(): void
    {
        $patient = $this->createPatient('Tetanus', 'PendingCat1');
        $incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-TT1',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-05',
            'bite_date_is_provisional' => false,
            'severity' => 'minor',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-05 09:00:00',
            'created_by' => $this->staff->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-05',
            'nature_of_visit' => 'new_consultation',
            'prophylaxis_orders' => [
                'consultation_exposure_category' => 'I',
                'consultation_treatment_plan' => 'no_vaccine',
                'tetanus_category' => 'tt',
                'tetanus_vaccine' => 'TT',
            ],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'plan_type' => 'no_vaccine',
            'status' => 'approved',
            'ordered_dose_days' => [],
            'decided_at' => '2026-11-05 09:00:00',
        ]);

        // TT pending: disposition stays open and stage is Awaiting Treatment
        $before = $incident->fresh()->resolveReportingState('2026-11-05');
        $this->assertSame('explicit_no_pep', $before['pep_decision']);
        $this->assertSame('open', $before['encounter_disposition']);
        $this->assertTrue($before['has_pending_non_pep_prophylaxis']);
        $this->assertSame('awaiting_treatment', $before['resolved_status']);
        $this->assertSame('Not applicable', $before['stage_summary']['vaccination_display']);
        $this->assertSame('No administration recorded', $before['stage_summary']['administration_display']);

        // Record TT administration on Nov 06
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => null,
            'medication_given' => 'TT',
            'treatment_date' => '2026-11-06',
            'status' => 'completed',
            'administered_by' => $this->nurse->id,
        ]);

        $after = $incident->fresh()->resolveReportingState('2026-11-06');
        $this->assertSame('closed', $after['encounter_disposition']);
        $this->assertFalse($after['has_pending_non_pep_prophylaxis']);
        $this->assertSame('completed_no_pep', $after['resolved_status']);
        $this->assertSame('Completed – No PEP Required', $after['stage_summary']['stage_label']);
        $this->assertSame('Not applicable', $after['stage_summary']['vaccination_display']);
    }

    public function test_overdue_units_separate_patients_episodes_and_dose_slots_aligned_to_period_a07_a09(): void
    {
        $patient = $this->createPatient('Overdue', 'SinglePatient');

        // Active episode in November with 2 overdue appointments (Dose 3 & Dose 7)
        $epNov = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-OV1',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-01',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'severe',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-01 09:00:00',
            'created_by' => $this->staff->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $epNov->bite_id,
            'plan_type' => 'full_pep',
            'status' => 'approved',
            'ordered_dose_days' => [0, 3, 7],
            'decided_at' => '2026-11-01 09:00:00',
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $epNov->bite_id,
            'dose_number' => 0,
            'treatment_date' => '2026-11-01',
            'vaccine_brand' => 'Speeda',
            'status' => 'completed',
            'administered_by' => $this->nurse->id,
        ]);
        Appointment::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $epNov->bite_id,
            'dose_number' => 3,
            'appointment_date' => '2026-11-04',
            'scheduled_date' => '2026-11-04',
            'status' => 'scheduled',
        ]);
        Appointment::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $epNov->bite_id,
            'dose_number' => 7,
            'appointment_date' => '2026-11-08',
            'scheduled_date' => '2026-11-08',
            'status' => 'scheduled',
        ]);

        // Another clinic active episode in October (outside November filter) must NOT leak into November summary (A07)
        $otherPatient = $this->createPatient('OtherMonth', 'OctOverdue');
        $epOct = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $otherPatient->patient_id,
            'case_number' => 'BC-2026-OCT-OV',
            'episode_type' => 'primary',
            'bite_date' => '2026-10-05',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Casinglot',
            'severity' => 'severe',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-10-05 09:00:00',
            'created_by' => $this->staff->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $otherPatient->patient_id,
            'bite_id' => $epOct->bite_id,
            'plan_type' => 'full_pep',
            'status' => 'approved',
            'ordered_dose_days' => [0, 3, 7],
            'decided_at' => '2026-10-05 09:00:00',
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $otherPatient->patient_id,
            'bite_id' => $epOct->bite_id,
            'dose_number' => 0,
            'treatment_date' => '2026-10-05',
            'vaccine_brand' => 'Speeda',
            'status' => 'completed',
            'administered_by' => $this->nurse->id,
        ]);
        Appointment::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $otherPatient->patient_id,
            'bite_id' => $epOct->bite_id,
            'dose_number' => 3,
            'appointment_date' => '2026-10-08',
            'scheduled_date' => '2026-10-08',
            'status' => 'scheduled',
        ]);

        // Filtered to November 2026 at cutoff 2026-11-15:
        // Only BC-2026-OV1 is in range -> 1 overdue patient, 1 overdue episode, 1 overdue course, 2 outstanding dose slots!
        $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-15')
            ->assertOk()
            ->assertJsonPath('summary.total_cases', 1)
            ->assertJsonPath('summary.overdue_doses', 1)
            ->assertJsonPath('summary.overdue_episodes', 1)
            ->assertJsonPath('summary.overdue_patients', 1)
            ->assertJsonPath('summary.overdue_courses', 1)
            ->assertJsonPath('summary.outstanding_dose_slots', 2)
            ->assertJsonPath('cases.0.outstanding_dose_slot_count', 2)
            ->assertJsonPath('cases.0.overdue_dose', 'Dose 3')
            ->assertJsonPath('locations.0.outstanding_dose_slots', 2);
    }
}
