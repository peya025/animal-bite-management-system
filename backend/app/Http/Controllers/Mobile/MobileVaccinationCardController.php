<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\TagoloanTreatmentCard;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MobileVaccinationCardController extends Controller
{
    /**
     * Get official DOH-compliant digital vaccination card data for a patient
     */
    public function show(Request $request, int $patient)
    {
        $patientObj = $request->user()->patients()
            ->whereKey($patient)
            ->with(['details', 'clinic'])
            ->firstOrFail();

        // Ensure patient has a secure scannable card token
        if (!$patientObj->card_token) {
            $patientObj->card_token = 'vc_' . Str::random(32);
            $patientObj->saveQuietly();
        }

        $clinic = $patientObj->clinic ?? Clinic::find($patientObj->clinic_id);

        // Fetch Treatment Card details (Form 3)
        $treatmentCard = TagoloanTreatmentCard::where('patient_id', $patientObj->patient_id)
            ->latest()
            ->first();

        // Fetch Bite Incident
        $incident = $patientObj->biteIncidents()->latest('bite_date')->first();

        // Fetch all treatment / dose records (use latest per dose number)
        $treatmentRecords = $patientObj->treatmentRecords()
            ->whereNotNull('dose_number')
            ->latest('treatment_id')
            ->get()
            ->unique('dose_number')
            ->keyBy('dose_number');

        // Fetch all follow-up appointments (use latest per dose number)
        $appointments = \App\Models\Appointment::where('patient_id', $patientObj->patient_id)
            ->whereNotNull('dose_number')
            ->where('status', '!=', 'cancelled')
            ->latest('appointment_id')
            ->get()
            ->unique('dose_number')
            ->keyBy('dose_number');

        // Resolve Day 0 / Treatment start date
        $day0Record = $treatmentRecords->get(0);
        $day0Appt = $appointments->get(0);
        $day0Date = $day0Record?->treatment_date ?? $day0Record?->scheduled_date ?? $day0Appt?->scheduled_date ?? $day0Appt?->appointment_date ?? $treatmentCard?->card_date ?? $incident?->bite_date;

        // Map standard doses
        $standardDoses = [
            0   => ['name' => 'Day 0', 'offset' => 0],
            3   => ['name' => 'Day 3', 'offset' => 3],
            7   => ['name' => 'Day 7', 'offset' => 7],
            28  => ['name' => 'Day 28', 'offset' => 28],
            90  => ['name' => 'Booster 1', 'offset' => 90],
            365 => ['name' => 'Booster 2', 'offset' => 365],
        ];

        $dosesList = [];
        $completedDosesCount = 0;
        $nextScheduledDose = null;

        foreach ($standardDoses as $doseNum => $meta) {
            $period = $meta['name'];
            $offset = $meta['offset'];

            $record = $treatmentRecords->get($doseNum);
            $appt = $appointments->get($doseNum);

            $isCompleted = false;
            $status = 'pending';
            $scheduledDate = null;
            $administeredDate = null;
            $vaccineBrand = '—';
            $batchNo = '—';
            $route = 'IM';
            $remarks = null;
            $treatmentId = null;

            if ($record) {
                $treatmentId = $record->treatment_id;
                $isCompleted = ($record->status === 'completed' || !empty($record->treatment_date));
                $status = $isCompleted ? 'completed' : ($record->status === 'missed' ? 'missed' : 'scheduled');
                $administeredDate = $record->treatment_date ? Carbon::parse($record->treatment_date)->format('F j, Y') : ($isCompleted ? Carbon::parse($record->updated_at)->format('F j, Y') : null);
                $scheduledDate = $record->scheduled_date ? Carbon::parse($record->scheduled_date)->format('F j, Y') : ($day0Date ? Carbon::parse($day0Date)->addDays($offset)->format('F j, Y') : null);
                $vaccineBrand = $record->vaccine_brand ?: $record->vaccine_generic ?: 'Purified Vero Cell Rabies Vaccine (PVRV)';
                $batchNo = $record->batch_no ?: '—';
                $route = $record->route ?: 'IM';
                $remarks = $record->remarks;
            } elseif ($appt) {
                $isCompleted = ($appt->status === 'completed');
                $status = $isCompleted ? 'completed' : ($appt->status === 'missed' ? 'missed' : 'scheduled');
                $administeredDate = $isCompleted ? Carbon::parse($appt->updated_at)->format('F j, Y') : null;
                $scheduledDate = Carbon::parse($appt->scheduled_date ?? $appt->appointment_date)->format('F j, Y');
                $remarks = $appt->notes;
            } elseif ($day0Date) {
                $scheduledDate = Carbon::parse($day0Date)->addDays($offset)->format('F j, Y');
                $status = 'pending';
            }

            if ($isCompleted) {
                $completedDosesCount++;
            }

            if (!$isCompleted && !$nextScheduledDose && $scheduledDate) {
                $schedCarbon = Carbon::parse($scheduledDate);
                if ($schedCarbon->isFuture() || $schedCarbon->isToday()) {
                    $nextScheduledDose = [
                        'name' => $period,
                        'scheduled_date' => $scheduledDate,
                        'due_text' => $schedCarbon->isToday() ? 'Due today' : "Due in " . Carbon::today()->diffInDays($schedCarbon) . " days",
                    ];
                }
            }

            $dosesList[] = [
                'treatment_id' => $treatmentId,
                'period' => $period,
                'dose_number' => $doseNum,
                'scheduled_date' => $scheduledDate,
                'administered_date' => $administeredDate,
                'vaccine_brand' => $vaccineBrand,
                'batch_no' => $batchNo,
                'route' => $route,
                'status' => $status,
                'remarks' => $remarks,
            ];
        }

        $totalDoses = 4;
        $isAllCompleted = ($completedDosesCount >= $totalDoses && $totalDoses > 0);
        $cardStatus = $isAllCompleted ? 'COMPLETED' : (($completedDosesCount > 0 || $nextScheduledDose) ? 'ACTIVE' : 'PENDING');

        // Resolve clean exposure category, animal type, and dates
        $exposureCategory = $treatmentCard?->exposure_category ?: ($incident?->exposure_category ?: '—');
        $animalType = $treatmentCard?->animal_type ?: ($incident?->animal_type ?: '—');
        $exposureDate = $incident?->bite_date ? Carbon::parse($incident->bite_date)->format('F j, Y') : ($treatmentCard?->card_date ? Carbon::parse($treatmentCard->card_date)->format('F j, Y') : '—');
        $treatmentStartDate = $day0Date ? Carbon::parse($day0Date)->format('F j, Y') : ($treatmentCard?->card_date ? Carbon::parse($treatmentCard->card_date)->format('F j, Y') : '—');

        // Resolve dose progress label
        $doseLabel = $completedDosesCount > 0
            ? "{$completedDosesCount} of {$totalDoses} doses"
            : ($day0Date ? "0 of {$totalDoses} doses" : "Pending Day 0");

        // Base QR verification URL
        $qrPayload = url("/verify/card/{$patientObj->card_token}");

        return response()->json([
            'clinic' => [
                'name' => $clinic?->name ?? 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
                'doh_accreditation_no' => $clinic?->doh_accreditation_no ?? '—',
                'philhealth_accreditation_no' => $clinic?->philhealth_accreditation_no ?? '—',
                'address' => $clinic?->address ?? 'Poblacion, Tagoloan, Misamis Oriental',
                'contact_number' => $clinic?->contact_number ?? '—',
            ],
            'patient' => [
                'patient_id' => $patientObj->patient_id,
                'patient_number' => $patientObj->patient_number ?: 'Pending',
                'full_name' => "{$patientObj->last_name}, {$patientObj->first_name}" . ($patientObj->middle_name ? " {$patientObj->middle_name}" : ''),
                'first_name' => $patientObj->first_name,
                'last_name' => $patientObj->last_name,
                'age' => $patientObj->age,
                'gender' => $patientObj->gender ? ucfirst((string)$patientObj->gender) : '—',
                'date_of_birth' => $patientObj->date_of_birth ? Carbon::parse($patientObj->date_of_birth)->format('F j, Y') : '—',
                'philhealth_no' => $patientObj->details?->philhealth_no ?: '—',
                'philhealth_status' => $patientObj->details?->philhealth_status ?: '—',
                'address' => $patientObj->address ?: '—',
            ],
            'card' => [
                'registry_no' => $treatmentCard?->registry_no ?? $incident?->case_number ?? '—',
                'hospital_no' => $treatmentCard?->hospital_no ?? $patientObj->details?->hospital_no ?? '—',
                'exposure_category' => $exposureCategory,
                'animal_type' => $animalType,
                'date_of_exposure' => $exposureDate,
                'date_treatment_started' => $treatmentStartDate,
                'place_of_exposure' => $incident?->bite_place ?: '—',
            ],
            'card_token' => $patientObj->card_token,
            'qr_payload' => $qrPayload,
            'status' => $cardStatus,
            'progress' => [
                'completed_doses' => $completedDosesCount,
                'total_doses' => $totalDoses,
                'dose_label' => $doseLabel,
                'next_dose' => $nextScheduledDose,
            ],
            'doses' => $dosesList,
        ]);
    }
}

