<?php

namespace App\Http\Requests\Clinic;

use App\Services\Clinic\ClinicModuleConfigService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateClinicModuleConfigRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    /**
     * Handle a failed authorization attempt.
     */
    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(
            response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403)
        );
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var ClinicModuleConfigService $service */
        $service = app(ClinicModuleConfigService::class);

        $rules = [
            'triage_module_enabled'         => 'required|boolean',
            'patient_registration_enabled'  => 'nullable|boolean',
            'address_section_enabled'       => 'nullable|boolean',
            'socioeconomic_section_enabled' => 'nullable|boolean',
            'gov_programs_section_enabled'  => 'nullable|boolean',
            'bite_intake_section_enabled'   => 'nullable|boolean',
            'triage_section_enabled'        => 'nullable|boolean',
            'treatment_section_enabled'     => 'nullable|boolean',
            'field_rules'                   => 'required|array',
        ];

        foreach (array_keys($service->getDefaultFieldRules()) as $fieldKey) {
            $rules["field_rules.{$fieldKey}"] = 'required|in:required,optional,hidden';
        }

        return $rules;
    }
}
