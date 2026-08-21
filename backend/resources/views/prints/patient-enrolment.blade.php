<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOH iCLINICSYS - PATIENT ENROLMENT RECORD - {{ $patient->patient_number }}</title>
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
            letter-spacing: 1.5px;
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
            font-size: 11.5px;
            font-weight: bold;
            color: #000000;
        }
        .chk-label {
            display: inline-flex;
            align-items: center;
            margin-right: 14px;
            font-size: 10px;
            white-space: nowrap;
        }
        .consent-grid {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }
        .consent-grid td {
            border: 1.5px solid #000000;
            padding: 8px 10px;
            vertical-align: top;
            font-size: 9.5px;
            text-align: justify;
            line-height: 1.3;
        }
        .consent-col-header {
            font-weight: bold;
            font-size: 10.5px;
            text-align: center;
            background-color: #f0f0f0;
            padding: 3px 6px;
            border-bottom: 1.5px solid #000000;
            margin-bottom: 6px;
        }
        .sig-block {
            margin-top: 24px;
            width: 100%;
            border-collapse: collapse;
        }
        .sig-block td {
            text-align: center;
            vertical-align: bottom;
            padding: 0 15px;
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
        <button class="btn-print" onclick="window.print()">🖨️ Print Form 1 Record</button>
    </div>

    @php
        $details = $patient->details;
        $civilStatus = strtolower($details->civil_status ?? $patient->civil_status ?? '');
        $gender = strtolower($patient->gender ?? '');
        $edu = strtolower($details->educational_attainment ?? '');
        $emp = strtolower($details->employment_status ?? '');
        $family = strtolower($details->family_member ?? '');
        $phMember = strtolower($details->philhealth_member ?? '');
        $phStatus = strtolower($details->philhealth_status ?? '');
        $phCat = strtolower($details->philhealth_category ?? '');
        $fourps = strtolower($details->fourps_member ?? '');
        $nhts = strtolower($details->dswd_nhts ?? '');
        $pcb = strtolower($details->pcb_member ?? '');

        $hasVal = function($val, $target) {
            return strtolower($val ?? '') === strtolower($target);
        };

        // Modern Crisp SVG Checkbox Box
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
    @endphp

    <div class="page-container">

        {{-- Top Header Grid matching photo --}}
        <table class="header-grid">
            <tr>
                <td style="width: 48%;">
                    <div class="doh-brand">
                        <img src="/assets/logo_doh.jpg" alt="DOH Seal" class="doh-logo-img" onerror="this.style.display='none'">
                        <div class="doh-text">
                            Republic of the Philippines<br>
                            <strong>Department of Health</strong>
                            Kagawaran ng Kalusugan
                        </div>
                    </div>
                </td>
                <td style="width: 28%;">
                    <span class="lbl">Family Serial Number</span>
                    <span class="val" style="font-family: monospace; font-size: 13px;">{{ $patient->patient_number }}</span>
                </td>
                <td style="width: 24%;">
                    <span class="lbl">Facility Code</span>
                    <span class="val">{{ $patient->clinic->code ?? '104324' }}</span>
                </td>
            </tr>
        </table>

        {{-- Title Banner --}}
        <div class="title-banner">
            <h2>Integrated Clinic Information System (iCLINICSYS)</h2>
            <h1>PATIENT ENROLMENT RECORD</h1>
            <div class="instructions-text">
                Instructions: For new patient only. Please print legibly and mark appropriate boxes with "X".<br>
                Para sa mga bagong pasyente lamang. Mangyaring isulat nang malinaw at markahan ang nararapat na kahon ng "X".
            </div>
        </div>

        {{-- SECTION I: PATIENT INFORMATION --}}
        <div class="section-header-bar">I. PATIENT INFORMATION (IMPORMASYON NG PASYENTE)</div>

        {{-- Row 1: Name & Suffix --}}
        <table class="form-table">
            <tr>
                <td style="width: 65%;">
                    <span class="lbl">Last Name <span class="sub-lbl">(Apelyido)</span></span>
                    <span class="val">{{ strtoupper($patient->last_name) }}</span>
                </td>
                <td style="width: 35%;">
                    <span class="lbl">Suffix <span class="sub-lbl">(e.g. Jr., Sr., II, III)</span></span>
                    <span class="val">{{ strtoupper($patient->suffix ?? '') }}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="lbl">First Name <span class="sub-lbl">(Pangalan)</span></span>
                    <span class="val">{{ strtoupper($patient->first_name) }}</span>
                </td>
                <td>
                    <span class="lbl">Please write Maiden Name <span class="sub-lbl">(for married women / Pangalan sa pagkadalaga)</span></span>
                    <span class="val">{{ strtoupper($details->maiden_name ?? '') }}</span>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <span class="lbl">Middle Name <span class="sub-lbl">(Gitnang Pangalan)</span></span>
                    <span class="val">{{ strtoupper($patient->middle_name ?? '') }}</span>
                </td>
            </tr>
        </table>

        {{-- Row 2: Sex, DOB, Birthplace, Blood Type, Mother's Name --}}
        <table class="form-table">
            <tr>
                <td style="width: 35%;">
                    <span class="lbl">Sex <span class="sub-lbl">(Kasarian)</span></span>
                    <span class="chk-label">{!! $chkBox($gender == 'female') !!} Female <span class="sub-lbl">(Babae)</span></span>
                    <span class="chk-label">{!! $chkBox($gender == 'male') !!} Male <span class="sub-lbl">(Lalaki)</span></span>
                </td>
                <td style="width: 65%;" rowspan="3">
                    <span class="lbl">Mother's Name <span class="sub-lbl">(Pangalan ng Ina)</span></span>
                    <span class="val">{{ strtoupper($details->mother_maiden_name ?? '') }}</span>
                    <hr style="margin: 4px 0; border: none; border-top: 1px solid #000;">
                    <span class="lbl">Residential Address <span class="sub-lbl">(Tirahan)</span></span>
                    <span class="val">{{ $patient->address ?? 'Misamis Oriental' }}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="lbl">Birth Date <span class="sub-lbl">(Kapanganakan) (mm/dd/yyyy)</span></span>
                    <span class="val">{{ $patient->date_of_birth ? \Carbon\Carbon::parse($patient->date_of_birth)->format('m / d / Y') : '  /  /  ' }}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="lbl">Birthplace <span class="sub-lbl">(Lugar ng Kapanganakan)</span></span>
                    <span class="val">{{ $details->address_municipality ?? 'Misamis Oriental' }}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="lbl">Blood Type</span>
                    <span class="val">{{ strtoupper($details->blood_type ?? '') }}</span>
                </td>
                <td>
                    <span class="lbl">Contact Number</span>
                    <span class="val">{{ $patient->contact_number ?? '' }}</span>
                </td>
            </tr>
        </table>

        {{-- Row 3: Civil Status, DSWD NHTS, Household No --}}
        <table class="form-table">
            <tr>
                <td style="width: 55%;" rowspan="2">
                    <span class="lbl">Civil Status <span class="sub-lbl">(Katayuang Sibil)</span></span>
                    <table style="width: 100%; border: none; font-size: 10px;">
                        <tr>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($hasVal($civilStatus, 'single')) !!} Single <span class="sub-lbl">(Walang Asawa)</span></span></td>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($hasVal($civilStatus, 'widowed')) !!} Widower <span class="sub-lbl">(Balo)</span></span></td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($hasVal($civilStatus, 'married')) !!} Married <span class="sub-lbl">(May Asawa)</span></span></td>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($hasVal($civilStatus, 'separated')) !!} Separated <span class="sub-lbl">(Hiwalay)</span></span></td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($hasVal($civilStatus, 'annulled')) !!} Annulled <span class="sub-lbl">(Anulado)</span></span></td>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($hasVal($civilStatus, 'cohabitation')) !!} Co-Habitation <span class="sub-lbl">(Paninirahang magkasama)</span></span></td>
                        </tr>
                    </table>
                </td>
                <td style="width: 25%;">
                    <span class="lbl">DSWD NHTS?</span>
                    <span class="chk-label">{!! $chkBox($nhts == 'yes') !!} Yes</span>
                    <span class="chk-label">{!! $chkBox($nhts == 'no') !!} No</span>
                </td>
                <td style="width: 20%;">
                    <span class="lbl">Facility Household No.</span>
                    <span class="val">{{ $details->household_no ?? '' }}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="lbl">4Ps Member?</span>
                    <span class="chk-label">{!! $chkBox($fourps == 'yes') !!} Yes</span>
                    <span class="chk-label">{!! $chkBox($fourps == 'no') !!} No</span>
                </td>
                <td>
                    <span class="lbl">Household No.</span>
                    <span class="val">{{ $details->household_no ?? '' }}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="lbl">Spouse's Name <span class="sub-lbl">(Asawa)</span></span>
                    <span class="val">{{ strtoupper($details->spouse_name ?? '') }}</span>
                </td>
                <td>
                    <span class="lbl">PhilHealth Member?</span>
                    <span class="chk-label">{!! $chkBox($phMember == 'yes') !!} Yes</span>
                    <span class="chk-label">{!! $chkBox($phMember == 'no') !!} No</span>
                </td>
                <td>
                    <span class="lbl">Status Type:</span>
                    <span class="chk-label">{!! $chkBox($phStatus == 'member') !!} Member</span>
                    <span class="chk-label">{!! $chkBox($phStatus == 'dependent') !!} Dependent</span>
                </td>
            </tr>
        </table>

        {{-- Educational Attainment, Employment Status, PhilHealth Category --}}
        <table class="form-table">
            <tr>
                <td style="width: 55%;">
                    <span class="lbl">Educational Attainment <span class="sub-lbl">(Pang-edukasyong katayuan)</span></span>
                    <table style="width: 100%; border: none; font-size: 10px;">
                        <tr>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($edu == 'no_formal' || $edu == 'none' || $edu == 'no_formal_education') !!} No Formal Education <span class="sub-lbl">(Walang Pormal na Edukasyon)</span></span></td>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($edu == 'elementary') !!} Elementary <span class="sub-lbl">(Elementarya)</span></span></td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($edu == 'high_school') !!} High School <span class="sub-lbl">(Hayskul)</span></span></td>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($edu == 'vocational') !!} Vocational <span class="sub-lbl">(Bokasyunal)</span></span></td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($edu == 'college') !!} College <span class="sub-lbl">(Kolehiyo)</span></span></td>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($edu == 'post_graduate') !!} Post Graduate</span></td>
                        </tr>
                    </table>
                </td>
                <td style="width: 45%;">
                    <span class="lbl">PhilHealth No.</span>
                    <span class="val" style="font-family: monospace; font-size: 12px;">{{ $details->philhealth_no ?? '' }}</span>
                    <hr style="margin: 4px 0; border: none; border-top: 1px solid #000;">
                    <span class="lbl">If Member, please indicate category:</span>
                    <div style="font-size: 9.5px; margin-top: 2px;">
                        <span class="chk-label">{!! $chkBox($phCat == 'fe_private' || $phCat == 'private') !!} FE - Private</span>
                        <span class="chk-label">{!! $chkBox($phCat == 'fe_government' || $phCat == 'government') !!} FE - Government</span><br>
                        <span class="chk-label">{!! $chkBox($phCat == 'ie' || $phCat == 'indigent') !!} IE</span>
                        <span class="chk-label">{!! $chkBox($phCat == 'others' || $phCat == 'informal') !!} Others</span>
                    </div>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="lbl">Employment Status <span class="sub-lbl">(Katayuan sa Pagtatrabaho)</span></span>
                    <table style="width: 100%; border: none; font-size: 10px;">
                        <tr>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($emp == 'student') !!} Student <span class="sub-lbl">(Estudyante)</span></span></td>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($emp == 'unknown') !!} Unknown <span class="sub-lbl">(Hindi malaman)</span></span></td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($emp == 'employed') !!} Employed <span class="sub-lbl">(May trabaho)</span></span></td>
                            <td style="border: none; padding: 2px;"><span class="chk-label">{!! $chkBox($emp == 'retired') !!} Retired <span class="sub-lbl">(Retirado)</span></span></td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 2px;" colspan="2"><span class="chk-label">{!! $chkBox($emp == 'unemployed' || $emp == 'none') !!} None/Unemployed <span class="sub-lbl">(Walang Trabaho)</span></span></td>
                        </tr>
                    </table>
                </td>
                <td>
                    <span class="lbl">Primary Care Benefit (PCB) Member?</span>
                    <span class="chk-label">{!! $chkBox($pcb == 'yes') !!} Yes</span>
                    <span class="chk-label">{!! $chkBox($pcb != 'yes') !!} No</span>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <span class="lbl">Family Member <span class="sub-lbl">(Posisyon sa Pamilya)</span></span>
                    <span class="chk-label">{!! $chkBox($family == 'father' || $family == 'head') !!} Father <span class="sub-lbl">(Ama)</span></span>
                    <span class="chk-label">{!! $chkBox($family == 'mother' || $family == 'spouse') !!} Mother <span class="sub-lbl">(Ina)</span></span>
                    <span class="chk-label">{!! $chkBox($family == 'son' || $family == 'child') !!} Son <span class="sub-lbl">(Anak na lalaki)</span></span>
                    <span class="chk-label">{!! $chkBox($family == 'daughter' || $family == 'dependent') !!} Daughter <span class="sub-lbl">(Anak na babae)</span></span>
                    <span class="chk-label">{!! $chkBox($family == 'others') !!} Others <span class="sub-lbl">(Iba)</span></span>
                </td>
            </tr>
        </table>

        {{-- SECTION II: PATIENT'S CONSENT --}}
        <div class="section-header-bar">II. PATIENT'S CONSENT (PAHINTULOT NG PASYENTE)</div>

        <table class="consent-grid">
            <tr>
                <td style="width: 50%;">
                    <div class="consent-col-header">IN ENGLISH</div>
                    <p style="margin: 0 0 6px 0;">
                        I have read and understood the Patient's Information after I have been made aware of its contents. During an informational conversation I was informed in a very comprehensible way about the essence and importance of the Integrated Clinic Information System (iClinicSys) by the CHU/RHU representative. All my questions during the conversation were answered sufficiently and I had been given enough time to decide on this.
                    </p>
                    <p style="margin: 0 0 6px 0;">
                        Furthermore, I permit the CHU/RHU to encode the information concerning my person and the collected data regarding disease symptoms and consultations for said information system.
                    </p>
                    <p style="margin: 0;">
                        I wish to be informed about the medical results concerning me personally or my direct descendants. Also, I can cancel my consent at the CHU/RHU any time without giving reasons and without concerning any disadvantage for my medical treatment.
                    </p>
                </td>
                <td style="width: 50%;">
                    <div class="consent-col-header">SA FILIPINO</div>
                    <p style="margin: 0 0 6px 0;">
                        Aking nabasa at naintindihan ang Impormasyon ng Pasyente matapos ako'y bigyang-kaalaman ng mga nilalaman nito. Sa isang pag-uusap kasama ang kinatawan ng CHU/RHU, ako ay binigyang-paunawa nang mahusay tungkol sa kakanyahan at kahalagahan ng Integrated Clinic Information System (iClinicSys). Lahat ng aking mga katanungan sa panahon ng pag-uusap ay nasagot ng sapat at ako ay binigyan ng sapat na oras upang magpasya nito.
                    </p>
                    <p style="margin: 0 0 6px 0;">
                        Higit pa rito, pinapayagan ko ang CHU/RHU upang i-encode ang mga impormasyon patungkol sa akin at ang mga nakolektang impormasyon tungkol sa mga sintomas ng aking sakit at konsultasyong kaugnay dito para sa nasabing information system.
                    </p>
                    <p style="margin: 0;">
                        Nais kong malaman at maipaalam sa aking direktang kapamilya ang aking mga medikal na resulta. Gayundin, maari kong kanselahin ang aking pahintulot sa CHU/RHU anumang oras na walang ibinibigay na dahilan at walang kinalaman sa anumang kawalan para sa aking medikal na pagpapagamot.
                    </p>
                </td>
            </tr>
        </table>

        {{-- Signatures --}}
        <table class="sig-block">
            <tr>
                <td style="width: 45%;">
                    <div class="sig-line">
                        SIGNATURE OF PATIENT / DATE<br>
                        PIRMA NG PASYENTE / PETSA
                    </div>
                </td>
                <td style="width: 10%;"></td>
                <td style="width: 45%;">
                    <div class="sig-line">
                        NAME OF CHU/RHU REPRESENTATIVE<br>
                        KINATAWAN NG CHU / RHU
                    </div>
                </td>
            </tr>
        </table>

    </div>

</body>
</html>
