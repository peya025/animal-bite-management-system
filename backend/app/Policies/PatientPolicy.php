<?php

namespace App\Policies;

use App\Models\Patient;
use App\Models\User;

class PatientPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->sameClinic($user, null);
    }

    public function view(User $user, Patient $patient): bool
    {
        return $this->sameClinic($user, $patient);
    }

    public function update(User $user, Patient $patient): bool
    {
        return $this->sameClinic($user, $patient)
            && in_array($user->role, ['developer', 'admin', 'registration', 'triage', 'treatment'], true);
    }

    public function delete(User $user, Patient $patient): bool
    {
        return $this->sameClinic($user, $patient) && $user->isAdmin();
    }

    private function sameClinic(User $user, ?Patient $patient): bool
    {
        return $user->is_active
            && $user->clinic_id !== null
            && ($patient === null || (int) $user->clinic_id === (int) $patient->clinic_id);
    }
}
