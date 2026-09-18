<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VaccineInventory;

class VaccineInventoryPolicy
{
    public function view(User $user, VaccineInventory $inventory): bool
    {
        return $this->sameClinic($user, $inventory->clinic_id);
    }

    public function update(User $user, VaccineInventory $inventory): bool
    {
        return $this->sameClinic($user, $inventory->clinic_id)
            && in_array($user->role, ['developer', 'admin', 'treatment'], true);
    }

    public function delete(User $user, VaccineInventory $inventory): bool
    {
        return $this->sameClinic($user, $inventory->clinic_id) && $user->isAdmin();
    }

    private function sameClinic(User $user, int|string|null $clinicId): bool
    {
        return $user->is_active && $clinicId !== null && (int) $user->clinic_id === (int) $clinicId;
    }
}
