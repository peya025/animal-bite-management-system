<?php

namespace Tests\Feature\Print;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\Role;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrintControllerCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private User $registrationStaff;
    private Patient $patient;

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

        $this->patient = Patient::create([
            'clinic_id'      => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name'     => 'Juan',
            'last_name'      => 'Dela Cruz',
            'date_of_birth'  => '2015-05-10',
            'gender'         => 'male',
            'contact_number' => '09123456789',
        ]);
    }

    public function test_enrolment_renders_html_for_authorized_staff(): void
    {
        TreatmentRecord::create([
            'clinic_id'         => $this->clinic->id,
            'patient_id'        => $this->patient->patient_id,
            'consultation_date' => '2024-07-02',
            'dose_number'       => null,
            'weight'            => 45.5,
            'temperature'       => 36.8,
            'status'            => 'completed',
        ]);

        Sanctum::actingAs($this->registrationStaff);

        $response = $this->get('/api/print/patient/' . $this->patient->patient_id . '/enrolment');

        $response->assertStatus(200);
        $this->assertStringContainsString('text/html', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('JUAN', $response->getContent());
        $this->assertStringContainsString('DELA CRUZ', $response->getContent());
        $this->assertStringContainsString('TAGOLOAN ABTC', $response->getContent());
    }

    public function test_enrolment_rejects_unauthenticated_request(): void
    {
        $response = $this->getJson('/api/print/patient/' . $this->patient->patient_id . '/enrolment');
        $response->assertStatus(401);
    }

    public function test_exposure_registry_print_view_renders_html(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->get('/api/print/reports/exposure-registry?from=2024-07-01&to=2024-07-31');

        $response->assertStatus(200);
        $this->assertStringContainsString('text/html', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('Rabies Exposure Registry', $response->getContent());
        $this->assertStringContainsString('TAGOLOAN ABTC', $response->getContent());
    }

    public function test_monthly_report_print_view_renders_html(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->get('/api/print/reports/monthly?month=2024-07');

        $response->assertStatus(200);
        $this->assertStringContainsString('text/html', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('National Rabies Prevention and Control Program', $response->getContent());
        $this->assertStringContainsString('ABTC Monthly Report', $response->getContent());
    }

    public function test_cohort_report_print_view_renders_html(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->get('/api/print/reports/cohort?year=2024');

        $response->assertStatus(200);
        $this->assertStringContainsString('text/html', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('Cohort Report', $response->getContent());
        $this->assertStringContainsString('COMPLETION RATE', $response->getContent());
    }

    public function test_print_reports_reject_unauthenticated_requests(): void
    {
        $this->get('/print/reports/exposure-registry?from=2024-07-01&to=2024-07-31')->assertStatus(401);
        $this->get('/print/reports/monthly?month=2024-07')->assertStatus(401);
        $this->get('/print/reports/cohort?year=2024')->assertStatus(401);

        $this->getJson('/api/print/reports/exposure-registry?from=2024-07-01&to=2024-07-31')->assertStatus(401);
        $this->getJson('/api/print/reports/monthly?month=2024-07')->assertStatus(401);
        $this->getJson('/api/print/reports/cohort?year=2024')->assertStatus(401);
    }

    public function test_print_reports_reject_unassigned_cross_clinic_and_unauthorized_users(): void
    {
        $otherClinic = Clinic::create([
            'name' => 'OTHER ABTC',
            'municipality' => 'Villanueva',
            'province' => 'Misamis Oriental',
            'status' => 'active',
        ]);

        $unassignedUser = User::create([
            'clinic_id' => null,
            'name'      => 'Unassigned Staff',
            'email'     => 'unassigned@tagoloan.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $inactiveUser = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Inactive Staff',
            'email'     => 'inactive@tagoloan.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => false,
        ]);

        $patientAccount = PatientAccount::create([
            'name'      => 'Patient Account',
            'email'     => 'patient@tagoloan.gov.ph',
            'password'  => bcrypt('password123'),
            'is_active' => true,
        ]);

        // Unassigned user cannot bypass with ?clinic_id=
        Sanctum::actingAs($unassignedUser);
        $this->get('/print/reports/monthly?month=2024-07&clinic_id=' . $this->clinic->id)->assertStatus(403);
        $this->get('/api/print/reports/monthly?month=2024-07&clinic_id=' . $this->clinic->id)->assertStatus(403);

        // Assigned staff cannot query another clinic via ?clinic_id=
        Sanctum::actingAs($this->admin);
        $this->get('/print/reports/exposure-registry?from=2024-07-01&to=2024-07-31&clinic_id=' . $otherClinic->id)->assertStatus(403);
        $this->get('/api/print/reports/exposure-registry?from=2024-07-01&to=2024-07-31&clinic_id=' . $otherClinic->id)->assertStatus(403);

        $token = $this->admin->createToken('cross-clinic')->plainTextToken;
        $this->get('/print/reports/cohort?year=2024&token=' . $token . '&clinic_id=' . $otherClinic->id)->assertStatus(403);

        // Inactive user is rejected
        Sanctum::actingAs($inactiveUser);
        $this->get('/print/reports/monthly?month=2024-07')->assertStatus(403);
        $this->get('/api/print/reports/monthly?month=2024-07')->assertStatus(403);

        // PatientAccount cannot access web print or API print endpoints
        $this->app['auth']->forgetGuards();
        $patientToken = $patientAccount->createToken('patient-mobile')->plainTextToken;
        $this->get('/print/reports/monthly?month=2024-07&token=' . $patientToken)->assertStatus(401);

        Sanctum::actingAs($patientAccount);
        $this->get('/print/reports/monthly?month=2024-07')->assertStatus(401);
        $this->getJson('/api/print/reports/monthly?month=2024-07')->assertStatus(403);
    }

    public function test_print_views_reject_invalid_filters_with_422(): void
    {
        Sanctum::actingAs($this->admin);

        $this->get('/print/reports/exposure-registry?from=2024-07-31&to=2024-07-01')->assertStatus(422);
        $this->getJson('/api/print/reports/exposure-registry?from=2024-07-31&to=2024-07-01')->assertStatus(422);
        $this->get('/print/reports/monthly?month=2024-13')->assertStatus(422);
        $this->getJson('/api/print/reports/monthly?month=2024-13')->assertStatus(422);
        $this->get('/print/reports/cohort?year=2024&category=INVALID')->assertStatus(422);
        $this->getJson('/api/print/reports/cohort?year=2024&category=INVALID')->assertStatus(422);
    }

    public function test_print_views_authenticate_via_query_token(): void
    {
        $token = $this->admin->createToken('print-token')->plainTextToken;

        $resRegistry = $this->get('/print/reports/exposure-registry?from=2024-07-01&to=2024-07-31&token=' . $token);
        $resRegistry->assertStatus(200);
        $this->assertStringContainsString('Rabies Exposure Registry', $resRegistry->getContent());

        $response = $this->get('/print/reports/monthly?month=2024-07&token=' . $token);
        $response->assertStatus(200);
        $this->assertStringContainsString('ABTC Monthly Report', $response->getContent());

        $resCohort = $this->get('/print/reports/cohort?year=2024&token=' . $token);
        $resCohort->assertStatus(200);
        $this->assertStringContainsString('Cohort Report', $resCohort->getContent());
    }
}
