<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class AdjustStockRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'transaction_type' => 'required|in:received,adjusted,expired,disposed',
            'quantity'         => 'required|integer|min:1',
            'remarks'          => 'nullable|string|max:500',
        ];
    }
}
