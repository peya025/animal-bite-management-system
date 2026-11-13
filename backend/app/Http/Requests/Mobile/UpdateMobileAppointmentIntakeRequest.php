<?php

namespace App\Http\Requests\Mobile;

use App\Support\BiteIntakeContract;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMobileAppointmentIntakeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $input = $this->all();
        if (isset($input['intake']) && is_array($input['intake'])) {
            $this->merge([
                'intake' => BiteIntakeContract::normalize($input['intake']),
            ]);
        } else {
            $this->merge([
                'intake' => BiteIntakeContract::normalize($input),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'intake' => ['required', 'array'],
            ...BiteIntakeContract::validationRules('intake.'),
        ];
    }

    public function messages(): array
    {
        return [
            'intake.bite_date.before_or_equal' => 'The incident date must be today or earlier.',
        ];
    }
}
