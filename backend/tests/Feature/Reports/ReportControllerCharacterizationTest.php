<?php

namespace Tests\Feature\Reports;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Role;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportControllerCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private User $registrationStaff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(Carbon::create(2024, 7, 15, 10, 0, 0));

        $this->clinic = Clinic::create([
            'name'                => 'TAGOLOAN ABTC',
            'municipality'        => 'Tagoloan',
            'province'            => 'Misamis Oriental',
            'population'          => 75000,
            'health_officer_name' => 'JENNIFER L. ADVINCULA MD',
            'status'              => 'active',
        ]);

        $roleAdmin = Role::firstOrCreate(['slug' => 'clinic_admin'], [
            'name'          => 'clinic_admin',
            'display_name'  => 'Clinic Admin',
            'default_route' => '/dashboard',
        ]);

        $roleReg = Role::firstOrCreate(['slug' => 'registration_clerk'], [
            'name'          => 'registration_clerk',
            'display_name'  => 'Registration Clerk',
            'default_route' => '/registration',
        ]);

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Dr. Admin',
            'email'     => 'admin@tagoloan.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        $this->registrationStaff = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Marites Clerk',
            'email'     => 'clerk@tagoloan.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'registration',
            'is_active' => true,
        ]);
        $this->registrationStaff->roles()->attach($roleReg->id, ['assigned_at' => now()]);

        // Seed sample incident and treatment
        $patient = Patient::create([
            'clinic_id'      => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name'     => 'Juan',
            'last_name'      => 'Dela Cruz',
            'date_of_birth'  => '2015-05-10',
            'gender'         => 'male',
            'contact_number' => '09123456789',
        ]);

        $incident = BiteIncident::create([
            'clinic_id'           => $this->clinic->id,
            'patient_id'          => $patient->patient_id,
            'case_number'         => 'BC-2024-0001',
            'bite_date'           => '2024-07-02',
            'severity'            => 'severe',
            'animal_type'         => 'dog',
            'animal_status'       => 'stray',
            'rig_decision_reason' => 'HRIG indicated due to deep bite',
            'status'              => 'completed',
            'created_by'          => $this->admin->id,
        ]);

        TreatmentRecord::create([
            'clinic_id'      => $this->clinic->id,
            'patient_id'     => $patient->patient_id,
            'bite_id'        => $incident->bite_id,
            'dose_number'    => 0,
            'treatment_date' => '2024-07-02',
            'status'         => 'administered',
        ]);
    }

    public function test_unauthenticated_user_cannot_access_reports(): void
    {
        $this->getJson('/api/reports/exposure-registry')->assertStatus(401);
        $this->getJson('/api/reports/monthly')->assertStatus(401);
        $this->getJson('/api/reports/cohort')->assertStatus(401);
    }

    public function test_exposure_registry_returns_json_structure_for_staff(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/reports/exposure-registry?from=2024-07-01&to=2024-07-31');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'report_type',
                'clinic',
                'province',
                'municipality',
                'prepared_by',
                'data',
                'totals' => [
                    'total',
                    'cat_1',
                    'cat_2',
                    'cat_3',
                ],
            ]);

        $this->assertEquals('exposure_registry', $response->json('report_type'));
        $this->assertEquals('TAGOLOAN ABTC', $response->json('clinic'));
        $this->assertEquals(1, $response->json('totals.total'));
        $this->assertEquals(1, $response->json('totals.cat_3'));
    }

    public function test_exposure_registry_filters_by_category(): void
    {
        Sanctum::actingAs($this->admin);

        // When requesting Cat II, the Cat III case should not be included
        $resCat2 = $this->getJson('/api/reports/exposure-registry?from=2024-07-01&to=2024-07-31&category=II');
        $resCat2->assertStatus(200);
        $this->assertEquals(0, $resCat2->json('totals.total'));

        // When requesting Cat III, it is counted
        $resCat3 = $this->getJson('/api/reports/exposure-registry?from=2024-07-01&to=2024-07-31&category=III');
        $resCat3->assertStatus(200);
        $this->assertEquals(1, $resCat3->json('totals.total'));
    }

    public function test_monthly_report_returns_summary_and_aggregates(): void
    {
        Sanctum::actingAs($this->registrationStaff);

        $response = $this->getJson('/api/reports/monthly?month=2024-07');

        $response->assertStatus(200)
            ->assertJsonPath('report_type', 'monthly')
            ->assertJsonPath('total_cases', 1)
            ->assertJsonPath('completed_cat_3', 1)
            ->assertJsonPath('total_completed', 1)
            ->assertJsonPath('completion_rate', '100%');
    }

    public function test_cohort_report_returns_quarterly_breakdown(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/reports/cohort?year=2024');

        $response->assertStatus(200)
            ->assertJsonPath('report_type', 'cohort')
            ->assertJsonPath('year', 2024)
            ->assertJsonPath('quarters.q3.cat_III.cases', 1)
            ->assertJsonPath('quarters.q3.cat_III.completed', 1)
            ->assertJsonPath('quarters.q3.cat_III.completion_rate', '100%');
    }

    public function test_reports_reject_request_without_clinic_assignment(): void
    {
        $unassignedUser = User::create([
            'clinic_id' => null,
            'name'      => 'Homeless Staff',
            'email'     => 'homeless@example.com',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $roleAdmin = Role::where('slug', 'clinic_admin')->first();
        $unassignedUser->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        Sanctum::actingAs($unassignedUser);

        $resRegistry = $this->getJson('/api/reports/exposure-registry');
        $resRegistry->assertStatus(403);

        $resMonthly = $this->getJson('/api/reports/monthly');
        $resMonthly->assertStatus(403);

        $resCohort = $this->getJson('/api/reports/cohort');
        $resCohort->assertStatus(403);
    }
}
