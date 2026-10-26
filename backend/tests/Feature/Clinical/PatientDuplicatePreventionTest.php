<?php

namespace Tests\Feature\Clinical;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TreatmentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientDuplicatePreventionTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $registrationStaff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create([
            'name'           => 'Tagoloan ABTC',
            'address'        => 'Poblacion, Tagoloan',
            'contact_number' => '09171234567',
            'is_active'      => true,
        ]);

        $this->registrationStaff = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Reg Clerk Ana',
            'email'     => 'reg.ana@tagoloan-abtc.local',
            'password'  => bcrypt('password123'),
            'role'      => 'registration',
            'is_active' => true,
        ]);
    }

    public function test_check_duplicates_returns_high_tier_when_dob_is_not_yet_entered(): void
    {
        $existing = Patient::create([
            'clinic_id'           => $this->clinic->id,
            'first_name'          => 'Juan',
            'middle_name'         => 'Santos',
            'last_name'           => 'Dela Cruz',
            'gender'              => 'male',
            'date_of_birth'       => '1990-05-15',
            'registered_by'       => $this->registrationStaff->id,
            'registration_source' => 'staff',
        ]);

        $existing->details()->create([
            'address_barangay'     => 'Poblacion',
            'address_municipality' => 'Tagoloan',
            'mother_maiden_name'   => 'Maria Santos',
        ]);

        // Complete primary series (Days 0, 3, 7) to verify PEP badge flag
        foreach ([0, 3, 7] as $dose) {
            TreatmentRecord::create([
                'clinic_id'      => $this->clinic->id,
                'patient_id'     => $existing->patient_id,
                'dose_number'    => $dose,
                'status'         => 'completed',
                'treatment_date' => '2025-08-01',
            ]);
        }

        $response = $this->actingAs($this->registrationStaff)
            ->getJson('/api/patients/check-duplicates?first_name=juan&last_name=Dela+Cruz');

        $response->assertStatus(200)
            ->assertJson([
                'has_exact_match' => false,
                'has_matches'     => true,
            ])
            ->assertJsonPath('matches.0.patient_id', $existing->patient_id)
            ->assertJsonPath('matches.0.match_tier', 'high')
            ->assertJsonPath('matches.0.address_barangay', 'Poblacion')
            ->assertJsonPath('matches.0.mother_maiden_name', 'Maria Santos')
            ->assertJsonPath('matches.0.has_completed_primary', true);
    }

    public function test_check_duplicates_returns_exact_tier_when_name_and_dob_match(): void
    {
        $existing = Patient::create([
            'clinic_id'           => $this->clinic->id,
            'first_name'          => 'Juan',
            'middle_name'         => 'Santos',
            'last_name'           => 'Dela Cruz',
            'gender'              => 'male',
            'date_of_birth'       => '1990-05-15',
            'registered_by'       => $this->registrationStaff->id,
            'registration_source' => 'mobile',
        ]);

        $response = $this->actingAs($this->registrationStaff)
            ->getJson('/api/patients/check-duplicates?first_name=Juan&last_name=Dela+Cruz&date_of_birth=1990-05-15');

        $response->assertStatus(200)
            ->assertJson([
                'has_exact_match' => true,
                'has_matches'     => true,
            ])
            ->assertJsonPath('matches.0.patient_id', $existing->patient_id)
            ->assertJsonPath('matches.0.match_tier', 'exact')
            ->assertJsonPath('matches.0.has_mobile_account', true);
    }

    public function test_check_duplicates_returns_homonym_tier_when_dob_differs_or_suffix_conflicts(): void
    {
        Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Juan',
            'last_name'     => 'Dela Cruz',
            'suffix'        => 'Sr.',
            'gender'        => 'male',
            'date_of_birth' => '1970-05-15',
            'registered_by' => $this->registrationStaff->id,
        ]);

        // Different DOB -> homonym
        $resDifferentDob = $this->actingAs($this->registrationStaff)
            ->getJson('/api/patients/check-duplicates?first_name=Juan&last_name=Dela+Cruz&date_of_birth=1998-03-03');

        $resDifferentDob->assertStatus(200)
            ->assertJson([
                'has_exact_match' => false,
                'has_matches'     => true,
            ])
            ->assertJsonPath('matches.0.match_tier', 'homonym');

        // Conflicting suffix (Sr. vs Jr.) even without DOB -> homonym
        $resSuffix = $this->actingAs($this->registrationStaff)
            ->getJson('/api/patients/check-duplicates?first_name=Juan&last_name=Dela+Cruz&suffix=Jr.');

        $resSuffix->assertStatus(200)
            ->assertJson([
                'has_exact_match' => false,
                'has_matches'     => true,
            ])
            ->assertJsonPath('matches.0.match_tier', 'homonym');
    }

    public function test_check_duplicates_detects_compound_first_names(): void
    {
        $existing = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Mary Jane',
            'last_name'     => 'Reyes',
            'gender'        => 'female',
            'date_of_birth' => '1995-10-10',
            'registered_by' => $this->registrationStaff->id,
        ]);

        $response = $this->actingAs($this->registrationStaff)
            ->getJson('/api/patients/check-duplicates?first_name=Mary&last_name=Reyes');

        $response->assertStatus(200)
            ->assertJsonPath('has_matches', true)
            ->assertJsonPath('matches.0.patient_id', $existing->patient_id);
    }

    public function test_store_patient_blocks_unconfirmed_exact_duplicate_with_409_conflict(): void
    {
        $existing = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Juan',
            'middle_name'   => 'Santos',
            'last_name'     => 'Dela Cruz',
            'gender'        => 'male',
            'date_of_birth' => '1990-05-15',
            'registered_by' => $this->registrationStaff->id,
        ]);

        $response = $this->actingAs($this->registrationStaff)
            ->postJson('/api/patients', [
                'first_name'               => 'Juan',
                'last_name'                => 'Dela Cruz',
                'gender'                   => 'male',
                'date_of_birth'            => '1990-05-15',
                'contact_number'           => '09171112222',
                'emergency_contact_name'   => 'Maria Dela Cruz',
                'emergency_contact_number' => '09173334444',
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('code', 'duplicate_patient_detected')
            ->assertJsonPath('duplicates.0.patient_id', $existing->patient_id);

        $this->assertSame(1, Patient::where('clinic_id', $this->clinic->id)->count());
    }

    public function test_store_patient_allows_verified_override_with_force_create_and_writes_audit_log(): void
    {
        $existing = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Juan',
            'middle_name'   => 'Santos',
            'last_name'     => 'Dela Cruz',
            'gender'        => 'male',
            'date_of_birth' => '1990-05-15',
            'registered_by' => $this->registrationStaff->id,
        ]);

        $response = $this->actingAs($this->registrationStaff)
            ->postJson('/api/patients', [
                'first_name'               => 'Juan',
                'middle_name'              => 'Gomez',
                'last_name'                => 'Dela Cruz',
                'gender'                   => 'male',
                'date_of_birth'            => '1990-05-15',
                'contact_number'           => '09171112222',
                'emergency_contact_name'   => 'Elena Gomez',
                'emergency_contact_number' => '09173334444',
                'force_create'             => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Patient registered successfully');

        $this->assertSame(2, Patient::where('clinic_id', $this->clinic->id)->count());

        $audit = AuditLog::where('action', 'create_homonym_override')
            ->where('model', 'Patient')
            ->first();

        $this->assertNotNull($audit);
        $this->assertStringContainsString($existing->patient_number, $audit->description);
    }

    public function test_main_flow_allows_same_name_homonym_with_different_dob_without_blocking(): void
    {
        Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Juan',
            'last_name'     => 'Dela Cruz',
            'gender'        => 'male',
            'date_of_birth' => '1990-05-15',
            'registered_by' => $this->registrationStaff->id,
        ]);

        // Genuinely different person with the same name "Juan Dela Cruz" but born 1998-03-03
        // Should succeed with 201 Created on the first click without requiring force_create!
        $response = $this->actingAs($this->registrationStaff)
            ->postJson('/api/patients', [
                'first_name'               => 'Juan',
                'middle_name'              => 'Reyes',
                'last_name'                => 'Dela Cruz',
                'gender'                   => 'male',
                'date_of_birth'            => '1998-03-03',
                'contact_number'           => '09181234567',
                'emergency_contact_name'   => 'Pedro Dela Cruz',
                'emergency_contact_number' => '09187654321',
                'reg_blood_pressure'       => '120/80',
                'reg_temperature'          => '36.6',
                'reg_weight'               => '65',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Patient registered successfully')
            ->assertJsonPath('patient.first_name', 'Juan')
            ->assertJsonPath('patient.last_name', 'Dela Cruz');

        $newPatientId = $response->json('patient.patient_id');
        $this->assertDatabaseHas('bite_incidents', [
            'patient_id' => $newPatientId,
            'status'     => 'awaiting_assessment',
        ]);
        $this->assertDatabaseHas('treatment_records', [
            'patient_id'     => $newPatientId,
            'blood_pressure' => '120/80',
        ]);
    }
}
