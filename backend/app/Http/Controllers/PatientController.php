<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\QueueHistory;
use App\Models\TreatmentRecord;
use App\Services\PatientMembershipService;
use Carbon\Carbon;
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
                'latestConsultationRecord',
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
                      ->whereIn('status', ['waiting', 'in_consultation', 'serving', 'called', 'no_response', 'absent', 'second_chance', 'final_recall', 'requires_checkin'])
                      ->latest();
                }
            ]);

        // Tab-based filtering
        switch ($tab) {
            case 'today_queue':
                $query->where(function ($q) {
                    $q->whereHas('queues', function ($qu) {
                        $qu->whereIn('status', ['waiting', 'in_consultation', 'requires_checkin', 'called', 'serving', 'second_chance', 'final_recall'])
                           ->whereDate('created_at', \Carbon\Carbon::today());
                    })->orWhereHas('appointments', function ($app) {
                        $app->where(function ($d) {
                            $d->where(function ($sub) {
                                $sub->whereDate('appointment_date', \Carbon\Carbon::today())
                                    ->orWhereDate('scheduled_date', \Carbon\Carbon::today());
                            })->whereIn('status', ['scheduled', 'confirmed']);
                        })->orWhere('status', 'confirmed');
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
                $qu->whereIn('status', ['waiting', 'in_consultation', 'requires_checkin', 'called', 'serving', 'second_chance', 'final_recall'])
                   ->whereDate('created_at', \Carbon\Carbon::today());
            })->orWhereHas('appointments', function ($app) {
                $app->where(function ($d) {
                    $d->where(function ($sub) {
                        $sub->whereDate('appointment_date', \Carbon\Carbon::today())
                            ->orWhereDate('scheduled_date', \Carbon\Carbon::today());
                    })->whereIn('status', ['scheduled', 'confirmed']);
                })->orWhere('status', 'confirmed');
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
            'contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email' => 'nullable|string|email|max:255',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'hospital_no' => 'nullable|string|max:100',
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
            // II. For CHU / RHU Personnel Only & III. Consultation Details & Vitals — entered by Registration Staff
            // These are stored in treatment_records, NOT in patients/patient_details.
            'mode_of_transaction'       => 'nullable|in:walk-in,visited,referral',
            'reg_mode_of_transaction'   => 'nullable|in:walk-in,visited,referral',
            'reg_date_of_consultation'  => 'nullable|date',
            'reg_consultation_time'     => 'nullable|string|max:10',
            'reg_blood_pressure'        => 'nullable|string|max:20',
            'reg_temperature'           => 'nullable|string|max:10',
            'reg_height'                => 'nullable|string|max:10',
            'reg_weight'                => 'nullable|string|max:10',
            'reg_attending_provider'    => 'nullable|string|max:255',
            'reg_referred_by'           => 'nullable|string|max:255',
        ], array_merge($membershipService->validationRules(), [
            'contact_number.regex' => 'Mobile number must start with 09 and contain 11 digits.',
            'emergency_contact_number.regex' => 'Mobile number must start with 09 and contain 11 digits.',
        ])));

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
                'hospital_no',
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

            // ── Consultation Details & Vitals ──────────────────────────────────────────
            // If Registration Staff entered any vitals, create an initial TreatmentRecord
            // so that Form 2 can load and display them as read-only.
            // A BiteIncident stub (episode_type = 'pending_assessment') is created first
            // because TreatmentRecord.bite_id is needed for episode-scoped queries.
            // The Doctor will later fill in the clinical assessment on the same episode.
            $vitalsFields = [
                'reg_date_of_consultation', 'reg_consultation_time', 'reg_blood_pressure',
                'reg_temperature', 'reg_height', 'reg_weight',
                'reg_attending_provider', 'reg_referred_by',
            ];
            $hasVitals = collect($vitalsFields)->contains(
                fn($f) => !is_null($request->input($f)) && $request->input($f) !== ''
            );

            if ($hasVitals) {
                $clinicId = $request->user()->clinic_id;

                // Create a pending bite episode to anchor the TreatmentRecord.
                // Registration Staff does not know bite details yet — the Doctor/Nurse
                // will fill those in through Form 2 and Form 3 respectively.
                $biteIncident = BiteIncident::create([
                    'clinic_id'             => $clinicId,
                    'patient_id'            => $patient->patient_id,
                    'episode_number'        => 1,
                    'episode_type'          => 'pending_assessment',
                    'is_previously_vaccinated' => null,
                    'bite_date'             => $request->input('reg_date_of_consultation')
                        ? Carbon::parse($request->input('reg_date_of_consultation'))->toDateString()
                        : Carbon::now('Asia/Manila')->toDateString(),
                    'bite_place'            => null,
                    'site_washed'           => null,
                    'exposure_type'         => 'unassessed',
                    'exposure_mode'         => null,
                    'severity'              => 'unassessed',
                    'animal_type'           => null,
                    'animal_status'         => 'unassessed',
                    'animal_available'      => null,
                    'site_number'           => null,
                    'body_part_exposed'     => null,
                    'laterality'            => null,
                    'wound_description'     => null,
                    'status'                => 'awaiting_assessment',
                    'remarks'               => 'Episode created during Registration Staff patient registration. Exposure details await Doctor/Nurse assessment.',
                    'created_by'            => $request->user()->id,
                ]);

                $consultationDate = $request->input('reg_date_of_consultation')
                    ? Carbon::parse($request->input('reg_date_of_consultation'))->toDateString()
                    : Carbon::now('Asia/Manila')->toDateString();

                $consultationTime = $request->input('reg_consultation_time')
                    ?: Carbon::now('Asia/Manila')->format('H:i');

                // Create the consultation TreatmentRecord with vitals pre-filled.
                // dose_number is null to mark this as a general consultation record
                // (same convention used by TreatmentRecordController::store).
                // nature_of_visit and chief_complaints are left null here — the Doctor
                // will complete the remaining clinical fields when they open Form 2.
                $modeOfTx = $request->input('mode_of_transaction') ?? $request->input('reg_mode_of_transaction');
                $validMode = in_array($modeOfTx, ['walk-in', 'visited', 'referral']) ? $modeOfTx : 'walk-in';

                TreatmentRecord::create([
                    'clinic_id'             => $clinicId,
                    'patient_id'            => $patient->patient_id,
                    'bite_id'               => $biteIncident->bite_id,
                    'dose_number'           => null,
                    'status'                => 'scheduled', // Valid ENUM: scheduled|completed|missed|rescheduled|cancelled
                    'consultation_date'     => $consultationDate,
                    'treatment_date'        => $consultationDate,
                    'consultation_time'     => $consultationTime,
                    'blood_pressure'        => $request->input('reg_blood_pressure'),
                    'temperature'           => $request->input('reg_temperature'),
                    'height'                => $request->input('reg_height'),
                    'weight'                => $request->input('reg_weight'),
                    'attending_provider'    => $request->input('reg_attending_provider'),
                    'referred_by'           => $request->input('reg_referred_by'),
                    'mode_of_transaction'   => $validMode,
                    'administered_by'       => $request->user()->id,
                ]);
            }
            // ── End Consultation Details & Vitals ──────────────────────────────────────

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
                'latestConsultationRecord',
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

        $user = $request->user();
        $isAdminOrReg = in_array($user->role, ['admin', 'registration', 'developer']);

        if (!$isAdminOrReg) {
            $legalFields = ['first_name', 'last_name', 'middle_name', 'suffix', 'gender', 'date_of_birth', 'philhealth_no', 'hospital_no'];
            foreach ($legalFields as $field) {
                if ($request->filled($field)) {
                    $currentVal = $patient->{$field} ?? $patient->details?->{$field};
                    if ($request->input($field) != $currentVal) {
                        return response()->json([
                            'message' => "Only Administrators or Registration Staff can modify legal identity and hospital identifiers ({$field}). Regular clinical staff may only update contact and address details.",
                        ], 403);
                    }
                }
            }
        }

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
            'contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email' => 'nullable|string|email|max:255',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'hospital_no' => 'nullable|string|max:100',
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
        ], array_merge($membershipService->validationRules(), [
            'contact_number.regex' => 'Mobile number must start with 09 and contain 11 digits.',
            'emergency_contact_number.regex' => 'Mobile number must start with 09 and contain 11 digits.',
        ])));

        DB::transaction(function () use ($request, $patient, $membershipService) {
            $patient->update($request->only([
                'first_name', 'middle_name', 'last_name', 'suffix', 'gender', 'age',
                'date_of_birth', 'address', 'contact_number', 'email',
                'emergency_contact_name', 'emergency_contact_number',
            ]));

            $detailsFields = [
                'hospital_no',
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

        // Audit Trail: record editor user ID, role, and demographic update details
        AuditLog::log('update', 'Patient', $patient->id, [
            'description' => "Patient demographic record updated by {$user->name} ({$user->role})",
            'new_values' => $request->only([
                'first_name', 'last_name', 'contact_number', 'email', 'address',
                'emergency_contact_name', 'emergency_contact_number',
                'address_purok', 'address_barangay', 'address_municipality'
            ]),
        ]);

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

    /**
     * Check in a returning patient who missed their initial triage schedule
     * and place them into today's Triage Doctor queue.
     * POST /api/patients/{id}/check-in
     * Access: admin, registration, developer
     */
    public function checkIn(Request $request, $id)
    {
        $clinicId = $request->user()->clinic_id;
        $patient = Patient::where('clinic_id', $clinicId)->find($id);
        if (!$patient) {
            return response()->json([
                'message' => 'This patient is no longer available in your clinic. Refresh the patient list and try again.',
                'code' => 'patient_not_found',
            ], 404);
        }
        $todayDate = Carbon::today()->toDateString();

        // 1. Idempotency: If already active in today's queue, return existing queue entry without creating duplicate
        $activeStatuses = ['waiting', 'called', 'serving', 'in_consultation', 'second_chance', 'final_recall'];
        $existingQueue = Queue::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->where('queue_date', $todayDate)
            ->whereNull('deleted_at')
            ->whereIn('status', $activeStatuses)
            ->first();

        if ($existingQueue) {
            return response()->json([
                'message' => "{$patient->first_name} {$patient->last_name} is already active in today's Doctor Triage queue (Queue #{$existingQueue->queue_number})",
                'queue' => $existingQueue->load(['patient', 'biteIncident']),
                'queue_number' => $existingQueue->queue_number,
                'station' => 'Doctor Assessment',
                'already_checked_in' => true,
            ], 200);
        }

        // 2. Eligibility: verify patient has not already completed triage / started treatment
        $hasCompletedDoses = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->whereNotNull('dose_number')
            ->where('status', 'completed')
            ->exists();

        $hasCompletedConsultation = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->whereNull('dose_number')
            ->where(function ($q) {
                $q->where('status', 'completed')
                  ->orWhereNotNull('nature_of_visit')
                  ->orWhereNotNull('diagnosis');
            })
            ->exists();

        $hasConfirmedEpisode = BiteIncident::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->where(function ($q) {
                $q->whereNotNull('confirmed_at')
                  ->orWhereIn('status', ['active', 'completed'])
                  ->orWhereIn('episode_type', ['primary', 're_exposure']);
            })
            ->exists();

        if ($hasCompletedDoses || $hasCompletedConsultation || $hasConfirmedEpisode) {
            return response()->json([
                'message' => 'This patient has already proceeded to Doctor Triage or started treatment.',
            ], 422);
        }

        // Pre-registered mobile accounts who have only created an account
        // (no appointment booked, no bite intake submitted) cannot be checked in
        $isMobileOrAccount = ($patient->registration_source === 'mobile') || $patient->accounts()->exists();
        $hasIntakeOrAppt = $patient->biteIntakes()->exists() || $patient->appointments()->exists() || $patient->biteIncidents()->exists();
        if ($isMobileOrAccount && !$hasIntakeOrAppt) {
            return response()->json([
                'message' => 'This patient is only pre-registered from the mobile app and has not booked an appointment or submitted an intake.',
            ], 422);
        }

        // 3. Eligibility: verify patient is returning on a later date (registered or scheduled before today)
        $regDate = Carbon::parse($patient->created_at)->toDateString();
        $pastAppointment = Appointment::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->where(function ($q) use ($todayDate) {
                $q->whereDate('scheduled_date', '<', $todayDate)
                  ->orWhereDate('appointment_date', '<', $todayDate);
            })
            ->whereIn('status', ['scheduled', 'missed'])
            ->first();

        $pastConsultationRecord = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->whereNull('dose_number')
            ->where('status', 'scheduled')
            ->whereDate('consultation_date', '<', $todayDate)
            ->first();

        $pastQueue = Queue::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->whereDate('queue_date', '<', $todayDate)
            ->first();

        $hasRequiresCheckinToday = Queue::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->where('queue_date', $todayDate)
            ->whereNull('deleted_at')
            ->where(function ($q) {
                $q->where('status', 'requires_checkin')
                  ->orWhere(function ($sub) {
                      $sub->where('status', 'no_response')
                          ->where('call_count', '>=', 3);
                  });
            })
            ->exists();

        $isReturningOnLaterDate = ($regDate < $todayDate)
            || ($pastAppointment !== null)
            || ($pastConsultationRecord !== null)
            || ($pastQueue !== null);

        if (!$isReturningOnLaterDate && !$hasRequiresCheckinToday) {
            return response()->json([
                'message' => 'Check In is for returning patients who were previously registered or scheduled and are returning on a later date.',
            ], 422);
        }

        return DB::transaction(function () use ($request, $clinicId, $patient, $todayDate, $pastAppointment, $hasRequiresCheckinToday) {
            // Auto-expire stale unserved tickets from prior days
            app(QueueController::class)->expireStaleTickets($clinicId, $todayDate);

            // Race-safe queue number generation
            $lockName = "queue_checkin_{$clinicId}_{$todayDate}";
            $lockTimeout = 5;
            $isMysql = DB::connection()->getDriverName() === 'mysql';

            if ($isMysql) {
                DB::statement("SELECT GET_LOCK(?, ?)", [$lockName, $lockTimeout]);
            }

            try {
                $maxNumber = DB::table('queues')
                    ->where('clinic_id', $clinicId)
                    ->where('queue_date', $todayDate)
                    ->max('queue_number');

                $nextQueueNumber = $maxNumber ? ($maxNumber + 1) : 1;

                // Priority category
                $patientDetail = $patient->details;
                $category = 'regular';
                if ($pastAppointment && $pastAppointment->booked_by_account_id) {
                    $category = 'appointment';
                } elseif ($patientDetail) {
                    if ($patientDetail->fourps_member === 'yes' || $patientDetail->has_membership === 'pwd') {
                        $category = 'pwd';
                    } elseif ($patient->age >= 60) {
                        $category = 'senior_citizen';
                    } elseif ($patientDetail->has_membership === 'pregnant') {
                        $category = 'pregnant';
                    }
                }

                // Look for existing bite incident stub (created during registration or pending)
                $biteIncident = BiteIncident::where('clinic_id', $clinicId)
                    ->where('patient_id', $patient->patient_id)
                    ->whereIn('status', ['awaiting_assessment', 'pending_assessment'])
                    ->latest('bite_id')
                    ->first();

                // Reuse and update existing consultation appointment
                $appointment = $pastAppointment ?? Appointment::where('clinic_id', $clinicId)
                    ->where('patient_id', $patient->patient_id)
                    ->whereIn('status', ['scheduled', 'missed'])
                    ->orderBy('scheduled_date', 'asc')
                    ->first();

                if ($appointment) {
                    $appointment->update([
                        'status' => 'confirmed',
                        'appointment_date' => $todayDate,
                        'scheduled_date' => $todayDate,
                        'queue_number' => $nextQueueNumber,
                    ]);

                    if ($appointment->biteIntake()->exists()) {
                        $intake = $appointment->biteIntake()->where('status', 'pending')->first();
                        if ($intake) {
                            $intake->update([
                                'status' => 'converted',
                                'checked_in_by' => $request->user()->id,
                                'checked_in_at' => now(),
                                'bite_id' => $biteIncident?->bite_id,
                            ]);
                        }
                    }
                }

                // Update existing scheduled TreatmentRecord stub (vitals from registration) for current date and time
                $treatmentRecord = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patient->patient_id)
                    ->whereNull('dose_number')
                    ->where('status', 'scheduled')
                    ->latest('treatment_id')
                    ->first();

                if ($treatmentRecord) {
                    $treatmentRecord->update([
                        'consultation_date' => $todayDate,
                        'treatment_date' => $todayDate,
                        'consultation_time' => Carbon::now('Asia/Manila')->format('H:i'),
                    ]);
                }

                $checkInNotes = $hasRequiresCheckinToday
                    ? 'Patient re-checked in at Registration after 3 missed triage calls'
                    : 'Returning patient checked in for Triage Doctor assessment';

                // Create Queue entry for Triage Doctor queue
                $queue = Queue::create([
                    'clinic_id'      => $clinicId,
                    'patient_id'     => $patient->patient_id,
                    'appointment_id' => $appointment?->appointment_id,
                    'bite_id'        => $biteIncident?->bite_id,
                    'queue_number'   => $nextQueueNumber,
                    'queue_date'     => $todayDate,
                    'visit_type'     => 'new_case',
                    'queue_category' => $category,
                    'priority'       => 'normal',
                    'status'         => 'waiting',
                    'checked_in_at'  => now(),
                    'checked_in_by'  => $request->user()->id,
                    'check_in_notes' => $checkInNotes,
                    'call_count'     => 0,
                ]);

                QueueHistory::create([
                    'queue_id'     => $queue->queue_id,
                    'clinic_id'    => $clinicId,
                    'patient_id'   => $patient->patient_id,
                    'action'       => 'checked_in',
                    'from_status'  => null,
                    'to_status'    => 'waiting',
                    'call_count'   => 0,
                    'performed_by' => $request->user()->id,
                    'notes'        => $checkInNotes,
                    'occurred_at'  => now(),
                ]);

                Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");

                app(\App\Services\NotificationService::class)->notifyQueueEvent($queue->load('patient'), 'checked_in', $request->user());

                return response()->json([
                    'message' => "{$patient->first_name} {$patient->last_name} checked in successfully to Doctor Triage (Queue #{$nextQueueNumber})",
                    'queue' => $queue->load(['patient', 'biteIncident']),
                    'queue_number' => $nextQueueNumber,
                    'station' => 'Doctor Assessment',
                ], 200);
            } finally {
                if ($isMysql) {
                    DB::statement("SELECT RELEASE_LOCK(?)", [$lockName]);
                }
            }
        });
    }
}
