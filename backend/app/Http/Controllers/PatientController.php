<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class PatientController extends Controller
{
    /**
     * List all patients with search
     * Access: admin, registration, triage, treatment
     */
    public function index(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        
        // Create cache key based on query parameters
        $cacheKey = sprintf(
            'web:patients:clinic:%s:search:%s:gender:%s:sort:%s:%s:page:%s:per_page:%s',
            $clinicId,
            $request->get('search', 'all'),
            $request->get('gender', 'all'),
            $request->get('sort_by', 'created_at'),
            $request->get('sort_order', 'desc'),
            $request->get('page', 1),
            $request->get('per_page', 15)
        );

        // Cache for 3 minutes (patient list changes moderately)
        return response()->json(
            Cache::remember($cacheKey, 180, function () use ($request, $clinicId) {
                $query = Patient::where('clinic_id', $clinicId)
                    ->with([
                        'registeredBy',
                        'details',
                        'latestTreatmentRecord',
                        'upcomingAppointment',
                        'details',
                        'queues' => function ($q) {
                            $q->whereIn('status', ['waiting', 'in_consultation'])->latest();
                        }
                    ]);

                // Search functionality
                if ($request->has('search')) {
                    $search = $request->search;
                    $query->where(function($q) use ($search) {
                        $q->where('patient_number', 'like', "%{$search}%")
                          ->orWhere('contact_number', 'like', "%{$search}%")
                          ->orWhere(function ($nameQuery) use ($search) {
                              $nameQuery->searchName($search);
                          });
                    });
                }

                // Filter by gender
                if ($request->has('gender')) {
                    $query->where('gender', $request->gender);
                }

                // Sort
                $sortBy = $request->get('sort_by', 'created_at');
                $sortOrder = $request->get('sort_order', 'desc');
                $query->orderBy($sortBy, $sortOrder);

                // Paginate
                $perPage = $request->get('per_page', 15);
                return $query->paginate($perPage);
            })
        );
    }

    /**
     * Register new patient
     * Access: admin, registration
     */
    public function store(Request $request)
    {
        // Validate basic patient data
        $request->validate([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'gender' => 'required|in:male,female',
            'age' => 'nullable|integer|min:0|max:150',
            'date_of_birth' => 'nullable|date|before_or_equal:today',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:50',
            'email' => 'nullable|string|email|max:255',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_number' => 'nullable|string|max:50',
            // Extended Form 1 fields
            'blood_type' => 'nullable|string|max:10',
            'mother_maiden_name' => 'nullable|string|max:255',
            'civil_status' => 'nullable|in:single,married,widowed,separated,annulled,cohabitation',
            'spouse_name' => 'nullable|string|max:255',
            'address_municipality' => 'nullable|string|max:255',
            'address_barangay' => 'nullable|string|max:255',
            'address_purok' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:100',
            'educational_attainment' => 'nullable|string|max:50',
            'employment_status' => 'nullable|string|max:50',
            'family_member' => 'nullable|string|max:50',
            'philhealth_member' => 'nullable|in:yes,no',
            'philhealth_status' => 'nullable|in:member,dependent',
            'philhealth_no' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('patient_details', 'philhealth_no'),
            ],
            'philhealth_category' => 'nullable|string|max:50',
            'fourps_member' => 'nullable|in:yes,no',
            'fourps_category' => 'nullable|string|max:50',
            'fourps_relationship' => 'nullable|string|max:50',
            'registered_fourps_beneficiary' => 'nullable|string|max:50',
            'dswd_nhts' => 'nullable|in:yes,no',
            'has_membership' => 'nullable|string|max:10',
            'other_membership' => 'nullable|string|max:500',
            'other_membership_name' => 'nullable|string|max:500',
            'other_membership_no' => 'nullable|string|max:500',
        ]);

        $patient = Patient::create([
            'clinic_id' => $request->user()->clinic_id,
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'suffix' => $request->suffix,
            'gender' => $request->gender,
            'age' => $request->age,
            'date_of_birth' => $request->date_of_birth,
            'address' => $request->address,
            'contact_number' => $request->contact_number,
            'email' => $request->email,
            'emergency_contact_name' => $request->emergency_contact_name,
            'emergency_contact_number' => $request->emergency_contact_number,
            'registered_by' => $request->user()->id,
            'registration_source' => 'staff',
        ]);

        // Create patient details if any extended data provided
        $detailsData = $request->only([
            'blood_type', 'mother_maiden_name', 'civil_status', 'spouse_name',
            'address_municipality', 'address_barangay', 'address_purok', 'province',
            'educational_attainment', 'employment_status', 'family_member',
            'philhealth_member', 'philhealth_status', 'philhealth_no', 'philhealth_category',
            'fourps_member', 'fourps_category', 'fourps_relationship', 'registered_fourps_beneficiary', 'dswd_nhts', 'has_membership', 'other_membership', 'other_membership_name', 'other_membership_no'
        ]);

        if (!empty(array_filter($detailsData, fn($v) => !is_null($v) && $v !== ''))) {
            $patient->details()->create($detailsData);
        }
        
        // Invalidate patient list cache for this clinic
        $this->clearPatientListCache($request->user()->clinic_id);
        Cache::forget("web:bite-cases:map-data:clinic:{$request->user()->clinic_id}");

        return response()->json([
            'message' => 'Patient registered successfully',
            'patient' => $patient->load(['registeredBy', 'details']),
        ], 201);
    }

    /**
     * Get patient details with related data
     * Access: admin, registration, triage, treatment
     */
    public function show(Request $request, $id)
    {
        $cacheKey = "web:patient:{$id}:clinic:{$request->user()->clinic_id}";

        // Cache for 5 minutes
        return response()->json(
            Cache::remember($cacheKey, 300, function () use ($request, $id) {
                return Patient::where('clinic_id', $request->user()->clinic_id)
                    ->with([
                        'registeredBy',
                        'details',
                        // Form 2: Bite cases with their nested treatment records
                        'biteIncidents' => function($query) {
                            $query->with(['treatmentRecords' => function($q) {
                                $q->orderBy('dose_number')->orderBy('scheduled_date');
                            }])->latest('bite_date');
                        },
                        // Form 3: All treatment records (vaccinations + consultations)
                        'treatmentRecords' => function($query) {
                            $query->orderBy('dose_number')->orderBy('scheduled_date');
                        },
                    ])
                    ->findOrFail($id);
            })
        );
    }

    /**
     * Update patient information
     * Access: admin, registration
     */
    public function update(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'gender' => 'sometimes|required|in:male,female',
            'age' => 'nullable|integer|min:0|max:150',
            'date_of_birth' => 'nullable|date|before_or_equal:today',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:50',
            'email' => 'nullable|string|email|max:255',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_number' => 'nullable|string|max:50',
            // Extended Form 1 fields
            'blood_type' => 'nullable|string|max:10',
            'mother_maiden_name' => 'nullable|string|max:255',
            'civil_status' => 'nullable|in:single,married,widowed,separated,annulled,cohabitation',
            'spouse_name' => 'nullable|string|max:255',
            'educational_attainment' => 'nullable|string|max:50',
            'employment_status' => 'nullable|string|max:50',
            'family_member' => 'nullable|string|max:50',
            'philhealth_member' => 'nullable|in:yes,no',
            'philhealth_status' => 'nullable|in:member,dependent',
            'philhealth_no' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('patient_details', 'philhealth_no')->ignore($patient->details?->id),
            ],
            'philhealth_category' => 'nullable|string|max:50',
            'fourps_member' => 'nullable|in:yes,no',
            'fourps_category' => 'nullable|string|max:50',
            'fourps_relationship' => 'nullable|string|max:50',
            'registered_fourps_beneficiary' => 'nullable|string|max:50',
            'dswd_nhts' => 'nullable|in:yes,no',
            'has_membership' => 'nullable|string|max:10',
            'other_membership' => 'nullable|string|max:50',
            'other_membership_name' => 'nullable|string|max:100',
            'other_membership_no' => 'nullable|string|max:100',
        ]);

        $patient->update($request->all());

        // Update details if any details fields are provided
        $detailsFields = [
            'blood_type', 'mother_maiden_name', 'civil_status', 'spouse_name',
            'educational_attainment', 'employment_status', 'family_member',
            'philhealth_member', 'philhealth_status', 'philhealth_no', 'philhealth_category',
            'fourps_member', 'fourps_category', 'fourps_relationship', 'registered_fourps_beneficiary', 'dswd_nhts', 'has_membership', 'other_membership', 'other_membership_name', 'other_membership_no'
        ];
        
        $detailsData = $request->only($detailsFields);
        if (!empty($detailsData)) {
            if ($patient->details) {
                $patient->details->update($detailsData);
            } else {
                $patient->details()->create($detailsData);
            }
        }

        // Invalidate patient list cache
        $this->clearPatientListCache($request->user()->clinic_id);
        // Invalidate specific patient cache
        Cache::forget("web:patient:{$id}:clinic:{$request->user()->clinic_id}");

        return response()->json([
            'message' => 'Patient updated successfully',
            'patient' => $patient->load('details'),
        ]);
    }

    /**
     * Delete patient (soft delete)
     * Access: admin only
     */
    public function destroy(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $patient->delete();

        // Invalidate patient list cache
        $this->clearPatientListCache($request->user()->clinic_id);
        // Invalidate specific patient cache
        Cache::forget("web:patient:{$id}:clinic:{$request->user()->clinic_id}");

        return response()->json([
            'message' => 'Patient deleted successfully',
        ]);
    }

    /**
     * Helper method to clear patient list cache
     */
    private function clearPatientListCache($clinicId)
    {
        // Clear all possible patient list cache variations
        // This is a simple approach - in production you might use cache tags
        $searches = ['all', '']; // Common searches
        $genders = ['all', 'male', 'female', ''];
        $sorts = ['created_at', 'first_name', 'patient_number'];
        $orders = ['asc', 'desc'];
        
        foreach ($searches as $search) {
            foreach ($genders as $gender) {
                foreach ($sorts as $sort) {
                    foreach ($orders as $order) {
                        // Clear first 5 pages
                        for ($page = 1; $page <= 5; $page++) {
                            $cacheKey = sprintf(
                                'web:patients:clinic:%s:search:%s:gender:%s:sort:%s:%s:page:%s:per_page:15',
                                $clinicId, $search, $gender, $sort, $order, $page
                            );
                            Cache::forget($cacheKey);
                        }
                    }
                }
            }
        }
    }

    /**
     * Get patient's bite case history
     */
    public function biteCases(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $cases = $patient->biteIncidents()
            ->with(['createdBy', 'vaccinationSchedules'])
            ->orderBy('bite_date', 'desc')
            ->get();

        return response()->json($cases);
    }

    /**
     * Get patient's vaccination history
     */
    public function vaccinations(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $vaccinations = $patient->vaccinationSchedules()
            ->with(['biteIncident', 'administeredBy'])
            ->orderBy('scheduled_date')
            ->get();

        return response()->json($vaccinations);
    }
}
