<?php

namespace App\Http\Requests\Reports;

use App\Services\Print\PrintDocumentService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class MonthlyReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        if ($this->is('print/*')) {
            app(PrintDocumentService::class)->authorizePrintRequest($this);
        }

        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'month' => ['nullable', 'string', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => [
                'nullable',
                'date_format:Y-m-d',
                Rule::when(
                    $this->filled('from') && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $this->input('from')) === 1,
                    ['after_or_equal:from']
                ),
            ],
            'category' => ['nullable', 'string', 'in:ALL,I,II,III,unassessed,Unassessed'],
            'cutoff' => ['nullable', 'date_format:Y-m-d'],
            'clinic_id' => ['nullable', 'integer'],
            'aggregate_only' => ['nullable', 'boolean'],
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        if (!$this->is('api/*') && !$this->expectsJson()) {
            throw new HttpResponseException(
                response()->json([
                    'message' => $validator->errors()->first(),
                    'errors' => $validator->errors()->toArray(),
                ], 422)
            );
        }

        parent::failedValidation($validator);
    }
}
