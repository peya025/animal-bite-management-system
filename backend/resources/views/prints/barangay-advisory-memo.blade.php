<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barangay Bite Surveillance Advisory Memo — Brgy. {{ $barangay }}</title>
    <style>
        @page { size: A4 portrait; margin: 14mm; }
        @media print {
            .no-print { display: none !important; }
            html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #0f172a; background: #fff; line-height: 1.45; padding: 12px; }
        .no-print-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 16px; }
        .btn-print { background: #0f766e; color: #fff; border: none; padding: 7px 16px; font-size: 9pt; font-weight: 700; border-radius: 4px; cursor: pointer; }
        .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 14px; }
        .header h1 { font-size: 13pt; font-weight: 800; color: #0f172a; margin-top: 2px; }
        .header p { font-size: 8.5pt; color: #475569; }
        .memo-title { text-align: center; font-size: 11.5pt; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #991b1b; margin-bottom: 12px; }
        .memo-fields { width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1px solid #cbd5e1; }
        .memo-fields td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .memo-fields td.label { width: 130px; font-weight: 700; background: #f8fafc; color: #334155; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 14px; }
        .stat-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
        .stat-box .k { font-size: 7.5pt; text-transform: uppercase; color: #64748b; font-weight: 700; }
        .stat-box .v { font-size: 14pt; font-weight: 800; color: #0f172a; margin-top: 2px; }
        .section { margin-bottom: 13px; }
        .section h2 { font-size: 10pt; font-weight: 800; color: #0f766e; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; }
        .action-list { padding-left: 18px; }
        .action-list li { margin-bottom: 5px; }
        .disclaimer { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 10px; font-size: 8pt; color: #78350f; margin-top: 12px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 30px; }
        .sig-line { border-top: 1px solid #334155; padding-top: 5px; text-align: center; }
        .sig-name { font-weight: 700; font-size: 9.5pt; }
        .sig-role { font-size: 8pt; color: #475569; }
    </style>
</head>
<body>
<p style="border: 3px solid #555; padding: 12px; font-weight: bold;">DRAFT  -  INTERNAL REVIEW ONLY. Not an approved community advisory. Do not distribute publicly.</p>
    <div class="no-print no-print-bar">
        <span><strong>Official LGU / MAO Coordination Memorandum</strong> — Aggregate surveillance notice (Zero patient PII)</span>
        <button class="btn-print" onclick="window.print()">Print / Save PDF</button>
    </div>

    <div class="header">
        <p>Republic of the Philippines • Province of {{ $province }} • Municipality of {{ $municipality }}</p>
        <h1>{{ $clinic_name }}</h1>
        <p>Department of Health National Rabies Prevention and Control Program (NRPCP)</p>
    </div>

    <div class="memo-title">Animal Bite Surveillance Advisory &amp; Inter-Agency Coordination Notice</div>

    <table class="memo-fields">
        <tr>
            <td class="label">TO:</td>
            <td><strong>Punong Barangay (Barangay Captain), Brgy. {{ $barangay }}</strong><br>Municipal Agriculture Office (MAO) &amp; Barangay Rabies Coordinator</td>
        </tr>
        <tr>
            <td class="label">FROM:</td>
            <td>{{ $clinic_name }} ({{ $municipality }}, {{ $province }})</td>
        </tr>
        <tr>
            <td class="label">DATE:</td>
            <td>{{ $memo_date }}</td>
        </tr>
        <tr>
            <td class="label">SUBJECT:</td>
            <td><strong>Elevated Animal Bite Presentations in Brgy. {{ $barangay }} ({{ $window_7d_start }} to {{ $window_7d_end }})</strong></td>
        </tr>
    </table>

    <div class="section">
        <h2>1. Surveillance Finding</h2>
        <p>
            Routine facility-based surveillance at {{ $clinic_name }} recorded an elevated number of animal bite
            exposure presentations originating from <strong>Brgy. {{ $barangay }}</strong> during the 7-day rolling window
            (<strong>{{ $window_7d_start }}</strong> through <strong>{{ $window_7d_end }}</strong>).
        </p>
        <p style="margin-top: 5px;"><strong>Trigger Summary:</strong> {{ $reason }}</p>

        <div class="summary-grid">
            <div class="stat-box">
                <div class="k">7-Day Exposures</div>
                <div class="v">{{ $total_7d < 5 ? '< 5 (Small Cell)' : $total_7d }}</div>
            </div>
            <div class="stat-box">
                <div class="k">Finalized Cat III</div>
                <div class="v">{{ $cat_3_7d }}</div>
            </div>
            <div class="stat-box">
                <div class="k">Dogs / Cats</div>
                <div class="v">{{ $dogs_7d }} / {{ $cats_7d }}</div>
            </div>
            <div class="stat-box">
                <div class="k">Stray / Owned</div>
                <div class="v">{{ $stray_7d }} / {{ $owned_7d }}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>2. Recommended Joint Barangay &amp; MAO Actions</h2>
        <ol class="action-list">
            <li><strong>Targeted Canine Anti-Rabies Vaccination:</strong> Prioritize mass vaccination of domestic dogs and cats in Brgy. {{ $barangay }} in coordination with the Municipal Agriculture Office (MAO).</li>
            <li><strong>Stray Animal Control &amp; Responsible Pet Ownership:</strong> Enforce local leashing/confinement ordinances and conduct humane stray impounding in high-foot-traffic puroks.</li>
            <li><strong>14-Day Animal Observation Coordination:</strong> Assist Barangay Health Workers (BHWs) and pet owners in monitoring implicated domestic animals over the 14-day DOH observation period and immediately reporting animal illness or death to the ABTC and MAO.</li>
            <li><strong>Community IEC &amp; Prompt Referral:</strong> Remind residents to wash any bite or scratch immediately with soap and running water for at least 15 minutes and report promptly to {{ $clinic_name }} for clinical assessment and Post-Exposure Prophylaxis (PEP).</li>
        </ol>
    </div>

    <div class="disclaimer">
        <strong>Data Privacy &amp; Epidemiological Notice (RA 10173):</strong> This memorandum contains strictly
        aggregate facility-based bite presentation metrics with zero patient names, addresses, or personal identifiers.
        Counts represent clinic presentations for animal bite exposures and <em>do not</em> constitute laboratory-confirmed
        rabies cases.
    </div>

    <div class="signatures">
        <div class="sig-line">
            <div class="sig-name">{{ $prepared_by_name }}</div>
            <div class="sig-role">Prepared by • ABTC Focal / Surveillance Staff</div>
        </div>
        <div class="sig-line">
            <div class="sig-name">{{ $health_officer_name }}</div>
            <div class="sig-role">Noted by • Municipal Health Officer</div>
        </div>
    </div>
    <p style="margin-top: 14px; font-size: 7.5pt; color: #64748b; text-align: right;">Generated {{ $generated_at }}</p>
</body>
</html>
