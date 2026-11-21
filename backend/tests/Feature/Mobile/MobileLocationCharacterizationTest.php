<?php

namespace Tests\Feature\Mobile;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobileLocationCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private PatientAccount $patientAccount;
    private User $staffUser;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        $this->clinic = Clinic::create([
            'name'         => 'Tagoloan Animal Bite Treatment Center',
            'municipality' => 'Tagoloan',
            'province'     => 'Misamis Oriental',
            'address'      => 'Poblacion, Tagoloan, Misamis Oriental',
        ]);

        $this->patientAccount = PatientAccount::create([
            'name'      => 'Maria Santos',
            'email'     => 'maria@example.com',
            'phone'     => '09171234567',
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

        // Mock PSGC API
        Http::fake([
            'https://psgc.gitlab.io/api/provinces/' => Http::response([
                ['code' => '104300000', 'name' => 'Misamis Oriental'],
                ['code' => '101300000', 'name' => 'Bukidnon'],
            ], 200),
            'https://psgc.gitlab.io/api/provinces/104300000/cities-municipalities/' => Http::response([
                ['code' => '104319000', 'name' => 'Tagoloan'],
                ['code' => '104305000', 'name' => 'Cagayan de Oro City'],
            ], 200),
            'https://psgc.gitlab.io/api/cities-municipalities/104319000/barangays/' => Http::response([
                ['code' => '104319001', 'name' => 'Baluarte'],
                ['code' => '104319002', 'name' => 'Poblacion'],
            ], 200),
        ]);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/mobile/locations/context')->assertStatus(401);
        $this->getJson('/api/mobile/locations/municipalities')->assertStatus(401);
        $this->getJson('/api/mobile/locations/barangays')->assertStatus(401);
    }

    public function test_staff_users_are_forbidden_from_patient_account_routes(): void
    {
        Sanctum::actingAs($this->staffUser);

        $this->getJson('/api/mobile/locations/context')
            ->assertStatus(403)
            ->assertJson([
                'message' => 'Patient account authentication is required.',
            ]);
    }

    public function test_context_without_clinic_or_linked_patient_fails_validation(): void
    {
        Sanctum::actingAs($this->patientAccount);

        $response = $this->getJson('/api/mobile/locations/context');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['clinic_id']);
    }

    public function test_context_resolves_via_explicit_clinic_id(): void
    {
        Sanctum::actingAs($this->patientAccount);

        $response = $this->getJson("/api/mobile/locations/context?clinic_id={$this->clinic->id}");

        $response->assertStatus(200)
            ->assertJson([
                'clinic_id'     => $this->clinic->id,
                'clinic_name'   => 'Tagoloan Animal Bite Treatment Center',
                'province'      => 'Misamis Oriental',
                'province_code' => '104300000',
                'municipality'  => 'Tagoloan',
            ]);
    }

    public function test_context_resolves_via_linked_patient(): void
    {
        $patient = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Juan',
            'last_name'     => 'Santos',
            'date_of_birth' => '2000-01-01',
            'gender'        => 'Male',
        ]);
        $this->patientAccount->patients()->attach($patient->patient_id, ['relationship' => 'self']);

        Sanctum::actingAs($this->patientAccount);

        $response = $this->getJson('/api/mobile/locations/context');

        $response->assertStatus(200)
            ->assertJson([
                'clinic_id'     => $this->clinic->id,
                'clinic_name'   => 'Tagoloan Animal Bite Treatment Center',
                'province'      => 'Misamis Oriental',
                'province_code' => '104300000',
                'municipality'  => 'Tagoloan',
            ]);
    }

    public function test_context_falls_back_to_address_parsing(): void
    {
        $clinicNoCols = Clinic::create([
            'name'         => 'Parsed Clinic',
            'municipality' => '',
            'province'     => '',
            'address'      => 'National Highway, Tagoloan, Misamis Oriental',
        ]);

        Sanctum::actingAs($this->patientAccount);

        $response = $this->getJson("/api/mobile/locations/context?clinic_id={$clinicNoCols->id}");

        $response->assertStatus(200)
            ->assertJson([
                'clinic_id'     => $clinicNoCols->id,
                'clinic_name'   => 'Parsed Clinic',
                'province'      => 'Misamis Oriental',
                'province_code' => '104300000',
                'municipality'  => 'Tagoloan',
            ]);
    }

    public function test_municipalities_returns_psgc_data(): void
    {
        Sanctum::actingAs($this->patientAccount);

        $response = $this->getJson("/api/mobile/locations/municipalities?clinic_id={$this->clinic->id}");

        $response->assertStatus(200)
            ->assertJson([
                'clinic_id'     => $this->clinic->id,
                'province'      => 'Misamis Oriental',
                'province_code' => '104300000',
            ])
            ->assertJsonStructure([
                'data' => [
                    '*' => ['code', 'name'],
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    public function test_barangays_validates_and_returns_psgc_data(): void
    {
        Sanctum::actingAs($this->patientAccount);

        // Missing municipality code
        $this->getJson('/api/mobile/locations/barangays')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['municipality_code']);

        // Valid municipality code
        $response = $this->getJson('/api/mobile/locations/barangays?municipality_code=104319000');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['code', 'name'],
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }
}
