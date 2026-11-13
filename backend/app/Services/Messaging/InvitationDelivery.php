<?php

namespace App\Services\Messaging;

use App\Models\OutboundMessage;
use Illuminate\Support\Str;

class InvitationDelivery
{
    /** Invitations stay synchronous to preserve token rotation/failure guarantees. Never persist tokens in the ledger. */
    public function send(int $clinicId, string $recipient, string $purpose, callable $send): bool
    {
        $error = app(DeliveryPolicy::class)->error('email', $recipient);
        $message = OutboundMessage::create([
            'clinic_id' => $clinicId, 'channel' => 'email', 'purpose' => $purpose,
            'provider' => config('mail.default'), 'idempotency_key' => hash('sha256', Str::uuid()->toString()),
            'recipient' => $recipient, 'body' => '[Invitation content omitted]',
            'status' => $error ? 'skipped' : 'processing', 'error_code' => $error,
        ]);
        if ($error) {
            return false;
        }
        try {
            $send();
            $status = 'accepted';
        } catch (\Throwable) {
            $status = 'unknown';
            $error = 'invitation_delivery_unconfirmed';
        }
        $message->update(['status' => $status, 'error_code' => $error, 'attempt_count' => 1, 'accepted_at' => $status === 'accepted' ? now() : null]);
        $message->attempts()->create(['provider' => $message->provider, 'status' => $status, 'error_code' => $error]);

        return $status === 'accepted';
    }
}
