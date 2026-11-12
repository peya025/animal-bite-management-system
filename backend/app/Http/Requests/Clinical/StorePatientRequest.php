<?php

namespace App\Http\Requests\Clinical;

use App\Services\Clinic\EffectiveFieldRuleComposer;
use App\Services\PatientMembershipService;
use App\Support\RegistrationAnimal;
use Illuminate\Foundation\Http\FormRequest;

class StorePatientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
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
        $membershipService = app(PatientMembershipService::class);
        $composer = app(EffectiveFieldRuleComposer::class);

        $clinicId = $this->user()?->clinic_id;
        $dynamicRules = $composer->composePatientRules($clinicId, false, $this->all());

        return array_merge([
            ...RegistrationAnimal::rules(),
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
