<?php

namespace App\Http\Requests\Clinic;

use App\Services\Clinic\ClinicModuleConfigService;
use App\Services\Clinic\StationCapabilityPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Validator;

class UpdateClinicModuleConfigRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        // Admin role is required to update module configuration
        if (! $user->isAdmin()) {
            throw new HttpResponseException(
                response()->json([
                    'message' => 'Unauthorized. Admin access required.',
                ], 403)
            );
        }

        // Active clinic context is required
        if (! $user->clinic_id) {
            throw new HttpResponseException(
                response()->json([
                    'message' => 'User is not associated with any clinic.',
                    'errors'  => [
                        'clinic_id' => ['Authenticated user has no associated clinic context.'],
                    ],
                ], 422)
            );
        }

        return true;
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
            'revision'                      => 'sometimes|integer|min:1',
            'clinic_id'                     => 'sometimes|integer',
            'triage_module_enabled'         => 'required|boolean',
            'registration_module_enabled'   => 'sometimes|boolean',
            'treatment_module_enabled'      => 'sometimes|boolean',
            'patient_registration_enabled'  => 'sometimes|boolean',
            'address_section_enabled'       => 'sometimes|boolean',
            'socioeconomic_section_enabled' => 'sometimes|boolean',
            'gov_programs_section_enabled'  => 'sometimes|boolean',
            'bite_intake_section_enabled'   => 'sometimes|boolean',
            'triage_section_enabled'        => 'sometimes|boolean',
            'treatment_section_enabled'     => 'sometimes|boolean',
            'field_rules'                   => 'required|array',
            'clinical_options'              => 'sometimes|array',
            'clinical_options.exposure_modes'            => 'sometimes|array|min:1',
            'clinical_options.exposure_modes.*.key'      => 'required_with:clinical_options.exposure_modes|string|max:64',
            'clinical_options.exposure_modes.*.label'    => 'required_with:clinical_options.exposure_modes|string|min:1|max:120',
            'clinical_options.exposure_modes.*.enabled'  => 'required_with:clinical_options.exposure_modes|boolean',
            'clinical_options.exposure_modes.*.is_custom'=> 'sometimes|boolean',
            'clinical_options.body_part_groups'          => 'sometimes|array|min:1',
            'clinical_options.body_part_groups.*.key'    => 'required_with:clinical_options.body_part_groups|string|max:64',
            'clinical_options.body_part_groups.*.label'  => 'required_with:clinical_options.body_part_groups|string|min:1|max:120',
            'clinical_options.body_part_groups.*.enabled'=> 'required_with:clinical_options.body_part_groups|boolean',
            'clinical_options.body_part_groups.*.is_custom' => 'sometimes|boolean',
        ];

        $newFeeKeys = ['rig_fee', 'anti_rabies_fee', 'additional_fees'];

        foreach (array_keys($service->getDefaultFieldRules()) as $fieldKey) {
            if (in_array($fieldKey, $newFeeKeys, true)) {
                $rules["field_rules.{$fieldKey}"] = 'sometimes|in:required,optional,hidden';
            } else {
                $rules["field_rules.{$fieldKey}"] = 'required|in:required,optional,hidden';
            }
        }

        return $rules;
    }

    /**
     * Configure the validator instance with strict contract assertions.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            /** @var ClinicModuleConfigService $service */
            $service = app(ClinicModuleConfigService::class);

            $allowedTopLevelKeys = [
                'revision',
                'clinic_id',
                'triage_module_enabled',
                'registration_module_enabled',
                'treatment_module_enabled',
                'patient_registration_enabled',
                'address_section_enabled',
                'socioeconomic_section_enabled',
                'gov_programs_section_enabled',
                'bite_intake_section_enabled',
                'triage_section_enabled',
                'treatment_section_enabled',
                'field_rules',
                'clinical_options',
            ];

            // 1. Reject unsupported / unknown top-level keys
            $submittedTopLevelKeys = array_keys($this->all());
            $unknownTopLevelKeys = array_diff($submittedTopLevelKeys, $allowedTopLevelKeys);

            foreach ($unknownTopLevelKeys as $unknownKey) {
                $validator->errors()->add($unknownKey, "The key '{$unknownKey}' is not a supported configuration key.");
            }

            // 2. Reject null boolean values explicitly to ensure no null reaches DB (MC-08)
            $booleanKeys = [
                'triage_module_enabled',
                'registration_module_enabled',
                'treatment_module_enabled',
                'patient_registration_enabled',
                'address_section_enabled',
                'socioeconomic_section_enabled',
                'gov_programs_section_enabled',
                'bite_intake_section_enabled',
                'triage_section_enabled',
                'treatment_section_enabled',
            ];

            foreach ($booleanKeys as $boolKey) {
                if (array_key_exists($boolKey, $this->all()) && is_null($this->input($boolKey))) {
                    if (! $validator->errors()->has($boolKey)) {
                        $validator->errors()->add($boolKey, "The {$boolKey} field must be true or false.");
                    }
                }
            }

            // 3. Reject unsupported field rules in field_rules array
            if (is_array($this->input('field_rules'))) {
                $submittedFieldKeys = array_keys($this->input('field_rules'));
                $allowedFieldKeys = array_keys($service->getDefaultFieldRules());
                $unknownFieldKeys = array_diff($submittedFieldKeys, $allowedFieldKeys);

                foreach ($unknownFieldKeys as $unknownFieldKey) {
                    $validator->errors()->add(
                        "field_rules.{$unknownFieldKey}",
                        "The field rule '{$unknownFieldKey}' is not supported."
                    );
                }
            }

            // 4. Enforce locked clinical safeguards (LF1: exposure_category must be required)
            if ($this->has('field_rules.exposure_category')) {
                $exposureCategoryVal = $this->input('field_rules.exposure_category');
                if ($exposureCategoryVal !== 'required') {
                    $validator->errors()->add(
                        'field_rules.exposure_category',
                        "The 'exposure_category' field is an essential clinical safeguard and must be 'required'."
                    );
                }
            }

            // 4b. Validate clinical_options keys (canonical or valid custom snake_case) & at-least-one-enabled invariant
            if (is_array($this->input('clinical_options'))) {
                $clinicalOptions = $this->input('clinical_options');

                foreach (['exposure_modes', 'body_part_groups'] as $groupKey) {
                    if (isset($clinicalOptions[$groupKey]) && is_array($clinicalOptions[$groupKey])) {
                        $enabledCount = 0;
                        $seenKeys = [];
                        foreach ($clinicalOptions[$groupKey] as $idx => $item) {
                            if (! is_array($item)) {
                                continue;
                            }
                            $k = is_string($item['key'] ?? null) ? strtolower(trim($item['key'])) : '';
                            if ($k === '' || $k === 'unsure' || ! preg_match('/^[a-z][a-z0-9_]{1,63}$/', $k)) {
                                $validator->errors()->add(
                                    "clinical_options.{$groupKey}.{$idx}.key",
                                    "The option key '{$k}' must be a valid snake_case identifier (letters, numbers, underscores, 2-64 chars)."
                                );
                            } elseif (isset($seenKeys[$k])) {
                                $validator->errors()->add(
                                    "clinical_options.{$groupKey}.{$idx}.key",
                                    "Duplicate option key '{$k}' in {$groupKey}."
                                );
                            }
                            $seenKeys[$k] = true;

                            if (isset($item['label']) && is_string($item['label']) && trim($item['label']) === '') {
                                $validator->errors()->add(
                                    "clinical_options.{$groupKey}.{$idx}.label",
                                    'Option label cannot be empty.'
                                );
                            }
                            if (! empty($item['enabled'])) {
                                $enabledCount++;
                            }
                        }
                        if ($enabledCount === 0) {
                            $validator->errors()->add(
                                "clinical_options.{$groupKey}",
                                "At least one option must remain enabled for {$groupKey}."
                            );
                        }
                    }
                }
            }

            // 5. Enforce station capability & transition policy (Person 4)
            $stationFields = ['triage_module_enabled', 'registration_module_enabled', 'treatment_module_enabled'];
            if (! $validator->errors()->hasAny($stationFields) && $this->user()?->clinic_id) {
                $clinicId = (int) $this->user()->clinic_id;
                $currentConfig = $service->getOrCreateConfigForClinic($clinicId);

                $proposedStations = [
                    'triage_module_enabled' => $this->has('triage_module_enabled')
                        ? filter_var($this->input('triage_module_enabled'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false
                        : (bool) ($currentConfig->triage_module_enabled ?? true),
                    'registration_module_enabled' => $this->has('registration_module_enabled')
                        ? filter_var($this->input('registration_module_enabled'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false
                        : (bool) ($currentConfig->registration_module_enabled ?? true),
                    'treatment_module_enabled' => $this->has('treatment_module_enabled')
                        ? filter_var($this->input('treatment_module_enabled'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false
                        : (bool) ($currentConfig->treatment_module_enabled ?? true),
                ];

                /** @var StationCapabilityPolicy $policy */
                $policy = app(StationCapabilityPolicy::class);
                $transitionErrors = $policy->validateConfigTransition($clinicId, $proposedStations);

                foreach ($transitionErrors as $fieldKey => $message) {
                    $validator->errors()->add($fieldKey, $message);
                }
            }
        });
    }
}
