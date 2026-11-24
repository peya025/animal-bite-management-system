<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Shift Turnover Slip — {{ $clinic_name }}</title>
    <style>
        @page { size: A4 portrait; margin: 11mm; }
        @media print {
            .no-print { display: none !important; }
            html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #0f172a; background: #fff; line-height: 1.35; padding: 10px; }
        .no-print-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 12px; }
        .btn-print { background: #0f766e; color: #fff; border: none; padding: 6px 14px; font-size: 8.5pt; font-weight: 700; border-radius: 4px; cursor: pointer; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f766e; padding-bottom: 6px; margin-bottom: 10px; }
        .header h1 { font-size: 12pt; font-weight: 800; }
        .header .sub { font-size: 8pt; color: #475569; }
        .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
        .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 9px; background: #f8fafc; }
        .kpi .k { font-size: 7pt; text-transform: uppercase; font-weight: 700; color: #64748b; }
        .kpi .v { font-size: 13pt; font-weight: 800; margin-top: 2px; }
        .section { margin-bottom: 10px; }
        .section h2 { font-size: 9pt; font-weight: 800; color: #0f766e; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 8pt; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 7px; text-align: left; }
        th { background: #f1f5f9; font-weight: 700; color: #334155; }
        .alert-red { color: #b91c1c; font-weight: 700; }
        .alert-amber { color: #b45309; font-weight: 700; }
        .prep-box { border: 1.5px solid #0f766e; border-radius: 6px; padding: 8px 10px; background: #f0fdfa; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .sigs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 22px; }
        .sig { border-top: 1px solid #334155; padding-top: 4px; text-align: center; font-size: 7.5pt; color: #475569; }
        .sig strong { display: block; color: #0f172a; font-size: 8.5pt; }
    </style>
</head>
<body>
    <div class="no-print no-print-bar">
        <span><strong>Internal Clinic Shift Handover Slip</strong> — Confidential clinical operational endorsement</span>
        <button class="btn-print" onclick="window.print()">Print Turnover Slip</button>
    </div>

    <div class="header">
        <div>
            <h1>{{ $clinic_name }} — Daily Shift Turnover Slip</h1>
            <div class="sub">{{ $municipality }}, {{ $province }} • Operational Handover Date: <strong>{{ $turnover_date }}</strong></div>
        </div>
        <div class="sub" style="text-align: right;">
            Prepared by: <strong>{{ $prepared_by_name }}</strong><br>
            Printed: {{ $generated_at }}
        </div>
    </div>

    <div class="kpi-row">
        <div class="kpi">
            <div class="k">Form 1 Registered Today</div>
            <div class="v">{{ $today_volumes['form1_registrations'] }}</div>
        </div>
        <div class="kpi">
            <div class="k">Form 2 Assessed Today</div>
            <div class="v">{{ $today_volumes['form2_assessments'] }}</div>
        </div>
        <div class="kpi">
            <div class="k">Form 3 ARV / RIG Given</div>
            <div class="v">{{ $today_volumes['form3_arv_doses'] }} / {{ $today_volumes['form3_rig_doses'] }}</div>
        </div>
        <div class="kpi">
            <div class="k">Vials Opened / Wasted</div>
            <div class="v">{{ $vial_summary_today['vials_opened'] }} vials ({{ $vial_summary_today['portions_wasted'] }} disc.)</div>
        </div>
    </div>

    <div class="section prep-box">
        <h2>Tomorrow&apos;s Expected Follow-Ups &amp; Morning Cold-Chain Preparation</h2>
        @if($tomorrow_prep)
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 4px;">
                <div><strong>Date:</strong><br>{{ $tomorrow_prep['day_label'] }} ({{ $tomorrow_prep['is_open'] ? 'Open' : 'Closed' }})</div>
                <div><strong>Scheduled Follow-Ups:</strong><br>{{ $tomorrow_prep['committed_followups'] }} patient(s) (D3: {{ $tomorrow_prep['dose_breakdown']['d3'] }}, D7: {{ $tomorrow_prep['dose_breakdown']['d7'] }}, D28: {{ $tomorrow_prep['dose_breakdown']['d28'] }})</div>
                <div><strong>Est. Walk-In D0:</strong><br>{{ $tomorrow_prep['expected_walkin_d0'] }} dose(s)</div>
                <div><strong>ARV Vials to Prepare:</strong><br><strong style="font-size: 10pt; color: #0f766e;">{{ $tomorrow_prep['vials_realistic'] }} vial(s)</strong> (floor: {{ $tomorrow_prep['vials_committed_only'] }})</div>
            </div>
        @else
            <p>No scheduled follow-up data available for tomorrow.</p>
        @endif
        <p style="margin-top: 6px; font-size: 8pt;">
            <strong>Current Usable Stock:</strong> {{ $vial_summary_today['usable_arv_vials'] }} ARV vial(s) • {{ $vial_summary_today['usable_rig_vials'] }} RIG vial(s) —
            <span class="{{ ($vial_readiness['status'] ?? 'ok') === 'shortfall' ? 'alert-red' : '' }}">{{ $vial_readiness['headline'] ?? 'Covered' }}</span>
        </p>
    </div>

    <div class="section">
        <h2>Priority Endorsement 1: Unadministered RIG (Category III / Indicated) — {{ count($rig_pending_list) }}</h2>
        @if(count($rig_pending_list) === 0)
            <p style="color: #059669; font-weight: 600;">Clear — No active Category III / RIG-indicated episodes awaiting RIG administration.</p>
        @else
            <table>
                <thead>
                    <tr>
                        <th>Case #</th>
                        <th>Patient Name</th>
                        <th>Contact</th>
                        <th>Bite Date</th>
                        <th>RIG Ordered</th>
                        <th>Elapsed</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($rig_pending_list as $row)
                        <tr>
                            <td><strong>{{ $row['case_number'] }}</strong></td>
                            <td>{{ $row['patient_name'] }}</td>
                            <td>{{ $row['contact'] }}</td>
                            <td>{{ $row['bite_date'] }}</td>
                            <td class="alert-red">{{ $row['rig_indicated'] }}</td>
                            <td>{{ $row['hours_elapsed'] !== null ? $row['hours_elapsed'] . 'h' : '—' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

    <div class="two-col">
        <div class="section">
            <h2>Priority Endorsement 2: Biting Animal Died / Sick ({{ count($high_risk_animals_list) }})</h2>
            @if(count($high_risk_animals_list) === 0)
                <p style="color: #059669; font-weight: 600;">Clear — No open episodes with dead/sick biting animal.</p>
            @else
                <table>
                    <thead>
                        <tr><th>Case #</th><th>Patient</th><th>Animal</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        @foreach($high_risk_animals_list as $row)
                            <tr>
                                <td><strong>{{ $row['case_number'] }}</strong></td>
                                <td>{{ $row['patient_name'] }}</td>
                                <td>{{ $row['animal'] }}</td>
                                <td class="alert-red">{{ $row['condition'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </div>

        <div class="section">
            <h2>Day-14 Owned Animal Observation Checks Due ({{ count($day14_due_list) }})</h2>
            @if(count($day14_due_list) === 0)
                <p style="color: #64748b;">No owned-animal Day-14 observation checks currently due.</p>
            @else
                <table>
                    <thead>
                        <tr><th>Case #</th><th>Patient</th><th>Animal</th><th>Day</th></tr>
                    </thead>
                    <tbody>
                        @foreach($day14_due_list as $row)
                            <tr>
                                <td><strong>{{ $row['case_number'] }}</strong></td>
                                <td>{{ $row['patient_name'] }}</td>
                                <td>{{ $row['animal'] }}</td>
                                <td class="alert-amber">Day {{ $row['day'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </div>
    </div>

    <div class="sigs">
        <div class="sig">
            <strong>{{ $prepared_by_name }}</strong>
            Outgoing Shift Nurse / Staff
        </div>
        <div class="sig">
            <strong>&nbsp;</strong>
            Incoming Shift Nurse (Received by)
        </div>
        <div class="sig">
            <strong>&nbsp;</strong>
            Physician / Clinic Supervisor
        </div>
    </div>
</body>
</html>
