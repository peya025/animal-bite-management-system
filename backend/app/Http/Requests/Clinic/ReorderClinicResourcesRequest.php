<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class ReorderClinicResourcesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'admin';
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ordered_ids' => ['required_without:items', 'array', 'min:1'],
            'ordered_ids.*' => ['integer', 'distinct'],
            'items' => ['required_without:ordered_ids', 'array', 'min:1'],
            'items.*.id' => ['required_with:items', 'integer', 'distinct'],
            'items.*.sort_order' => ['required_with:items', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
