<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\TreatmentRecord;
use Carbon\Carbon;
use Illuminate\Http\Request;

class MobileHistoryController extends Controller
{
    /**
     * Get consolidated real-time history (appointments + vaccinations) for the mobile app
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Linked patient IDs
        $patientQuery = $user->patients();
        if ($request->has('patient_id') && !empty($request->patient_id)) {
            $patientQuery->where('patients.patient_id', $request->patient_id);
        }
        $patients = $patientQuery->get();
        $patientIds = $patients->pluck('patient_id')->toArray();

        if (empty($patientIds)) {
            return response()->json([
                'summary' => [
                    'total_visits' => 0,
                    'total_vaccinations' => 0,
                    'active_cases' => 0,
                ],
                'active_case' => null,
                'records' => [],
            ]);
        }

        // 1. Fetch Appointments
        $appointments = Appointment::where(function ($q) use ($patientIds, $user) {
            $q->whereIn('patient_id', $patientIds)
              ->orWhere('booked_by_account_id', $user->id);
        })
        ->with('patient')
        ->orderBy('scheduled_date', 'desc')
        ->get();

        // 2. Fetch Vaccination Treatment Records
        $vaccinations = TreatmentRecord::whereIn('patient_id', $patientIds)
            ->whereNotNull('dose_number')
            ->with(['patient', 'biteIncident'])
            ->orderBy('scheduled_date', 'desc')
            ->get();

        // Dose mapping helper
        $doseNameMap = [
            0   => 'Day 0',
            3   => 'Day 3',
            7   => 'Day 7',
            14  => 'Day 14',
            28  => 'Day 28',
            90  => 'Booster 1',
            365 => 'Booster 2',
        ];

        // Format Appointments as History Records
        $formattedAppointments = $appointments->map(function ($app) {
            $date = $app->scheduled_date ? Carbon::parse($app->scheduled_date) : Carbon::today();
            $timeSlotText = match ($app->time_slot) {
                'afternoon' => '1:00 PM',
                'morning'   => '9:00 AM',
                default     => '9:30 AM',
            };

            $status = match ($app->status) {
                'completed'   => 'completed',
                'missed'      => 'missed',
                'cancelled'   => 'missed',
                default       => 'scheduled',
            };

            $title = $app->appointment_type === 'vaccination'
                ? 'Vaccination appointment'
                : 'Bite consultation';

            return [
                'id' => 'app-' . $app->appointment_id,
                'type' => 'appointments',
                'title' => $title,
                'date_time' => $date->format('F j, Y') . ' · ' . $timeSlotText,
                'raw_date' => $date->format('Y-m-d') . ' ' . $timeSlotText,
                'case_number' => null,
                'status' => $status,
                'patient_name' => $app->patient ? "{$app->patient->first_name} {$app->patient->last_name}" : null,
                'notes' => $app->notes,
                'sort_timestamp' => $date->timestamp,
            ];
        });

        // Group vaccinations by patient to compute progress
        $patientVaccinationCounts = [];
        foreach ($vaccinations as $vac) {
            $pid = $vac->patient_id;
            if (!isset($patientVaccinationCounts[$pid])) {
                $patientVaccinationCounts[$pid] = [
                    'completed' => 0,
                    'total'     => 4,
                ];
            }
            if ($vac->status === 'completed') {
                $patientVaccinationCounts[$pid]['completed']++;
            }
        }

        // Format Vaccinations as History Records
        $formattedVaccinations = $vaccinations->map(function ($vac) use ($doseNameMap, $patientVaccinationCounts) {
            $effectiveDate = $vac->treatment_date ? Carbon::parse($vac->treatment_date) : ($vac->scheduled_date ? Carbon::parse($vac->scheduled_date) : Carbon::today());
            $doseName = $doseNameMap[$vac->dose_number] ?? "Dose {$vac->dose_number}";
            
            $status = match ($vac->status) {
                'completed' => 'completed',
                'missed'    => 'missed',
                default     => ($effectiveDate->isPast() && !$effectiveDate->isToday()) ? 'missed' : 'scheduled',
            };

            $completedCount = $patientVaccinationCounts[$vac->patient_id]['completed'] ?? 1;
            $totalCount = 4;
            $doseIndex = match ($vac->dose_number) {
                0 => 1,
                3 => 2,
                7 => 3,
                28 => 4,
                default => min(4, max(1, (int)$vac->dose_number)),
            };

            $doseLabel = $status === 'completed'
                ? "{$doseIndex} of {$totalCount} done"
                : "{$doseIndex} of {$totalCount} · upcoming";

            $caseNo = $vac->biteIncident?->case_number ?? null;

            return [
                'id' => 'vac-' . $vac->treatment_id,
                'type' => 'vaccinations',
                'title' => "Anti-rabies vaccine · {$doseName}",
                'date_time' => $effectiveDate->format('F j, Y') . ' · 10:00 AM',
                'raw_date' => $effectiveDate->format('Y-m-d'),
                'case_number' => $caseNo,
                'status' => $status,
                'patient_name' => $vac->patient ? "{$vac->patient->first_name} {$vac->patient->last_name}" : null,
                'vaccine_brand' => $vac->vaccine_brand ?? 'Anti-Rabies Vaccine',
                'completed_doses' => $completedCount,
                'total_doses' => $totalCount,
                'dose_label' => $doseLabel,
                'sort_timestamp' => $effectiveDate->timestamp,
            ];
        });

        // Merge & Sort all timeline records descending
        $allRecords = $formattedAppointments
            ->concat($formattedVaccinations)
            ->sortByDesc('sort_timestamp')
            ->values()
            ->all();

        // 3. Resolve Active Case & Next Dose Banner
        $latestBite = BiteIncident::whereIn('patient_id', $patientIds)
            ->orderBy('bite_date', 'desc')
            ->first();

        $nextScheduledDose = TreatmentRecord::whereIn('patient_id', $patientIds)
            ->whereNotNull('dose_number')
            ->where('status', 'scheduled')
            ->whereDate('scheduled_date', '>=', Carbon::today())
            ->orderBy('scheduled_date', 'asc')
            ->first();

        $nextScheduledApp = Appointment::whereIn('patient_id', $patientIds)
            ->where('status', 'scheduled')
            ->whereDate('scheduled_date', '>=', Carbon::today())
            ->orderBy('scheduled_date', 'asc')
            ->first();

        $activeCase = null;
        if ($latestBite || $nextScheduledDose || $nextScheduledApp) {
            $caseNumber = $latestBite?->case_number 
                ?: ($latestBite ? 'BC-' . date('Y') . '-' . str_pad($latestBite->patient_id, 4, '0', STR_PAD_LEFT) : 'Case BC-' . date('Y'));

            $nextDoseDate = null;
            $nextDoseName = 'Follow-up';

            if ($nextScheduledDose) {
                $nextDoseDate = Carbon::parse($nextScheduledDose->scheduled_date);
                $nextDoseName = ($doseNameMap[$nextScheduledDose->dose_number] ?? 'Dose') . ' dose';
            } elseif ($nextScheduledApp) {
                $nextDoseDate = Carbon::parse($nextScheduledApp->scheduled_date);
                $nextDoseName = ($nextScheduledApp->appointment_type === 'vaccination' ? 'Vaccination' : 'Consultation');
            }

            $dueBadgeText = 'Active';
            $nextDoseText = 'All scheduled doses completed';

            if ($nextDoseDate) {
                $days = Carbon::today()->diffInDays($nextDoseDate, false);
                if ($days === 0) {
                    $dueBadgeText = 'Due today';
                } elseif ($days > 0) {
                    $dueBadgeText = "Due in {$days} day" . ($days > 1 ? 's' : '');
                } else {
                    $dueBadgeText = 'Overdue';
                }
                $nextDoseText = "Next: {$nextDoseName} · {$nextDoseDate->format('F j, Y')}";
            }

            $activeCase = [
                'case_number' => $caseNumber,
                'next_dose_text' => $nextDoseText,
                'due_badge_text' => $dueBadgeText,
            ];
        }

        // Summary metrics
        $completedVisits = $appointments->where('status', 'completed')->count() + $vaccinations->where('status', 'completed')->count();
        $completedVaccinations = $vaccinations->where('status', 'completed')->count();
        $activeCasesCount = $activeCase ? 1 : 0;

        return response()->json([
            'summary' => [
                'total_visits' => $completedVisits > 0 ? $completedVisits : count($allRecords),
                'total_vaccinations' => $completedVaccinations,
                'active_cases' => $activeCasesCount,
            ],
            'active_case' => $activeCase,
            'records' => $allRecords,
        ]);
    }
}
