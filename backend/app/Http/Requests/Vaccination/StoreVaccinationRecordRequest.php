<?php

namespace App\Http\Requests\Vaccination;

use Illuminate\Foundation\Http\FormRequest;

class StoreVaccinationRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role gate enforced in the controller
    }

    public function rules(): array
    {
        return [
            'patient_id'                                    => 'required|exists:patients,patient_id',
            'bite_id'                                       => 'nullable|exists:bite_incidents,bite_id',
            'queue_id'                                      => 'nullable|exists:queues,queue_id',
            'date_of_exposure'                              => 'nullable|date',
            'date_treatment_started'                        => 'nullable|date',
            'place_of_exposure'                             => 'nullable|string|max:255',
            'mode_of_exposure'                              => 'nullable|array',
            'mode_of_exposure.*'                            => 'in:nibbling_uncovered,nibbling_wounded,scratch_abrasion,transdermal_bite,handling_ingestion',
            'body_part_affected'                            => 'nullable|array',
            'body_part_affected.*'                          => 'in:head_neck,upper_extremities,lower_extremities,trunk_torso,multiple_sites,other_parts,na_ingestion',
            'body_part_detail'                              => 'nullable|string|max:255',
            'animal_type'                                   => 'nullable|string|max:100',
            'animal_type_other'                             => 'nullable|required_if:animal_type,other|string|max:255',
            'animal_status'                                 => 'nullable|in:owned,stray,unknown',
            'animal_available'                              => 'nullable|in:yes,no,unknown,true,false,1,0',
            'animal_condition'                              => 'nullable|in:apparently_healthy,healthy,sick,dead,died,unknown',
            'past_history_bite'                             => 'nullable|in:yes,no,unsure',
            'past_bite_dates'                               => 'nullable|string|max:255',
            'pep_completed'                                 => 'nullable|in:yes,no,completed,incomplete,none,unsure',
            'registry_no'                                   => 'nullable|string|max:100',
            'hospital_no'                                   => 'nullable|string|max:100',
            'referred_by'                                   => 'nullable|string|max:255',
            'doses'                                         => 'present|array',
            'doses.*.period'                                => 'required|string',
            'doses.*.route'                                 => 'nullable|in:ID,IM',
            'doses.*.date'                                  => 'nullable|date',
            'doses.*.given_by'                              => 'nullable|string|max:255',
            'doses.*.signature'                             => 'prohibited',
            'apply_signature'                               => 'sometimes|boolean',
            'signature_version'                             => 'nullable|string|max:255',
            'doses.*.vaccine_type'                          => 'nullable|string|max:255',
            'doses.*.inventory_units_used'                  => 'nullable|integer|min:0|max:999',
            'additional_meds'                               => 'nullable|array',
            'additional_meds.erig'                          => 'nullable|boolean',
            'additional_meds.tt'                            => 'nullable|boolean',
            'additional_meds.ats'                           => 'nullable|boolean',
            'prophylaxis_administrations'                   => 'sometimes|array|max:3',
            'prophylaxis_administrations.*.medication'      => 'required|distinct|string|max:100',
            'prophylaxis_administrations.*.status'          => 'nullable|in:administered,not_administered',
            'prophylaxis_administrations.*.not_administered_reason' => 'nullable|required_if:prophylaxis_administrations.*.status,not_administered|string|max:500',
            'prophylaxis_administrations.*.date'            => 'required|date_format:Y-m-d|before_or_equal:today',
            'prophylaxis_administrations.*.inventory_id'    => 'required_unless:prophylaxis_administrations.*.status,not_administered|nullable|integer|exists:vaccine_inventory,inventory_id',
            'prophylaxis_administrations.*.inventory_units_used' => [
                'required_unless:prophylaxis_administrations.*.status,not_administered',
                'nullable',
                'integer',
                function ($attribute, $value, $fail) {
                    preg_match('/prophylaxis_administrations\.(\d+)\.inventory_units_used/', $attribute, $matches);
                    $index = $matches[1] ?? null;
                    if ($index !== null) {
                        $itemStatus = $this->input("prophylaxis_administrations.{$index}.status");
                        if ($itemStatus === 'not_administered') {
                            return;
                        }
                    }
                    if ((int) $value !== 1) {
                        $fail('The ' . $attribute . ' must be 1.');
                    }
                },
            ],
            'prophylaxis_administrations.*.route'           => 'nullable|in:IM,wound_infiltration',
            'prophylaxis_administrations.*.injection_site'  => 'nullable|string|max:255',
            'prophylaxis_administrations.*.dosage_ml'       => 'nullable|numeric|gt:0|max:999.99',
            'prophylaxis_administrations.*.dose_iu'         => 'nullable|numeric|gt:0|max:99999999',
            'visit_outcome'                                 => 'nullable|in:administered,not_administered',
            'not_administered_reason'                       => 'nullable|required_if:visit_outcome,not_administered|string|max:500',
            'icd_code'                                      => 'nullable|string|max:20',
        ];
    }

    public function messages(): array
    {
        return [
            'doses.required' => "Please select a Vaccine Type for today's dose before saving.",
            'doses.min'      => "Please select a Vaccine Type for today's dose before saving.",
        ];
    }
}
