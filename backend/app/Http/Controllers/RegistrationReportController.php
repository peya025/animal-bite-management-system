<?php

namespace App\Http\Controllers;

use App\Services\RegistrationReportService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RegistrationReportController extends Controller
{
    private const REPORTS = [
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

    public function index(Request $request, RegistrationReportService $service)
    {
        // Never accept a clinic selector from the client for registration reports.
        $clinicId = $request->user()->clinic_id;
        abort_unless($clinicId, 403, 'A clinic assignment is required to view reports.');
        $input = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from', 'before_or_equal:today'],
            'category' => ['sometimes', Rule::in(['ALL', 'I', 'II', 'III'])],
            'report' => ['sometimes', Rule::in(array_keys(self::REPORTS))],
            'format' => ['sometimes', Rule::in(['json', 'csv', 'print'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $report = $input['report'] ?? 'summary';
        $format = $input['format'] ?? 'json';
        $result = $service->build((int) $clinicId, $input['from'], $input['to'], $input['category'] ?? 'ALL');
        [$title, $columns] = self::REPORTS[$report];
        $rows = $result['reports'][$report]->map(fn ($row) => collect($columns)->map(fn ($label, $key) => $row[$key] ?? null)->all())->values();
        unset($result['reports']);
        $meta = [
            'title' => $title, 'clinic' => $request->user()->clinic?->name,
            'prepared_by' => $request->user()->name, 'generated_at' => now()->toIso8601String(),
            'basis' => match ($report) {
                'summary' => 'Incident counts use the selected incident dates; PEP outcomes use D0 dates in the selected period. Current follow-up counts cover all incident dates.',
                'followup', 'awaiting' => 'Current action list as of '.$result['period']['as_of'].', all incident dates; category filter applies.',
                'pep' => 'Courses with D0 in the selected period; outcomes observed as of '.$result['period']['as_of'].'.',
                default => 'Incidents dated in the selected period; referral outcomes observed as of '.$result['period']['as_of'].'.',
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
                        return preg_match('/^[\s]*[=+@-]/u', $value) ? "'".$value : $value;
                    }, $values), ',', '"', '');
                };
                $write([$meta['title']]);
                $write(['Clinic', $meta['clinic']]);
                $write(['Period', $result['period']['from'].' to '.$result['period']['to'], 'Category', $result['period']['category']]);
                $write(['Prepared by', $meta['prepared_by'], 'Generated at', $meta['generated_at']]);
                $write(['Basis', $meta['basis']]);
                foreach ($meta['notes'] as $note) { $write(['Definition', $note]); }
                $write(array_values($columns));
                foreach ($rows as $row) { $write(array_values($row)); }
                fclose($stream);
            }, 'registration-'.$report.'-'.$input['from'].'-'.$input['to'].'.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'no-store']);
        }
        $perPage = (int) ($input['per_page'] ?? 20);
        $lastPage = max(1, (int) ceil($rows->count() / $perPage));
        $page = min((int) ($input['page'] ?? 1), $lastPage);
        $result['meta'] = $meta;
        $result['records'] = ['columns' => $columns, 'rows' => $format === 'print' ? $rows : $rows->forPage($page, $perPage)->values(),
            'total' => $rows->count(), 'page' => $page, 'last_page' => $lastPage];
        return response()->json($result)->header('Cache-Control', 'no-store');
    }
}
