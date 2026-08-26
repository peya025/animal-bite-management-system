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

        // 1. Fetch Appointments: History only includes past appointments or completed/missed/cancelled ones
        $appointments = Appointment::where(function ($q) use ($patientIds, $user) {
            $q->whereIn('patient_id', $patientIds)
              ->orWhere('booked_by_account_id', $user->id);
        })
        ->where(function ($q) {
            $q->whereIn('status', ['completed', 'missed', 'cancelled'])
              ->orWhereDate('scheduled_date', '<', Carbon::today())
              ->orWhereDate('appointment_date', '<', Carbon::today());
        })
        ->with('patient')
        ->orderByRaw('COALESCE(scheduled_date, appointment_date) desc')
        ->get();

        // 2. Fetch Vaccination Treatment Records: History only includes administered vaccinations or past dates
        $vaccinations = TreatmentRecord::whereIn('patient_id', $patientIds)
            ->whereNotNull('dose_number')
            ->where(function ($q) {
                $q->whereIn('status', ['completed', 'administered'])
                  ->orWhereNotNull('treatment_date')
                  ->orWhereDate('scheduled_date', '<', Carbon::today());
            })
            ->with(['patient', 'biteIncident'])
            ->orderByRaw('COALESCE(treatment_date, scheduled_date) desc')
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

        // Build patient profile map with relationships
        $patientMap = [];
        foreach ($patients as $p) {
            $patientMap[$p->patient_id] = [
                'id' => $p->patient_id,
                'name' => "{$p->first_name} {$p->last_name}",
                'relationship' => $p->pivot->relationship ?? 'self',
            ];
        }

        // Format Appointments as History Records
        $formattedAppointments = $appointments->map(function ($app) use ($patientMap) {
            $rawDate = $app->scheduled_date ?? $app->appointment_date ?? Carbon::today();
            $dateOnly = Carbon::parse($rawDate)->format('Y-m-d');

            $timeSlotText = match ($app->time_slot) {
                'afternoon' => '1:00 PM',
                'morning'   => '9:00 AM',
                default     => ($app->appointment_time ? Carbon::parse($app->appointment_time)->format('g:i A') : '9:30 AM'),
            };

            $timeStr = match ($app->time_slot) {
                'afternoon' => '13:00:00',
                'morning'   => '09:00:00',
                default     => ($app->appointment_time ? Carbon::parse($app->appointment_time)->format('H:i:s') : '09:30:00'),
            };

            $eventDateTime = Carbon::parse("{$dateOnly} {$timeStr}");

            $status = match ($app->status) {
                'completed'   => 'completed',
                'missed'      => 'missed',
                'cancelled'   => 'missed',
                default       => 'scheduled',
            };

            $isVaccination = str_contains($app->appointment_type ?? '', 'vaccination');
            $doseName = null;
            if ($app->dose_number !== null && isset($doseNameMap[$app->dose_number])) {
                $doseName = $doseNameMap[$app->dose_number];
            } elseif (preg_match('/(Day \d+|Booster \d+)/i', $app->notes ?? '', $matches)) {
                $doseName = $matches[1];
            }

            if ($isVaccination) {
                $title = $doseName ? "Anti-rabies vaccine · {$doseName}" : 'Vaccination appointment';
            } else {
                $title = 'Bite consultation';
            }

            $pInfo = $patientMap[$app->patient_id] ?? null;
            $pName = $pInfo ? $pInfo['name'] : ($app->patient ? "{$app->patient->first_name} {$app->patient->last_name}" : 'Patient');
            $pRel = $pInfo ? $pInfo['relationship'] : 'self';

            return [
                'id' => 'app-' . $app->appointment_id,
                'type' => $isVaccination ? 'vaccinations' : 'appointments',
                'title' => $title,
                'date_time' => $eventDateTime->format('F j, Y') . ' · ' . $timeSlotText,
                'raw_date' => $eventDateTime->format('Y-m-d') . ' ' . $timeSlotText,
                'case_number' => null,
                'status' => $status,
                'patient_id' => $app->patient_id,
                'patient_name' => $pName,
                'relationship' => $pRel,
                'notes' => $app->notes,
                'sort_timestamp' => $eventDateTime->timestamp,
                'created_timestamp' => $app->created_at ? Carbon::parse($app->created_at)->timestamp : $eventDateTime->timestamp,
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
        $formattedVaccinations = $vaccinations->map(function ($vac) use ($doseNameMap, $patientVaccinationCounts, $patientMap) {
            $rawVacDate = $vac->treatment_date ?: ($vac->scheduled_date ?: Carbon::today());
            $vacDateOnly = Carbon::parse($rawVacDate)->format('Y-m-d');
            $eventDateTime = Carbon::parse("{$vacDateOnly} 10:00:00");
            $doseName = $doseNameMap[$vac->dose_number] ?? "Dose {$vac->dose_number}";
            
            $status = match ($vac->status) {
                'completed' => 'completed',
                'missed'    => 'missed',
                default     => ($eventDateTime->isPast() && !$eventDateTime->isToday()) ? 'missed' : 'scheduled',
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

            $pInfo = $patientMap[$vac->patient_id] ?? null;
            $pName = $pInfo ? $pInfo['name'] : ($vac->patient ? "{$vac->patient->first_name} {$vac->patient->last_name}" : 'Patient');
            $pRel = $pInfo ? $pInfo['relationship'] : 'self';

            return [
                'id' => 'vac-' . $vac->treatment_id,
                'type' => 'vaccinations',
                'title' => "Anti-rabies vaccine · {$doseName}",
                'date_time' => $eventDateTime->format('F j, Y') . ' · 10:00 AM',
                'raw_date' => $eventDateTime->format('Y-m-d'),
                'case_number' => $caseNo,
                'status' => $status,
                'patient_id' => $vac->patient_id,
                'patient_name' => $pName,
                'relationship' => $pRel,
                'vaccine_brand' => $vac->vaccine_brand ?? 'Anti-Rabies Vaccine',
                'completed_doses' => $completedCount,
                'total_doses' => $totalCount,
                'dose_label' => $doseLabel,
                'sort_timestamp' => $eventDateTime->timestamp,
                'created_timestamp' => $vac->created_at ? $vac->created_at->timestamp : $eventDateTime->timestamp,
            ];
        });

        // Merge & Sort all timeline records descending (Newest to Oldest)
        $allRecords = $formattedAppointments
            ->concat($formattedVaccinations)
            ->sort(function ($a, $b) {
                if ($b['sort_timestamp'] !== $a['sort_timestamp']) {
                    return $b['sort_timestamp'] <=> $a['sort_timestamp'];
                }
                $bCreated = $b['created_timestamp'] ?? $b['sort_timestamp'];
                $aCreated = $a['created_timestamp'] ?? $a['sort_timestamp'];
                if ($bCreated !== $aCreated) {
                    return $bCreated <=> $aCreated;
                }
                return strcmp($b['id'], $a['id']);
            })
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

        $nextScheduledApp = Appointment::where(function ($q) use ($patientIds, $user) {
            $q->whereIn('patient_id', $patientIds)
              ->orWhere('booked_by_account_id', $user->id);
        })
        ->where('status', 'scheduled')
        ->where(function ($q) {
            $q->whereDate('scheduled_date', '>=', Carbon::today())
              ->orWhereDate('appointment_date', '>=', Carbon::today());
        })
        ->orderByRaw('COALESCE(scheduled_date, appointment_date) asc')
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
                $rawNext = $nextScheduledApp->scheduled_date ?? $nextScheduledApp->appointment_date;
                $nextDoseDate = Carbon::parse($rawNext);
                $nextDoseDoseNo = $nextScheduledApp->dose_number;
                if ($nextDoseDoseNo !== null && isset($doseNameMap[$nextDoseDoseNo])) {
                    $nextDoseName = $doseNameMap[$nextDoseDoseNo] . ' dose';
                } elseif (str_contains($nextScheduledApp->appointment_type ?? '', 'vaccination')) {
                    $nextDoseName = 'Vaccination';
                } else {
                    $nextDoseName = 'Consultation';
                }
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
                'patients' => array_values($patientMap),
            ],
            'active_case' => $activeCase,
            'records' => $allRecords,
        ]);
    }
}
