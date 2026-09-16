<?php

namespace App\Policies;

use App\Models\TreatmentRecord;
use App\Models\User;

class VaccinationRecordPolicy
{
    public function view(User $user, TreatmentRecord $record): bool
    {
        return $this->sameClinic($user, $record->clinic_id);
    }

    public function create(User $user): bool
    {
        return $user->is_active && in_array($user->role, ['developer', 'admin', 'treatment'], true);
    }

    public function delete(User $user, TreatmentRecord $record): bool
    {
        return $this->sameClinic($user, $record->clinic_id) && $user->isAdmin();
    }

    private function sameClinic(User $user, int|string|null $clinicId): bool
    {
        return $user->is_active && $clinicId !== null && (int) $user->clinic_id === (int) $clinicId;
    }
}
