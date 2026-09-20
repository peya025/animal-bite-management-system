<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicDeploymentSurfaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_diagnostic_test_route_is_not_registered(): void
    {
        $this->getJson('/api/test')->assertNotFound();
    }

    public function test_setup_routes_are_hidden_in_production_when_flag_is_disabled(): void
    {
        config(['app.public_setup_enabled' => false]);
        $this->app->detectEnvironment(static fn () => 'production');

        $this->postJson('/api/setup/initialize', [
            'clinic_name' => 'Untrusted Clinic',
            'admin_name' => 'Untrusted Admin',
            'admin_email' => 'attacker@example.test',
            'admin_password' => 'Password123',
            'admin_password_confirmation' => 'Password123',
        ])->assertNotFound();

        $this->getJson('/api/setup/check-needed')->assertNotFound();
    }
}
