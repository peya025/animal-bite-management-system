<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\TreatmentRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class AppointmentController extends Controller
{
    /**
     * Get all appointments with filters
     * GET /api/appointments
     */
    public function index(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            $query = Appointment::where('clinic_id', $clinicId)
                ->with(['patient', 'createdBy']);

            // Filter by patient_id
            if ($request->has('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }

            // Filter by date
            if ($request->has('date')) {
                $query->whereDate('appointment_date', $request->date);
            }

            // Filter by status
            if ($request->has('status')) {
                $status = $request->status;
                if ($status === 'scheduled') {
                    $query->whereIn('status', ['scheduled', 'confirmed']);
                } elseif (str_contains($status, ',')) {
                    $query->whereIn('status', explode(',', $status));
                } else {
                    $query->where('status', $status);
                }
            }

            // Filter by type
            if ($request->has('type')) {
                $query->where('appointment_type', $request->type);
            }

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->whereHas('patient', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%");
                });
            }

            $appointments = $query->orderBy('appointment_date')
                ->orderBy('appointment_time')
                ->paginate($request->get('per_page', 15));

            return response()->json($appointments);
        } catch (\Exception $e) {
            \Log::error('Get appointments error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load appointments',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get appointments scheduled for today
     * GET /api/appointments/today
     */
    public function today(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            
            $appointments = Appointment::where('clinic_id', $clinicId)
                ->whereDate('appointment_date', Carbon::today())
                ->where('status', 'scheduled')
                ->with(['patient', 'biteIncident'])
                ->orderBy('appointment_time')
                ->get();

            return response()->json([
                'count' => $appointments->count(),
                'appointments' => $appointments,
            ]);
        } catch (\Exception $e) {
            \Log::error('Get today appointments error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load today\'s appointments',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get upcoming appointments (next 7 days)
     * GET /api/appointments/upcoming
     */
    public function upcoming(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            
            $appointments = Appointment::where('clinic_id', $clinicId)
                ->whereBetween('appointment_date', [
                    Carbon::tomorrow(),
                    Carbon::today()->addDays(7)
                ])
                ->where('status', 'scheduled')
                ->with(['patient', 'biteIncident'])
                ->orderBy('appointment_date')
                ->orderBy('appointment_time')
                ->get();

            return response()->json([
                'count' => $appointments->count(),
                'appointments' => $appointments,
            ]);
        } catch (\Exception $e) {
            \Log::error('Get upcoming appointments error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load upcoming appointments',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get overdue/missed appointments
     * GET /api/appointments/overdue
     */
    public function overdue(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            
            $appointments = Appointment::where('clinic_id', $clinicId)
                ->where('appointment_date', '<', Carbon::today())
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->with(['patient', 'biteIncident'])
                ->orderBy('appointment_date', 'desc')
                ->get();

            // Auto-update to missed status
            foreach ($appointments as $appointment) {
                $appointment->update(['status' => 'missed']);
            }

            return response()->json([
                'count' => $appointments->count(),
                'appointments' => $appointments,
            ]);
        } catch (\Exception $e) {
            \Log::error('Get overdue appointments error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load overdue appointments',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get patient list for NURSE role
     * GET /api/nurse/patients
     */
    // Active queue statuses (covers all non-terminal states including the auto-call flow)
    const ACTIVE_QUEUE_STATUSES = ['waiting', 'called', 'serving', 'in_consultation'];

    public function nursePatients(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            $tab = $request->get('tab', 'due_today');

            $query = Patient::where('clinic_id', $clinicId);

            // Station 2 is for returning doses only, never Day 0 or consultations.
            $followUpAppointment = function ($appointmentQuery) {
                $appointmentQuery->where(function ($stream) {
                    $stream->where('dose_number', '>', 0)
                        ->orWhere('appointment_type', 'booster')
                        ->orWhere('notes', 'like', '%booster%');
                });
            };
            $followUpQueue = function ($queueQuery) {
                $queueQuery->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
                    ->whereDate('queue_date', Carbon::today())
                    ->where(function ($stream) {
                        $stream->whereIn('visit_type', ['follow_up', 'booster'])
                            ->orWhereHas('station', function ($station) {
                                $station->where('name', 'like', '%Follow-up%')
                                    ->orWhere('name', 'like', '%Follow up%');
                            });
                    });
            };

            // Auto-complete any appointments where the corresponding dose was already administered in treatment_records
            Appointment::whereIn('status', ['scheduled', 'missed', 'confirmed'])
                ->whereNotNull('dose_number')
                ->whereExists(function ($sub) {
                    $sub->select(\DB::raw(1))
                        ->from('treatment_records')
                        ->whereColumn('treatment_records.patient_id', 'appointments.patient_id')
                        ->whereColumn('treatment_records.dose_number', 'appointments.dose_number')
                        ->where(function ($d) {
                            $d->whereColumn('treatment_records.appointment_id', 'appointments.appointment_id')
                              ->orWhereColumn('treatment_records.treatment_date', '>=', 'appointments.scheduled_date')
                              ->orWhereColumn('treatment_records.created_at', '>=', 'appointments.created_at');
                        });
                })
                ->update(['status' => 'completed']);

            // Auto-complete booster appointments when a booster treatment record was administered
            Appointment::whereIn('status', ['scheduled', 'missed', 'confirmed'])
                ->where(function ($q) {
                    $q->where('appointment_type', 'booster')
                      ->orWhere('notes', 'like', '%booster%');
                })
                ->whereExists(function ($sub) {
                    $sub->select(\DB::raw(1))
                        ->from('treatment_records')
                        ->whereColumn('treatment_records.patient_id', 'appointments.patient_id')
                        ->where('treatment_records.status', 'completed')
                        ->where(function ($tr) {
                            $tr->whereColumn('treatment_records.appointment_id', 'appointments.appointment_id')
                               ->orWhere(function ($d) {
                                   $d->whereColumn('treatment_records.dose_number', 'appointments.dose_number')
                                     ->whereColumn('treatment_records.treatment_date', '>=', 'appointments.scheduled_date');
                               });
                        });
                })
                ->update(['status' => 'completed']);

            switch ($tab) {
                case 'needs_action':
                    // Combined follow-up queue: overdue + due today + active in queue, excluding pre-triage
                    $todayDate = Carbon::today()->toDateString();
                    $query->whereHas('treatmentRecords', function ($tr) {
                        $tr->whereNotNull('dose_number')->where('status', 'completed');
                    })->where(function ($q) use ($todayDate) {
                        $q->whereHas('appointments', function ($app) use ($todayDate) {
                            $app->where(function ($d) use ($todayDate) {
                                $d->whereDate('appointment_date', '<=', $todayDate)
                                  ->orWhereDate('scheduled_date', '<=', $todayDate);
                            })->whereIn('status', ['scheduled', 'missed', 'confirmed']);
                        })->orWhereHas('queues', function ($qu) use ($todayDate) {
                            $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
                               ->whereDate('queue_date', $todayDate);
                        });
                    })->with([
                        'appointments' => function ($app) {
                            $app->whereIn('status', ['scheduled', 'missed', 'confirmed'])
                                ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        },
                        'biteIntakes' => function ($bi) {
                            $bi->latest();
                        },
                        'biteIncidents' => function ($bi) {
                            $bi->latest();
                        },
                        'latestTreatmentRecord',
                        'queues' => function ($qu) use ($todayDate) {
                            $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
                               ->whereDate('queue_date', $todayDate)
                               ->latest();
                        }
                    ]);
                    break;

                case 'due_today':
                    // Returning patients due for a dose today, or already checked in at Station 2.
                    $query->where(function ($q) use ($followUpAppointment, $followUpQueue) {
                        $q->whereHas('appointments', function ($app) use ($followUpAppointment) {
                            $app->where(function ($d) {
                                $d->where(function ($sub) {
                                    $sub->whereDate('appointment_date', Carbon::today())
                                        ->orWhereDate('scheduled_date', Carbon::today());
                                })->whereIn('status', ['scheduled', 'confirmed']);
                            })->orWhere('status', 'confirmed');
                            $followUpAppointment($app);
                        })->orWhereHas('queues', $followUpQueue);
                    })->with([
                        'appointments' => function ($app) use ($followUpAppointment) {
                            $app->whereIn('status', ['scheduled', 'missed', 'confirmed']);
                            $followUpAppointment($app);
                            $app->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        },
                        'biteIntakes' => function ($bi) {
                            $bi->latest();
                        },
                        'biteIncidents' => function ($bi) {
                            $bi->latest();
                        },
                        'latestTreatmentRecord',
                        'queues' => function ($qu) use ($followUpQueue) {
                            $followUpQueue($qu);
                            $qu->latest();
                        }
                    ]);
                    break;

                case 'upcoming':
                    // Returning doses scheduled in the next seven days.
                    $query->whereHas('appointments', function ($q) use ($followUpAppointment) {
                        $q->where(function ($d) {
                            $d->whereBetween('appointment_date', [Carbon::tomorrow(), Carbon::today()->addDays(7)])
                              ->orWhereBetween('scheduled_date', [Carbon::tomorrow(), Carbon::today()->addDays(7)]);
                        })->where('status', 'scheduled');
                        $followUpAppointment($q);
                    })->whereDoesntHave('appointments', function ($q) use ($followUpAppointment) {
                        $q->where(function ($d) {
                            $d->whereDate('appointment_date', '<=', Carbon::today())
                              ->orWhereDate('scheduled_date', '<=', Carbon::today());
                        })->whereIn('status', ['scheduled', 'missed']);
                        $followUpAppointment($q);
                    })->with([
                        'appointments' => function ($q) use ($followUpAppointment) {
                            $q->whereIn('status', ['scheduled', 'missed']);
                            $followUpAppointment($q);
                            $q->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        },
                        'biteIntakes' => function ($bi) {
                            $bi->latest();
                        },
                        'biteIncidents' => function ($bi) {
                            $bi->latest();
                        },
                        'latestTreatmentRecord'
                    ]);
                    break;

                case 'online':
                    // Patients with submitted bite intake OR confirmed booking from mobile
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
                    })->with([
                        'appointments' => function ($app) {
                            $app->whereIn('status', ['scheduled', 'missed'])
                                ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        },
                        'biteIntakes' => function ($bi) {
                            $bi->latest();
                        },
                        'biteIncidents' => function ($bi) {
                            $bi->latest();
                        },
                        'latestTreatmentRecord',
                        'queues' => function ($qu) {
                            $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)->latest();
                        }
                    ]);
                    break;

                case 'overdue':
                    // Returning doses that are late; Day 0 appointments stay out of Station 2.
                    $query->whereHas('appointments', function ($q) use ($followUpAppointment) {
                        $q->where(function ($d) {
                            $d->whereDate('appointment_date', '<', Carbon::today())
                              ->orWhereDate('scheduled_date', '<', Carbon::today());
                        })->whereIn('status', ['scheduled', 'missed']);
                        $followUpAppointment($q);
                    })->with([
                        'appointments' => function ($q) use ($followUpAppointment) {
                            $q->whereIn('status', ['scheduled', 'missed']);
                            $followUpAppointment($q);
                            $q->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        },
                        'biteIntakes' => function ($bi) {
                            $bi->latest();
                        },
                        'biteIncidents' => function ($bi) {
                            $bi->latest();
                        },
                        'latestTreatmentRecord'
                    ]);
                    break;

                case 'completed_today':
                    // Patients who had Form 3 (vaccination/treatment records) saved today
                    $query->whereHas('treatmentRecords', function ($q) {
                        $q->whereNotNull('dose_number')
                          ->whereDate('treatment_date', Carbon::today());
                    })->with([
                        'latestTreatmentRecord',
                        'appointments' => function ($app) {
                            $app->whereIn('status', ['scheduled', 'missed'])
                                ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        },
                        'biteIntakes' => function ($bi) {
                            $bi->latest();
                        },
                        'biteIncidents' => function ($bi) {
                            $bi->latest();
                        },
                        'queues' => function ($qu) {
                            $qu->where('status', 'completed')
                               ->whereDate('queue_date', Carbon::today())
                               ->latest();
                        }
                    ]);
                    break;

                case 'all':
                default:
                    // All clinic patients with their latest treatment record and appointment info
                    $query->with([
                        'latestTreatmentRecord',
                        'upcomingAppointment',
                        'biteIncidents' => function ($bi) {
                            $bi->latest();
                        },
                        'appointments' => function ($app) {
                            $app->whereIn('status', ['scheduled', 'missed'])
                                ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        },
                        'biteIntakes' => function ($bi) {
                            $bi->latest();
                        },
                        'queues' => function ($qu) {
                            $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
                               ->whereDate('queue_date', Carbon::today())
                               ->latest();
                        }
                    ]);
                    break;
            }

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('patient_id', 'like', "%{$search}%")
                      ->orWhere('patient_number', 'like', "%{$search}%");
                });
            }

            if ($tab === 'needs_action') {
                $patients = $query->orderByRaw("(
                    SELECT MIN(COALESCE(scheduled_date, appointment_date))
                    FROM appointments
                    WHERE appointments.patient_id = patients.patient_id
                      AND appointments.status IN ('scheduled', 'missed', 'confirmed')
                ) ASC")
                ->paginate($request->get('per_page', 15));
            } else {
                $patients = $query->orderBy('last_name')
                    ->paginate($request->get('per_page', 15));
            }

            $todayDate = Carbon::today()->toDateString();
            $needsActionCount = Patient::where('clinic_id', $clinicId)
                ->whereHas('treatmentRecords', function ($tr) {
                    $tr->whereNotNull('dose_number')->where('status', 'completed');
                })
                ->where(function ($q) use ($todayDate) {
                    $q->whereHas('appointments', function ($app) use ($todayDate) {
                        $app->where(function ($d) use ($todayDate) {
                            $d->whereDate('appointment_date', '<=', $todayDate)
                              ->orWhereDate('scheduled_date', '<=', $todayDate);
                        })->whereIn('status', ['scheduled', 'missed', 'confirmed']);
                    })->orWhereHas('queues', function ($qu) use ($todayDate) {
                        $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
                           ->whereDate('queue_date', $todayDate);
                    });
                })->count();

            $dueTodayCount = Patient::where('clinic_id', $clinicId)->where(function ($q) use ($followUpAppointment, $followUpQueue) {
                $q->whereHas('appointments', function ($app) use ($followUpAppointment) {
                    $app->where(function ($d) {
                        $d->where(function ($sub) {
                            $sub->whereDate('appointment_date', Carbon::today())
                                ->orWhereDate('scheduled_date', Carbon::today());
                        })->whereIn('status', ['scheduled', 'confirmed']);
                    })->orWhere('status', 'confirmed');
                    $followUpAppointment($app);
                })->orWhereHas('queues', $followUpQueue);
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

            $upcomingCount = Patient::where('clinic_id', $clinicId)->whereHas('appointments', function ($q) use ($followUpAppointment) {
                $q->where(function ($d) {
                    $d->whereBetween('appointment_date', [Carbon::tomorrow(), Carbon::today()->addDays(7)])
                      ->orWhereBetween('scheduled_date', [Carbon::tomorrow(), Carbon::today()->addDays(7)]);
                })->where('status', 'scheduled');
                $followUpAppointment($q);
            })->whereDoesntHave('appointments', function ($q) use ($followUpAppointment) {
                $q->where(function ($d) {
                    $d->whereDate('appointment_date', '<=', Carbon::today())
                      ->orWhereDate('scheduled_date', '<=', Carbon::today());
                })->whereIn('status', ['scheduled', 'missed']);
                $followUpAppointment($q);
            })->count();

            $overdueCount = Patient::where('clinic_id', $clinicId)->whereHas('appointments', function ($q) use ($followUpAppointment) {
                $q->where(function ($d) {
                    $d->whereDate('appointment_date', '<', Carbon::today())
                      ->orWhereDate('scheduled_date', '<', Carbon::today());
                })->whereIn('status', ['scheduled', 'missed']);
                $followUpAppointment($q);
            })->count();

            $completedTodayCount = Patient::where('clinic_id', $clinicId)->whereHas('treatmentRecords', function ($q) {
                $q->whereNotNull('dose_number')
                  ->whereDate('treatment_date', Carbon::today());
            })->count();

            $res = $patients->toArray();
            $res['needs_action_count']   = $needsActionCount;
            $res['due_today_count']      = $dueTodayCount;
            $res['online_count']         = $onlineCount;
            $res['upcoming_count']       = $upcomingCount;
            $res['overdue_count']        = $overdueCount;
            $res['completed_today_count'] = $completedTodayCount;

            return response()->json($res);
        } catch (\Exception $e) {
            \Log::error('Get nurse patients error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load patient list',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get patient list for DOCTOR/TRIAGE role
     * GET /api/doctor/patients
     */
    public function doctorPatients(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            $tab = $request->get('tab', 'today');

            $query = Patient::where('clinic_id', $clinicId);

            switch ($tab) {
                case 'today':
                    // Patients seen today OR currently active in queue
                    $query->where(function ($q) {
                        $q->whereHas('treatmentRecords', function ($tr) {
                            $tr->whereDate('consultation_date', Carbon::today())
                               ->whereNull('dose_number');
                        })->orWhereHas('queues', function ($qu) {
                            $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
                               ->whereDate('queue_date', Carbon::today());
                        });
                    })->with([
                        'treatmentRecords' => function ($tr) {
                            $tr->whereDate('consultation_date', Carbon::today())
                               ->whereNull('dose_number')
                               ->orderBy('created_at', 'desc');
                        },
                        'queues' => function ($qu) {
                            $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
                               ->whereDate('queue_date', Carbon::today())
                               ->latest();
                        }
                    ]);
                    break;

                case 'this_week':
                    $query->whereHas('treatmentRecords', function ($q) {
                        $q->whereBetween('consultation_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])
                          ->whereNull('dose_number');
                    })->with([
                        'treatmentRecords' => function ($q) {
                            $q->whereBetween('consultation_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])
                              ->whereNull('dose_number')
                              ->orderBy('consultation_date', 'desc');
                        }
                    ]);
                    break;

                case 'all':
                default:
                    // All clinic patients with their latest consultation record
                    $query->with(['latestConsultationRecord', 'queues' => function ($qu) {
                        $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
                           ->whereDate('queue_date', Carbon::today())
                           ->latest();
                    }]);
                    break;
            }

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('patient_id', 'like', "%{$search}%")
                      ->orWhere('patient_number', 'like', "%{$search}%");
                });
            }

            $patients = $query->orderBy('last_name')
                ->paginate($request->get('per_page', 15));

            return response()->json($patients);
        } catch (\Exception $e) {
            \Log::error('Get doctor patients error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load patient list',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check in an appointment by its appointment ID.
     * POST /api/appointments/{id}/check-in
     *
     * 21.1 / 21.3 — Wire through processAppointmentCheckIn so a queue ticket
     * is created atomically (with dedup, race-safe numbering, and cache flush).
     * Returns 404 if appointment or patient not found; 422 if already active in queue.
     */
    public function checkIn(Request $request, $id)
    {
        $clinicId = $request->user()->clinic_id;

        // 21.3 — clean 404 instead of 500 when ID is invalid
        $appointment = Appointment::where('clinic_id', $clinicId)->find($id);
        if (!$appointment) {
            return response()->json([
                'success' => false,
                'message' => "Appointment #{$id} not found for this clinic.",
            ], 404);
        }

        // Confirm the appointment first so Form 3 is unlocked
        if ($appointment->status !== 'confirmed') {
            $appointment->update(['status' => 'confirmed']);
        }

        // Delegate to the full atomic check-in handler (creates queue ticket, dedup, cache)
        return $this->processAppointmentCheckIn($request, (int) $appointment->patient_id, $appointment);
    }

    /**
     * Check in a patient by patient ID from the Nurse Patient List.
     * POST /api/appointments/patient/{patientId}/check-in
     *
     * 21.2 / 21.3 — Wire through processAppointmentCheckIn.
     * Returns 404 if patient not found; idempotent 200 if already queued.
     */
    public function checkInByPatient(Request $request, $patientId)
    {
        $clinicId = $request->user()->clinic_id;

        // 21.3 — clean 404 instead of 500 when patient ID is invalid
        $patient = Patient::where('clinic_id', $clinicId)->find($patientId);
        if (!$patient) {
            return response()->json([
                'success' => false,
                'message' => "Patient #{$patientId} not found for this clinic.",
            ], 404);
        }

        $todayDate = Carbon::today()->toDateString();

        // 1. Idempotency — return early if already confirmed (no duplicate queue ticket)
        $existingConfirmed = Appointment::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->where('status', 'confirmed')
            ->first();

        if ($existingConfirmed) {
            // Still run through processAppointmentCheckIn — it handles the "already in queue" 200 case
            return $this->processAppointmentCheckIn($request, (int) $patientId, $existingConfirmed);
        }

        // 2. Find the best matching appointment (today > overdue > upcoming)
        $appointment = Appointment::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->whereIn('status', ['scheduled', 'missed'])
            ->orderByRaw("CASE 
                WHEN DATE(scheduled_date) = '{$todayDate}' OR DATE(appointment_date) = '{$todayDate}' THEN 0 
                WHEN scheduled_date < '{$todayDate}' OR appointment_date < '{$todayDate}' THEN 1 
                ELSE 2 
            END")
            ->orderBy('scheduled_date', 'asc')
            ->first();

        if ($appointment) {
            $appointment->update(['status' => 'confirmed']);
            return $this->processAppointmentCheckIn($request, (int) $patientId, $appointment);
        }

        // 3. No appointment found — derive next dose and auto-create one
        $latestRecord = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->whereNotNull('dose_number')
            ->where('status', 'completed')
            ->orderBy('dose_number', 'desc')
            ->first();

        $nextDose = 0;
        if ($latestRecord) {
            $prevDose = (int) $latestRecord->dose_number;
            if ($prevDose === 0)                       $nextDose = 3;
            elseif ($prevDose === 3)                   $nextDose = 7;
            elseif ($prevDose === 7)                   $nextDose = 90;
            elseif ($prevDose >= 28 && $prevDose < 90) $nextDose = 90;
            elseif ($prevDose >= 90 && $prevDose < 365)$nextDose = 365;
            elseif ($prevDose >= 365)                  $nextDose = 90;
        }

        $appointment = Appointment::create([
            'clinic_id'        => $clinicId,
            'patient_id'       => $patient->patient_id,
            'scheduled_date'   => $todayDate,
            'appointment_date' => $todayDate,
            'appointment_type' => ($nextDose >= 90) ? 'booster' : 'vaccination',
            'dose_number'      => $nextDose,
            'status'           => 'confirmed',
            'notes'            => 'Checked in directly via Nurse Patient List',
            'created_by'       => $request->user()->id,
        ]);

        return $this->processAppointmentCheckIn($request, (int) $patientId, $appointment);
    }

    /**
     * Common atomic check-in processing logic creating queue ticket and routing appropriately.
     * Boosters route directly to Treatment Nurse (visit_type: 'booster').
     */
    private function processAppointmentCheckIn(Request $request, int $patientId, ?Appointment $appointment = null)
    {
        $clinicId = $request->user()->clinic_id;
        $todayDate = Carbon::today()->toDateString();

        return DB::transaction(function () use ($request, $clinicId, $patientId, $appointment, $todayDate) {
            $patient = Patient::where('clinic_id', $clinicId)->findOrFail($patientId);

            // Check if patient is already active in today's queue
            $activeStatuses = ['waiting', 'called', 'serving', 'in_consultation', 'second_chance', 'final_recall'];
            $existingQueue = Queue::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('queue_date', $todayDate)
                ->whereNull('deleted_at')
                ->whereIn('status', $activeStatuses)
                ->lockForUpdate()
                ->first();

            if ($existingQueue) {
                $stationLabel = in_array($existingQueue->visit_type, ['vaccination', 'booster', 'follow_up', 'observation'])
                    ? 'Treatment Room'
                    : 'Doctor Triage';

                return response()->json([
                    'message' => "{$patient->first_name} {$patient->last_name} is already active in today's {$stationLabel} queue (Queue #{$existingQueue->queue_number})",
                    'queue' => $existingQueue->load(['patient', 'biteIncident']),
                    'queue_number' => $existingQueue->queue_number,
                    'station' => in_array($existingQueue->visit_type, ['vaccination', 'booster', 'follow_up', 'observation']) ? 'treatment' : 'triage',
                ], 200);
            }

            // Determine visit type based on appointment
            $isBooster = ($appointment && ($appointment->appointment_type === 'booster' || str_contains(strtolower($appointment->notes ?? ''), 'booster')));
            $isConsultation = ($appointment && ($appointment->appointment_type === 'consultation' || str_contains(strtolower($appointment->notes ?? ''), 'consultation')));

            if ($isBooster) {
                $visitType = 'booster';
                $stationName = 'Treatment Desk (Booster Vaccination)';
                $targetStation = 'treatment';
            } elseif ($isConsultation) {
                $visitType = 'new_case';
                $stationName = 'Doctor Triage';
                $targetStation = 'triage';
            } else {
                $visitType = 'vaccination';
                $stationName = 'Treatment Desk (Vaccination)';
                $targetStation = 'treatment';
            }

            // Generate next queue number safely with DB lock
            $lastQueue = Queue::where('clinic_id', $clinicId)
                ->where('queue_date', $todayDate)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->orderBy('queue_number', 'desc')
                ->first();

            $nextQueueNumber = $lastQueue ? ($lastQueue->queue_number + 1) : 1;

            $doseInfo = $appointment && $appointment->dose_number !== null
                ? ($isBooster ? "Booster Dose" : "Day {$appointment->dose_number} Dose")
                : null;
            $noteText = $doseInfo ? "Checked in for {$doseInfo}" : "Checked in via patient list";

            // Assign station based on clinical visit type: follow-ups go to Follow-up station, initial/consultation to Intake
            $isFollowUp = $isBooster || ($appointment && $appointment->dose_number > 0) || in_array($visitType, ['vaccination', 'booster', 'follow_up']);
            $stationQuery = \App\Models\Station::where('clinic_id', $clinicId)->where('is_active', true);
            $stationObj = $isFollowUp
                ? (clone $stationQuery)->where('name', 'like', '%Follow-up%')->first()
                : (clone $stationQuery)->where('name', 'like', '%Intake%')->first();
            $assignedStationId = $stationObj?->id;

            $queue = Queue::create([
                'clinic_id'      => $clinicId,
                'patient_id'     => $patientId,
                'bite_id'        => $appointment?->bite_id,
                'queue_number'   => $nextQueueNumber,
                'queue_date'     => $todayDate,
                'visit_type'     => $visitType,
                'priority'       => $request->get('priority', 'normal'),
                'queue_category' => $appointment ? 'appointment' : 'regular',
                'status'         => 'waiting',
                'checked_in_at'  => now(),
                'checked_in_by'  => $request->user()->id,
                'station_id'     => $assignedStationId,
                'check_in_notes' => $noteText,
                'call_count'     => 0,
            ]);

            // Sync scheduled appointment with queue number
            if ($appointment) {
                $appointment->update([
                    'queue_number' => $nextQueueNumber,
                ]);
            }

            // Invalidate queue cache
            Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");

            return response()->json([
                'message'      => "{$patient->first_name} {$patient->last_name} checked in successfully to {$stationName} (Queue #{$nextQueueNumber})",
                'queue'        => $queue->load(['patient', 'biteIncident']),
                'queue_number' => $nextQueueNumber,
                'station'      => $targetStation,
                'visit_type'   => $visitType,
            ]);
        });
    }
}
