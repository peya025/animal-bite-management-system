<?php

namespace App\Policies;

use App\Models\TreatmentRecord;
use App\Models\User;

class TreatmentRecordPolicy
{
    public function view(User $user, TreatmentRecord $record): bool
    {
        return $this->sameClinic($user, $record->clinic_id);
    }

    public function create(User $user): bool
    {
        return $user->is_active && in_array($user->role, ['developer', 'admin', 'triage'], true);
    }

    public function update(User $user, TreatmentRecord $record): bool
    {
        return $this->sameClinic($user, $record->clinic_id)
            && in_array($user->role, ['developer', 'admin', 'triage', 'treatment'], true);
    }

    private function sameClinic(User $user, int|string|null $clinicId): bool
    {
        return $user->is_active && $clinicId !== null && (int) $user->clinic_id === (int) $clinicId;
    }
}
