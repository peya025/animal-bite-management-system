<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicResource;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\User;
use Database\Seeders\ClinicResourceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClinicResourceTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private Clinic $otherClinic;
    private User $admin;
    private User $nurse;
    private PatientAccount $patientAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create(['name' => 'Primary Clinic']);
        $this->otherClinic = Clinic::create(['name' => 'Secondary Clinic']);

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Clinic Admin',
            'email' => 'admin@clinic.test',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->nurse = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Clinic Nurse',
            'email' => 'nurse@clinic.test',
            'password' => bcrypt('password123'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'PAT-900001',
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'gender' => 'female',
            'date_of_birth' => '1995-03-10',
        ]);

        $this->patientAccount = PatientAccount::create([
            'name' => 'Maria Santos',
            'email' => 'maria@patient.test',
            'phone' => '09171234567',
            'password' => 'password123',
            'is_active' => true,
        ]);

        $this->patientAccount->patients()->attach($patient->patient_id, [
            'relationship' => 'self',
            'is_primary' => true,
            'status' => 'verified',
        ]);
    }

    public function test_mobile_endpoint_returns_only_active_resources_for_patients_clinic_ordered_by_sort_order(): void
    {
        ClinicResource::create([
            'clinic_id' => $this->clinic->id,
            'type' => 'link',
            'title' => 'Second Active Resource',
            'subtitle' => 'DOH Link',
            'url' => 'https://example.com/doh-guide',
            'sort_order' => 2,
            'is_active' => true,
        ]);

        ClinicResource::create([
            'clinic_id' => $this->clinic->id,
            'type' => 'video',
            'title' => 'First Active Video',
            'subtitle' => 'Orientation',
            'url' => 'https://example.com/video',
            'duration_label' => '3:45',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        ClinicResource::create([
            'clinic_id' => $this->clinic->id,
            'type' => 'link',
            'title' => 'Hidden Resource',
            'url' => 'https://example.com/hidden',
            'sort_order' => 0,
            'is_active' => false,
        ]);

        ClinicResource::create([
            'clinic_id' => $this->otherClinic->id,
            'type' => 'video',
            'title' => 'Other Clinic Resource',
            'url' => 'https://example.com/other',
            'sort_order' => 0,
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->patientAccount);

        $response = $this->getJson('/api/mobile/clinic-resources');

        $response->assertOk()
            ->assertExactJson([
                'data' => [
                    [
                        'id' => 2,
                        'type' => 'video',
                        'title' => 'First Active Video',
                        'subtitle' => 'Orientation',
                        'url' => 'https://example.com/video',
                        'thumbnail_url' => null,
                        'duration_label' => '3:45',
                    ],
                    [
                        'id' => 1,
                        'type' => 'link',
                        'title' => 'Second Active Resource',
                        'subtitle' => 'DOH Link',
                        'url' => 'https://example.com/doh-guide',
                        'thumbnail_url' => null,
                        'duration_label' => null,
                    ],
                ],
            ]);
    }

    public function test_admin_can_create_update_reorder_and_delete_resources_with_audit_logs(): void
    {
        Sanctum::actingAs($this->admin);

        // Create
        $createRes = $this->postJson('/api/setup/clinic-resources', [
            'type' => 'video',
            'title' => 'Orientation Video',
            'subtitle' => 'First visit guide',
            'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'duration_label' => '3:45',
            'sort_order' => 0,
            'is_active' => true,
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.title', 'Orientation Video');

        $resourceId = $createRes->json('data.id');

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'clinic_id' => $this->clinic->id,
            'action' => 'created',
            'model' => 'ClinicResource',
            'model_id' => $resourceId,
        ]);

        // Second item for reorder test
        $secondRes = $this->postJson('/api/setup/clinic-resources', [
            'type' => 'link',
            'title' => 'DOH Advisory',
            'url' => 'https://example.com/doh',
            'sort_order' => 1,
            'is_active' => true,
        ])->assertCreated();
        $secondId = $secondRes->json('data.id');

        // Update
        $this->putJson("/api/setup/clinic-resources/{$resourceId}", [
            'title' => 'Updated Orientation Video',
            'is_active' => false,
        ])->assertOk()
          ->assertJsonPath('data.title', 'Updated Orientation Video')
          ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'clinic_id' => $this->clinic->id,
            'action' => 'updated',
            'model' => 'ClinicResource',
            'model_id' => $resourceId,
        ]);

        // Reorder
        $this->putJson('/api/setup/clinic-resources/reorder', [
            'ordered_ids' => [$secondId, $resourceId],
        ])->assertOk()
          ->assertJsonPath('data.0.id', $secondId)
          ->assertJsonPath('data.1.id', $resourceId);

        // Delete
        $this->deleteJson("/api/setup/clinic-resources/{$resourceId}")
            ->assertOk();

        $this->assertDatabaseMissing('clinic_resources', ['id' => $resourceId]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'clinic_id' => $this->clinic->id,
            'action' => 'deleted',
            'model' => 'ClinicResource',
            'model_id' => $resourceId,
        ]);
    }

    public function test_http_links_and_invalid_duration_are_rejected(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/setup/clinic-resources', [
            'type' => 'link',
            'title' => 'Insecure Link',
            'url' => 'http://example.com/insecure',
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['url']);

        $this->postJson('/api/setup/clinic-resources', [
            'type' => 'video',
            'title' => 'Bad Duration Video',
            'url' => 'https://example.com/video',
            'duration_label' => '3m45s',
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['duration_label']);
    }

    public function test_non_admin_cannot_manage_clinic_resources(): void
    {
        Sanctum::actingAs($this->nurse);

        $this->getJson('/api/setup/clinic-resources')->assertForbidden();
        $this->postJson('/api/setup/clinic-resources', [
            'type' => 'link',
            'title' => 'Test',
            'url' => 'https://example.com',
        ])->assertForbidden();
    }

    public function test_seeder_populates_demo_clinic_only(): void
    {
        $this->seed(ClinicResourceSeeder::class);

        $this->assertSame(2, ClinicResource::where('clinic_id', $this->clinic->id)->count());
        $this->assertSame(0, ClinicResource::where('clinic_id', $this->otherClinic->id)->count());
    }
}
