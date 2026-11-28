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

        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => null,
            'medication_given' => 'HRIG',
            'treatment_date' => '2024-07-02',
            'status' => 'completed',
            'administered_by' => $this->staff->id,
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

    public function test_november_2026_weekly_ranges_are_clamped_and_exclude_adjacent_months(): void
    {
        $this->travelTo(now()->setDate(2026, 11, 15)->setTime(10, 0));

        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'date_of_birth' => '2000-01-15',
            'gender' => 'female',
            'contact_number' => '09123456780',
        ]);

        // Adjacent month incidents that previously leaked into Monday-Sunday weeks
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-1031',
            'bite_date' => '2026-10-31',
            'bite_date_is_provisional' => false,
            'severity' => 'severe',
            'animal_type' => 'dog',
            'animal_status' => 'stray',
            'status' => 'active',
            'created_by' => $this->staff->id,
        ]);

        // Boundary days inside November 2026
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-1101',
            'bite_date' => '2026-11-01',
            'bite_date_is_provisional' => false,
            'severity' => 'moderate',
            'animal_type' => 'cat',
            'animal_status' => 'domestic',
            'status' => 'active',
            'created_by' => $this->staff->id,
        ]);

        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-1130',
            'bite_date' => '2026-11-30',
            'bite_date_is_provisional' => false,
            'severity' => 'severe',
            'animal_type' => 'dog',
            'animal_status' => 'stray',
            'status' => 'active',
            'created_by' => $this->staff->id,
        ]);

        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2026-1201',
            'bite_date' => '2026-12-01',
            'bite_date_is_provisional' => false,
            'severity' => 'severe',
            'animal_type' => 'dog',
            'animal_status' => 'stray',
            'status' => 'active',
            'created_by' => $this->staff->id,
        ]);

        $registry = $this->getJson('/api/reports/exposure-registry?from=2026-11-01&to=2026-11-30');
        $registry->assertOk()
            ->assertJsonPath('totals.total', 2)
            ->assertJsonPath('data.0.inclusive_dates', '11/1/2026')
            ->assertJsonPath('data.0.start_date', '2026-11-01')
            ->assertJsonPath('data.0.end_date', '2026-11-01')
            ->assertJsonPath('data.0.total', 1);

        $rows = $registry->json('data');
        $lastRow = end($rows);
        $this->assertSame('11/30/2026', $lastRow['inclusive_dates']);
        $this->assertSame('2026-11-30', $lastRow['start_date']);
        $this->assertSame('2026-11-30', $lastRow['end_date']);
        $this->assertSame(1, $lastRow['total']);

        $monthly = $this->getJson('/api/reports/monthly?month=2026-11');
        $monthly->assertOk()
            ->assertJsonPath('total_cases', 2)
            ->assertJsonPath('rows.0.inclusive_dates', '11/1/2026')
            ->assertJsonPath('totals.cat_2', 1)
            ->assertJsonPath('totals.cat_3', 1)
            ->assertJsonPath('totals.cat_total', 2);
    }

    public function test_provisional_bite_dates_are_excluded_from_exposure_totals_and_disclosed(): void
    {
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name' => 'Pedro',
            'last_name' => 'Santos',
            'date_of_birth' => '1990-02-01',
            'gender' => 'male',
            'contact_number' => '09123456781',
        ]);

        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2024-PROV-1',
            'episode_type' => 'pending_assessment',
            'bite_date' => '2024-07-10',
            'bite_date_is_provisional' => true,
            'severity' => 'unassessed',
            'status' => 'awaiting_assessment',
            'remarks' => 'Episode created during Registration Staff patient registration. Exposure details await Doctor/Nurse assessment.',
            'created_by' => $this->staff->id,
        ]);

        // Legacy unbackfilled placeholder without explicit boolean flag
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2024-PROV-2',
            'episode_type' => 'pending_assessment',
            'bite_date' => '2024-07-12',
            'severity' => 'unassessed',
            'status' => 'awaiting_assessment',
            'remarks' => 'Episode linked during Form 2; exposure details await nurse Form 3 assessment.',
            'created_by' => $this->staff->id,
        ]);

        // Only the verified seeded incident should count in exposure totals (1), while 2 provisional cases are disclosed
        $this->getJson('/api/reports/exposure-registry?from=2024-07-01&to=2024-07-31')
            ->assertOk()
            ->assertJsonPath('totals.total', 1)
            ->assertJsonPath('unknown_exposure_date_count', 2)
            ->assertJsonPath('totals.unknown_exposure_date_count', 2);

        $this->getJson('/api/reports/monthly?month=2024-07')
            ->assertOk()
            ->assertJsonPath('total_cases', 1)
            ->assertJsonPath('unknown_exposure_date_count', 2);

        $this->getJson('/api/reports/cohort?year=2024')
            ->assertOk()
            ->assertJsonPath('quarters.q3.total.cases', 1)
            ->assertJsonPath('quarters.q3.unknown_exposure_date_count', 2)
            ->assertJsonPath('unknown_exposure_date_count', 2);
    }

    public function test_historical_age_is_computed_at_exposure_date_and_unknown_dob_is_not_under_15(): void
    {
        $patientChildAtExposure = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name' => 'Elena',
            'last_name' => 'Cruz',
            'date_of_birth' => '2010-08-01', // 13 yrs on 2024-07-10, 17 yrs in 2027
            'gender' => 'female',
            'contact_number' => '09123456782',
        ]);

        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patientChildAtExposure->patient_id,
            'case_number' => 'BC-2024-AGE-1',
            'bite_date' => '2024-07-10',
            'bite_date_is_provisional' => false,
            'severity' => 'moderate',
            'animal_type' => 'dog',
            'status' => 'active',
            'created_by' => $this->staff->id,
        ]);

        $patientUnknownDob = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name' => 'NoDob',
            'last_name' => 'Patient',
            'date_of_birth' => null,
            'age' => null,
            'gender' => 'male',
            'contact_number' => '09123456783',
        ]);

        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patientUnknownDob->patient_id,
            'case_number' => 'BC-2024-AGE-2',
            'bite_date' => '2024-07-11',
            'bite_date_is_provisional' => false,
            'severity' => 'moderate',
            'animal_type' => 'dog',
            'status' => 'active',
            'created_by' => $this->staff->id,
        ]);

        // Fast-forward 3 years to verify historical age stability
        $this->travelTo(now()->setDate(2027, 9, 1)->setTime(10, 0));

        $this->getJson('/api/reports/exposure-registry?from=2024-07-01&to=2024-07-31')
            ->assertOk()
            ->assertJsonPath('totals.total', 3)
            ->assertJsonPath('totals.age_below_15', 2)
            ->assertJsonPath('totals.age_15_above', 0)
            ->assertJsonPath('totals.age_unknown', 1)
            ->assertJsonPath('totals.age_total', 2);
    }

    public function test_unassessed_category_bridge_unknown_animal_and_unavailable_human_rabies(): void
    {
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name' => 'Marco',
            'last_name' => 'Lim',
            'date_of_birth' => '1998-04-20',
            'gender' => 'male',
            'contact_number' => '09123456784',
        ]);

        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'BC-2024-UNASSESSED',
            'bite_date' => '2024-07-10',
            'bite_date_is_provisional' => false,
            'severity' => 'unassessed',
            'animal_type' => 'unknown',
            'status' => 'active',
            'created_by' => $this->staff->id,
        ]);

        $this->getJson('/api/reports/monthly?month=2024-07')
            ->assertOk()
            ->assertJsonPath('total_cases', 2)
            ->assertJsonPath('cat_1', 0)
            ->assertJsonPath('cat_2', 0)
            ->assertJsonPath('cat_3', 1)
            ->assertJsonPath('totals.cat_total', 1)
            ->assertJsonPath('unassessed_cases', 1)
            ->assertJsonPath('totals.unassessed_cases', 1);

        $this->getJson('/api/reports/exposure-registry?from=2024-07-01&to=2024-07-31')
            ->assertOk()
            ->assertJsonPath('totals.total', 2)
            ->assertJsonPath('totals.cat_total', 1)
            ->assertJsonPath('totals.cat_unassessed', 1)
            ->assertJsonPath('totals.cat_percentage', '50%')
            ->assertJsonPath('totals.dog', 1)
            ->assertJsonPath('totals.others', 0)
            ->assertJsonPath('totals.animal_unknown', 1)
            ->assertJsonPath('totals.no_hr', null)
            ->assertJsonPath('totals.no_hr_status', 'unavailable')
            ->assertJsonPath('totals.no_hr_reason', 'source_not_verified');
    }
}
