<?php

namespace App\Http\Requests\Reports;

use Illuminate\Foundation\Http\FormRequest;

class MonthlyReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'month'     => ['nullable', 'string', 'max:20'],
            'from'      => ['nullable', 'date'],
            'to'        => ['nullable', 'date'],
            'category'  => ['nullable', 'string', 'max:20'],
            'clinic_id' => ['nullable', 'integer'],
        ];
    }
}
