<?php

namespace App\Http\Requests\Clinical;

use App\Models\Patient;
use App\Services\PatientMembershipService;
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
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $patientId = $this->route('id') ?? $this->route('patient');
        $patient = Patient::where('clinic_id', $this->user()->clinic_id)->find($patientId);
        $membershipService = app(PatientMembershipService::class);

        return array_merge([
            'first_name' => 'sometimes|required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'gender' => 'sometimes|required|in:male,female',
            'age' => 'nullable|integer|min:0|max:150',
            'date_of_birth' => 'nullable|date|before_or_equal:today',
            'address' => 'nullable|string',
            'contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email' => 'nullable|string|email|max:255',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'hospital_no' => 'nullable|string|max:100',
            // Extended Form 1 fields
            'blood_type' => 'nullable|string|max:10',
            'mother_maiden_name' => 'nullable|string|max:255',
            'civil_status' => 'nullable|in:single,married,widowed,separated,annulled,cohabitation',
            'spouse_name' => 'nullable|string|max:255',
            'address_municipality' => 'nullable|string|max:255',
            'address_barangay' => 'nullable|string|max:255',
            'address_purok' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:100',
            'educational_attainment' => 'nullable|string|max:50',
            'employment_status' => 'nullable|string|max:50',
            'family_member' => 'nullable|string|max:50',
            'philhealth_member' => 'nullable|in:yes,no',
            'philhealth_status' => 'nullable|in:member,dependent',
            'philhealth_no' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('patient_details', 'philhealth_no')->ignore($patient?->details?->id),
            ],
            'philhealth_category' => 'nullable|string|max:50',
            'fourps_member' => 'nullable|in:yes,no',
            'fourps_category' => 'nullable|string|max:50',
            'fourps_relationship' => 'nullable|string|max:50',
            'registered_fourps_beneficiary' => 'nullable|string|max:50',
            'dswd_nhts' => 'nullable|in:yes,no',
            'has_membership' => 'nullable|string|max:10',
            'other_membership' => 'nullable|string|max:500',
            'other_membership_name' => 'nullable|string|max:500',
            'other_membership_no' => 'nullable|string|max:500',
        ], $membershipService->validationRules());
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
        ];
    }
}
