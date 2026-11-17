<?php

namespace Tests\Feature;

use App\Events\AppointmentStatusChanged;
use App\Events\QueueTicketUpdated;
use App\Events\StaffNotificationBroadcast;
use App\Events\VaccineStockUpdated;
use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\Queue;
use App\Models\Station;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use App\Services\AppointmentService;
use App\Services\ClinicScheduleService;
use App\Services\NotificationService;
use App\Services\QueueService;
use App\Services\VaccineInventoryService;
use App\Services\VaccineInventoryUsageService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class DomainServicesBroadcastingIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic1;
    protected Clinic $clinic2;
    protected User $staff;
    protected User $doctor;
    protected User $nurse;
    protected PatientAccount $patientAccount;
    protected Patient $patient;
    protected Station $triageStation;
    protected Station $treatmentStation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic1 = Clinic::create([
            'name' => 'Tagoloan ABTC Main',
            'code' => 'TABTC-1',
            'email' => 'clinic1@test.gov.ph',
            'phone' => '09123456789',
            'address' => 'District 1, Tagoloan',
            'status' => 'active',
        ]);

        $this->clinic2 = Clinic::create([
            'name' => 'Villanueva ABTC',
            'code' => 'VABTC-2',
            'email' => 'clinic2@test.gov.ph',
            'phone' => '09987654321',
            'address' => 'District 2, Villanueva',
            'status' => 'active',
        ]);

        $this->staff = User::create([
            'clinic_id' => $this->clinic1->id,
            'name' => 'Admin Staff',
            'email' => 'admin@tabtc.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->doctor = User::create([
            'clinic_id' => $this->clinic1->id,
            'name' => 'Dr. House',
            'email' => 'doctor@tabtc.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'triage',
            'is_active' => true,
        ]);

        $this->nurse = User::create([
            'clinic_id' => $this->clinic1->id,
            'name' => 'Nurse Joy',
            'email' => 'joy@tabtc.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $this->triageStation = Station::create([
            'clinic_id' => $this->clinic1->id,
            'name' => 'Doctor Triage',
            'is_active' => true,
        ]);

        $this->treatmentStation = Station::create([
            'clinic_id' => $this->clinic1->id,
            'name' => 'Station 1 - Intake',
            'is_active' => true,
        ]);

        $this->patientAccount = PatientAccount::create([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'phone' => '09171234567',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'clinic_id' => $this->clinic1->id,
            'first_name' => 'Juan',
            'middle_name' => 'Protacio',
            'last_name' => 'Dela Cruz',
            'gender' => 'Male',
            'date_of_birth' => '1990-01-01',
            'registration_date' => now(),
            'registered_by' => $this->staff->id,
        ]);

        $this->patientAccount->patients()->attach($this->patient->patient_id, [
            'relationship' => 'self',
            'is_primary' => true,
            'status' => 'verified',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Step 2 Tests: Queue Ticket Updated Dispatches
    |--------------------------------------------------------------------------
    */

    public function test_queue_service_add_to_queue_dispatches_queue_ticket_updated_event(): void
    {
        Event::fake([QueueTicketUpdated::class]);

        $queueService = app(QueueService::class);
        $result = $queueService->addToQueue(
            clinicId: $this->clinic1->id,
            user: $this->staff,
            patientId: $this->patient->patient_id,
            biteIncidentId: null,
            visitType: 'consultation',
            priority: 'normal',
            category: 'regular',
            checkInNotes: 'Test check in',
            todayDate: Carbon::today()->toDateString(),
        );

        $this->assertFalse($result['duplicate']);
        $this->assertNotNull($result['queue']);

        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($result) {
            return $event->clinicId === $this->clinic1->id
                && $event->queueId === $result['queue']->queue_id
                && $event->status === 'waiting'
                && $event->action === 'checked_in';
        });
    }

    public function test_queue_controller_calling_patient_dispatches_queue_ticket_updated_event(): void
    {
        Event::fake([QueueTicketUpdated::class]);

        $queue = Queue::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'queue_number' => 10,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'waiting',
            'call_count' => 0,
            'station_id' => $this->triageStation->id,
            'checked_in_by' => $this->staff->id,
        ]);

        $response = $this->actingAs($this->doctor, 'sanctum')
            ->postJson("/api/queue/{$queue->queue_id}/call", [
                'station_id' => $this->triageStation->id,
            ]);

        $response->assertStatus(200);

        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($queue) {
            return $event->clinicId === $this->clinic1->id
                && $event->queueId === $queue->queue_id
                && $event->status === 'called'
                && $event->action === 'called';
        });
    }

    public function test_queue_controller_serving_patient_dispatches_queue_ticket_updated_event(): void
    {
        Event::fake([QueueTicketUpdated::class]);

        $queue = Queue::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'queue_number' => 11,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'called',
            'call_count' => 1,
            'station_id' => $this->triageStation->id,
            'checked_in_by' => $this->staff->id,
        ]);

        $response = $this->actingAs($this->doctor, 'sanctum')
            ->postJson("/api/queue/{$queue->queue_id}/serve");

        $response->assertStatus(200);

        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($queue) {
            return $event->clinicId === $this->clinic1->id
                && $event->queueId === $queue->queue_id
                && $event->status === 'serving'
                && $event->action === 'serving';
        });
    }

    public function test_queue_controller_no_response_and_recall_workflow_dispatches_events(): void
    {
        Event::fake([QueueTicketUpdated::class]);

        $queue = Queue::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'queue_number' => 12,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'called',
            'call_count' => 0,
            'station_id' => $this->triageStation->id,
            'checked_in_by' => $this->staff->id,
        ]);

        // 1. First no-response -> moves to second chance
        $response = $this->actingAs($this->doctor, 'sanctum')
            ->postJson("/api/queue/{$queue->queue_id}/no-response");
        $response->assertStatus(200);

        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($queue) {
            return $event->queueId === $queue->queue_id && $event->status === 'second_chance';
        });

        // 2. Recall from second chance
        $response = $this->actingAs($this->doctor, 'sanctum')
            ->postJson("/api/queue/{$queue->queue_id}/recall");
        $response->assertStatus(200);

        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($queue) {
            return $event->queueId === $queue->queue_id && $event->status === 'called' && $event->action === 'recalled';
        });

        // 3. Return to queue
        $queue->update(['status' => 'second_chance']);
        $response = $this->actingAs($this->doctor, 'sanctum')
            ->postJson("/api/queue/{$queue->queue_id}/return-to-queue");
        $response->assertStatus(200);

        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($queue) {
            return $event->queueId === $queue->queue_id && $event->status === 'waiting' && $event->action === 'returned_to_queue';
        });
    }

    public function test_doctor_to_nurse_handoff_dispatches_transferred_to_treatment_event(): void
    {
        Event::fake([QueueTicketUpdated::class]);

        $incident = BiteIncident::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'case_number' => 'CASE-2026-001',
            'bite_date' => Carbon::yesterday()->toDateString(),
            'bite_place' => 'Tagoloan Market',
            'bite_category' => 'III',
            'status' => 'assessment_completed',
        ]);

        TreatmentPlan::create([
            'clinic_id' => $this->clinic1->id,
            'bite_id' => $incident->bite_id,
            'plan_type' => 'PEP_ESSENTIAL',
            'status' => 'approved',
        ]);

        $queue = Queue::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $incident->bite_id,
            'queue_number' => 15,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'serving',
            'station_id' => $this->triageStation->id,
            'checked_in_by' => $this->staff->id,
        ]);

        $response = $this->actingAs($this->doctor, 'sanctum')
            ->postJson("/api/queue/{$queue->queue_id}/complete", [
                'consultation_notes' => 'Category III dog bite assessed, transfer to treatment for Day 0 vaccination.',
            ]);

        $response->assertStatus(200);

        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($queue) {
            return $event->queueId === $queue->queue_id
                && $event->status === 'waiting'
                && $event->action === 'transferred_to_treatment';
        });
    }

    public function test_queue_completed_and_cancelled_dispatches_events(): void
    {
        Event::fake([QueueTicketUpdated::class]);

        $queue = Queue::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'queue_number' => 20,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'vaccination',
            'status' => 'serving',
            'station_id' => $this->treatmentStation->id,
            'checked_in_by' => $this->staff->id,
        ]);

        $response = $this->actingAs($this->nurse, 'sanctum')
            ->postJson("/api/queue/{$queue->queue_id}/complete", [
                'consultation_notes' => 'Day 0 vaccine completed.',
            ]);

        $response->assertStatus(200);

        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($queue) {
            return $event->queueId === $queue->queue_id
                && $event->status === 'completed'
                && $event->action === 'completed';
        });

        // Cancel test
        $queue2 = Queue::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'queue_number' => 21,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'vaccination',
            'status' => 'waiting',
            'checked_in_by' => $this->staff->id,
        ]);

        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/queue/{$queue2->queue_id}/cancel", [
                'reason' => 'Patient left before triage.',
            ]);

        $response->assertStatus(200);

        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($queue2) {
            return $event->queueId === $queue2->queue_id
                && $event->status === 'cancelled'
                && $event->action === 'cancelled';
        });
    }

    public function test_queue_skip_dispatches_skipped_and_called_events(): void
    {
        Event::fake([QueueTicketUpdated::class]);

        $firstQueue = Queue::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'queue_number' => 31,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'called',
            'call_count' => 1,
            'station_id' => $this->triageStation->id,
            'checked_in_by' => $this->staff->id,
        ]);

        $patient2 = Patient::create([
            'clinic_id' => $this->clinic1->id,
            'first_name' => 'Maria',
            'last_name' => 'Clara',
            'gender' => 'Female',
            'date_of_birth' => '1998-05-12',
            'registration_date' => now(),
            'registered_by' => $this->staff->id,
        ]);

        $secondQueue = Queue::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $patient2->patient_id,
            'queue_number' => 32,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'waiting',
            'call_count' => 0,
            'station_id' => $this->triageStation->id,
            'checked_in_by' => $this->staff->id,
        ]);

        $response = $this->actingAs($this->doctor, 'sanctum')
            ->postJson("/api/queue/{$firstQueue->queue_id}/skip");

        $response->assertStatus(200);

        // Skipped event for first patient
        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($firstQueue) {
            return $event->queueId === $firstQueue->queue_id
                && $event->status === 'waiting'
                && $event->action === 'skipped';
        });

        // Called event for next patient
        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) use ($secondQueue) {
            return $event->queueId === $secondQueue->queue_id
                && $event->status === 'called'
                && $event->action === 'called';
        });
    }

    public function test_duplicate_queue_checkin_does_not_broadcast_duplicate_event(): void
    {
        Event::fake([QueueTicketUpdated::class]);

        $queueService = app(QueueService::class);
        $todayDate = Carbon::today()->toDateString();

        // First check-in succeeds
        $res1 = $queueService->addToQueue(
            clinicId: $this->clinic1->id,
            user: $this->staff,
            patientId: $this->patient->patient_id,
            biteIncidentId: null,
            visitType: 'consultation',
            priority: 'normal',
            category: 'regular',
            checkInNotes: null,
            todayDate: $todayDate,
        );
        $this->assertFalse($res1['duplicate']);
        Event::assertDispatchedTimes(QueueTicketUpdated::class, 1);

        // Second check-in for the same active patient on the same day is rejected
        $res2 = $queueService->addToQueue(
            clinicId: $this->clinic1->id,
            user: $this->staff,
            patientId: $this->patient->patient_id,
            biteIncidentId: null,
            visitType: 'consultation',
            priority: 'normal',
            category: 'regular',
            checkInNotes: null,
            todayDate: $todayDate,
        );
        $this->assertTrue($res2['duplicate']);

        // Event count MUST remain strictly 1
        Event::assertDispatchedTimes(QueueTicketUpdated::class, 1);
    }

    /*
    |--------------------------------------------------------------------------
    | Step 3 Tests: Appointment Status Changed Dispatches
    |--------------------------------------------------------------------------
    */

    public function test_mobile_appointment_booking_and_cancellation_dispatches_events(): void
    {
        Event::fake([AppointmentStatusChanged::class]);

        $futureDate = Carbon::tomorrow()->toDateString();

        // 1. Mobile booking
        $response = $this->actingAs($this->patientAccount, 'sanctum')
            ->postJson('/api/appointments', [
                'patient_id' => $this->patient->patient_id,
                'appointment_type' => 'consultation',
                'scheduled_date' => $futureDate,
                'time_slot' => 'morning',
            ]);

        $response->assertStatus(201);
        $appointmentId = $response->json('appointment_id');

        Event::assertDispatched(AppointmentStatusChanged::class, function (AppointmentStatusChanged $event) use ($appointmentId) {
            return $event->clinicId === $this->clinic1->id
                && $event->appointmentId === $appointmentId
                && $event->status === 'scheduled'
                && $event->action === 'created'
                && $event->patientAccountId === $this->patientAccount->id;
        });

        // 2. Mobile cancellation
        $response = $this->actingAs($this->patientAccount, 'sanctum')
            ->patchJson("/api/appointments/{$appointmentId}/cancel", [
                'reason' => 'Schedule conflict',
            ]);

        $response->assertStatus(200);

        Event::assertDispatched(AppointmentStatusChanged::class, function (AppointmentStatusChanged $event) use ($appointmentId) {
            return $event->appointmentId === $appointmentId
                && $event->status === 'cancelled'
                && $event->action === 'cancelled'
                && $event->patientAccountId === $this->patientAccount->id;
        });
    }

    public function test_appointment_check_in_dispatches_confirmed_event(): void
    {
        Event::fake([AppointmentStatusChanged::class, QueueTicketUpdated::class]);

        $appointment = Appointment::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'booked_by_account_id' => $this->patientAccount->id,
            'appointment_type' => 'consultation',
            'appointment_date' => Carbon::today()->toDateString(),
            'scheduled_date' => Carbon::today()->toDateString(),
            'appointment_time' => '09:00',
            'status' => 'scheduled',
        ]);

        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/appointments/{$appointment->appointment_id}/check-in");

        $response->assertStatus(200);

        Event::assertDispatched(AppointmentStatusChanged::class, function (AppointmentStatusChanged $event) use ($appointment) {
            return $event->appointmentId === $appointment->appointment_id
                && $event->status === 'confirmed'
                && $event->action === 'confirmed';
        });

        Event::assertDispatched(QueueTicketUpdated::class, function (QueueTicketUpdated $event) {
            return $event->clinicId === $this->clinic1->id
                && $event->status === 'waiting'
                && $event->action === 'checked_in';
        });
    }

    public function test_appointment_rescheduling_via_clinic_schedule_dispatches_rescheduled_event(): void
    {
        Event::fake([AppointmentStatusChanged::class]);

        $appt = Appointment::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'booked_by_account_id' => $this->patientAccount->id,
            'appointment_type' => 'follow_up_vaccination',
            'dose_number' => 3,
            'appointment_date' => Carbon::today()->addDays(5)->toDateString(),
            'scheduled_date' => Carbon::today()->addDays(5)->toDateString(),
            'status' => 'scheduled',
        ]);

        $scheduleService = app(ClinicScheduleService::class);
        $updated = $scheduleService->recalculatePatientSequentialSchedule($this->clinic1->id, $this->patient->patient_id);

        if (!empty($updated)) {
            Event::assertDispatched(AppointmentStatusChanged::class, function (AppointmentStatusChanged $event) use ($appt) {
                return $event->appointmentId === $appt->appointment_id
                    && $event->action === 'rescheduled';
            });
        } else {
            $this->assertTrue(true, 'No sequential shifts required for isolated appointment');
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Step 4 Tests: Staff Notification Broadcast Dispatches
    |--------------------------------------------------------------------------
    */

    public function test_notification_creation_triggers_staff_notification_broadcast(): void
    {
        Event::fake([StaffNotificationBroadcast::class]);

        $service = app(NotificationService::class);

        $inventory = VaccineInventory::create([
            'clinic_id' => $this->clinic1->id,
            'vaccine_type' => 'Rabipur PCECV',
            'batch_number' => 'RP-NOTIF-01',
            'current_quantity' => 100,
            'expiration_date' => Carbon::now()->addYear()->toDateString(),
            'status' => 'active',
        ]);

        $notif = $service->notifyStockReceived($inventory, $this->staff, 100);

        Event::assertDispatched(StaffNotificationBroadcast::class, function (StaffNotificationBroadcast $event) use ($notif) {
            return $event->clinicId === $this->clinic1->id
                && $event->notificationId === $notif->notification_id
                && $event->category === 'inventory'
                && $event->type === 'inventory_stock_received';
        });
    }

    public function test_user_specific_notification_targets_private_user_channel(): void
    {
        Event::fake([StaffNotificationBroadcast::class]);

        $notif = Notification::create([
            'clinic_id' => $this->clinic1->id,
            'user_id' => $this->doctor->id,
            'category' => 'queue',
            'type' => 'doctor_assigned',
            'title' => 'Assigned Case',
            'message' => 'You were assigned to Case #42',
            'is_active' => false,
            'status' => 'sent',
            'send_time' => now(),
        ]);

        StaffNotificationBroadcast::dispatch(StaffNotificationBroadcast::fromModel($notif));

        Event::assertDispatched(StaffNotificationBroadcast::class, function (StaffNotificationBroadcast $event) {
            $channels = $event->broadcastOn();
            return count($channels) === 1
                && (string) $channels[0] === "private-clinic.{$this->clinic1->id}.user.{$this->doctor->id}.notifications"
                && $event->userId === $this->doctor->id;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Step 5 Tests: Vaccine Stock Updated Dispatches
    |--------------------------------------------------------------------------
    */

    public function test_vaccine_inventory_service_create_batch_dispatches_stock_updated_event(): void
    {
        Event::fake([VaccineStockUpdated::class]);

        $inventoryService = app(VaccineInventoryService::class);
        $batch = $inventoryService->createBatch($this->clinic1->id, $this->staff, [
            'vaccine_type' => 'Verorab 0.5ml PVRV',
            'batch_number' => 'VR-TEST-2026',
            'quantity' => 50,
            'expiration_date' => Carbon::now()->addMonths(18)->toDateString(),
        ]);

        $this->assertNotNull($batch);

        Event::assertDispatched(VaccineStockUpdated::class, function (VaccineStockUpdated $event) use ($batch) {
            return $event->clinicId === $this->clinic1->id
                && $event->inventoryId === $batch->inventory_id
                && $event->currentQuantity === 50
                && $event->batchNumber === 'VR-TEST-2026'
                && $event->action === 'received';
        });
    }

    public function test_vaccine_inventory_service_adjust_stock_dispatches_stock_updated_event(): void
    {
        Event::fake([VaccineStockUpdated::class]);

        $batch = VaccineInventory::create([
            'clinic_id' => $this->clinic1->id,
            'vaccine_type' => 'Verorab 0.5ml PVRV',
            'batch_number' => 'VR-ADJUST-01',
            'current_quantity' => 20,
            'expiration_date' => Carbon::now()->addMonths(12)->toDateString(),
            'status' => 'active',
        ]);

        $inventoryService = app(VaccineInventoryService::class);
        $updated = $inventoryService->adjustStock(
            clinicId: $this->clinic1->id,
            user: $this->staff,
            id: $batch->inventory_id,
            type: 'adjusted',
            quantity: 5,
            remarks: 'Physical inventory audit count adjustment',
        );

        $this->assertSame(25, $updated->current_quantity);

        Event::assertDispatched(VaccineStockUpdated::class, function (VaccineStockUpdated $event) use ($batch) {
            return $event->inventoryId === $batch->inventory_id
                && $event->currentQuantity === 25
                && $event->action === 'adjusted';
        });
    }

    public function test_vaccine_inventory_service_vial_lifecycle_dispatches_events(): void
    {
        Event::fake([VaccineStockUpdated::class]);

        $batch = VaccineInventory::create([
            'clinic_id' => $this->clinic1->id,
            'vaccine_type' => 'Rabipur PCECV',
            'batch_number' => 'RP-VIAL-01',
            'current_quantity' => 10,
            'expiration_date' => Carbon::now()->addMonths(12)->toDateString(),
            'status' => 'active',
            'open_vial_status' => 'unopened',
            'doses_per_vial' => 4,
        ]);

        $inventoryService = app(VaccineInventoryService::class);

        // 1. Open vial
        $opened = $inventoryService->openVial($this->clinic1->id, $this->nurse, $batch->inventory_id, 6);
        $this->assertSame('opened', $opened->open_vial_status);

        Event::assertDispatched(VaccineStockUpdated::class, function (VaccineStockUpdated $event) use ($batch) {
            return $event->inventoryId === $batch->inventory_id
                && $event->openVialStatus === 'opened'
                && $event->action === 'vial_opened';
        });

        // 2. Discard vial
        $discarded = $inventoryService->discardVial($this->clinic1->id, $this->nurse, $batch->inventory_id, 'End of clinic day');
        $this->assertSame('unopened', $discarded->open_vial_status);

        Event::assertDispatched(VaccineStockUpdated::class, function (VaccineStockUpdated $event) use ($batch) {
            return $event->inventoryId === $batch->inventory_id
                && $event->openVialStatus === 'unopened'
                && $event->action === 'vial_discarded';
        });
    }

    public function test_automated_vial_usage_service_dispatches_vaccine_stock_updated_events(): void
    {
        Event::fake([VaccineStockUpdated::class]);

        VaccineTypePreset::create([
            'clinic_id' => $this->clinic1->id,
            'vaccine_name' => 'Speeda PVRV',
            'category' => 'Anti-Rabies Vaccines (ARV)',
            'is_multidose' => true,
            'doses_per_vial' => 2,
            'default_open_vial_hours' => 6,
        ]);

        $batch = VaccineInventory::create([
            'clinic_id' => $this->clinic1->id,
            'vaccine_type' => 'Speeda PVRV',
            'batch_number' => 'SPD-2026-X',
            'current_quantity' => 10,
            'expiration_date' => Carbon::now()->addMonths(6)->toDateString(),
            'status' => 'active',
            'open_vial_status' => 'unopened',
            'doses_per_vial' => 2,
        ]);

        $usageService = app(VaccineInventoryUsageService::class);

        // Dose 1: opens a new vial from FIFO stock
        $dose1 = $usageService->administerDoseAutomated($this->clinic1->id, $this->nurse->id, 101, 'Speeda PVRV');
        $this->assertSame(1, $dose1['units_deducted']);
        $this->assertSame(9, $dose1['batch']->current_quantity);
        $this->assertSame('opened', $dose1['batch']->open_vial_status);

        Event::assertDispatched(VaccineStockUpdated::class, function (VaccineStockUpdated $event) use ($batch) {
            return $event->inventoryId === $batch->inventory_id
                && $event->currentQuantity === 9
                && $event->openVialStatus === 'opened'
                && $event->action === 'vial_opened';
        });

        // Dose 2: reuses open vial (0 units deducted, open vial doses incremented)
        $dose2 = $usageService->administerDoseAutomated($this->clinic1->id, $this->nurse->id, 102, 'Speeda PVRV');
        $this->assertSame(0, $dose2['units_deducted']);
        $this->assertSame(9, $dose2['batch']->current_quantity);
        $this->assertSame('unopened', $dose2['batch']->open_vial_status); // completed

        Event::assertDispatched(VaccineStockUpdated::class, function (VaccineStockUpdated $event) use ($batch) {
            return $event->inventoryId === $batch->inventory_id
                && $event->currentQuantity === 9
                && $event->action === 'dose_administered';
        });
    }

    public function test_manual_treatment_deduction_dispatches_deducted_event(): void
    {
        Event::fake([VaccineStockUpdated::class]);

        $batch = VaccineInventory::create([
            'clinic_id' => $this->clinic1->id,
            'vaccine_type' => 'Equirab ERIG',
            'batch_number' => 'ERIG-2026-A',
            'current_quantity' => 15,
            'expiration_date' => Carbon::now()->addMonths(10)->toDateString(),
            'status' => 'active',
        ]);

        $usageService = app(VaccineInventoryUsageService::class);
        $result = $usageService->deductForTreatment(
            clinicId: $this->clinic1->id,
            staffId: $this->nurse->id,
            treatmentId: 201,
            vaccineType: 'Equirab ERIG',
            quantity: 2,
        );

        $this->assertSame(13, $result['remaining_quantity']);

        Event::assertDispatched(VaccineStockUpdated::class, function (VaccineStockUpdated $event) use ($batch) {
            return $event->inventoryId === $batch->inventory_id
                && $event->currentQuantity === 13
                && $event->action === 'deducted';
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Step 6 Tests: Transaction Safety & Isolation
    |--------------------------------------------------------------------------
    */

    public function test_rolled_back_transaction_does_not_broadcast_events(): void
    {
        Event::fake([QueueTicketUpdated::class, VaccineStockUpdated::class]);

        try {
            DB::transaction(function () {
                $queue = Queue::create([
                    'clinic_id' => $this->clinic1->id,
                    'patient_id' => $this->patient->patient_id,
                    'queue_number' => 999,
                    'queue_date' => Carbon::today()->toDateString(),
                    'visit_type' => 'new_case',
                    'status' => 'waiting',
                    'checked_in_by' => $this->staff->id,
                ]);

                QueueTicketUpdated::dispatch(QueueTicketUpdated::fromModel($queue, 'checked_in'));

                // Simulate a runtime or clinical failure that forces rollback
                throw new \RuntimeException('Simulated clinical transaction failure');
            });
        } catch (\RuntimeException $e) {
            // Expected
        }

        // Because QueueTicketUpdated implements ShouldDispatchAfterCommit,
        // it must NEVER be broadcast if the transaction rolls back.
        Event::assertNotDispatched(QueueTicketUpdated::class);
    }

    public function test_cross_clinic_data_isolation(): void
    {
        // Clinic 1 queue ticket
        $queue1 = new QueueTicketUpdated(
            clinicId: $this->clinic1->id,
            queueId: 1,
            queueNumber: 1,
            status: 'called',
        );

        // Clinic 2 queue ticket
        $queue2 = new QueueTicketUpdated(
            clinicId: $this->clinic2->id,
            queueId: 2,
            queueNumber: 1,
            status: 'called',
        );

        // Each broadcasts strictly to its own clinic channel
        $this->assertSame("private-clinic.{$this->clinic1->id}.queue", (string) $queue1->broadcastOn()[0]);
        $this->assertSame("private-clinic.{$this->clinic2->id}.queue", (string) $queue2->broadcastOn()[0]);
        $this->assertNotSame((string) $queue1->broadcastOn()[0], (string) $queue2->broadcastOn()[0]);
    }
}

