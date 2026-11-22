<?php

namespace App\Events;

use App\Models\VaccineInventory;
use DateTimeInterface;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use InvalidArgumentException;

class VaccineStockUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
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
        public int $inventoryId,
        public string $vaccineType,
        public string $batchNumber,
        public int $currentQuantity,
        public ?string $openVialStatus = null,
        public int $openVialDosesUsed = 0,
        public ?string $openVialDiscardAt = null,
        public string $action = 'updated',
        public ?string $timestamp = null,
    ) {
        if ($this->clinicId <= 0) {
            throw new InvalidArgumentException('Clinic ID must be a positive integer.');
        }

        if ($this->inventoryId <= 0) {
            throw new InvalidArgumentException('Inventory ID must be a positive integer.');
        }

        if ($this->currentQuantity < 0) {
            throw new InvalidArgumentException('Current quantity cannot be negative.');
        }

        $this->timestamp = $this->timestamp ?? now()->toIso8601String();
    }

    /**
     * Dispatch the event with the given arguments or an existing instance.
     */
    public static function dispatch(...$arguments)
    {
        if (isset($arguments[0]) && $arguments[0] instanceof static) {
            return event($arguments[0]);
        }

        return event(new static(...$arguments));
    }

    /**
     * Factory helper to create an event instance from a VaccineInventory model
     * without exposing the full Eloquent model to broadcast serialization.
     */
    public static function fromModel(VaccineInventory $inventory, string $action = 'updated'): self
    {
        $discardAt = null;
        if ($inventory->open_vial_discard_at instanceof DateTimeInterface) {
            $discardAt = $inventory->open_vial_discard_at->toIso8601String();
        } elseif (is_string($inventory->open_vial_discard_at)) {
            $discardAt = $inventory->open_vial_discard_at;
        }

        return new self(
            clinicId: (int) $inventory->clinic_id,
            inventoryId: (int) $inventory->inventory_id,
            vaccineType: (string) ($inventory->vaccine_type ?? ''),
            batchNumber: (string) ($inventory->batch_number ?? ''),
            currentQuantity: (int) ($inventory->current_quantity ?? 0),
            openVialStatus: $inventory->open_vial_status ? (string) $inventory->open_vial_status : null,
            openVialDosesUsed: (int) ($inventory->open_vial_doses_used ?? 0),
            openVialDiscardAt: $discardAt,
            action: $action,
            timestamp: now()->toIso8601String(),
        );
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * Broadcasts strictly to authorized clinic inventory subscribers (treatment/admin roles).
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("clinic.{$this->clinicId}.inventory"),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'inventory.updated';
    }

    /**
     * Get the data to broadcast.
     *
     * Privacy-safe inventory metadata. Never contains patient health details.
     */
    public function broadcastWith(): array
    {
        return [
            'inventory_id' => $this->inventoryId,
            'clinic_id' => $this->clinicId,
            'vaccine_type' => $this->vaccineType,
            'batch_number' => $this->batchNumber,
            'current_quantity' => $this->currentQuantity,
            'open_vial_status' => $this->openVialStatus,
            'open_vial_doses_used' => $this->openVialDosesUsed,
            'open_vial_discard_at' => $this->openVialDiscardAt,
            'action' => $this->action,
            'timestamp' => $this->timestamp,
        ];
    }
}
