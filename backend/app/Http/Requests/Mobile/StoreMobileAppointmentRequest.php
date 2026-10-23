<?php

namespace App\Http\Requests\Mobile;

use App\Support\BiteIntakeContract;
use Illuminate\Foundation\Http\FormRequest;

class StoreMobileAppointmentRequest extends FormRequest
{
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
        if ($this->input('appointment_type') === 'consultation' && is_array($this->input('intake'))) {
            $this->merge([
                'intake' => BiteIntakeContract::normalize($this->input('intake')),
            ]);
        }
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
            $rules['intake'] = ['required', 'array'];
            $rules = array_merge($rules, BiteIntakeContract::validationRules());
        }

        return $rules;
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
