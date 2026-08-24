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

        // Fetch all treatment / dose records
        $treatmentRecords = $patientObj->treatmentRecords()
            ->whereNotNull('dose_number')
            ->orderBy('dose_number', 'asc')
            ->orderBy('scheduled_date', 'asc')
            ->get();

        // Map standard doses
        $standardDoses = [
            0   => 'Day 0',
            3   => 'Day 3',
            7   => 'Day 7',
            28  => 'Day 28',
        ];

        $dosesList = [];
        $completedDosesCount = 0;
        $nextScheduledDose = null;

        foreach ($treatmentRecords as $record) {
            $period = $standardDoses[$record->dose_number] ?? ($record->dose_number >= 90 ? "Booster" : "Dose {$record->dose_number}");
            $isCompleted = ($record->status === 'completed');
            if ($isCompleted) {
                $completedDosesCount++;
            }

            $effectiveDate = $record->treatment_date ? Carbon::parse($record->treatment_date) : ($record->scheduled_date ? Carbon::parse($record->scheduled_date) : null);

            $status = $isCompleted ? 'completed' : ($record->status === 'missed' ? 'missed' : 'scheduled');

            if (!$isCompleted && !$nextScheduledDose && $record->scheduled_date) {
                $schedDate = Carbon::parse($record->scheduled_date);
                if ($schedDate->isFuture() || $schedDate->isToday()) {
                    $nextScheduledDose = [
                        'name' => $period,
                        'scheduled_date' => $schedDate->format('F j, Y'),
                        'due_text' => $schedDate->isToday() ? 'Due today' : "Due in " . Carbon::today()->diffInDays($schedDate) . " days",
                    ];
                }
            }

            $dosesList[] = [
                'treatment_id' => $record->treatment_id,
                'period' => $period,
                'dose_number' => $record->dose_number,
                'scheduled_date' => $record->scheduled_date ? Carbon::parse($record->scheduled_date)->format('F j, Y') : null,
                'administered_date' => $record->treatment_date ? Carbon::parse($record->treatment_date)->format('F j, Y') : ($isCompleted ? Carbon::parse($record->updated_at)->format('F j, Y') : null),
                'vaccine_brand' => $record->vaccine_brand ?: $record->vaccine_generic ?: 'Purified Vero Cell Rabies Vaccine (PVRV)',
                'batch_no' => $record->batch_no ?: 'N/A',
                'route' => $record->route ?: 'ID',
                'status' => $status,
                'remarks' => $record->remarks,
            ];
        }

        // If no doses recorded yet, show clean pending placeholders without fake dates
        if (empty($dosesList)) {
            $dosesList = [
                ['period' => 'Day 0', 'dose_number' => 0, 'scheduled_date' => null, 'administered_date' => null, 'vaccine_brand' => '—', 'batch_no' => '—', 'route' => '—', 'status' => 'pending'],
                ['period' => 'Day 3', 'dose_number' => 3, 'scheduled_date' => null, 'administered_date' => null, 'vaccine_brand' => '—', 'batch_no' => '—', 'route' => '—', 'status' => 'pending'],
                ['period' => 'Day 7', 'dose_number' => 7, 'scheduled_date' => null, 'administered_date' => null, 'vaccine_brand' => '—', 'batch_no' => '—', 'route' => '—', 'status' => 'pending'],
                ['period' => 'Day 28', 'dose_number' => 28, 'scheduled_date' => null, 'administered_date' => null, 'vaccine_brand' => '—', 'batch_no' => '—', 'route' => '—', 'status' => 'pending'],
            ];
        }

        $totalDoses = 4;
        $isAllCompleted = ($completedDosesCount >= $totalDoses && $totalDoses > 0);
        $cardStatus = $isAllCompleted ? 'COMPLETED' : (($completedDosesCount > 0 || $nextScheduledDose) ? 'ACTIVE' : 'PENDING');

        // Resolve clean exposure category & animal type
        $exposureCategory = $treatmentCard?->exposure_category ?: ($incident?->exposure_category ?: '—');
        $animalType = $treatmentCard?->animal_type ?: ($incident?->animal_type ?: '—');
        $exposureDate = $treatmentCard?->card_date ? Carbon::parse($treatmentCard->card_date)->format('F j, Y') : ($incident?->bite_date ? Carbon::parse($incident->bite_date)->format('F j, Y') : '—');

        // Resolve dose progress label
        $doseLabel = $completedDosesCount > 0
            ? "{$completedDosesCount} of {$totalDoses} doses"
            : ($treatmentRecords->isNotEmpty() ? "0 of {$totalDoses} doses" : "Pending Day 0");

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

