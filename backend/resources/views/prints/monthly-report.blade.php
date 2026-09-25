<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ABTC Monthly Report - {{ $abtc }} - {{ $month_label }}</title>
    <style>
        @page {
            size: A4 landscape;
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
            font-size: 9pt;
            color: #000000;
            background-color: #ffffff;
            line-height: 1.25;
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
            background-color: #7c3aed;
            color: #ffffff;
            border: none;
            padding: 6px 16px;
            font-size: 9pt;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
        }
        .btn-print:hover {
            background-color: #6d28d9;
        }
        .header-banner {
            background-color: #c5b4e3;
            border: 2px solid #000000;
            padding: 10px 14px;
            text-align: center;
            margin-bottom: 6px;
        }
        .header-banner h2 {
            font-size: 13pt;
            font-weight: bold;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
        }
        .header-banner h3 {
            font-size: 11pt;
            font-weight: bold;
        }
        .meta-line {
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 6px;
            padding: 0 4px;
        }
        table.monthly-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin-bottom: 12px;
        }
        table.monthly-table th, table.monthly-table td {
            border: 1px solid #000000;
            padding: 4px 6px;
            text-align: center;
            vertical-align: middle;
        }
        table.monthly-table thead th {
            background-color: #d15fee;
            color: #000000;
            font-weight: bold;
            font-size: 8pt;
            text-transform: uppercase;
        }
        table.monthly-table tr.total-row {
            background-color: #f3f4f6;
            font-weight: bold;
        }
        table.monthly-table td.date-col {
            text-align: left;
            padding-left: 8px;
            white-space: nowrap;
        }
        .bottom-section {
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            page-break-inside: avoid;
            font-size: 9pt;
        }
        .signature-col {
            width: 32%;
        }
        .completion-box {
            width: 34%;
            border: 1.5px solid #000000;
            padding: 10px 12px;
            background-color: #faf5ff;
            text-align: center;
            font-size: 8.5pt;
        }
        .completion-box .title {
            font-weight: bold;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .completion-box .formula {
            font-size: 8pt;
            color: #444444;
            margin-bottom: 6px;
        }
        .completion-box .rate {
            font-size: 14pt;
            font-weight: bold;
            color: #6b21a8;
        }
        .sig-line {
            width: 220px;
            border-bottom: 1px solid #000000;
            margin-top: 35px;
            margin-bottom: 4px;
        }
        .sig-name {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9pt;
        }
        .sig-title {
            font-size: 8.5pt;
            color: #333333;
        }
        .footer-page {
            text-align: right;
            font-size: 8pt;
            color: #666666;
            margin-top: 10px;
        }
    </style>
</head>
<body>

    <div class="no-print no-print-bar">
        <span><strong>ABTC Monthly Report</strong> &mdash; NRPCP DOH Form ({{ $month_label }})</span>
        <button class="btn-print" onclick="window.print()">Print Report</button>
    </div>

    <div class="page-container">
        <!-- Purple Top Banner matching Image 1 -->
        <div class="header-banner" style="display: flex; align-items: center; justify-content: center; gap: 16px;">
            <img src="{{ $left_print_logo_url ?? '/assets/Flag_of_Tagoloan,_Misamis_Oriental.png' }}" alt="Left Seal" style="width: 56px; height: 56px; object-fit: contain; flex-shrink: 0;" onerror="this.style.visibility='hidden';" />
            <div style="text-align: center;">
                <h2>National Rabies Prevention and Control Program</h2>
                <h3>Department of Health &bull; {{ $province }} &bull; {{ $municipality }}</h3>
                <h3 style="font-size: 11pt; font-weight: bold; margin-top: 2px;">{{ $abtc }}</h3>
            </div>
            <img src="{{ $right_print_logo_url ?? '/assets/rhu-logo.png' }}" alt="Right Seal" style="width: 56px; height: 56px; object-fit: contain; flex-shrink: 0;" onerror="this.style.visibility='hidden';" />
        </div>

        <!-- Meta Line -->
        <div class="meta-line">
            <div>PROVINCE: {{ strtoupper($province) }}</div>
            <div>ABTC: {{ strtoupper($abtc) }}</div>
            <div>MONTH: {{ strtoupper($month_label) }}</div>
        </div>

        <!-- Monthly Form Table matching Image 1 -->
        <table class="monthly-table">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 14%;">INCLUSIVE DATES</th>
                    <th colspan="2" style="width: 12%;">NO. OF CASES</th>
                    <th rowspan="2" style="width: 10%;">NO. GIVEN PEP</th>
                    <th colspan="4" style="width: 24%;">NO. OF CASES CATEGORY</th>
                    <th colspan="4" style="width: 28%;">NO. OF COMPLETED VACCINE CATEGORY</th>
                    <th rowspan="2" style="width: 12%;">NO GIVEN RIG</th>
                </tr>
                <tr>
                    <!-- Under NO. OF CASES -->
                    <th style="width: 6%;">M</th>
                    <th style="width: 6%;">F</th>
                    <!-- Under NO. OF CASES CATEGORY -->
                    <th style="width: 6%;">I</th>
                    <th style="width: 6%;">II</th>
                    <th style="width: 6%;">III</th>
                    <th style="width: 6%;">TOTAL</th>
                    <!-- Under NO. OF COMPLETED VACCINE CATEGORY -->
                    <th style="width: 7%;">I</th>
                    <th style="width: 7%;">II</th>
                    <th style="width: 7%;">III</th>
                    <th style="width: 7%;">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                @forelse($rows as $row)
                    <tr>
                        <td class="date-col">{{ $row['inclusive_dates'] }}</td>
                        <td>{{ $row['male'] }}</td>
                        <td>{{ $row['female'] }}</td>
                        <td><strong>{{ $row['given_pep'] }}</strong></td>
                        <td>{{ $row['cat_1'] }}</td>
                        <td>{{ $row['cat_2'] }}</td>
                        <td>{{ $row['cat_3'] }}</td>
                        <td><strong>{{ $row['cat_total'] }}</strong></td>
                        <td>{{ $row['completed_cat_1'] }}</td>
                        <td>{{ $row['completed_cat_2'] }}</td>
                        <td>{{ $row['completed_cat_3'] }}</td>
                        <td><strong>{{ $row['completed_total'] }}</strong></td>
                        <td>{{ $row['given_rig'] }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="13" style="text-align: center; padding: 12px;">No recorded bite cases for this month.</td>
                    </tr>
                @endforelse

                <!-- Total Row -->
                <tr class="total-row">
                    <td class="date-col"><strong>{{ $totals['inclusive_dates'] }}</strong></td>
                    <td>{{ $totals['male'] }}</td>
                    <td>{{ $totals['female'] }}</td>
                    <td><strong>{{ $totals['given_pep'] }}</strong></td>
                    <td>{{ $totals['cat_1'] }}</td>
                    <td>{{ $totals['cat_2'] }}</td>
                    <td>{{ $totals['cat_3'] }}</td>
                    <td><strong>{{ $totals['cat_total'] }}</strong></td>
                    <td>{{ $totals['completed_cat_1'] }}</td>
                    <td>{{ $totals['completed_cat_2'] }}</td>
                    <td>{{ $totals['completed_cat_3'] }}</td>
                    <td><strong>{{ $totals['completed_total'] }}</strong></td>
                    <td>{{ $totals['given_rig'] }}</td>
                </tr>
            </tbody>
        </table>

        <!-- Bottom Signatures and Completion Rate Box matching Image 1 -->
        <div class="bottom-section">
            <!-- Left: Prepared By -->
            <div class="signature-col">
                <div>PREPARED BY:</div>
                <div class="sig-line"></div>
                <div class="sig-name">{{ $prepared_by }}</div>
                <div class="sig-title">{{ $prepared_designation }}</div>
                <div class="sig-title" style="margin-top: 4px;">CONTACT NO: <strong>{{ $contact_no }}</strong></div>
            </div>

            <!-- Center: Completion Rate Summary -->
            <div class="completion-box">
                <div class="title">COMPLETION RATE</div>
                <div class="formula">NO. OF COMPLETED VACCINE CATEGORY &divide; TOTAL NO. CASES CATEGORY</div>
                <div class="rate">{{ $completion_rate }}</div>
                <div style="font-size: 8pt; color: #555; margin-top: 4px;">
                    ({{ $totals['completed_total'] }} completed / {{ $totals['cat_total'] }} total cases)
                </div>
            </div>

            <!-- Right: Noted By -->
            <div class="signature-col" style="text-align: left; padding-left: 20px;">
                <div>NOTED BY:</div>
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
