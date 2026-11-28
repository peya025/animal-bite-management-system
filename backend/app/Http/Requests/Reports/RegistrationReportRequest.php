<?php

namespace App\Http\Requests\Reports;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegistrationReportRequest extends FormRequest
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
            'from'     => ['required', 'date_format:Y-m-d'],
            'to'       => ['required', 'date_format:Y-m-d', 'after_or_equal:from', 'before_or_equal:today'],
            'category' => ['sometimes', Rule::in(['ALL', 'I', 'II', 'III'])],
            'report'   => ['sometimes', Rule::in(['summary', 'pep', 'followup', 'awaiting', 'surveillance', 'referrals'])],
            'format'   => ['sometimes', Rule::in(['json', 'csv', 'print'])],
            'page'     => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
