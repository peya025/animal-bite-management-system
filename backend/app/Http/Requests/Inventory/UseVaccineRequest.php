<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class UseVaccineRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'vaccine_type'   => 'required|string|max:100',
            'quantity'       => 'required|integer|min:1',
            'treatment_id'   => 'required|integer',
            'force_batch_id' => 'nullable|integer',
        ];
    }
}
