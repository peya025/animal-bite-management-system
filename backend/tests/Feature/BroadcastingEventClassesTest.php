<?php

namespace Tests\Feature;

use App\Events\AppointmentStatusChanged;
use App\Events\QueueTicketUpdated;
use App\Events\StaffNotificationBroadcast;
use App\Events\VaccineStockUpdated;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\Queue;
use App\Models\Station;
use App\Models\User;
use App\Models\VaccineInventory;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use InvalidArgumentException;
use Tests\TestCase;

class BroadcastingEventClassesTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic1;
    protected Clinic $clinic2;
    protected User $staff;
    protected PatientAccount $patientAccount;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic1 = Clinic::create([
            'name' => 'City Health ABTC',
            'code' => 'CH-01',
            'email' => 'abtc1@cityhealth.gov.ph',
            'phone' => '09123456789',
            'address' => 'District 1, Metro City',
            'status' => 'active',
        ]);

        $this->clinic2 = Clinic::create([
            'name' => 'Provincial ABTC',
            'code' => 'PROV-02',
            'email' => 'abtc2@province.gov.ph',
            'phone' => '09987654321',
            'address' => 'District 2, Provincial Hospital',
            'status' => 'active',
        ]);

        $this->staff = User::create([
            'clinic_id' => $this->clinic1->id,
            'name' => 'Nurse Joy',
            'email' => 'joy@abtc.gov.ph',
            'password' => bcrypt('password'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $this->patientAccount = PatientAccount::create([
            'name' => 'Maria Santos',
            'email' => 'maria@example.com',
            'phone' => '09181234567',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'clinic_id' => $this->clinic1->id,
            'first_name' => 'Maria',
            'middle_name' => 'Cruz',
            'last_name' => 'Santos',
            'gender' => 'Female',
            'date_of_birth' => '1995-05-15',
            'registration_date' => now(),
            'registered_by' => $this->staff->id,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | QueueTicketUpdated Tests
    |--------------------------------------------------------------------------
    */

    public function test_queue_ticket_updated_implements_required_interfaces(): void
    {
        $event = new QueueTicketUpdated(
            clinicId: $this->clinic1->id,
            queueId: 101,
            queueNumber: 7,
            status: 'called',
            action: 'called',
            stationId: 1,
            stationName: 'Station 1 - Intake',
            callCount: 1,
            lane: 'station1',
        );

        $this->assertInstanceOf(ShouldBroadcastNow::class, $event, 'Queue calling requires immediate synchronous broadcast');
        $this->assertInstanceOf(ShouldDispatchAfterCommit::class, $event, 'Must dispatch only after DB transaction commits');
    }

    public function test_queue_ticket_updated_broadcasts_on_private_clinic_queue_channel(): void
    {
        $event = new QueueTicketUpdated(
            clinicId: $this->clinic1->id,
            queueId: 101,
            queueNumber: 7,
            status: 'called',
        );

        $channels = $event->broadcastOn();

        $this->assertCount(1, $channels);
        $this->assertInstanceOf(PrivateChannel::class, $channels[0]);
        $this->assertSame("private-clinic.{$this->clinic1->id}.queue", (string) $channels[0]);
        $this->assertSame("private-clinic.{$this->clinic1->id}.queue", $channels[0]->name);
        $this->assertFalse(get_class($channels[0]) === Channel::class, 'Must not be a public channel');
    }

    public function test_queue_ticket_updated_broadcast_as_name(): void
    {
        $event = new QueueTicketUpdated(
            clinicId: $this->clinic1->id,
            queueId: 101,
            queueNumber: 7,
            status: 'called',
        );

        $this->assertSame('queue.updated', $event->broadcastAs());
    }

    public function test_queue_ticket_updated_payload_is_privacy_safe_and_excludes_phi(): void
    {
        $event = new QueueTicketUpdated(
            clinicId: $this->clinic1->id,
            queueId: 101,
            queueNumber: 7,
            status: 'called',
            action: 'called',
            stationId: 2,
            stationName: 'Station 1 - Intake',
            callCount: 2,
            lane: 'station1',
        );

        $payload = $event->broadcastWith();

        $expectedKeys = [
            'queue_id',
            'queue_number',
            'status',
            'action',
            'station_id',
            'station_name',
            'call_count',
            'lane',
            'timestamp',
        ];

        $this->assertSame($expectedKeys, array_keys($payload));
        $this->assertSame(101, $payload['queue_id']);
        $this->assertSame(7, $payload['queue_number']);
        $this->assertSame('called', $payload['status']);
        $this->assertSame('called', $payload['action']);
        $this->assertSame(2, $payload['station_id']);
        $this->assertSame('Station 1 - Intake', $payload['station_name']);
        $this->assertSame(2, $payload['call_count']);
        $this->assertSame('station1', $payload['lane']);

        // Explicit security & privacy verification
        $this->assertArrayNotHasKey('patient_name', $payload);
        $this->assertArrayNotHasKey('patient_id', $payload);
        $this->assertArrayNotHasKey('medical_details', $payload);
        $this->assertArrayNotHasKey('diagnosis', $payload);
        $this->assertArrayNotHasKey('notes', $payload);
        $this->assertArrayNotHasKey('bite_id', $payload);
    }

    public function test_queue_ticket_updated_rejects_invalid_clinic_id(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Clinic ID must be a positive integer.');

        new QueueTicketUpdated(
            clinicId: 0,
            queueId: 101,
            queueNumber: 7,
            status: 'called',
        );
    }

    public function test_queue_ticket_updated_from_model_factory(): void
    {
        $station = Station::create([
            'clinic_id' => $this->clinic1->id,
            'name' => 'Station 1 - Intake',
            'is_active' => true,
        ]);

        $queue = Queue::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'queue_number' => 14,
            'queue_date' => now()->toDateString(),
            'visit_type' => 'vaccination',
            'status' => 'called',
            'station_id' => $station->id,
            'call_count' => 1,
            'checked_in_by' => $this->staff->id,
        ]);

        $event = QueueTicketUpdated::fromModel($queue, 'called');

        $this->assertSame($this->clinic1->id, $event->clinicId);
        $this->assertSame($queue->queue_id, $event->queueId);
        $this->assertSame(14, $event->queueNumber);
        $this->assertSame('called', $event->status);
        $this->assertSame('Station 1 - Intake', $event->stationName);
        $this->assertSame('station1', $event->lane);

        $payload = $event->broadcastWith();
        $this->assertSame(14, $payload['queue_number']);
        $this->assertArrayNotHasKey('patient_name', $payload);
    }

    /*
    |--------------------------------------------------------------------------
    | AppointmentStatusChanged Tests
    |--------------------------------------------------------------------------
    */

    public function test_appointment_status_changed_implements_required_interfaces(): void
    {
        $event = new AppointmentStatusChanged(
            clinicId: $this->clinic1->id,
            appointmentId: 50,
            status: 'confirmed',
            action: 'confirmed',
            appointmentDate: '2026-11-20',
            doseNumber: 1,
            queueNumber: 12,
            patientAccountId: $this->patientAccount->id,
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event, 'Must implement queued broadcasting');
        $this->assertInstanceOf(ShouldDispatchAfterCommit::class, $event, 'Must dispatch after DB commit');
        $this->assertSame('notifications', $event->broadcastQueue, 'Must route to notifications queue');
    }

    public function test_appointment_status_changed_channel_targeting_with_patient_account(): void
    {
        $event = new AppointmentStatusChanged(
            clinicId: $this->clinic1->id,
            appointmentId: 50,
            status: 'confirmed',
            patientAccountId: $this->patientAccount->id,
        );

        $channels = $event->broadcastOn();

        $this->assertCount(2, $channels);
        $this->assertSame('private-clinic.' . $this->clinic1->id . '.queue', $channels[0]->name);
        $this->assertSame('private-patient.account.' . $this->patientAccount->id, $channels[1]->name);

        foreach ($channels as $channel) {
            $this->assertInstanceOf(PrivateChannel::class, $channel);
        }
    }

    public function test_appointment_status_changed_channel_targeting_without_patient_account(): void
    {
        $event = new AppointmentStatusChanged(
            clinicId: $this->clinic1->id,
            appointmentId: 50,
            status: 'confirmed',
            patientAccountId: null,
        );

        $channels = $event->broadcastOn();

        $this->assertCount(1, $channels);
        $this->assertSame('private-clinic.' . $this->clinic1->id . '.queue', $channels[0]->name);
        $this->assertInstanceOf(PrivateChannel::class, $channels[0]);
    }

    public function test_appointment_status_changed_broadcast_as_name(): void
    {
        $event = new AppointmentStatusChanged(
            clinicId: $this->clinic1->id,
            appointmentId: 50,
            status: 'rescheduled',
        );

        $this->assertSame('appointment.changed', $event->broadcastAs());
    }

    public function test_appointment_status_changed_payload_is_privacy_safe(): void
    {
        $event = new AppointmentStatusChanged(
            clinicId: $this->clinic1->id,
            appointmentId: 50,
            status: 'confirmed',
            action: 'confirmed',
            appointmentDate: '2026-11-20',
            appointmentTime: '09:30',
            doseNumber: 2,
            queueNumber: 8,
            patientAccountId: $this->patientAccount->id,
        );

        $payload = $event->broadcastWith();

        $expectedKeys = [
            'appointment_id',
            'clinic_id',
            'status',
            'action',
            'appointment_date',
            'appointment_time',
            'dose_number',
            'queue_number',
            'patient_account_id',
            'timestamp',
        ];

        $this->assertSame($expectedKeys, array_keys($payload));
        $this->assertSame(50, $payload['appointment_id']);
        $this->assertSame($this->clinic1->id, $payload['clinic_id']);
        $this->assertSame('confirmed', $payload['status']);
        $this->assertSame('2026-11-20', $payload['appointment_date']);
        $this->assertSame('09:30', $payload['appointment_time']);
        $this->assertSame(2, $payload['dose_number']);
        $this->assertSame(8, $payload['queue_number']);
        $this->assertSame($this->patientAccount->id, $payload['patient_account_id']);

        // Explicit security verification: no PHI or medical records
        $this->assertArrayNotHasKey('patient_name', $payload);
        $this->assertArrayNotHasKey('bite_details', $payload);
        $this->assertArrayNotHasKey('diagnosis', $payload);
        $this->assertArrayNotHasKey('notes', $payload);
    }

    public function test_appointment_status_changed_rejects_invalid_clinic_id(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Clinic ID must be a positive integer.');

        new AppointmentStatusChanged(
            clinicId: 0,
            appointmentId: 50,
            status: 'confirmed',
        );
    }

    public function test_appointment_status_changed_from_model_factory(): void
    {
        $appointment = Appointment::create([
            'clinic_id' => $this->clinic1->id,
            'patient_id' => $this->patient->patient_id,
            'booked_by_account_id' => $this->patientAccount->id,
            'appointment_date' => '2026-11-25',
            'appointment_time' => '10:00',
            'appointment_type' => 'vaccination',
            'dose_number' => 3,
            'status' => 'scheduled',
            'created_by' => $this->staff->id,
        ]);

        $event = AppointmentStatusChanged::fromModel($appointment, 'rescheduled');

        $this->assertSame($this->clinic1->id, $event->clinicId);
        $this->assertSame($appointment->appointment_id, $event->appointmentId);
        $this->assertSame('scheduled', $event->status);
        $this->assertSame('rescheduled', $event->action);
        $this->assertSame('2026-11-25', $event->appointmentDate);
        $this->assertSame('10:00', $event->appointmentTime);
        $this->assertSame(3, $event->doseNumber);
        $this->assertSame($this->patientAccount->id, $event->patientAccountId);
    }

    /*
    |--------------------------------------------------------------------------
    | StaffNotificationBroadcast Tests
    |--------------------------------------------------------------------------
    */

    public function test_staff_notification_broadcast_implements_required_interfaces(): void
    {
        $event = new StaffNotificationBroadcast(
            clinicId: $this->clinic1->id,
            notificationId: 88,
            category: 'inventory',
            type: 'stock_low',
            title: 'Low Vaccine Stock Alert',
            message: 'Rabies vaccine stock is below minimum threshold.',
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event, 'Must implement queued broadcasting');
        $this->assertInstanceOf(ShouldDispatchAfterCommit::class, $event, 'Must dispatch after DB commit');
        $this->assertSame('notifications', $event->broadcastQueue, 'Must route to notifications queue');
    }

    public function test_staff_notification_broadcast_channel_targeting(): void
    {
        $event = new StaffNotificationBroadcast(
            clinicId: $this->clinic1->id,
            notificationId: 88,
            category: 'inventory',
            type: 'stock_low',
            title: 'Low Stock',
            message: 'Low stock detected',
        );

        $channels = $event->broadcastOn();

        $this->assertCount(1, $channels);
        $this->assertInstanceOf(PrivateChannel::class, $channels[0]);
        $this->assertSame('private-clinic.' . $this->clinic1->id . '.notifications', $channels[0]->name);
    }

    public function test_staff_notification_broadcast_as_name(): void
    {
        $event = new StaffNotificationBroadcast(
            clinicId: $this->clinic1->id,
            notificationId: 88,
            category: 'inventory',
            type: 'stock_low',
            title: 'Low Stock',
            message: 'Low stock',
        );

        $this->assertSame('notification.created', $event->broadcastAs());
    }

    public function test_staff_notification_broadcast_payload_structure(): void
    {
        $event = new StaffNotificationBroadcast(
            clinicId: $this->clinic1->id,
            notificationId: 88,
            category: 'queue',
            type: 'recall',
            title: 'Patient Recalled',
            message: 'Ticket #42 was recalled to Station 1',
            actionUrl: '/queue/dashboard',
            userId: $this->staff->id,
            role: 'nurse',
        );

        $payload = $event->broadcastWith();

        $expectedKeys = [
            'notification_id',
            'clinic_id',
            'category',
            'type',
            'title',
            'message',
            'action_url',
            'user_id',
            'role',
            'created_at',
        ];

        $this->assertSame($expectedKeys, array_keys($payload));
        $this->assertSame(88, $payload['notification_id']);
        $this->assertSame($this->clinic1->id, $payload['clinic_id']);
        $this->assertSame('queue', $payload['category']);
        $this->assertSame('recall', $payload['type']);
        $this->assertSame('/queue/dashboard', $payload['action_url']);
        $this->assertSame($this->staff->id, $payload['user_id']);
        $this->assertSame('nurse', $payload['role']);
    }

    public function test_staff_notification_broadcast_rejects_invalid_clinic_id(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Clinic ID must be a positive integer.');

        new StaffNotificationBroadcast(
            clinicId: 0,
            notificationId: 88,
            category: 'queue',
            type: 'recall',
            title: 'Test',
            message: 'Test message',
        );
    }

    public function test_staff_notification_broadcast_from_model_factory(): void
    {
        $notification = Notification::create([
            'clinic_id' => $this->clinic1->id,
            'user_id' => $this->staff->id,
            'role' => 'treatment',
            'category' => 'inventory',
            'type' => 'batch_expiry',
            'title' => 'Batch Expiring Soon',
            'message' => 'Batch B-2026-001 expires in 7 days.',
            'action_url' => '/inventory',
            'is_active' => true,
        ]);

        $event = StaffNotificationBroadcast::fromModel($notification);

        $this->assertSame($this->clinic1->id, $event->clinicId);
        $this->assertSame($notification->notification_id, $event->notificationId);
        $this->assertSame('inventory', $event->category);
        $this->assertSame('batch_expiry', $event->type);
        $this->assertSame('Batch Expiring Soon', $event->title);
        $this->assertSame('/inventory', $event->actionUrl);
    }

    /*
    |--------------------------------------------------------------------------
    | VaccineStockUpdated Tests
    |--------------------------------------------------------------------------
    */

    public function test_vaccine_stock_updated_implements_required_interfaces(): void
    {
        $event = new VaccineStockUpdated(
            clinicId: $this->clinic1->id,
            inventoryId: 12,
            vaccineType: 'PVRV (Verorab)',
            batchNumber: 'VR-9081',
            currentQuantity: 45,
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event, 'Must implement queued broadcasting');
        $this->assertInstanceOf(ShouldDispatchAfterCommit::class, $event, 'Must dispatch after DB commit');
        $this->assertSame('notifications', $event->broadcastQueue, 'Must route to notifications queue');
    }

    public function test_vaccine_stock_updated_channel_targeting(): void
    {
        $event = new VaccineStockUpdated(
            clinicId: $this->clinic1->id,
            inventoryId: 12,
            vaccineType: 'PVRV (Verorab)',
            batchNumber: 'VR-9081',
            currentQuantity: 45,
        );

        $channels = $event->broadcastOn();

        $this->assertCount(1, $channels);
        $this->assertInstanceOf(PrivateChannel::class, $channels[0]);
        $this->assertSame('private-clinic.' . $this->clinic1->id . '.inventory', $channels[0]->name);
    }

    public function test_vaccine_stock_updated_broadcast_as_name(): void
    {
        $event = new VaccineStockUpdated(
            clinicId: $this->clinic1->id,
            inventoryId: 12,
            vaccineType: 'PVRV (Verorab)',
            batchNumber: 'VR-9081',
            currentQuantity: 45,
        );

        $this->assertSame('inventory.updated', $event->broadcastAs());
    }

    public function test_vaccine_stock_updated_payload_structure_and_zero_patient_exposure(): void
    {
        $event = new VaccineStockUpdated(
            clinicId: $this->clinic1->id,
            inventoryId: 12,
            vaccineType: 'PVRV (Verorab)',
            batchNumber: 'VR-9081',
            currentQuantity: 44,
            openVialStatus: 'open',
            openVialDosesUsed: 1,
            openVialDiscardAt: '2026-11-16T22:00:00+08:00',
            action: 'dose_administered',
        );

        $payload = $event->broadcastWith();

        $expectedKeys = [
            'inventory_id',
            'clinic_id',
            'vaccine_type',
            'batch_number',
            'current_quantity',
            'open_vial_status',
            'open_vial_doses_used',
            'open_vial_discard_at',
            'action',
            'timestamp',
        ];

        $this->assertSame($expectedKeys, array_keys($payload));
        $this->assertSame(12, $payload['inventory_id']);
        $this->assertSame($this->clinic1->id, $payload['clinic_id']);
        $this->assertSame('PVRV (Verorab)', $payload['vaccine_type']);
        $this->assertSame('VR-9081', $payload['batch_number']);
        $this->assertSame(44, $payload['current_quantity']);
        $this->assertSame('open', $payload['open_vial_status']);
        $this->assertSame(1, $payload['open_vial_doses_used']);
        $this->assertSame('dose_administered', $payload['action']);

        // Explicit security verification: zero patient information
        $this->assertArrayNotHasKey('patient_name', $payload);
        $this->assertArrayNotHasKey('patient_id', $payload);
        $this->assertArrayNotHasKey('patient_account_id', $payload);
        $this->assertArrayNotHasKey('medical_details', $payload);
    }

    public function test_vaccine_stock_updated_rejects_invalid_clinic_id(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Clinic ID must be a positive integer.');

        new VaccineStockUpdated(
            clinicId: 0,
            inventoryId: 12,
            vaccineType: 'PVRV',
            batchNumber: 'VR-01',
            currentQuantity: 10,
        );
    }

    public function test_vaccine_stock_updated_rejects_negative_quantity(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Current quantity cannot be negative.');

        new VaccineStockUpdated(
            clinicId: $this->clinic1->id,
            inventoryId: 12,
            vaccineType: 'PVRV',
            batchNumber: 'VR-01',
            currentQuantity: -1,
        );
    }

    public function test_vaccine_stock_updated_from_model_factory(): void
    {
        $inventory = VaccineInventory::create([
            'clinic_id' => $this->clinic1->id,
            'vaccine_type' => 'PCECV (Rabipur)',
            'batch_number' => 'RP-2026-X',
            'current_quantity' => 20,
            'open_vial_status' => 'open',
            'open_vial_doses_used' => 2,
            'open_vial_discard_at' => now()->addHours(6),
            'expiration_date' => now()->addMonths(12)->toDateString(),
            'status' => 'in_use',
        ]);

        $event = VaccineStockUpdated::fromModel($inventory, 'vial_opened');

        $this->assertSame($this->clinic1->id, $event->clinicId);
        $this->assertSame($inventory->inventory_id, $event->inventoryId);
        $this->assertSame('PCECV (Rabipur)', $event->vaccineType);
        $this->assertSame('RP-2026-X', $event->batchNumber);
        $this->assertSame(20, $event->currentQuantity);
        $this->assertSame('open', $event->openVialStatus);
        $this->assertSame(2, $event->openVialDosesUsed);
        $this->assertSame('vial_opened', $event->action);
    }

    /*
    |--------------------------------------------------------------------------
    | Integration & Security Tests across Events
    |--------------------------------------------------------------------------
    */

    public function test_events_do_not_expose_full_eloquent_models_in_public_properties(): void
    {
        $events = [
            new QueueTicketUpdated(clinicId: 1, queueId: 1, queueNumber: 1, status: 'waiting'),
            new AppointmentStatusChanged(clinicId: 1, appointmentId: 1, status: 'scheduled'),
            new StaffNotificationBroadcast(clinicId: 1, notificationId: 1, category: 'queue', type: 'call', title: 'T', message: 'M'),
            new VaccineStockUpdated(clinicId: 1, inventoryId: 1, vaccineType: 'PVRV', batchNumber: 'B1', currentQuantity: 10),
        ];

        $propertyCount = 0;
        foreach ($events as $event) {
            $reflection = new \ReflectionClass($event);
            foreach ($reflection->getProperties(\ReflectionProperty::IS_PUBLIC) as $property) {
                $propertyCount++;
                $type = $property->getType();
                if ($type && !$type->isBuiltin()) {
                    $className = $type->getName();
                    $this->assertFalse(
                        is_subclass_of($className, \Illuminate\Database\Eloquent\Model::class),
                        get_class($event) . ' exposes Eloquent model ' . $className . ' via public property ' . $property->getName()
                    );
                } else {
                    $this->assertTrue(true);
                }
            }
        }

        $this->assertGreaterThan(0, $propertyCount, 'Properties must be inspected');
    }

    public function test_events_channels_match_registered_broadcasting_auth_rules(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-reverb-key',
            'broadcasting.connections.reverb.secret' => 'test-reverb-secret',
            'broadcasting.connections.reverb.app_id' => '999999',
            'broadcasting.connections.reverb.options.host' => '127.0.0.1',
            'broadcasting.connections.reverb.options.port' => 8080,
            'broadcasting.connections.reverb.options.scheme' => 'http',
        ]);

        $this->app->make(\Illuminate\Broadcasting\BroadcastManager::class)->purge();
        require base_path('routes/channels.php');

        $staffToken = $this->staff->createToken('staff-token')->plainTextToken;
        $patientToken = $this->patientAccount->createToken('patient-token')->plainTextToken;

        // 1. Queue event channel authorization
        $queueEvent = new QueueTicketUpdated(clinicId: $this->clinic1->id, queueId: 1, queueNumber: 1, status: 'called');
        $queueChannel = (string) $queueEvent->broadcastOn()[0];
        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => $queueChannel,
                'socket_id' => '1234.5678',
            ]);
        $response->assertStatus(200);

        // 2. Notification event channel authorization
        $notifEvent = new StaffNotificationBroadcast(clinicId: $this->clinic1->id, notificationId: 1, category: 'queue', type: 'c', title: 't', message: 'm');
        $notifChannel = (string) $notifEvent->broadcastOn()[0];
        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => $notifChannel,
                'socket_id' => '1234.5678',
            ]);
        $response->assertStatus(200);

        // 3. Inventory event channel authorization
        $invEvent = new VaccineStockUpdated(clinicId: $this->clinic1->id, inventoryId: 1, vaccineType: 'PVRV', batchNumber: 'B1', currentQuantity: 10);
        $invChannel = (string) $invEvent->broadcastOn()[0];
        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => $invChannel,
                'socket_id' => '1234.5678',
            ]);
        $response->assertStatus(200);

        // 4. Appointment event patient channel authorization
        $aptEvent = new AppointmentStatusChanged(clinicId: $this->clinic1->id, appointmentId: 1, status: 'confirmed', patientAccountId: $this->patientAccount->id);
        $patientChannel = (string) $aptEvent->broadcastOn()[1];
        $response = $this->actingAs($this->patientAccount, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => $patientChannel,
                'socket_id' => '1234.5678',
            ]);
        $response->assertStatus(200);

        // 5. Cross-tenant rejection: staff from Clinic 1 cannot authorize for Clinic 2's queue channel
        $queueEventClinic2 = new QueueTicketUpdated(clinicId: $this->clinic2->id, queueId: 2, queueNumber: 2, status: 'called');
        $clinic2QueueChannel = (string) $queueEventClinic2->broadcastOn()[0];
        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => $clinic2QueueChannel,
                'socket_id' => '1234.5678',
            ]);
        $response->assertStatus(403);
    }

    public function test_all_broadcast_channels_are_strictly_private(): void
    {
        $events = [
            new QueueTicketUpdated(clinicId: 1, queueId: 1, queueNumber: 1, status: 'waiting'),
            new AppointmentStatusChanged(clinicId: 1, appointmentId: 1, status: 'scheduled', patientAccountId: 5),
            new StaffNotificationBroadcast(clinicId: 1, notificationId: 1, category: 'queue', type: 'call', title: 'T', message: 'M'),
            new VaccineStockUpdated(clinicId: 1, inventoryId: 1, vaccineType: 'PVRV', batchNumber: 'B1', currentQuantity: 10),
        ];

        foreach ($events as $event) {
            $channels = $event->broadcastOn();
            foreach ($channels as $channel) {
                $this->assertInstanceOf(
                    PrivateChannel::class,
                    $channel,
                    get_class($event) . ' must only use PrivateChannel, found: ' . get_class($channel)
                );
            }
        }
    }

    public function test_event_fake_can_intercept_dispatches(): void
    {
        Event::fake([
            QueueTicketUpdated::class,
            AppointmentStatusChanged::class,
            StaffNotificationBroadcast::class,
            VaccineStockUpdated::class,
        ]);

        QueueTicketUpdated::dispatch($this->clinic1->id, 10, 5, 'called');
        AppointmentStatusChanged::dispatch($this->clinic1->id, 20, 'confirmed');
        StaffNotificationBroadcast::dispatch($this->clinic1->id, 30, 'inventory', 'stock_low', 'T', 'M');
        VaccineStockUpdated::dispatch($this->clinic1->id, 40, 'PVRV', 'B1', 15);

        Event::assertDispatched(QueueTicketUpdated::class, function ($event) {
            return $event->clinicId === $this->clinic1->id && $event->queueId === 10;
        });

        Event::assertDispatched(AppointmentStatusChanged::class, function ($event) {
            return $event->clinicId === $this->clinic1->id && $event->appointmentId === 20;
        });

        Event::assertDispatched(StaffNotificationBroadcast::class, function ($event) {
            return $event->clinicId === $this->clinic1->id && $event->notificationId === 30;
        });

        Event::assertDispatched(VaccineStockUpdated::class, function ($event) {
            return $event->clinicId === $this->clinic1->id && $event->inventoryId === 40;
        });
    }
}
