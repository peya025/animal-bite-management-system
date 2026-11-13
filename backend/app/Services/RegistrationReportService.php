<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\Response;

class RegistrationReportService
{
    public const REPORTS = [
        'summary' => ['Clinic Summary', ['metric' => 'Metric', 'value' => 'Value']],
        'pep' => ['PEP Treatment Outcomes', ['case_number' => 'Case no.', 'patient' => 'Patient', 'regimen' => 'Regimen',
            'd0_date' => 'D0 date', 'required_doses' => 'Required', 'received_doses' => 'Received',
            'completion_date' => 'Completed on', 'outcome' => 'Outcome']],
        'followup' => ['Overdue Doses & Follow-up', ['case_number' => 'Case no.', 'patient' => 'Patient', 'contact' => 'Contact',
            'dose' => 'Dose', 'due_date' => 'Due date', 'days_overdue' => 'Days overdue', 'last_dose_date' => 'Last dose',
            'schedule_source' => 'Schedule basis', 'reminder_status' => 'Last reminder status', 'last_reminder' => 'Last reminder']],
        'awaiting' => ['Awaiting First Dose', ['case_number' => 'Case no.', 'patient' => 'Patient', 'contact' => 'Contact',
            'category' => 'Category', 'regimen' => 'Regimen', 'bite_date' => 'Incident date', 'outcome' => 'Outcome']],
        'surveillance' => ['Bite Surveillance', ['case_number' => 'Case no.', 'patient' => 'Patient', 'category' => 'Category',
            'animal_type' => 'Animal', 'ownership' => 'Ownership', 'barangay' => 'Incident barangay',
            'age_at_incident' => 'Age at incident', 'risk_flag' => 'Current follow-up status', 'bite_date' => 'Incident date']],
        'referrals' => ['Referrals & Transfers', ['case_number' => 'Case no.', 'patient' => 'Patient', 'category' => 'Category',
            'type' => 'Type', 'destination' => 'Destination', 'reason' => 'Reason', 'date' => 'Referral / transfer date', 'outcome' => 'Recorded outcome']],
    ];
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
        $doseFunnel = $cohort->where('dose_funnel_eligible', true);
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
            'dose_funnel' => ['started' => $doseFunnel->count(),
                'followup' => $doseFunnel->where('followup_received', true)->count(),
                'completed' => $doseFunnel->where('complete', true)->count()],
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
            if (TreatmentRecord::isExternalReferralDestination($record->referred_to)) {
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
            'dose_funnel_eligible' => (bool) ($d0 && $verified && count($required) > 1 && !$transferred && !$stopped && !$noVaccine),
            'followup_received' => count(array_intersect(array_filter($required, fn ($day) => $day > 0), $received)) > 0,
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

    /**
     * Generate paginated JSON response, print view JSON, or streamed CSV download.
     */
    public function generateReportResponse(User $user, array $input): Response
    {
        $clinicId = (int) $user->clinic_id;
        $report = $input['report'] ?? 'summary';
        $format = $input['format'] ?? 'json';

        $result = $this->build($clinicId, $input['from'], $input['to'], $input['category'] ?? 'ALL');
        [$title, $columns] = self::REPORTS[$report];
        $rows = $result['reports'][$report]->map(fn ($row) => collect($columns)->map(fn ($label, $key) => $row[$key] ?? null)->all())->values();
        unset($result['reports']);

        $meta = [
            'title'        => $title,
            'clinic'       => $user->clinic?->name,
            'prepared_by'  => $user->name,
            'generated_at' => now()->toIso8601String(),
            'basis'        => match ($report) {
                'summary'              => 'Incident counts use the selected incident dates; PEP outcomes use D0 dates in the selected period. Current follow-up counts cover all incident dates.',
                'followup', 'awaiting' => 'Current action list as of ' . $result['period']['as_of'] . ', all incident dates; category filter applies.',
                'pep'                  => 'Courses with D0 in the selected period; outcomes observed as of ' . $result['period']['as_of'] . '.',
                default                => 'Incidents dated in the selected period; referral outcomes observed as of ' . $result['period']['as_of'] . '.',
            },
            'notes' => [
                'PEP completion uses distinct prescribed dose days with non-voided completed administrations. Only courses whose final scheduled day is due are eligible; transferred, cancelled, no-vaccine and unverified courses are excluded.',
                'Both D0 cohorts are observed as of today. Calendar-day delay is not an hourly measure or a clinical compliance rating.',
                'Overdue is an operational follow-up signal, not confirmed loss to follow-up. Reminder delivery status is not a patient contact outcome.',
                'Surveillance counts bite episodes, not unique patients. Barangays are recorded incident locations; unknown locations are not replaced with home addresses.',
            ],
        ];

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($meta, $result, $columns, $rows) {
                $stream = fopen('php://output', 'w');
                fwrite($stream, "\xEF\xBB\xBF");
                $write = function (array $values) use ($stream) {
                    fputcsv($stream, array_map(function ($value) {
                        $value = $value === null ? 'Not available' : (string) $value;
                        // Protect spreadsheet users from formulas in patient-entered fields.
                        return preg_match('/^[\s]*[=+@-]/u', $value) ? "'" . $value : $value;
                    }, $values), ',', '"', '');
                };
                $write([$meta['title']]);
                $write(['Clinic', $meta['clinic']]);
                $write(['Period', $result['period']['from'] . ' to ' . $result['period']['to'], 'Category', $result['period']['category']]);
                $write(['Prepared by', $meta['prepared_by'], 'Generated at', $meta['generated_at']]);
                $write(['Basis', $meta['basis']]);
                foreach ($meta['notes'] as $note) {
                    $write(['Definition', $note]);
                }
                $write(array_values($columns));
                foreach ($rows as $row) {
                    $write(array_values($row));
                }
                fclose($stream);
            }, 'registration-' . $report . '-' . $input['from'] . '-' . $input['to'] . '.csv', [
                'Content-Type'  => 'text/csv; charset=UTF-8',
                'Cache-Control' => 'no-store',
            ]);
        }

        $perPage = (int) ($input['per_page'] ?? 20);
        $lastPage = max(1, (int) ceil($rows->count() / $perPage));
        $page = min((int) ($input['page'] ?? 1), $lastPage);
        $result['meta'] = $meta;
        $result['records'] = [
            'columns'   => $columns,
            'rows'      => $format === 'print' ? $rows : $rows->forPage($page, $perPage)->values(),
            'total'     => $rows->count(),
            'page'      => $page,
            'last_page' => $lastPage,
        ];

        return response()->json($result)->header('Cache-Control', 'no-store');
    }
}
