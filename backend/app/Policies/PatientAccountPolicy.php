<?php

namespace App\Policies;

use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\User;

class PatientAccountPolicy
{
    public function view(User $user, PatientAccount $account): bool
    {
        if (! $user->is_active || $user->clinic_id === null) {
            return false;
        }

        return $account->patients()->where('patients.clinic_id', $user->clinic_id)->exists();
    }

    public function viewPatient(User $user, Patient $patient): bool
    {
        return $user->is_active && (int) $user->clinic_id === (int) $patient->clinic_id;
    }
}
