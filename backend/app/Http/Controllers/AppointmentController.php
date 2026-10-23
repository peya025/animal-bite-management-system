<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\TreatmentRecord;
use App\Services\AppointmentService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AppointmentController extends Controller
{
    // Active queue statuses (covers all non-terminal states including the auto-call flow)
    const ACTIVE_QUEUE_STATUSES = ['waiting', 'called', 'serving', 'in_consultation'];

    public function __construct(private readonly AppointmentService $appointmentService) {}

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/appointments
    // ────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $query    = Appointment::where('clinic_id', $clinicId)->with(['patient', 'createdBy']);

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }
        if ($request->has('date')) {
            $query->whereDate('appointment_date', $request->date);
        }
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
        if ($request->has('type')) {
            $query->where('appointment_type', $request->type);
        }
        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('patient', fn($q) =>
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name',  'like', "%{$search}%")
            );
        }

        $appointments = $query->orderBy('appointment_date')->orderBy('appointment_time')
            ->paginate($request->get('per_page', 15));

        return response()->json($appointments);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/appointments/today
    // ────────────────────────────────────────────────────────────────────────
    public function today(Request $request): JsonResponse
    {
        $clinicId     = $request->user()->clinic_id;
        $appointments = Appointment::where('clinic_id', $clinicId)
            ->whereDate('appointment_date', Carbon::today())
            ->where('status', 'scheduled')
            ->with(['patient', 'biteIncident'])
            ->orderBy('appointment_time')
            ->get();

        return response()->json(['count' => $appointments->count(), 'appointments' => $appointments]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/appointments/upcoming
    // ────────────────────────────────────────────────────────────────────────
    public function upcoming(Request $request): JsonResponse
    {
        $clinicId     = $request->user()->clinic_id;
        $appointments = Appointment::where('clinic_id', $clinicId)
            ->where(fn($d) =>
                $d->whereDate('appointment_date', '>=', Carbon::tomorrow())
                  ->orWhereDate('scheduled_date', '>=', Carbon::tomorrow())
            )
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->with(['patient', 'biteIncident'])
            ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC')
            ->orderBy('appointment_time')
            ->get();

        return response()->json(['count' => $appointments->count(), 'appointments' => $appointments]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/appointments/overdue
    // ────────────────────────────────────────────────────────────────────────
    public function overdue(Request $request): JsonResponse
    {
        $clinicId     = $request->user()->clinic_id;
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

        return response()->json(['count' => $appointments->count(), 'appointments' => $appointments]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/nurse/patients
    // ────────────────────────────────────────────────────────────────────────
    public function nursePatients(Request $request): JsonResponse
    {
        $clinicId       = $request->user()->clinic_id;
        $tab            = $request->get('tab', 'due_today');
        $isBoosterFilter = $request->get('dose') === 'booster';

        $query = Patient::where('clinic_id', $clinicId);

        // Shared filter closures
        $followUpAppointment = function ($appointmentQuery) use ($isBoosterFilter) {
            if ($isBoosterFilter) {
                $appointmentQuery->where(fn($q) =>
                    $q->where('dose_number', '>=', 90)
                      ->orWhere('appointment_type', 'booster')
                      ->orWhere('notes', 'like', '%booster%')
                );
            } else {
                $appointmentQuery->where('dose_number', '>', 0)
                    ->where(fn($stream) =>
                        $stream->whereNull('appointment_type')
                               ->orWhere('appointment_type', '!=', 'booster')
                    )
                    ->where(fn($stream) =>
                        $stream->whereNull('notes')
                               ->orWhere('notes', 'not like', '%booster%')
                    );
            }
            $appointmentQuery->where(fn($plan) =>
                $plan->whereDoesntHave('biteIncident.treatmentPlan')
                     ->orWhereHas('biteIncident.treatmentPlan', fn($tp) =>
                         $tp->whereIn('plan_type', ['full_pep', 'two_dose_booster', 'single_booster'])
                            ->where('status', 'approved')
                     )
            );
        };

        $followUpQueue = function ($queueQuery) use ($isBoosterFilter) {
            $queueQuery->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
                ->whereDate('queue_date', Carbon::today());
            if (!$isBoosterFilter) {
                $queueQuery->where('visit_type', '!=', 'booster');
            }
            $queueQuery->where(fn($plan) =>
                $plan->whereDoesntHave('biteIncident.treatmentPlan')
                     ->orWhereHas('biteIncident.treatmentPlan', fn($tp) =>
                         $tp->whereIn('plan_type', ['full_pep', 'two_dose_booster', 'single_booster'])
                            ->where('status', 'approved')
                     )
            )->where(function ($stream) use ($isBoosterFilter) {
                if ($isBoosterFilter) {
                    $stream->where('visit_type', 'booster')
                        ->orWhere('check_in_notes', 'like', '%booster%')
                        ->orWhere('consultation_notes', 'like', '%booster%');
                } else {
                    $stream->where('visit_type', 'follow_up')
                        ->orWhereHas('station', fn($station) =>
                            $station->where('name', 'like', '%Follow-up%')
                                    ->orWhere('name', 'like', '%Follow up%')
                        );
                }
            });
        };

        // Auto-complete appointments where dose was already administered
        $this->appointmentService->autoCompleteAdministeredAppointments();

        switch ($tab) {
            case 'needs_action':
                $todayDate = Carbon::today()->toDateString();
                $query->whereHas('treatmentRecords', function ($tr) {
                    $tr->whereNotNull('dose_number')->where('status', 'completed');
                })->where(function ($q) use ($todayDate, $followUpAppointment, $followUpQueue) {
                    $q->whereHas('appointments', function ($app) use ($todayDate, $followUpAppointment) {
                        $app->where(function ($d) use ($todayDate) {
                            $d->whereDate('appointment_date', '<=', $todayDate)
                              ->orWhereDate('scheduled_date', '<=', $todayDate);
                        })->whereIn('status', ['scheduled', 'missed', 'confirmed']);
                        $followUpAppointment($app);
                    })->orWhereHas('queues', $followUpQueue);
                })->with([
                    'appointments' => function ($app) use ($followUpAppointment) {
                        $app->whereIn('status', ['scheduled', 'missed', 'confirmed'])
                            ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        $followUpAppointment($app);
                    },
                    'biteIntakes'   => function ($bi) { $bi->latest(); },
                    'biteIncidents' => function ($bi) { $bi->latest(); },
                    'latestTreatmentRecord',
                    'queues' => function ($qu) use ($followUpQueue) {
                        $followUpQueue($qu);
                        $qu->latest();
                    },
                ]);
                break;

            case 'due_today':
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
                        $app->whereIn('status', ['scheduled', 'missed', 'confirmed'])
                            ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        $followUpAppointment($app);
                    },
                    'biteIntakes'   => function ($bi) { $bi->latest(); },
                    'biteIncidents' => function ($bi) { $bi->latest(); },
                    'latestTreatmentRecord',
                    'queues' => function ($qu) use ($followUpQueue) {
                        $followUpQueue($qu);
                        $qu->latest();
                    },
                ]);
                break;

            case 'upcoming':
                $query->whereHas('appointments', function ($q) use ($followUpAppointment) {
                    $q->where(function ($d) {
                        $d->whereDate('appointment_date', '>=', Carbon::tomorrow())
                          ->orWhereDate('scheduled_date', '>=', Carbon::tomorrow());
                    })->where('status', 'scheduled');
                    $followUpAppointment($q);
                })->whereDoesntHave('appointments', function ($q) use ($followUpAppointment) {
                    $q->where(function ($d) {
                        $d->whereDate('appointment_date', '<=', Carbon::today())
                          ->orWhereDate('scheduled_date', '<=', Carbon::today());
                    })->whereIn('status', ['scheduled', 'missed']);
                    $followUpAppointment($q);
                })->whereDoesntHave('queues', $followUpQueue)->with([
                    'appointments' => function ($q) use ($followUpAppointment) {
                        $q->whereIn('status', ['scheduled', 'missed', 'confirmed'])
                          ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        $followUpAppointment($q);
                    },
                    'biteIntakes'   => function ($bi) { $bi->latest(); },
                    'biteIncidents' => function ($bi) { $bi->latest(); },
                    'latestTreatmentRecord',
                ]);
                break;

            case 'online':
                $query->where(function ($q) {
                    $q->whereHas('biteIntakes')
                      ->orWhereHas('appointments', function ($app) {
                          $app->whereNotNull('booked_by_account_id')->where('status', '!=', 'cancelled');
                      })
                      ->orWhere(function ($sub) {
                          $sub->where('registration_source', 'mobile')->whereHas('appointments');
                      });
                })->with([
                    'appointments' => function ($app) {
                        $app->whereIn('status', ['scheduled', 'missed'])
                            ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                    },
                    'biteIntakes'   => function ($bi) { $bi->latest(); },
                    'biteIncidents' => function ($bi) { $bi->latest(); },
                    'latestTreatmentRecord',
                    'queues' => function ($qu) {
                        $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)->latest();
                    },
                ]);
                break;

            case 'overdue':
                $query->whereHas('appointments', function ($q) use ($followUpAppointment) {
                    $q->where(function ($d) {
                        $d->whereDate('appointment_date', '<', Carbon::today())
                          ->orWhereDate('scheduled_date', '<', Carbon::today());
                    })->whereIn('status', ['scheduled', 'missed']);
                    $followUpAppointment($q);
                })->with([
                    'appointments' => function ($q) use ($followUpAppointment) {
                        $q->whereIn('status', ['scheduled', 'missed'])
                          ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                        $followUpAppointment($q);
                    },
                    'biteIntakes'   => function ($bi) { $bi->latest(); },
                    'biteIncidents' => function ($bi) { $bi->latest(); },
                    'latestTreatmentRecord',
                ]);
                break;

            case 'completed_today':
                $query->whereHas('treatmentRecords', function ($q) {
                    $q->whereNotNull('dose_number')->whereDate('treatment_date', Carbon::today());
                })->with([
                    'latestTreatmentRecord',
                    'appointments' => function ($app) {
                        $app->whereIn('status', ['scheduled', 'missed'])
                            ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                    },
                    'biteIntakes'   => function ($bi) { $bi->latest(); },
                    'biteIncidents' => function ($bi) { $bi->latest(); },
                    'queues' => function ($qu) {
                        $qu->where('status', 'completed')->whereDate('queue_date', Carbon::today())->latest();
                    },
                ]);
                break;

            default: // 'all'
                $query->with([
                    'latestTreatmentRecord',
                    'upcomingAppointment',
                    'biteIncidents' => function ($bi) { $bi->latest(); },
                    'appointments'  => function ($app) {
                        $app->whereIn('status', ['scheduled', 'missed'])
                            ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
                    },
                    'biteIntakes'   => function ($bi) { $bi->latest(); },
                    'queues'        => function ($qu) {
                        $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
                           ->whereDate('queue_date', Carbon::today())->latest();
                    },
                ]);
                break;
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(fn($q) =>
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name',  'like', "%{$search}%")
                  ->orWhere('patient_id', 'like', "%{$search}%")
                  ->orWhere('patient_number', 'like', "%{$search}%")
            );
        }

        if ($request->filled('dose') && in_array($request->dose, ['3', '7', 'booster'], true)) {
            $this->applyDoseFilter($query, $request->dose);
        }

        $clinicId  = $request->user()->clinic_id;
        $todayDate = Carbon::today()->toDateString();

        if ($tab === 'needs_action') {
            $patients = $query->orderByRaw("(
                SELECT MIN(COALESCE(scheduled_date, appointment_date))
                FROM appointments
                WHERE appointments.patient_id = patients.patient_id
                  AND appointments.status IN ('scheduled', 'missed', 'confirmed')
            ) ASC")->paginate($request->get('per_page', 15));
        } else {
            $patients = $query->orderBy('last_name')->paginate($request->get('per_page', 15));
        }

        // Tab badge counts
        $needsActionCount    = Patient::where('clinic_id', $clinicId)
            ->whereHas('treatmentRecords', function ($tr) { $tr->whereNotNull('dose_number')->where('status', 'completed'); })
            ->where(function ($q) use ($todayDate, $followUpAppointment, $followUpQueue) {
                $q->whereHas('appointments', function ($app) use ($todayDate, $followUpAppointment) {
                    $app->where(function ($d) use ($todayDate) {
                        $d->whereDate('appointment_date', '<=', $todayDate)->orWhereDate('scheduled_date', '<=', $todayDate);
                    })->whereIn('status', ['scheduled', 'missed', 'confirmed']);
                    $followUpAppointment($app);
                })->orWhereHas('queues', $followUpQueue);
            })->count();

        $dueTodayCount       = Patient::where('clinic_id', $clinicId)
            ->where(function ($q) use ($followUpAppointment, $followUpQueue) {
                $q->whereHas('appointments', function ($app) use ($followUpAppointment) {
                    $app->where(function ($d) {
                        $d->where(function ($sub) {
                            $sub->whereDate('appointment_date', Carbon::today())->orWhereDate('scheduled_date', Carbon::today());
                        })->whereIn('status', ['scheduled', 'confirmed']);
                    })->orWhere('status', 'confirmed');
                    $followUpAppointment($app);
                })->orWhereHas('queues', $followUpQueue);
            })->count();

        $onlineCount         = Patient::where('clinic_id', $clinicId)
            ->where(function ($q) {
                $q->whereHas('biteIntakes')
                  ->orWhereHas('appointments', function ($app) { $app->whereNotNull('booked_by_account_id')->where('status', '!=', 'cancelled'); })
                  ->orWhere(function ($sub) { $sub->where('registration_source', 'mobile')->whereHas('appointments'); });
            })->count();

        $upcomingCount       = Patient::where('clinic_id', $clinicId)
            ->whereHas('appointments', function ($q) use ($followUpAppointment) {
                $q->where(function ($d) {
                    $d->whereDate('appointment_date', '>=', Carbon::tomorrow())->orWhereDate('scheduled_date', '>=', Carbon::tomorrow());
                })->where('status', 'scheduled');
                $followUpAppointment($q);
            })
            ->whereDoesntHave('appointments', function ($q) use ($followUpAppointment) {
                $q->where(function ($d) {
                    $d->whereDate('appointment_date', '<=', Carbon::today())->orWhereDate('scheduled_date', '<=', Carbon::today());
                })->whereIn('status', ['scheduled', 'missed']);
                $followUpAppointment($q);
            })
            ->whereDoesntHave('queues', $followUpQueue)
            ->count();

        $overdueCount        = Patient::where('clinic_id', $clinicId)
            ->whereHas('appointments', function ($q) use ($followUpAppointment) {
                $q->where(function ($d) {
                    $d->whereDate('appointment_date', '<', Carbon::today())->orWhereDate('scheduled_date', '<', Carbon::today());
                })->whereIn('status', ['scheduled', 'missed']);
                $followUpAppointment($q);
            })->count();

        $completedTodayCount = Patient::where('clinic_id', $clinicId)
            ->whereHas('treatmentRecords', function ($q) { $q->whereNotNull('dose_number')->whereDate('treatment_date', Carbon::today()); })
            ->count();

        $res = $patients->toArray();
        $res['needs_action_count']    = $needsActionCount;
        $res['due_today_count']       = $dueTodayCount;
        $res['online_count']          = $onlineCount;
        $res['upcoming_count']        = $upcomingCount;
        $res['overdue_count']         = $overdueCount;
        $res['completed_today_count'] = $completedTodayCount;

        if ($request->filled('patient_id')) {
            $targetId      = (int) $request->patient_id;
            $targetInPage  = collect($patients->items())->firstWhere('patient_id', $targetId);
            if (!$targetInPage) {
                $allIds      = (clone $query)->pluck('patients.patient_id')->toArray();
                $targetIndex = array_search($targetId, $allIds);
                if ($targetIndex !== false) {
                    $perPage             = (int) $request->get('per_page', 15);
                    $res['target_page'] = (int) floor($targetIndex / $perPage) + 1;
                } else {
                    $existingPatient = Patient::where('clinic_id', $clinicId)->find($targetId);
                    if ($existingPatient) {
                        $res['target_status_changed']  = true;
                        $res['target_patient_name']    = $existingPatient->first_name . ' ' . $existingPatient->last_name;
                    } else {
                        $res['target_not_found'] = true;
                    }
                }
            }
        }

        return response()->json($res);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /api/doctor/patients
    // ────────────────────────────────────────────────────────────────────────
    public function doctorPatients(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $tab      = $request->get('tab', 'today');
        $query    = Patient::where('clinic_id', $clinicId);

        switch ($tab) {
            case 'today':
                $query->where(fn($q) =>
                    $q->whereHas('treatmentRecords', fn($tr) =>
                        $tr->whereDate('consultation_date', Carbon::today())->whereNull('dose_number')
                    )->orWhereHas('queues', fn($qu) =>
                        $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)->whereDate('queue_date', Carbon::today())
                    )->orWhereDate('created_at', Carbon::today())
                )->with([
                    'treatmentRecords' => fn($tr) => $tr->whereDate('consultation_date', Carbon::today())->whereNull('dose_number')->orderBy('created_at', 'desc'),
                    'queues'           => fn($qu) => $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)->whereDate('queue_date', Carbon::today())->latest(),
                ]);
                break;

            case 'this_week':
                $query->whereHas('treatmentRecords', fn($q) =>
                    $q->whereBetween('consultation_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])->whereNull('dose_number')
                )->with([
                    'treatmentRecords' => fn($q) => $q->whereBetween('consultation_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])->whereNull('dose_number')->orderBy('consultation_date', 'desc'),
                ]);
                break;

            default: // 'all'
                $query->with([
                    'latestConsultationRecord',
                    'queues' => fn($qu) => $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)->whereDate('queue_date', Carbon::today())->latest(),
                ]);
                break;
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(fn($q) =>
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name',  'like', "%{$search}%")
                  ->orWhere('patient_id', 'like', "%{$search}%")
                  ->orWhere('patient_number', 'like', "%{$search}%")
            );
        }

        return response()->json($query->orderBy('last_name')->paginate($request->get('per_page', 15)));
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/appointments/{id}/check-in
    // ────────────────────────────────────────────────────────────────────────
    public function checkIn(Request $request, int $id): JsonResponse
    {
        $clinicId    = $request->user()->clinic_id;
        $appointment = Appointment::where('clinic_id', $clinicId)->find($id);

        if (!$appointment) {
            return response()->json(['success' => false, 'message' => "Appointment #{$id} not found for this clinic."], 404);
        }
        if ($this->appointmentService->isMobileBiteConsultation($appointment)) {
            return response()->json(['success' => false, 'message' => 'Mobile bite consultations must be checked in from Registration using the submitted bite intake before they enter the Doctor queue.'], 422);
        }
        if ($this->appointmentService->isBoosterAppointment($appointment)) {
            return response()->json(['success' => false, 'message' => 'Booster requests must be registered and assessed by the Doctor before treatment.'], 422);
        }
        if (!$this->appointmentService->isScheduledFollowUp($appointment) && $appointment->appointment_type !== 'consultation') {
            return response()->json(['success' => false, 'message' => 'Day 0 treatment requires Registration and Doctor assessment. Only a scheduled follow-up dose can check in directly at Treatment.'], 422);
        }

        if ($appointment->status !== 'confirmed') {
            $appointment->update(['status' => 'confirmed']);
        }

        return $this->appointmentService->processCheckIn(
            $clinicId, $request->user(), (int) $appointment->patient_id, $appointment,
            Carbon::today()->toDateString(), $request->get('priority', 'normal'),
        );
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/appointments/patient/{patientId}/check-in
    // ────────────────────────────────────────────────────────────────────────
    public function checkInByPatient(Request $request, int $patientId): JsonResponse
    {
        $clinicId  = $request->user()->clinic_id;
        $patient   = Patient::where('clinic_id', $clinicId)->find($patientId);

        if (!$patient) {
            return response()->json(['success' => false, 'message' => "Patient #{$patientId} not found for this clinic."], 404);
        }

        $todayDate = Carbon::today()->toDateString();

        // Idempotency — already confirmed
        $existingConfirmed = Appointment::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('status', 'confirmed')->first();
        if ($existingConfirmed) {
            if ($this->appointmentService->isMobileBiteConsultation($existingConfirmed)) {
                return response()->json(['success' => false, 'message' => 'Mobile bite consultations must be checked in from Registration using the submitted bite intake before they enter the Doctor queue.'], 422);
            }
            return $this->appointmentService->processCheckIn($clinicId, $request->user(), $patientId, $existingConfirmed, $todayDate, $request->get('priority', 'normal'));
        }

        // Find best matching appointment
        $appointment = Appointment::where('clinic_id', $clinicId)->where('patient_id', $patientId)
            ->whereIn('status', ['scheduled', 'missed'])
            ->orderByRaw("CASE WHEN DATE(scheduled_date) = '{$todayDate}' OR DATE(appointment_date) = '{$todayDate}' THEN 0 WHEN scheduled_date < '{$todayDate}' OR appointment_date < '{$todayDate}' THEN 1 ELSE 2 END")
            ->orderBy('scheduled_date', 'asc')
            ->first();

        if ($appointment) {
            if ($this->appointmentService->isMobileBiteConsultation($appointment)) {
                return response()->json(['success' => false, 'message' => 'Mobile bite consultations must be checked in from Registration using the submitted bite intake before they enter the Doctor queue.'], 422);
            }
            if ($this->appointmentService->isBoosterAppointment($appointment)) {
                return response()->json(['success' => false, 'message' => 'Booster requests must be registered and assessed by the Doctor before treatment.'], 422);
            }
            if (!$this->appointmentService->isScheduledFollowUp($appointment) && $appointment->appointment_type !== 'consultation') {
                return response()->json(['success' => false, 'message' => 'Day 0 treatment requires Registration and Doctor assessment. Only a scheduled follow-up dose can check in directly at Treatment.'], 422);
            }
            $appointment->update(['status' => 'confirmed']);
            return $this->appointmentService->processCheckIn($clinicId, $request->user(), $patientId, $appointment, $todayDate, $request->get('priority', 'normal'));
        }

        return response()->json(['success' => false, 'message' => 'No scheduled follow-up dose was found. Register a new exposure for Doctor assessment, or select the patient\'s scheduled follow-up appointment.'], 422);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/appointments/patient/{patientId}/cancel-check-in
    // ────────────────────────────────────────────────────────────────────────
    public function cancelCheckInByPatient(Request $request, int $patientId): JsonResponse
    {
        $clinicId  = $request->user()->clinic_id;
        $todayDate = Carbon::today()->toDateString();

        return DB::transaction(function () use ($request, $clinicId, $patientId, $todayDate) {
            $patient = Patient::where('clinic_id', $clinicId)->find($patientId);
            if (!$patient) {
                return response()->json(['success' => false, 'message' => "Patient #{$patientId} not found for this clinic."], 404);
            }

            $confirmedAppointments = Appointment::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('status', 'confirmed')->lockForUpdate()->get();
            $confirmedApptIds      = $confirmedAppointments->pluck('appointment_id')->filter()->all();
            $confirmedDoseNumbers  = $confirmedAppointments->pluck('dose_number')->filter()->all();

            $hasDoseForThisCheckIn = false;
            if (!empty($confirmedApptIds) || !empty($confirmedDoseNumbers)) {
                $hasDoseForThisCheckIn = TreatmentRecord::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('status', 'completed')
                    ->where(function ($q) use ($confirmedApptIds, $confirmedDoseNumbers) {
                        $hasCond = false;
                        if (!empty($confirmedApptIds)) { $q->whereIn('appointment_id', $confirmedApptIds); $hasCond = true; }
                        if (!empty($confirmedDoseNumbers)) { $hasCond ? $q->orWhereIn('dose_number', $confirmedDoseNumbers) : $q->whereIn('dose_number', $confirmedDoseNumbers); }
                    })->exists();
            }

            if ($hasDoseForThisCheckIn) {
                return response()->json(['success' => false, 'message' => 'Cannot cancel check-in because this vaccination dose has already been recorded in Form 3.'], 422);
            }

            $activeQueueStatuses = ['waiting', 'called', 'serving', 'in_consultation', 'second_chance', 'final_recall'];
            $activeQueues = Queue::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('queue_date', $todayDate)->whereNull('deleted_at')->whereIn('status', $activeQueueStatuses)->lockForUpdate()->get();

            if ($activeQueues->isEmpty() && $confirmedAppointments->isEmpty()) {
                return response()->json(['success' => false, 'message' => 'This patient is not currently checked in.'], 422);
            }

            foreach ($activeQueues as $queue) {
                $queue->update(['status' => 'cancelled', 'cancelled_at' => now(), 'check_in_notes' => $queue->check_in_notes ? $queue->check_in_notes . ' | Check-in cancelled' : 'Check-in cancelled']);
            }

            $confirmedAppointments = Appointment::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('status', 'confirmed')->lockForUpdate()->get();
            foreach ($confirmedAppointments as $appointment) {
                $apptDate = $appointment->scheduled_date ?? $appointment->appointment_date;
                $isPast   = $apptDate && Carbon::parse($apptDate)->isBefore(Carbon::today());
                $appointment->update(['status' => $isPast ? 'missed' : 'scheduled', 'queue_number' => null]);
            }

            Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");

            return response()->json(['success' => true, 'message' => "Check-in for {$patient->first_name} {$patient->last_name} has been cancelled."]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /api/appointments/{id}/cancel-check-in
    // ────────────────────────────────────────────────────────────────────────
    public function cancelCheckIn(Request $request, int $id): JsonResponse
    {
        $appointment = Appointment::where('clinic_id', $request->user()->clinic_id)->find($id);
        if (!$appointment) {
            return response()->json(['success' => false, 'message' => "Appointment #{$id} not found for this clinic."], 404);
        }
        return $this->cancelCheckInByPatient($request, (int) $appointment->patient_id);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    /**
     * Apply dose-number filter (Day 3 / Day 7 / booster) to a patient query.
     * Extracted from the original 100-line inline block in nursePatients().
     */
    private function applyDoseFilter(\Illuminate\Database\Eloquent\Builder $query, string $dose): void
    {
        if ($dose === '3') {
            $query->where(fn($q) =>
                $q->whereHas('appointments', fn($app) =>
                    $app->whereIn('status', ['scheduled', 'confirmed', 'missed'])->where(fn($sub) => $sub->where('dose_number', 3)->orWhere('notes', 'like', '%Day 3%')->orWhere('notes', 'like', '%Dose 1%'))
                )->orWhere(fn($q2) =>
                    $q2->whereDoesntHave('appointments', fn($app) => $app->whereIn('status', ['scheduled', 'confirmed', 'missed'])->where('dose_number', '!=', 3))
                       ->where(fn($fallback) =>
                           $fallback->whereHas('queues', fn($qu) => $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)->where(fn($qn) => $qn->where('check_in_notes', 'like', '%Day 3%')->orWhere('check_in_notes', 'like', '%Dose 1%')->orWhere('consultation_notes', 'like', '%Day 3%')->orWhere('consultation_notes', 'like', '%Dose 1%')))
                                    ->orWhere(fn($trQ) => $trQ->whereHas('treatmentRecords', fn($tr) => $tr->where('dose_number', 0)->where('status', 'completed'))->whereDoesntHave('treatmentRecords', fn($tr) => $tr->where('dose_number', '>=', 3)->where('status', 'completed')))
                       )
                )
            );
        } elseif ($dose === '7') {
            $query->where(fn($q) =>
                $q->whereHas('appointments', fn($app) =>
                    $app->whereIn('status', ['scheduled', 'confirmed', 'missed'])->where(fn($sub) => $sub->where('dose_number', 7)->orWhere('notes', 'like', '%Day 7%')->orWhere('notes', 'like', '%Dose 2%'))
                )->orWhere(fn($q2) =>
                    $q2->whereDoesntHave('appointments', fn($app) => $app->whereIn('status', ['scheduled', 'confirmed', 'missed'])->where('dose_number', '!=', 7))
                       ->where(fn($fallback) =>
                           $fallback->whereHas('queues', fn($qu) => $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)->where(fn($qn) => $qn->where('check_in_notes', 'like', '%Day 7%')->orWhere('check_in_notes', 'like', '%Dose 2%')->orWhere('consultation_notes', 'like', '%Day 7%')->orWhere('consultation_notes', 'like', '%Dose 2%')))
                                    ->orWhere(fn($trQ) => $trQ->whereHas('treatmentRecords', fn($tr) => $tr->where('dose_number', 3)->where('status', 'completed'))->whereDoesntHave('treatmentRecords', fn($tr) => $tr->where('dose_number', '>=', 7)->where('status', 'completed')))
                       )
                )
            );
        } elseif ($dose === 'booster') {
            $query->where(fn($q) =>
                $q->whereHas('appointments', fn($app) =>
                    $app->whereIn('status', ['scheduled', 'confirmed', 'missed'])->where(fn($sub) => $sub->where('appointment_type', 'booster')->orWhere('dose_number', '>=', 90)->orWhere('notes', 'like', '%booster%'))
                )->orWhere(fn($q2) =>
                    $q2->whereDoesntHave('appointments', fn($app) => $app->whereIn('status', ['scheduled', 'confirmed', 'missed'])->where(fn($sub) => $sub->where('dose_number', 3)->orWhere('dose_number', 7)))
                       ->where(fn($fallback) =>
                           $fallback->whereHas('queues', fn($qu) => $qu->whereIn('status', self::ACTIVE_QUEUE_STATUSES)->where(fn($qn) => $qn->where('visit_type', 'booster')->orWhere('check_in_notes', 'like', '%booster%')->orWhere('consultation_notes', 'like', '%booster%')))
                                    ->orWhereHas('treatmentRecords', fn($tr) => $tr->where('dose_number', '>=', 7)->where('status', 'completed'))
                       )
                )
            );
        }
    }
}
