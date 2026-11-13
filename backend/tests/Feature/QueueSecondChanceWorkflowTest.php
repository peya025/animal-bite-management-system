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
        // Calling does not increment the No Response count
        $this->assertEquals(1, $queue->call_count);
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

    private function createRegistrationStaff(Clinic $clinic): User
    {
        $user = User::create([
            'name' => 'Registration Staff',
            'email' => 'reg.staff@example.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'registration',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => 'registration'], [
            'name' => 'registration',
            'display_name' => 'Registration Staff',
            'default_route' => '/patients',
        ]);

        $user->roles()->attach($role->id, ['assigned_at' => now()]);
        return $user;
    }

    public function test_call_and_bring_back_lifecycle_enforces_3_no_response_maximum(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);
        $patient = $this->createPatient($clinic);

        $queue = $this->createQueueEntry($clinic, $patient, $doctor, [
            'queue_number' => 1,
            'status' => 'waiting',
            'call_count' => 0,
        ]);

        Sanctum::actingAs($doctor);

        // Call 1 — calling does not increment No Response count
        $res1 = $this->postJson("/api/queue/{$queue->queue_id}/call");
        $res1->assertStatus(200);
        $queue->refresh();
        $this->assertEquals('called', $queue->status);
        $this->assertEquals(0, $queue->call_count);

        // Unanswered 1 -> moves to second_chance, count becomes 1
        $resNoResp1 = $this->postJson("/api/queue/{$queue->queue_id}/no-response");
        $resNoResp1->assertStatus(200);
        $queue->refresh();
        $this->assertEquals('second_chance', $queue->status);
        $this->assertEquals(1, $queue->call_count);

        // Bring back -> waiting, count stays 1
        $resBringBack1 = $this->postJson("/api/queue/{$queue->queue_id}/return-to-queue");
        $resBringBack1->assertStatus(200);
        $queue->refresh();
        $this->assertEquals('waiting', $queue->status);
        $this->assertEquals(1, $queue->call_count);

        // Call 2 — calling does not increment count
        $res2 = $this->postJson("/api/queue/{$queue->queue_id}/call");
        $res2->assertStatus(200);
        $queue->refresh();
        $this->assertEquals('called', $queue->status);
        $this->assertEquals(1, $queue->call_count);

        // Unanswered 2 -> moves to second_chance, count becomes 2
        $resNoResp2 = $this->postJson("/api/queue/{$queue->queue_id}/no-response");
        $resNoResp2->assertStatus(200);
        $queue->refresh();
        $this->assertEquals('second_chance', $queue->status);
        $this->assertEquals(2, $queue->call_count);

        // Bring back -> waiting, count stays 2
        $resBringBack2 = $this->postJson("/api/queue/{$queue->queue_id}/return-to-queue");
        $resBringBack2->assertStatus(200);
        $queue->refresh();
        $this->assertEquals('waiting', $queue->status);
        $this->assertEquals(2, $queue->call_count);

        // Call 3 — calling does not increment count
        $res3 = $this->postJson("/api/queue/{$queue->queue_id}/call");
        $res3->assertStatus(200);
        $queue->refresh();
        $this->assertEquals('called', $queue->status);
        $this->assertEquals(2, $queue->call_count);

        // Unanswered 3 -> marks requires_checkin, count becomes 3
        $resNoResp3 = $this->postJson("/api/queue/{$queue->queue_id}/no-response");
        $resNoResp3->assertStatus(200);
        $resNoResp3->assertJson([
            'message' => 'Patient did not respond 3 times. Please return to Registration for check-in.',
            'requires_checkin' => true,
        ]);
        $queue->refresh();
        $this->assertEquals('requires_checkin', $queue->status);
        $this->assertEquals(3, $queue->call_count);

        // Attempting a call after 3 No Responses is blocked with 422
        $res4 = $this->postJson("/api/queue/{$queue->queue_id}/call");
        $res4->assertStatus(422);
        $res4->assertJsonFragment([
            'message' => 'Patient did not respond 3 times. Please return to Registration for check-in.',
        ]);

        // Attempting Bring Back after 3 No Responses is blocked with 422
        $resBringBack3 = $this->postJson("/api/queue/{$queue->queue_id}/return-to-queue");
        $resBringBack3->assertStatus(422);
        $resBringBack3->assertJsonFragment([
            'message' => 'Patient did not respond 3 times. Please return to Registration for check-in.',
        ]);
    }

    public function test_third_unanswered_call_marks_requires_checkin_and_blocks_bring_back(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);
        $patient = $this->createPatient($clinic);

        $queue = $this->createQueueEntry($clinic, $patient, $doctor, [
            'queue_number' => 1,
            'status' => 'called',
            'call_count' => 2, // 2 prior misses, now on 3rd attempt
        ]);

        Sanctum::actingAs($doctor);

        // 3rd miss -> marks requires_checkin and count = 3
        $response = $this->postJson("/api/queue/{$queue->queue_id}/no-response");
        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Patient did not respond 3 times. Please return to Registration for check-in.',
            'requires_checkin' => true,
        ]);

        $queue->refresh();
        $this->assertEquals('requires_checkin', $queue->status);
        $this->assertEquals(3, $queue->call_count);

        // Doctor must not be able to Bring Back after 3 unsuccessful calls
        $bringBackRes = $this->postJson("/api/queue/{$queue->queue_id}/return-to-queue");
        $bringBackRes->assertStatus(422);
        $bringBackRes->assertJsonFragment([
            'message' => 'Patient did not respond 3 times. Please return to Registration for check-in.',
        ]);

        // Doctor recall is also blocked
        $recallRes = $this->postJson("/api/queue/{$queue->queue_id}/recall");
        $recallRes->assertStatus(422);
        $recallRes->assertJsonFragment([
            'message' => 'Patient did not respond 3 times. Please return to Registration for check-in.',
        ]);
    }

    public function test_patient_can_respond_on_third_call_and_proceed_normally(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);
        $patient = $this->createPatient($clinic);

        $queue = $this->createQueueEntry($clinic, $patient, $doctor, [
            'queue_number' => 2,
            'status' => 'waiting',
            'call_count' => 2,
        ]);

        Sanctum::actingAs($doctor);

        // 3rd call — count remains 2
        $callRes = $this->postJson("/api/queue/{$queue->queue_id}/call");
        $callRes->assertStatus(200);
        $queue->refresh();
        $this->assertEquals(2, $queue->call_count);
        $this->assertEquals('called', $queue->status);

        // Patient responds -> doctor serves / starts consultation
        $serveRes = $this->postJson("/api/queue/{$queue->queue_id}/serve");
        $serveRes->assertStatus(200);
        $queue->refresh();
        $this->assertEquals('serving', $queue->status);
    }

    public function test_registration_recheckin_after_3_missed_calls_starts_fresh_0_of_3_attempts(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);
        $staff = $this->createRegistrationStaff($clinic);
        $patient = $this->createPatient($clinic);

        // First queue entry exhausted 3 calls
        $oldQueue = $this->createQueueEntry($clinic, $patient, $doctor, [
            'queue_number' => 3,
            'status' => 'requires_checkin',
            'call_count' => 3,
        ]);

        Sanctum::actingAs($staff);

        // Registration staff searches existing patient and checks in
        $checkInRes = $this->postJson("/api/patients/{$patient->patient_id}/check-in");
        $checkInRes->assertStatus(200);
        $checkInRes->assertJsonStructure([
            'message',
            'queue_number',
            'queue',
        ]);

        // Old queue ticket is preserved with requires_checkin status and call_count = 3
        $oldQueue->refresh();
        $this->assertEquals('requires_checkin', $oldQueue->status);
        $this->assertEquals(3, $oldQueue->call_count);

        // New queue ticket has status waiting, fresh 0 call_count, and new queue number
        $newQueueId = $checkInRes->json('queue.queue_id');
        $newQueue = Queue::find($newQueueId);
        $this->assertNotNull($newQueue);
        $this->assertNotEquals($oldQueue->queue_id, $newQueue->queue_id);
        $this->assertEquals('waiting', $newQueue->status);
        $this->assertEquals(0, $newQueue->call_count);
        $this->assertEquals(4, $newQueue->queue_number);

        // Now Doctor calls the patient with their new ticket (count remains 0)
        Sanctum::actingAs($doctor);
        $callRes = $this->postJson("/api/queue/{$newQueue->queue_id}/call");
        $callRes->assertStatus(200);
        $newQueue->refresh();
        $this->assertEquals('called', $newQueue->status);
        $this->assertEquals(0, $newQueue->call_count);
    }
}
