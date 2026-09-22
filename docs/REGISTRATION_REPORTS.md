# Registration Reports & Analytics

Registration staff see a dedicated clinical report page at `/reports`. It contains Overview, PEP & Follow-up, and Bite Surveillance. Inventory is excluded from this page; other roles retain their existing reports view.

## Reports

- Clinic Summary: period incident counts, exposure categories, D0 starts, completion, delay, referrals, and explicitly labeled current actions.
- PEP Treatment Outcomes: selected D0 cohort with prescribed and received dose days, completion date, and outcome.
- Overdue Doses & Follow-up: current missing prescribed doses, latest recorded schedule, last administered dose, contact number, and latest reminder send status.
- Awaiting First Dose: current approved courses without a recorded D0.
- Bite Surveillance: selected incident-date records with category, age at incident, animal type/ownership, and recorded bite barangay.
- Referrals & Transfers: referral/transfer events attached to incident cases in the selected incident-date period, observed through today.

Filters apply on **Apply**. Exports use the applied filters, not unsaved filter edits. CSV and print include all matching records, not just the visible page. Print directly invokes the browser print / Save as PDF dialog in-place without opening another tab.

## Metric definitions

`GET /api/reports/registration?from=YYYY-MM-DD&to=YYYY-MM-DD&category=ALL&report=summary`

Optional `report`: `summary`, `pep`, `followup`, `awaiting`, `surveillance`, `referrals`. Optional `format`: `json` (default), `csv`, `print` (unpaginated JSON for the printable view). Record pagination: `page`, `per_page` (maximum 100). The authenticated user's clinic scopes all data; no client clinic override is supported.

- **PEP vaccine-course completion**: complete eligible courses / eligible courses. A course must have a recorded D0, a verified approved/completed plan with prescribed dose days, and all scheduled course days due as of today. Transfers, cancelled/discontinued courses, no-vaccine decisions, and unverified regimens are excluded. A distinct non-voided completed administration with a treatment date is required for each prescribed dose day. Duplicate administrations do not inflate completion; booster courses use their actual orders. Eligible is a denominator definition, not a clinical judgment.
- **Comparison**: previous equal-length D0 start cohort. Both cohorts use outcomes observed today, not historical snapshots. Follow-up durations differ; the page states this limitation.
- **Delay**: calendar days between incident date and the first valid D0 administration, for D0 starts in the period. Average, median, range, and sample size are reported. Negative intervals are excluded and counted. Date-only data do not support hours or a 24-hour compliance judgment.
- **Overdue**: a prescribed dose not recorded as given whose latest recorded appointment/scheduled dose date is before today. If no schedule exists, the prescribed offset from D0 is used and labeled. Cancelled appointments, transfers, and discontinued courses do not generate follow-up rows. Today is not overdue. Returned doses clear the corresponding signal.
- **Location**: only structured incident locations from `bite_locations`; patient home addresses are never substituted.
- **Age**: age at incident, rather than current age. Surveillance distributions count episodes; unique-patient counts are separate.
- **Referral rate**: distinct incident cases with a recorded outgoing referral or transfer / incidents in the selected period. Multiple referrals on one case do not inflate the rate.
- No hourly incident measure, animal vaccination breakdown, or confirmed lost-to-follow-up rate is fabricated from missing data. The page identifies these gaps. A reminder send status does not establish a completed contact attempt with the patient.

No schema migration or patient data modification is required.

## Verification

Backend: `php artisan test tests/Feature/RegistrationReportsTest.php`

Frontend: `npm run build`

Browser checks: `npm run test:registration -- reports.spec.ts` (synthetic mocked API, no patient data writes).
