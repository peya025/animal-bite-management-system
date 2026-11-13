<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class OpenVialRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $maxHours = config('inventory.open_vial_max_hours', 8);

        return [
            'open_vial_hours' => 'nullable|integer|min:1|max:' . $maxHours,
        ];
    }
}
