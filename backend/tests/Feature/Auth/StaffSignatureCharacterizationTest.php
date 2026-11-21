<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\StaffSignatureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffSignatureCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private User $nurse;
    private User $doctor;
    private string $signaturePath;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('signatures');

        $this->clinic = Clinic::create(['name' => 'Signature Test Clinic']);
        
        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Admin User',
            'email' => 'admin@sigtest.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->nurse = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Nurse Joy',
            'email' => 'joy@sigtest.com',
            'password' => bcrypt('password123'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $this->doctor = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Dr. Smith',
            'email' => 'smith@sigtest.com',
            'password' => bcrypt('password123'),
            'role' => 'triage',
            'is_active' => true,
        ]);

        // Place a valid signature file in storage
        $this->signaturePath = 'signatures/' . Str::uuid() . '.png';
        Storage::disk('signatures')->put($this->signaturePath, 'fake-png-binary-content');
        $this->nurse->update(['signature_path' => $this->signaturePath]);
    }

    public function test_current_returns_signature_path_with_no_store_header(): void
    {
        Sanctum::actingAs($this->nurse);

        $response = $this->getJson('/api/staff-signature');

        $response->assertStatus(200)
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertExactJson([
                'signature_path' => $this->signaturePath,
            ]);
    }

    public function test_current_returns_null_when_signature_not_on_disk(): void
    {
        Sanctum::actingAs($this->doctor);

        $response = $this->getJson('/api/staff-signature');

        $response->assertStatus(200)
            ->assertExactJson([
                'signature_path' => null,
            ]);
    }

    public function test_profile_accessible_by_owner_as_binary_png(): void
    {
        Sanctum::actingAs($this->nurse);

        $response = $this->get('/api/users/' . $this->nurse->id . '/signature');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('Content-Disposition', 'inline; filename="signature.png"');
        
        $this->assertEquals('fake-png-binary-content', $response->getContent());
    }

    public function test_profile_accessible_by_admin(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->get('/api/users/' . $this->nurse->id . '/signature');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_profile_forbidden_for_other_non_admin_staff(): void
    {
        Sanctum::actingAs($this->doctor);

        $response = $this->getJson('/api/users/' . $this->nurse->id . '/signature');

        $response->assertStatus(403);
    }

    public function test_profile_returns_404_for_user_in_different_clinic(): void
    {
        $otherClinic = Clinic::create(['name' => 'Other Clinic']);
        $otherUser = User::create([
            'clinic_id' => $otherClinic->id,
            'name' => 'Other Nurse',
            'email' => 'other@clinic.com',
            'password' => bcrypt('password123'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/users/' . $otherUser->id . '/signature');

        $response->assertStatus(404);
    }

    public function test_profile_with_stale_version_returns_409(): void
    {
        Sanctum::actingAs($this->nurse);

        $response = $this->getJson('/api/users/' . $this->nurse->id . '/signature?version=signatures/old-stale.png');

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'Signature changed. Refresh the preview.',
            ]);
    }

    public function test_record_signature_returns_binary_png(): void
    {
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'PAT-123456',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
        ]);

        $record = TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'treatment_date' => now()->toDateString(),
            'signature' => $this->signaturePath,
            'status' => 'completed',
        ]);

        Sanctum::actingAs($this->nurse);

        $response = $this->get('/api/vaccination-records/' . $record->treatment_id . '/signature');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'image/png');
        
        $this->assertEquals('fake-png-binary-content', $response->getContent());
    }

    public function test_record_signature_returns_404_for_different_clinic(): void
    {
        $otherClinic = Clinic::create(['name' => 'Other Clinic']);
        $patient = Patient::create([
            'clinic_id' => $otherClinic->id,
            'patient_number' => 'PAT-999999',
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'gender' => 'female',
            'date_of_birth' => '1995-01-01',
        ]);

        $record = TreatmentRecord::create([
            'clinic_id' => $otherClinic->id,
            'patient_id' => $patient->patient_id,
            'treatment_date' => now()->toDateString(),
            'signature' => $this->signaturePath,
            'status' => 'completed',
        ]);

        Sanctum::actingAs($this->nurse);

        $response = $this->get('/api/vaccination-records/' . $record->treatment_id . '/signature');

        $response->assertStatus(404);
    }
}
