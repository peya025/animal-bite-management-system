<?php

namespace Tests\Feature;

use Database\Seeders\QuickLoginDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeededDemoLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_quick_login_account_is_seeded_with_working_credentials(): void
    {
        $this->seed(QuickLoginDemoSeeder::class);

        foreach ([
            'developer@clinic.com' => 'developer',
            'admin@clinic.com' => 'admin',
            'registration@clinic.com' => 'registration',
            'triage@clinic.com' => 'triage',
            'nurse1@clinic.com' => 'treatment',
            'nurse2@clinic.com' => 'treatment',
            'treatment@clinic.com' => 'treatment',
        ] as $email => $role) {
            $this->postJson('/api/login', [
                'email' => $email,
                'password' => 'password123',
            ])->assertOk()
                ->assertJsonPath('user.role', $role);
        }
    }
}
