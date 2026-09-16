<?php

namespace App\Policies;

use App\Models\Queue;
use App\Models\User;

class QueuePolicy
{
    public function view(User $user, Queue $queue): bool
    {
        return $this->sameClinic($user, $queue->clinic_id);
    }

    public function create(User $user): bool
    {
        return $user->is_active && in_array($user->role, ['developer', 'admin', 'registration'], true);
    }

    public function handle(User $user, Queue $queue): bool
    {
        return $this->sameClinic($user, $queue->clinic_id)
            && in_array($user->role, ['developer', 'admin', 'triage'], true);
    }

    private function sameClinic(User $user, int|string|null $clinicId): bool
    {
        return $user->is_active && $clinicId !== null && (int) $user->clinic_id === (int) $clinicId;
    }
}
