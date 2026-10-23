<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInventoryRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $clinicId = $this->user()->clinic_id;
        $maxHours = config('inventory.open_vial_max_hours', 8);
        $id       = $this->route('id');

        return [
            'vaccine_type'      => 'sometimes|string|max:100',
            'batch_number'      => [
                'sometimes', 'string', 'max:100',
                Rule::unique('vaccine_inventory')->where(fn($q) => $q->where('clinic_id', $clinicId))->ignore($id, 'inventory_id'),
            ],
            'received_from'     => 'nullable|string|max:500',
            'manufactured_date' => 'nullable|date',
            'shelf_life_months' => 'nullable|integer|min:1',
            'open_vial_hours'   => 'nullable|integer|min:1|max:' . $maxHours,
            'doses_per_vial'    => 'nullable|integer|min:1|max:100',
            'cold_chain_notes'  => 'nullable|string|max:500',
            'expiration_date'   => 'sometimes|date',
            'status'            => 'sometimes|in:active,expired,depleted',
        ];
    }

    public function messages(): array
    {
        return [
            'batch_number.unique' => 'A batch with this batch / lot number already exists in your clinic inventory.',
        ];
    }
}
