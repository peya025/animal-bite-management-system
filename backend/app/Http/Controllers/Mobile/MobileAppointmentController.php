<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
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
        ]);

        $account = $request->user();
        $patient = $account->patients()
            ->whereKey($validated['patient_id'])
            ->wherePivotIn('status', ['pending', 'verified'])
            ->firstOrFail();

        $appointment = DB::transaction(function () use ($account, $patient, $validated) {
            $appointment = Appointment::create([
                ...$validated,
                'booked_by_account_id' => $account->id,
                'status' => 'scheduled',
            ]);

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

        return response()->json($appointment->load('patient'), 201);
    }
}
