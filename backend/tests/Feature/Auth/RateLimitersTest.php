<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class RateLimitersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login');
    }

    public function test_login_throttled_after_5_failures(): void
    {
        $clinic = Clinic::create(['name' => 'Tagoloan ABTC']);
        User::create([
            'name' => 'Target User',
            'email' => 'target@clinic.com',
            'password' => bcrypt('correct-password'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);

        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/login', [
                'email' => 'target@clinic.com',
                'password' => 'wrong-password',
            ]);
            $response->assertStatus(422); // ValidationException credential failure
        }

        // 6th attempt should be throttled
        $throttled = $this->postJson('/api/login', [
            'email' => 'target@clinic.com',
            'password' => 'wrong-password',
        ]);
        $throttled->assertStatus(429);
    }

    public function test_password_reset_throttled_independently(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $response = $this->postJson('/api/mobile/forgot-password', [
                'email' => 'patient@test.com',
            ]);
            $response->assertStatus(200);
        }

        // 4th attempt should be throttled
        $throttled = $this->postJson('/api/mobile/forgot-password', [
            'email' => 'patient@test.com',
        ]);
        $throttled->assertStatus(429);
    }
}
