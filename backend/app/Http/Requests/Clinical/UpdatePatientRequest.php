<?php

namespace App\Http\Requests\Clinical;

use App\Models\Patient;
use App\Services\Clinic\EffectiveFieldRuleComposer;
use App\Services\PatientMembershipService;
use App\Support\RegistrationAnimal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePatientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $patientId = $this->route('id') ?? $this->route('patient');
        $patient = Patient::where('clinic_id', $this->user()->clinic_id)->find($patientId);
        if (!$patient) {
            return true; // Let controller handle 404
        }

        $user = $this->user();
        $isAdminOrReg = in_array($user->role, ['admin', 'registration', 'developer'], true);

        if (!$isAdminOrReg && $this->filled('animal_bite_id')) {
            abort(403, 'Only Registration Staff or Administrators can edit registration animal details.');
        }

        if (!$isAdminOrReg) {
            $legalFields = ['first_name', 'last_name', 'middle_name', 'suffix', 'gender', 'date_of_birth', 'philhealth_no', 'hospital_no'];
            foreach ($legalFields as $field) {
                if ($this->filled($field)) {
                    $currentVal = $patient->{$field} ?? $patient->details?->{$field};
                    if ($this->input($field) != $currentVal) {
                        abort(response()->json([
                            'message' => "Only Administrators or Registration Staff can modify legal identity and hospital identifiers ({$field}). Regular clinical staff may only update contact and address details.",
                        ], 403));
                    }
                }
            }
        }

        return true;
    }

    /**
     * Prepare inputs for validation (reconciling common UI aliases).
     */
    protected function prepareForValidation(): void
    {
        $merges = [];
        if (!$this->has('gender') && $this->has('sex')) {
            $merges['gender'] = $this->input('sex');
        }
        if (!$this->has('emergency_contact_number') && $this->has('emergency_contact_phone')) {
            $merges['emergency_contact_number'] = $this->input('emergency_contact_phone');
        }
        if (!empty($merges)) {
            $this->merge($merges);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $patientId = $this->route('id') ?? $this->route('patient');
        $patient = Patient::where('clinic_id', $this->user()->clinic_id)->find($patientId);
        $membershipService = app(PatientMembershipService::class);
        $composer = app(EffectiveFieldRuleComposer::class);

        $clinicId = $this->user()?->clinic_id;
        $dynamicRules = $composer->composePatientRules($clinicId, true, $this->all(), $patient?->details?->id);

        return array_merge([
            ...RegistrationAnimal::rules(),
            'animal_bite_id' => [
                'nullable',
                'integer',
                Rule::exists('bite_incidents', 'bite_id')
                    ->where('patient_id', $patientId)
                    ->where('clinic_id', $this->user()->clinic_id),
            ],
        ], $dynamicRules, $membershipService->validationRules());
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'contact_number.regex' => 'Mobile number must start with 09 and contain 11 digits.',
            'emergency_contact_number.regex' => 'Mobile number must start with 09 and contain 11 digits.',
            'blood_type.required' => 'Blood type is required.',
            'spouse_name.required' => 'Spouse name is required.',
            'mother_maiden_name.required' => "Mother's maiden name is required.",
            'civil_status.required' => 'Civil status is required.',
            'address_municipality.required' => 'Municipality is required.',
            'address_barangay.required' => 'Barangay is required.',
            'address_purok.required' => 'Purok is required.',
            'province.required' => 'Province is required.',
        ];
    }
}
