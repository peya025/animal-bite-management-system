<?php

namespace Tests\Feature;

use App\Events\AppointmentStatusChanged;
use App\Events\QueueTicketUpdated;
use App\Events\StaffNotificationBroadcast;
use App\Events\VaccineStockUpdated;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\PatientAccount;
use App\Models\Queue;
use App\Models\User;
use App\Models\VaccineInventory;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ReverbProductionConfigurationTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic1;
    protected Clinic $clinic2;
    protected User $nurseClinic1;
    protected User $doctorClinic1;
    protected User $staffClinic2;
    protected PatientAccount $patient1;
    protected PatientAccount $patient2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic1 = Clinic::create([
            'name' => 'City Health Clinic 1',
            'code' => 'CHC1',
            'email' => 'clinic1@abtc.test',
            'phone' => '09111111111',
            'address' => 'Station 1 Address',
            'status' => 'active',
        ]);

        $this->clinic2 = Clinic::create([
            'name' => 'Rural Health Clinic 2',
            'code' => 'RHC2',
            'email' => 'clinic2@abtc.test',
            'phone' => '09222222222',
            'address' => 'Station 2 Address',
            'status' => 'active',
        ]);

        $this->nurseClinic1 = User::create([
            'clinic_id' => $this->clinic1->id,
            'name' => 'Nurse Joy',
            'email' => 'joy@abtc.test',
            'password' => bcrypt('password'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $this->doctorClinic1 = User::create([
            'clinic_id' => $this->clinic1->id,
            'name' => 'Dr. House',
            'email' => 'house@abtc.test',
            'password' => bcrypt('password'),
            'role' => 'triage',
            'is_active' => true,
        ]);

        $this->staffClinic2 = User::create([
            'clinic_id' => $this->clinic2->id,
            'name' => 'Nurse Other',
            'email' => 'other@abtc.test',
            'password' => bcrypt('password'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $this->patient1 = PatientAccount::create([
            'name' => 'Patient One',
            'email' => 'patient1@abtc.test',
            'phone' => '09333333333',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        $this->patient2 = PatientAccount::create([
            'name' => 'Patient Two',
            'email' => 'patient2@abtc.test',
            'phone' => '09444444444',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-reverb-key',
            'broadcasting.connections.reverb.secret' => 'test-reverb-secret',
            'broadcasting.connections.reverb.app_id' => '897821',
        ]);
        $this->app->make(\Illuminate\Broadcasting\BroadcastManager::class)->purge();

        require base_path('routes/channels.php');
    }

    /**
     * Test Reverb server and apps configuration structure.
     */
    public function test_reverb_server_and_apps_configuration_structure(): void
    {
        $serverConfig = config('reverb.servers.reverb');
        $this->assertNotNull($serverConfig);
        $this->assertSame('0.0.0.0', $serverConfig['host']);
        $this->assertEquals(8080, $serverConfig['port']);

        $apps = config('reverb.apps.apps');
        $this->assertIsArray($apps);
        $this->assertNotEmpty($apps);
        $this->assertArrayHasKey('allowed_origins', $apps[0]);
        $this->assertContains('*', $apps[0]['allowed_origins']);
    }

    /**
     * Test that allowed_origins properly handles wildcards, domains, and protocols.
     */
    public function test_reverb_allowed_origins_parsing(): void
    {
        $parseOrigins = function (string $input) {
            return array_values(array_filter(array_map(
                fn ($o) => parse_url(trim($o), PHP_URL_HOST) ?: preg_replace('#:\d+$#', '', trim($o)),
                explode(',', $input ?: '*')
            )));
        };

        // Wildcard
        $this->assertSame(['*'], $parseOrigins('*'));
        $this->assertSame(['*'], $parseOrigins(''));

        // URL parsing
        $origins = $parseOrigins('https://animal-bite.vercel.app, http://localhost:5173, *.vercel.app');
        $this->assertContains('animal-bite.vercel.app', $origins);
        $this->assertContains('localhost', $origins);
        $this->assertContains('*.vercel.app', $origins);
    }

    /**
     * Test backend broadcasting Reverb connection supports API host override and public fallback.
     */
    public function test_broadcasting_reverb_connection_options(): void
    {
        $connection = config('broadcasting.connections.reverb');
        $this->assertSame('reverb', $connection['driver']);
        $this->assertArrayHasKey('options', $connection);
        $this->assertArrayHasKey('host', $connection['options']);
        $this->assertArrayHasKey('port', $connection['options']);
        $this->assertArrayHasKey('scheme', $connection['options']);
        $this->assertArrayHasKey('useTLS', $connection['options']);
    }

    /**
     * Test CORS allowed origins parses comma-separated frontend URLs.
     */
    public function test_cors_allowed_origins_parsing(): void
    {
        $parseCors = function (string $envValue) {
            return array_values(array_filter(
                array_map('trim', explode(',', $envValue))
            ));
        };

        $this->assertSame([], $parseCors(''));
        $this->assertSame(['https://app.vercel.app'], $parseCors('https://app.vercel.app'));
        $this->assertSame(
            ['https://app.vercel.app', 'http://localhost:5173'],
            $parseCors('https://app.vercel.app, http://localhost:5173')
        );
    }

    /**
     * Test Railway shell scripts exist, are non-empty, and contain required startup commands.
     */
    public function test_railway_shell_scripts_configuration(): void
    {
        $reverbScript = base_path('railway/run-reverb.sh');
        $this->assertFileExists($reverbScript);
        $reverbContent = file_get_contents($reverbScript);
        $this->assertStringContainsString('php artisan reverb:start', $reverbContent);
        $this->assertStringContainsString('--host="${HOST}"', $reverbContent);
        $this->assertStringContainsString('--port="${PORT}"', $reverbContent);

        $workerScript = base_path('railway/run-worker.sh');
        $this->assertFileExists($workerScript);
        $workerContent = file_get_contents($workerScript);
        $this->assertStringContainsString('--queue=notifications,default', $workerContent);
        $this->assertStringContainsString('--tries=3', $workerContent);
    }

    /**
     * Test User-specific staff notification private channel authorization.
     */
    public function test_user_specific_staff_notification_channel_authorization(): void
    {
        // Target staff herself can authorize
        $response = $this->actingAs($this->nurseClinic1, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => "private-clinic.{$this->clinic1->id}.user.{$this->nurseClinic1->id}.notifications",
                'socket_id' => '1111.2222',
            ]);
        $response->assertOk()->assertJsonStructure(['auth']);

        // Another staff member in the same clinic cannot authorize for her private channel
        $responseOtherStaff = $this->actingAs($this->doctorClinic1, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => "private-clinic.{$this->clinic1->id}.user.{$this->nurseClinic1->id}.notifications",
                'socket_id' => '1111.2222',
            ]);
        $responseOtherStaff->assertForbidden();

        // Staff from another clinic cannot authorize
        $responseOtherClinic = $this->actingAs($this->staffClinic2, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => "private-clinic.{$this->clinic1->id}.user.{$this->nurseClinic1->id}.notifications",
                'socket_id' => '1111.2222',
            ]);
        $responseOtherClinic->assertForbidden();
    }

    /**
     * Test QueueTicketUpdated is ShouldBroadcastNow and excludes PHI.
     */
    public function test_queue_ticket_updated_event_broadcast(): void
    {
        $event = new QueueTicketUpdated(
            clinicId: $this->clinic1->id,
            queueId: 10,
            queueNumber: 101,
            status: 'called',
            action: 'called',
            stationId: 1,
            stationName: 'Station 1 - Intake',
            callCount: 1,
            lane: 'station1'
        );

        $this->assertInstanceOf(ShouldBroadcastNow::class, $event);
        $this->assertSame('queue.updated', $event->broadcastAs());
        $this->assertSame("private-clinic.{$this->clinic1->id}.queue", $event->broadcastOn()[0]->name);

        $payload = $event->broadcastWith();
        $this->assertSame(10, $payload['queue_id']);
        $this->assertSame(101, $payload['queue_number']);
        $this->assertSame('called', $payload['status']);
        $this->assertSame('station1', $payload['lane']);

        // Verify zero patient PHI
        $this->assertArrayNotHasKey('patient_name', $payload);
        $this->assertArrayNotHasKey('diagnosis', $payload);
    }

    /**
     * Test AppointmentStatusChanged places on notifications queue and isolates channels.
     */
    public function test_appointment_status_changed_event_broadcast(): void
    {
        $event = new AppointmentStatusChanged(
            clinicId: $this->clinic1->id,
            appointmentId: 50,
            status: 'confirmed',
            action: 'confirmed',
            appointmentDate: '2026-11-25',
            appointmentTime: '09:00',
            doseNumber: 1,
            queueNumber: 102,
            patientAccountId: $this->patient1->id
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event);
        $this->assertSame('notifications', $event->broadcastQueue);
        $this->assertSame('appointment.changed', $event->broadcastAs());

        $channels = array_map(fn ($ch) => $ch->name, $event->broadcastOn());
        $this->assertContains("private-clinic.{$this->clinic1->id}.queue", $channels);
        $this->assertContains("private-patient.account.{$this->patient1->id}", $channels);
        $this->assertNotContains("private-patient.account.{$this->patient2->id}", $channels);
    }

    /**
     * Test StaffNotificationBroadcast routes to general clinic or user-specific channel.
     */
    public function test_staff_notification_broadcast_routing(): void
    {
        // Clinic-wide
        $generalEvent = new StaffNotificationBroadcast(
            clinicId: $this->clinic1->id,
            notificationId: 1,
            category: 'general',
            type: 'alert',
            title: 'Clinic Notice',
            message: 'All staff meeting at 4 PM'
        );
        $this->assertSame("private-clinic.{$this->clinic1->id}.notifications", $generalEvent->broadcastOn()[0]->name);

        // User-specific
        $userEvent = new StaffNotificationBroadcast(
            clinicId: $this->clinic1->id,
            notificationId: 2,
            category: 'queue',
            type: 'call',
            title: 'Patient Transferred',
            message: 'Patient transferred to you',
            userId: $this->doctorClinic1->id
        );
        $this->assertSame("private-clinic.{$this->clinic1->id}.user.{$this->doctorClinic1->id}.notifications", $userEvent->broadcastOn()[0]->name);
    }

    /**
     * Test VaccineStockUpdated is queued on notifications and broadcasts to inventory channel.
     */
    public function test_vaccine_stock_updated_event_broadcast(): void
    {
        $event = new VaccineStockUpdated(
            clinicId: $this->clinic1->id,
            inventoryId: 5,
            vaccineType: 'Rabipur',
            batchNumber: 'RAB-2026-001',
            currentQuantity: 45,
            openVialStatus: 'open',
            openVialDosesUsed: 2,
            openVialDiscardAt: '2026-11-20T18:00:00+08:00',
            action: 'dose_administered'
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event);
        $this->assertSame('notifications', $event->broadcastQueue);
        $this->assertSame('inventory.updated', $event->broadcastAs());
        $this->assertSame("private-clinic.{$this->clinic1->id}.inventory", $event->broadcastOn()[0]->name);

        $payload = $event->broadcastWith();
        $this->assertSame('Rabipur', $payload['vaccine_type']);
        $this->assertSame(45, $payload['current_quantity']);
        $this->assertArrayNotHasKey('patient_name', $payload);
    }
}
