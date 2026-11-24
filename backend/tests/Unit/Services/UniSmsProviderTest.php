<?php

namespace Tests\Unit\Services;

use App\Services\Messaging\Sms\SmsManager;
use App\Services\Messaging\Sms\UniSmsProvider;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class UniSmsProviderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        config([
            'messaging.unisms.api_key' => 'test-unisms-secret-key',
            'messaging.unisms.sender_id' => 'Unisoft',
            'messaging.unisms.url' => 'https://unismsapi.com/api',
            'messaging.unisms.receipts_enabled' => false,
        ]);
    }

    public function test_sms_manager_resolves_unisms_provider(): void
    {
        $provider = app(SmsManager::class)->provider('unisms');
        $this->assertInstanceOf(UniSmsProvider::class, $provider);
    }

    public function test_configured_requires_api_key_and_safe_sender_id(): void
    {
        $provider = new UniSmsProvider();
        $this->assertTrue($provider->configured());

        config(['messaging.unisms.api_key' => '']);
        $this->assertFalse($provider->configured());

        config(['messaging.unisms.api_key' => 'test-key', 'messaging.unisms.sender_id' => '']);
        $this->assertFalse($provider->configured());

        config(['messaging.unisms.sender_id' => "Unisoft\r\nInjected"]);
        $this->assertFalse($provider->configured());
    }

    public function test_send_posts_json_with_basic_auth_and_parses_201_nested_response(): void
    {
        Http::fake([
            'https://unismsapi.com/api/sms' => Http::response([
                'message' => [
                    'status' => 'pending',
                    'reference_id' => 'msg_84e8b93b-6315-46af-a686',
                    'recipient' => '+639171234567',
                    'sender_id' => 'Unisoft',
                ],
            ], 201),
        ]);

        $result = (new UniSmsProvider())->send('+639171234567', 'Reminder: ABTC dose tomorrow.', 'ref-1');

        $this->assertSame('accepted', $result->status);
        $this->assertSame('msg_84e8b93b-6315-46af-a686', $result->messageId);
        $this->assertNull($result->error);

        $expectedAuth = 'Basic '.base64_encode('test-unisms-secret-key:');
        Http::assertSent(function (Request $request) use ($expectedAuth) {
            return $request->method() === 'POST'
                && $request->url() === 'https://unismsapi.com/api/sms'
                && $request->hasHeader('Authorization', $expectedAuth)
                && $request->hasHeader('Accept', 'application/json')
                && $request['recipient'] === '+639171234567'
                && $request['content'] === 'Reminder: ABTC dose tomorrow.'
                && $request['sender_id'] === 'Unisoft';
        });
    }

    public function test_send_supports_top_level_and_data_reference_ids(): void
    {
        Http::fake([
            'https://unismsapi.com/api/sms' => Http::sequence()
                ->push(['reference_id' => 'msg_top_1', 'status' => 'sent'], 201)
                ->push(['success' => true, 'data' => ['message_id' => 'msg_data_2', 'status' => 'queued']], 200)
                ->push(['reference_id' => 'msg_fail_3', 'status' => 'failed'], 201),
        ]);

        $provider = new UniSmsProvider();

        $first = $provider->send('+639171234567', 'Test 1', 'ref-1');
        $this->assertSame('accepted', $first->status);
        $this->assertSame('msg_top_1', $first->messageId);

        $second = $provider->send('+639171234567', 'Test 2', 'ref-2');
        $this->assertSame('accepted', $second->status);
        $this->assertSame('msg_data_2', $second->messageId);

        $third = $provider->send('+639171234567', 'Test 3', 'ref-3');
        $this->assertSame('failed', $third->status);
        $this->assertSame('msg_fail_3', $third->messageId);
        $this->assertSame('delivery_failed', $third->error);
    }

    public function test_send_validates_recipient_and_message_length_without_network_call(): void
    {
        $provider = new UniSmsProvider();

        $badRecipient = $provider->send('+15551234567', 'Hello', 'ref-1');
        $this->assertSame('failed', $badRecipient->status);
        $this->assertSame('unsupported_recipient', $badRecipient->error);

        $emptyBody = $provider->send('+639171234567', '   ', 'ref-2');
        $this->assertSame('failed', $emptyBody->status);
        $this->assertSame('empty_message_body', $emptyBody->error);

        $tooLong = $provider->send('+639171234567', str_repeat('A', 671), 'ref-3');
        $this->assertSame('failed', $tooLong->status);
        $this->assertSame('message_too_long', $tooLong->error);

        Http::assertNothingSent();
    }

    public function test_send_maps_provider_error_codes_safely(): void
    {
        Http::fake([
            'https://unismsapi.com/api/sms' => Http::sequence()
                ->push(['message' => 'Unauthorized'], 401)
                ->push(['message' => 'Insufficient credits'], 402)
                ->push(['message' => 'Forbidden sender'], 403)
                ->push(['errors' => ['sender_id' => ['Sender ID is not approved']]], 422)
                ->push(['errors' => ['recipient' => ['Invalid mobile number']]], 422)
                ->push(['message' => 'Too many requests'], 429)
                ->push(['message' => 'Internal server error'], 500)
                ->push(['ok' => true], 201),
        ]);

        $provider = new UniSmsProvider();

        $this->assertSame(['failed', 'unisms_authentication_failed'], [$r = $provider->send('+639171234567', 'Body', 'r1'), $r->error][0] ? [$r->status, $r->error] : []);
        $r402 = $provider->send('+639171234567', 'Body', 'r2');
        $this->assertSame('failed', $r402->status);
        $this->assertSame('unisms_insufficient_credits', $r402->error);

        $r403 = $provider->send('+639171234567', 'Body', 'r3');
        $this->assertSame('failed', $r403->status);
        $this->assertSame('unisms_sender_or_account_rejected', $r403->error);

        $r422Sender = $provider->send('+639171234567', 'Body', 'r4');
        $this->assertSame('failed', $r422Sender->status);
        $this->assertSame('unisms_sender_rejected', $r422Sender->error);

        $r422Recipient = $provider->send('+639171234567', 'Body', 'r5');
        $this->assertSame('failed', $r422Recipient->status);
        $this->assertSame('unisms_invalid_recipient', $r422Recipient->error);

        $r429 = $provider->send('+639171234567', 'Body', 'r6');
        $this->assertSame('retry', $r429->status);
        $this->assertSame('rate_limited', $r429->error);

        $r500 = $provider->send('+639171234567', 'Body', 'r7');
        $this->assertSame('unknown', $r500->status);
        $this->assertSame('provider_server_error', $r500->error);

        $rMalformed = $provider->send('+639171234567', 'Body', 'r8');
        $this->assertSame('unknown', $rMalformed->status);
        $this->assertSame('invalid_provider_response', $rMalformed->error);
    }

    public function test_send_returns_unknown_on_connection_timeout(): void
    {
        Http::fake(fn () => throw new ConnectionException('Connection timed out'));

        $result = (new UniSmsProvider())->send('+639171234567', 'Body', 'ref-timeout');

        $this->assertSame('unknown', $result->status);
        $this->assertSame('unisms_connection_timeout', $result->error);
    }

    public function test_status_lookup_respects_receipts_flag_and_maps_terminal_states(): void
    {
        $provider = new UniSmsProvider();
        $noop = $provider->status('msg_123');
        $this->assertSame('accepted', $noop->status);
        $this->assertSame('msg_123', $noop->messageId);
        Http::assertNothingSent();

        config(['messaging.unisms.receipts_enabled' => true]);
        Http::fake([
            'https://unismsapi.com/api/sms/msg_123' => Http::sequence()
                ->push(['message' => ['reference_id' => 'msg_123', 'status' => 'pending']], 200)
                ->push(['message' => ['reference_id' => 'msg_123', 'status' => 'sent']], 200)
                ->push(['message' => ['reference_id' => 'msg_123', 'status' => 'failed']], 200),
        ]);

        $this->assertSame('accepted', $provider->status('msg_123')->status);
        $this->assertSame('delivered', $provider->status('msg_123')->status);
        $this->assertSame('failed', $provider->status('msg_123')->status);
    }
}
