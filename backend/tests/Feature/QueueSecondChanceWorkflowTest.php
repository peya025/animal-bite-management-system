<?php

namespace Tests\Feature;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QueueSecondChanceWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan Animal Bite Treatment Center']);
    }

    private function createDoctor(Clinic $clinic): User
    {
        $user = User::create([
            'name' => 'Dr. Maria Santos',
            'email' => 'dr.santos@example.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'triage',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => 'triage'], [
            'name' => 'triage',
            'display_name' => 'Triage Doctor',
            'default_route' => '/doctor/patients',
        ]);

        $user->roles()->attach($role->id, ['assigned_at' => now()]);
        return $user;
    }

    private function createPatient(Clinic $clinic, array $overrides = []): Patient
    {
        return Patient::create(array_merge([
            'clinic_id' => $clinic->id,
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'date_of_birth' => '1995-05-15',
            'gender' => 'Male',
            'contact_number' => '09123456789',
        ], $overrides));
    }

    private function createQueueEntry(Clinic $clinic, Patient $patient, User $user, array $overrides = []): Queue
    {
        return Queue::create(array_merge([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'queue_number' => 1,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'queue_category' => 'regular',
            'priority' => 'normal',
            'status' => 'waiting',
            'checked_in_at' => now(),
            'checked_in_by' => $user->id,
        ], $overrides));
    }

    public function test_return_to_queue_moves_patient_from_second_chance_to_waiting_and_preserves_data(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);
        $patient = $this->createPatient($clinic);

        $queue = $this->createQueueEntry($clinic, $patient, $doctor, [
            'queue_number' => 5,
            'status' => 'second_chance',
            'second_chance_at' => now()->subMinutes(10),
            'no_response_at' => now()->subMinutes(10),
            'recall_stage' => 'second_chance',
            'call_count' => 1,
            'check_in_notes' => 'Arrived early',
        ]);

        Sanctum::actingAs($doctor);

        $response = $this->postJson("/api/queue/{$queue->queue_id}/return-to-queue");

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Patient returned to the queue.',
        ]);

        $queue->refresh();
        $this->assertEquals('waiting', $queue->status);
        $this->assertEquals(5, $queue->queue_number);
        $this->assertEquals($patient->patient_id, $queue->patient_id);
        $this->assertNull($queue->called_at);
        $this->assertNull($queue->no_response_at);
        $this->assertNull($queue->second_chance_at);
        $this->assertNull($queue->recall_stage);
        $this->assertStringContainsString('Arrived early', $queue->check_in_notes);
        $this->assertStringContainsString('[Brought Back]', $queue->check_in_notes);

        // Verify patient can now be called again
        $callResponse = $this->postJson("/api/queue/{$queue->queue_id}/call");
        $callResponse->assertStatus(200);

        $queue->refresh();
        $this->assertEquals('called', $queue->status);
        $this->assertNotNull($queue->called_at);
    }

    public function test_return_to_queue_rejects_already_waiting_patient(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);
        $patient = $this->createPatient($clinic);

        $queue = $this->createQueueEntry($clinic, $patient, $doctor, [
            'status' => 'waiting',
        ]);

        Sanctum::actingAs($doctor);

        $response = $this->postJson("/api/queue/{$queue->queue_id}/return-to-queue");
        $response->assertStatus(400);
        $response->assertJson([
            'message' => 'Patient must be in second chance queue to return to queue. Current: waiting',
        ]);
    }
}
