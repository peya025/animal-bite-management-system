<?php

namespace App\Services\Mobile;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\PatientAccount;
use Illuminate\Validation\ValidationException;

class MobileClinicContextResolver
{
    public function resolve(PatientAccount $account, ?int $clinicId, ?int $patientId, ?int $appointmentId): int
    {
        if ($patientId !== null && $appointmentId !== null) {
            throw ValidationException::withMessages(['patient_id' => ['Select a patient or appointment, not both.']]);
        }

        if ($appointmentId !== null) {
            $patientIds = $account->patients()->pluck('patients.patient_id');
            $appointment = Appointment::query()->where('appointment_id', $appointmentId)
                ->where(function ($query) use ($account, $patientIds) {
                    $query->where('booked_by_account_id', $account->id)
                        ->orWhereIn('patient_id', $patientIds);
                })->firstOrFail();
            $resolved = (int) $appointment->clinic_id;
        } elseif ($patientId !== null) {
            $patient = $account->patients()->whereKey($patientId)->firstOrFail();
            $resolved = (int) $patient->clinic_id;
        } else {
            if ($clinicId === null) {
                throw ValidationException::withMessages(['clinic_id' => ['Select a clinic to set up a new profile.']]);
            }
            $resolved = (int) Clinic::query()->findOrFail($clinicId)->id;
        }

        if ($clinicId !== null && $clinicId !== $resolved) {
            throw ValidationException::withMessages(['clinic_id' => ['Clinic does not match the selected patient or appointment.']]);
        }

        return $resolved;
    }
}
