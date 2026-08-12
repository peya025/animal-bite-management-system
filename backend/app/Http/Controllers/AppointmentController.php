<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\TreatmentRecord;
use Illuminate\Http\Request;
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

            // Filter by date
            if ($request->has('date')) {
                $query->whereDate('appointment_date', $request->date);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
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
    public function nursePatients(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            $tab = $request->get('tab', 'due_today');

            $query = Patient::where('clinic_id', $clinicId);

            switch ($tab) {
                case 'due_today':
                    // Patients with appointments today OR currently waiting/in consultation in queue
                    $query->where(function ($q) {
                        $q->whereHas('appointments', function ($app) {
                            $app->whereDate('appointment_date', Carbon::today())
                              ->where('appointment_type', 'follow_up_vaccination')
                              ->where('status', 'scheduled');
                        })->orWhereHas('queues', function ($qu) {
                            $qu->whereIn('status', ['waiting', 'in_consultation']);
                        });
                    })->with([
                        'appointments' => function ($app) {
                            $app->whereDate('appointment_date', Carbon::today())
                              ->where('status', 'scheduled');
                        },
                        'latestTreatmentRecord',
                        'queues' => function ($qu) {
                            $qu->whereIn('status', ['waiting', 'in_consultation'])->latest();
                        }
                    ]);
                    break;

                case 'upcoming':
                    // Patients with appointments in next 7 days
                    $query->whereHas('appointments', function ($q) {
                        $q->whereBetween('appointment_date', [Carbon::tomorrow(), Carbon::today()->addDays(7)])
                          ->where('appointment_type', 'follow_up_vaccination')
                          ->where('status', 'scheduled');
                    })->with([
                        'appointments' => function ($q) {
                            $q->whereBetween('appointment_date', [Carbon::tomorrow(), Carbon::today()->addDays(7)])
                              ->where('status', 'scheduled')
                              ->orderBy('appointment_date');
                        },
                        'latestTreatmentRecord'
                    ]);
                    break;

                case 'overdue':
                    // Patients with missed appointments
                    $query->whereHas('appointments', function ($q) {
                        $q->where('appointment_date', '<', Carbon::today())
                          ->where('appointment_type', 'follow_up_vaccination')
                          ->whereIn('status', ['scheduled', 'missed']);
                    })->with([
                        'appointments' => function ($q) {
                            $q->where('appointment_date', '<', Carbon::today())
                              ->whereIn('status', ['scheduled', 'missed'])
                              ->orderBy('appointment_date', 'desc');
                        },
                        'latestTreatmentRecord'
                    ]);
                    break;

                case 'all':
                default:
                    // All clinic patients with their latest treatment record and appointment info
                    $query->with(['latestTreatmentRecord', 'upcomingAppointment', 'queues' => function ($qu) {
                        $qu->whereIn('status', ['waiting', 'in_consultation'])->latest();
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
                    // Patients seen today OR currently waiting/in consultation in queue
                    $query->where(function ($q) {
                        $q->whereHas('treatmentRecords', function ($tr) {
                            $tr->whereDate('consultation_date', Carbon::today())
                               ->whereNull('dose_number');
                        })->orWhereHas('queues', function ($qu) {
                            $qu->whereIn('status', ['waiting', 'in_consultation']);
                        });
                    })->with([
                        'treatmentRecords' => function ($tr) {
                            $tr->whereDate('consultation_date', Carbon::today())
                               ->whereNull('dose_number')
                               ->orderBy('created_at', 'desc');
                        },
                        'queues' => function ($qu) {
                            $qu->whereIn('status', ['waiting', 'in_consultation'])->latest();
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
                        $qu->whereIn('status', ['waiting', 'in_consultation'])->latest();
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
}
