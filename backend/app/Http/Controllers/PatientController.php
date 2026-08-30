<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Services\PatientMembershipService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
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
        $tab = $request->get('tab', 'all');

        $query = Patient::where('clinic_id', $clinicId)
            ->with([
                'registeredBy',
                'details',
                'memberships',
                'latestTreatmentRecord',
                'upcomingAppointment',
                'biteIncidents' => function ($bi) {
                    $bi->latest('bite_date');
                },
                'appointments' => function ($app) {
                    $app->orderBy('scheduled_date', 'asc');
                },
                'biteIntakes' => function ($bi) {
                    $bi->latest();
                },
                'accounts',
                'queues' => function ($q) {
                    $q->whereDate('created_at', \Carbon\Carbon::today())
                      ->whereIn('status', ['waiting', 'in_consultation', 'serving', 'called', 'no_response', 'absent', 'second_chance', 'final_recall'])
                      ->latest();
                }
            ]);

        // Tab-based filtering
        switch ($tab) {
            case 'today_queue':
                $query->where(function ($q) {
                    $q->whereHas('queues', function ($qu) {
                        $qu->whereIn('status', ['waiting', 'in_consultation']);
                    })->orWhereHas('appointments', function ($app) {
                        $app->where(function ($d) {
                            $d->whereDate('appointment_date', \Carbon\Carbon::today())
                              ->orWhereDate('scheduled_date', \Carbon\Carbon::today());
                        })->where('status', 'scheduled');
                    });
                });
                break;

            case 'online':
                $query->where(function ($q) {
                    $q->whereHas('biteIntakes')
                      ->orWhereHas('appointments', function ($app) {
                          $app->whereNotNull('booked_by_account_id')
                              ->where('status', '!=', 'cancelled');
                      })
                      ->orWhere(function ($sub) {
                          $sub->where('registration_source', 'mobile')
                              ->whereHas('appointments');
                      });
                });
                break;

            case 'overdue':
                $query->whereHas('appointments', function ($q) {
                    $q->where(function ($d) {
                        $d->where('appointment_date', '<', \Carbon\Carbon::today())
                          ->orWhere('scheduled_date', '<', \Carbon\Carbon::today());
                    })->whereIn('status', ['scheduled', 'missed']);
                });
                break;

            case 'pre_registered':
                $query->where(function ($q) {
                    $q->where('registration_source', 'mobile')
                      ->orWhereHas('accounts');
                })->whereDoesntHave('biteIntakes')
                  ->whereDoesntHave('appointments');
                break;

            case 'all':
            default:
                // No specific tab constraint
                break;
        }

        // Search functionality
        if ($request->has('search') && $request->search) {
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

        // Filter by membership type
        if ($request->filled('membership_type') && $request->membership_type !== 'all') {
            $type = $request->membership_type;
            $query->whereHas('memberships', function ($mQuery) use ($type) {
                $mQuery->where('membership_type', $type)->where('is_active', true);
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Paginate
        $perPage = $request->get('per_page', 15);
        $paginated = $query->paginate($perPage);

        // Summary counts for tabs
        $allCount = Patient::where('clinic_id', $clinicId)->count();

        $todayQueueCount = Patient::where('clinic_id', $clinicId)->where(function ($q) {
            $q->whereHas('queues', function ($qu) {
                $qu->whereIn('status', ['waiting', 'in_consultation']);
            })->orWhereHas('appointments', function ($app) {
                $app->where(function ($d) {
                    $d->whereDate('appointment_date', \Carbon\Carbon::today())
                      ->orWhereDate('scheduled_date', \Carbon\Carbon::today());
                })->where('status', 'scheduled');
            });
        })->count();

        $onlineCount = Patient::where('clinic_id', $clinicId)->where(function ($q) {
            $q->whereHas('biteIntakes')
              ->orWhereHas('appointments', function ($app) {
                  $app->whereNotNull('booked_by_account_id')
                      ->where('status', '!=', 'cancelled');
              })
              ->orWhere(function ($sub) {
                  $sub->where('registration_source', 'mobile')
                      ->whereHas('appointments');
              });
        })->count();

        $overdueCount = Patient::where('clinic_id', $clinicId)->whereHas('appointments', function ($q) {
            $q->where(function ($d) {
                $d->where('appointment_date', '<', \Carbon\Carbon::today())
                  ->orWhere('scheduled_date', '<', \Carbon\Carbon::today());
            })->whereIn('status', ['scheduled', 'missed']);
        })->count();

        $preRegisteredCount = Patient::where('clinic_id', $clinicId)->where(function ($q) {
            $q->where('registration_source', 'mobile')
              ->orWhereHas('accounts');
        })->whereDoesntHave('biteIntakes')
          ->whereDoesntHave('appointments')
          ->count();

        $res = $paginated->toArray();
        $res['all_count'] = $allCount;
        $res['today_queue_count'] = $todayQueueCount;
        $res['online_count'] = $onlineCount;
        $res['overdue_count'] = $overdueCount;
        $res['pre_registered_count'] = $preRegisteredCount;

        return response()->json($res);
    }

    /**
     * Register new patient
     * Access: admin, registration
     */
    public function store(Request $request)
    {
        $membershipService = app(PatientMembershipService::class);

        // Validate basic patient data
        $request->validate(array_merge([
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
        ], $membershipService->validationRules()));

        $patient = DB::transaction(function () use ($request, $membershipService) {
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

            $detailsData = $request->only([
                'blood_type', 'mother_maiden_name', 'civil_status', 'spouse_name',
                'address_municipality', 'address_barangay', 'address_purok', 'province',
                'educational_attainment', 'employment_status', 'family_member',
                'philhealth_member', 'philhealth_status', 'philhealth_no', 'philhealth_category',
                'fourps_member', 'fourps_category', 'fourps_relationship', 'registered_fourps_beneficiary',
                'dswd_nhts', 'has_membership', 'other_membership', 'other_membership_name', 'other_membership_no'
            ]);

            $detailsData = array_map(fn($v) => ($v === '' ? null : $v), $detailsData);
            $memberships = $membershipService->membershipsFromPayload($request->all());
            $detailsData = array_merge($detailsData, $membershipService->legacyFieldsFromMemberships($memberships));

            if (!empty(array_filter($detailsData, fn($v) => !is_null($v)))) {
                $patient->details()->create($detailsData);
            }

            $membershipService->syncForPatient($patient, $memberships);

            return $patient;
        });

        Cache::forget("web:bite-cases:map-data:clinic:{$request->user()->clinic_id}");

        return response()->json([
            'message' => 'Patient registered successfully',
            'patient' => $patient->load(['registeredBy', 'details', 'memberships']),
        ], 201);
    }

    /**
     * Get patient details with related data
     * Access: admin, registration, triage, treatment
     */
    public function show(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->with([
                'registeredBy',
                'details',
                'memberships',
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

        return response()->json($patient);
    }

    /**
     * Update patient information
     * Access: admin, registration
     */
    public function update(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $membershipService = app(PatientMembershipService::class);

        $request->validate(array_merge([
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
                Rule::unique('patient_details', 'philhealth_no')->ignore($patient->details?->id),
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
        ], $membershipService->validationRules()));

        DB::transaction(function () use ($request, $patient, $membershipService) {
            $patient->update($request->only([
                'first_name', 'middle_name', 'last_name', 'suffix', 'gender', 'age',
                'date_of_birth', 'address', 'contact_number', 'email',
                'emergency_contact_name', 'emergency_contact_number',
            ]));

            $detailsFields = [
                'blood_type', 'mother_maiden_name', 'civil_status', 'spouse_name',
                'address_municipality', 'address_barangay', 'address_purok', 'province',
                'educational_attainment', 'employment_status', 'family_member',
                'philhealth_member', 'philhealth_status', 'philhealth_no', 'philhealth_category',
                'fourps_member', 'fourps_category', 'fourps_relationship', 'registered_fourps_beneficiary',
                'dswd_nhts', 'has_membership', 'other_membership', 'other_membership_name', 'other_membership_no'
            ];

            $detailsData = $request->only($detailsFields);
            $detailsData = array_map(fn($v) => ($v === '' ? null : $v), $detailsData);

            if ($membershipService->payloadHasMembershipData($request->all())) {
                $memberships = $membershipService->membershipsFromPayload($request->all());
                $detailsData = array_merge($detailsData, $membershipService->legacyFieldsFromMemberships($memberships));
                $membershipService->syncForPatient($patient, $memberships);
            }

            if (!empty($detailsData)) {
                if ($patient->details) {
                    $patient->details->update($detailsData);
                } elseif (!empty(array_filter($detailsData, fn($v) => !is_null($v)))) {
                    $patient->details()->create($detailsData);
                }
            }
        });

        // Invalidate patient list cache
        $this->clearPatientListCache($request->user()->clinic_id);
        // Invalidate specific patient cache
        Cache::forget("web:patient:{$id}:clinic:{$request->user()->clinic_id}");

        return response()->json([
            'message' => 'Patient updated successfully',
            'patient' => $patient->fresh()->load(['details', 'memberships']),
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

        return response()->json([
            'message' => 'Patient deleted successfully',
        ]);
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
