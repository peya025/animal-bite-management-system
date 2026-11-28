<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOH iCLINICSYS - INDIVIDUAL TREATMENT RECORD (FORM 2) - {{ $patient->patient_number }}</title>
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
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 1.2px;
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
            font-size: 9.5px;
            text-transform: uppercase;
            text-align: left;
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
            margin-right: 14px;
            font-size: 10px;
            white-space: nowrap;
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
        <button class="btn-print" onclick="window.print()">🖨️ Print Form 2 Record</button>
    </div>

    @php
        $clinic = $patient->clinic ?? \App\Models\Clinic::first();
        $details = $patient->details;
        $cx = $consultation ?? null;
        $inc = $incident ?? null;
        $plan = $treatmentPlan ?? null;
        $pOrders = is_array($cx?->prophylaxis_orders ?? null) ? $cx->prophylaxis_orders : [];

        $gender = strtolower($patient->gender ?? $patient->sex ?? '');
        $modeTx = strtolower($cx->mode_of_transaction ?? '');
        $natureVisit = strtolower($cx->nature_of_visit ?? '');
        $exposureCategory = strtoupper((string) ($pOrders['consultation_exposure_category'] ?? $inc?->exposure_category ?? ''));

        $fmtDate = function($d) {
            if (!$d) return '';
            try { return \Carbon\Carbon::parse($d)->format('F d, Y'); } catch (\Throwable $e) { return (string) $d; }
        };

        $fmtTime = function($t) {
            if (!$t) return '';
            if (preg_match('/(AM|PM)/i', (string) $t)) return (string) $t;
            try { return \Carbon\Carbon::createFromFormat('H:i', substr((string) $t, 0, 5))->format('h:i A'); } catch (\Throwable $e) { return (string) $t; }
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

        $consultDate   = $cx ? $fmtDate($cx->consultation_date) : '';
        $consultTime   = $cx ? $fmtTime($cx->consultation_time ?? '') : '';
        $bp            = $cx->blood_pressure ?? '';
        $temperature   = $cx->temperature ?? '';
        $height        = $cx->height ?? '';
        $weight        = $cx->weight ?? '';
        $providerName  = $cx->provider_name ?: ($cx->attending_provider ?? '');
        $referredFrom  = $cx->referred_from ?: ($cx->referred_by ?: ($inc->referred_from ?? ''));
        $referredTo    = $cx->referred_to ?: ($inc->transferred_to_facility ?? '');
        $referralReason = $cx->reason_for_referral ?: ($inc->transfer_reason ?? '');

        $planTypeRaw = $pOrders['consultation_treatment_plan'] ?? $plan?->plan_type ?? '';
        $planLabels = [
            'full_pep'   => 'Full PEP Schedule (Day 0, 3, 7, 28)',
            'booster'    => 'Booster Schedule (Day 0, 3)',
            'no_vaccine' => 'No Rabies Vaccine Indicated (Category I)',
            'continue'   => 'Continue Existing Schedule',
        ];
        $planLabel = $planLabels[strtolower((string) $planTypeRaw)] ?? $fmtLabel($planTypeRaw);

        $tetanusSummaryParts = array_filter([
            !empty($pOrders['tetanus_vaccine']) ? 'TT: ' . $pOrders['tetanus_vaccine'] : null,
            !empty($pOrders['tetanus_passive']) && strtolower((string) $pOrders['tetanus_passive']) !== 'none'
                ? 'Passive: ' . $pOrders['tetanus_passive']
                : null,
            !empty($pOrders['tetanus_category']) ? 'Wound: ' . $fmtLabel($pOrders['tetanus_category']) : null,
            !empty($pOrders['tetanus_notes']) ? $pOrders['tetanus_notes'] : null,
        ]);
        $tetanusSummary = implode(' | ', $tetanusSummaryParts);

        $rigType = $pOrders['rig_type'] ?? $pOrders['rig_brand'] ?? '';
        $rigDose = $cx?->dose_iu ?: ($pOrders['rig_dose_iu'] ?? '');
        $rigSummaryParts = array_filter([
            $rigType ? (string) $rigType : null,
            $rigDose ? $rigDose . ' IU' : null,
            !empty($inc?->rig_decision_reason) ? '(' . $inc->rig_decision_reason . ')' : null,
        ]);
        $rigSummary = implode(' ', $rigSummaryParts);

        $reassessmentDecision = $pOrders['reassessment_decision'] ?? '';
        $reassessmentNotes = $pOrders['reassessment_notes'] ?? '';

        $hasReferralOut = !empty($referredTo) || !empty($referralReason);
        $hasLabInfo = !empty($cx?->laboratory_findings) || !empty($cx?->performed_lab_test);
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
            <h1>INDIVIDUAL TREATMENT RECORD (FORM 2)</h1>
            <div class="instructions-text">
                Doctor Consultation, Clinical Assessment &amp; Treatment Plan Record
                @if($inc?->case_number)
                    &nbsp;•&nbsp; Case No.: <strong>{{ $inc->case_number }}</strong>
                @endif
            </div>
        </div>

        {{-- SECTION I: PATIENT INFORMATION --}}
        <div class="section-header-bar">I. PATIENT INFORMATION (IMPORMASYON NG PASYENTE)</div>
        <table class="form-table">
            <tr>
                <td style="width: 60%;">
                    <span class="lbl">Patient Name <span class="sub-lbl">(Apelyido, Pangalan, Gitnang Pangalan)</span></span>
                    <span class="val">{{ $fullName ?: '—' }}</span>
                </td>
                <td style="width: 18%;">
                    <span class="lbl">Age <span class="sub-lbl">(Edad)</span></span>
                    <span class="val">{{ $patient->age !== null ? $patient->age . ' yrs' : '—' }}</span>
                </td>
                <td style="width: 22%;">
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
        </table>

        {{-- SECTION II: CONSULTATION DETAILS & VITALS --}}
        <div class="section-header-bar">II. CONSULTATION DETAILS &amp; VITAL SIGNS</div>
        <table class="form-table">
            <tr>
                <td style="width: 28%;">
                    <span class="lbl">Date of Consultation</span>
                    <span class="val">{{ $consultDate ?: '—' }}</span>
                </td>
                <td style="width: 22%;">
                    <span class="lbl">Consultation Time</span>
                    <span class="val">{{ $consultTime ?: '—' }}</span>
                </td>
                <td style="width: 50%;">
                    <span class="lbl">Mode of Transaction</span>
                    <span class="chk-label">{!! $chkBox($modeTx === 'walk-in' || $modeTx === 'walk_in') !!} Walk-in</span>
                    <span class="chk-label">{!! $chkBox($modeTx === 'visited') !!} Visited</span>
                    <span class="chk-label">{!! $chkBox($modeTx === 'referral') !!} Referral</span>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <span class="lbl">Nature of Visit</span>
                    <span class="chk-label">{!! $chkBox($natureVisit === 'new_consultation') !!} New Consultation</span>
                    <span class="chk-label">{!! $chkBox($natureVisit === 'new_admission') !!} New Admission</span>
                    <span class="chk-label">{!! $chkBox($natureVisit === 'follow_up') !!} Follow-up Visit</span>
                </td>
                <td>
                    <span class="lbl">Attending Physician / Provider</span>
                    <span class="val">{{ $providerName ?: '—' }}</span>
                </td>
            </tr>
            <tr>
                <td style="width: 25%;">
                    <span class="lbl">Blood Pressure <span class="sub-lbl">(mmHg)</span></span>
                    <span class="val">{{ $bp ?: '—' }}</span>
                </td>
                <td style="width: 25%;">
                    <span class="lbl">Temperature <span class="sub-lbl">(°C)</span></span>
                    <span class="val">{{ $temperature ? $temperature . ' °C' : '—' }}</span>
                </td>
                <td>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="border: none; padding: 0 8px 0 0; width: 50%; border-right: 1px solid #000;">
                                <span class="lbl">Height <span class="sub-lbl">(cm)</span></span>
                                <span class="val">{{ $height ? $height . ' cm' : '—' }}</span>
                            </td>
                            <td style="border: none; padding: 0 0 0 8px; width: 50%;">
                                <span class="lbl">Weight <span class="sub-lbl">(kg)</span></span>
                                <span class="val">{{ $weight ? $weight . ' kg' : '—' }}</span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            @if(!empty($referredFrom))
                <tr>
                    <td colspan="3">
                        <span class="lbl">Referred From <span class="sub-lbl">(Health Center / Referring Facility)</span></span>
                        <span class="val">{{ $referredFrom }}</span>
                    </td>
                </tr>
            @endif
        </table>

        {{-- SECTION III: CLINICAL ASSESSMENT & EXPOSURE DETAILS --}}
        <div class="section-header-bar">III. CLINICAL ASSESSMENT &amp; EXPOSURE DETAILS</div>
        <table class="form-table">
            <tr>
                <td style="width: 45%;">
                    <span class="lbl">Exposure Category</span>
                    <span class="chk-label">{!! $chkBox($exposureCategory === 'I' || $exposureCategory === '1') !!} Category I</span>
                    <span class="chk-label">{!! $chkBox($exposureCategory === 'II' || $exposureCategory === '2') !!} Category II</span>
                    <span class="chk-label">{!! $chkBox($exposureCategory === 'III' || $exposureCategory === '3') !!} Category III</span>
                </td>
                <td style="width: 25%;">
                    <span class="lbl">Date of Exposure / Bite</span>
                    <span class="val">{{ $inc?->bite_date ? $fmtDate($inc->bite_date) : '—' }}</span>
                </td>
                <td style="width: 30%;">
                    <span class="lbl">Animal Involved</span>
                    <span class="val">
                        {{ $inc?->animal_type ? $fmtLabel($inc->animal_type === 'other' && $inc->animal_type_others ? $inc->animal_type_others : $inc->animal_type) : '—' }}
                        @if($inc?->animal_status)
                            ({{ $fmtLabel($inc->animal_status) }})
                        @endif
                    </span>
                </td>
            </tr>
            @if(!empty($inc?->bite_place))
                <tr>
                    <td colspan="3">
                        <span class="lbl">Place of Exposure</span>
                        <span class="val">{{ $inc->bite_place }}</span>
                    </td>
                </tr>
            @endif
            <tr>
                <td colspan="3">
                    <span class="lbl">Chief Complaints</span>
                    <span class="val">{{ $cx?->chief_complaints ?: '—' }}</span>
                </td>
            </tr>
            <tr>
                <td colspan="3">
                    <span class="lbl">Diagnosis &amp; Clinical Impression</span>
                    <span class="val">{{ $cx?->diagnosis ?: '—' }}</span>
                </td>
            </tr>
            @if(!empty($cx?->pertinent_history))
                <tr>
                    <td colspan="3">
                        <span class="lbl">Pertinent Medical History</span>
                        <span class="val">{{ $cx->pertinent_history }}</span>
                    </td>
                </tr>
            @endif
            @if(!empty($reassessmentDecision))
                <tr>
                    <td colspan="3">
                        <span class="lbl">Reassessment Decision</span>
                        <span class="val">{{ $fmtLabel($reassessmentDecision) }}@if(!empty($reassessmentNotes)) — {{ $reassessmentNotes }}@endif</span>
                    </td>
                </tr>
            @endif
        </table>

        {{-- SECTION IV: PRESCRIBED TREATMENT & PROPHYLAXIS ORDERS --}}
        <div class="section-header-bar">IV. PRESCRIBED TREATMENT &amp; PROPHYLAXIS ORDERS</div>
        <table class="form-table">
            <tr>
                <td style="width: 50%;">
                    <span class="lbl">Treatment Plan / Protocol</span>
                    <span class="val">{{ $planLabel ?: '—' }}</span>
                </td>
                <td style="width: 50%;">
                    <span class="lbl">Prescribed Rabies PEP Vaccine</span>
                    <span class="val">
                        {{ $cx?->prescribed_vaccine_type ?: ($exposureCategory === 'I' ? 'Not Indicated (Category I)' : '—') }}
                    </span>
                </td>
            </tr>
            @if(!empty($tetanusSummary) || !empty($rigSummary))
                <tr>
                    <td>
                        <span class="lbl">Tetanus Prophylaxis Order (TT / ATS)</span>
                        <span class="val">{{ $tetanusSummary ?: 'None' }}</span>
                    </td>
                    <td>
                        <span class="lbl">Rabies Immunoglobulin (RIG / ERIG) Order</span>
                        <span class="val">{{ $rigSummary ?: 'None' }}</span>
                    </td>
                </tr>
            @endif
            @if(!empty($cx?->medication_treatment))
                <tr>
                    <td colspan="2">
                        <span class="lbl">Medication / Treatment Instructions</span>
                        <span class="val">{{ $cx->medication_treatment }}</span>
                    </td>
                </tr>
            @endif
            @if($hasLabInfo)
                <tr>
                    <td>
                        <span class="lbl">Performed Lab Test</span>
                        <span class="val">{{ $cx->performed_lab_test ?: '—' }}</span>
                    </td>
                    <td>
                        <span class="lbl">Laboratory Findings</span>
                        <span class="val">{{ $cx->laboratory_findings ?: '—' }}</span>
                    </td>
                </tr>
            @endif
            @if(!empty($cx?->actions_taken) || !empty($cx?->remarks))
                <tr>
                    <td colspan="2">
                        <span class="lbl">Actions Taken / Clinical Remarks</span>
                        <span class="val">{{ trim(implode("\n", array_filter([$cx->actions_taken, $cx->remarks]))) }}</span>
                    </td>
                </tr>
            @endif
        </table>

        {{-- SECTION V: TRANSFER / REFERRAL (only if applicable) --}}
        @if($hasReferralOut)
            <div class="section-header-bar">V. TRANSFER / REFERRAL DETAILS</div>
            <table class="form-table">
                <tr>
                    <td style="width: 50%;">
                        <span class="lbl">Referred / Transferred To</span>
                        <span class="val">{{ $referredTo ?: '—' }}</span>
                    </td>
                    <td style="width: 50%;">
                        <span class="lbl">Reason for Referral</span>
                        <span class="val">{{ $referralReason ?: '—' }}</span>
                    </td>
                </tr>
            </table>
        @endif

        {{-- Signatures --}}
        <table class="sig-block">
            <tr>
                <td style="width: 45%;">
                    <div class="sig-name">{{ $providerName }}</div>
                    <div class="sig-line">
                        ATTENDING PHYSICIAN / PROVIDER<br>
                        LAGDA NG DOKTOR / PETSA
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
