<?php

namespace App\Http\Requests\Mobile;

use App\Http\Requests\Mobile\Concerns\UsesMobileIntakePolicy;
use App\Models\Patient;
use App\Services\Clinic\FormFieldCatalog;
use Illuminate\Validation\Validator;
use App\Support\BiteIntakeContract;
use Illuminate\Foundation\Http\FormRequest;

class StoreMobileAppointmentRequest extends FormRequest
{
    use UsesMobileIntakePolicy;
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare inputs for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->prepareConfiguredIntake(false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = [
            'patient_id'       => ['required', 'integer', 'exists:patients,patient_id'],
            'appointment_type' => ['required', 'in:consultation,vaccination,booster'],
            'scheduled_date'   => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'time_slot'        => ['nullable', 'in:morning,afternoon'],
            'notes'            => ['nullable', 'string', 'max:1000'],
            'intake'           => ['nullable', 'array'],
        ];

        if ($this->input('appointment_type') === 'consultation') {
            $policy = $this->intakePolicy(false);
            $rules['intake'] = $policy->intakeEnabled() ? ['required', 'array'] : ['nullable', 'array'];
            $rules = array_merge($rules, $policy->intakeRules());
        }

        return $rules;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || $this->input('appointment_type') !== 'consultation') {
                return;
            }
            $patient = $this->user()->patients()->whereKey($this->input('patient_id'))->first();
            if (! $patient instanceof Patient) {
                $validator->errors()->add('patient_id', 'Select a patient linked to this account.');
                return;
            }
            $policy = $this->intakePolicy(false);
            $details = $patient->details;
            foreach (FormFieldCatalog::PROFILE_FIELDS as $field) {
                $value = $details?->{$field};
                $context = ['civil_status' => $details?->civil_status, 'philhealth_member' => $details?->philhealth_member];
                if ($policy->required($field, $context) && ($value === null || $value === '')) {
                    $validator->errors()->add('profile.'.$field, 'Complete this field in the selected patient profile before booking.');
                }
            }
        });
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'intake.bite_date.before_or_equal' => 'The incident date must be today or earlier.',
        ];
    }
}
