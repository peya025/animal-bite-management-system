<?php

namespace App\Http\Controllers;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TagoloanTreatmentCard;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TagoloanTreatmentCardController extends Controller
{
    /**
     * Display a listing of treatment cards
     */
    public function index(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $query = TagoloanTreatmentCard::with(['patient', 'biteIncident', 'createdBy'])
            ->where('clinic_id', $clinicId)
            ->orderBy('created_at', 'desc');

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('registry_no', 'like', "%{$search}%")
                  ->orWhere('hospital_no', 'like', "%{$search}%")
                  ->orWhereHas('patient', function ($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('patient_number', 'like', "%{$search}%");
                  });
            });
        }

        $cards = $query->paginate($request->get('per_page', 20));

        return response()->json($cards);
    }

    /**
     * Smart pre-fill endpoint for Tagoloan Treatment Card
     */
    public function getPatientCardData(Request $request, int $patientId)
    {
        $clinicId = $request->user()->clinic_id;

        $clinic = Clinic::find($clinicId);
        $patient = Patient::with(['details'])->where('clinic_id', $clinicId)->findOrFail($patientId);
        $requestedBiteId = $request->query('bite_id');
        $latestBite = null;
        if ($requestedBiteId) {
            $latestBite = BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $requestedBiteId)
                ->firstOrFail();
        } else {
            $latestBite = BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->orderBy('bite_date', 'desc')
                ->latest('bite_id')
                ->first();
        }
        $latestBite?->loadMissing(['intake', 'treatmentPlan']);

        $latestIntake = $latestBite?->intake;
        $treatmentRecords = TreatmentRecord::with('administeredBy')
            ->where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->when($latestBite, fn($q) => $q->where('bite_id', $latestBite->bite_id))
            ->orderBy('dose_number', 'asc')
            ->get();

        $existingCard = TagoloanTreatmentCard::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->when($latestBite, fn($q) => $q->where('bite_id', $latestBite->bite_id))
            ->latest()
            ->first();

        $latestConsultation = null;
        if ($latestBite) {
            $latestConsultation = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $latestBite->bite_id)
                ->whereNotNull('nature_of_visit')
                ->orderBy('consultation_date', 'desc')
                ->orderBy('consultation_time', 'desc')
                ->first();
        }
        $planAllowsTreatment = $latestBite
            && $latestBite->treatmentPlan
            && $latestBite->treatmentPlan->status === 'approved'
            && in_array($latestBite->treatmentPlan->plan_type, ['full_pep', 'single_booster', 'two_dose_booster'], true);
        $form3Ready = (bool) ($latestBite
            && $latestBite->confirmed_at
            && $latestConsultation
            && $planAllowsTreatment);

        // Form 3 only consumes clinician-confirmed Form 2 data. Raw intake is
        // returned separately for provenance and is never promoted implicitly.
        $biteData = null;
        if ($latestBite) {
            $biteData = [
                'bite_id' => $latestBite->bite_id,
                'case_number' => $latestBite->case_number,
                'bite_date' => $latestBite->bite_date ? Carbon::parse($latestBite->bite_date)->format('Y-m-d') : null,
                'bite_place' => $latestBite->bite_place,
                'animal_type' => $latestBite->animal_type,
                'animal_status' => $latestBite->animal_status,
                'animal_type_others' => $latestBite->animal_type_others,
                'referred_from' => $latestBite->referred_from,
                'mode_of_exposure' => $latestBite->exposure_mode,
                'exposure_type' => $latestBite->exposure_type,
                'exposure_category' => match ($latestBite->severity) {
                    'minor' => 'I',
                    'moderate' => 'II',
                    'severe' => 'III',
                    default => null,
                },
                'severity' => $latestBite->severity,
                'site_washed' => $latestBite->site_washed,
                'body_part_exposed' => $latestBite->body_part_exposed ?? $latestBite->site_number,
                'body_part_detail' => $latestBite->site_number,
                'wound_description' => $latestBite->wound_description,
                'episode_number' => $latestBite->episode_number,
                'episode_type' => $latestBite->episode_type,
            ];
        }

        return response()->json([
            'clinic' => [
                'name' => $clinic->name ?? 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
                'hospital_no' => $clinic->hospital_no ?? null,
                'doh_accreditation_no' => $clinic->doh_accreditation_no ?? '2022-10-037',
                'philhealth_accreditation_no' => $clinic->philhealth_accreditation_no ?? 'B10034377',
            ],
            'patient' => [
                'patient_id' => $patient->patient_id,
                'patient_number' => $patient->patient_number,
                'full_name' => "{$patient->last_name}, {$patient->first_name} {$patient->middle_name}",
                'first_name' => $patient->first_name,
                'last_name' => $patient->last_name,
                'age' => $patient->age,
                'date_of_birth' => $patient->date_of_birth ? Carbon::parse($patient->date_of_birth)->format('Y-m-d') : null,
                'gender' => $patient->gender,
                'address' => $patient->address,
                'philhealth_no' => $patient->details->philhealth_no ?? null,
                'philhealth_status' => $patient->details->philhealth_status ?? 'member',
                'hospital_no' => $patient->details->hospital_no ?? null,
            ],
            'bite_incident' => $biteData,
            'patient_reported_intake' => $latestIntake,
            'form3_ready' => $form3Ready,
            'form3_block_reason' => $form3Ready
                ? null
                : 'Form 3 is available after a Doctor confirms Form 2 and approves a vaccine treatment plan.',
            'existing_card' => $existingCard,
            'latest_consultation' => $latestConsultation,
            'treatment_records' => $treatmentRecords,
        ]);
    }

    /**
     * Store or Update a Tagoloan Treatment Card
     */
    public function store(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,patient_id',
            'bite_id' => 'required|exists:bite_incidents,bite_id',
            'card_date' => 'required|date',
            'registry_no' => 'nullable|string|max:100',
            'hospital_no' => 'nullable|string|max:100',
            'referred_by' => 'nullable|string|max:255',
            'exposure_category' => 'nullable|in:I,II,III',
            'date_of_exposure' => 'nullable|date|before_or_equal:today',
            'place_of_exposure' => 'nullable|string|max:255',
            'mode_of_exposure' => 'nullable|in:nibbling_uncovered_skin,nibbling_broken_skin,scratch_abrasion,transdermal_bite,handling_ingestion_raw_meat',
            'body_part_exposed' => 'nullable|string|max:255',
            'body_part_detail' => 'nullable|string|max:255',
            'animal_type' => 'nullable|string|max:100',
            'animal_type_others' => 'nullable|required_if:animal_type,other|string|max:255',
            'past_bite_history' => 'boolean',
            'past_bite_dates' => 'nullable|string|max:255',
            'past_pep_completed' => 'boolean',
            'icd10_code' => 'nullable|string|max:50',
        ]);

        $incident = BiteIncident::where('clinic_id', $clinicId)
            ->where('patient_id', $validated['patient_id'])
            ->where('bite_id', $validated['bite_id'])
            ->first();
        $plan = TreatmentPlan::where('clinic_id', $clinicId)
            ->where('bite_id', $validated['bite_id'])
            ->first();
        $hasConsultation = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $validated['patient_id'])
            ->where('bite_id', $validated['bite_id'])
            ->whereNull('dose_number')
            ->where('status', 'completed')
            ->exists();

        if (!$incident || !$incident->confirmed_at || !$hasConsultation
            || !$plan || $plan->status !== 'approved'
            || !in_array($plan->plan_type, ['full_pep', 'single_booster', 'two_dose_booster'], true)) {
            return response()->json([
                'message' => 'Form 3 cannot be saved until a Doctor confirms Form 2 and approves a vaccine treatment plan for this episode.',
            ], 422);
        }

        $severity = match ($validated['exposure_category'] ?? null) {
            'I' => 'minor',
            'II' => 'moderate',
            'III' => 'severe',
            default => null,
        };
        $exposureType = match ($validated['mode_of_exposure'] ?? null) {
            'nibbling_uncovered_skin', 'nibbling_broken_skin' => 'lick',
            'scratch_abrasion' => 'scratch',
            'transdermal_bite' => 'bite',
            'handling_ingestion_raw_meat' => 'other',
            default => null,
        };
        $animalType = strtolower(trim((string) ($validated['animal_type'] ?? '')));
        $animalTypeOther = trim((string) ($validated['animal_type_others'] ?? ''));
        if ($animalType !== '' && !in_array($animalType, ['dog', 'cat', 'other'], true)) {
            $animalTypeOther = $animalTypeOther ?: $animalType;
            $animalType = 'other';
        }

        $incident->update(array_filter([
            'bite_date' => $validated['date_of_exposure'] ?? null,
            'bite_place' => $validated['place_of_exposure'] ?? null,
            'severity' => $severity,
            'exposure_mode' => $validated['mode_of_exposure'] ?? null,
            'exposure_type' => $exposureType,
            'body_part_exposed' => $validated['body_part_exposed'] ?? null,
            'site_number' => $validated['body_part_detail'] ?? null,
            'animal_type' => $animalType ?: null,
            'animal_type_others' => $animalType === 'other' ? ($animalTypeOther ?: null) : null,
        ], fn ($value) => $value !== null && $value !== ''));
        $incident->loadMissing('intake');
        $incident->intake?->update([
            'clinically_reviewed_by' => $request->user()->id,
            'clinically_reviewed_at' => now(),
        ]);
        $incident->refresh();

        $card = TagoloanTreatmentCard::updateOrCreate(
            [
                'clinic_id' => $clinicId,
                'patient_id' => $validated['patient_id'],
                'bite_id' => $validated['bite_id'],
            ],
            array_merge($validated, [
                'clinic_id' => $clinicId,
                'exposure_category' => match ($incident->severity) {
                    'minor' => 'I',
                    'moderate' => 'II',
                    'severe' => 'III',
                    default => null,
                },
                'mode_of_exposure' => $incident->exposure_mode,
                'body_part_exposed' => $incident->body_part_exposed ?: $incident->site_number,
                'animal_type' => $incident->animal_type,
                'animal_type_others' => $incident->animal_type_others,
                'created_by' => $request->user()->id,
            ])
        );

        // Update hospital_no in patient_details if provided
        $patient = Patient::with('details')->find($validated['patient_id']);
        if (!empty($validated['hospital_no']) && $patient && $patient->details) {
            $patient->details->update(['hospital_no' => $validated['hospital_no']]);
        }

        // Form 3 keeps the nurse-verified episode and treatment card synchronized.
        \Illuminate\Support\Facades\Cache::forget("web:bite-cases:map-data:clinic:{$clinicId}");

        return response()->json([
            'message' => 'Tagoloan Treatment Card saved successfully',
            'card' => $card->load(['patient', 'biteIncident', 'createdBy']),
        ], 200);
    }

    /**
     * Show a single treatment card
     */
    public function show(Request $request, int $id)
    {
        $clinicId = $request->user()->clinic_id;

        $card = TagoloanTreatmentCard::with(['patient.details', 'biteIncident', 'createdBy'])
            ->where('clinic_id', $clinicId)
            ->findOrFail($id);

        return response()->json($card);
    }
}
