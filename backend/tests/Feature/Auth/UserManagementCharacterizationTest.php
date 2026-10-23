<?php

namespace Tests\Feature\Auth;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManagementCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private Clinic $otherClinic;
    private User $admin;
    private User $nurse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create(['name' => 'Tagoloan ABTC']);
        $this->otherClinic = Clinic::create(['name' => 'Other ABTC']);

        $this->seedRoles();

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Dr. Admin',
            'email'     => 'admin@tagoloan.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $adminRole = Role::where('slug', 'clinic_admin')->first();
        $this->admin->roles()->attach($adminRole->id, ['assigned_at' => now()]);

        $this->nurse = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Nurse Joy',
            'email'     => 'joy@tagoloan.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);
        $nurseRole = Role::where('slug', 'intake_nurse')->first();
        $this->nurse->roles()->attach($nurseRole->id, ['assigned_at' => now()]);
    }

    private function seedRoles(): void
    {
        $roles = [
            ['slug' => 'clinic_admin', 'name' => 'clinic_admin', 'display_name' => 'Clinic Admin', 'default_route' => '/dashboard'],
            ['slug' => 'receptionist', 'name' => 'receptionist', 'display_name' => 'Receptionist', 'default_route' => '/patients'],
            ['slug' => 'doctor', 'name' => 'doctor', 'display_name' => 'Doctor', 'default_route' => '/doctor/patients'],
            ['slug' => 'intake_nurse', 'name' => 'intake_nurse', 'display_name' => 'Intake Nurse', 'default_route' => '/queue'],
            ['slug' => 'follow_up_nurse', 'name' => 'follow_up_nurse', 'display_name' => 'Follow-up Nurse', 'default_route' => '/nurse/patients'],
        ];

        foreach ($roles as $r) {
            Role::firstOrCreate(['slug' => $r['slug']], [
                'name'          => $r['name'],
                'display_name'  => $r['display_name'],
                'default_route' => $r['default_route'],
            ]);
        }
    }

    public function test_admin_can_list_clinic_users_with_signature_availability(): void
    {
        // Another clinic's user
        User::create([
            'clinic_id' => $this->otherClinic->id,
            'name'      => 'Other Staff',
            'email'     => 'other@otherclinic.com',
            'password'  => bcrypt('password123'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/users');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertIsArray($data);
        $emails = collect($data)->pluck('email')->all();

        $this->assertContains('admin@tagoloan.gov.ph', $emails);
        $this->assertContains('joy@tagoloan.gov.ph', $emails);
        $this->assertNotContains('other@otherclinic.com', $emails);

        $firstUser = $data[0];
        $this->assertArrayHasKey('id', $firstUser);
        $this->assertArrayHasKey('name', $firstUser);
        $this->assertArrayHasKey('email', $firstUser);
        $this->assertArrayHasKey('role', $firstUser);
        $this->assertArrayHasKey('roles', $firstUser);
        $this->assertArrayHasKey('signature_available', $firstUser);
    }

    public function test_non_admin_cannot_access_user_management_endpoints(): void
    {
        Sanctum::actingAs($this->nurse);

        $this->getJson('/api/users')->assertStatus(403);
        $this->postJson('/api/users', ['name' => 'Test'])->assertStatus(403);
        $this->getJson('/api/users/' . $this->admin->id)->assertStatus(403);
        $this->putJson('/api/users/' . $this->admin->id, ['name' => 'Test'])->assertStatus(403);
        $this->deleteJson('/api/users/' . $this->admin->id)->assertStatus(403);
        $this->putJson('/api/users/' . $this->admin->id . '/assigned-module', ['assigned_module' => 'treatment'])->assertStatus(403);
        $this->getJson('/api/patient-accounts')->assertStatus(403);
        $this->putJson('/api/patient-accounts/1/toggle')->assertStatus(403);
    }

    public function test_admin_can_create_user_with_workstation_roles(): void
    {
        Sanctum::actingAs($this->admin);

        $payload = [
            'name'                    => 'Dr. Gregory House',
            'email'                   => 'house@tagoloan.gov.ph',
            'password'                => 'password123',
            'workstation_role'        => 'doctor',
            'phone'                   => '09171234567',
            'professional_license_no' => 'MD-998877',
        ];

        $response = $this->postJson('/api/users', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'User created successfully',
            ])
            ->assertJsonStructure([
                'message',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'phone',
                    'professional_license_no',
                    'roles',
                ],
            ]);

        $user = User::where('email', 'house@tagoloan.gov.ph')->first();
        $this->assertNotNull($user);
        $this->assertEquals($this->clinic->id, $user->clinic_id);
        $this->assertEquals('triage', $user->role); // Legacy mapping: doctor -> triage
        $this->assertTrue($user->hasRole('doctor'));
        $this->assertEquals('09171234567', $user->phone);
        $this->assertEquals('MD-998877', $user->professional_license_no);
    }

    public function test_create_user_validation_rules_reject_invalid_phone_and_duplicate_email(): void
    {
        Sanctum::actingAs($this->admin);

        // Duplicate email
        $response = $this->postJson('/api/users', [
            'name'     => 'Duplicate Person',
            'email'    => 'joy@tagoloan.gov.ph',
            'password' => 'password123',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['email']);

        // Invalid phone regex
        $response = $this->postJson('/api/users', [
            'name'     => 'Invalid Phone',
            'email'    => 'newbie@tagoloan.gov.ph',
            'password' => 'password123',
            'phone'    => '08123456789',
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone'])
            ->assertJsonPath('errors.phone.0', 'Mobile number must start with 09 and contain 11 digits.');

        // Short password
        $response = $this->postJson('/api/users', [
            'name'     => 'Short Password',
            'email'    => 'short@tagoloan.gov.ph',
            'password' => '1234',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_admin_can_view_single_user(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/users/' . $this->nurse->id);

        $response->assertStatus(200)
            ->assertJson([
                'id'    => $this->nurse->id,
                'name'  => 'Nurse Joy',
                'email' => 'joy@tagoloan.gov.ph',
            ])
            ->assertJsonStructure([
                'id',
                'name',
                'email',
                'roles',
            ]);
    }

    public function test_admin_cannot_view_or_modify_user_from_different_clinic(): void
    {
        $otherUser = User::create([
            'clinic_id' => $this->otherClinic->id,
            'name'      => 'Other Staff',
            'email'     => 'foreign@otherclinic.com',
            'password'  => bcrypt('password123'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $this->getJson('/api/users/' . $otherUser->id)->assertStatus(404);
        $this->putJson('/api/users/' . $otherUser->id, ['name' => 'Hacked'])->assertStatus(404);
        $this->deleteJson('/api/users/' . $otherUser->id)->assertStatus(404);
        $this->putJson('/api/users/' . $otherUser->id . '/assigned-module', ['assigned_module' => 'treatment'])->assertStatus(404);
    }

    public function test_admin_can_update_user_and_changing_password_revokes_tokens(): void
    {
        Sanctum::actingAs($this->admin);

        // Issue token to nurse
        $token = $this->nurse->createToken('test-device')->plainTextToken;
        $this->assertCount(1, $this->nurse->tokens);

        $response = $this->putJson('/api/users/' . $this->nurse->id, [
            'name'                    => 'Nurse Joy Updated',
            'password'                => 'newpassword123',
            'workstation_role'        => 'follow_up_nurse',
            'phone'                   => '09189876543',
            'professional_license_no' => 'RN-776655',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'User updated successfully',
                'user'    => [
                    'id'                      => $this->nurse->id,
                    'name'                    => 'Nurse Joy Updated',
                    'phone'                   => '09189876543',
                    'professional_license_no' => 'RN-776655',
                ],
            ]);

        $this->nurse->refresh();
        $this->assertEquals('Nurse Joy Updated', $this->nurse->name);
        $this->assertTrue($this->nurse->hasRole('follow_up_nurse'));
        $this->assertFalse($this->nurse->hasRole('intake_nurse'));

        // Tokens revoked due to password change
        $this->assertCount(0, $this->nurse->tokens);
    }

    public function test_deactivating_user_revokes_tokens(): void
    {
        Sanctum::actingAs($this->admin);

        $this->nurse->createToken('active-token');
        $this->assertCount(1, $this->nurse->tokens);

        $response = $this->putJson('/api/users/' . $this->nurse->id, [
            'is_active' => false,
        ]);

        $response->assertStatus(200);

        $this->nurse->refresh();
        $this->assertFalse($this->nurse->is_active);
        $this->assertCount(0, $this->nurse->tokens);
    }

    public function test_admin_cannot_delete_themselves(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->deleteJson('/api/users/' . $this->admin->id);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'You cannot delete your own account',
            ]);

        $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
    }

    public function test_admin_can_delete_other_user(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->deleteJson('/api/users/' . $this->nurse->id);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'User deleted successfully',
            ]);

        $this->assertDatabaseMissing('users', ['id' => $this->nurse->id]);
    }

    public function test_admin_can_update_assigned_module(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->putJson('/api/users/' . $this->nurse->id . '/assigned-module', [
            'assigned_module' => 'treatment',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Staff module assignment updated successfully',
                'user'    => [
                    'id'              => $this->nurse->id,
                    'assigned_module' => 'treatment',
                ],
            ]);

        $this->nurse->refresh();
        $this->assertEquals('treatment', $this->nurse->assigned_module);

        // Invalid module
        $badResponse = $this->putJson('/api/users/' . $this->nurse->id . '/assigned-module', [
            'assigned_module' => 'invalid_module',
        ]);
        $badResponse->assertStatus(422)->assertJsonValidationErrors(['assigned_module']);
    }

    public function test_admin_can_list_patient_accounts_with_nested_summaries(): void
    {
        Sanctum::actingAs($this->admin);

        // Setup patient account and linked patient
        $account = PatientAccount::create([
            'name'      => 'Juan dela Cruz',
            'email'     => 'juan@example.com',
            'phone'     => '09171112233',
            'password'  => bcrypt('password123'),
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id'         => $this->clinic->id,
            'patient_number'    => 'P-2026-0001',
            'first_name'        => 'Juan',
            'last_name'         => 'dela Cruz',
            'gender'            => 'Male',
            'date_of_birth'     => '1990-01-01',
            'address'           => 'Zone 1, Tagoloan',
            'contact_number'    => '09171112233',
            'registration_date' => now(),
        ]);

        $account->patients()->attach($patient->patient_id, [
            'relationship' => 'self',
            'is_primary'   => true,
            'status'       => 'verified',
        ]);

        $bite = BiteIncident::create([
            'clinic_id'      => $this->clinic->id,
            'patient_id'     => $patient->patient_id,
            'case_number'    => 'CASE-2026-001',
            'bite_date'      => now()->subDays(2),
            'site_washed'    => true,
            'animal_type'    => 'Dog',
            'status'         => 'active',
            'created_by'     => $this->admin->id,
        ]);

        $appointment = Appointment::create([
            'clinic_id'        => $this->clinic->id,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $bite->bite_id,
            'appointment_date' => now()->addDays(3)->toDateString(),
            'scheduled_date'   => now()->addDays(3),
            'appointment_time' => '09:00',
            'appointment_type' => 'vaccination',
            'dose_number'      => 1,
            'status'           => 'scheduled',
        ]);

        $response = $this->getJson('/api/patient-accounts');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertIsArray($data);
        $this->assertCount(1, $data);

        $acctData = $data[0];
        $this->assertEquals($account->id, $acctData['id']);
        $this->assertEquals('Juan dela Cruz', $acctData['name']);
        $this->assertEquals('juan@example.com', $acctData['email']);
        $this->assertTrue($acctData['is_active']);
        $this->assertEquals(1, $acctData['patients_count']);

        $patientSummary = $acctData['patients'][0];
        $this->assertEquals($patient->patient_id, $patientSummary['patient_id']);
        $this->assertEquals('P-2026-0001', $patientSummary['patient_number']);
        $this->assertTrue($patientSummary['has_active_case']);
        $this->assertNotNull($patientSummary['case_summary']);
        $this->assertEquals('CASE-2026-001', $patientSummary['case_summary']['case_number']);
        $this->assertNotNull($patientSummary['next_appointment']);
        $this->assertEquals('Day 1', $patientSummary['next_appointment']['label']);
    }

    public function test_admin_can_toggle_patient_account_active_status(): void
    {
        Sanctum::actingAs($this->admin);

        $account = PatientAccount::create([
            'name'      => 'Maria Santos',
            'email'     => 'maria.santos@example.com',
            'password'  => bcrypt('password123'),
            'is_active' => true,
        ]);

        // Toggle to inactive
        $response1 = $this->putJson('/api/patient-accounts/' . $account->id . '/toggle');
        $response1->assertStatus(200)
            ->assertJson([
                'message' => 'Patient account deactivated',
                'account' => [
                    'id'        => $account->id,
                    'is_active' => false,
                ],
            ]);

        $account->refresh();
        $this->assertFalse($account->is_active);

        // Toggle back to active
        $response2 = $this->putJson('/api/patient-accounts/' . $account->id . '/toggle');
        $response2->assertStatus(200)
            ->assertJson([
                'message' => 'Patient account activated',
                'account' => [
                    'id'        => $account->id,
                    'is_active' => true,
                ],
            ]);

        $account->refresh();
        $this->assertTrue($account->is_active);
    }
}
