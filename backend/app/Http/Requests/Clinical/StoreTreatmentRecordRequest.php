<?php

namespace App\Http\Requests\Clinical;

use App\Services\ProphylaxisService;
use App\Support\BiteIntakeContract;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTreatmentRecordRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if ($this->has('prophylaxis_orders') && $user && !in_array($user->role, ['triage', 'doctor', 'admin'], true)) {
            abort(403, 'Only a doctor or administrator may prescribe prophylaxis in Form 2.');
        }

        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...ProphylaxisService::orderRules(),
            'patient_id' => 'required|exists:patients,patient_id',
            'queue_id' => 'nullable|exists:queues,queue_id',
            'bite_id' => 'nullable|exists:bite_incidents,bite_id',
            'exposure_category' => 'sometimes|required|in:I,II,III',
            'treatment_plan' => 'nullable|in:full_pep,single_booster,two_dose_booster,continue_existing_schedule,no_vaccine',

            // Optional New Bite Incident updates from Doctor Form 2
            'new_bite_date' => 'nullable|date',
            'new_bite_place' => 'nullable|string|max:255',
            'new_exposure_type' => 'nullable|in:bite,scratch,lick,other',
            'new_exposure_mode' => 'nullable|in:nibbling_uncovered_skin,nibbling_broken_skin,scratch_abrasion,transdermal_bite,handling_ingestion_raw_meat',
            'new_severity' => 'nullable|in:minor,moderate,severe',
            'new_animal_type' => ['nullable', Rule::in(array_keys(BiteIntakeContract::ANIMAL_SPECIES))],
            'new_animal_type_other' => 'nullable|required_if:new_animal_type,other|string|max:255',
            'new_animal_status' => 'nullable|in:owned,stray,unknown',
            'new_animal_available' => 'nullable|boolean',
            'new_site_washed' => 'nullable|boolean',
            'new_body_part' => 'nullable|string|max:255',
            'new_body_part_group' => ['nullable', Rule::in(array_keys(BiteIntakeContract::BODY_PART_GROUPS))],
            'new_body_part_detail' => 'nullable|string|max:255',
            'new_laterality' => 'nullable|in:left,right,bilateral,multiple,not_applicable,unknown',

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

            // Transfer Out / Referral Slip Fields (Form 2 & Form 3)
            'transferred_to_facility' => 'nullable|string|max:255',
            'transfer_reason' => 'nullable|string',
            'transfer_date' => 'nullable|date',
            'is_referral' => 'nullable|boolean',
            'complete_referral' => 'nullable|boolean',

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
            'prescribed_vaccine_type' => 'nullable|string|max:100',
            'laboratory_findings' => 'nullable|string',
            'performed_lab_test' => 'nullable|string',

            // Provider Details
            'provider_name' => 'nullable|string|max:255',
            'attending_provider' => 'nullable|string|max:255',

            // Returning Patient Reassessment Decision & Clinical Documentation
            'reassessment_decision' => 'nullable|in:continue,modify,discontinue,no_injection_required',
            'reassessment_notes' => 'nullable|string|max:2000',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator) {
            $category = $this->input('exposure_category');
            $prescribed = trim((string) $this->input('prescribed_vaccine_type', ''));
            $reassessmentDecision = $this->input('reassessment_decision');
            $reassessmentNotes = trim((string) $this->input('reassessment_notes', ''));

            if ($category === 'I' && $prescribed !== '' && strtolower($prescribed) !== 'none') {
                $validator->errors()->add(
                    'prescribed_vaccine_type',
                    'Category I exposures do not require Rabies PEP vaccination. Prescribed PEP vaccine must be empty.'
                );
            }

            if (in_array($reassessmentDecision, ['modify', 'discontinue', 'no_injection_required'], true) && $reassessmentNotes === '') {
                $validator->errors()->add(
                    'reassessment_notes',
                    'Please document the clinical reason when modifying, discontinuing, or determining no injection is required for a previous prescription.'
                );
            }

            $completeReferral = filter_var($this->input('complete_referral'), FILTER_VALIDATE_BOOLEAN);
            $facility = trim((string) ($this->input('transferred_to_facility') ?? $this->input('referred_to') ?? ''));
            if ($completeReferral && empty($facility)) {
                $validator->errors()->add(
                    'transferred_to_facility',
                    'Please specify the receiving hospital or health facility to complete the referral.'
                );
            }
        });
    }
}
