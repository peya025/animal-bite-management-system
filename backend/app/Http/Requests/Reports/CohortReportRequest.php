<?php

namespace App\Http\Requests\Reports;

use App\Services\Print\PrintDocumentService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class CohortReportRequest extends FormRequest
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
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
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
