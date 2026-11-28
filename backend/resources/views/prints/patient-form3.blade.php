<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOH iCLINICSYS - ANIMAL BITE TREATMENT &amp; VACCINATION RECORD (FORM 3) - {{ $patient->patient_number }}</title>
    <style>
        @page {
            size: auto;
            margin: 10mm 12mm;
        }
        @media print {
            .no-print {
                display: none !important;
            }
            html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff;
            }
            .page-container {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                box-shadow: none !important;
            }
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10.5px;
            color: #000000;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            line-height: 1.25;
        }
        .page-container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #000000;
            padding: 8px 10px;
        }
        .no-print-bar {
            text-align: right;
            padding: 8px 15px;
            background-color: #f3f4f6;
            border-bottom: 1px solid #d1d5db;
            margin-bottom: 10px;
        }
        .btn-print {
            background-color: #059669;
            color: #ffffff;
            border: none;
            padding: 6px 16px;
            font-size: 13px;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
        }
        .header-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
        }
        .header-grid td {
            border: 1.5px solid #000000;
            padding: 6px 8px;
            vertical-align: middle;
        }
        .doh-brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .doh-logo-img {
            width: 52px;
            height: 52px;
            object-fit: contain;
        }
        .doh-text {
            font-size: 9.5px;
            line-height: 1.25;
        }
        .doh-text strong {
            font-size: 11.5px;
            display: block;
            margin: 1px 0;
        }
        .title-banner {
            text-align: center;
            padding: 6px 4px 8px;
        }
        .title-banner h2 {
            margin: 0;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .title-banner h1 {
            margin: 3px 0;
            font-size: 15.5px;
            font-weight: 800;
            letter-spacing: 1px;
        }
        .instructions-text {
            font-size: 9px;
            font-style: italic;
            margin-top: 3px;
            color: #222222;
        }
        .section-header-bar {
            background-color: #000000;
            color: #ffffff;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            padding: 4px 8px;
            letter-spacing: 0.5px;
            margin-top: 8px;
            margin-bottom: 4px;
            page-break-inside: avoid;
        }
        .form-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
        }
        .form-table td, .form-table th {
            border: 1.5px solid #000000;
            padding: 4px 7px;
            vertical-align: top;
        }
        .form-table th {
            background-color: #f0f0f0;
            font-size: 9px;
            text-transform: uppercase;
            text-align: left;
            font-weight: bold;
        }
        .lbl {
            font-weight: bold;
            font-size: 9.5px;
            color: #000000;
            display: block;
            margin-bottom: 2px;
            text-transform: uppercase;
        }
        .sub-lbl {
            font-size: 9px;
            font-weight: normal;
            color: #333333;
            font-style: italic;
            text-transform: none;
        }
        .val {
            font-size: 11px;
            font-weight: bold;
            color: #000000;
            white-space: pre-line;
        }
        .chk-label {
            display: inline-flex;
            align-items: center;
            margin-right: 12px;
            font-size: 10px;
            white-space: nowrap;
        }
        .dose-table td {
            font-size: 10px;
            padding: 4px 6px;
        }
        .sig-block {
            margin-top: 24px;
            width: 100%;
            border-collapse: collapse;
            page-break-inside: avoid;
        }
        .sig-block td {
            text-align: center;
            vertical-align: bottom;
            padding: 0 15px;
        }
        .sig-name {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 4px;
            min-height: 16px;
        }
        .sig-line {
            border-top: 1.5px solid #000000;
            padding-top: 4px;
            font-weight: bold;
            font-size: 9.5px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>

    {{-- Non-printable print toolbar --}}
    <div class="no-print-bar no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Print Form 3 Record</button>
    </div>

    @php
        $clinic = $patient->clinic ?? \App\Models\Clinic::first();
        $details = $patient->details;
        $inc = $incident ?? null;
        $card = $treatmentCard ?? null;
        $cx = $consultation ?? null;
        $doses = $vaccineDoses ?? collect();
        $prophylaxis = $prophylaxisRecords ?? collect();

        $gender = strtolower($patient->gender ?? $patient->sex ?? '');
        $exposureCategory = strtoupper((string) ($inc?->exposure_category ?? $card?->exposure_category ?? ''));
        $animalStatus = strtolower((string) ($inc?->animal_status ?? ''));

        $fmtDate = function($d) {
            if (!$d) return '';
            try { return \Carbon\Carbon::parse($d)->format('M d, Y'); } catch (\Throwable $e) { return (string) $d; }
        };

        $fmtLabel = function($v) {
            if (!$v) return '';
            return ucwords(str_replace('_', ' ', (string) $v));
        };

        $chkBox = function($isChecked) {
            if ($isChecked) {
                return '<svg width="13" height="13" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px; display: inline-block;">
                    <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#000000" stroke="#000000" stroke-width="1.5"/>
                    <path d="M4 8.5L6.5 11L12.5 4.5" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>';
            }
            return '<svg width="13" height="13" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px; display: inline-block;">
                <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#ffffff" stroke="#000000" stroke-width="1.5"/>
            </svg>';
        };

        $fullName = trim(implode(' ', array_filter([
            $patient->last_name ? strtoupper($patient->last_name) . ',' : '',
            strtoupper($patient->first_name ?? ''),
            strtoupper($patient->middle_name ?? ''),
            strtoupper($patient->suffix ?? ''),
        ])));

        $philhealthNo = $details?->philhealth_no ?? '';
        if (!$philhealthNo && $patient->relationLoaded('memberships')) {
            $phMem = $patient->memberships->firstWhere('membership_type', 'philhealth');
            $philhealthNo = $phMem?->membership_id_no ?? '';
        }

        $modeOfExposure = $card?->mode_of_exposure ?: ($inc?->exposure_mode ?: ($inc?->exposure_type ?? ''));
        $bodyPart = $card?->body_part_exposed ?: ($inc?->body_part_exposed ?? '');
        $animalRaw = $card?->animal_type ?: ($inc?->animal_type ?? '');
        $animalOther = $card?->animal_type_others ?: ($inc?->animal_type_others ?? '');
        $animalLabel = strtolower((string) $animalRaw) === 'other' && $animalOther
            ? $animalOther
            : $fmtLabel($animalRaw);

        $firstDoseDate = $doses->first(fn ($d) => !empty($d->treatment_date))?->treatment_date;
        $lastNurse = $doses->reverse()->first(fn ($d) => !empty($d->administered_by))?->administered_by
            ?: ($prophylaxis->reverse()->first(fn ($p) => !empty($p->administered_by))?->administered_by ?? '');
    @endphp

    <div class="page-container">

        {{-- Top Header Grid matching Form 1 --}}
        <table class="header-grid">
            <tr>
                <td style="width: 52%;">
                    <div class="doh-brand" style="justify-content: space-between;">
                        @include('prints.partials.logo', ['url' => $clinic?->left_print_logo_url ?? null, 'side' => 'Left', 'size' => 52, 'spacerSize' => 55, 'class' => 'doh-logo-img'])
                        <div class="doh-text" style="text-align: center; flex: 1; padding: 0 6px;">
                            Republic of the Philippines<br>
                            <strong>{{ strtoupper($clinic?->name ?? 'Department of Health') }}</strong>
                            {{ $clinic?->municipality ? $clinic->municipality . ', ' : '' }}{{ $clinic?->province ?? 'Misamis Oriental' }}
                        </div>
                        @include('prints.partials.logo', ['url' => $clinic?->right_print_logo_url ?? null, 'side' => 'Right', 'size' => 52, 'spacerSize' => 55, 'class' => 'doh-logo-img'])
                    </div>
                </td>
                <td style="width: 28%;">
                    <span class="lbl">Family Serial Number</span>
                    <span class="val" style="font-family: monospace; font-size: 13px;">{{ $patient->patient_number }}</span>
                </td>
                <td style="width: 24%;">
                    <span class="lbl">Facility Code</span>
                    <span class="val">{{ $clinic?->code ?? '104324' }}</span>
                </td>
            </tr>
        </table>

        {{-- Title Banner --}}
        <div class="title-banner">
            <h2>Integrated Clinic Information System (iCLINICSYS)</h2>
            <h1>ANIMAL BITE TREATMENT &amp; VACCINATION RECORD (FORM 3)</h1>
            <div class="instructions-text">
                Nurse Exposure Documentation, Rabies Vaccination &amp; Prophylaxis Administration Record
                @if($inc?->case_number)
                    &nbsp;•&nbsp; Case No.: <strong>{{ $inc->case_number }}</strong>
                @endif
            </div>
        </div>

        {{-- SECTION I: PATIENT INFORMATION --}}
        <div class="section-header-bar">I. PATIENT INFORMATION (IMPORMASYON NG PASYENTE)</div>
        <table class="form-table">
            <tr>
                <td style="width: 58%;">
                    <span class="lbl">Patient Name <span class="sub-lbl">(Apelyido, Pangalan, Gitnang Pangalan)</span></span>
                    <span class="val">{{ $fullName ?: '—' }}</span>
                </td>
                <td style="width: 18%;">
                    <span class="lbl">Age <span class="sub-lbl">(Edad)</span></span>
                    <span class="val">{{ $patient->age !== null ? $patient->age . ' yrs' : '—' }}</span>
                </td>
                <td style="width: 24%;">
                    <span class="lbl">Sex <span class="sub-lbl">(Kasarian)</span></span>
                    <span class="chk-label">{!! $chkBox($gender === 'female') !!} Female</span>
                    <span class="chk-label">{!! $chkBox($gender === 'male') !!} Male</span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="lbl">Residential Address <span class="sub-lbl">(Tirahan)</span></span>
                    <span class="val">{{ $patient->address ?: '—' }}</span>
                </td>
                <td>
                    <span class="lbl">Birth Date</span>
                    <span class="val">{{ $patient->date_of_birth ? \Carbon\Carbon::parse($patient->date_of_birth)->format('m/d/Y') : '—' }}</span>
                </td>
                <td>
                    <span class="lbl">Contact Number</span>
                    <span class="val">{{ $patient->contact_number ?: '—' }}</span>
                </td>
            </tr>
            @if(!empty($card?->registry_no) || !empty($card?->hospital_no) || !empty($philhealthNo))
                <tr>
                    <td>
                        <span class="lbl">Registry No.</span>
                        <span class="val">{{ $card?->registry_no ?: '—' }}</span>
                    </td>
                    <td>
                        <span class="lbl">Hospital No.</span>
                        <span class="val">{{ $card?->hospital_no ?: '—' }}</span>
                    </td>
                    <td>
                        <span class="lbl">PhilHealth PIN</span>
                        <span class="val" style="font-family: monospace;">{{ $philhealthNo ?: '—' }}</span>
                    </td>
                </tr>
            @endif
        </table>

        {{-- SECTION II: EXPOSURE & ANIMAL DETAILS --}}
        <div class="section-header-bar">II. EXPOSURE &amp; ANIMAL DETAILS</div>
        <table class="form-table">
            <tr>
                <td style="width: 26%;">
                    <span class="lbl">Date of Exposure</span>
                    <span class="val">{{ $inc?->bite_date ? $fmtDate($inc->bite_date) : '—' }}</span>
                </td>
                <td style="width: 26%;">
                    <span class="lbl">Date Treatment Started</span>
                    <span class="val">{{ $firstDoseDate ? $fmtDate($firstDoseDate) : ($card?->card_date ? $fmtDate($card->card_date) : '—') }}</span>
                </td>
                <td style="width: 48%;">
                    <span class="lbl">Exposure Category</span>
                    <span class="chk-label">{!! $chkBox($exposureCategory === 'I' || $exposureCategory === '1') !!} Category I</span>
                    <span class="chk-label">{!! $chkBox($exposureCategory === 'II' || $exposureCategory === '2') !!} Category II</span>
                    <span class="chk-label">{!! $chkBox($exposureCategory === 'III' || $exposureCategory === '3') !!} Category III</span>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <span class="lbl">Mode of Exposure</span>
                    <span class="val">{{ $modeOfExposure ? $fmtLabel($modeOfExposure) : '—' }}</span>
                </td>
                <td>
                    <span class="lbl">Body Part Affected</span>
                    <span class="val">{{ $bodyPart ? $fmtLabel($bodyPart) : '—' }}</span>
                </td>
            </tr>
            @if(!empty($inc?->bite_place) || !empty($card?->icd10_code))
                <tr>
                    <td colspan="2">
                        <span class="lbl">Place of Exposure</span>
                        <span class="val">{{ $inc?->bite_place ?: '—' }}</span>
                    </td>
                    <td>
                        <span class="lbl">ICD-10 Code</span>
                        <span class="val" style="font-family: monospace;">{{ $card?->icd10_code ?: '—' }}</span>
                    </td>
                </tr>
            @endif
            <tr>
                <td>
                    <span class="lbl">Animal Species</span>
                    <span class="val">{{ $animalLabel ?: '—' }}</span>
                </td>
                <td colspan="2">
                    <span class="lbl">Animal Status</span>
                    <span class="chk-label">{!! $chkBox($animalStatus === 'owned' || $animalStatus === 'pet' || $animalStatus === 'domestic') !!} Owned</span>
                    <span class="chk-label">{!! $chkBox($animalStatus === 'stray') !!} Stray</span>
                    <span class="chk-label">{!! $chkBox($animalStatus === 'unknown' || $animalStatus === 'wild') !!} Unknown / Other</span>
                    @if($inc?->animal_observation_status)
                        &nbsp;•&nbsp; <strong>Condition:</strong> {{ $fmtLabel($inc->animal_observation_status) }}
                    @endif
                </td>
            </tr>
            @if(!empty($inc?->wound_description) || $inc?->site_washed !== null)
                <tr>
                    <td colspan="2">
                        <span class="lbl">Wound Description</span>
                        <span class="val">{{ $inc?->wound_description ?: '—' }}</span>
                    </td>
                    <td>
                        <span class="lbl">Wound Washed?</span>
                        <span class="chk-label">{!! $chkBox($inc?->site_washed === true) !!} Yes</span>
                        <span class="chk-label">{!! $chkBox($inc?->site_washed === false) !!} No</span>
                    </td>
                </tr>
            @endif
            @if($card && ($card->past_bite_history !== null || !empty($card->past_bite_dates)))
                <tr>
                    <td>
                        <span class="lbl">Past History of Bite?</span>
                        <span class="chk-label">{!! $chkBox($card->past_bite_history === true) !!} Yes</span>
                        <span class="chk-label">{!! $chkBox($card->past_bite_history === false) !!} No</span>
                    </td>
                    <td>
                        <span class="lbl">Past Bite Date(s)</span>
                        <span class="val">{{ $card->past_bite_dates ?: '—' }}</span>
                    </td>
                    <td>
                        <span class="lbl">Previous PEP Completed?</span>
                        <span class="chk-label">{!! $chkBox($card->past_pep_completed === true) !!} Yes</span>
                        <span class="chk-label">{!! $chkBox($card->past_pep_completed === false) !!} No</span>
                    </td>
                </tr>
            @endif
        </table>

        {{-- SECTION III: RABIES VACCINATION ADMINISTRATION --}}
        <div class="section-header-bar">III. RABIES VACCINATION ADMINISTRATION SCHEDULE</div>
        <table class="form-table dose-table">
            <thead>
                <tr>
                    <th style="width: 10%;">Day / Dose</th>
                    <th style="width: 14%;">Date Given</th>
                    <th style="width: 18%;">Vaccine Brand</th>
                    <th style="width: 14%;">Route &amp; Site</th>
                    <th style="width: 9%;">Dosage</th>
                    <th style="width: 14%;">Batch / Lot No.</th>
                    <th style="width: 13%;">Administered By</th>
                    <th style="width: 8%;">Status</th>
                </tr>
            </thead>
            <tbody>
                @forelse($doses as $dose)
                    <tr>
                        <td><strong>Day {{ $dose->dose_number }}</strong></td>
                        <td>{{ $dose->treatment_date ? $fmtDate($dose->treatment_date) : ($dose->scheduled_date ? 'Sched: ' . $fmtDate($dose->scheduled_date) : '—') }}</td>
                        <td>{{ $dose->vaccine_brand ?: ($dose->vaccine_generic ?: '—') }}</td>
                        <td>{{ trim(implode(' / ', array_filter([$dose->route, $dose->injection_site]))) ?: '—' }}</td>
                        <td>{{ $dose->dosage_ml ? $dose->dosage_ml . ' mL' : '—' }}</td>
                        <td style="font-family: monospace;">{{ $dose->batch_no ?: '—' }}</td>
                        <td>{{ $dose->administered_by ?: '—' }}</td>
                        <td>{{ $fmtLabel($dose->status ?: ($dose->treatment_date ? 'completed' : 'scheduled')) }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="8" style="text-align: center; font-style: italic; color: #444;">
                            No rabies vaccination doses recorded yet for this episode.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        {{-- SECTION IV: PROPHYLAXIS ADMINISTRATION (TT / ATS / RIG) — only if recorded --}}
        @if($prophylaxis->isNotEmpty())
            <div class="section-header-bar">IV. PROPHYLAXIS ADMINISTRATION (TT / ATS / RIG)</div>
            <table class="form-table dose-table">
                <thead>
                    <tr>
                        <th style="width: 24%;">Medication / Product</th>
                        <th style="width: 14%;">Date Given</th>
                        <th style="width: 16%;">Route &amp; Site</th>
                        <th style="width: 12%;">Dosage</th>
                        <th style="width: 14%;">Batch / Lot No.</th>
                        <th style="width: 12%;">Administered By</th>
                        <th style="width: 8%;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($prophylaxis as $proph)
                        <tr>
                            <td><strong>{{ $proph->medication_given ?: ($proph->vaccine_brand ?: 'Prophylaxis') }}</strong></td>
                            <td>{{ $proph->treatment_date ? $fmtDate($proph->treatment_date) : '—' }}</td>
                            <td>{{ trim(implode(' / ', array_filter([$proph->route, $proph->injection_site]))) ?: '—' }}</td>
                            <td>
                                @if($proph->dose_iu)
                                    {{ $proph->dose_iu }} IU
                                @elseif($proph->dosage_ml)
                                    {{ $proph->dosage_ml }} mL
                                @else
                                    —
                                @endif
                            </td>
                            <td style="font-family: monospace;">{{ $proph->batch_no ?: '—' }}</td>
                            <td>{{ $proph->administered_by ?: '—' }}</td>
                            <td>{{ $fmtLabel($proph->status ?: 'completed') }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        {{-- Signatures --}}
        <table class="sig-block">
            <tr>
                <td style="width: 45%;">
                    <div class="sig-name">{{ $lastNurse }}</div>
                    <div class="sig-line">
                        ADMINISTERING NURSE / ABTC STAFF<br>
                        LAGDA NG NARS / PETSA
                    </div>
                </td>
                <td style="width: 10%;"></td>
                <td style="width: 45%;">
                    <div class="sig-name"></div>
                    <div class="sig-line">
                        SIGNATURE OF PATIENT / GUARDIAN<br>
                        PIRMA NG PASYENTE / PETSA
                    </div>
                </td>
            </tr>
        </table>

    </div>

</body>
</html>
