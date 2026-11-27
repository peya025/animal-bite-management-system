<?php

namespace App\Services\Clinical;

use App\Events\AppointmentStatusChanged;
use App\Events\QueueTicketUpdated;
use App\Exceptions\DuplicatePatientException;
use App\Http\Controllers\Operations\QueueController;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\QueueHistory;
use App\Models\Station;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\Clinical\BiteIncidentIntakeService;
use App\Services\Clinical\PatientRowActions;
use App\Services\NotificationService;
use App\Services\PatientMembershipService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PatientService
{
    public function __construct(
        protected PatientMembershipService $membershipService,
        protected NotificationService $notificationService
    ) {}

    /**
     * Get paginated patient registry with tab filtering and search.
     */
    public function getPaginatedPatients(int $clinicId, array $filters, int $perPage = 15): array
    {
        $tab = $filters['tab'] ?? 'all';

        $nowManila = Carbon::now('Asia/Manila');
        $todayDate = $nowManila->toDateString();
        $startOfDay = $nowManila->copy()->startOfDay();
        $endOfDay = $nowManila->copy()->endOfDay();

        $query = Patient::where('clinic_id', $clinicId)
            ->with([
                'registeredBy',
                'details',
                'memberships',
                'latestTreatmentRecord',
                'latestConsultationRecord',
                'upcomingAppointment',
                'biteIncidents' => function ($bi) {
                    $bi->with('treatmentPlan')->latest('bite_date')->latest('bite_id');
                },
                'appointments' => function ($app) {
                    $app->orderBy('scheduled_date', 'asc');
                },
                'biteIntakes' => function ($bi) {
                    $bi->latest();
                },
                'accounts',
                'queues' => function ($q) use ($todayDate, $startOfDay, $endOfDay) {
                    $q->whereNull('deleted_at')
                      ->where(function ($sub) use ($todayDate, $startOfDay, $endOfDay) {
                          $sub->where('queue_date', $todayDate)
                              ->orWhereBetween('checked_in_at', [$startOfDay, $endOfDay])
                              ->orWhere(function ($ts) use ($startOfDay, $endOfDay) {
                                  $ts->whereNull('queue_date')
                                     ->whereBetween('created_at', [$startOfDay, $endOfDay]);
                              });
                      })
                      ->where('status', '!=', 'cancelled')
                      ->latest('queue_id');
                },
                'treatmentRecords' => function ($q) {
                    $q->whereNull('voided_at')->orderBy('treatment_id', 'asc');
                },
                'invitations' => function ($q) {
                    $q->latest('id');
                },
            ]);

        switch ($tab) {
            case 'today_queue':
                $query->whereHas('queues', function ($qu) use ($todayDate, $startOfDay, $endOfDay) {
                    $qu->whereNull('deleted_at')
                       ->where(function ($sub) use ($todayDate, $startOfDay, $endOfDay) {
                           $sub->where('queue_date', $todayDate)
                               ->orWhereBetween('checked_in_at', [$startOfDay, $endOfDay])
                               ->orWhere(function ($ts) use ($startOfDay, $endOfDay) {
                                   $ts->whereNull('queue_date')
                                      ->whereBetween('created_at', [$startOfDay, $endOfDay]);
                               });
                       })
                       ->where('status', '!=', 'cancelled');
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
                $query->whereHas('appointments', function ($q) use ($todayDate) {
                    $q->where(function ($d) use ($todayDate) {
                        $d->whereDate('appointment_date', '<', $todayDate)
                          ->orWhereDate('scheduled_date', '<', $todayDate);
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
                break;
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function($q) use ($search) {
                $q->where('patient_number', 'like', "%{$search}%")
                  ->orWhere(function ($nameQuery) use ($search) {
                      $nameQuery->searchName($search);
                  });
            });
        }

        if (!empty($filters['gender'])) {
            $query->where('gender', $filters['gender']);
        }

        if (!empty($filters['membership_type']) && $filters['membership_type'] !== 'all') {
            $type = $filters['membership_type'];
            $query->whereHas('memberships', function ($mQuery) use ($type) {
                $mQuery->where('membership_type', $type)->where('is_active', true);
            });
        }

        if ($tab === 'today_queue' && empty($filters['sort_by'])) {
            $query->orderBy(
                Queue::select('queue_number')
                    ->whereColumn('queues.patient_id', 'patients.patient_id')
                    ->where('queues.clinic_id', $clinicId)
                    ->whereNull('queues.deleted_at')
                    ->where(function ($sub) use ($todayDate, $startOfDay, $endOfDay) {
                        $sub->where('queue_date', $todayDate)
                            ->orWhereBetween('checked_in_at', [$startOfDay, $endOfDay])
                            ->orWhere(function ($ts) use ($startOfDay, $endOfDay) {
                                $ts->whereNull('queue_date')
                                   ->whereBetween('created_at', [$startOfDay, $endOfDay]);
                            });
                    })
                    ->orderBy('queue_number', 'asc')
                    ->limit(1),
                'asc'
            );
        } else {
            $sortBy = $filters['sort_by'] ?? 'created_at';
            $sortOrder = $filters['sort_order'] ?? 'desc';
            $query->orderBy($sortBy, $sortOrder);
        }

        $paginated = $query->paginate($perPage);

        $allCount = Patient::where('clinic_id', $clinicId)->count();

        $todayQueueCount = Patient::where('clinic_id', $clinicId)->whereHas('queues', function ($qu) use ($todayDate, $startOfDay, $endOfDay) {
            $qu->whereNull('deleted_at')
               ->where(function ($sub) use ($todayDate, $startOfDay, $endOfDay) {
                   $sub->where('queue_date', $todayDate)
                       ->orWhereBetween('checked_in_at', [$startOfDay, $endOfDay])
                       ->orWhere(function ($ts) use ($startOfDay, $endOfDay) {
                           $ts->whereNull('queue_date')
                              ->whereBetween('created_at', [$startOfDay, $endOfDay]);
                       });
               })
               ->where('status', '!=', 'cancelled');
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

        $overdueCount = Patient::where('clinic_id', $clinicId)->whereHas('appointments', function ($q) use ($todayDate) {
            $q->where(function ($d) use ($todayDate) {
                $d->whereDate('appointment_date', '<', $todayDate)
                  ->orWhereDate('scheduled_date', '<', $todayDate);
            })->whereIn('status', ['scheduled', 'missed']);
        })->count();

        $preRegisteredCount = Patient::where('clinic_id', $clinicId)->where(function ($q) {
            $q->where('registration_source', 'mobile')
              ->orWhereHas('accounts');
        })->whereDoesntHave('biteIntakes')
          ->whereDoesntHave('appointments')
          ->count();

        $res = $paginated->toArray();
        foreach ($paginated->items() as $idx => $patientModel) {
            $res['data'][$idx]['actions'] = PatientRowActions::resolve($patientModel);
        }
        $res['all_count'] = $allCount;
        $res['today_queue_count'] = $todayQueueCount;
        $res['online_count'] = $onlineCount;
        $res['overdue_count'] = $overdueCount;
        $res['pre_registered_count'] = $preRegisteredCount;

        return $res;
    }

    /**
     * Check for potential duplicate or same-name (homonym) patient records in the clinic.
     *
     * @param  array<string, mixed>  $input
     * @return array{has_exact_match: bool, has_matches: bool, matches: array<int, array<string, mixed>>}
     */
    public function checkDuplicatePatients(int $clinicId, array $input): array
    {
        $firstName = $this->normalizeNamePart($input['first_name'] ?? '');
        $lastName = $this->normalizeNamePart($input['last_name'] ?? '');
        $middleName = $this->normalizeNamePart($input['middle_name'] ?? '');
        $suffix = $this->normalizeSuffix($input['suffix'] ?? '');
        $dob = !empty($input['date_of_birth'])
            ? Carbon::parse($input['date_of_birth'])->toDateString()
            : null;
        $excludeId = !empty($input['exclude_patient_id'])
            ? (int) $input['exclude_patient_id']
            : null;

        if (mb_strlen($firstName) < 2 || mb_strlen($lastName) < 2) {
            return [
                'has_exact_match' => false,
                'has_matches'     => false,
                'matches'         => [],
            ];
        }

        $candidates = Patient::where('clinic_id', $clinicId)
            ->when($excludeId, fn($q) => $q->where('patient_id', '!=', $excludeId))
            ->whereRaw('LOWER(TRIM(last_name)) = ?', [$lastName])
            ->with([
                'details',
                'accounts',
                'biteIncidents' => fn($q) => $q->latest('bite_date'),
                'treatmentRecords' => fn($q) => $q->latest('consultation_date'),
            ])
            ->limit(50)
            ->get();

        $matches = [];
        $tierPriority = ['exact' => 1, 'high' => 2, 'homonym' => 3];

        foreach ($candidates as $candidate) {
            $candFirst = $this->normalizeNamePart($candidate->first_name);
            $candMiddle = $this->normalizeNamePart($candidate->middle_name);
            $candSuffix = $this->normalizeSuffix($candidate->suffix);
            $candDob = $candidate->date_of_birth
                ? $candidate->date_of_birth->format('Y-m-d')
                : null;

            $isExactFirst = ($candFirst === $firstName);
            $isCompoundFirst = !$isExactFirst && (
                str_starts_with($candFirst, $firstName . ' ')
                || str_starts_with($firstName, $candFirst . ' ')
            );

            if (!$isExactFirst && !$isCompoundFirst) {
                continue;
            }

            // Detect explicit suffix conflict (e.g. "Sr." vs "Jr.", or one has "Jr." while the other has "Sr.")
            $hasExplicitSuffixConflict = ($suffix !== '' && $candSuffix !== '' && $suffix !== $candSuffix)
                || ($suffix !== '' && $candSuffix === '' && in_array($suffix, ['jr', 'sr', 'ii', 'iii', 'iv', 'v'], true))
                || ($suffix === '' && $candSuffix !== '' && in_array($candSuffix, ['jr', 'sr', 'ii', 'iii', 'iv', 'v'], true));

            if ($dob !== null && $candDob !== null) {
                if ($dob === $candDob && $isExactFirst && !$hasExplicitSuffixConflict) {
                    $tier = 'exact';
                } else {
                    $tier = 'homonym';
                }
            } else {
                if ($hasExplicitSuffixConflict) {
                    $tier = 'homonym';
                } elseif ($middleName !== '' && $candMiddle !== '' && $middleName !== $candMiddle) {
                    $tier = 'homonym';
                } else {
                    $tier = 'high';
                }
            }

            $latestTreatment = $candidate->treatmentRecords->first();
            $latestIncident = $candidate->biteIncidents->first();
            $rawVisitDate = $latestTreatment?->consultation_date
                ?? $latestTreatment?->treatment_date
                ?? $latestIncident?->bite_date;
            $lastVisitDate = $rawVisitDate
                ? Carbon::parse($rawVisitDate)->toDateString()
                : null;

            $matches[] = [
                'patient_id'            => $candidate->patient_id,
                'patient_number'        => $candidate->patient_number,
                'first_name'            => $candidate->first_name,
                'middle_name'           => $candidate->middle_name,
                'last_name'             => $candidate->last_name,
                'suffix'                => $candidate->suffix,
                'full_name'             => $candidate->name,
                'gender'                => $candidate->gender,
                'date_of_birth'         => $candDob,
                'age'                   => $candidate->age,
                'registration_source'   => $candidate->registration_source ?? 'staff',
                'has_mobile_account'    => ($candidate->registration_source === 'mobile') || $candidate->accounts->isNotEmpty(),
                'address_barangay'      => $candidate->details?->address_barangay,
                'address_municipality'  => $candidate->details?->address_municipality,
                'mother_maiden_name'    => $candidate->details?->mother_maiden_name,
                'has_completed_primary' => (bool) $candidate->has_completed_primary,
                'active_episodes_count' => $candidate->biteIncidents
                    ->whereIn('status', ['active', 'awaiting_assessment', 'pending_assessment'])
                    ->count(),
                'last_visit_date'       => $lastVisitDate,
                'match_tier'            => $tier,
            ];
        }

        usort($matches, fn(array $a, array $b) => ($tierPriority[$a['match_tier']] ?? 9) <=> ($tierPriority[$b['match_tier']] ?? 9));
        $matches = array_slice($matches, 0, 5);

        $hasExactMatch = collect($matches)->contains(fn(array $m) => $m['match_tier'] === 'exact');

        return [
            'has_exact_match' => $hasExactMatch,
            'has_matches'     => !empty($matches),
            'matches'         => $matches,
        ];
    }

    /**
     * Normalize a name part for case-insensitive and whitespace-insensitive comparison.
     */
    private function normalizeNamePart(?string $value): string
    {
        if ($value === null) {
            return '';
        }

        return mb_strtolower((string) preg_replace('/\s+/u', ' ', trim($value)));
    }

    /**
     * Normalize a suffix (e.g., "Jr." -> "jr", "Sr." -> "sr").
     */
    private function normalizeSuffix(?string $value): string
    {
        return rtrim($this->normalizeNamePart($value), '.');
    }

    /**
     * Store new patient registration with optional vitals and pending episode.
     */
    public function storePatient(int $clinicId, array $validated, User $user, array $rawInput): Patient
    {
        $forceCreate = filter_var($rawInput['force_create'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $duplicateCheck = $this->checkDuplicatePatients($clinicId, [
            'first_name'    => $validated['first_name'] ?? '',
            'last_name'     => $validated['last_name'] ?? '',
            'middle_name'   => $validated['middle_name'] ?? null,
            'suffix'        => $validated['suffix'] ?? null,
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'gender'        => $validated['gender'] ?? null,
        ]);

        $exactMatches = array_values(array_filter(
            $duplicateCheck['matches'],
            fn(array $m) => $m['match_tier'] === 'exact'
        ));

        if (!empty($exactMatches) && !$forceCreate) {
            $primaryMatch = $exactMatches[0];
            $dobFormatted = !empty($primaryMatch['date_of_birth'])
                ? Carbon::parse($primaryMatch['date_of_birth'])->format('M j, Y')
                : 'unspecified birth date';

            throw new DuplicatePatientException(
                "A patient with the exact same name and birth date ({$dobFormatted}) is already registered ({$primaryMatch['patient_number']}). Please use the existing record or confirm that this is a different person.",
                $duplicateCheck['matches']
            );
        }

        $patient = DB::transaction(function () use ($clinicId, $validated, $user, $rawInput) {
            $patient = Patient::create([
                'clinic_id' => $clinicId,
                'first_name' => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name' => $validated['last_name'],
                'suffix' => isset($validated['suffix']) && trim((string) $validated['suffix']) !== '' ? trim((string) $validated['suffix']) : null,
                'gender' => $validated['gender'],
                'age' => $validated['age'] ?? null,
                'date_of_birth' => $validated['date_of_birth'] ?? null,
                'address' => $validated['address'] ?? null,
                'contact_number' => $validated['contact_number'] ?? null,
                'email' => $validated['email'] ?? null,
                'emergency_contact_name' => $validated['emergency_contact_name'] ?? null,
                'emergency_contact_number' => $validated['emergency_contact_number'] ?? null,
                'registered_by' => $user->id,
                'registration_source' => 'staff',
            ]);

            $detailsKeys = [
                'hospital_no',
                'blood_type', 'mother_maiden_name', 'civil_status', 'spouse_name',
                'address_municipality', 'address_barangay', 'address_purok', 'province',
                'educational_attainment', 'employment_status', 'family_member',
                'philhealth_member', 'philhealth_status', 'philhealth_no', 'philhealth_category',
                'fourps_member', 'fourps_category', 'fourps_relationship', 'registered_fourps_beneficiary',
                'dswd_nhts', 'has_membership', 'other_membership', 'other_membership_name', 'other_membership_no'
            ];

            $detailsData = [];
            foreach ($detailsKeys as $key) {
                if (array_key_exists($key, $rawInput)) {
                    $detailsData[$key] = $rawInput[$key] === '' ? null : $rawInput[$key];
                }
            }

            $memberships = $this->membershipService->membershipsFromPayload($rawInput);
            $detailsData = array_merge($detailsData, $this->membershipService->legacyFieldsFromMemberships($memberships));

            if (!empty(array_filter($detailsData, fn($v) => !is_null($v)))) {
                $patient->details()->create($detailsData);
            }

            $this->membershipService->syncForPatient($patient, $memberships);

            $vitalsFields = [
                'reg_date_of_consultation', 'reg_consultation_time', 'reg_blood_pressure',
                'reg_temperature', 'reg_height', 'reg_weight',
                'reg_attending_provider', 'reg_referred_by',
                'nature_of_visit', 'reg_nature_of_visit',
            ];
            $hasVitals = collect($vitalsFields)->contains(
                fn($f) => !empty($rawInput[$f])
            );

            if ($hasVitals || \App\Support\RegistrationAnimal::values($validated)) {
                $biteIncident = BiteIncident::create([
                    'clinic_id'             => $clinicId,
                    'patient_id'            => $patient->patient_id,
                    'episode_number'        => 1,
                    'episode_type'          => 'pending_assessment',
                    'is_previously_vaccinated' => null,
                    'bite_date'             => !empty($rawInput['reg_date_of_consultation'])
                        ? Carbon::parse($rawInput['reg_date_of_consultation'])->toDateString()
                        : Carbon::now('Asia/Manila')->toDateString(),
                    ...(BiteIncident::supportsProvisionalBiteDateColumn() ? ['bite_date_is_provisional' => true] : []),
                    'bite_place'            => null,
                    'site_washed'           => null,
                    'exposure_type'         => 'unassessed',
                    'exposure_mode'         => null,
                    'severity'              => 'unassessed',
                    'animal_type'           => null,
                    'animal_status'         => 'unassessed',
                    'animal_available'      => null,
                    ...\App\Support\RegistrationAnimal::values($validated),
                    'site_number'           => null,
                    'body_part_exposed'     => null,
                    'laterality'            => null,
                    'wound_description'     => null,
                    'status'                => 'awaiting_assessment',
                    'remarks'               => 'Episode created during Registration Staff patient registration. Exposure details await Doctor/Nurse assessment.',
                    'created_by'            => $user->id,
                ]);

                $consultationDate = !empty($rawInput['reg_date_of_consultation'])
                    ? Carbon::parse($rawInput['reg_date_of_consultation'])->toDateString()
                    : Carbon::now('Asia/Manila')->toDateString();

                $consultationTime = !empty($rawInput['reg_consultation_time'])
                    ? $rawInput['reg_consultation_time']
                    : Carbon::now('Asia/Manila')->format('H:i');

                $modeOfTx = $rawInput['mode_of_transaction'] ?? ($rawInput['reg_mode_of_transaction'] ?? null);
                $validMode = in_array($modeOfTx, ['walk-in', 'visited', 'referral', 'online'], true) ? $modeOfTx : 'walk-in';

                $natureOfVisit = $rawInput['nature_of_visit'] ?? ($rawInput['reg_nature_of_visit'] ?? null);
                $validNatureOfVisit = in_array($natureOfVisit, ['new_consultation', 'new_admission', 'follow_up'], true) ? $natureOfVisit : null;

                TreatmentRecord::create([
                    'clinic_id'             => $clinicId,
                    'patient_id'            => $patient->patient_id,
                    'bite_id'               => $biteIncident->bite_id,
                    'dose_number'           => null,
                    'status'                => 'scheduled',
                    'consultation_date'     => $consultationDate,
                    'treatment_date'        => $consultationDate,
                    'consultation_time'     => $consultationTime,
                    'blood_pressure'        => $rawInput['reg_blood_pressure'] ?? null,
                    'temperature'           => $rawInput['reg_temperature'] ?? null,
                    'height'                => $rawInput['reg_height'] ?? null,
                    'weight'                => $rawInput['reg_weight'] ?? null,
                    'nature_of_visit'       => $validNatureOfVisit,
                    'attending_provider'    => $validMode === 'referral' ? ($rawInput['reg_attending_provider'] ?? null) : null,
                    'referred_by'           => $validMode === 'referral' ? ($rawInput['reg_referred_by'] ?? null) : null,
                    'mode_of_transaction'   => $validMode,
                    'administered_by'       => $user->id,
                ]);
            }

            // Record registration encounter and optional fee
            $parsedFee = app(\App\Services\RegistrationFeeService::class)->validateAndParsePayload(
                $clinicId,
                $rawInput['registration_fee'] ?? null
            );

            $encounter = app(\App\Services\RegistrationFeeService::class)->getOrCreateEncounter(
                $clinicId,
                $patient->patient_id,
                'new_patient',
                $biteIncident?->bite_id ?? null,
                null,
                null,
                $user->id
            );

            if ($parsedFee) {
                app(\App\Services\RegistrationFeeService::class)->recordEncounterFee($encounter, $parsedFee, $user);
            }

            $patient->setRelation('registrationEncounter', $encounter);

            return $patient;
        });

        if ($forceCreate && !empty($duplicateCheck['matches'])) {
            try {
                $existingNumbers = implode(', ', array_column($duplicateCheck['matches'], 'patient_number'));
                AuditLog::log('create_homonym_override', 'Patient', $patient->patient_id, [
                    'description' => "Staff {$user->name} confirmed new patient {$patient->name} ({$patient->patient_number}) is distinct from existing same-name record(s): {$existingNumbers}",
                    'new_values'  => [
                        'patient_number'           => $patient->patient_number,
                        'full_name'                => $patient->name,
                        'date_of_birth'            => $patient->date_of_birth?->format('Y-m-d'),
                        'overridden_patient_ids'   => array_column($duplicateCheck['matches'], 'patient_id'),
                        'overridden_patient_nos'   => array_column($duplicateCheck['matches'], 'patient_number'),
                    ],
                ]);
            } catch (\Throwable) {
                // Never allow audit logging failure to disrupt primary patient registration
            }
        }

        app(BiteCaseService::class)->clearBiteCasesCache($clinicId);

        return $patient;
    }

    /**
     * Get patient details with related records.
     */
    public function getPatientDetails(int $clinicId, int $id): Patient
    {
        return Patient::where('clinic_id', $clinicId)
            ->with([
                'registeredBy',
                'details',
                'memberships',
                'latestConsultationRecord',
                'biteIntakes' => function ($query) use ($clinicId) {
                    $query->where('clinic_id', $clinicId)
                        ->select('intake_id', 'patient_id', 'referral_document_photo', 'submitted_at')
                        ->orderByDesc('intake_id')->limit(1);
                },
                'biteIncidents' => function($query) {
                    $query->with(['treatmentRecords' => function($q) {
                        $q->orderBy('dose_number')->orderBy('scheduled_date');
                    }])->latest('bite_date');
                },
                'treatmentRecords' => function($query) {
                    $query->orderBy('dose_number')->orderBy('scheduled_date');
                },
                'registrationEncounters' => function ($query) use ($clinicId) {
                    $query->where('clinic_id', $clinicId)
                        ->with(['fee.items', 'fee.payments.recordedBy', 'fee.payments.voidedBy'])
                        ->latest('id');
                },
            ])
            ->findOrFail($id);
    }

    /**
     * Update patient information.
     */
    public function updatePatient(int $clinicId, int $id, array $validated, User $user, array $rawInput): Patient
    {
        $patient = Patient::where('clinic_id', $clinicId)->findOrFail($id);

        DB::transaction(function () use ($patient, $validated, $rawInput) {
            $patientFields = [
                'first_name', 'middle_name', 'last_name', 'suffix', 'gender', 'age',
                'date_of_birth', 'address', 'contact_number', 'email',
                'emergency_contact_name', 'emergency_contact_number',
            ];
            $patientUpdate = [];
            foreach ($patientFields as $f) {
                if (array_key_exists($f, $validated)) {
                    $patientUpdate[$f] = ($f === 'suffix' && trim((string) ($validated[$f] ?? '')) === '')
                        ? null
                        : $validated[$f];
                }
            }
            $patient->update($patientUpdate);
            if (!empty($validated['animal_bite_id'])) {
                $patient->biteIncidents()->where('clinic_id', $patient->clinic_id)
                    ->findOrFail($validated['animal_bite_id'])
                    ->update(\App\Support\RegistrationAnimal::values($validated));
            }

            $detailsFields = [
                'hospital_no',
                'blood_type', 'mother_maiden_name', 'civil_status', 'spouse_name',
                'address_municipality', 'address_barangay', 'address_purok', 'province',
                'educational_attainment', 'employment_status', 'family_member',
                'philhealth_member', 'philhealth_status', 'philhealth_no', 'philhealth_category',
                'fourps_member', 'fourps_category', 'fourps_relationship', 'registered_fourps_beneficiary',
                'dswd_nhts', 'has_membership', 'other_membership', 'other_membership_name', 'other_membership_no'
            ];

            $detailsData = [];
            foreach ($detailsFields as $key) {
                if (array_key_exists($key, $rawInput)) {
                    $detailsData[$key] = $rawInput[$key] === '' ? null : $rawInput[$key];
                }
            }

            if ($this->membershipService->payloadHasMembershipData($rawInput)) {
                $memberships = $this->membershipService->membershipsFromPayload($rawInput);
                $detailsData = array_merge($detailsData, $this->membershipService->legacyFieldsFromMemberships($memberships));
                $this->membershipService->syncForPatient($patient, $memberships);
            }

            if (!empty($detailsData)) {
                if ($patient->details) {
                    $patient->details->update($detailsData);
                } elseif (!empty(array_filter($detailsData, fn($v) => !is_null($v)))) {
                    $patient->details()->create($detailsData);
                }
            }
        });

        AuditLog::log('update', 'Patient', $patient->id, [
            'description' => "Patient demographic record updated by {$user->name} ({$user->role})",
            'new_values' => array_intersect_key($rawInput, array_flip([
                'first_name', 'last_name', 'contact_number', 'email', 'address',
                'emergency_contact_name', 'emergency_contact_number',
                'address_purok', 'address_barangay', 'address_municipality'
            ])),
        ]);

        $this->clearPatientListCache($clinicId);
        app(BiteCaseService::class)->clearBiteCasesCache($clinicId);
        Cache::forget("web:patient:{$id}:clinic:{$clinicId}");
        if (!empty($validated['animal_bite_id'])) {
            Cache::forget("web:bite-case:{$validated['animal_bite_id']}:clinic:{$clinicId}");
        }

        return $patient->fresh()->load(['details', 'memberships']);
    }

    /**
     * Delete patient (soft delete).
     */
    public function deletePatient(int $clinicId, int $id): void
    {
        $patient = Patient::where('clinic_id', $clinicId)->findOrFail($id);
        $patient->delete();
    }

    /**
     * Get patient bite case history.
     */
    public function getPatientBiteCases(int $clinicId, int $id): mixed
    {
        $patient = Patient::where('clinic_id', $clinicId)->findOrFail($id);

        return $patient->biteIncidents()
            ->with(['createdBy', 'vaccinationSchedules'])
            ->orderBy('bite_date', 'desc')
            ->get();
    }

    /**
     * Get patient vaccination schedule history.
     */
    public function getPatientVaccinations(int $clinicId, int $id): mixed
    {
        $patient = Patient::where('clinic_id', $clinicId)->findOrFail($id);

        return $patient->vaccinationSchedules()
            ->with(['biteIncident', 'administeredBy'])
            ->orderBy('scheduled_date')
            ->get();
    }

    /**
     * Check in a returning patient who missed their initial triage schedule,
     * OR check in a returning patient with pending unadministered treatment for Doctor Reassessment.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function checkInReturningPatient(int $clinicId, int $id, User $user, array $payload = []): array
    {
        $patient = Patient::where('clinic_id', $clinicId)->find($id);
        if (!$patient) {
            return [
                'status' => 404,
                'data' => [
                    'message' => 'This patient is no longer available in your clinic. Refresh the patient list and try again.',
                    'code' => 'patient_not_found',
                ],
            ];
        }
        $todayDate = Carbon::today()->toDateString();

        $activeStatuses = ['waiting', 'called', 'serving', 'in_consultation', 'second_chance', 'final_recall'];
        $existingQueue = Queue::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->where('queue_date', $todayDate)
            ->whereNull('deleted_at')
            ->whereIn('status', $activeStatuses)
            ->first();

        if ($existingQueue) {
            return [
                'status' => 200,
                'data' => [
                    'message' => "{$patient->first_name} {$patient->last_name} is already active in today's Doctor Triage queue (Queue #{$existingQueue->queue_number})",
                    'code' => 'ALREADY_IN_QUEUE',
                    'queue' => $existingQueue->load(['patient', 'biteIncident']),
                    'queue_number' => $existingQueue->queue_number,
                    'station' => 'Doctor Assessment',
                    'already_checked_in' => true,
                ],
            ];
        }

        $statusSummary = $patient->resolveEpisodeStatusSummary();
        $pendingSummary = $statusSummary['pending_treatment_summary'] ?? null;
        $isPendingTreatmentReassessment = !empty($pendingSummary['has_pending_treatment'])
            && !empty($pendingSummary['can_check_in_for_reassessment']);

        $isReassessment = !empty($payload['is_reassessment']);

        if ($isPendingTreatmentReassessment && !$isReassessment) {
            return [
                'status' => 409,
                'data' => [
                    'message' => 'Reassessment required before check-in.',
                    'code' => 'REASSESSMENT_REQUIRED',
                ],
            ];
        }

        if ($isReassessment && !$isPendingTreatmentReassessment) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'This patient does not have pending administration requiring reassessment.',
                    'code' => 'NOT_ELIGIBLE_FOR_REASSESSMENT',
                ],
            ];
        }

        if ($isReassessment && !$isPendingTreatmentReassessment) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'This patient does not have pending administration requiring reassessment.',
                    'code' => 'NO_REASSESSMENT_REQUIRED',
                ],
            ];
        }

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
                  ->orWhereNotNull('diagnosis')
                  ->orWhereNotNull('chief_complaints');
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

        if ($patient->is_category1_no_treatment) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Doctor assessment is completed (Category I — No Treatment Required). This patient cannot enter the treatment queue.',
                ],
            ];
        }

        if ($patient->treatment_status === 'transferred_referred' || ($statusSummary['treatment_status'] ?? '') === 'transferred_referred' || $patient->case_status === 'transferred_out') {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Doctor assessment is completed (Transferred/Referred). This patient cannot enter the treatment queue.',
                ],
            ];
        }

        if (($statusSummary['treatment_status'] ?? '') === 'completed_without_injection') {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Doctor assessment is completed (No Injection Required). This patient cannot enter the treatment queue.',
                ],
            ];
        }

        if (!$isPendingTreatmentReassessment && ($course = $patient->ongoing_course)) {
            return ['status' => 422, 'data' => [
                'code' => 'ongoing_treatment_course', 'message' => $course['message'], 'ongoing_course' => $course,
            ]];
        }

        if (!$isPendingTreatmentReassessment && ($hasCompletedDoses || $hasCompletedConsultation || $hasConfirmedEpisode)) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'This patient has already proceeded to Doctor Triage or started treatment.',
                ],
            ];
        }

        if ($isPendingTreatmentReassessment) {
            $bp = trim((string) ($payload['blood_pressure'] ?? ''));
            $temp = trim((string) ($payload['temperature'] ?? ''));
            $weight = trim((string) ($payload['weight'] ?? ''));
            $height = trim((string) ($payload['height'] ?? ''));

            if ($bp === '' || $temp === '' || $weight === '' || $height === '') {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'Updated vital signs (Blood Pressure, Temperature, Weight, and Height) are required when checking in a returning patient for reassessment.',
                        'requires_vitals' => true,
                        'pending_treatment_summary' => $pendingSummary,
                    ],
                ];
            }
        }

        $isMobileOrAccount = ($patient->registration_source === 'mobile') || $patient->accounts()->exists();
        $hasNonCancelledAppt = $patient->appointments()->where('status', '!=', 'cancelled')->exists();
        $hasNonCancelledIntake = $patient->biteIntakes()
            ->where(function ($q) {
                $q->whereNull('appointment_id')
                  ->orWhereHas('appointment', fn ($aq) => $aq->where('status', '!=', 'cancelled'));
            })
            ->exists();
        $hasIntakeOrAppt = $hasNonCancelledIntake || $hasNonCancelledAppt || $patient->biteIncidents()->exists();
        if ($isMobileOrAccount && !$hasIntakeOrAppt) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'This patient is only pre-registered from the mobile app and has not booked an appointment or submitted an intake.',
                ],
            ];
        }

        $regDate = Carbon::parse($patient->created_at)->toDateString();
        $dueAppointment = Appointment::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->where(function ($q) use ($todayDate) {
                $q->whereDate('scheduled_date', '<=', $todayDate)
                  ->orWhereDate('appointment_date', '<=', $todayDate);
            })
            ->whereIn('status', ['scheduled', 'missed'])
            ->orderBy('scheduled_date', 'asc')
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

        $latestQueueToday = Queue::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->where('queue_date', $todayDate)
            ->whereNull('deleted_at')
            ->latest('queue_id')
            ->first();

        $hasRequiresCheckinToday = $latestQueueToday && (
            $latestQueueToday->status === 'requires_checkin' ||
            ($latestQueueToday->status === 'no_response' && $latestQueueToday->call_count >= 3)
        );

        $isReturningOnLaterDate = ($regDate < $todayDate)
            || ($dueAppointment !== null)
            || ($pastConsultationRecord !== null)
            || ($pastQueue !== null)
            || $isPendingTreatmentReassessment;

        if (!$isReturningOnLaterDate && !$hasRequiresCheckinToday) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Check In is for returning patients who were previously registered or scheduled and are returning on a later date.',
                ],
            ];
        }

        return DB::transaction(function () use ($clinicId, $patient, $todayDate, $dueAppointment, $hasRequiresCheckinToday, $isPendingTreatmentReassessment, $pendingSummary, $payload, $user) {
            app(QueueController::class)->expireStaleTickets($clinicId, $todayDate);

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

                $patientDetail = $patient->details;
                $category = 'regular';
                if ($dueAppointment && $dueAppointment->booked_by_account_id) {
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

                if ($isPendingTreatmentReassessment && !empty($pendingSummary['bite_id'])) {
                    $biteIncident = BiteIncident::where('clinic_id', $clinicId)
                        ->where('patient_id', $patient->patient_id)
                        ->find($pendingSummary['bite_id']);
                } else {
                    $biteIncident = BiteIncident::where('clinic_id', $clinicId)
                        ->where('patient_id', $patient->patient_id)
                        ->whereIn('status', ['awaiting_assessment', 'pending_assessment', 'active'])
                        ->latest('bite_id')
                        ->first();
                }

                $appointment = $dueAppointment ?? Appointment::where('clinic_id', $clinicId)
                    ->where('patient_id', $patient->patient_id)
                    ->whereIn('status', ['scheduled', 'missed'])
                    ->orderBy('scheduled_date', 'asc')
                    ->first();

                if ($appointment && !$isPendingTreatmentReassessment) {
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
                                'checked_in_by' => $user->id,
                                'checked_in_at' => now(),
                                'bite_id' => $biteIncident?->bite_id,
                            ]);
                        }
                    }
                }

                $reassessmentVitalsRecord = null;
                if ($isPendingTreatmentReassessment && $biteIncident) {
                    $reassessmentDate = !empty($payload['consultation_date']) ? $payload['consultation_date'] : $todayDate;
                    $reassessmentTime = !empty($payload['consultation_time']) ? $payload['consultation_time'] : Carbon::now('Asia/Manila')->format('H:i');

                    $existingScheduledReassessment = TreatmentRecord::where('clinic_id', $clinicId)
                        ->where('patient_id', $patient->patient_id)
                        ->where('bite_id', $biteIncident->bite_id)
                        ->whereNull('dose_number')
                        ->whereNull('medication_given')
                        ->where('status', 'scheduled')
                        ->latest('treatment_id')
                        ->first();

                    $vitalsPayload = [
                        'clinic_id' => $clinicId,
                        'patient_id' => $patient->patient_id,
                        'bite_id' => $biteIncident->bite_id,
                        'status' => 'scheduled',
                        'scheduled_date' => $reassessmentDate,
                        'treatment_date' => $reassessmentDate,
                        'consultation_date' => $reassessmentDate,
                        'consultation_time' => $reassessmentTime,
                        'mode_of_transaction' => in_array($payload['mode_of_transaction'] ?? '', ['walk-in', 'visited', 'referral'], true)
                            ? $payload['mode_of_transaction']
                            : 'walk-in',
                        'blood_pressure' => trim((string) $payload['blood_pressure']),
                        'temperature' => trim((string) $payload['temperature']),
                        'height' => trim((string) $payload['height']),
                        'weight' => trim((string) $payload['weight']),
                        'attending_provider' => $payload['attending_provider'] ?? $user->name,
                        'referred_by' => $payload['referred_by'] ?? null,
                        'scheduled_by' => $user->id,
                        'remarks' => !empty($payload['reassessment_reason'])
                            ? 'Returned for reassessment: ' . trim((string) $payload['reassessment_reason'])
                            : 'Returned for reassessment of pending treatment',
                    ];

                    if ($existingScheduledReassessment) {
                        unset($vitalsPayload['administered_by']);
                        $existingScheduledReassessment->update($vitalsPayload);
                        $reassessmentVitalsRecord = $existingScheduledReassessment;
                    } else {
                        $reassessmentVitalsRecord = TreatmentRecord::create($vitalsPayload);
                    }
                } else {
                    $treatmentRecord = TreatmentRecord::where('clinic_id', $clinicId)
                        ->where('patient_id', $patient->patient_id)
                        ->whereNull('dose_number')
                        ->where('status', 'scheduled')
                        ->latest('treatment_id')
                        ->first();

                    $checkInDate = !empty($payload['consultation_date']) ? $payload['consultation_date'] : $todayDate;
                    $checkInTime = !empty($payload['consultation_time']) ? $payload['consultation_time'] : Carbon::now('Asia/Manila')->format('H:i');

                    $checkInUpdates = [
                        'consultation_date' => $checkInDate,
                        'treatment_date' => $checkInDate,
                        'consultation_time' => $checkInTime,
                    ];

                    $hasProvidedVitalsOrReferral = false;
                    foreach (['blood_pressure', 'temperature', 'height', 'weight'] as $vitalField) {
                        if (isset($payload[$vitalField]) && trim((string) $payload[$vitalField]) !== '') {
                            $checkInUpdates[$vitalField] = trim((string) $payload[$vitalField]);
                            $hasProvidedVitalsOrReferral = true;
                        }
                    }
                    if (in_array($payload['mode_of_transaction'] ?? '', ['walk-in', 'visited', 'referral'], true)) {
                        $checkInUpdates['mode_of_transaction'] = $payload['mode_of_transaction'];
                        $hasProvidedVitalsOrReferral = true;
                    }
                    if (array_key_exists('referred_by', $payload)) {
                        $referredByVal = trim((string) ($payload['referred_by'] ?? ''));
                        $checkInUpdates['referred_by'] = $referredByVal !== '' ? $referredByVal : null;
                        if ($referredByVal !== '') {
                            $hasProvidedVitalsOrReferral = true;
                        }
                    }
                    if (!empty($payload['attending_provider'])) {
                        $checkInUpdates['attending_provider'] = trim((string) $payload['attending_provider']);
                    }

                    if ($treatmentRecord) {
                        $treatmentRecord->update($checkInUpdates);
                    } elseif ($hasProvidedVitalsOrReferral) {
                        TreatmentRecord::create(array_merge([
                            'clinic_id' => $clinicId,
                            'patient_id' => $patient->patient_id,
                            'bite_id' => $biteIncident?->bite_id,
                            'status' => 'scheduled',
                            'scheduled_date' => $checkInDate,
                            'mode_of_transaction' => 'walk-in',
                            'attending_provider' => $user->name,
                            'scheduled_by' => $user->id,
                        ], $checkInUpdates));
                    }
                }

                $checkInNotes = $isPendingTreatmentReassessment
                    ? 'Returned for reassessment — pending treatment from previous consultation'
                    : ($hasRequiresCheckinToday
                        ? 'Patient re-checked in at Registration after 3 missed triage calls'
                        : 'Returning patient checked in for Triage Doctor assessment');

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
                    'checked_in_by'  => $user->id,
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
                    'performed_by' => $user->id,
                    'notes'        => $checkInNotes,
                    'occurred_at'  => now(),
                ]);

                AuditLog::create([
                    'user_id'     => $user->id,
                    'clinic_id'   => $clinicId,
                    'action'      => $isPendingTreatmentReassessment ? 'patient.reassess_routed' : 'patient.check_in',
                    'model'       => 'Patient',
                    'model_id'    => $patient->patient_id,
                    'new_values'  => [
                        'queue_id' => $queue->queue_id,
                        'queue_number' => $queue->queue_number,
                        'station' => 'Doctor Assessment',
                    ],
                    'description' => $isPendingTreatmentReassessment
                        ? "Patient #{$patient->patient_id} routed for physician reassessment by {$user->name}"
                        : "Patient #{$patient->patient_id} checked into triage queue #{$queue->queue_number} by {$user->name}",
                ]);

                if ($isPendingTreatmentReassessment && $biteIncident) {
                    \App\Models\AuditLog::log('patient.returned_for_reassessment', 'BiteIncident', $biteIncident->bite_id, [
                        'metadata' => [
                            'patient_id' => $patient->patient_id,
                            'bite_id' => $biteIncident->bite_id,
                            'queue_id' => $queue->queue_id,
                            'reassessment_vitals_treatment_id' => $reassessmentVitalsRecord?->treatment_id,
                            'pending_items' => $pendingSummary['pending_items'] ?? [],
                            'previous_consultation_date' => $pendingSummary['consultation_date'] ?? null,
                        ],
                        'description' => "Returning patient checked in for Doctor Reassessment of pending treatment on Case {$biteIncident->case_number}.",
                    ]);
                }

                Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");

                $this->notificationService->notifyQueueEvent($queue->load('patient'), 'checked_in', $user);

                QueueTicketUpdated::dispatch(QueueTicketUpdated::fromModel($queue->fresh(), 'checked_in'));
                if ($appointment) {
                    AppointmentStatusChanged::dispatch(AppointmentStatusChanged::fromModel($appointment->fresh(), 'confirmed'));
                }

                $encounter = app(\App\Services\RegistrationFeeService::class)->getOrCreateEncounter(
                    $clinicId,
                    $patient->patient_id,
                    'returning_checkin',
                    $biteIncident?->bite_id,
                    null,
                    $appointment?->appointment_id,
                    $user->id
                );

                $fee = $encounter->fee()->with(['items', 'payments'])->first();

                return [
                    'status' => 200,
                    'data' => [
                        'message' => $isPendingTreatmentReassessment
                            ? "{$patient->first_name} {$patient->last_name} checked in for Doctor Reassessment (Queue #{$nextQueueNumber})"
                            : "{$patient->first_name} {$patient->last_name} checked in successfully to Doctor Triage (Queue #{$nextQueueNumber})",
                        'queue' => $queue->load(['patient', 'biteIncident']),
                        'queue_number' => $nextQueueNumber,
                        'station' => $isPendingTreatmentReassessment ? 'Doctor Reassessment' : 'Doctor Assessment',
                        'reassessment_vitals_record' => $reassessmentVitalsRecord,
                        'is_reassessment_checkin' => $isPendingTreatmentReassessment,
                        'is_pending_treatment_reassessment' => $isPendingTreatmentReassessment,
                        'encounter_id' => $encounter->id,
                        'fee' => app(\App\Services\RegistrationFeeService::class)->formatFeeResponse($fee),
                    ],
                ];
            } finally {
                if ($isMysql) {
                    DB::statement("SELECT RELEASE_LOCK(?)", [$lockName]);
                }
            }
        });
    }

    /**
     * Check in an unattended patient to the Nurse queue (Station 2 / Treatment Room).
     * Specifically designed for patients who were not attended to within 1 day (queue expired or reset)
     * and need to be re-entered into today's Nurse treatment queue.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function checkInPatientToNurse(int $clinicId, int $patientId, User $user, Request $request): array
    {
        $patient = Patient::where('clinic_id', $clinicId)->find($patientId);
        if (!$patient) {
            return [
                'status' => 404,
                'data' => [
                    'success' => false,
                    'message' => 'This patient is no longer available in your clinic. Refresh the patient list and try again.',
                    'code' => 'patient_not_found',
                ],
            ];
        }

        $todayDate = Carbon::now('Asia/Manila')->toDateString();
        $activeStatuses = ['waiting', 'called', 'serving', 'in_consultation', 'second_chance', 'final_recall'];

        // 1. Guard: Check if patient is already active in today's queue
        $existingQueue = Queue::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->where('queue_date', $todayDate)
            ->whereNull('deleted_at')
            ->whereIn('status', $activeStatuses)
            ->first();

        if ($existingQueue) {
            return [
                'status' => 200,
                'data' => [
                    'success' => true,
                    'already_checked_in' => true,
                    'message' => "{$patient->first_name} {$patient->last_name} is already active in today's Nurse queue (Queue #{$existingQueue->queue_number})",
                    'queue' => $existingQueue->load(['patient', 'biteIncident', 'station']),
                    'queue_number' => $existingQueue->queue_number,
                    'station' => $existingQueue->station?->name ?? 'Station 2 · Follow-up Doses',
                ],
            ];
        }

        // 2. Guard: Check if patient has already received today's scheduled dose
        $completedTodayDose = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->whereNotNull('dose_number')
            ->where('status', 'completed')
            ->where(function ($q) use ($todayDate) {
                $q->whereDate('treatment_date', $todayDate)
                  ->orWhereDate('administered_at', $todayDate);
            })
            ->exists();

        if ($completedTodayDose) {
            return [
                'status' => 422,
                'data' => [
                    'success' => false,
                    'message' => "{$patient->first_name} {$patient->last_name} has already received their scheduled dose today.",
                    'code' => 'dose_already_administered',
                ],
            ];
        }

        // 3. Guard: Ensure patient has completed Doctor Triage or started treatment
        $hasCompletedConsultation = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->whereNull('dose_number')
            ->where(function ($q) {
                $q->where('status', 'completed')
                  ->orWhereNotNull('diagnosis')
                  ->orWhereNotNull('chief_complaints');
            })
            ->exists();

        $hasCompletedDoses = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->whereNotNull('dose_number')
            ->where('status', 'completed')
            ->exists();

        $hasConfirmedEpisode = BiteIncident::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id)
            ->where(function ($q) {
                $q->whereNotNull('confirmed_at')
                  ->orWhereIn('status', ['active', 'completed', 'in_progress'])
                  ->orWhereIn('episode_type', ['primary', 're_exposure']);
            })
            ->exists();

        if (!$hasCompletedConsultation && !$hasCompletedDoses && !$hasConfirmedEpisode) {
            return [
                'status' => 422,
                'data' => [
                    'success' => false,
                    'message' => 'This patient has not completed Doctor Triage yet. Please check the patient in for Doctor Triage first.',
                    'code' => 'triage_required',
                ],
            ];
        }

        // 4. Guard: Check if patient is completely discharged with no remaining pending doses
        $isDischarged = in_array(strtolower($patient->status ?? ''), ['discharged'])
            || in_array(strtolower($patient->treatment_status ?? ''), ['completed', 'discharged']);

        $appointmentService = app(\App\Services\AppointmentService::class);
        $followUpQuery = Appointment::where('clinic_id', $clinicId)
            ->where('patient_id', $patient->patient_id);
        $appointmentService->scopeFollowUpAppointments($followUpQuery, false);

        $hasPendingAppointments = (clone $followUpQuery)
            ->whereIn('status', ['scheduled', 'missed'])
            ->exists();

        if ($isDischarged && !$hasPendingAppointments) {
            return [
                'status' => 422,
                'data' => [
                    'success' => false,
                    'message' => 'This patient has completed their treatment course or has been discharged.',
                    'code' => 'patient_discharged',
                ],
            ];
        }

        // 5. Transaction with atomic lock for queue number assignment
        return DB::transaction(function () use ($clinicId, $patient, $todayDate, $user, $request, $hasCompletedDoses, $appointmentService) {
            app(QueueController::class)->expireStaleTickets($clinicId, $todayDate);

            $lockName = "queue_checkin_{$clinicId}_{$todayDate}";
            $lockTimeout = 5;
            $isMysql = DB::connection()->getDriverName() === 'mysql';

            if ($isMysql) {
                DB::statement("SELECT GET_LOCK(?, ?)", [$lockName, $lockTimeout]);
            }

            try {
                // Select ONLY due or overdue eligible follow-up appointments (never consultations, pending mobile intakes, boosters, or future doses)
                $eligibleFollowUpBase = Appointment::where('clinic_id', $clinicId)
                    ->where('patient_id', $patient->patient_id);
                $appointmentService->scopeFollowUpAppointments($eligibleFollowUpBase, false);

                $appointment = (clone $eligibleFollowUpBase)
                    ->whereIn('status', ['scheduled', 'missed', 'confirmed'])
                    ->whereRaw('DATE(COALESCE(scheduled_date, appointment_date)) <= ?', [$todayDate])
                    ->orderByRaw("CASE WHEN DATE(COALESCE(scheduled_date, appointment_date)) = ? THEN 0 ELSE 1 END", [$todayDate])
                    ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC')
                    ->first();

                if (!$appointment && $hasCompletedDoses) {
                    $futureFollowUp = (clone $eligibleFollowUpBase)
                        ->where('status', 'scheduled')
                        ->whereRaw('DATE(COALESCE(scheduled_date, appointment_date)) > ?', [$todayDate])
                        ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC')
                        ->first();

                    if ($futureFollowUp) {
                        $scheduledStr = Carbon::parse($futureFollowUp->scheduled_date ?? $futureFollowUp->appointment_date)->format('M j, Y');
                        return [
                            'status' => 422,
                            'data' => [
                                'success' => false,
                                'code' => 'appointment_not_yet_due',
                                'message' => "The next follow-up dose (Day {$futureFollowUp->dose_number}) is scheduled for {$scheduledStr} and cannot be checked in before its scheduled date.",
                            ],
                        ];
                    }

                    $hasPendingMobileConsultation = Appointment::where('clinic_id', $clinicId)
                        ->where('patient_id', $patient->patient_id)
                        ->whereIn('status', ['scheduled', 'missed', 'confirmed'])
                        ->get()
                        ->contains(fn(Appointment $appt) => $appointmentService->isMobileBiteConsultation($appt));

                    if ($hasPendingMobileConsultation) {
                        return [
                            'status' => 422,
                            'data' => [
                                'success' => false,
                                'code' => 'mobile_consultation_registration_required',
                                'message' => 'Mobile bite consultations must be checked in from Registration using the submitted bite intake before they enter the Doctor queue.',
                            ],
                        ];
                    }
                }

                // Find bite incident
                $biteIncident = $appointment?->biteIncident ?? BiteIncident::where('clinic_id', $clinicId)
                    ->where('patient_id', $patient->patient_id)
                    ->latest('bite_id')
                    ->first();

                // Determine booster / follow-up / vaccination
                $isBooster = false;
                if ($appointment) {
                    $notes = strtolower($appointment->notes ?? '');
                    $isBooster = str_contains($notes, 'booster') || ($appointment->dose_number === null && str_contains($notes, 'boost'));
                }
                if (!$isBooster && $biteIncident) {
                    $planType = $biteIncident->treatmentPlan?->plan_type ?? '';
                    if (in_array($planType, ['two_dose_booster', 'single_booster'])) {
                        $isBooster = true;
                    }
                }

                if ($isBooster) {
                    $visitType = 'booster';
                    $stationName = 'Station 2 · Boosters';
                    $isFollowUp = true;
                } elseif ($hasCompletedDoses || ($appointment && (int)$appointment->dose_number > 0)) {
                    $visitType = 'follow_up';
                    $stationName = 'Station 2 · Follow-up Doses';
                    $isFollowUp = true;
                } else {
                    $visitType = 'vaccination';
                    $stationName = 'Station 1 · Intake & Day 0';
                    $isFollowUp = false;
                }

                // Station record lookup
                $stationQuery = Station::where('clinic_id', $clinicId)->where('is_active', true);
                $stationObj = $isFollowUp
                    ? (clone $stationQuery)->where(fn($s) =>
                        $s->where('name', 'like', '%Follow-up%')
                          ->orWhere('name', 'like', '%Follow up%')
                          ->orWhere('name', 'like', '%Station 2%')
                      )->first()
                    : (clone $stationQuery)->where(fn($s) =>
                        $s->where('name', 'like', '%Intake%')
                          ->orWhere('name', 'like', '%Station 1%')
                      )->first();

                if (!$stationObj) {
                    $station1 = Station::firstOrCreate(['clinic_id' => $clinicId, 'name' => 'Station 1 - Intake'], ['is_active' => true]);
                    $station2 = Station::firstOrCreate(['clinic_id' => $clinicId, 'name' => 'Station 2 - Follow-ups & Boosters'], ['is_active' => true]);
                    $stationObj = $isFollowUp ? $station2 : $station1;
                }

                // Priority & Category
                $patientDetail = $patient->details;
                $category = 'regular';
                if ($appointment && $appointment->booked_by_account_id) {
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
                $priority = $request->get('priority', 'normal');

                $maxNumber = DB::table('queues')
                    ->where('clinic_id', $clinicId)
                    ->where('queue_date', $todayDate)
                    ->max('queue_number');

                $nextQueueNumber = $maxNumber ? ($maxNumber + 1) : 1;

                $doseInfo = $appointment && $appointment->dose_number !== null
                    ? "Day {$appointment->dose_number} Dose"
                    : ($isBooster ? 'Booster Dose' : 'Vaccination Dose');
                $checkInNotes = "Re-checked in to Nurse queue by Registration staff ({$doseInfo})";

                $queue = Queue::create([
                    'clinic_id'      => $clinicId,
                    'patient_id'     => $patient->patient_id,
                    'appointment_id' => $appointment?->appointment_id,
                    'bite_id'        => $biteIncident?->bite_id,
                    'queue_number'   => $nextQueueNumber,
                    'queue_date'     => $todayDate,
                    'visit_type'     => $visitType,
                    'priority'       => $priority,
                    'queue_category' => $category,
                    'status'         => 'waiting',
                    'checked_in_at'  => now(),
                    'checked_in_by'  => $user->id,
                    'station_id'     => $stationObj?->id,
                    'check_in_notes' => $checkInNotes,
                    'call_count'     => 0,
                ]);

                if ($appointment) {
                    $appointment->update([
                        'status'           => 'confirmed',
                        'appointment_date' => $todayDate,
                        'scheduled_date'   => $todayDate,
                        'queue_number'     => $nextQueueNumber,
                    ]);
                }

                QueueHistory::create([
                    'queue_id'     => $queue->queue_id,
                    'clinic_id'    => $clinicId,
                    'patient_id'   => $patient->patient_id,
                    'action'       => 'checked_in',
                    'from_status'  => null,
                    'to_status'    => 'waiting',
                    'call_count'   => 0,
                    'performed_by' => $user->id,
                    'notes'        => $checkInNotes,
                    'occurred_at'  => now(),
                ]);

                AuditLog::create([
                    'user_id'     => $user->id,
                    'clinic_id'   => $clinicId,
                    'action'      => 'nurse.check_in',
                    'model'       => Queue::class,
                    'model_id'    => $queue->queue_id,
                    'old_values'  => null,
                    'new_values'  => [
                        'queue_number' => $nextQueueNumber,
                        'station'      => $stationObj?->name ?? $stationName,
                        'visit_type'   => $visitType,
                        'patient_id'   => $patient->patient_id,
                    ],
                    'description' => "Patient {$patient->first_name} {$patient->last_name} re-checked in to Nurse Queue by {$user->name}",
                    'ip_address'  => request()->ip() ?? '127.0.0.1',
                ]);

                Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");
                $this->clearPatientListCache($clinicId);

                $this->notificationService->notifyQueueEvent($queue->load('patient'), 'checked_in', $user);

                QueueTicketUpdated::dispatch(QueueTicketUpdated::fromModel($queue->fresh(), 'checked_in'));
                if ($appointment) {
                    AppointmentStatusChanged::dispatch(AppointmentStatusChanged::fromModel($appointment->fresh(), 'confirmed'));
                }

                return [
                    'status' => 200,
                    'data' => [
                        'success' => true,
                        'message' => "{$patient->first_name} {$patient->last_name} checked in successfully to Nurse queue (Queue #{$nextQueueNumber})",
                        'queue' => $queue->load(['patient', 'biteIncident', 'station']),
                        'queue_number' => $nextQueueNumber,
                        'station' => $stationObj?->name ?? $stationName,
                        'visit_type' => $visitType,
                    ],
                ];
            } finally {
                if ($isMysql) {
                    DB::statement("SELECT RELEASE_LOCK(?)", [$lockName]);
                }
            }
        });
    }

    /**
     * Merge an online-booked mobile patient profile into an existing canonical clinic chart.
     * Reassigns appointments, bite intakes, and account links, then checks in the patient if vitals are provided.
     *
     * @param int $clinicId
     * @param int $mobilePatientId
     * @param int $canonicalPatientId
     * @param User $user
     * @param array<string, mixed> $checkInPayload
     * @return array<string, mixed>
     */
    public function mergeMobileBookingIntoExistingChart(
        int $clinicId,
        int $mobilePatientId,
        int $canonicalPatientId,
        User $user,
        array $checkInPayload = []
    ): array {
        if ($mobilePatientId === $canonicalPatientId) {
            throw new \InvalidArgumentException('Cannot merge a patient record into itself.');
        }

        return DB::transaction(function () use ($clinicId, $mobilePatientId, $canonicalPatientId, $user, $checkInPayload) {
            /** @var Patient $mobilePatient */
            $mobilePatient = Patient::where('clinic_id', $clinicId)
                ->with(['accounts', 'biteIncidents', 'treatmentRecords'])
                ->lockForUpdate()
                ->findOrFail($mobilePatientId);

            /** @var Patient $canonicalPatient */
            $canonicalPatient = Patient::where('clinic_id', $clinicId)
                ->with(['details', 'accounts'])
                ->lockForUpdate()
                ->findOrFail($canonicalPatientId);

            // 1. Reassign Appointments
            Appointment::where('patient_id', $mobilePatientId)
                ->update(['patient_id' => $canonicalPatientId]);

            // 2. Reassign Bite Incident Intakes
            BiteIncidentIntake::where('patient_id', $mobilePatientId)
                ->update(['patient_id' => $canonicalPatientId]);

            // 3. Reassign Bite Incidents (if any exist)
            BiteIncident::where('patient_id', $mobilePatientId)
                ->update(['patient_id' => $canonicalPatientId]);

            // 4. Reassign Treatment Records (if any exist)
            TreatmentRecord::where('patient_id', $mobilePatientId)
                ->update(['patient_id' => $canonicalPatientId]);

            // 5. Reassign Notifications
            Notification::where('patient_id', $mobilePatientId)
                ->update(['patient_id' => $canonicalPatientId]);

            // 6. Link Mobile Patient Account(s) to Canonical Patient Chart
            foreach ($mobilePatient->accounts as $account) {
                $pivot = $account->pivot;
                $alreadyLinked = $canonicalPatient->accounts()
                    ->where('patient_accounts.id', $account->id)
                    ->exists();

                if ($alreadyLinked) {
                    $canonicalPatient->accounts()->updateExistingPivot($account->id, [
                        'status'      => 'verified',
                        'verified_at' => now(),
                        'verified_by' => $user->id,
                    ]);
                } else {
                    $canonicalPatient->accounts()->attach($account->id, [
                        'relationship' => $pivot->relationship ?? 'self',
                        'is_primary'   => $pivot->is_primary ?? false,
                        'status'       => 'verified',
                        'verified_at'  => now(),
                        'verified_by'  => $user->id,
                    ]);
                }

                Cache::forget("mobile:patients:account:{$account->id}");
                Cache::forget("mobile:appointments:account:{$account->id}");
            }

            // 7. Clean up Mobile Patient placeholder
            $mobilePatientNo = $mobilePatient->patient_number;
            $mobilePatientName = $mobilePatient->name;

            $mobilePatient->accounts()->detach();
            $mobilePatient->details()?->delete();
            $mobilePatient->memberships()->delete();
            $mobilePatient->delete();

            // 8. If check-in vitals payload is provided, check in the intake into triage
            $checkInResult = null;
            $hasCheckIn = !empty($checkInPayload['consultation_date']) || !empty($checkInPayload['blood_pressure']) || !empty($checkInPayload['attending_provider']);

            if ($hasCheckIn) {
                $intake = BiteIncidentIntake::where('patient_id', $canonicalPatientId)
                    ->where('status', 'pending')
                    ->latest('intake_id')
                    ->first();

                if ($intake) {
                    $intakeService = app(BiteIncidentIntakeService::class);
                    $checkInResult = $intakeService->checkIn($intake, $user, $checkInPayload);
                }
            }

            // 9. Audit trail
            AuditLog::create([
                'clinic_id'   => $clinicId,
                'user_id'     => $user->id,
                'action'      => 'patient.merge_online_booking',
                'model'       => Patient::class,
                'model_id'    => $canonicalPatientId,
                'old_values'  => [
                    'source_mobile_patient_id' => $mobilePatientId,
                    'source_patient_number'    => $mobilePatientNo,
                ],
                'new_values'  => [
                    'canonical_patient_id'     => $canonicalPatientId,
                    'canonical_patient_number' => $canonicalPatient->patient_number,
                    'has_check_in'             => $hasCheckIn,
                ],
                'description' => "Staff {$user->name} merged online mobile booking for {$mobilePatientName} (#{$mobilePatientNo}) into existing clinic chart #{$canonicalPatient->patient_number}.",
                'ip_address'  => request()->ip() ?? '127.0.0.1',
            ]);

            $this->clearPatientListCache($clinicId);

            return [
                'message'   => "Successfully linked and merged online booking into {$canonicalPatient->name}'s clinic chart (#{$canonicalPatient->patient_number}).",
                'patient'   => $canonicalPatient->fresh(['details', 'accounts', 'biteIncidents', 'treatmentRecords']),
                'check_in'  => $checkInResult['data'] ?? $checkInResult,
            ];
        });
    }

    /**
     * Clear cached patient lists for clinic.
     */
    public function clearPatientListCache(int $clinicId): void
    {
        $tabs = ['all', 'today_queue', 'online', 'overdue', 'pre_registered'];
        foreach ($tabs as $tab) {
            for ($page = 1; $page <= 5; $page++) {
                Cache::forget("web:patients:list:clinic:{$clinicId}:tab:{$tab}:page:{$page}");
            }
        }
    }
}
