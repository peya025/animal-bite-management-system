<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BiteIncidentIntake;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MobileAppointmentController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->appointments()
                ->with('patient')
                ->latest('scheduled_date')
                ->get(),
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,patient_id'],
            'appointment_type' => ['required', 'in:consultation,vaccination'],
            'scheduled_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'intake' => ['required_if:appointment_type,consultation', 'array'],
            'intake.bite_date' => ['required_if:appointment_type,consultation', 'date', 'before_or_equal:today'],
            'intake.bite_place' => ['nullable', 'string', 'max:255'],
            'intake.site_washed' => ['required_if:appointment_type,consultation', 'boolean'],
            'intake.exposure_type' => ['required_if:appointment_type,consultation', 'in:bite,scratch,lick,other'],
            'intake.animal_type' => ['required_if:appointment_type,consultation', 'string', 'max:100'],
            'intake.animal_status' => ['required_if:appointment_type,consultation', 'in:owned,stray,unknown'],
            'intake.animal_captured' => ['nullable', 'boolean'],
            'intake.wound_location' => ['nullable', 'string', 'max:255'],
            'intake.patient_description' => ['nullable', 'string', 'max:2000'],
        ]);

        $account = $request->user();
        $patient = $account->patients()
            ->whereKey($validated['patient_id'])
            ->wherePivotIn('status', ['pending', 'verified'])
            ->firstOrFail();

        $appointment = DB::transaction(function () use ($account, $patient, $validated) {
            $appointment = Appointment::create([
                'patient_id' => $validated['patient_id'],
                'appointment_type' => $validated['appointment_type'],
                'scheduled_date' => $validated['scheduled_date'],
                'booked_by_account_id' => $account->id,
                'status' => 'scheduled',
            ]);

            if ($appointment->appointment_type === 'consultation') {
                BiteIncidentIntake::create([
                    ...$validated['intake'],
                    'clinic_id' => $patient->clinic_id,
                    'patient_id' => $patient->patient_id,
                    'patient_account_id' => $account->id,
                    'appointment_id' => $appointment->appointment_id,
                    'status' => 'pending',
                ]);
            }

            Notification::create([
                'patient_id' => $patient->patient_id,
                'patient_account_id' => $account->id,
                'appointment_id' => $appointment->appointment_id,
                'type' => 'booking_confirmation',
                'message' => "{$patient->name}'s {$appointment->appointment_type} appointment is scheduled for {$appointment->scheduled_date->format('F j, Y')}.",
                'status' => 'pending',
                'send_time' => now(),
            ]);

            return $appointment;
        });

        return response()->json($appointment->load(['patient', 'biteIntake']), 201);
    }
}
