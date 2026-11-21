<?php

namespace App\Services\Messaging;

use App\Jobs\DeliverOutboundMessage;
use App\Models\Appointment;
use App\Models\OutboundMessage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AppointmentEmailEvents
{
    public static function snapshot(Appointment $appointment): array
    {
        return ['status' => $appointment->status,
            'date' => ($appointment->scheduled_date ?? $appointment->appointment_date)?->toDateString(),
            'time' => $appointment->appointment_time?->format('H:i')];
    }

    public function record(Appointment $appointment, string $event): void
    {
        if (! config('messaging.appointment_events_enabled') || ! config('messaging.email_enabled')) {
            return;
        }
        $patient = $appointment->patient()->first();
        if (! $patient || $patient->clinic_id != $appointment->clinic_id) {
            return;
        }
        $recipient = trim((string) $patient->email);
        if (! DB::table('communication_preferences')->where('patient_id', $patient->patient_id)->value('email')
            || app(DeliveryPolicy::class)->error('email', $recipient)) {
            return;
        }
        // Include database defaults (for example appointment_time) in the queued snapshot.
        $appointment = $appointment->fresh();
        $snapshot = self::snapshot($appointment);
        if (! $snapshot['date']) {
            return;
        }
        $clinic = $appointment->clinic()->first();
        if (! $clinic) {
            return;
        }
        $body = 'Hello '.$patient->first_name.'. Your clinic appointment has been '.$event.'. Date: '.$snapshot['date'].'.';
        if ($snapshot['time']) {
            $body .= ' Time: '.$snapshot['time'].'.';
        }
        $body .= ' Please open your patient portal for appointment details or contact '.$clinic->name.' for assistance.';
        // Deliberately omit treatment/regimen details and cancellation reasons.
        $message = OutboundMessage::create([
            'clinic_id' => $appointment->clinic_id, 'patient_id' => $patient->patient_id,
            'appointment_id' => $appointment->appointment_id, 'channel' => 'email', 'purpose' => 'appointment_update',
            'provider' => config('mail.default'), 'recipient' => $recipient, 'subject' => 'Clinic appointment update',
            'body' => $body, 'status' => 'queued', 'idempotency_key' => hash('sha256', Str::uuid()->toString()),
            'context' => ['event' => $event, 'snapshot' => $snapshot, 'expires_at' => now()->addDay()->toIso8601String()],
        ]);
        DeliverOutboundMessage::dispatch($message->id);
    }
}
