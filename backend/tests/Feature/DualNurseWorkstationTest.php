<?php

namespace Tests\Feature;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\Role;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Models\VaccineInventory;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DualNurseWorkstationTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan Animal Bite Treatment Center']);
    }

    private function createNurse(Clinic $clinic, string $name, string $roleSlug = 'intake_nurse', bool $withSignature = true): User
    {
        $user = User::create([
            'name' => $name,
            'email' => fake()->unique()->safeEmail(),
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
            'signature_path' => $withSignature ? 'signatures/' . strtolower(str_replace(' ', '_', $name)) . '.png' : null,
            'professional_license_no' => 'RN-' . rand(100000, 999999),
        ]);

        $role = Role::firstOrCreate(['slug' => $roleSlug], [
            'name' => $roleSlug,
            'display_name' => ucwords(str_replace('_', ' ', $roleSlug)),
            'default_route' => $roleSlug === 'intake_nurse' ? '/queue' : '/nurse/patients',
        ]);

        $user->roles()->attach($role->id, [
            'assigned_at' => now(),
        ]);

        return $user;
    }

    private function createPatient(Clinic $clinic): Patient
    {
        return Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PAT-' . rand(1000, 9999),
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'date_of_birth' => '1995-05-15',
            'gender' => 'male',
        ]);
    }

    private function createInventory(Clinic $clinic, string $brand = 'Speeda'): VaccineInventory
    {
        return VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => $brand,
            'batch_number' => 'BATCH-TEST-01',
            'current_quantity' => 100,
            'expiration_date' => now()->addYear()->toDateString(),
            'status' => 'active',
            'open_vial_status' => 'unopened',
        ]);
    }

    private function createApprovedBiteEpisode(Clinic $clinic, Patient $patient, ?int $createdBy = null, string $planType = 'full_pep'): BiteIncident
    {
        $bite = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'episode_number' => 1,
            'episode_type' => 'primary',
            'status' => 'active',
            'bite_date' => now()->toDateString(),
            'exposure_type' => 'bite',
            'animal_type' => 'dog',
            'created_by' => $createdBy ?? 1,
        ]);

        TreatmentPlan::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $bite->bite_id,
            'plan_type' => $planType,
            'status' => 'approved',
            'ordered_dose_days' => [0, 3, 7, 28],
            'decided_by' => $createdBy ?? 1,
            'decided_at' => now(),
        ]);

        return $bite;
    }

    public function test_auth_me_returns_roles_and_license_attributes(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic, 'Maria Santos', 'intake_nurse');

        Sanctum::actingAs($nurse);

        $response = $this->getJson('/api/me');
        $response->assertOk()
            ->assertJsonPath('name', 'Maria Santos')
            ->assertJsonPath('is_nursing', true)
            ->assertJsonPath('roles.0.slug', 'intake_nurse');
    }

    public function test_dose_administration_stamps_server_side_identity_and_signature(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic, 'Maria Santos', 'intake_nurse');
        $patient = $this->createPatient($clinic);
        $this->createInventory($clinic, 'Speeda');
        $bite = $this->createApprovedBiteEpisode($clinic, $patient);

        Sanctum::actingAs($nurse);

        $payload = [
            'patient_id' => $patient->patient_id,
            'bite_id'    => $bite->bite_id,
            'doses' => [
                [
                    'period' => 'day_0',
                    'date' => now()->toDateString(),
                    'route' => 'ID',
                    'vaccine_type' => 'Speeda',
                ]
            ],
        ];

        $response = $this->postJson('/api/vaccination-records', $payload);
        $response->assertCreated();

        $record = TreatmentRecord::first();
        $this->assertNotNull($record);
        $this->assertEquals($nurse->id, $record->administered_by);
        $this->assertEquals($nurse->signature_path, $record->signature_path);
    }

    public function test_dose_administration_rejects_unapproved_bite_episode(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic, 'Maria Santos', 'intake_nurse');
        $patient = $this->createPatient($clinic);
        $this->createInventory($clinic, 'Speeda');

        Sanctum::actingAs($nurse);

        $payload = [
            'patient_id' => $patient->patient_id,
            'doses' => [
                [
                    'period' => 'day_0',
                    'date' => now()->toDateString(),
                    'route' => 'ID',
                    'vaccine_type' => 'Speeda',
                ]
            ],
        ];

        $response = $this->postJson('/api/vaccination-records', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['bite_id']);
    }

    public function test_nurse_without_signature_on_file_can_administer_dose_with_optional_signature(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic, 'New Nurse', 'intake_nurse', withSignature: false);
        $patient = $this->createPatient($clinic);
        $this->createInventory($clinic, 'Speeda');
        $bite = $this->createApprovedBiteEpisode($clinic, $patient);

        Sanctum::actingAs($nurse);

        $payload = [
            'patient_id' => $patient->patient_id,
            'bite_id'    => $bite->bite_id,
            'doses' => [
                [
                    'period' => 'day_0',
                    'date' => now()->toDateString(),
                    'route' => 'ID',
                    'vaccine_type' => 'Speeda',
                ]
            ],
        ];

        $response = $this->postJson('/api/vaccination-records', $payload);
        $response->assertStatus(201);

        $record = TreatmentRecord::where('clinic_id', $clinic->id)
            ->where('patient_id', $patient->patient_id)
            ->where('dose_number', 0)
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals($nurse->id, $record->administered_by);
        $this->assertNull($record->signature);
    }

    public function test_administered_by_is_immutable_on_treatment_records(): void
    {
        $clinic = $this->createClinic();
        $nurse1 = $this->createNurse($clinic, 'Nurse One');
        $nurse2 = $this->createNurse($clinic, 'Nurse Two');
        $patient = $this->createPatient($clinic);

        $record = TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'dose_number' => 0,
            'day_number' => 0,
            'treatment_date' => now()->toDateString(),
            'administered_by' => $nurse1->id,
            'signature_path' => $nurse1->signature_path,
            'status' => 'completed',
        ]);

        $this->expectException(\DomainException::class);
        $record->update(['administered_by' => $nurse2->id]);
    }

    public function test_queue_concurrency_lock_prevents_two_nurses_on_same_patient(): void
    {
        $clinic = $this->createClinic();
        $nurseA = $this->createNurse($clinic, 'Nurse A');
        $nurseB = $this->createNurse($clinic, 'Nurse B');
        $patient = $this->createPatient($clinic);

        $queue = Queue::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'queue_number' => 101,
            'queue_date' => now()->toDateString(),
            'queue_category' => 'regular',
            'visit_type' => 'vaccination',
            'status' => 'waiting',
            'checked_in_by' => $nurseA->id,
            'checked_in_at' => now(),
        ]);

        // Nurse A starts serving
        Sanctum::actingAs($nurseA);
        $resA = $this->postJson("/api/queue/{$queue->queue_id}/serve");
        $resA->assertOk();

        $queue->refresh();
        $this->assertEquals('serving', $queue->status);
        $this->assertEquals($nurseA->id, $queue->served_by);

        // Nurse B tries to serve the same active ticket -> 409 Conflict
        Sanctum::actingAs($nurseB);
        $resB = $this->postJson("/api/queue/{$queue->queue_id}/serve");
        $resB->assertStatus(409)
            ->assertJsonFragment([
                'message' => "Patient is currently being attended by {$nurseA->name}.",
            ]);
    }

    public function test_stale_lock_takeover_allowed_after_thirty_minutes(): void
    {
        $clinic = $this->createClinic();
        $nurseA = $this->createNurse($clinic, 'Nurse A');
        $nurseB = $this->createNurse($clinic, 'Nurse B');
        $patient = $this->createPatient($clinic);

        $queue = Queue::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'queue_number' => 102,
            'queue_date' => now()->toDateString(),
            'queue_category' => 'regular',
            'visit_type' => 'vaccination',
            'status' => 'serving',
            'served_by' => $nurseA->id,
            'serving_started_at' => Carbon::now()->subMinutes(35), // Stale lock > 30 mins
            'checked_in_by' => $nurseA->id,
            'checked_in_at' => Carbon::now()->subMinutes(40),
        ]);

        // Nurse B can take over stale ticket
        Sanctum::actingAs($nurseB);
        $response = $this->postJson("/api/queue/{$queue->queue_id}/serve");
        $response->assertOk();

        $queue->refresh();
        $this->assertEquals($nurseB->id, $queue->served_by);
    }

    public function test_void_record_endpoint_marks_void_and_allows_re_recording(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic, 'Nurse A');
        $patient = $this->createPatient($clinic);
        $this->createInventory($clinic, 'Speeda');
        $bite = $this->createApprovedBiteEpisode($clinic, $patient);

        $record = TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $bite->bite_id,
            'dose_number' => 0,
            'day_number' => 0,
            'treatment_date' => now()->toDateString(),
            'administered_by' => $nurse->id,
            'signature_path' => $nurse->signature_path,
            'status' => 'completed',
        ]);

        Sanctum::actingAs($nurse);

        // Void the record using treatment_id
        $voidRes = $this->postJson("/api/vaccination-records/{$record->treatment_id}/void", [
            'void_reason' => 'Incorrect batch number entered',
        ]);
        $voidRes->assertOk();

        $record->refresh();
        $this->assertNotNull($record->voided_at);
        $this->assertEquals($nurse->id, $record->voided_by);
        $this->assertEquals('Incorrect batch number entered', $record->void_reason);

        // Re-recording dose 0 is now permitted since live dose constraint checks whereNull('voided_at')
        $reRecordRes = $this->postJson('/api/vaccination-records', [
            'patient_id' => $patient->patient_id,
            'bite_id'    => $bite->bite_id,
            'doses' => [
                [
                    'period' => 'day_0',
                    'date' => now()->toDateString(),
                    'route' => 'ID',
                    'vaccine_type' => 'Speeda',
                ]
            ],
        ]);
        $reRecordRes->assertCreated();

        $liveRecords = TreatmentRecord::live()->where('patient_id', $patient->patient_id)->get();
        $this->assertCount(1, $liveRecords);
        $this->assertCount(2, TreatmentRecord::where('patient_id', $patient->patient_id)->get());
    }
}
