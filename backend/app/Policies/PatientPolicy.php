<?php

namespace App\Policies;

use App\Models\Patient;
use App\Models\PatientAccount;
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

    public function printEnrolment(User|PatientAccount $user, Patient $patient): bool
    {
        // Enrolment forms are staff documents. Patient accounts use only their
        // dedicated mobile APIs and cannot print any patient's enrolment form.
        if ($user instanceof PatientAccount) {
            return false;
        }

        return $this->sameClinic($user, $patient)
            && in_array($user->role, ['admin', 'registration', 'triage', 'treatment'], true);
    }

    private function sameClinic(User $user, ?Patient $patient): bool
    {
        return $user->is_active
            && $user->clinic_id !== null
            && ($patient === null || (int) $user->clinic_id === (int) $patient->clinic_id);
    }
}
