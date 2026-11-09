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

    public function test_clinic_faqs_can_be_added_modified_and_cleared(): void
    {
        Sanctum::actingAs($this->admin);
        $faqs = [['category' => 'Visits', 'question' => 'What should I bring?', 'answer' => 'Bring your appointment card.']];
        $this->postJson('/api/setup/clinic', ['name' => $this->clinic->name, 'faqs' => json_encode($faqs)])
            ->assertOk()->assertJsonPath('clinic.faqs', $faqs);
        $this->getJson('/api/setup/clinic')->assertOk()->assertJsonPath('faqs', $faqs);
        $faqs[0]['answer'] = 'Bring your card and ID.';
        $this->postJson('/api/setup/clinic', ['name' => $this->clinic->name, 'faqs' => $faqs])->assertOk();
        $this->assertSame($faqs, $this->clinic->fresh()->faqs);
        $this->postJson('/api/setup/clinic', ['name' => $this->clinic->name])->assertOk();
        $this->assertSame($faqs, $this->clinic->fresh()->faqs);
        $this->postJson('/api/setup/clinic', ['name' => $this->clinic->name, 'faqs' => '[]'])->assertOk();
        $this->assertSame([], $this->clinic->fresh()->faqs);
    }

    public function test_faqs_require_questions_and_answers_and_admin_access(): void
    {
        Sanctum::actingAs($this->admin);
        foreach (['invalid json', [['question' => '', 'answer' => '']]] as $faqs) {
            $this->postJson('/api/setup/clinic', ['name' => $this->clinic->name, 'faqs' => $faqs])->assertUnprocessable();
        }
        Sanctum::actingAs($this->nurse);
        $this->postJson('/api/setup/clinic', ['name' => $this->clinic->name, 'faqs' => []])->assertForbidden();
    }

    public function test_patient_faqs_use_linked_clinic_and_preserve_explicit_empty_list(): void
    {
        $this->clinic->update(['faqs' => []]);
        Sanctum::actingAs($this->patientAccount);
        $this->getJson('/api/mobile/clinic-faqs?clinic_id='.$this->otherClinic->id)
            ->assertOk()->assertExactJson(['data' => []]);
        $faqs = [['category' => '', 'question' => 'Where?', 'answer' => 'At the clinic.']];
        $this->clinic->update(['faqs' => $faqs]);
        $this->getJson('/api/mobile/clinic-faqs')->assertOk()->assertExactJson(['data' => $faqs]);
    }

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

        foreach (['javascript:alert(1)', 'data:text/html,<h1>x</h1>', 'ftp://example.com/file'] as $unsafeUrl) {
            $this->postJson('/api/setup/clinic-resources', [
                'type' => 'link',
                'title' => 'Unsafe Scheme Link',
                'url' => $unsafeUrl,
            ])->assertStatus(422)
              ->assertJsonValidationErrors(['url']);
        }
    }

    public function test_admin_cannot_modify_or_delete_resources_belonging_to_another_clinic(): void
    {
        $otherResource = ClinicResource::create([
            'clinic_id' => $this->otherClinic->id,
            'type' => 'link',
            'title' => 'Other Clinic Resource',
            'url' => 'https://doh.gov.ph/rabies',
            'sort_order' => 0,
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $this->putJson("/api/setup/clinic-resources/{$otherResource->id}", [
            'title' => 'Hijacked Title',
        ])->assertNotFound();

        $this->deleteJson("/api/setup/clinic-resources/{$otherResource->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('clinic_resources', [
            'id' => $otherResource->id,
            'title' => 'Other Clinic Resource',
        ]);
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
