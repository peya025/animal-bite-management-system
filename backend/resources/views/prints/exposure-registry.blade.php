<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rabies Exposure Registry - {{ $clinic }}</title>
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
            font-size: 8.5pt;
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
            background-color: #0284c7;
            color: #ffffff;
            border: none;
            padding: 6px 16px;
            font-size: 9pt;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
        }
        .btn-print:hover {
            background-color: #0369a1;
        }
        .header-title {
            text-align: center;
            margin-bottom: 6px;
        }
        .header-title h4 {
            font-size: 8.5pt;
            font-weight: normal;
            text-transform: uppercase;
        }
        .header-title h3 {
            font-size: 9.5pt;
            font-weight: normal;
        }
        .header-title h2 {
            font-size: 11pt;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 6px;
            font-size: 8.5pt;
        }
        .meta-table td {
            padding: 2px 4px;
            vertical-align: top;
        }
        table.registry-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.5pt;
            margin-bottom: 12px;
        }
        table.registry-table th, table.registry-table td {
            border: 1px solid #000000;
            padding: 3px 2px;
            text-align: center;
            vertical-align: middle;
        }
        table.registry-table th {
            background-color: #f8fafc;
            font-weight: bold;
        }
        table.registry-table tr.total-row {
            background-color: #f1f5f9;
            font-weight: bold;
        }
        table.registry-table td.date-col {
            text-align: left;
            padding-left: 4px;
            white-space: nowrap;
            font-size: 7.5pt;
        }
        .signatures-container {
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
            font-size: 8.5pt;
        }
        .signature-block {
            width: 40%;
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
            margin-top: 8px;
        }
    </style>
</head>
<body>

    <div class="no-print no-print-bar">
        <span><strong>Rabies Exposure Registry (Weekly)</strong> &mdash; DOH Official Form</span>
        <button class="btn-print" onclick="window.print()">Print Report</button>
    </div>

    <div class="page-container">
        <!-- Header -->
        <div class="header-title">
            <h4>Department of Health</h4>
            <h3>National Rabies Prevention and Control Program</h3>
            <h2>Rabies Exposure Registry</h2>
        </div>

        <!-- Meta Information -->
        <table class="meta-table">
            <tr>
                <td style="width: 65%;">
                    <strong>Name of Animal Bite Treatment Center:</strong> {{ $clinic }}<br>
                    <span style="padding-left: 20px;">{{ $municipality }}, {{ $province }}</span>
                </td>
                <td style="width: 35%; text-align: right;">
                    <strong>QUARTER:</strong> {{ $quarter }}<br>
                    <strong>YEAR:</strong> {{ $year }}
                </td>
            </tr>
        </table>

        <!-- Main Registry Table matching Image 2 & 4 -->
        <table class="registry-table">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 75px;">Inclusive Dates</th>
                    <th rowspan="2" style="width: 45px;">Human Popn</th>
                    <th rowspan="2" style="width: 28px;">Male</th>
                    <th rowspan="2" style="width: 28px;">Female</th>
                    <th rowspan="2" style="width: 32px;">Total</th>
                    <th colspan="3">Age</th>
                    <th colspan="5">Bite Category</th>
                    <th rowspan="2" style="width: 28px;">No. HR</th>
                    <th rowspan="2" style="width: 28px;">TCV</th>
                    <th rowspan="2" style="width: 28px;">HRIG</th>
                    <th rowspan="2" style="width: 28px;">ERIG</th>
                    <th colspan="4">Animal Type</th>
                    <th rowspan="2" style="width: 34px;">%TCV</th>
                    <th rowspan="2" style="width: 34px;">%ERIG</th>
                </tr>
                <tr>
                    <!-- Age breakdown -->
                    <th style="width: 26px;">&lt;15</th>
                    <th style="width: 26px;">15&gt;</th>
                    <th style="width: 28px;">Total</th>
                    <!-- Category breakdown -->
                    <th style="width: 26px;">Cat I</th>
                    <th style="width: 26px;">Cat II</th>
                    <th style="width: 26px;">Cat III</th>
                    <th style="width: 28px;">Total</th>
                    <th style="width: 28px;">%</th>
                    <!-- Animal breakdown -->
                    <th style="width: 28px;">Dog</th>
                    <th style="width: 28px;">Cat</th>
                    <th style="width: 28px;">Others</th>
                    <th style="width: 30px;">Total</th>
                </tr>
            </thead>
            <tbody>
                @forelse($data as $row)
                    <tr>
                        <td class="date-col">{{ $row['inclusive_dates'] }}</td>
                        <td>{{ number_format($row['human_population']) }}</td>
                        <td>{{ $row['male'] }}</td>
                        <td>{{ $row['female'] }}</td>
                        <td><strong>{{ $row['total'] }}</strong></td>
                        <td>{{ $row['age_below_15'] }}</td>
                        <td>{{ $row['age_15_above'] }}</td>
                        <td>{{ $row['age_total'] }}</td>
                        <td>{{ $row['cat_1'] }}</td>
                        <td>{{ $row['cat_2'] }}</td>
                        <td>{{ $row['cat_3'] }}</td>
                        <td>{{ $row['cat_total'] }}</td>
                        <td>{{ $row['cat_percentage'] }}</td>
                        <td>{{ $row['no_hr'] }}</td>
                        <td>{{ $row['tcv'] }}</td>
                        <td>{{ $row['hrig'] }}</td>
                        <td>{{ $row['erig'] }}</td>
                        <td>{{ $row['dog'] }}</td>
                        <td>{{ $row['cat'] }}</td>
                        <td>{{ $row['others'] }}</td>
                        <td>{{ $row['animal_total'] }}</td>
                        <td>{{ $row['pct_tcv'] }}</td>
                        <td>{{ $row['pct_erig'] }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="23" style="text-align: center; padding: 12px;">No recorded bite exposure cases for this period.</td>
                    </tr>
                @endforelse

                <!-- Total Row -->
                <tr class="total-row">
                    <td class="date-col"><strong>{{ $totals['inclusive_dates'] }}</strong></td>
                    <td>{{ number_format($totals['human_population']) }}</td>
                    <td>{{ $totals['male'] }}</td>
                    <td>{{ $totals['female'] }}</td>
                    <td><strong>{{ $totals['total'] }}</strong></td>
                    <td>{{ $totals['age_below_15'] }}</td>
                    <td>{{ $totals['age_15_above'] }}</td>
                    <td>{{ $totals['age_total'] }}</td>
                    <td>{{ $totals['cat_1'] }}</td>
                    <td>{{ $totals['cat_2'] }}</td>
                    <td>{{ $totals['cat_3'] }}</td>
                    <td>{{ $totals['cat_total'] }}</td>
                    <td>{{ $totals['cat_percentage'] }}</td>
                    <td>{{ $totals['no_hr'] }}</td>
                    <td>{{ $totals['tcv'] }}</td>
                    <td>{{ $totals['hrig'] }}</td>
                    <td>{{ $totals['erig'] }}</td>
                    <td>{{ $totals['dog'] }}</td>
                    <td>{{ $totals['cat'] }}</td>
                    <td>{{ $totals['others'] }}</td>
                    <td>{{ $totals['animal_total'] }}</td>
                    <td><strong>{{ $totals['pct_tcv'] }}</strong></td>
                    <td><strong>{{ $totals['pct_erig'] }}</strong></td>
                </tr>
            </tbody>
        </table>

        <!-- Signatures Block -->
        <div class="signatures-container">
            <div class="signature-block">
                <div>Prepared by:</div>
                <div class="sig-line"></div>
                <div class="sig-name">{{ $prepared_by }}</div>
                <div class="sig-title">{{ $prepared_designation }}</div>
                <div class="sig-title">Date: {{ $date_signed }}</div>
            </div>
            <div class="signature-block" style="text-align: left; margin-left: auto; width: 40%;">
                <div>NOTED:</div>
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
