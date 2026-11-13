<?php

namespace Tests\Feature\Reports;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Role;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistrationReportControllerCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $registrationStaff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(Carbon::create(2026, 9, 22, 12, 0, 0));

        $this->clinic = Clinic::create(['name' => 'Reports Characterization Clinic']);

        $roleReg = Role::firstOrCreate(['slug' => 'registration_clerk'], [
            'name'          => 'registration_clerk',
            'display_name'  => 'Registration Clerk',
            'default_route' => '/registration',
        ]);

        $this->registrationStaff = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Alice Registration',
            'email'     => 'alice@clinic.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'registration',
            'is_active' => true,
        ]);
        $this->registrationStaff->roles()->attach($roleReg->id, ['assigned_at' => now()]);

        // Seed patient and bite episode
        $patient = Patient::create([
            'clinic_id'      => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name'     => 'Juan',
            'last_name'      => 'Cruz',
            'date_of_birth'  => '2016-09-15',
            'gender'         => 'male',
            'contact_number' => '09123456789',
        ]);

        $case = BiteIncident::create([
            'clinic_id'     => $this->clinic->id,
            'patient_id'    => $patient->patient_id,
            'case_number'   => 'CASE-2026-001',
            'bite_date'     => '2026-09-05',
            'severity'      => 'moderate',
            'animal_type'   => 'dog',
            'animal_status' => 'owned',
            'created_by'    => $this->registrationStaff->id,
            'status'        => 'active',
        ]);

        TreatmentPlan::create([
            'clinic_id'          => $this->clinic->id,
            'patient_id'         => $patient->patient_id,
            'bite_id'            => $case->bite_id,
            'plan_type'          => 'full_pep',
            'status'             => 'approved',
            'ordered_dose_days'  => [0, 3, 7],
            'decided_by'         => $this->registrationStaff->id,
            'decided_at'         => now(),
        ]);

        TreatmentRecord::create([
            'clinic_id'      => $this->clinic->id,
            'patient_id'     => $patient->patient_id,
            'bite_id'        => $case->bite_id,
            'dose_number'    => 0,
            'treatment_date' => '2026-09-05',
            'status'         => 'completed',
            'scheduled_by'   => $this->registrationStaff->id,
        ]);
    }

    public function test_unauthenticated_user_cannot_access_registration_reports(): void
    {
        $this->getJson('/api/reports/registration?from=2026-09-01&to=2026-09-22')
            ->assertStatus(401);
    }

    public function test_user_without_clinic_assignment_is_forbidden(): void
    {
        $this->registrationStaff->update(['clinic_id' => null]);
        Sanctum::actingAs($this->registrationStaff);

        $response = $this->getJson('/api/reports/registration?from=2026-09-01&to=2026-09-22');
        $response->assertStatus(403);
    }

    public function test_index_validates_required_from_and_to_dates(): void
    {
        Sanctum::actingAs($this->registrationStaff);

        // Missing from and to
        $this->getJson('/api/reports/registration')->assertStatus(422);

        // Invalid date format
        $this->getJson('/api/reports/registration?from=invalid&to=2026-09-22')->assertStatus(422);

        // From after to
        $this->getJson('/api/reports/registration?from=2026-09-25&to=2026-09-22')->assertStatus(422);

        // To in the future
        $this->getJson('/api/reports/registration?from=2026-09-01&to=2026-10-01')->assertStatus(422);
    }

    public function test_index_returns_paginated_json_report_by_default(): void
    {
        Sanctum::actingAs($this->registrationStaff);

        $response = $this->getJson('/api/reports/registration?from=2026-09-01&to=2026-09-22&report=summary');

        $response->assertStatus(200)
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonStructure([
                'period' => ['from', 'to', 'category', 'as_of'],
                'stats',
                'meta' => [
                    'title',
                    'clinic',
                    'prepared_by',
                    'generated_at',
                    'basis',
                    'notes',
                ],
                'records' => [
                    'columns',
                    'rows',
                    'total',
                    'page',
                    'last_page',
                ],
            ]);

        $this->assertEquals('Clinic Summary', $response->json('meta.title'));
        $this->assertEquals('Reports Characterization Clinic', $response->json('meta.clinic'));
        $this->assertEquals(1, $response->json('records.page'));
    }

    public function test_index_returns_unpaginated_rows_for_print_format(): void
    {
        Sanctum::actingAs($this->registrationStaff);

        $response = $this->getJson('/api/reports/registration?from=2026-09-01&to=2026-09-22&report=surveillance&format=print');

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('records.total'));
        $this->assertCount($response->json('records.total'), $response->json('records.rows'));
    }

    public function test_index_streams_csv_with_utf8_bom_and_formula_protection(): void
    {
        // Add dangerous spreadsheet formula prefix in a patient's name
        Patient::first()->update(['first_name' => '=CMD("calc")']);

        Sanctum::actingAs($this->registrationStaff);

        $response = $this->get('/api/reports/registration?from=2026-09-01&to=2026-09-22&report=surveillance&format=csv');

        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('Content-Type'), 'text/csv'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));

        $content = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString("'=CMD", $content);
    }
}
