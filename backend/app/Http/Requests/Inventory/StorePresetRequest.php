<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StorePresetRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $maxHours    = config('inventory.open_vial_max_hours', 8);
        $isMultidose = $this->boolean('is_multidose', false);

        $rules = [
            'vaccine_name'               => 'required|string|max:255',
            'category'                   => 'nullable|string|max:100',
            'default_shelf_life_months'  => 'nullable|integer|min:1',
            'storage_temperature_notes'  => 'nullable|string|max:500',
            'dosing_regimen_notes'       => 'nullable|string|max:1000',
            'administration_route'       => 'nullable|string|max:150',
            'is_multidose'               => 'nullable|boolean',
            'regimen_units_per_patient'  => 'nullable|numeric|min:0.1|max:999.99',
            'default_open_vial_hours'    => 'required|integer|min:1|max:' . $maxHours,
        ];

        $rules['doses_per_vial'] = $isMultidose
            ? 'required|integer|min:1|max:100'
            : 'nullable|integer';

        return $rules;
    }
}
