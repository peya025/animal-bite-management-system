<?php

namespace App\Http\Requests\Clinical;

use Illuminate\Foundation\Http\FormRequest;

class StoreTagoloanTreatmentCardRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if ($user && $user->isTriage() && !$user->isAdmin() && !$user->isNursing()) {
            return false;
        }

        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'patient_id' => 'required|exists:patients,patient_id',
            'bite_id' => 'required|exists:bite_incidents,bite_id',
            'card_date' => 'required|date',
            'registry_no' => 'nullable|string|max:100',
            'hospital_no' => 'nullable|string|max:100',
            'referred_by' => 'nullable|string|max:255',
            'date_of_exposure' => 'nullable|date|before_or_equal:today',
            'place_of_exposure' => 'nullable|string|max:255',
            'mode_of_exposure' => 'nullable|in:nibbling_uncovered_skin,nibbling_broken_skin,scratch_abrasion,transdermal_bite,handling_ingestion_raw_meat',
            'body_part_exposed' => 'nullable|string|max:255',
            'body_part_detail' => 'nullable|string|max:255',
            'animal_type' => 'nullable|string|max:100',
            'animal_type_others' => 'nullable|required_if:animal_type,other|string|max:255',
            'animal_status' => 'nullable|in:owned,stray,unknown',
            'animal_available' => 'nullable|in:yes,no,unknown,true,false,1,0',
            'animal_condition' => 'nullable|in:apparently_healthy,healthy,sick,dead,died,unknown',
            'past_bite_history' => 'boolean',
            'past_bite_dates' => 'nullable|string|max:255',
            'past_pep_completed' => 'boolean',
            'icd10_code' => 'nullable|string|max:50',
        ];
    }

    /**
     * Handle failed authorization attempt.
     */
    protected function failedAuthorization()
    {
        abort(response()->json([
            'message' => 'Unauthorized. Triage doctors are not permitted to save Form 3 treatment cards.',
        ], 403));
    }
}
