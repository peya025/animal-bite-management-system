<?php

namespace App\Events;

use App\Models\Queue;
use App\Models\Station;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use InvalidArgumentException;

class QueueTicketUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     *
     * Synchronous broadcasting (ShouldBroadcastNow) is explicitly justified for
     * immediate sub-second audio chimes and display transitions on public calling screens
     * and staff desks without queue worker polling delays.
     */
    public function __construct(
        public int $clinicId,
        public int $queueId,
        public int $queueNumber,
        public string $status,
        public string $action = 'updated',
        public ?int $stationId = null,
        public ?string $stationName = null,
        public int $callCount = 0,
        public ?string $lane = null,
        public ?string $timestamp = null,
    ) {
        if ($this->clinicId <= 0) {
            throw new InvalidArgumentException('Clinic ID must be a positive integer.');
        }

        if ($this->queueId <= 0) {
            throw new InvalidArgumentException('Queue ID must be a positive integer.');
        }

        if ($this->queueNumber <= 0) {
            throw new InvalidArgumentException('Queue number must be a positive integer.');
        }

        $this->timestamp = $this->timestamp ?? now()->toIso8601String();
    }

    /**
     * Factory helper to create an event instance from an Eloquent model
     * without exposing the Eloquent model to broadcast serialization.
     */
    public static function fromModel(Queue $queue, string $action = 'updated', ?string $lane = null): self
    {
        $stationName = $queue->relationLoaded('station') ? $queue->station?->name : null;
        if ($stationName === null && $queue->station_id) {
            $stationName = Station::where('id', $queue->station_id)->value('name');
        }

        $resolvedLane = $lane;
        if ($resolvedLane === null) {
            $sName = strtolower($stationName ?? '');
            if (str_contains($sName, 'follow-up') || str_contains($sName, 'station 2')) {
                $resolvedLane = 'station2';
            } elseif (str_contains($sName, 'intake') || str_contains($sName, 'station 1')) {
                $resolvedLane = 'station1';
            } elseif ($queue->visit_type === 'follow_up') {
                $resolvedLane = 'station2';
            } elseif ($queue->visit_type === 'consultation' || $queue->visit_type === 'new_bite' || $queue->visit_type === 'new_case') {
                $resolvedLane = 'triage';
            }
        }

        return new self(
            clinicId: (int) $queue->clinic_id,
            queueId: (int) $queue->queue_id,
            queueNumber: (int) $queue->queue_number,
            status: (string) $queue->status,
            action: $action,
            stationId: $queue->station_id ? (int) $queue->station_id : null,
            stationName: $stationName,
            callCount: (int) ($queue->call_count ?? 0),
            lane: $resolvedLane,
            timestamp: now()->toIso8601String(),
        );
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("clinic.{$this->clinicId}.queue"),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'queue.updated';
    }

    /**
     * Get the data to broadcast.
     *
     * Omits patient names and Protected Health Information (PHI) to preserve patient privacy
     * on public display screens and shared clinic channels.
     */
    public function broadcastWith(): array
    {
        return [
            'queue_id' => $this->queueId,
            'queue_number' => $this->queueNumber,
            'status' => $this->status,
            'action' => $this->action,
            'station_id' => $this->stationId,
            'station_name' => $this->stationName,
            'call_count' => $this->callCount,
            'lane' => $this->lane,
            'timestamp' => $this->timestamp,
        ];
    }
}
