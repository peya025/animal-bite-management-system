<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\PatientAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BroadcastingAuthFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic1;
    protected Clinic $clinic2;
    protected User $staffClinic1;
    protected User $staffClinic2;
    protected PatientAccount $patientAccount1;
    protected PatientAccount $patientAccount2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic1 = Clinic::create([
            'name' => 'Clinic 1',
            'code' => 'C1',
            'email' => 'clinic1@test.com',
            'phone' => '09111111111',
            'address' => 'Address 1',
            'status' => 'active',
        ]);

        $this->clinic2 = Clinic::create([
            'name' => 'Clinic 2',
            'code' => 'C2',
            'email' => 'clinic2@test.com',
            'phone' => '09222222222',
            'address' => 'Address 2',
            'status' => 'active',
        ]);

        $this->staffClinic1 = User::create([
            'clinic_id' => $this->clinic1->id,
            'name' => 'Nurse Staff 1',
            'email' => 'staff1@test.com',
            'password' => bcrypt('password'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $this->staffClinic2 = User::create([
            'clinic_id' => $this->clinic2->id,
            'name' => 'Nurse Staff 2',
            'email' => 'staff2@test.com',
            'password' => bcrypt('password'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $this->patientAccount1 = PatientAccount::create([
            'name' => 'Patient One',
            'email' => 'patient1@test.com',
            'phone' => '09333333333',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        $this->patientAccount2 = PatientAccount::create([
            'name' => 'Patient Two',
            'email' => 'patient2@test.com',
            'phone' => '09444444444',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

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
    }

    public function test_broadcasting_and_reverb_configuration_structure(): void
    {
        $this->assertArrayHasKey('reverb', config('broadcasting.connections'));
        $this->assertSame('reverb', config('broadcasting.connections.reverb.driver'));

        $this->assertArrayHasKey('reverb', config('reverb.servers'));
        $this->assertSame(8080, (int) config('reverb.servers.reverb.port'));
    }

    public function test_unauthenticated_request_to_broadcasting_auth_is_rejected(): void
    {
        $response = $this->postJson('/api/broadcasting/auth', [
            'channel_name' => "private-clinic.{$this->clinic1->id}.queue",
            'socket_id' => '1234.5678',
        ]);

        $response->assertUnauthorized();
    }

    public function test_staff_can_authorize_for_own_clinic_queue_channel(): void
    {
        $response = $this->actingAs($this->staffClinic1, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => "private-clinic.{$this->clinic1->id}.queue",
                'socket_id' => '1234.5678',
            ]);

        $response->assertOk()
            ->assertJsonStructure(['auth']);
    }

    public function test_staff_cannot_authorize_for_different_clinic_queue_channel(): void
    {
        $response = $this->actingAs($this->staffClinic1, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => "private-clinic.{$this->clinic2->id}.queue",
                'socket_id' => '1234.5678',
            ]);

        $response->assertForbidden();
    }

    public function test_staff_can_authorize_for_own_clinic_inventory_channel(): void
    {
        $response = $this->actingAs($this->staffClinic1, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => "private-clinic.{$this->clinic1->id}.inventory",
                'socket_id' => '1234.5678',
            ]);

        $response->assertOk()
            ->assertJsonStructure(['auth']);
    }

    public function test_patient_account_can_authorize_for_own_private_channel(): void
    {
        $response = $this->actingAs($this->patientAccount1, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => "private-patient.account.{$this->patientAccount1->id}",
                'socket_id' => '1234.5678',
            ]);

        $response->assertOk()
            ->assertJsonStructure(['auth']);
    }

    public function test_patient_account_cannot_authorize_for_other_patient_private_channel(): void
    {
        $response = $this->actingAs($this->patientAccount1, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => "private-patient.account.{$this->patientAccount2->id}",
                'socket_id' => '1234.5678',
            ]);

        $response->assertForbidden();
    }

    public function test_patient_account_cannot_authorize_for_clinic_queue_channel(): void
    {
        $response = $this->actingAs($this->patientAccount1, 'sanctum')
            ->postJson('/api/broadcasting/auth', [
                'channel_name' => "private-clinic.{$this->clinic1->id}.queue",
                'socket_id' => '1234.5678',
            ]);

        $response->assertForbidden();
    }
}
