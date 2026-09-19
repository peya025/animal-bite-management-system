<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeploymentReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_check_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'timestamp',
            ])
            ->assertJson([
                'status' => 'ok',
            ]);
    }

    public function test_demo_seeder_populates_only_synthetic_data_and_no_developer(): void
    {
        $this->seed(DemoSeeder::class);

        // Verify admin exists
        $this->assertDatabaseHas('users', [
            'email' => 'admin@demo-clinic.example.com',
            'role' => 'admin',
        ]);

        // Verify synthetic staff exist
        $this->assertDatabaseHas('users', [
            'email' => 'doctor@demo-clinic.example.com',
        ]);
        $this->assertDatabaseHas('users', [
            'email' => 'intake.nurse@demo-clinic.example.com',
        ]);

        // Verify synthetic patient and batch exist
        $this->assertDatabaseHas('patients', [
            'patient_number' => 'PAT-DEMO-001',
            'first_name' => 'DemoJane',
        ]);
        $this->assertDatabaseHas('vaccine_inventory', [
            'batch_number' => 'BATCH-SYNTH-01',
        ]);

        // Verify NO developer role or developer user exists
        $this->assertDatabaseMissing('users', [
            'role' => 'developer',
        ]);
        $this->assertDatabaseMissing('roles', [
            'slug' => 'developer',
        ]);
    }
}