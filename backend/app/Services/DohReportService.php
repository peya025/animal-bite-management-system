<?php

namespace App\Services;

use App\Models\BiteIncident;
use App\Models\Clinic;
use Carbon\Carbon;

class DohReportService
{
    /**
     * REPORT 1 — Rabies Exposure Registry (Weekly)
     * Matches Image 2 & 4 — DOH Rabies Exposure Registry form
     */
    public function getExposureRegistry(int $clinicId, ?string $fromDate = null, ?string $toDate = null, ?string $quarter = null, ?int $year = null, $user = null): array
    {
        $clinic = Clinic::find($clinicId);
        $from = $fromDate ? Carbon::parse($fromDate)->startOfDay() : now()->startOfQuarter();
        $to = $toDate ? Carbon::parse($toDate)->endOfDay() : now()->endOfQuarter();

        if ($from->gt($to)) {
            $temp = $from;
            $from = $to->copy()->startOfDay();
            $to = $temp->copy()->endOfDay();
        }

        $weeks = $this->generateWeekRanges($from, $to);
        $population = $clinic?->population ?? 70000;

        $rows = collect($weeks)->map(function ($week) use ($clinicId, $population) {
            $cases = BiteIncident::where('clinic_id', $clinicId)
                ->whereBetween('bite_date', [$week['start'], $week['end']])
                ->with(['patient', 'intake', 'treatmentRecords'])
                ->get();

            $total = $cases->count();
            $male = $cases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'male')->count();
            $female = $cases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'female')->count();

            $ageBelow15 = $cases->filter(fn($c) => $c->patient && $c->patient->age < 15)->count();
            $age15Above = $cases->filter(fn($c) => $c->patient && $c->patient->age >= 15)->count();

            $cat1 = $cases->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === 'I')->count();
            $cat2 = $cases->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === 'II')->count();
            $cat3 = $cases->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === 'III')->count();

            $tcv = $cases->filter(fn($c) => $c->treatmentRecords->count() > 0)->count();
            $hrig = $cases->filter(fn($c) => ($c->intake?->rig_type ?? $c->rig_type) === 'HRIG')->count();
            $erig = $cases->filter(fn($c) => ($c->intake?->rig_type ?? $c->rig_type) === 'ERIG')->count();

            $dog = $cases->filter(fn($c) => strtolower($c->intake?->animal_type ?? $c->animal_type ?? '') === 'dog')->count();
            $cat = $cases->filter(fn($c) => strtolower($c->intake?->animal_type ?? $c->animal_type ?? '') === 'cat')->count();
            $others = $cases->filter(fn($c) => !in_array(strtolower($c->intake?->animal_type ?? $c->animal_type ?? ''), ['dog', 'cat'], true))->count();

            return [
                'inclusive_dates' => $week['label'],
                'start_date' => $week['start'],
                'end_date' => $week['end'],
                'human_population' => $population,
                'male' => $male,
                'female' => $female,
                'total' => $total,
                'age_below_15' => $ageBelow15,
                'age_15_above' => $age15Above,
                'age_total' => $ageBelow15 + $age15Above,
                'cat_1' => $cat1,
                'cat_2' => $cat2,
                'cat_3' => $cat3,
                'cat_total' => $cat1 + $cat2 + $cat3,
                'cat_percentage' => $total > 0 ? '100%' : '0%',
                'no_hr' => 0,
                'tcv' => $tcv,
                'hrig' => $hrig,
                'erig' => $erig,
                'dog' => $dog,
                'cat' => $cat,
                'others' => $others,
                'animal_total' => $dog + $cat + $others,
                'pct_tcv' => $total > 0 ? round(($tcv / $total) * 100) . '%' : '0%',
                'pct_erig' => $total > 0 ? round(($erig / $total) * 100) . '%' : '0%',
            ];
        })->toArray();

        // Compute overall totals for table footer
        $totalCases = array_sum(array_column($rows, 'total'));
        $totalMale = array_sum(array_column($rows, 'male'));
        $totalFemale = array_sum(array_column($rows, 'female'));
        $totalAgeBelow15 = array_sum(array_column($rows, 'age_below_15'));
        $totalAge15Above = array_sum(array_column($rows, 'age_15_above'));
        $totalCat1 = array_sum(array_column($rows, 'cat_1'));
        $totalCat2 = array_sum(array_column($rows, 'cat_2'));
        $totalCat3 = array_sum(array_column($rows, 'cat_3'));
        $totalTcv = array_sum(array_column($rows, 'tcv'));
        $totalHrig = array_sum(array_column($rows, 'hrig'));
        $totalErig = array_sum(array_column($rows, 'erig'));
        $totalDog = array_sum(array_column($rows, 'dog'));
        $totalCat = array_sum(array_column($rows, 'cat'));
        $totalOthers = array_sum(array_column($rows, 'others'));

        $totals = [
            'inclusive_dates' => 'TOTAL',
            'human_population' => $population,
            'male' => $totalMale,
            'female' => $totalFemale,
            'total' => $totalCases,
            'age_below_15' => $totalAgeBelow15,
            'age_15_above' => $totalAge15Above,
            'age_total' => $totalAgeBelow15 + $totalAge15Above,
            'cat_1' => $totalCat1,
            'cat_2' => $totalCat2,
            'cat_3' => $totalCat3,
            'cat_total' => $totalCat1 + $totalCat2 + $totalCat3,
            'cat_percentage' => $totalCases > 0 ? '100%' : '0%',
            'no_hr' => 0,
            'tcv' => $totalTcv,
            'hrig' => $totalHrig,
            'erig' => $totalErig,
            'dog' => $totalDog,
            'cat' => $totalCat,
            'others' => $totalOthers,
            'animal_total' => $totalDog + $totalCat + $totalOthers,
            'pct_tcv' => $totalCases > 0 ? round(($totalTcv / $totalCases) * 100) . '%' : '0%',
            'pct_erig' => $totalCases > 0 ? round(($totalErig / $totalCases) * 100) . '%' : '0%',
        ];

        $quarterNumber = ceil($from->month / 3);
        $quarterName = ['1st', '2nd', '3rd', '4th'][$quarterNumber - 1] ?? ($quarterNumber . 'th');

        return [
            'report_type' => 'exposure_registry',
            'clinic' => $clinic?->name ?? 'TAGOLOAN ABTC',
            'municipality' => $clinic?->municipality ?? 'Tagoloan',
            'province' => $clinic?->province ?? 'Misamis Oriental',
            'quarter' => $quarter ?? $quarterName,
            'year' => $year ?? $from->year,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'data' => $rows,
            'totals' => $totals,
            'prepared_by' => $user?->name ?? 'MARITES L. BUENO RM,BSM',
            'prepared_designation' => 'MIDWIFE - IV ABTC STAFF',
            'noted_by' => $clinic?->health_officer_name ?? 'JENNIFER L. ADVINCULA MD',
            'noted_designation' => 'Municipal Health Officer',
            'date_signed' => now()->format('n/j/Y'),
        ];
    }

    /**
     * REPORT 2 — ABTC Monthly Report
     * Matches Image 1 — National Rabies Prevention and Control Program monthly form
     */
    public function getMonthlyReport(int $clinicId, ?string $monthStr = null, $user = null): array
    {
        $clinic = Clinic::find($clinicId);
        $month = $monthStr ? Carbon::parse($monthStr) : now();

        $cases = BiteIncident::where('clinic_id', $clinicId)
            ->whereYear('bite_date', $month->year)
            ->whereMonth('bite_date', $month->month)
            ->with(['patient', 'intake', 'treatmentRecords'])
            ->get();

        $male = $cases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'male')->count();
        $female = $cases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'female')->count();
        $givenPep = $cases->filter(fn($c) => $c->treatmentRecords->count() > 0)->count();

        $cat1 = $cases->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === 'I')->count();
        $cat2 = $cases->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === 'II')->count();
        $cat3 = $cases->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === 'III')->count();
        $totalCases = $cases->count();

        $completedCat1 = $this->getCompleted($cases, 'I');
        $completedCat2 = $this->getCompleted($cases, 'II');
        $completedCat3 = $this->getCompleted($cases, 'III');
        $totalCompleted = $completedCat1 + $completedCat2 + $completedCat3;

        $givenRig = $cases->filter(fn($c) => !empty($c->intake?->rig_type ?? $c->rig_type))->count();

        // Weekly breakdown rows for the month
        $weeks = $this->generateWeekRanges($month->copy()->startOfMonth(), $month->copy()->endOfMonth());
        $weeklyRows = collect($weeks)->map(function ($week) use ($clinicId) {
            $wCases = BiteIncident::where('clinic_id', $clinicId)
                ->whereBetween('bite_date', [$week['start'], $week['end']])
                ->with(['patient', 'intake', 'treatmentRecords'])
                ->get();

            $wMale = $wCases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'male')->count();
            $wFemale = $wCases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'female')->count();
            $wPep = $wCases->filter(fn($c) => $c->treatmentRecords->count() > 0)->count();

            $wCat1 = $wCases->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === 'I')->count();
            $wCat2 = $wCases->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === 'II')->count();
            $wCat3 = $wCases->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === 'III')->count();

            $wComp1 = $this->getCompleted($wCases, 'I');
            $wComp2 = $this->getCompleted($wCases, 'II');
            $wComp3 = $this->getCompleted($wCases, 'III');

            $wRig = $wCases->filter(fn($c) => !empty($c->intake?->rig_type ?? $c->rig_type))->count();

            return [
                'inclusive_dates' => $week['label'],
                'male' => $wMale,
                'female' => $wFemale,
                'given_pep' => $wPep,
                'cat_1' => $wCat1,
                'cat_2' => $wCat2,
                'cat_3' => $wCat3,
                'cat_total' => $wCat1 + $wCat2 + $wCat3,
                'completed_cat_1' => $wComp1,
                'completed_cat_2' => $wComp2,
                'completed_cat_3' => $wComp3,
                'completed_total' => $wComp1 + $wComp2 + $wComp3,
                'given_rig' => $wRig,
            ];
        })->toArray();

        $totals = [
            'inclusive_dates' => 'TOTAL',
            'male' => $male,
            'female' => $female,
            'given_pep' => $givenPep,
            'cat_1' => $cat1,
            'cat_2' => $cat2,
            'cat_3' => $cat3,
            'cat_total' => $totalCases,
            'completed_cat_1' => $completedCat1,
            'completed_cat_2' => $completedCat2,
            'completed_cat_3' => $completedCat3,
            'completed_total' => $totalCompleted,
            'given_rig' => $givenRig,
        ];

        return [
            'report_type' => 'monthly',
            'province' => $clinic?->province ?? 'MISAMIS ORIENTAL',
            'abtc' => $clinic?->name ?? 'RHU TAGOLOAN ABTC',
            'month' => $month->format('Y-m'),
            'month_label' => $month->format('F Y'),
            'male' => $male,
            'female' => $female,
            'given_pep' => $givenPep,
            'cat_1' => $cat1,
            'cat_2' => $cat2,
            'cat_3' => $cat3,
            'total_cases' => $totalCases,
            'completed_cat_1' => $completedCat1,
            'completed_cat_2' => $completedCat2,
            'completed_cat_3' => $completedCat3,
            'total_completed' => $totalCompleted,
            'given_rig' => $givenRig,
            'completion_rate' => $this->computeCompletionRate($cases),
            'rows' => $weeklyRows,
            'totals' => $totals,
            'prepared_by' => $user?->name ?? 'MARITES BUENO',
            'prepared_designation' => 'Midwife - ABTC Staff',
            'contact_no' => $clinic?->phone ?? $clinic?->contact_number ?? '(088) 890-4770',
            'noted_by' => $clinic?->health_officer_name ?? 'JENNIFER L. ADVINCULA MD',
            'noted_designation' => 'Municipal Health Officer',
            'date_signed' => now()->format('n/j/Y'),
        ];
    }

    /**
     * REPORT 3 — Cohort Report (Quarterly)
     * Matches Image 3 — Quarterly cohort by category with completion rate
     */
    public function getCohortReport(int $clinicId, ?int $yearParam = null, $user = null): array
    {
        $clinic = Clinic::find($clinicId);
        $year = (int) ($yearParam ?? now()->year);

        $quarters = [
            1 => [Carbon::create($year, 1, 1)->startOfDay(), Carbon::create($year, 3, 31)->endOfDay()],
            2 => [Carbon::create($year, 4, 1)->startOfDay(), Carbon::create($year, 6, 30)->endOfDay()],
            3 => [Carbon::create($year, 7, 1)->startOfDay(), Carbon::create($year, 9, 30)->endOfDay()],
            4 => [Carbon::create($year, 10, 1)->startOfDay(), Carbon::create($year, 12, 31)->endOfDay()],
        ];

        $result = [];
        $annualTotals = [
            'cat_I' => ['cases' => 0, 'given_pep' => 0, 'completed' => 0, 'given_rig' => 0],
            'cat_II' => ['cases' => 0, 'given_pep' => 0, 'completed' => 0, 'given_rig' => 0],
            'cat_III' => ['cases' => 0, 'given_pep' => 0, 'completed' => 0, 'given_rig' => 0],
            'total' => ['cases' => 0, 'given_pep' => 0, 'completed' => 0, 'given_rig' => 0],
        ];

        foreach ($quarters as $q => [$start, $end]) {
            $cases = BiteIncident::where('clinic_id', $clinicId)
                ->whereBetween('bite_date', [$start->toDateString(), $end->toDateString()])
                ->with(['intake', 'treatmentRecords', 'patient'])
                ->get();

            $qCasesTotal = 0;
            $qPepTotal = 0;
            $qCompletedTotal = 0;
            $qRigTotal = 0;

            foreach (['I', 'II', 'III'] as $cat) {
                $catCases = $cases->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === $cat);
                $catCasesCount = $catCases->count();
                $catPepCount = $catCases->filter(fn($c) => $c->treatmentRecords->count() > 0)->count();
                $catCompCount = $catCases->filter(fn($c) => $c->status === 'completed' || $c->patient?->has_completed_primary)->count();
                $catRigCount = $catCases->filter(fn($c) => !empty($c->intake?->rig_type ?? $c->rig_type))->count();

                $qCasesTotal += $catCasesCount;
                $qPepTotal += $catPepCount;
                $qCompletedTotal += $catCompCount;
                $qRigTotal += $catRigCount;

                $annualTotals["cat_{$cat}"]['cases'] += $catCasesCount;
                $annualTotals["cat_{$cat}"]['given_pep'] += $catPepCount;
                $annualTotals["cat_{$cat}"]['completed'] += $catCompCount;
                $annualTotals["cat_{$cat}"]['given_rig'] += $catRigCount;

                $result["q{$q}"]["cat_{$cat}"] = [
                    'cases' => $catCasesCount,
                    'given_pep' => $catPepCount,
                    'completed' => $catCompCount,
                    'given_rig' => $catRigCount,
                    'completion_rate' => $catCasesCount > 0 ? round(($catCompCount / $catCasesCount) * 100) . '%' : '0%',
                ];
            }

            $annualTotals['total']['cases'] += $qCasesTotal;
            $annualTotals['total']['given_pep'] += $qPepTotal;
            $annualTotals['total']['completed'] += $qCompletedTotal;
            $annualTotals['total']['given_rig'] += $qRigTotal;

            $result["q{$q}"]['total'] = [
                'cases' => $qCasesTotal,
                'given_pep' => $qPepTotal,
                'completed' => $qCompletedTotal,
                'given_rig' => $qRigTotal,
                'completion_rate' => $qCasesTotal > 0 ? round(($qCompletedTotal / $qCasesTotal) * 100) . '%' : '0%',
            ];
        }

        // Annual completion rates
        foreach (['cat_I', 'cat_II', 'cat_III', 'total'] as $key) {
            $c = $annualTotals[$key]['cases'];
            $comp = $annualTotals[$key]['completed'];
            $annualTotals[$key]['completion_rate'] = $c > 0 ? round(($comp / $c) * 100) . '%' : '0%';
        }
        $result['annual'] = $annualTotals;

        return [
            'report_type' => 'cohort',
            'province' => $clinic?->province ?? 'MISAMIS ORIENTAL',
            'abtc' => $clinic?->name ?? 'TAGOLOAN',
            'year' => $year,
            'quarters' => $result,
            'prepared_by' => $user?->name ?? 'MARITES BUENO',
            'prepared_designation' => 'Midwife - ABTC Staff',
            'noted_by' => $clinic?->health_officer_name ?? 'JENNIFER ADVINCULA, MD',
            'noted_designation' => 'Municipal Health Officer',
            'date_signed' => now()->format('n/j/Y'),
        ];
    }

    public function generateWeekRanges(Carbon $from, Carbon $to): array
    {
        $weeks = [];
        $curr = $from->copy()->startOfWeek(Carbon::MONDAY);
        while ($curr->lte($to)) {
            $start = $curr->copy();
            $end = $curr->copy()->endOfWeek(Carbon::SUNDAY);
            $weeks[] = [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'label' => $start->format('n/j/Y'),
            ];
            $curr->addWeek();
        }
        return $weeks;
    }

    private function getCompleted($cases, string $category): int
    {
        return $cases
            ->filter(fn($c) => ($c->intake?->bite_category ?? $c->bite_category) === $category)
            ->filter(fn($c) => $c->status === 'completed' || $c->patient?->has_completed_primary)
            ->count();
    }

    private function computeCompletionRate($cases): string
    {
        $total = $cases->count();
        if ($total === 0) return '0%';
        $completed = $cases->filter(fn($c) => $c->status === 'completed' || $c->patient?->has_completed_primary)->count();
        return round(($completed / $total) * 100) . '%';
    }
}
