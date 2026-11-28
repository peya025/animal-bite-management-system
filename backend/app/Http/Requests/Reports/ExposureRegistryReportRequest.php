<?php

namespace App\Http\Requests\Reports;

use App\Services\Print\PrintDocumentService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class ExposureRegistryReportRequest extends FormRequest
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
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => [
                'nullable',
                'date_format:Y-m-d',
                Rule::when(
                    $this->filled('from') && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $this->input('from')) === 1,
                    ['after_or_equal:from']
                ),
            ],
            'quarter' => ['nullable', 'string', 'in:1,2,3,4,1st,2nd,3rd,4th,Q1,Q2,Q3,Q4'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'category' => ['nullable', 'string', 'in:ALL,I,II,III,unassessed,Unassessed'],
            'cutoff' => ['nullable', 'date_format:Y-m-d'],
            'aggregate_only' => ['nullable', 'boolean'],
            'clinic_id' => ['nullable', 'integer'],
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
