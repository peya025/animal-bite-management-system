<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TagoloanTreatmentCard;
use Carbon\Carbon;
use Illuminate\Support\Str;

/**
 * Assembles the full DOH-compliant digital vaccination card payload for the
 * Flutter mobile app.  No HTTP concerns — pure domain logic extracted from
 * MobileVaccinationCardController::show().
 */
class MobileVaccinationCardService
{
    /**
     * Build and return the complete vaccination card array for the given patient.
     *
     * Returns null when the patient is not found or the account linkage is not
     * yet verified (callers should map null to a 404 response).
     *
     * @return array{clinic:array,patient:array,card:array,card_token:string,qr_payload:string,status:string,has_booster:bool,progress:array,doses:array}|null
     */
    public function buildCard(Patient $patientObj): ?array
    {
        // Ensure the patient has a secure scannable card token
        if (!$patientObj->card_token) {
            $patientObj->card_token = 'vc_' . Str::random(32);
            $patientObj->saveQuietly();
        }

        $clinic = $patientObj->clinic ?? Clinic::find($patientObj->clinic_id);

        // Fetch Treatment Card details (Form 3)
        $treatmentCard = TagoloanTreatmentCard::where('patient_id', $patientObj->patient_id)
            ->latest()
            ->first();

        // Fetch the most recent bite incident
        $incident = $patientObj->biteIncidents()->latest('bite_date')->first();

        // Latest treatment / dose records (one per dose_number)
        $treatmentRecords = $patientObj->treatmentRecords()
            ->whereNotNull('dose_number')
            ->latest('treatment_id')
            ->get()
            ->unique('dose_number')
            ->keyBy('dose_number');

        // Latest follow-up appointments (one per dose_number)
        $appointments = Appointment::where('patient_id', $patientObj->patient_id)
            ->whereNotNull('dose_number')
            ->where('status', '!=', 'cancelled')
            ->latest('appointment_id')
            ->get()
            ->unique('dose_number')
            ->keyBy('dose_number');

        // Resolve Day 0 / Treatment start date
        $day0Record = $treatmentRecords->get(0);
        $day0Appt   = $appointments->get(0);
        $day0Date   = $day0Record?->treatment_date
            ?? $day0Record?->scheduled_date
            ?? $day0Appt?->scheduled_date
            ?? $day0Appt?->appointment_date
            ?? $treatmentCard?->card_date
            ?? $incident?->bite_date;

        // Detect active booster protocol
        // Legacy auto-scheduled routine placeholders do NOT activate the booster timeline.
        $hasBoosterRecord = $treatmentRecords->has(90) || $treatmentRecords->has(365) ||
            $treatmentRecords->contains(function ($r) {
                return ($r->dose_number >= 90 && ($r->status === 'completed' || !empty($r->treatment_date))) ||
                       (str_contains(strtolower($r->remarks ?? ''), 'booster') &&
                        !str_contains(strtolower($r->remarks ?? ''), 'auto-scheduled'));
            });

        $hasBoosterAppt = $appointments->contains(function ($a) {
            $notes = strtolower($a->notes ?? '');
            $type  = strtolower($a->appointment_type ?? '');
            return $type === 'booster'
                || str_contains($notes, 'booster re-exposure')
                || (in_array($a->dose_number, [90, 365]) && !str_contains($notes, 'auto-scheduled'));
        });

        $isBoosterEpisode = $treatmentCard &&
            ($treatmentCard->is_booster || strtolower($treatmentCard->protocol ?? '') === 'booster');

        $hasBooster = $hasBoosterRecord || $hasBoosterAppt || $isBoosterEpisode;

        // Day 28 only shown when an actual completed record exists for it
        $hasDay28 = $treatmentRecords->has(28) &&
            ($treatmentRecords->get(28)?->status === 'completed' ||
             !empty($treatmentRecords->get(28)?->treatment_date));

        // Build the applicable dose map (DOH 2-site ID primary: Day 0, 3, 7)
        $standardDoses = [
            0 => ['name' => 'Day 0', 'offset' => 0],
            3 => ['name' => 'Day 3', 'offset' => 3],
            7 => ['name' => 'Day 7', 'offset' => 7],
        ];

        if ($hasDay28) {
            $standardDoses[28] = ['name' => 'Day 28', 'offset' => 28];
        }
        if ($hasBooster) {
            $standardDoses[90]  = ['name' => 'Booster 1', 'offset' => 90];
            $standardDoses[365] = ['name' => 'Booster 2', 'offset' => 365];
        }

        $dosesList           = [];
        $completedDosesCount = 0;
        $nextScheduledDose   = null;

        foreach ($standardDoses as $doseNum => $meta) {
            $period = $meta['name'];
            $offset = $meta['offset'];

            $record = $treatmentRecords->get($doseNum);
            $appt   = $appointments->get($doseNum);

            $isCompleted     = false;
            $status          = 'pending';
            $scheduledDate   = null;
            $administeredDate = null;
            $vaccineBrand    = '—';
            $batchNo         = '—';
            $route           = 'ID';
            $remarks         = null;
            $treatmentId     = null;

            if ($record) {
                $treatmentId      = $record->treatment_id;
                $isCompleted      = ($record->status === 'completed' || !empty($record->treatment_date));
                $status           = $isCompleted
                    ? 'completed'
                    : ($record->status === 'missed' ? 'missed' : 'scheduled');
                $administeredDate = $record->treatment_date
                    ? Carbon::parse($record->treatment_date)->format('F j, Y')
                    : ($isCompleted ? Carbon::parse($record->updated_at)->format('F j, Y') : null);
                $scheduledDate    = $record->scheduled_date
                    ? Carbon::parse($record->scheduled_date)->format('F j, Y')
                    : ($day0Date
                        ? Carbon::parse($day0Date)->addDays($offset)->format('F j, Y')
                        : null);
                $vaccineBrand     = $record->vaccine_brand
                    ?: $record->vaccine_generic
                    ?: 'Purified Vero Cell Rabies Vaccine (PVRV)';
                $batchNo          = $record->batch_no ?: '—';
                $route            = $record->route ?: 'ID';
                $remarks          = $record->remarks;
            } elseif ($appt) {
                $isCompleted      = ($appt->status === 'completed');
                $status           = $isCompleted
                    ? 'completed'
                    : ($appt->status === 'missed' ? 'missed' : 'scheduled');
                $administeredDate = $isCompleted
                    ? Carbon::parse($appt->updated_at)->format('F j, Y')
                    : null;
                $scheduledDate    = Carbon::parse(
                    $appt->scheduled_date ?? $appt->appointment_date
                )->format('F j, Y');
                $remarks = $appt->notes;
            } elseif ($day0Date) {
                $scheduledDate = Carbon::parse($day0Date)->addDays($offset)->format('F j, Y');
                $status        = 'pending';
            }

            if ($isCompleted) {
                $completedDosesCount++;
            }

            if (!$isCompleted && !$nextScheduledDose && $scheduledDate) {
                $schedCarbon = Carbon::parse($scheduledDate);
                if ($schedCarbon->isFuture() || $schedCarbon->isToday()) {
                    $nextScheduledDose = [
                        'name'           => $period,
                        'scheduled_date' => $scheduledDate,
                        'due_text'       => $schedCarbon->isToday()
                            ? 'Due today'
                            : 'Due in ' . Carbon::today()->diffInDays($schedCarbon) . ' days',
                    ];
                }
            }

            $dosesList[] = [
                'treatment_id'      => $treatmentId,
                'period'            => $period,
                'dose_number'       => $doseNum,
                'scheduled_date'    => $scheduledDate,
                'administered_date' => $administeredDate,
                'vaccine_brand'     => $vaccineBrand,
                'batch_no'          => $batchNo,
                'route'             => $route,
                'status'            => $status,
                'remarks'           => $remarks,
            ];
        }

        $totalDoses     = count($standardDoses);
        $isAllCompleted = $completedDosesCount >= $totalDoses && $totalDoses > 0;
        $cardStatus     = $isAllCompleted
            ? 'COMPLETED'
            : (($completedDosesCount > 0 || $nextScheduledDose) ? 'ACTIVE' : 'PENDING');

        $exposureCategory   = $treatmentCard?->exposure_category ?: ($incident?->exposure_category ?: '—');
        $animalType         = $treatmentCard?->animal_type ?: ($incident?->animal_type ?: '—');
        $exposureDate       = $incident?->bite_date
            ? Carbon::parse($incident->bite_date)->format('F j, Y')
            : ($treatmentCard?->card_date
                ? Carbon::parse($treatmentCard->card_date)->format('F j, Y')
                : '—');
        $treatmentStartDate = $day0Date
            ? Carbon::parse($day0Date)->format('F j, Y')
            : ($treatmentCard?->card_date
                ? Carbon::parse($treatmentCard->card_date)->format('F j, Y')
                : '—');

        $doseLabel = $completedDosesCount > 0
            ? "{$completedDosesCount} of {$totalDoses} doses"
            : ($day0Date ? "0 of {$totalDoses} doses" : 'Pending Day 0');

        $qrPayload = url("/verify/card/{$patientObj->card_token}");

        return [
            'clinic' => [
                'name'                          => $clinic?->name ?? 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
                'doh_accreditation_no'          => $clinic?->doh_accreditation_no ?? '—',
                'philhealth_accreditation_no'   => $clinic?->philhealth_accreditation_no ?? '—',
                'address'                       => $clinic?->address ?? 'Poblacion, Tagoloan, Misamis Oriental',
                'contact_number'                => $clinic?->contact_number ?? '—',
            ],
            'patient' => [
                'patient_id'      => $patientObj->patient_id,
                'patient_number'  => $patientObj->patient_number ?: 'Pending',
                'full_name'       => "{$patientObj->last_name}, {$patientObj->first_name}"
                    . ($patientObj->middle_name ? " {$patientObj->middle_name}" : ''),
                'first_name'      => $patientObj->first_name,
                'last_name'       => $patientObj->last_name,
                'age'             => $patientObj->age,
                'gender'          => $patientObj->gender ? ucfirst((string) $patientObj->gender) : '—',
                'date_of_birth'   => $patientObj->date_of_birth
                    ? Carbon::parse($patientObj->date_of_birth)->format('F j, Y')
                    : '—',
                'philhealth_no'     => $patientObj->details?->philhealth_no ?: '—',
                'philhealth_status' => $patientObj->details?->philhealth_status ?: '—',
                'address'           => $patientObj->address ?: '—',
            ],
            'card' => [
                'registry_no'           => $treatmentCard?->registry_no ?? $incident?->case_number ?? '—',
                'hospital_no'           => $treatmentCard?->hospital_no ?? $patientObj->details?->hospital_no ?? '—',
                'exposure_category'     => $exposureCategory,
                'animal_type'           => $animalType,
                'date_of_exposure'      => $exposureDate,
                'date_treatment_started' => $treatmentStartDate,
                'place_of_exposure'     => $incident?->bite_place ?: '—',
            ],
            'card_token' => $patientObj->card_token,
            'qr_payload' => $qrPayload,
            'status'     => $cardStatus,
            'has_booster' => $hasBooster,
            'progress' => [
                'completed_doses' => $completedDosesCount,
                'total_doses'     => $totalDoses,
                'dose_label'      => $doseLabel,
                'next_dose'       => $nextScheduledDose,
                'has_booster'     => $hasBooster,
            ],
            'doses' => $dosesList,
        ];
    }

    /**
     * Attempt to auto-verify the patient account linkage when a completed
     * treatment dose exists (implicit identity confirmation by the clinic).
     * Returns the resolved pivot status string after the attempt.
     */
    public function attemptAutoVerify(Patient $patientObj): string
    {
        $pivotStatus = $patientObj->pivot?->status ?? 'pending';

        if ($pivotStatus === 'verified') {
            return $pivotStatus;
        }

        $hasAdministeredDose = $patientObj->treatmentRecords()
            ->where(function ($q) {
                $q->where('status', 'completed')
                  ->orWhereNotNull('treatment_date');
            })
            ->exists();

        if ($hasAdministeredDose && $patientObj->pivot) {
            $patientObj->pivot->update([
                'status'      => 'verified',
                'verified_at' => now(),
            ]);
            return 'verified';
        }

        return $pivotStatus;
    }
}
