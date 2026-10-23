<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobilePatientProfileCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private PatientAccount $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create(['name' => 'Tagoloan ABTC']);

        $this->account = PatientAccount::create([
            'name'     => 'Juan dela Cruz',
            'email'    => 'juan@example.com',
            'phone'    => '09171234567',
            'password' => bcrypt('password123'),
        ]);
    }

    public function test_patient_account_can_list_profiles_with_cached_response(): void
    {
        $selfPatient = Patient::create([
            'clinic_id'           => $this->clinic->id,
            'patient_number'      => 'P-2026-0001',
            'first_name'          => 'Juan',
            'last_name'           => 'dela Cruz',
            'gender'              => 'male',
            'registration_source' => 'mobile',
        ]);
        $this->account->patients()->attach($selfPatient->patient_id, [
            'relationship' => 'self',
            'is_primary'   => true,
            'status'       => 'verified',
        ]);

        $childPatient = Patient::create([
            'clinic_id'           => $this->clinic->id,
            'patient_number'      => 'P-2026-0002',
            'first_name'          => 'Junior',
            'last_name'           => 'dela Cruz',
            'gender'              => 'male',
            'registration_source' => 'mobile',
        ]);
        $this->account->patients()->attach($childPatient->patient_id, [
            'relationship' => 'child',
            'is_primary'   => false,
            'status'       => 'pending',
        ]);

        Sanctum::actingAs($this->account);

        $response = $this->getJson('/api/mobile/patients');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertCount(2, $data);
        $this->assertEquals('Juan', $data[0]['first_name']);
        $this->assertEquals('self', $data[0]['pivot']['relationship']);
        $this->assertTrue((bool) $data[0]['pivot']['is_primary']);
        $this->assertEquals('Junior', $data[1]['first_name']);
        $this->assertEquals('child', $data[1]['pivot']['relationship']);

        // Verify cached
        $cacheKey = "mobile:patients:account:{$this->account->id}";
        $this->assertTrue(Cache::has($cacheKey));
    }

    public function test_patient_account_can_create_primary_self_profile_and_dependents(): void
    {
        Sanctum::actingAs($this->account);

        // 1. Create first profile (Self)
        $selfPayload = [
            'clinic_id'               => $this->clinic->id,
            'relationship'            => 'self',
            'first_name'              => 'Juan',
            'last_name'               => 'dela Cruz',
            'gender'                  => 'male',
            'date_of_birth'           => '1990-05-15',
            'contact_number'          => '09171234567',
            'blood_type'              => 'O+',
            'civil_status'            => 'married',
        ];

        $res1 = $this->postJson('/api/mobile/patients', $selfPayload);

        $res1->assertStatus(201)
            ->assertJsonPath('first_name', 'Juan')
            ->assertJsonPath('pivot.relationship', 'self')
            ->assertJsonPath('pivot.is_primary', true)
            ->assertJsonPath('pivot.status', 'pending')
            ->assertJsonPath('details.blood_type', 'O+');

        // 2. Create second profile (Child)
        $childPayload = [
            'clinic_id'      => $this->clinic->id,
            'relationship'   => 'child',
            'first_name'     => 'Pedro',
            'last_name'      => 'dela Cruz',
            'gender'         => 'male',
            'date_of_birth'  => '2015-08-20',
        ];

        $res2 = $this->postJson('/api/mobile/patients', $childPayload);

        $res2->assertStatus(201)
            ->assertJsonPath('first_name', 'Pedro')
            ->assertJsonPath('pivot.relationship', 'child')
            ->assertJsonPath('pivot.is_primary', false);
    }

    public function test_creating_second_self_profile_is_rejected(): void
    {
        Sanctum::actingAs($this->account);

        $payload = [
            'clinic_id'     => $this->clinic->id,
            'relationship'  => 'self',
            'first_name'    => 'Juan',
            'last_name'     => 'dela Cruz',
            'gender'        => 'male',
            'date_of_birth' => '1990-05-15',
        ];

        $this->postJson('/api/mobile/patients', $payload)->assertStatus(201);

        // Attempt second self
        $duplicateResponse = $this->postJson('/api/mobile/patients', $payload);

        $duplicateResponse->assertStatus(422)
            ->assertJsonValidationErrors(['relationship'])
            ->assertJsonPath('errors.relationship.0', 'This account already has a self profile.');
    }

    public function test_store_normalizes_sex_and_emergency_contact_phone_aliases(): void
    {
        Sanctum::actingAs($this->account);

        $payload = [
            'clinic_id'               => $this->clinic->id,
            'relationship'            => 'self',
            'first_name'              => 'Maria',
            'last_name'               => 'Santos',
            'sex'                     => 'female', // Alias for gender
            'date_of_birth'           => '1992-03-10',
            'emergency_contact_name'  => 'Carlos Santos',
            'emergency_contact_phone' => '09189876543', // Alias for emergency_contact_number
        ];

        $response = $this->postJson('/api/mobile/patients', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('gender', 'female')
            ->assertJsonPath('emergency_contact_number', '09189876543');

        $this->assertDatabaseHas('patients', [
            'first_name'               => 'Maria',
            'gender'                   => 'female',
        ]);
    }

    public function test_validation_rejects_invalid_phone_regex_and_future_dob(): void
    {
        Sanctum::actingAs($this->account);

        $payload = [
            'relationship'   => 'self',
            'first_name'     => 'Bad',
            'last_name'      => 'Input',
            'gender'         => 'male',
            'date_of_birth'  => now()->addYear()->toDateString(), // Future
            'contact_number' => '08123456789', // Invalid prefix
        ];

        $response = $this->postJson('/api/mobile/patients', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['date_of_birth', 'contact_number'])
            ->assertJsonPath('errors.contact_number.0', 'Mobile number must start with 09 and contain 11 digits.');
    }

    public function test_patient_account_can_update_profile_and_memberships(): void
    {
        Sanctum::actingAs($this->account);

        $patient = Patient::create([
            'clinic_id'           => $this->clinic->id,
            'first_name'          => 'Juan',
            'last_name'           => 'dela Cruz',
            'gender'              => 'male',
            'registration_source' => 'mobile',
        ]);
        $this->account->patients()->attach($patient->patient_id, [
            'relationship' => 'self',
            'is_primary'   => true,
            'status'       => 'verified',
        ]);

        $updatePayload = [
            'relationship'        => 'self',
            'first_name'          => 'Juan Carlos',
            'last_name'           => 'dela Cruz',
            'gender'              => 'male',
            'blood_type'          => 'B+',
            'civil_status'        => 'married',
            'philhealth_member'   => 'yes',
            'philhealth_status'   => 'member',
            'philhealth_no'       => '12-345678901-2',
            'philhealth_category' => 'Direct Contributor',
        ];

        $response = $this->patchJson('/api/mobile/patients/' . $patient->patient_id, $updatePayload);

        $response->assertStatus(200)
            ->assertJsonPath('first_name', 'Juan Carlos')
            ->assertJsonPath('details.blood_type', 'B+')
            ->assertJsonPath('details.philhealth_no', '12-345678901-2');

        $this->assertDatabaseHas('patients', [
            'patient_id' => $patient->patient_id,
            'first_name' => 'Juan Carlos',
        ]);
        $this->assertDatabaseHas('patient_details', [
            'patient_id'    => $patient->patient_id,
            'blood_type'    => 'B+',
            'philhealth_no' => '12-345678901-2',
        ]);
    }

    public function test_updating_profile_to_self_when_another_self_exists_is_rejected(): void
    {
        Sanctum::actingAs($this->account);

        $selfPatient = Patient::create([
            'clinic_id'           => $this->clinic->id,
            'first_name'          => 'Juan',
            'last_name'           => 'dela Cruz',
            'gender'              => 'male',
            'registration_source' => 'mobile',
        ]);
        $this->account->patients()->attach($selfPatient->patient_id, [
            'relationship' => 'self',
            'is_primary'   => true,
            'status'       => 'verified',
        ]);

        $childPatient = Patient::create([
            'clinic_id'           => $this->clinic->id,
            'first_name'          => 'Pedro',
            'last_name'           => 'dela Cruz',
            'gender'              => 'male',
            'registration_source' => 'mobile',
        ]);
        $this->account->patients()->attach($childPatient->patient_id, [
            'relationship' => 'child',
            'is_primary'   => false,
            'status'       => 'pending',
        ]);

        // Attempt to update child to self
        $response = $this->patchJson('/api/mobile/patients/' . $childPatient->patient_id, [
            'relationship' => 'self',
            'first_name'   => 'Pedro',
            'last_name'    => 'dela Cruz',
            'gender'       => 'male',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['relationship'])
            ->assertJsonPath('errors.relationship.0', 'This account already has a self profile.');
    }

    public function test_patient_account_cannot_update_unlinked_patient(): void
    {
        $otherAccount = PatientAccount::create([
            'name'     => 'Other Account',
            'email'    => 'other@example.com',
            'password' => bcrypt('password123'),
        ]);

        $otherPatient = Patient::create([
            'clinic_id'           => $this->clinic->id,
            'first_name'          => 'Alien',
            'last_name'           => 'Person',
            'gender'              => 'male',
            'registration_source' => 'mobile',
        ]);
        $otherAccount->patients()->attach($otherPatient->patient_id, [
            'relationship' => 'self',
            'status'       => 'verified',
        ]);

        Sanctum::actingAs($this->account);

        $response = $this->patchJson('/api/mobile/patients/' . $otherPatient->patient_id, [
            'first_name'   => 'Hacked',
            'last_name'    => 'Hacked',
            'relationship' => 'self',
            'gender'       => 'male',
        ]);

        $response->assertStatus(404);
    }

    public function test_profile_creation_and_update_invalidates_account_caches(): void
    {
        Sanctum::actingAs($this->account);

        $cacheKey = "mobile:patients:account:{$this->account->id}";
        Cache::put($cacheKey, ['cached_data'], 600);
        $this->assertTrue(Cache::has($cacheKey));

        // Store invalidates cache
        $this->postJson('/api/mobile/patients', [
            'clinic_id'    => $this->clinic->id,
            'relationship' => 'self',
            'first_name'   => 'Juan',
            'last_name'    => 'dela Cruz',
            'gender'       => 'male',
        ])->assertStatus(201);

        $this->assertFalse(Cache::has($cacheKey));

        $patient = $this->account->patients()->first();

        // Repopulate caches
        Cache::put($cacheKey, ['cached_data'], 600);
        Cache::put("mobile:account:me:{$this->account->id}", ['cached_me'], 600);

        // Update invalidates both caches
        $this->patchJson('/api/mobile/patients/' . $patient->patient_id, [
            'relationship' => 'self',
            'first_name'   => 'Juan Updated',
            'last_name'    => 'dela Cruz',
            'gender'       => 'male',
        ])->assertStatus(200);

        $this->assertFalse(Cache::has($cacheKey));
        $this->assertFalse(Cache::has("mobile:account:me:{$this->account->id}"));
    }
}
