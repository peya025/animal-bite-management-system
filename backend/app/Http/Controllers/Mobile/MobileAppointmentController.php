<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BiteIncidentIntake;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class MobileAppointmentController extends Controller
{
    public function index(Request $request)
    {
        $accountId = $request->user()->id;
        $cacheKey = "mobile:appointments:account:{$accountId}";

        // Cache for 5 minutes
        return response()->json(
            Cache::remember($cacheKey, 300, function () use ($request) {
                return $request->user()->appointments()
                    ->with('patient')
                    ->latest('scheduled_date')
                    ->get();
            })
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,patient_id'],
            'appointment_type' => ['required', 'in:consultation,vaccination'],
            'scheduled_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'time_slot' => ['nullable', 'in:morning,afternoon'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'intake' => ['nullable', 'array'],
        ]);

        if ($validated['appointment_type'] === 'consultation') {
            $validated = Validator::make(
                $request->all(),
                [
                    'patient_id' => ['required', 'integer', 'exists:patients,patient_id'],
                    'appointment_type' => ['required', 'in:consultation,vaccination'],
                    'scheduled_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
                    'time_slot' => ['nullable', 'in:morning,afternoon'],
                    'notes' => ['nullable', 'string', 'max:1000'],
                    'intake' => ['required', 'array'],
                    'intake.bite_date' => ['required', 'date', 'before_or_equal:today'],
                    'intake.bite_place' => ['nullable', 'string', 'max:255'],
                    'intake.site_washed' => ['required', 'boolean'],
                    'intake.exposure_type' => ['required', 'in:bite,scratch,lick,other'],
                    'intake.animal_type' => ['required', 'string', 'max:100'],
                    'intake.animal_status' => ['required', 'in:owned,stray,unknown'],
                    'intake.animal_captured' => ['nullable', 'boolean'],
                    'intake.wound_location' => ['nullable', 'string', 'max:255'],
                    'intake.patient_description' => ['nullable', 'string', 'max:2000'],
                ],
                [
                    'intake.bite_date.before_or_equal' => 'The incident date must be today or earlier.',
                ],
            )->validate();
        }

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
                'time_slot' => $validated['time_slot'] ?? 'morning',
                'notes' => $validated['notes'] ?? null,
                'booked_by_account_id' => $account->id,
                'status' => 'scheduled',
            ]);

            if ($appointment->appointment_type === 'consultation' && !empty($validated['intake'])) {
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

        // Invalidate cache after creating appointment
        Cache::forget("mobile:appointments:account:{$account->id}");
        // Clear notification cache (all pages)
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("mobile:notifications:account:{$account->id}:page:{$i}");
        }

        return response()->json($appointment->load(['patient', 'biteIntake']), 201);
    }

    public function cancel(Request $request, int $appointment)
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $appointment = $request->user()->appointments()
            ->whereKey($appointment)
            ->with('patient')
            ->firstOrFail();

        abort_unless($appointment->status === 'scheduled', 422, 'Only scheduled appointments can be cancelled.');

        $appointment->update([
            'status' => 'cancelled',
            'cancellation_reason' => $validated['reason'] ?? null,
            'cancelled_at' => now(),
        ]);

        Notification::create([
            'patient_id' => $appointment->patient_id,
            'patient_account_id' => $request->user()->id,
            'appointment_id' => $appointment->appointment_id,
            'type' => 'booking_cancelled',
            'message' => "{$appointment->patient->name}'s {$appointment->appointment_type} appointment was cancelled.",
            'status' => 'pending',
            'send_time' => now(),
        ]);

        // Invalidate cache after cancelling appointment
        $accountId = $request->user()->id;
        Cache::forget("mobile:appointments:account:{$accountId}");
        // Clear notification cache (all pages)
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("mobile:notifications:account:{$accountId}:page:{$i}");
        }

        return response()->json($appointment->fresh()->load('patient'));
    }
}
