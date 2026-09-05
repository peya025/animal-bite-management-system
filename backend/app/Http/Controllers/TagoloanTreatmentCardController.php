<?php

namespace App\Http\Controllers;

use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TagoloanTreatmentCard;
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
        $latestBite = BiteIncident::where('clinic_id', $clinicId)->where('patient_id', $patientId)->orderBy('bite_date', 'desc')->first();
        $latestIntake = BiteIncidentIntake::where('clinic_id', $clinicId)->where('patient_id', $patientId)->latest()->first();
        $treatmentRecords = TreatmentRecord::with('administeredBy')
            ->where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->orderBy('dose_number', 'asc')
            ->get();
        $existingCard = TagoloanTreatmentCard::where('clinic_id', $clinicId)->where('patient_id', $patientId)->latest()->first();
        $latestConsultation = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->whereNotNull('nature_of_visit')
            ->orderBy('consultation_date', 'desc')
            ->orderBy('consultation_time', 'desc')
            ->first();

        // Resolve incident details from bite incident or mobile intake fallback
        $biteData = null;
        if ($latestBite) {
            $biteData = [
                'bite_id' => $latestBite->bite_id,
                'case_number' => $latestBite->case_number,
                'bite_date' => $latestBite->bite_date ? Carbon::parse($latestBite->bite_date)->format('Y-m-d') : null,
                'bite_place' => $latestBite->bite_place,
                'animal_type' => $latestBite->animal_type,
                'animal_type_others' => null,
                'referred_from' => $latestBite->referred_from,
                'mode_of_exposure' => $latestIntake?->exposure_type,
                'body_part_exposed' => $latestIntake?->body_part_exposed,
            ];
        } elseif ($latestIntake) {
            $biteData = [
                'bite_id' => $latestIntake->bite_id,
                'case_number' => null,
                'bite_date' => $latestIntake->bite_date ? Carbon::parse($latestIntake->bite_date)->format('Y-m-d') : null,
                'bite_place' => $latestIntake->bite_place,
                'animal_type' => $latestIntake->animal_type,
                'animal_type_others' => $latestIntake->animal_type_others,
                'referred_from' => null,
                'mode_of_exposure' => $latestIntake->exposure_type,
                'body_part_exposed' => $latestIntake->body_part_exposed,
            ];
        }

        return response()->json([
            'clinic' => [
                'name' => $clinic->name ?? 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
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
            'bite_id' => 'nullable|exists:bite_incidents,bite_id',
            'card_date' => 'required|date',
            'registry_no' => 'nullable|string|max:100',
            'hospital_no' => 'nullable|string|max:100',
            'referred_by' => 'nullable|string|max:255',
            'exposure_category' => 'nullable|in:I,II,III',
            'mode_of_exposure' => 'nullable|in:nibbling_uncovered_skin,nibbling_broken_skin,scratch_abrasion,transdermal_bite,handling_ingestion_raw_meat',
            'body_part_exposed' => 'nullable|in:head_neck,other_parts,na_ingestion',
            'animal_type' => 'nullable|string|max:100',
            'animal_type_others' => 'nullable|string|max:255',
            'past_bite_history' => 'boolean',
            'past_bite_dates' => 'nullable|string|max:255',
            'past_pep_completed' => 'boolean',
            'icd10_code' => 'nullable|string|max:50',
        ]);

        $card = TagoloanTreatmentCard::updateOrCreate(
            [
                'clinic_id' => $clinicId,
                'patient_id' => $validated['patient_id'],
            ],
            array_merge($validated, [
                'clinic_id' => $clinicId,
                'created_by' => $request->user()->id,
            ])
        );

        // Update hospital_no in patient_details if provided
        $patient = Patient::with('details')->find($validated['patient_id']);
        if (!empty($validated['hospital_no']) && $patient && $patient->details) {
            $patient->details->update(['hospital_no' => $validated['hospital_no']]);
        }

        // Auto-create or update BiteIncident for this patient so classified exposure shows on Bite Map
        if ($patient) {
            $severityMap = [
                'I' => 'minor',
                'II' => 'moderate',
                'III' => 'severe',
            ];
            $severity = $severityMap[$validated['exposure_category'] ?? ''] ?? 'moderate';

            $street = $patient->details->address_purok ?? $patient->address_purok ?? 'Zone 1';
            $brgy = $patient->details->address_barangay ?? $patient->address_barangay ?? 'Poblacion';
            $mun = $patient->details->address_municipality ?? $patient->address_municipality ?? 'Tagoloan';
            $bitePlace = "{$street}, {$brgy}, {$mun}";

            $incident = BiteIncident::where('patient_id', $validated['patient_id'])->first();
            if (!$incident) {
                $incident = BiteIncident::create([
                    'clinic_id' => $clinicId,
                    'patient_id' => $validated['patient_id'],
                    'bite_date' => $validated['card_date'] ?? date('Y-m-d'),
                    'bite_place' => $bitePlace,
                    'exposure_type' => 'bite',
                    'severity' => $severity,
                    'animal_type' => $validated['animal_type'] ?? 'dog',
                    'status' => 'completed',
                    'created_by' => $request->user()->id,
                ]);
            } else {
                $incident->update([
                    'severity' => $severity,
                    'bite_place' => $incident->bite_place ?: $bitePlace,
                    'status' => 'completed',
                ]);
            }

            // Link card to bite incident
            $card->update(['bite_id' => $incident->bite_id]);

            // Clear bite map cache
            \Illuminate\Support\Facades\Cache::forget("web:bite-cases:map-data:clinic:{$clinicId}");
        }

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
