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
        $user = $request->user();
        $patientIds = $user->patients()->pluck('patients.patient_id')->toArray();
        $patients = $user->patients()->get()->keyBy('patient_id');

        $doseNameMap = [
            0   => 'Day 0',
            3   => 'Day 3',
            7   => 'Day 7',
            14  => 'Day 14',
            28  => 'Day 28',
            90  => 'Booster 1',
            365 => 'Booster 2',
        ];

        $appointments = Appointment::where(function ($q) use ($patientIds, $user) {
            $q->whereIn('patient_id', $patientIds)
              ->orWhere('booked_by_account_id', $user->id);
        })
        ->with(['patient', 'biteIncident'])
        ->orderByRaw('COALESCE(scheduled_date, appointment_date) asc')
        ->get();

        $formatted = $appointments->map(function ($app) use ($patients, $doseNameMap) {
            $p = $app->patient;
            $pivot = $patients->get($app->patient_id);
            $rel = $pivot ? ($pivot->pivot->relationship ?? 'self') : 'self';
            $pName = $p ? "{$p->first_name} {$p->last_name}" : 'Patient';

            $date = $app->scheduled_date ?? $app->appointment_date;
            $dateStr = $date ? \Carbon\Carbon::parse($date)->format('Y-m-d') : \Carbon\Carbon::today()->format('Y-m-d');

            $doseName = null;
            if ($app->dose_number !== null && isset($doseNameMap[$app->dose_number])) {
                $doseName = $doseNameMap[$app->dose_number];
            } elseif (preg_match('/(Day \d+|Booster \d+)/i', $app->notes ?? '', $m)) {
                $doseName = $m[1];
            }

            $isVac = str_contains($app->appointment_type ?? '', 'vaccination');

            return [
                'appointment_id' => $app->appointment_id,
                'patient_id' => $app->patient_id,
                'patient_name' => $pName,
                'relationship' => $rel,
                'appointment_type' => $app->appointment_type,
                'type' => $isVac ? 'vaccination' : 'consultation',
                'type_label' => $doseName ? "Anti-rabies vaccine · {$doseName}" : ($isVac ? 'Vaccination' : 'Bite consultation'),
                'dose_name' => $doseName,
                'dose_number' => $app->dose_number,
                'scheduled_date' => $dateStr,
                'appointment_date' => $dateStr,
                'time_slot' => $app->time_slot ?? 'morning',
                'status' => $app->status,
                'notes' => $app->notes,
                'cancellation_reason' => $app->cancellation_reason,
                'patient' => [
                    'patient_id' => $app->patient_id,
                    'name' => $pName,
                    'first_name' => $p?->first_name,
                    'last_name' => $p?->last_name,
                    'relationship' => $rel,
                ],
            ];
        });

        return response()->json($formatted);
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
                    'patient_id'           => ['required', 'integer', 'exists:patients,patient_id'],
                    'appointment_type'     => ['required', 'in:consultation,vaccination'],
                    'scheduled_date'       => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
                    'time_slot'            => ['nullable', 'in:morning,afternoon'],
                    'notes'                => ['nullable', 'string', 'max:1000'],
                    'intake'               => ['required', 'array'],
                    'intake.bite_date'     => ['required', 'date', 'before_or_equal:today'],
                    'intake.bite_place'    => ['nullable', 'string', 'max:255'],
                    'intake.site_washed'   => ['required', 'boolean'],
                    'intake.exposure_type' => ['required', 'in:nibbling_uncovered_skin,nibbling_broken_skin,scratch_abrasion,transdermal_bite,handling_ingestion_raw_meat'],
                    'intake.animal_type'   => ['required', 'string', 'max:100'],
                    'intake.animal_type_others' => ['nullable', 'string', 'max:255'],
                    'intake.animal_status' => ['required', 'in:owned,stray,unknown'],
                    'intake.animal_captured'    => ['nullable', 'boolean'],
                    'intake.wound_location'     => ['nullable', 'string', 'max:255'],
                    'intake.body_part_exposed'  => ['nullable', 'in:head_neck,other_parts,na_ingestion'],
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
                'clinic_id'           => $patient->clinic_id,
                'patient_id'          => $validated['patient_id'],
                'appointment_type'    => $validated['appointment_type'],
                'scheduled_date'      => $validated['scheduled_date'],
                'appointment_date'    => $validated['scheduled_date'], // keep in sync
                'time_slot'           => $validated['time_slot'] ?? 'morning',
                'notes'               => $validated['notes'] ?? null,
                'booked_by_account_id' => $account->id,
                'status'              => 'scheduled',
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
