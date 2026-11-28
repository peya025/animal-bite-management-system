<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInventoryRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $clinicId = $this->user()->clinic_id;
        $maxHours = config('inventory.open_vial_max_hours', 8);

        return [
            'vaccine_type'      => 'required|string|max:100',
            'batch_number'      => [
                'required', 'string', 'max:100',
                Rule::unique('vaccine_inventory')->where(fn($q) => $q->where('clinic_id', $clinicId)),
            ],
            'quantity'          => 'required|integer|min:1',
            'expiration_date'   => 'required|date|after:today',
            'received_from'     => 'nullable|string|max:500',
            'manufactured_date' => 'nullable|date',
            'shelf_life_months' => 'nullable|integer|min:1',
            'open_vial_hours'   => 'nullable|integer|min:1|max:' . $maxHours,
            'doses_per_vial'    => 'nullable|integer|min:1|max:100',
            'cold_chain_notes'  => 'nullable|string|max:500',
            'remarks'           => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'batch_number.unique' => 'A batch with this batch / lot number already exists in your clinic inventory.',
        ];
    }
}
