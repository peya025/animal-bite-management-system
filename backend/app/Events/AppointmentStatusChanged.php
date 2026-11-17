<?php

namespace App\Events;

use App\Models\Appointment;
use DateTimeInterface;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use InvalidArgumentException;

class AppointmentStatusChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The name of the queue on which to place the broadcasting job.
     */
    public string $broadcastQueue = 'notifications';

    /**
     * Create a new event instance.
     */
    public function __construct(
        public int $clinicId,
        public int $appointmentId,
        public string $status,
        public string $action = 'updated',
        public ?string $appointmentDate = null,
        public ?string $appointmentTime = null,
        public ?int $doseNumber = null,
        public ?int $queueNumber = null,
        public ?int $patientAccountId = null,
        public ?string $timestamp = null,
    ) {
        if ($this->clinicId <= 0) {
            throw new InvalidArgumentException('Clinic ID must be a positive integer.');
        }

        if ($this->appointmentId <= 0) {
            throw new InvalidArgumentException('Appointment ID must be a positive integer.');
        }

        if ($this->patientAccountId !== null && $this->patientAccountId <= 0) {
            throw new InvalidArgumentException('Patient account ID must be a positive integer when provided.');
        }

        $this->timestamp = $this->timestamp ?? now()->toIso8601String();
    }

    /**
     * Factory helper to create an event instance from an Eloquent model
     * without exposing the Eloquent model to broadcast serialization.
     */
    public static function fromModel(Appointment $appointment, string $action = 'updated', ?int $patientAccountId = null): self
    {
        $resolvedAccountId = $patientAccountId ?? ($appointment->booked_by_account_id ? (int) $appointment->booked_by_account_id : null);

        $dateStr = null;
        if ($appointment->appointment_date instanceof DateTimeInterface) {
            $dateStr = $appointment->appointment_date->format('Y-m-d');
        } elseif (is_string($appointment->appointment_date)) {
            $dateStr = $appointment->appointment_date;
        }

        $timeStr = null;
        if ($appointment->appointment_time instanceof DateTimeInterface) {
            $timeStr = $appointment->appointment_time->format('H:i');
        } elseif (is_string($appointment->appointment_time)) {
            $timeStr = $appointment->appointment_time;
        }

        return new self(
            clinicId: (int) $appointment->clinic_id,
            appointmentId: (int) $appointment->appointment_id,
            status: (string) $appointment->status,
            action: $action,
            appointmentDate: $dateStr,
            appointmentTime: $timeStr,
            doseNumber: $appointment->dose_number !== null ? (int) $appointment->dose_number : null,
            queueNumber: $appointment->queue_number !== null ? (int) $appointment->queue_number : null,
            patientAccountId: $resolvedAccountId,
            timestamp: now()->toIso8601String(),
        );
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * Broadcasts to authorized clinic staff, and targets the specific patient channel
     * when a patient account is associated to prevent cross-account information leakage.
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel("clinic.{$this->clinicId}.queue"),
        ];

        if ($this->patientAccountId !== null && $this->patientAccountId > 0) {
            $channels[] = new PrivateChannel("patient.account.{$this->patientAccountId}");
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'appointment.changed';
    }

    /**
     * Get the data to broadcast.
     *
     * Privacy-safe payload containing only scheduling metadata.
     * Does not contain sensitive clinical or rabies exposure details.
     */
    public function broadcastWith(): array
    {
        return [
            'appointment_id' => $this->appointmentId,
            'clinic_id' => $this->clinicId,
            'status' => $this->status,
            'action' => $this->action,
            'appointment_date' => $this->appointmentDate,
            'appointment_time' => $this->appointmentTime,
            'dose_number' => $this->doseNumber,
            'queue_number' => $this->queueNumber,
            'patient_account_id' => $this->patientAccountId,
            'timestamp' => $this->timestamp,
        ];
    }
}
