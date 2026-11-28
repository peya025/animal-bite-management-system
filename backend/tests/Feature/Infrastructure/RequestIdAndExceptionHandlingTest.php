<?php

namespace Tests\Feature\Infrastructure;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tests\TestCase;

class RequestIdAndExceptionHandlingTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_api_request_receives_unique_x_request_id_header(): void
    {
        $response = $this->getJson('/api/landing-page-settings');

        $response->assertStatus(200);
        $this->assertTrue($response->headers->has('X-Request-ID'));

        $requestId = $response->headers->get('X-Request-ID');
        $this->assertNotEmpty($requestId);
        $this->assertTrue(Str::isUuid($requestId));
    }

    public function test_incoming_x_request_id_is_preserved_and_returned(): void
    {
        $customId = 'custom-request-id-12345';

        $response = $this->withHeaders([
            'X-Request-ID' => $customId,
        ])->getJson('/api/landing-page-settings');

        $response->assertStatus(200);
        $this->assertEquals($customId, $response->headers->get('X-Request-ID'));
    }

    public function test_request_id_is_bound_to_log_context(): void
    {
        $customId = 'log-context-uuid-999';

        $this->withHeaders([
            'X-Request-ID' => $customId,
        ])->getJson('/api/landing-page-settings');

        $context = Log::sharedContext();
        $this->assertArrayHasKey('request_id', $context);
        $this->assertEquals($customId, $context['request_id']);
    }

    public function test_validation_exception_renders_uniform_422_json_payload(): void
    {
        $response = $this->postJson('/api/mobile/login', []);

        $response->assertStatus(422)
            ->assertJsonStructure([
                'message',
                'errors',
            ]);

        $this->assertTrue($response->headers->has('X-Request-ID'));
    }

    public function test_unauthenticated_api_request_renders_uniform_401_json(): void
    {
        $response = $this->getJson('/api/notifications');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);

        $this->assertTrue($response->headers->has('X-Request-ID'));
    }

    public function test_not_found_api_request_renders_uniform_404_json(): void
    {
        $response = $this->getJson('/api/non-existent-endpoint-route-xyz');

        $response->assertStatus(404);
        $this->assertTrue($response->headers->has('X-Request-ID'));
    }
}
