<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BiteIncident;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class RegistrationReportService
{
    /** All aggregates are clinic-scoped and computed before record pagination. */
    public function build(int $clinicId, string $from, string $to, string $category): array
    {
        $today = CarbonImmutable::today();
        $start = CarbonImmutable::parse($from);
        $end = CarbonImmutable::parse($to);
        $previousEnd = $start->subDay();
        $previousStart = $start->subDays((int) $start->diffInDays($end) + 1);
        $severity = ['I' => 'minor', 'II' => 'moderate', 'III' => 'severe'][$category] ?? null;
        $episodes = collect();
        $query = BiteIncident::where('clinic_id', $clinicId)
            ->whereDate('bite_date', '<=', $today->toDateString())
            ->whereHas('patient', fn ($q) => $q->where('clinic_id', $clinicId))
            ->when($severity, fn ($q) => $q->where('severity', $severity))
            ->with([
                'patient', 'location',
                'treatmentPlan' => fn ($q) => $q->where('clinic_id', $clinicId),
                'treatmentRecords' => fn ($q) => $q->where('clinic_id', $clinicId)->whereNull('voided_at'),
            ]);

        // Batch loading avoids a 500-record dashboard limit and per-case queries.
        $query->chunkById(250, function ($cases) use (&$episodes, $clinicId, $today) {
            $appointments = Appointment::where('clinic_id', $clinicId)
                ->whereIn('bite_id', $cases->pluck('bite_id'))
                ->with(['reminders' => fn ($q) => $q->where('clinic_id', $clinicId)->orderByDesc('id')])
                ->get()->groupBy('bite_id');
            foreach ($cases as $case) {
                $episodes->push($this->episode($case, $appointments->get($case->bite_id, collect()), $today));
            }
        }, 'bite_id');

        $inPeriod = fn ($date, $a, $b) => $date && $date >= $a && $date <= $b;
        $incidents = $episodes->filter(fn ($e) => $inPeriod($e['bite_date'], $from, $to))->values();
        $cohort = $episodes->filter(fn ($e) => $inPeriod($e['d0_date'], $from, $to))->values();
        $previous = $episodes->filter(fn ($e) => $inPeriod($e['d0_date'], $previousStart->toDateString(), $previousEnd->toDateString()));
        $completion = $this->completion($cohort);
        $previousCompletion = $this->completion($previous);
        $delays = $cohort->pluck('delay_days')->filter(fn ($v) => $v !== null)->values();
        $overdueEpisodes = $episodes->filter(fn ($e) => count($e['overdue']) > 0);
        $followup = $overdueEpisodes->flatMap(function ($e) {
            return collect($e['overdue'])->map(fn ($dose) => array_merge([
                'case_number' => $e['case_number'], 'patient' => $e['patient'], 'contact' => $e['contact'],
                'category' => $e['category'], 'last_dose_date' => $e['last_dose_date'],
            ], $dose));
        })->sortByDesc('days_overdue')->values();
        $referrals = $incidents->flatMap(fn ($e) => collect($e['referrals'])->map(fn ($r) => array_merge([
            'case_number' => $e['case_number'], 'patient' => $e['patient'], 'category' => $e['category'],
        ], $r)))->values();
        $referralCases = $incidents->filter(fn ($e) => count($e['referrals']) > 0)->count();
        $months = collect();
        for ($month = $start->startOfMonth(); $month <= $end; $month = $month->addMonth()) {
            $rows = $incidents->filter(fn ($e) => substr($e['bite_date'], 0, 7) === $month->format('Y-m'));
            $months->push(['month' => $month->format('Y-m'), 'I' => $rows->where('category', 'I')->count(),
                'II' => $rows->where('category', 'II')->count(), 'III' => $rows->where('category', 'III')->count()]);
        }

        $stats = [
            'patients' => $incidents->pluck('patient_id')->unique()->count(), 'incidents' => $incidents->count(),
            'pep_starts' => $cohort->count(), 'completion' => $completion, 'previous_completion' => $previousCompletion,
            'completion_change_pp' => $completion['rate'] !== null && $previousCompletion['rate'] !== null
                ? round($completion['rate'] - $previousCompletion['rate'], 1) : null,
            'delay' => ['average' => $delays->isEmpty() ? null : round($delays->avg(), 1),
                'median' => $delays->isEmpty() ? null : round($delays->median(), 1),
                'min' => $delays->min(), 'max' => $delays->max(), 'samples' => $delays->count(),
                'excluded' => $cohort->count() - $delays->count()],
            'overdue_patients' => $overdueEpisodes->pluck('patient_id')->unique()->count(),
            'overdue_doses' => $followup->count(),
            'awaiting_d0' => $episodes->where('outcome', 'Awaiting D0')->count(),
            'referrals' => $referralCases,
            'referral_rate' => $incidents->isEmpty() ? null : round(100 * $referralCases / $incidents->count(), 1),
        ];

        return [
            'stats' => $stats, 'months' => $months,
            'breakdowns' => [
                'barangays' => $this->counts($incidents, 'barangay'), 'ages' => $this->counts($incidents, 'age_group', ['Children (0–12)', 'Adolescents (13–17)', 'Adults (18–59)', 'Seniors (60+)', 'Unknown']),
                'animals' => $this->counts($incidents, 'animal_type'), 'ownership' => $this->counts($incidents, 'ownership'),
                'observation' => $this->counts($incidents, 'observation'),
                'weekdays' => $this->counts($incidents, 'weekday', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
                'outcomes' => $this->counts($cohort, 'outcome'),
            ],
            'period' => ['from' => $from, 'to' => $to, 'category' => $category,
                'previous_from' => $previousStart->toDateString(), 'previous_to' => $previousEnd->toDateString(),
                'as_of' => $today->toDateString()],
            'reports' => [
                'summary' => collect([
                    ['metric' => 'Patients with incidents in period', 'value' => $stats['patients']],
                    ['metric' => 'Bite episodes in period', 'value' => $stats['incidents']],
                    ['metric' => 'Category I episodes', 'value' => $incidents->where('category', 'I')->count()],
                    ['metric' => 'Category II episodes', 'value' => $incidents->where('category', 'II')->count()],
                    ['metric' => 'Category III episodes', 'value' => $incidents->where('category', 'III')->count()],
                    ['metric' => 'PEP starts (D0 in period)', 'value' => $stats['pep_starts']],
                    ['metric' => 'Eligible courses', 'value' => $completion['eligible']],
                    ['metric' => 'Completed eligible courses', 'value' => $completion['completed']],
                    ['metric' => 'D0 courses outside completion denominator', 'value' => $completion['excluded']],
                    ['metric' => 'PEP vaccine-course completion (%)', 'value' => $completion['rate']],
                    ['metric' => 'Average exposure-to-D0 (calendar days)', 'value' => $stats['delay']['average']],
                    ['metric' => 'Median exposure-to-D0 (calendar days)', 'value' => $stats['delay']['median']],
                    ['metric' => 'Patients overdue as of today (all incident dates)', 'value' => $stats['overdue_patients']],
                    ['metric' => 'Awaiting D0 as of today (all incident dates)', 'value' => $stats['awaiting_d0']],
                    ['metric' => 'Referred incident cases', 'value' => $referralCases],
                    ['metric' => 'Referral rate (%)', 'value' => $stats['referral_rate']],
                ]),
                'pep' => $cohort,
                'followup' => $followup,
                'awaiting' => $episodes->where('outcome', 'Awaiting D0')->values(),
                'surveillance' => $incidents,
                'referrals' => $referrals,
            ],
        ];
    }

    private function episode(BiteIncident $case, Collection $appointments, CarbonImmutable $today): array
    {
        $records = $case->treatmentRecords->filter(fn ($r) => $r->patient_id === $case->patient_id);
        $doses = $records->filter(fn ($r) => $r->dose_number !== null && $r->status === 'completed'
            && $r->treatment_date && $r->treatment_date->toDateString() <= $today->toDateString());
        $d0 = $doses->where('dose_number', 0)->sortBy('treatment_date')->first()?->treatment_date?->toDateString();
        $received = $doses->pluck('dose_number')->unique()->sort()->values()->all();
        $plan = $case->treatmentPlan?->patient_id === $case->patient_id ? $case->treatmentPlan : null;
        $required = collect($plan?->ordered_dose_days ?? [])->filter(fn ($n) => is_numeric($n) && $n >= 0)
            ->map(fn ($n) => (int) $n)->unique()->sort()->values()->all();
        $verified = $plan && in_array($plan->status, ['approved', 'completed'], true) && count($required) > 0;
        $complete = $d0 && $verified && count(array_diff($required, $received)) === 0;
        $transferred = $case->status === 'transferred_out';
        $stopped = in_array($case->status, ['cancelled', 'discontinued'], true)
            || in_array($plan?->status, ['cancelled', 'discontinued'], true);
        $noVaccine = $plan?->plan_type === 'no_vaccine';
        $appointments = $appointments->where('patient_id', $case->patient_id);
        $overdue = [];
        $finalDue = null;
        foreach ($required as $day) {
            if (!$d0) { break; }
            $appointment = $appointments->where('dose_number', $day)->sortByDesc('appointment_id')->first();
            $scheduled = $records->where('dose_number', $day)->whereIn('status', ['scheduled', 'missed', 'rescheduled'])
                ->sortByDesc('treatment_id')->first();
            $due = $appointment?->appointment_date ?? $appointment?->scheduled_date ?? $scheduled?->scheduled_date
                ?? CarbonImmutable::parse($d0)->addDays($day);
            $due = CarbonImmutable::parse($due)->startOfDay();
            $finalDue = !$finalDue || $due > $finalDue ? $due : $finalDue;
            if (in_array($day, $received, true) || $transferred || $stopped || !$verified || $noVaccine
                || $appointment?->status === 'cancelled' || $due >= $today) { continue; }
            $reminder = $appointment?->reminders->first();
            $overdue[] = ['dose' => 'Day '.$day, 'due_date' => $due->toDateString(),
                'days_overdue' => (int) $due->diffInDays($today),
                'schedule_source' => $appointment || $scheduled ? 'Recorded schedule' : 'Prescribed day from D0',
                'reminder_status' => $reminder ? $reminder->channel.': '.$reminder->status : 'No reminder recorded',
                'last_reminder' => $reminder?->created_at?->toDateTimeString()];
        }
        $eligible = $d0 && $verified && !$transferred && !$stopped && !$noVaccine && $finalDue && $finalDue <= $today;
        $outcome = $transferred ? 'Transferred' : ($stopped ? 'Discontinued / cancelled' : ($noVaccine ? 'No vaccine ordered'
            : (!$verified ? 'Unverified regimen' : (!$d0 ? 'Awaiting D0' : ($complete ? 'Completed' : (count($overdue) ? 'Overdue' : 'Ongoing'))))));
        $age = $case->patient->date_of_birth && $case->patient->date_of_birth <= $case->bite_date
            ? (int) $case->patient->date_of_birth->diffInYears($case->bite_date) : null;
        $referrals = [];
        if ($case->transferred_to_facility && $case->transferred_at && $case->transferred_at->toDateString() <= $today->toDateString()) {
            $referrals[] = ['destination' => $case->transferred_to_facility, 'reason' => $case->transfer_reason,
                'date' => $case->transferred_at->toDateString(), 'type' => 'Transfer', 'outcome' => 'Transferred out'];
        }
        foreach ($records->whereNull('dose_number') as $record) {
            if (trim((string) $record->referred_to) !== '') {
                $date = $record->consultation_date ?? $record->created_at;
                if ($date && $date->toDateString() <= $today->toDateString()) {
                    $referrals[] = ['destination' => $record->referred_to, 'reason' => $record->reason_for_referral,
                        'date' => $date->toDateString(), 'type' => 'Referral', 'outcome' => $record->outcome ?: 'Not recorded'];
                }
            }
        }
        return [
            'patient_id' => $case->patient_id, 'case_number' => $case->case_number,
            'patient' => trim($case->patient->first_name.' '.$case->patient->last_name),
            'contact' => $case->patient->contact_number, 'bite_date' => $case->bite_date->toDateString(),
            'category' => ['minor' => 'I', 'moderate' => 'II', 'severe' => 'III'][$case->severity] ?? 'Unknown',
            'animal_type' => ucfirst(strtolower(trim($case->animal_type ?? ''))) ?: 'Unknown',
            'ownership' => ucfirst($case->animal_status ?: 'unknown'),
            'observation' => ucfirst($case->animal_observation_status ?: 'unknown'),
            'barangay' => $case->location?->barangay ? trim($case->location->barangay).($case->location->municipality ? ', '.trim($case->location->municipality) : '') : 'Not recorded',
            'weekday' => $case->bite_date->format('D'), 'age_at_incident' => $age,
            'age_group' => $age === null ? 'Unknown' : ($age <= 12 ? 'Children (0–12)' : ($age <= 17 ? 'Adolescents (13–17)' : ($age <= 59 ? 'Adults (18–59)' : 'Seniors (60+)'))),
            'regimen' => $plan?->plan_type ? str_replace('_', ' ', $plan->plan_type) : 'Not recorded',
            'required_doses' => implode(', ', array_map(fn ($n) => 'D'.$n, $required)),
            'received_doses' => implode(', ', array_map(fn ($n) => 'D'.$n, $received)),
            'd0_date' => $d0, 'last_dose_date' => $doses->max('treatment_date')?->toDateString(),
            'completion_date' => $complete ? $doses->whereIn('dose_number', $required)->groupBy('dose_number')
                ->map(fn ($group) => $group->min('treatment_date'))->max()?->toDateString() : null,
            'delay_days' => $d0 && $d0 >= $case->bite_date->toDateString() ? (int) $case->bite_date->diffInDays(CarbonImmutable::parse($d0)) : null,
            'eligible' => (bool) $eligible, 'complete' => (bool) $complete, 'outcome' => $outcome,
            'risk_flag' => count($overdue) ? count($overdue).' overdue dose(s)' : ($outcome === 'Awaiting D0' ? 'Awaiting D0' : $outcome),
            'overdue' => $overdue, 'referrals' => $referrals,
        ];
    }

    private function completion(Collection $cohort): array
    {
        $eligible = $cohort->where('eligible', true);
        $completed = $eligible->where('complete', true)->count();
        return ['eligible' => $eligible->count(), 'completed' => $completed,
            'rate' => $eligible->isEmpty() ? null : round(100 * $completed / $eligible->count(), 1),
            'excluded' => $cohort->count() - $eligible->count()];
    }

    private function counts(Collection $rows, string $key, ?array $order = null): array
    {
        $counts = $rows->countBy($key);
        return $order ? collect($order)->map(fn ($label) => ['label' => $label, 'count' => $counts->get($label, 0)])->all()
            : $counts->sortDesc()->map(fn ($count, $label) => ['label' => $label, 'count' => $count])->values()->all();
    }
}
