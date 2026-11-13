<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QueueDisplayAccessTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan Animal Bite Treatment Center']);
    }

    private function createRegistrationStaff(Clinic $clinic): User
    {
        $user = User::create([
            'name' => 'Reg Staff',
            'email' => 'reg.staff@example.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'registration',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => 'receptionist'], [
            'name' => 'receptionist',
            'display_name' => 'Receptionist / Registration Staff',
            'default_route' => '/patients',
        ]);

        $user->roles()->attach($role->id, ['assigned_at' => now()]);
        return $user;
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
            'default_route' => '/queue',
        ]);

        $user->roles()->attach($role->id, ['assigned_at' => now()]);
        return $user;
    }

    private function createTreatmentNurse(Clinic $clinic): User
    {
        $user = User::create([
            'name' => 'Nurse Joy',
            'email' => 'nurse.joy@example.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'name' => 'intake_nurse',
            'display_name' => 'Intake Nurse',
            'default_route' => '/queue',
        ]);

        $user->roles()->attach($role->id, ['assigned_at' => now()]);
        return $user;
    }

    private function createAdmin(Clinic $clinic): User
    {
        $user = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => 'admin'], [
            'name' => 'admin',
            'display_name' => 'Clinic Administrator',
            'default_route' => '/dashboard',
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

    /**
     * Test 1: Registration Staff CAN access and view queue endpoints used by Queue Display.
     */
    public function test_registration_staff_can_view_queue_display_endpoints(): void
    {
        $clinic = $this->createClinic();
        $staff = $this->createRegistrationStaff($clinic);
        $patient = $this->createPatient($clinic);
        $this->createQueueEntry($clinic, $patient, $staff, ['queue_number' => 1]);

        Sanctum::actingAs($staff);

        // GET /api/queue (used by QueueDisplayPage to render and refresh queue)
        $response = $this->getJson('/api/queue');
        $response->assertStatus(200);
        $response->assertJsonStructure(['queue']);
        $this->assertCount(1, $response->json('queue'));

        // GET /api/queue/waiting
        $waitingResponse = $this->getJson('/api/queue/waiting');
        $waitingResponse->assertStatus(200);

        // GET /api/queue/statistics
        $statsResponse = $this->getJson('/api/queue/statistics');
        $statsResponse->assertStatus(200);
    }

    /**
     * Test 2: Registration Staff is strictly PROTECTED from restricted actions:
     * calling, serving, completing, skipping patients returns 403 Unauthorized.
     */
    public function test_registration_staff_cannot_perform_clinical_queue_actions(): void
    {
        $clinic = $this->createClinic();
        $staff = $this->createRegistrationStaff($clinic);
        $patient = $this->createPatient($clinic);
        $queue = $this->createQueueEntry($clinic, $patient, $staff, ['queue_number' => 2]);

        Sanctum::actingAs($staff);

        // Attempt to call specific patient (which previously caused the Access Denied modal in QueueDisplayPage)
        $callResponse = $this->postJson("/api/queue/{$queue->queue_id}/call");
        $callResponse->assertStatus(403);
        $callResponse->assertJson([
            'message' => 'Unauthorized. This action requires admin or triage or treatment role.',
        ]);

        // Attempt to call next patient
        $callNextResponse = $this->postJson('/api/queue/call-next');
        $callNextResponse->assertStatus(403);

        // Attempt to serve patient
        $serveResponse = $this->postJson("/api/queue/{$queue->queue_id}/serve");
        $serveResponse->assertStatus(403);

        // Attempt to complete patient
        $completeResponse = $this->postJson("/api/queue/{$queue->queue_id}/complete");
        $completeResponse->assertStatus(403);

        // Attempt to skip patient
        $skipResponse = $this->postJson("/api/queue/{$queue->queue_id}/skip");
        $skipResponse->assertStatus(403);
    }

    /**
     * Test 3: Triage Doctor CAN view queue and call patients.
     */
    public function test_doctor_can_view_and_call_patients(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);
        $patient = $this->createPatient($clinic);
        $queue = $this->createQueueEntry($clinic, $patient, $doctor, ['queue_number' => 3]);

        Sanctum::actingAs($doctor);

        $viewResponse = $this->getJson('/api/queue');
        $viewResponse->assertStatus(200);

        $callResponse = $this->postJson("/api/queue/{$queue->queue_id}/call");
        $callResponse->assertStatus(200);
        $this->assertEquals('called', $queue->fresh()->status);
    }

    /**
     * Test 4: Treatment Nurse CAN view queue and call patients.
     */
    public function test_treatment_nurse_can_view_and_call_patients(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createTreatmentNurse($clinic);
        $patient = $this->createPatient($clinic);
        $queue = $this->createQueueEntry($clinic, $patient, $nurse, [
            'queue_number' => 4,
            'visit_type' => 'vaccination',
        ]);

        Sanctum::actingAs($nurse);

        $viewResponse = $this->getJson('/api/queue');
        $viewResponse->assertStatus(200);

        $callResponse = $this->postJson("/api/queue/{$queue->queue_id}/call");
        $callResponse->assertStatus(200);
        $this->assertEquals('called', $queue->fresh()->status);
    }

    /**
     * Test 5: Admin CAN view queue and call patients.
     */
    public function test_admin_can_view_and_call_patients(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);
        $patient = $this->createPatient($clinic);
        $queue = $this->createQueueEntry($clinic, $patient, $admin, ['queue_number' => 5]);

        Sanctum::actingAs($admin);

        $viewResponse = $this->getJson('/api/queue');
        $viewResponse->assertStatus(200);

        $callResponse = $this->postJson("/api/queue/{$queue->queue_id}/call");
        $callResponse->assertStatus(200);
        $this->assertEquals('called', $queue->fresh()->status);
    }
}

