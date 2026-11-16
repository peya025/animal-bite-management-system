<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bite Cases Summary — Reporting and Planning - {{ $clinic_name }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 10mm;
        }
        @media print {
            .no-print {
                display: none !important;
            }
            .page-break {
                page-break-before: always;
            }
            html, body {
                width: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
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
            color: #0f172a;
            background: #ffffff;
            line-height: 1.35;
            padding: 10px;
        }
        .no-print-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 14px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            margin-bottom: 14px;
        }
        .btn-print {
            background: #047857;
            color: #ffffff;
            border: none;
            padding: 6px 16px;
            font-size: 9pt;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
        }
        .header-banner {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 2px solid #047857;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 12px;
            font-size: 8pt;
        }
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 12px;
        }
        .kpi-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px;
            background: #ffffff;
        }
        .kpi-title {
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #475569;
        }
        .kpi-val {
            font-size: 14pt;
            font-weight: 800;
            color: #0f172a;
            margin: 2px 0;
        }
        .kpi-sub {
            font-size: 7.5pt;
            color: #475569;
        }
        .section-title {
            font-size: 9.5pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #047857;
            margin: 10px 0 5px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 2px;
        }
        table.report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.8pt;
            margin-bottom: 10px;
        }
        table.report-table th, table.report-table td {
            border: 1px solid #94a3b8;
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
        }
        table.report-table thead th {
            background: #f1f5f9;
            font-weight: bold;
        }
        .finding-card {
            border: 1px solid #cbd5e1;
            border-left: 3px solid #047857;
            border-radius: 4px;
            padding: 6px 8px;
            margin-bottom: 6px;
            background: #f8fafc;
        }
        .signatures {
            margin-top: 18px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
        }
        .sig-block {
            width: 44%;
        }
        .sig-line {
            border-bottom: 1px solid #0f172a;
            height: 28px;
            margin-bottom: 4px;
        }
    </style>
</head>
<body>
    @php
        $scope = $payload['scope'] ?? [];
        $doh = $payload['doh_summary'] ?? [];
        $pepBio = $doh['pep_and_biologics'] ?? [];
        $outcomes = $doh['completion_and_outcomes'] ?? [];
        $cats = $doh['categories'] ?? [];
        $demos = $doh['demographics'] ?? [];
        $animals = $doh['animals'] ?? [];
        $stageMatrix = $doh['stage_matrix'] ?? [];
        $cohortRows = $doh['cohort_by_category']['rows'] ?? [];
        $locations = $payload['locations'] ?? [];
        $insights = $payload['insights'] ?? [];
        $limitations = $payload['limitations'] ?? [];
        $projections = $payload['planning_projections'] ?? [];
        $supply = $projections['supply_scenarios'] ?? [];
        $popCtx = $projections['population_context'] ?? [];
        $forecast = $projections['baseline_forecast'] ?? [];
    @endphp

    <div class="no-print-bar no-print">
        <div>
            <strong>Bite Cases Summary — A4 Meeting Pack</strong>
            <span style="margin-left: 8px; color: #475569;">
                Snapshot: {{ $snapshot['snapshot_code'] ?? 'LIVE-DRAFT' }} ({{ strtoupper($snapshot['status'] ?? 'LIVE_DRAFT') }})
            </span>
        </div>
        <button class="btn-print" onclick="window.print()">Print / Save as A4 PDF</button>
    </div>

    <!-- PAGE 1: ONE-PAGE EXECUTIVE SUMMARY -->
    <div>
        <div class="header-banner">
            @include('prints.partials.logo', ['url' => $left_print_logo_url ?? null, 'side' => 'Left', 'size' => 52])
            <div style="text-align: center;">
                <div style="font-size: 8pt;">Republic of the Philippines &bull; {{ $province }} &bull; {{ $municipality }}</div>
                <div style="font-size: 11.5pt; font-weight: 800; text-transform: uppercase;">{{ $clinic_name }}</div>
                <div style="font-size: 10pt; font-weight: bold; color: #047857;">BITE CASES SUMMARY — REPORTING AND PLANNING</div>
            </div>
            @include('prints.partials.logo', ['url' => $right_print_logo_url ?? null, 'side' => 'Right', 'size' => 52])
        </div>

        <div class="meta-grid">
            <div><strong>Period:</strong> {{ $scope['period_start'] ?? '—' }} to {{ $scope['period_end'] ?? '—' }} {{ !empty($scope['is_partial_period']) ? '(Partial)' : '' }}</div>
            <div><strong>Outcome Cutoff:</strong> {{ $scope['cutoff'] ?? '—' }}</div>
            <div><strong>Snapshot / Version:</strong> {{ $snapshot['snapshot_code'] ?? 'LIVE-DRAFT' }} (v{{ $snapshot['version'] ?? 1 }})</div>
            <div><strong>Date Basis:</strong> {{ $scope['date_basis'] ?? 'exposure_date' }}</div>
            <div><strong>Review Status:</strong> {{ strtoupper($snapshot['status'] ?? 'LIVE_DRAFT') }}</div>
            <div><strong>Rule / Privacy:</strong> {{ $scope['rule_version'] ?? 'bcs-phase1-local-v1' }} ({{ $snapshot['privacy_mode'] ?? 'internal_aggregate' }})</div>
        </div>

        <div class="section-title">Headline Indicators</div>
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-title">1. Recorded Exposures</div>
                <div class="kpi-val">{{ $pepBio['recorded_exposures'] ?? 0 }}</div>
                <div class="kpi-sub">Assessed: {{ $pepBio['finalized_assessments'] ?? 0 }} &bull; Form 1 Awaiting: {{ $pepBio['awaiting_assessment'] ?? 0 }}</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-title">2. Category III Exposures</div>
                <div class="kpi-val">{{ $cats['III'] ?? 0 }}</div>
                <div class="kpi-sub">Of {{ $pepBio['finalized_assessments'] ?? 0 }} assessed &bull; Given RIG: {{ $pepBio['given_rig'] ?? 0 }}</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-title">3. PEP Started (Given PEP)</div>
                <div class="kpi-val">{{ $pepBio['given_pep'] ?? 0 }} / {{ $pepBio['new_course_prescribed'] ?? 0 }}</div>
                <div class="kpi-sub">No admin recorded: {{ $pepBio['no_administration_recorded'] ?? 0 }}</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-title">4. PEP Completion (Mature)</div>
                <div class="kpi-val">{{ $outcomes['completed_total'] ?? 0 }} / {{ $outcomes['matured_courses'] ?? 0 }}</div>
                <div class="kpi-sub">Immature active: {{ $outcomes['immature_courses'] ?? 0 }} &bull; Overdue: {{ $outcomes['overdue_episodes'] ?? 0 }}</div>
            </div>
        </div>

        <div class="section-title">Evidence-Backed Descriptive Findings</div>
        @foreach($insights as $finding)
            <div class="finding-card">
                <div style="font-weight: bold; font-size: 8.5pt;">{{ $finding['title'] ?? '' }}</div>
                <div style="font-size: 7.5pt; color: #475569; margin-bottom: 2px;">{{ $finding['supporting_metric'] ?? '' }}</div>
                <div>{{ $finding['statement'] ?? '' }}</div>
                <div style="font-style: italic; color: #047857; margin-top: 2px;">{{ $finding['recommended_review'] ?? '' }}</div>
            </div>
        @endforeach

        <div class="section-title">5-Stage Incomplete Patient Journey Matrix (Form 1 &rarr; Form 2 &rarr; Form 3)</div>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Patient's Last Completed Stage</th>
                    <th>What Can Be Reported</th>
                    <th>How Missing Information Is Shown</th>
                    <th style="text-align: right;">Episodes</th>
                </tr>
            </thead>
            <tbody>
                @foreach($stageMatrix as $row)
                    <tr>
                        <td><strong>{{ $row['stage'] ?? '' }}</strong></td>
                        <td>{{ $row['what_can_be_reported'] ?? '' }}</td>
                        <td>{{ $row['missing_info_display'] ?? '' }}</td>
                        <td style="text-align: right; font-weight: bold;">{{ $row['count'] ?? 0 }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- PAGE 2: SUPPORTING TABLES, BARANGAYS, LIMITATIONS & ACTION PLAN -->
    <div class="page-break">
        <div class="section-title">Exposure Profile &amp; Form 3 Category Cohort Outcomes</div>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Demographics (Sex &amp; Age)</th>
                    <th>Exposure Categories</th>
                    <th>Biting Animal Profile</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        Male: {{ $demos['male'] ?? 0 }} | Female: {{ $demos['female'] ?? 0 }} | Unknown: {{ $demos['unknown_sex'] ?? 0 }}<br>
                        Children &lt;15y: {{ $demos['age_below_15'] ?? 0 }} | Adults &ge;15y: {{ $demos['age_15_above'] ?? 0 }} | Age Unknown: {{ $demos['age_unknown'] ?? 0 }}
                    </td>
                    <td>
                        Cat I: {{ $cats['I'] ?? 0 }} | Cat II: {{ $cats['II'] ?? 0 }} | Cat III: {{ $cats['III'] ?? 0 }}<br>
                        Not Yet Assessed: {{ $cats['not_yet_assessed'] ?? 0 }} | Cat Missing: {{ $cats['assessed_category_missing'] ?? 0 }}
                    </td>
                    <td>
                        Dog: {{ $animals['dog'] ?? 0 }} | Cat: {{ $animals['cat'] ?? 0 }} | Other: {{ $animals['other'] ?? 0 }} | Unknown: {{ $animals['unknown'] ?? 0 }}<br>
                        Stray: {{ $animals['stray'] ?? 0 }} | Owned: {{ $animals['owned'] ?? 0 }} | Status Unk: {{ $animals['animal_status_unknown'] ?? 0 }}
                    </td>
                </tr>
            </tbody>
        </table>

        <table class="report-table">
            <thead>
                <tr>
                    <th>WHO Category</th>
                    <th style="text-align: right;">Assessed Cases</th>
                    <th style="text-align: right;">Given PEP</th>
                    <th style="text-align: right;">No Admin Recorded</th>
                    <th style="text-align: right;">Completed (Mature)</th>
                    <th style="text-align: right;">Given RIG (ERIG/HRIG)</th>
                    <th style="text-align: right;">Transferred</th>
                </tr>
            </thead>
            <tbody>
                @foreach($cohortRows as $cRow)
                    <tr>
                        <td><strong>Category {{ $cRow['category'] }}</strong></td>
                        <td style="text-align: right;">{{ $cRow['cases'] }}</td>
                        <td style="text-align: right;">{{ $cRow['given_pep'] }}</td>
                        <td style="text-align: right;">{{ $cRow['no_administration_recorded'] }}</td>
                        <td style="text-align: right;">{{ $cRow['completed'] }}</td>
                        <td style="text-align: right;">{{ $cRow['given_rig'] }} ({{ $cRow['erig'] }}/{{ $cRow['hrig'] }})</td>
                        <td style="text-align: right;">{{ $cRow['transferred'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="section-title">Barangay Distribution {{ !empty($scope['small_cell_suppression_applied']) ? '(Conference Small-Cell Suppression <5 Active)' : '' }}</div>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Barangay</th>
                    <th>Scope</th>
                    <th style="text-align: right;">Recorded Cases</th>
                    <th style="text-align: right;">Cat III</th>
                    <th style="text-align: right;">Given PEP / No Admin</th>
                    <th style="text-align: right;">Overdue</th>
                </tr>
            </thead>
            <tbody>
                @forelse(array_slice($locations, 0, 12) as $loc)
                    <tr>
                        <td><strong>{{ $loc['normalized_barangay'] ?? $loc['location'] }}</strong></td>
                        <td>{{ $loc['geography_scope'] ?? $loc['location_level'] ?? 'Barangay' }}</td>
                        <td style="text-align: right; font-weight: bold;">
                            {{ $loc['display_total_cases'] ?? $loc['total_cases'] ?? 0 }}
                        </td>
                        <td style="text-align: right;">
                            {{ !empty($loc['is_small_cell_suppressed']) ? 'Suppressed (<5)' : ($loc['cat_3'] ?? 0) }}
                        </td>
                        <td style="text-align: right;">
                            {{ !empty($loc['is_small_cell_suppressed']) ? 'Suppressed (<5)' : (($loc['given_pep'] ?? 0) . ' / ' . ($loc['no_administration_recorded'] ?? 0)) }}
                        </td>
                        <td style="text-align: right;">
                            {{ !empty($loc['is_small_cell_suppressed']) ? 'Suppressed (<5)' : ($loc['overdue_episodes'] ?? $loc['overdue_doses'] ?? 0) }}
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" style="text-align: center;">No barangay records in this period.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <div class="section-title">Proposed Actions &amp; Follow-Up Register</div>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Observed Pattern &amp; Supporting Metric</th>
                    <th>Proposed Action</th>
                    <th>Owner &amp; Due Date</th>
                    <th>Target &amp; Status</th>
                </tr>
            </thead>
            <tbody>
                @forelse($actions as $act)
                    <tr>
                        <td>
                            <strong>{{ $act['observed_pattern'] }}</strong><br>
                            <span style="font-size: 7pt; color: #475569;">{{ $act['supporting_metric'] }}</span>
                        </td>
                        <td>{{ $act['proposed_action'] }}</td>
                        <td>{{ $act['owner_name'] }}<br><span style="font-size: 7pt;">Due: {{ $act['due_date'] ?? 'TBD' }}</span></td>
                        <td>
                            {{ $act['target_measure'] ?? '—' }}<br>
                            <strong>Status: {{ $act['status'] }}</strong>
                            @if(!empty($act['review_outcome']))
                                <br><span style="font-size: 7pt;">Outcome: {{ $act['review_outcome'] }}</span>
                            @endif
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" style="text-align: center;">No action register entries recorded yet for this clinic.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        @if(!empty($supply))
            <div class="section-title">Supply Scenario Projections &amp; Catchment Population Context</div>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Usable Inventory &amp; Expiry</th>
                        <th>Conservative (1 dose/vial)</th>
                        <th>Intradermal Sharing (2 doses/vial)</th>
                        <th>Population Catchment &amp; Run-rate</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            Usable ARV: <strong>{{ $supply['usable_stock']['arv_vials'] ?? 0 }} vials</strong><br>
                            Usable RIG: <strong>{{ $supply['usable_stock']['rig_vials'] ?? 0 }} vials</strong><br>
                            Expiring &le;30d: {{ $supply['usable_stock']['arv_expiring_within_30d'] ?? 0 }} ARV / {{ $supply['usable_stock']['rig_expiring_within_30d'] ?? 0 }} RIG
                        </td>
                        <td>
                            30d Demand: {{ $supply['scenarios']['conservative_im']['projected_30d_vials'] ?? 0 }} vials<br>
                            Days Remaining: <strong>{{ $supply['scenarios']['conservative_im']['days_of_stock_remaining'] ?? '—' }} days</strong><br>
                            Risk: <span style="text-transform: uppercase;">{{ $supply['scenarios']['conservative_im']['stockout_risk'] ?? 'adequate' }}</span>
                        </td>
                        <td>
                            30d Demand: {{ $supply['scenarios']['intradermal_sharing']['projected_30d_vials'] ?? 0 }} vials<br>
                            Days Remaining: <strong>{{ $supply['scenarios']['intradermal_sharing']['days_of_stock_remaining'] ?? '—' }} days</strong><br>
                            Reorder: {{ $supply['scenarios']['intradermal_sharing']['suggested_reorder_vials'] ?? 0 }} vials
                        </td>
                        <td>
                            Catchment: {{ number_format($popCtx['catchment_population'] ?? 75000) }} pop<br>
                            Rate: <strong>{{ $popCtx['rate_per_100k_period'] ?? '—' }} / 100k</strong> ({{ $popCtx['annualized_rate_per_100k'] ?? '—' }} ann.)<br>
                            Baseline Proj: ~{{ $forecast['projected_next_month_presentations'] ?? 0 }} next mo
                        </td>
                    </tr>
                </tbody>
            </table>
        @endif

        <div class="section-title">Key Data Limitations &amp; Source References</div>
        <ul style="padding-left: 16px; font-size: 7.5pt; margin-bottom: 10px;">
            @foreach($limitations as $lim)
                <li>{{ $lim }}</li>
            @endforeach
            <li>Source Templates Reconciled: Form 1 (Rabies Exposure Registry), Form 2 (ABTC Monthly Report), and Form 3 (Quarterly Cohort Report).</li>
        </ul>

        <div class="signatures">
            <div class="sig-block">
                <div>Prepared by:</div>
                <div class="sig-line"></div>
                <div style="font-weight: bold;">{{ $snapshot['prepared_by_name'] ?? 'Authorized ABTC Staff' }}</div>
                <div style="font-size: 7.5pt; color: #475569;">Generated: {{ $snapshot['generated_at'] ?? now()->format('Y-m-d H:i') }}</div>
            </div>
            <div class="sig-block">
                <div>Reviewed / Noted by:</div>
                <div class="sig-line"></div>
                <div style="font-weight: bold;">{{ $snapshot['reviewed_by_name'] ?? 'ABTC Medical Coordinator / Report Owner' }}</div>
                <div style="font-size: 7.5pt; color: #475569;">Status: {{ strtoupper($snapshot['status'] ?? 'LIVE_DRAFT') }}</div>
            </div>
        </div>
    </div>
</body>
</html>
