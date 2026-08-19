<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PatientProfileController extends Controller
{
    public function index(Request $request)
    {
        $accountId = $request->user()->id;
        $cacheKey = "mobile:patients:account:{$accountId}";

        // Cache for 10 minutes (patient profiles don't change often)
        return response()->json(
            Cache::remember($cacheKey, 600, function () use ($request) {
                return $request->user()->patients()->orderByPivot('is_primary', 'desc')->get();
            })
        );
    }

    public function store(Request $request)
    {
        // Validate basic patient data
        $patientData = $request->validate([
            'clinic_id' => ['required', 'integer', 'exists:clinics,id'],
            'relationship' => ['required', 'in:self,child,dependent'],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:50'],
            'gender' => ['required', 'in:male,female'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'address' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_number' => ['nullable', 'string', 'max:50'],
        ]);

        // Validate extended Form 1 data
        $detailsData = $request->validate([
            'blood_type' => ['nullable', 'string', 'max:10'],
            'mother_maiden_name' => ['nullable', 'string', 'max:255'],
            'civil_status' => ['nullable', 'in:single,married,widowed,separated,annulled,cohabitation'],
            'spouse_name' => ['nullable', 'string', 'max:255'],
            'address_municipality' => ['nullable', 'string', 'max:255'],
            'address_barangay' => ['nullable', 'string', 'max:255'],
            'address_purok' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:100'],
            'educational_attainment' => ['nullable', 'string', 'max:50'],
            'employment_status' => ['nullable', 'string', 'max:50'],
            'family_member' => ['nullable', 'string', 'max:50'],
            'philhealth_member' => ['nullable', 'in:yes,no'],
            'philhealth_status' => ['nullable', 'in:member,dependent'],
            'philhealth_no' => ['nullable', 'string', 'max:50', Rule::unique('patient_details', 'philhealth_no')],
            'philhealth_category' => ['nullable', 'string', 'max:50'],
            'fourps_member' => ['nullable', 'in:yes,no'],
            'fourps_category' => ['nullable', 'string', 'max:50'],
            'fourps_relationship' => ['nullable', 'string', 'max:50'],
            'registered_fourps_beneficiary' => ['nullable', 'string', 'max:50'],
            'dswd_nhts' => ['nullable', 'in:yes,no'],
            'has_membership' => ['nullable', 'string', 'max:10'],
            'other_membership' => ['nullable', 'string', 'max:50'],
            'other_membership_name' => ['nullable', 'string', 'max:100'],
            'other_membership_no' => ['nullable', 'string', 'max:100'],
        ]);

        $account = $request->user();

        if ($patientData['relationship'] === 'self'
            && $account->patients()->wherePivot('relationship', 'self')->exists()) {
            throw ValidationException::withMessages([
                'relationship' => ['This account already has a self profile.'],
            ]);
        }

        $patient = DB::transaction(function () use ($account, $patientData, $detailsData) {
            $relationship = $patientData['relationship'];
            unset($patientData['relationship']);

            $patient = Patient::create([
                ...$patientData,
                'registration_source' => 'mobile',
            ]);

            // Create patient details if any extended data provided
            if (!empty(array_filter($detailsData))) {
                $patient->details()->create($detailsData);
            }

            $account->patients()->attach($patient->patient_id, [
                'relationship' => $relationship,
                'is_primary' => ! $account->patients()->exists(),
                'status' => 'pending',
            ]);

            return $patient;
        });

        // Invalidate cache after creating patient
        Cache::forget("mobile:patients:account:{$account->id}");

        return response()->json(
            $account->patients()->with('details')->whereKey($patient->patient_id)->firstOrFail(),
            201,
        );
    }
}
