<?php

namespace App\Http\Requests\Mobile;

use App\Http\Requests\Mobile\Concerns\UsesMobileIntakePolicy;
use App\Support\BiteIntakeContract;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMobileAppointmentIntakeRequest extends FormRequest
{
    use UsesMobileIntakePolicy;
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->prepareConfiguredIntake(true);
    }

    public function rules(): array
    {
        $policy = $this->intakePolicy(true);
        return [
            'intake' => $policy->intakeEnabled() ? ['required', 'array'] : ['nullable', 'array'],
            ...$policy->intakeRules(true),
        ];
    }

    public function messages(): array
    {
        return [
            'intake.bite_date.before_or_equal' => 'The incident date must be today or earlier.',
        ];
    }
}
