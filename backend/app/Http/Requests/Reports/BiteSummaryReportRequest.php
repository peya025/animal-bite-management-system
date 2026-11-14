<?php

namespace App\Http\Requests\Reports;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BiteSummaryReportRequest extends FormRequest
{
    private const ALLOWED_ROLES = [
        'registration',
        'admin',
        'nurse',
        'doctor',
        'triage',
        'treatment',
        'staff',
        'developer',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && in_array($user->role, self::ALLOWED_ROLES, true);
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
            'month' => ['nullable', 'date_format:Y-m'],
            'quarter' => ['nullable', 'string', 'in:1,2,3,4,1st,2nd,3rd,4th,Q1,Q2,Q3,Q4'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'cutoff' => ['nullable', 'date_format:Y-m-d'],
            'date_basis' => ['nullable', 'string', 'in:exposure_date,registration_date'],
            'comparison' => ['nullable', 'string', 'in:previous_period,same_period_last_year,none'],
            'category' => ['nullable', 'string', 'in:ALL,all,I,II,III,unassessed,Unassessed,not_yet_assessed,assessed_category_missing'],
            'severity' => ['nullable', 'string', 'in:ALL,all,I,II,III,unassessed,Unassessed,not_yet_assessed,assessed_category_missing'],
            'status' => ['nullable', 'string', 'max:50'],
            'animal' => ['nullable', 'string', 'max:100'],
            'sex' => ['nullable', 'string', 'in:all,ALL,male,female,unknown'],
            'age_group' => ['nullable', 'string', 'in:all,ALL,below_15,15_above,unknown'],
            'plan_type' => ['nullable', 'string', 'in:all,ALL,full_pep,two_dose_booster,single_booster,continue_existing_schedule,no_pep_required,none'],
            'barangay' => ['nullable', 'string', 'max:150'],
            'geography_basis' => ['nullable', 'string', 'in:exposure,residence'],
            'privacy_mode' => ['nullable', 'string', 'in:aggregate_only,internal_aggregate'],
            'bucket' => [
                'nullable',
                'string',
                'in:all,unknown_exposure_date,awaiting_assessment,finalized_assessments,pep_prescribed,new_course_prescribed,new_course_started,verified_vaccine_initiation,no_administration_recorded,continuing_episodes,explicit_no_pep,decision_missing,assessed_category_missing,transferred_referred,rig_indicated,rig_verified,overdue,unresolved_review,unresolved_review_0_7_days,unresolved_review_8_30_days,unresolved_review_over_30_days,form_1_registration,form_1_registration_only,form_2_pep_prescribed,form_2_no_pep,form_2_transferred,form_3_treatment_recorded',
            ],
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'no_cache' => ['nullable', 'boolean'],
            'clinic_id' => ['nullable', 'integer'],
            'parent_snapshot_id' => ['nullable', 'integer', 'min:1'],
            'snapshot_id' => ['nullable', 'integer', 'min:1'],
            'finalize' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
