<?php

namespace Tests\Feature;

use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TreatmentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DohReportsTest extends TestCase
{
    use RefreshDatabase;

    private User $staff;
    private Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2024, 7, 15)->setTime(10, 0));

        $this->clinic = Clinic::create([
            'name' => 'TAGOLOAN ABTC',
            'municipality' => 'Tagoloan',
            'province' => 'Misamis Oriental',
            'population' => 75000,
            'health_officer_name' => 'JENNIFER L. ADVINCULA MD',
        ]);

        $this->staff = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'registration',
            'name' => 'MARITES L. BUENO RM,BSM',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->staff);

        // Seed sample incident
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'date_of_birth' => '2015-05-10', // < 15 years old in 2024
            'gender' => 'male',
            'contact_number' => '09123456789',
        ]);

        $incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2024-0001',
            'bite_date' => '2024-07-02',
            'severity' => 'severe',
            'animal_type' => 'dog',
            'animal_status' => 'stray',
            'rig_decision_reason' => 'HRIG indicated due to deep bite',
            'status' => 'completed',
            'created_by' => $this->staff->id,
        ]);


        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => 0,
            'treatment_date' => '2024-07-02',
            'medication_given' => 'Rabipur',
            'status' => 'completed',
            'scheduled_by' => $this->staff->id,
        ]);
    }

    public function test_api_exposure_registry_returns_correct_structure(): void
    {
        $response = $this->getJson('/api/reports/exposure-registry?from=2024-07-01&to=2024-07-31&quarter=3rd&year=2024');

        $response->assertOk()
            ->assertJsonPath('report_type', 'exposure_registry')
            ->assertJsonPath('clinic', 'TAGOLOAN ABTC')
            ->assertJsonPath('totals.total', 1)
            ->assertJsonPath('totals.male', 1)
            ->assertJsonPath('totals.female', 0)
            ->assertJsonPath('totals.age_below_15', 1)
            ->assertJsonPath('totals.cat_3', 1)
            ->assertJsonPath('totals.dog', 1)
            ->assertJsonPath('totals.hrig', 1)
            ->assertJsonPath('totals.tcv', 1);
    }

    public function test_api_monthly_report_returns_correct_structure(): void
    {
        $response = $this->getJson('/api/reports/monthly?month=2024-07');

        $response->assertOk()
            ->assertJsonPath('report_type', 'monthly')
            ->assertJsonPath('total_cases', 1)
            ->assertJsonPath('completed_cat_3', 1)
            ->assertJsonPath('total_completed', 1)
            ->assertJsonPath('completion_rate', '100%');
    }

    public function test_api_cohort_report_returns_correct_structure(): void
    {
        $response = $this->getJson('/api/reports/cohort?year=2024');

        $response->assertOk()
            ->assertJsonPath('report_type', 'cohort')
            ->assertJsonPath('year', 2024)
            ->assertJsonPath('quarters.q3.cat_III.cases', 1)
            ->assertJsonPath('quarters.q3.cat_III.completed', 1)
            ->assertJsonPath('quarters.q3.cat_III.completion_rate', '100%');
    }

    public function test_print_views_render_html_successfully(): void
    {
        $resRegistry = $this->get('/api/print/reports/exposure-registry?from=2024-07-01&to=2024-07-31');
        $resRegistry->assertOk()
            ->assertSee('Rabies Exposure Registry')
            ->assertSee('TAGOLOAN ABTC')
            ->assertSee('JENNIFER L. ADVINCULA MD');

        $resMonthly = $this->get('/api/print/reports/monthly?month=2024-07');
        $resMonthly->assertOk()
            ->assertSee('National Rabies Prevention and Control Program')
            ->assertSee('ABTC Monthly Report')
            ->assertSee('COMPLETION RATE');

        $resCohort = $this->get('/api/print/reports/cohort?year=2024');
        $resCohort->assertOk()
            ->assertSee('Cohort Report')
            ->assertSee('INDICATORS')
            ->assertSee('COMPLETION RATE');
    }

    public function test_web_routes_render_html(): void
    {
        $resRegistry = $this->get('/print/reports/exposure-registry?clinic_id=' . $this->clinic->id . '&from=2024-07-01&to=2024-07-31');
        $resRegistry->assertOk()->assertSee('Rabies Exposure Registry');

        $resMonthly = $this->get('/print/reports/monthly?clinic_id=' . $this->clinic->id . '&month=2024-07');
        $resMonthly->assertOk()->assertSee('ABTC Monthly Report');

        $resCohort = $this->get('/print/reports/cohort?clinic_id=' . $this->clinic->id . '&year=2024');
        $resCohort->assertOk()->assertSee('Cohort Report');
    }

    public function test_category_filter_works_dynamically(): void
    {
        // When filtering for Cat II, our seeded Cat III incident should not be counted
        $response = $this->getJson('/api/reports/exposure-registry?from=2024-07-01&to=2024-07-31&category=II');
        $response->assertOk()
            ->assertJsonPath('totals.total', 0)
            ->assertJsonPath('totals.cat_3', 0);

        // When filtering for Cat III, it should be counted
        $responseCat3 = $this->getJson('/api/reports/exposure-registry?from=2024-07-01&to=2024-07-31&category=III');
        $responseCat3->assertOk()
            ->assertJsonPath('totals.total', 1)
            ->assertJsonPath('totals.cat_3', 1);
    }

    public function test_reports_use_dynamic_clinic_and_user_data_without_hardcoded_strings(): void
    {
        $customClinic = Clinic::create([
            'name' => 'Custom Community Bite Clinic',
            'municipality' => 'Balingasag',
            'province' => 'Misamis Oriental',
            'population' => 42000,
            'health_officer_name' => 'Dr. Maria Santos MD',
        ]);

        $customStaff = User::factory()->create([
            'clinic_id' => $customClinic->id,
            'role' => 'registration',
            'name' => 'Nurse Juancho Dela Rosa',
            'is_active' => true,
        ]);

        Sanctum::actingAs($customStaff);

        $response = $this->getJson('/api/reports/exposure-registry?from=2024-07-01&to=2024-07-31');
        $response->assertOk()
            ->assertJsonPath('clinic', 'Custom Community Bite Clinic')
            ->assertJsonPath('municipality', 'Balingasag')
            ->assertJsonPath('province', 'Misamis Oriental')
            ->assertJsonPath('totals.human_population', 42000)
            ->assertJsonPath('prepared_by', 'Nurse Juancho Dela Rosa')
            ->assertJsonPath('prepared_designation', 'Registration Staff')
            ->assertJsonPath('noted_by', 'Dr. Maria Santos MD');
    }
}
