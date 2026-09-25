<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cohort Report - {{ $abtc }} - {{ $year }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 8mm;
        }
        @media print {
            .no-print {
                display: none !important;
            }
            html, body {
                width: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .page-container {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
            }
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8pt;
            color: #000000;
            background-color: #ffffff;
            line-height: 1.2;
            padding: 8px;
        }
        .no-print-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background-color: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            margin-bottom: 12px;
        }
        .btn-print {
            background-color: #059669;
            color: #ffffff;
            border: none;
            padding: 6px 16px;
            font-size: 9pt;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
        }
        .btn-print:hover {
            background-color: #047857;
        }
        .meta-section {
            margin-bottom: 12px;
            font-size: 8.5pt;
            font-weight: bold;
            line-height: 1.4;
        }
        table.cohort-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 6.8pt;
            margin-bottom: 16px;
            table-layout: fixed;
        }
        table.cohort-table th, table.cohort-table td {
            border: 1px solid #000000;
            padding: 4px 1px;
            text-align: center;
            vertical-align: middle;
            word-wrap: break-word;
        }
        table.cohort-table thead th {
            background-color: #f8fafc;
            font-weight: bold;
        }
        table.cohort-table td.indicator-col {
            text-align: left;
            padding-left: 4px;
            font-weight: bold;
            width: 78px;
            background-color: #fafafa;
        }
        table.cohort-table tr.completion-row td {
            background-color: #fef08a !important;
            font-weight: bold;
            color: #000000;
        }
        .signatures-container {
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
            font-size: 8.5pt;
        }
        .signature-block {
            width: 44%;
        }
        .sig-line {
            width: 220px;
            border-bottom: 1px solid #000000;
            margin-top: 36px;
            margin-bottom: 4px;
        }
        .sig-name {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8.5pt;
        }
        .sig-title {
            font-size: 8pt;
            color: #333333;
        }
        .footer-page {
            text-align: right;
            font-size: 7.5pt;
            color: #666666;
            margin-top: 14px;
        }
    </style>
</head>
<body>

    <div class="no-print no-print-bar">
        <span><strong>Cohort Report (Quarterly &amp; Annual)</strong> &mdash; DOH Form</span>
        <button class="btn-print" onclick="window.print()">Print Report</button>
    </div>

    <div class="page-container">
        <!-- Header with Configurable Logos & Dynamic Clinic Metadata -->
        <div class="header-banner" style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 8px;">
            <img src="{{ $left_print_logo_url ?? '/assets/Flag_of_Tagoloan,_Misamis_Oriental.png' }}" alt="Left Seal" style="width: 56px; height: 56px; object-fit: contain; flex-shrink: 0;" onerror="this.style.visibility='hidden';" />
            <div style="text-align: center;">
                <div style="font-size: 8pt; font-style: italic;">Republic of the Philippines &bull; {{ $province }} &bull; {{ $municipality }}</div>
                <div style="font-size: 11pt; font-weight: 800; text-transform: uppercase; margin-top: 1px;">{{ $abtc }}</div>
                <div style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase;">ABTC COHORT REPORT</div>
            </div>
            <img src="{{ $right_print_logo_url ?? '/assets/rhu-logo.png' }}" alt="Right Seal" style="width: 56px; height: 56px; object-fit: contain; flex-shrink: 0;" onerror="this.style.visibility='hidden';" />
        </div>

        <!-- Metadata Header matching Image 3 -->
        <div class="meta-section">
            <div>PROVINCE:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{ strtoupper($province) }}</div>
            <div>ABTC:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{ strtoupper($abtc) }}</div>
            <div>YEAR:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{ $year }}</div>
        </div>

        <!-- Cohort Matrix Table matching Image 3 -->
        <table class="cohort-table">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 78px;">INDICATORS</th>
                    <th colspan="4">1ST QUARTER</th>
                    <th colspan="4">2ND QUARTER</th>
                    <th colspan="4">3RD QUARTER</th>
                    <th colspan="4">4TH QUARTER</th>
                    <th colspan="4">TOTAL</th>
                </tr>
                <tr>
                    <!-- Q1 -->
                    <th>CAT 1</th><th>CAT 2</th><th>CAT 3</th><th>TOTAL</th>
                    <!-- Q2 -->
                    <th>CAT 1</th><th>CAT 2</th><th>CAT 3</th><th>TOTAL</th>
                    <!-- Q3 -->
                    <th>CAT 1</th><th>CAT 2</th><th>CAT 3</th><th>TOTAL</th>
                    <!-- Q4 -->
                    <th>CAT 1</th><th>CAT 2</th><th>CAT 3</th><th>TOTAL</th>
                    <!-- TOTAL -->
                    <th>CAT 1</th><th>CAT 2</th><th>CAT 3</th><th>TOTAL</th>
                </tr>
            </thead>
            <tbody>
                <!-- 1. NO. OF CASES -->
                <tr>
                    <td class="indicator-col">NO. OF CASES</td>
                    <!-- Q1 -->
                    <td>{{ $quarters['q1']['cat_I']['cases'] }}</td>
                    <td>{{ $quarters['q1']['cat_II']['cases'] }}</td>
                    <td>{{ $quarters['q1']['cat_III']['cases'] }}</td>
                    <td><strong>{{ $quarters['q1']['total']['cases'] }}</strong></td>
                    <!-- Q2 -->
                    <td>{{ $quarters['q2']['cat_I']['cases'] }}</td>
                    <td>{{ $quarters['q2']['cat_II']['cases'] }}</td>
                    <td>{{ $quarters['q2']['cat_III']['cases'] }}</td>
                    <td><strong>{{ $quarters['q2']['total']['cases'] }}</strong></td>
                    <!-- Q3 -->
                    <td>{{ $quarters['q3']['cat_I']['cases'] }}</td>
                    <td>{{ $quarters['q3']['cat_II']['cases'] }}</td>
                    <td>{{ $quarters['q3']['cat_III']['cases'] }}</td>
                    <td><strong>{{ $quarters['q3']['total']['cases'] }}</strong></td>
                    <!-- Q4 -->
                    <td>{{ $quarters['q4']['cat_I']['cases'] }}</td>
                    <td>{{ $quarters['q4']['cat_II']['cases'] }}</td>
                    <td>{{ $quarters['q4']['cat_III']['cases'] }}</td>
                    <td><strong>{{ $quarters['q4']['total']['cases'] }}</strong></td>
                    <!-- TOTAL -->
                    <td>{{ $quarters['annual']['cat_I']['cases'] }}</td>
                    <td>{{ $quarters['annual']['cat_II']['cases'] }}</td>
                    <td>{{ $quarters['annual']['cat_III']['cases'] }}</td>
                    <td><strong>{{ $quarters['annual']['total']['cases'] }}</strong></td>
                </tr>

                <!-- 2. NO. GIVEN PEP -->
                <tr>
                    <td class="indicator-col">NO. GIVEN PEP</td>
                    <!-- Q1 -->
                    <td>{{ $quarters['q1']['cat_I']['given_pep'] }}</td>
                    <td>{{ $quarters['q1']['cat_II']['given_pep'] }}</td>
                    <td>{{ $quarters['q1']['cat_III']['given_pep'] }}</td>
                    <td><strong>{{ $quarters['q1']['total']['given_pep'] }}</strong></td>
                    <!-- Q2 -->
                    <td>{{ $quarters['q2']['cat_I']['given_pep'] }}</td>
                    <td>{{ $quarters['q2']['cat_II']['given_pep'] }}</td>
                    <td>{{ $quarters['q2']['cat_III']['given_pep'] }}</td>
                    <td><strong>{{ $quarters['q2']['total']['given_pep'] }}</strong></td>
                    <!-- Q3 -->
                    <td>{{ $quarters['q3']['cat_I']['given_pep'] }}</td>
                    <td>{{ $quarters['q3']['cat_II']['given_pep'] }}</td>
                    <td>{{ $quarters['q3']['cat_III']['given_pep'] }}</td>
                    <td><strong>{{ $quarters['q3']['total']['given_pep'] }}</strong></td>
                    <!-- Q4 -->
                    <td>{{ $quarters['q4']['cat_I']['given_pep'] }}</td>
                    <td>{{ $quarters['q4']['cat_II']['given_pep'] }}</td>
                    <td>{{ $quarters['q4']['cat_III']['given_pep'] }}</td>
                    <td><strong>{{ $quarters['q4']['total']['given_pep'] }}</strong></td>
                    <!-- TOTAL -->
                    <td>{{ $quarters['annual']['cat_I']['given_pep'] }}</td>
                    <td>{{ $quarters['annual']['cat_II']['given_pep'] }}</td>
                    <td>{{ $quarters['annual']['cat_III']['given_pep'] }}</td>
                    <td><strong>{{ $quarters['annual']['total']['given_pep'] }}</strong></td>
                </tr>

                <!-- 3. NO. COMPLETED -->
                <tr>
                    <td class="indicator-col">NO. COMPLETED</td>
                    <!-- Q1 -->
                    <td>{{ $quarters['q1']['cat_I']['completed'] }}</td>
                    <td>{{ $quarters['q1']['cat_II']['completed'] }}</td>
                    <td>{{ $quarters['q1']['cat_III']['completed'] }}</td>
                    <td><strong>{{ $quarters['q1']['total']['completed'] }}</strong></td>
                    <!-- Q2 -->
                    <td>{{ $quarters['q2']['cat_I']['completed'] }}</td>
                    <td>{{ $quarters['q2']['cat_II']['completed'] }}</td>
                    <td>{{ $quarters['q2']['cat_III']['completed'] }}</td>
                    <td><strong>{{ $quarters['q2']['total']['completed'] }}</strong></td>
                    <!-- Q3 -->
                    <td>{{ $quarters['q3']['cat_I']['completed'] }}</td>
                    <td>{{ $quarters['q3']['cat_II']['completed'] }}</td>
                    <td>{{ $quarters['q3']['cat_III']['completed'] }}</td>
                    <td><strong>{{ $quarters['q3']['total']['completed'] }}</strong></td>
                    <!-- Q4 -->
                    <td>{{ $quarters['q4']['cat_I']['completed'] }}</td>
                    <td>{{ $quarters['q4']['cat_II']['completed'] }}</td>
                    <td>{{ $quarters['q4']['cat_III']['completed'] }}</td>
                    <td><strong>{{ $quarters['q4']['total']['completed'] }}</strong></td>
                    <!-- TOTAL -->
                    <td>{{ $quarters['annual']['cat_I']['completed'] }}</td>
                    <td>{{ $quarters['annual']['cat_II']['completed'] }}</td>
                    <td>{{ $quarters['annual']['cat_III']['completed'] }}</td>
                    <td><strong>{{ $quarters['annual']['total']['completed'] }}</strong></td>
                </tr>

                <!-- 4. NO. GIVEN RIG -->
                <tr>
                    <td class="indicator-col">NO. GIVEN RIG</td>
                    <!-- Q1 -->
                    <td>{{ $quarters['q1']['cat_I']['given_rig'] }}</td>
                    <td>{{ $quarters['q1']['cat_II']['given_rig'] }}</td>
                    <td>{{ $quarters['q1']['cat_III']['given_rig'] }}</td>
                    <td><strong>{{ $quarters['q1']['total']['given_rig'] }}</strong></td>
                    <!-- Q2 -->
                    <td>{{ $quarters['q2']['cat_I']['given_rig'] }}</td>
                    <td>{{ $quarters['q2']['cat_II']['given_rig'] }}</td>
                    <td>{{ $quarters['q2']['cat_III']['given_rig'] }}</td>
                    <td><strong>{{ $quarters['q2']['total']['given_rig'] }}</strong></td>
                    <!-- Q3 -->
                    <td>{{ $quarters['q3']['cat_I']['given_rig'] }}</td>
                    <td>{{ $quarters['q3']['cat_II']['given_rig'] }}</td>
                    <td>{{ $quarters['q3']['cat_III']['given_rig'] }}</td>
                    <td><strong>{{ $quarters['q3']['total']['given_rig'] }}</strong></td>
                    <!-- Q4 -->
                    <td>{{ $quarters['q4']['cat_I']['given_rig'] }}</td>
                    <td>{{ $quarters['q4']['cat_II']['given_rig'] }}</td>
                    <td>{{ $quarters['q4']['cat_III']['given_rig'] }}</td>
                    <td><strong>{{ $quarters['q4']['total']['given_rig'] }}</strong></td>
                    <!-- TOTAL -->
                    <td>{{ $quarters['annual']['cat_I']['given_rig'] }}</td>
                    <td>{{ $quarters['annual']['cat_II']['given_rig'] }}</td>
                    <td>{{ $quarters['annual']['cat_III']['given_rig'] }}</td>
                    <td><strong>{{ $quarters['annual']['total']['given_rig'] }}</strong></td>
                </tr>

                <!-- 5. COMPLETION RATE (Yellow row matching Image 3) -->
                <tr class="completion-row">
                    <td class="indicator-col">COMPLETION RATE</td>
                    <!-- Q1 -->
                    <td>{{ $quarters['q1']['cat_I']['completion_rate'] }}</td>
                    <td>{{ $quarters['q1']['cat_II']['completion_rate'] }}</td>
                    <td>{{ $quarters['q1']['cat_III']['completion_rate'] }}</td>
                    <td>{{ $quarters['q1']['total']['completion_rate'] }}</td>
                    <!-- Q2 -->
                    <td>{{ $quarters['q2']['cat_I']['completion_rate'] }}</td>
                    <td>{{ $quarters['q2']['cat_II']['completion_rate'] }}</td>
                    <td>{{ $quarters['q2']['cat_III']['completion_rate'] }}</td>
                    <td>{{ $quarters['q2']['total']['completion_rate'] }}</td>
                    <!-- Q3 -->
                    <td>{{ $quarters['q3']['cat_I']['completion_rate'] }}</td>
                    <td>{{ $quarters['q3']['cat_II']['completion_rate'] }}</td>
                    <td>{{ $quarters['q3']['cat_III']['completion_rate'] }}</td>
                    <td>{{ $quarters['q3']['total']['completion_rate'] }}</td>
                    <!-- Q4 -->
                    <td>{{ $quarters['q4']['cat_I']['completion_rate'] }}</td>
                    <td>{{ $quarters['q4']['cat_II']['completion_rate'] }}</td>
                    <td>{{ $quarters['q4']['cat_III']['completion_rate'] }}</td>
                    <td>{{ $quarters['q4']['total']['completion_rate'] }}</td>
                    <!-- TOTAL -->
                    <td>{{ $quarters['annual']['cat_I']['completion_rate'] }}</td>
                    <td>{{ $quarters['annual']['cat_II']['completion_rate'] }}</td>
                    <td>{{ $quarters['annual']['cat_III']['completion_rate'] }}</td>
                    <td>{{ $quarters['annual']['total']['completion_rate'] }}</td>
                </tr>
            </tbody>
        </table>

        <!-- Signatures Block matching Image 3 -->
        <div class="signatures-container">
            <div class="signature-block">
                <div>Prepared by:</div>
                <div style="margin-top: 4px; font-size: 8pt; color: #555;">Name and Signature:</div>
                <div class="sig-line"></div>
                <div class="sig-name">{{ $prepared_by }}</div>
                <div class="sig-title">{{ $prepared_designation }}</div>
                <div class="sig-title">Date: {{ $date_signed }}</div>
            </div>
            <div class="signature-block" style="text-align: left; margin-left: auto; width: 44%;">
                <div>NOTED:</div>
                <div style="margin-top: 4px; font-size: 8pt; color: #555;">Name and Signature:</div>
                <div class="sig-line"></div>
                <div class="sig-name">{{ $noted_by }}</div>
                <div class="sig-title">{{ $noted_designation }}</div>
                <div class="sig-title">Date: {{ $date_signed }}</div>
            </div>
        </div>

        <div class="footer-page">
            Page 1 of 1
        </div>
    </div>

    <script>
        window.addEventListener('load', function() {
            setTimeout(function() {
                window.print();
            }, 350);
        });
    </script>
</body>
</html>
