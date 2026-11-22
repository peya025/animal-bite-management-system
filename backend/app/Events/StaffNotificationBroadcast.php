<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use InvalidArgumentException;

class StaffNotificationBroadcast implements ShouldBroadcast, ShouldDispatchAfterCommit
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
        public int $notificationId,
        public string $category,
        public string $type,
        public string $title,
        public string $message,
        public ?string $actionUrl = null,
        public ?int $userId = null,
        public ?string $role = null,
        public ?string $createdAt = null,
    ) {
        if ($this->clinicId <= 0) {
            throw new InvalidArgumentException('Clinic ID must be a positive integer.');
        }

        if ($this->notificationId <= 0) {
            throw new InvalidArgumentException('Notification ID must be a positive integer.');
        }

        $this->createdAt = $this->createdAt ?? now()->toIso8601String();
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
     * Factory helper to create an event instance from an existing Notification model
     * without creating a secondary persistence system or exposing raw Eloquent models.
     */
    public static function fromModel(Notification $notification): self
    {
        return new self(
            clinicId: (int) $notification->clinic_id,
            notificationId: (int) $notification->notification_id,
            category: (string) $notification->category,
            type: (string) $notification->type,
            title: (string) $notification->title,
            message: (string) $notification->message,
            actionUrl: $notification->action_url ? (string) $notification->action_url : null,
            userId: $notification->user_id ? (int) $notification->user_id : null,
            role: $notification->role ? (string) $notification->role : null,
            createdAt: $notification->created_at ? $notification->created_at->toIso8601String() : now()->toIso8601String(),
        );
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * Targets a user-specific private channel when userId is present to prevent leaking
     * private messages to all clinic staff. Otherwise broadcasts to the general clinic staff channel.
     */
    public function broadcastOn(): array
    {
        if ($this->userId !== null && $this->userId > 0) {
            return [
                new PrivateChannel("clinic.{$this->clinicId}.user.{$this->userId}.notifications"),
            ];
        }

        return [
            new PrivateChannel("clinic.{$this->clinicId}.notifications"),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    /**
     * Get the data to broadcast.
     *
     * Privacy-safe notification metadata for in-app staff bell toasts.
     */
    public function broadcastWith(): array
    {
        return [
            'notification_id' => $this->notificationId,
            'clinic_id' => $this->clinicId,
            'category' => $this->category,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'action_url' => $this->actionUrl,
            'user_id' => $this->userId,
            'role' => $this->role,
            'created_at' => $this->createdAt,
        ];
    }
}
