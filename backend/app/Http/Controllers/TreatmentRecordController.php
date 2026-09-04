<?php

namespace App\Http\Controllers;

use App\Models\TreatmentRecord;
use App\Models\Patient;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TreatmentRecordController extends Controller
{
    /**
     * Get treatment record for a patient (for editing)
     */
    public function getByPatient(Request $request, int $patientId)
    {
        $clinicId = $request->user()->clinic_id;

        $patient = Patient::with('details')
            ->where('clinic_id', $clinicId)
            ->findOrFail($patientId);

        // Get latest treatment record (general consultation)
        $latestTreatment = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->orderBy('consultation_date', 'desc')
            ->orderBy('consultation_time', 'desc')
            ->first();

        // Get all treatment records for history
        $treatments = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->orderBy('consultation_date', 'desc')
            ->orderBy('consultation_time', 'desc')
            ->get();

        // Check if patient already has administered vaccination records
        $hasAdministeredVaccine = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->whereNotNull('dose_number')
            ->where(function($q) {
                $q->where('status', 'completed')
                  ->orWhere(function($sub) {
                      $sub->whereNotNull('treatment_date')->where('status', '!=', 'scheduled');
                  });
            })
            ->exists();

        return response()->json([
            'patient' => $patient,
            'latest_treatment' => $latestTreatment,
            'treatments' => $treatments,
            'has_administered_vaccine' => $hasAdministeredVaccine,
        ]);
    }

    /**
     * Store Form 2 data (General Consultation / Individual Treatment Record)
     */
    public function store(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,patient_id',
            'queue_id' => 'nullable|exists:queues,queue_id',
            
            // General Consultation Fields (NEW Form 2)
            'consultation_date' => 'nullable|date',
            'consultation_time' => 'nullable|string|max:10',
            'mode_of_transaction' => 'nullable|in:walk-in,visited,referral',
            'referred_from' => 'nullable|string|max:255',
            'referred_to' => 'nullable|string|max:255',
            'referred_by' => 'nullable|string|max:255',
            'pertinent_history' => 'nullable|string',
            'reason_for_referral' => 'nullable|string',
            'actions_taken' => 'nullable|string',
            
            // Vital Signs
            'blood_pressure' => 'nullable|string|max:20',
            'temperature' => 'nullable|string|max:10',
            'height' => 'nullable|string|max:10',
            'weight' => 'nullable|string|max:10',
            
            // Visit and Consultation Details
            'nature_of_visit' => 'required|in:new_consultation,new_admission,follow_up',
            'consultation_types' => 'required|array|min:1',
            'consultation_types.*' => 'string',
            
            // Clinical Notes
            'chief_complaints' => 'required|string',
            'diagnosis' => 'nullable|string',
            'medication_treatment' => 'nullable|string',
            'laboratory_findings' => 'nullable|string',
            'performed_lab_test' => 'nullable|string',
            
            // Provider Details
            'provider_name' => 'nullable|string|max:255',
            'attending_provider' => 'nullable|string|max:255',
        ]);

        // Medical-Legal Protection: If patient already has administered vaccination doses, block altering baseline diagnosis
        $hasAdministeredVaccine = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $validated['patient_id'])
            ->whereNotNull('dose_number')
            ->where(function($q) {
                $q->where('status', 'completed')
                  ->orWhere(function($sub) {
                      $sub->whereNotNull('treatment_date')->where('status', '!=', 'scheduled');
                  });
            })
            ->exists();

        if ($hasAdministeredVaccine) {
            $existingConsultation = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->whereNull('dose_number')
                ->first();

            if ($existingConsultation) {
                return response()->json([
                    'message' => 'Clinical assessment is locked because vaccination has already been administered for this patient. Please use the Addendum section to record additional clinical notes.',
                    'locked' => true,
                ], 422);
            }
        }

        // Create general consultation treatment record
        $treatmentRecord = TreatmentRecord::create([
            'clinic_id' => $clinicId,
            'patient_id' => $validated['patient_id'],
            'treatment_date' => $validated['consultation_date'] 
                ? Carbon::parse($validated['consultation_date']) 
                : Carbon::now(),
            
            // General consultation fields
            'consultation_date' => $validated['consultation_date'] ?? Carbon::now()->toDateString(),
            'consultation_time' => $validated['consultation_time'] ?? Carbon::now()->format('H:i'),
            'mode_of_transaction' => in_array($validated['mode_of_transaction'] ?? '', ['walk-in', 'visited', 'referral'])
                ? $validated['mode_of_transaction']
                : 'walk-in',
            'referred_from' => $validated['referred_from'] ?? null,
            'referred_to' => $validated['referred_to'] ?? null,
            'referred_by' => $validated['referred_by'] ?? null,
            'pertinent_history' => $validated['pertinent_history'] ?? null,
            'reason_for_referral' => $validated['reason_for_referral'] ?? null,
            'actions_taken' => $validated['actions_taken'] ?? null,
            
            // Vital signs
            'blood_pressure' => $validated['blood_pressure'] ?? null,
            'temperature' => $validated['temperature'] ?? null,
            'height' => $validated['height'] ?? null,
            'weight' => $validated['weight'] ?? null,
            
            // Visit details
            'nature_of_visit' => $validated['nature_of_visit'],
            'consultation_types' => $validated['consultation_types'], // Will be cast to JSON by model
            
            // Clinical notes
            'chief_complaints' => $validated['chief_complaints'],
            'diagnosis' => $validated['diagnosis'] ?? null,
            'medication_treatment' => $validated['medication_treatment'] ?? null,
            'laboratory_findings' => $validated['laboratory_findings'] ?? null,
            'performed_lab_test' => $validated['performed_lab_test'] ?? null,
            
            // Provider details
            'provider_name' => $validated['provider_name'] ?? null,
            'attending_provider' => $validated['attending_provider'] ?? null,
            
            'status' => 'completed', // General consultation is completed when Form 2 is saved
            'administered_by' => $request->user()->id,
        ]);

        // ── Auto-advance queue: move patient from Triage/Doctor → Treatment/Vaccination station ──
        $todayQueue = null;
        $isReferralOut = ($validated['mode_of_transaction'] ?? '') === 'referral';
        $referredToFacility = $validated['referred_to'] ?? 'External Medical Facility';

        if (!empty($validated['queue_id'])) {
            $todayQueue = \App\Models\Queue::where('clinic_id', $clinicId)
                ->where('queue_id', $validated['queue_id'])
                ->whereNull('deleted_at')
                ->first();
        }

        if (!$todayQueue) {
            $todayQueue = \App\Models\Queue::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->where('queue_date', Carbon::today()->toDateString())
                ->whereIn('status', ['waiting', 'called', 'in_consultation', 'serving', 'second_chance', 'final_recall'])
                ->whereIn('visit_type', ['new_case', 'follow_up', 'observation', 'consultation'])
                ->whereNull('deleted_at')
                ->latest('queue_id')
                ->first();
        }

        if ($isReferralOut) {
            // Case A: Patient referred to external hospital/facility — do not send to Treatment Queue
            if ($todayQueue) {
                $referralNotes = "Referred to external facility: {$referredToFacility} — Visit Completed.";

                \App\Models\QueueHistory::create([
                    'queue_id'     => $todayQueue->queue_id,
                    'clinic_id'    => $todayQueue->clinic_id,
                    'patient_id'   => $todayQueue->patient_id,
                    'action'       => 'completed',
                    'from_status'  => $todayQueue->status,
                    'to_status'    => 'completed',
                    'call_count'   => $todayQueue->call_count ?? 0,
                    'performed_by' => $request->user()->id,
                    'notes'        => $referralNotes,
                    'occurred_at'  => now(),
                ]);

                $todayQueue->update([
                    'status'             => 'completed',
                    'completed_at'       => now(),
                    'consultation_notes' => $referralNotes,
                    'recall_stage'       => null,
                ]);

                \Illuminate\Support\Facades\Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayQueue->queue_date->toDateString()}");
            }
        } else {
            // Case B: Standard Triage → Treatment handoff
            $transferNotes = 'Doctor completed Form 2 — referred to Treatment.';

            if ($todayQueue) {
                \App\Models\QueueHistory::create([
                    'queue_id'     => $todayQueue->queue_id,
                    'clinic_id'    => $todayQueue->clinic_id,
                    'patient_id'   => $todayQueue->patient_id,
                    'action'       => 'transferred_to_treatment',
                    'from_status'  => $todayQueue->status,
                    'to_status'    => 'waiting',
                    'call_count'   => $todayQueue->call_count ?? 0,
                    'performed_by' => $request->user()->id,
                    'notes'        => $transferNotes,
                    'occurred_at'  => now(),
                ]);

                $todayQueue->update([
                    'visit_type'         => 'vaccination',
                    'status'             => 'waiting',
                    'called_at'          => null,
                    'serving_at'         => null,
                    'completed_at'       => null,
                    'consultation_notes' => $transferNotes,
                    'recall_stage'       => null,
                ]);

                \Illuminate\Support\Facades\Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayQueue->queue_date->toDateString()}");
            } else {
                // Patient had no prior queue ticket today — auto-generate one for Treatment Desk
                $todayDate = Carbon::today()->toDateString();
                $lastQueueNumber = \App\Models\Queue::where('clinic_id', $clinicId)
                    ->where('queue_date', $todayDate)
                    ->whereNull('deleted_at')
                    ->max('queue_number') ?? 0;

                $todayQueue = \App\Models\Queue::create([
                    'clinic_id'          => $clinicId,
                    'patient_id'         => $validated['patient_id'],
                    'queue_number'       => $lastQueueNumber + 1,
                    'queue_date'         => $todayDate,
                    'visit_type'         => 'vaccination',
                    'priority'           => 'normal',
                    'queue_category'     => 'regular',
                    'status'             => 'waiting',
                    'checked_in_at'      => now(),
                    'checked_in_by'      => $request->user()->id,
                    'consultation_notes' => $transferNotes,
                    'call_count'         => 0,
                ]);

                \App\Models\QueueHistory::create([
                    'queue_id'     => $todayQueue->queue_id,
                    'clinic_id'    => $todayQueue->clinic_id,
                    'patient_id'   => $todayQueue->patient_id,
                    'action'       => 'checked_in',
                    'from_status'  => 'new',
                    'to_status'    => 'waiting',
                    'call_count'   => 0,
                    'performed_by' => $request->user()->id,
                    'notes'        => $transferNotes,
                    'occurred_at'  => now(),
                ]);

                \Illuminate\Support\Facades\Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");
            }
        }

        return response()->json([
            'message' => 'Treatment record saved successfully',
            'treatment_record' => $treatmentRecord->load('patient'),
            'queue' => $todayQueue?->fresh(),
        ], 201);
    }

    /**
     * Get all treatment records
     */
    public function index(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $query = TreatmentRecord::with(['patient', 'administeredBy'])
            ->where('clinic_id', $clinicId)
            ->orderBy('consultation_date', 'desc')
            ->orderBy('consultation_time', 'desc');

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('patient', function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('patient_number', 'like', "%{$search}%");
            });
        }

        $records = $query->paginate($request->get('per_page', 15));

        return response()->json($records);
    }

    /**
     * Show single treatment record
     */
    public function show(Request $request, int $id)
    {
        $clinicId = $request->user()->clinic_id;

        $record = TreatmentRecord::with(['patient', 'administeredBy'])
            ->where('clinic_id', $clinicId)
            ->findOrFail($id);

        return response()->json($record);
    }

    /**
     * Save an addendum note for a patient's clinical assessment
     * POST /api/treatment-records/patient/{patientId}/addendum
     */
    public function saveAddendum(Request $request, int $patientId)
    {
        $clinicId = $request->user()->clinic_id;

        $validated = $request->validate([
            'addendum_notes' => 'required|string|min:3',
        ]);

        $patient = Patient::where('clinic_id', $clinicId)->findOrFail($patientId);

        // Find existing general consultation record
        $consultation = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->whereNull('dose_number')
            ->latest('treatment_id')
            ->first();

        $userName = $request->user()->name ?? 'Physician';
        $timestamp = now()->format('M d, Y h:i A');
        $formattedNote = "[{$timestamp} by {$userName}]: " . trim($validated['addendum_notes']);

        if ($consultation) {
            $existingNotes = $consultation->administration_notes ? trim($consultation->administration_notes) . "\n\n" : '';
            $consultation->update([
                'administration_notes' => $existingNotes . $formattedNote,
            ]);
            $record = $consultation;
        } else {
            $record = TreatmentRecord::create([
                'clinic_id' => $clinicId,
                'patient_id' => $patientId,
                'treatment_date' => now(),
                'consultation_date' => now()->toDateString(),
                'consultation_time' => now()->format('H:i'),
                'nature_of_visit' => 'follow_up',
                'consultation_types' => ['general'],
                'chief_complaints' => 'Clinical Addendum Note',
                'administration_notes' => $formattedNote,
                'status' => 'completed',
                'administered_by' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => 'Addendum saved successfully',
            'treatment_record' => $record,
            'addendum' => $formattedNote,
        ]);
    }
}
