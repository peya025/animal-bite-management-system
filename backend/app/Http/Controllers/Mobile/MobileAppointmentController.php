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

            $isVac = str_contains($app->appointment_type ?? '', 'vaccination') || $app->appointment_type === 'booster';
            $idealDate = $app->ideal_date ? \Carbon\Carbon::parse($app->ideal_date)->format('Y-m-d') : $dateStr;

            return [
                'appointment_id' => $app->appointment_id,
                'patient_id' => $app->patient_id,
                'patient_name' => $pName,
                'relationship' => $rel,
                'appointment_type' => $app->appointment_type,
                'type' => $isVac ? ($app->appointment_type === 'booster' ? 'booster' : 'vaccination') : 'consultation',
                'type_label' => $doseName ? "Anti-rabies vaccine · {$doseName}" : ($app->appointment_type === 'booster' ? 'Rabies Booster' : ($isVac ? 'Vaccination' : 'Bite consultation')),
                'dose_name' => $doseName,
                'dose_number' => $app->dose_number,
                'scheduled_date' => $dateStr,
                'appointment_date' => $dateStr,
                'ideal_date' => $idealDate,
                'schedule_drift_days' => (int) ($app->schedule_drift_days ?? 0),
                'schedule_adjustment_reason' => $app->schedule_adjustment_reason,
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
            'appointment_type' => ['required', 'in:consultation,vaccination,booster'],
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
                    'appointment_type'     => ['required', 'in:consultation,vaccination,booster'],
                    'scheduled_date'       => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
                    'time_slot'            => ['nullable', 'in:morning,afternoon'],
                    'notes'                => ['nullable', 'string', 'max:1000'],
                    'intake'               => ['required', 'array'],
                    'intake.bite_date'     => ['required', 'date', 'before_or_equal:today'],
                    'intake.incident_time' => ['nullable', 'date_format:H:i'],
                    'intake.bite_place'    => ['nullable', 'string', 'max:255'],
                    'intake.site_washed'   => ['required', 'boolean'],
                    'intake.wash_method'   => ['nullable', 'in:water_only,soap_and_water,antiseptic,other,unknown'],
                    'intake.wash_duration_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
                    'intake.exposure_type' => ['required', 'in:nibbling_uncovered_skin,nibbling_broken_skin,scratch_abrasion,transdermal_bite,handling_ingestion_raw_meat,unsure,bite,scratch,lick,other'],
                    'intake.animal_type'   => ['required', 'string', 'max:100'],
                    'intake.animal_type_others' => ['nullable', 'string', 'max:255'],
                    'intake.animal_status' => ['required', 'in:owned,stray,unknown'],
                    'intake.animal_captured'    => ['nullable', 'boolean'],
                    'intake.animal_available'   => ['nullable', 'boolean'],
                    'intake.animal_condition_reported' => ['nullable', 'in:apparently_healthy,sick,dead,unknown'],
                    'intake.wound_location'     => ['nullable', 'string', 'max:255'],
                    'intake.body_part_exposed'  => ['nullable', 'string', 'max:255'],
                    'intake.laterality'         => ['nullable', 'in:left,right,bilateral,multiple,not_applicable,unknown'],
                    'intake.patient_description' => ['nullable', 'string', 'max:2000'],
                    'intake.care_received'      => ['nullable', 'string', 'max:2000'],
                    'intake.referral_facility'  => ['nullable', 'string', 'max:255'],
                    'intake.prior_rabies_vaccination' => ['nullable', 'in:yes,no,unsure'],
                    'intake.prior_vaccination_date' => ['nullable', 'date', 'before_or_equal:today'],
                    'intake.prior_vaccination_facility' => ['nullable', 'string', 'max:255'],
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

        // A booster appointment requires the patient to have completed the primary
        // 3-dose PEP series (Days 0, 3, 7). If incomplete, reject with a clear message
        // and include has_completed_primary so the mobile app can react appropriately.
        if ($validated['appointment_type'] === 'booster') {
            if (!$patient->has_completed_primary) {
                return response()->json([
                    'message' => 'Booster booking requires completion of the primary 3-dose vaccine series (Day 0, Day 3, Day 7) first.',
                    'has_completed_primary' => false,
                ], 422);
            }
            // Primary series is complete — fall through to the booking transaction below.
        }

        // Use explicit begin/commit so that Laravel's savepoint mechanism
        // kicks in when already inside a RefreshDatabase test transaction.
        DB::beginTransaction();
        try {
            $isBooster = $validated['appointment_type'] === 'booster';

            $appointment = Appointment::create([
                'clinic_id'           => $patient->clinic_id,
                'patient_id'          => $validated['patient_id'],
                'appointment_type'    => $validated['appointment_type'],
                'dose_number'         => $isBooster ? 90 : null,
                'scheduled_date'      => $validated['scheduled_date'],
                'appointment_date'    => $validated['scheduled_date'],
                'ideal_date'          => $validated['scheduled_date'],
                'time_slot'           => $validated['time_slot'] ?? 'morning',
                'notes'               => $isBooster
                    ? trim(($validated['notes'] ?? '') . ' [BOOSTER RE-EXPOSURE: Day 0]')
                    : ($validated['notes'] ?? null),
                'booked_by_account_id' => $account->id,
                'status'              => 'scheduled',
            ]);

            if ($isBooster) {
                $day3Date = \Carbon\Carbon::parse($validated['scheduled_date'])->addDays(3)->format('Y-m-d');
                Appointment::create([
                    'clinic_id'            => $patient->clinic_id,
                    'patient_id'           => $validated['patient_id'],
                    'appointment_type'     => 'booster',
                    'dose_number'          => 365,
                    'scheduled_date'       => $day3Date,
                    'appointment_date'     => $day3Date,
                    'ideal_date'           => $day3Date,
                    'time_slot'            => $validated['time_slot'] ?? 'morning',
                    'notes'                => trim(($validated['notes'] ?? '') . ' [BOOSTER RE-EXPOSURE: Day 3 follow-up]'),
                    'booked_by_account_id' => $account->id,
                    'status'               => 'scheduled',
                ]);
            }

            if ($appointment->appointment_type === 'consultation' && !empty($validated['intake'])) {
                $intakeData = $validated['intake'];
                $exposureMap = [
                    'bite'    => 'transdermal_bite',
                    'scratch' => 'scratch_abrasion',
                    'lick'    => 'nibbling_uncovered_skin',
                    'other'   => 'nibbling_broken_skin',
                ];
                if (isset($intakeData['exposure_type']) && isset($exposureMap[$intakeData['exposure_type']])) {
                    $intakeData['exposure_type'] = $exposureMap[$intakeData['exposure_type']];
                }

                BiteIncidentIntake::create([
                    ...$intakeData,
                    'clinic_id'          => $patient->clinic_id,
                    'patient_id'         => $patient->patient_id,
                    'patient_account_id' => $account->id,
                    'appointment_id'     => $appointment->appointment_id,
                    'status'             => 'pending',
                    'submitted_at'       => now(),
                ]);
            }

            $readableType = match ($appointment->appointment_type) {
                'booster'      => 'rabies booster (2 doses)',
                'vaccination'  => 'vaccination',
                'consultation' => 'bite consultation',
                default        => $appointment->appointment_type,
            };

            Notification::create([
                'patient_id'         => $patient->patient_id,
                'patient_account_id' => $account->id,
                'appointment_id'     => $appointment->appointment_id,
                'type'               => 'booking_confirmation',
                'message'            => "{$patient->name}'s {$readableType} appointment is scheduled starting on {$appointment->scheduled_date->format('F j, Y')}.",
                'status'             => 'pending',
                'send_time'          => now(),
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        // Invalidate cache after creating appointment
        Cache::forget("mobile:appointments:account:{$account->id}");
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
