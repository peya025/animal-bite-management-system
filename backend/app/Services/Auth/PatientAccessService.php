<?php

namespace App\Services\Auth;

use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\User;

class PatientAccessService
{
    /**
     * Verify a patient portal account's access to a patient profile.
     *
     * @param Patient $patient
     * @param PatientAccount $account
     * @param User $staff
     * @return void
     */
    public function verify(Patient $patient, PatientAccount $account, User $staff): void
    {
        abort_unless($patient->clinic_id === $staff->clinic_id, 404);
        $patient->accounts()->whereKey($account->id)->firstOrFail();

        $patient->accounts()->updateExistingPivot($account->id, [
            'status' => 'verified',
            'verified_by' => $staff->id,
            'verified_at' => now(),
        ]);
    }

    /**
     * Reject a patient portal account's access to a patient profile.
     *
     * @param Patient $patient
     * @param PatientAccount $account
     * @param User $staff
     * @return void
     */
    public function reject(Patient $patient, PatientAccount $account, User $staff): void
    {
        abort_unless($patient->clinic_id === $staff->clinic_id, 404);
        $patient->accounts()->whereKey($account->id)->firstOrFail();

        $patient->accounts()->updateExistingPivot($account->id, [
            'status' => 'rejected',
            'verified_by' => $staff->id,
            'verified_at' => now(),
        ]);
    }
}
