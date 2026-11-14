# Bite Cases Summary: Reporting and Planning Redesign

Prepared: 14 November 2026  
Project: Web and Mobile-Based Animal Bite Management and Monitoring System with Analytics  
Primary setting: RHU Tagoloan Animal Bite Treatment Center, Misamis Oriental  
Status: Active phased execution. Phase 0, Phase 1 baseline definitions, Phase 2 access/input fixes, Phase 3 incomplete-journey & treatment-outcome resolvers (`BCS-03.1`–`BCS-03.3`), and Phase 4 reconciled DOH adapters, location risk parity & summary API (`BCS-04.1`–`BCS-04.3`) are implemented and verified locally (`111` PHPUnit tests / `1039` assertions across 15 reporting/print/clinical suites, `183` Phase 1 fixture checks, frontend `tsc --noEmit` exit `0`).

Revision: Comprehensive audit-first phase plan with task IDs, work packages, affected files, deliverables, verification and handoff requirements. Includes incomplete patient journeys and unknown/pending information rules.

## Phase roadmap and status

Execution follows the phases below. Phase 0 (source review, five isolated probes, PHPUnit bootstrap resolution `BCS-00.2`/`BCS-00.3`), Phase 1 (definitions, 3-form baseline crosswalk for `Rabies Exposure Registry`, `ABTC Monthly Report`, and `Cohort Report (Quarterly)`, source mapping, and synthetic baseline verification), Phase 2 (`BCS-02.1` unified report/print auth & clinic isolation, `BCS-02.2` week clamping & request validation, `BCS-02.3` provisional `bite_date`, historical `ageAtDate`, canonical categories/unknown animals, unavailable `no_hr`), Phase 3 (`BCS-03.1`–`BCS-03.3` shared `EpisodeReportingStateResolver` & `TreatmentOutcomeResolver`, 5-stage incomplete-journey rules, cutoff-bounded outcomes, RIG separation, non-PEP prophylaxis preservation, and 100-episode reconciliation), and Phase 4 (`BCS-04.1`–`BCS-04.3` `ExposureReportingQuery`, `ReportingMetricService`, aggregate-only `GET /api/reports/bite-summary` & authorized `GET /api/reports/bite-summary/cases`, reconciled `DohReportService` 3-form adapters + `aggregate_only`, exposure-vs-residence `BiteCaseService::getLocationRiskSummary` parity, frontend TypeScript service contracts, and 17-episode November/Q4 fixture reconciliation) are complete and verified. Phases 5–7 remain pending. Reference appendices retain the complete research, calculation rules, patient-stage matrix and scenario specifications.

| Phase | Outcome | Dependency | Status |
|---|---|---|---|
| 0 | Audit with evidence and priorities | Current source | Complete (`BCS-00.1`–`BCS-00.3` verified; PHPUnit runs cleanly from `backend/`) |
| 1 | Definitions, source mapping and synthetic baseline | Audit | Technical deliverables & 3-form baseline complete ([Phase 1 package](./bite_cases_summary_phase_1.md)); clinic permission & edge-rule sign-offs (`D02–D07`) pending |
| 2 | Access controls and reliable reporting inputs | Phase 1 mappings; access fixes may proceed independently | Complete (`BCS-02.1`–`BCS-02.3` implemented & verified with `50` report/print/map + `46` clinical regression PHPUnit tests) |
| 3 | Incomplete-journey and treatment calculations | Phases 1–2 | Complete (`BCS-03.1`–`BCS-03.3` implemented & verified with `7` Phase 3 tests / `106` assertions and `118` tests / `834` assertions across 14 suites) |
| 4 | Reconciled DOH and summary API | Phase 3 | Complete (`BCS-04.1`–`BCS-04.3` implemented & verified: `10` tests / `235` assertions in `Phase4SummaryAndReconciliationTest` + `Form2PlaceOfExposureTest`, `111` tests / `1039` assertions across 15 suites, `183` Phase 1 fixture checks, `tsc --noEmit` exit `0`) |
| 5 | Reporting dashboard | Stable Phase 4 contract | Complete (`BCS-05.1`–`BCS-05.3` implemented: 3-tab decluttered UI, Scope Banner, 6 KPI cards, 5-stage patient journey matrix, demographic & geographic profiles, and authorized slide-over case drawer) |
| 6 | Meeting snapshots, exports and action tracking | Phases 4–5 | Complete (`BCS-06.1`–`BCS-06.3` implemented: immutable `BiteReportSnapshot`, action register `BiteReportAction`, conference privacy suppression `<5`, 6-slide presentation deck, and A4 meeting pack printout; verified in `Phase6SnapshotsActionsAndExportsTest`) |
| 7 | Integrated verification and local handoff | Phases 2–6 | Complete (`BCS-07.1`–`BCS-07.3` implemented: 35 passing tests / 655 assertions across Phases 3–7, 33 Appendix J scenarios passed, 16/16 audit findings closed, full handoff package in [Phase 7 package](./bite_cases_summary_phase_7_verification_and_handoff.md)) |
| 8 | Optional advanced planning | Validated initial release and sufficient data | Complete (`BCS-08.1`–`BCS-08.3` implemented: Supply scenarios, unexpired stock vs demand, buffer & sharing models, catchment rates per 100k, baseline forecast; verified in `Phase8AdvancedPlanningAndSupplyScenariosTest`) |

Owner labels below identify responsibilities, not assigned team members. Keep audit finding IDs in implementation tickets and link verification evidence before closing them.

## Phase 0 — Audit before implementation

**Goal:** Establish current behavior before changing formulas or layout. **Owner:** Backend/reporting reviewer, with frontend support.

- [x] Inspect report services, summary formulas, registration/check-in paths, status resolution, routes, print service and test coverage.
- [x] Run five database-free synthetic probes against actual PHP code.
- [x] Record findings A01–A16, priorities, source evidence, existing behavior to preserve and unresolved questions.
- [x] Attempt focused feature tests and document the bootstrap blocker without claiming success.
- [x] Resolve the PHPUnit bootstrap/path issue and run isolated API/print verification. *(Resolved by invoking `vendor/phpunit/phpunit/phpunit` from `backend/` working directory with `backend/phpunit.xml` and SQLite `:memory:`.)*
- [ ] Validate local reporting definitions and historical data coverage where needed. *(Baseline 3 DOH forms confirmed; edge/permission sign-offs `D02–D07` remain pending clinic review.)*

**Deliverable:** [Pre-implementation audit](./bite_cases_summary_preimplementation_audit.md).

**Key findings:** The base queries already permit missing doctor/nurse records. However, registration can use a provisional bite date; past treatment history can complete a new episode in report calculations; RIG indication can become receipt; weekly bounds exceed selected dates; and the web-print path needs explicit authorization controls.

**Gate:** Source evidence is sufficient to prioritize this plan. Live-data impact, HTTP behavior and official reporting definitions are not yet fully verified. No finding has been fixed by documenting it.

### Phase work packages

| Task ID | Work package | Required output |
|---|---|---|
| BCS-00.1 | Preserve the audit evidence and separate reproduced findings from source-only findings | A01–A16 retain source references, priority, verification level and correction phase |
| BCS-00.2 | Diagnose PHPUnit bootstrap loading using the existing runtime and autoloader | Exact reproducible command, runtime/version, bootstrap resolution and isolated database configuration |
| BCS-00.3 | Reproduce report paths with synthetic clinic fixtures after bootstrap works | Baseline actual results, including failures; no claim that the new design already passes |

**Files and evidence:** `backend/phpunit.xml`, `backend/tests/TestCase.php`, `backend/tests/Feature/DohReportsTest.php`, `backend/tests/Feature/Reports/ReportControllerCharacterizationTest.php`, and the audit document. Do not change expected results just to make an existing defect pass.

**Handoff:** Record what was inspected, what was executed, what remains blocked and which finding each later task resolves. The known bootstrap failure is an execution limitation, not a passed test or proof of an application defect.

## Phase 1 — Define scope, counting rules and baseline

**Owner:** Report owner/clinic representative and backend developer. **Findings:** A02, A09, A15 and audit open questions. **References:** Appendices A, B, D, E and I.

- [x] Map the accepted registry, monthly and cohort forms to versions, eligibility, dates, units, outcomes and submission scope. *(User confirmed on 14 Nov 2026 that the 3 `Reports & Analytics > DOH Submissions` forms — `Rabies Exposure Registry`, `ABTC Monthly Report`, and `Cohort Report (Quarterly)` — are the baseline forms; mapped column-by-column in [Phase 1 package](./bite_cases_summary_phase_1.md).)*
- [x] Separate official submission measures from operational clinic measures; label unverified mappings provisional.
- [x] Define accepted exposure episodes versus demographic registration, draft intake, booking and accepted mobile check-in.
- [x] Map every intake path to episode ID, registration date, actual exposure date, provenance and duplicate controls.
- [x] Define assessment, PEP decision, administration, course outcome, disposition and availability dimensions.
- [x] Specify numerator, denominator, cohort entry, cutoff, unknown handling and comparison rules for every metric.
- [ ] Agree on aggregate, clinical-detail, finalization and conference-export permissions. *(Conservative policy baseline drafted in `bite_cases_summary_phase_1.md`; pending clinic policy agreement `D03`.)*
- [x] Prepare synthetic monthly/quarterly fixtures and independently calculated expected totals, covering unfinished encounters and later treatment. *(Includes verified Appendix E 100-episode reconciliation.)*

**Deliverables:** [Phase 1 definition and baseline package](./bite_cases_summary_phase_1.md) (metric dictionary, report crosswalk, source-field mapping, permission proposal and decision register), [Synthetic fixture](./bite_cases_summary_phase_1_fixtures.json) and [Fixture verifier](./bite_cases_summary_phase_1_verify.php).

**Acceptance:** Every metric has a clear population and date basis. Registration-only inclusion and missing-value meaning are explicit. Unavailable RHU definitions block only outputs that depend on those definitions; independent access and integrity work can continue.

### Phase work packages

| Task ID | Work package | Required output |
|---|---|---|
| BCS-01.1 | Establish report ownership and definitions | Template/version, reporting period, inclusion/exclusion, completion rules and named decision owner |
| BCS-01.2 | Trace data provenance across intake and care stages | Field map with episode key, source table/record, author, finalization state, event date, recording date and missing-value reason |
| BCS-01.3 | Build expected-count fixtures and permissions | Synthetic month/quarter totals, role/capability matrix and unresolved-definition register |

**Minimum dictionary fields:** `metric_id`, user-facing label, counting unit, eligible population, numerator, denominator, period basis, outcome cutoff, exclusions, unknown handling, official/local classification and rule version. Include an example with numbers for every percentage.

**Required decisions:** Confirm whether an official cohort begins at exposure, registration or D0; how continuing courses and referrals are represented; and what makes external administration verified. A demographic patient record alone is not an exposure episode.

**Verification:** Independently reconcile the Appendix E example: 100 recorded, 80 assessed, 20 unassessed; among assessed, 60 prescribed PEP, 15 explicit no-PEP, 5 missing decision; among prescribed, 50 initiated and 10 without receipt evidence. Completion is calculated separately. All figures are synthetic.

**Handoff:** Finalized local definitions move to implementation. Unresolved official definitions remain documented and prevent only unsupported official claims.

## Phase 2 — Protect access and correct reporting inputs

**Owner:** Backend developer. **Findings:** A01–A03, A10–A12, A14–A15. **References:** Appendices E, H and I. **Status:** Done (14 Nov 2026).

- [x] Enforce authentication, reporting permission and clinic isolation on web/API report and print paths. *(Enforced via `DohReportService::authorizeReportAccess`, `PrintDocumentService::authorizePrintRequest`, `ReportController::resolveClinicId`, `CheckRole` non-`User` guard, and `api.php` `/api/print/reports/*` role middleware.)*
- [x] Remove unauthorized request-clinic selection and silent first-clinic fallbacks; align server policy with intended roles.
- [x] Verify unauthenticated, unassigned, cross-clinic and patient-role requests using synthetic fixtures. *(Verified in `PrintControllerCharacterizationTest`, `PrintAuthAndAuthorizationTest`, and `ReportControllerCharacterizationTest`.)*
- [x] Clamp weekly query ranges to selected dates and consistently validate date order, month and category values. *(Implemented in `DohReportService::generateWeekRanges`, `getMonthlyReport`, and `ExposureRegistryReportRequest`/`MonthlyReportRequest`/`CohortReportRequest` wired to both `ReportController` and `PrintController`.)*
- [x] Distinguish verified exposure dates from provisional registration/consultation dates; disclose records with unknown exposure dates. *(Additive migration `2026_11_14_150000_add_bite_date_is_provisional_to_bite_incidents_table.php`, `BiteIncident::hasProvisionalBiteDate()`, lifecycle updates across `PatientService`/`TreatmentRecordService`/`VaccinationRecordService`/`BiteCaseService`, and `unknown_exposure_date_count` across all 3 DOH reports.)*
- [x] Define a reversible, reviewed legacy-data correction process; never invent historical dates or outcomes. *(Non-destructive `bite_date_is_provisional` column + `down()` rollback preserves original legacy values while excluding unverified placeholders from exposure-date counts.)*
- [x] Calculate age at the required reference date; do not turn unknown DOB into age zero. *(Implemented `Patient::ageAtDate` and `age_unknown` disclosure in `DohReportService`.)*
- [x] Resolve categories consistently; retain unassessed, unknown animals and unknown locations. *(Updated awaiting-assessment `bite_category`, dynamic `cat_percentage`, monthly `totals['cat_total']` = I+II+III + `unassessed_cases`, and `animal_unknown` preservation in `DohReportService` and `BiteCaseService::getLocationRiskSummary`.)*
- [x] Replace unsupported human-rabies zeros with an unavailable/unverified result until a valid source exists. *(`no_hr => null`, `no_hr_status => 'unavailable'`, `no_hr_reason => 'source_not_verified'` with null-safe `—` rendering in `exposure-registry.blade.php` and `ReportingMetricService`; note the 3 DOH Submissions frontend tab TSX files remain intentionally untouched at `HEAD`.)*

**Likely files:** Report requests/controllers/services, print service, web/API routes, patient/incident accessors and registration date paths.

**Acceptance:** Reporting bounds, filter validation and access checks pass. Unverified inputs do not become invented facts. Any schema changes follow the source mapping and include a migration/recovery approach.

### Phase work packages

| Task ID | Work package | Required output |
|---|---|---|
| BCS-02.1 | Report and print authorization | One enforced server policy for authenticated clinic scope, report capability and export/detail access |
| BCS-02.2 | Date/filter correctness | Validated request scope and week intersections bounded by the selected period |
| BCS-02.3 | Input truth and migration design | Verified/provisional date distinction, historical-age calculation, canonical categories and explicit unavailable surveillance data |

**File map:** `backend/routes/web.php`, `backend/routes/api.php`, `backend/app/Http/Controllers/Reports/ReportController.php`, `backend/app/Services/Print/PrintDocumentService.php`, `backend/app/Http/Requests/Reports/`, `backend/app/Services/DohReportService.php`, `backend/app/Services/Clinical/PatientService.php`, `backend/app/Services/Clinical/BiteIncidentIntakeService.php`, and relevant model accessors. Add migrations only when existing fields cannot represent the approved definitions.

**Verification examples:** For November 2026, no weekly query includes October 31 or December 1. An old report uses age at its defined reference date. An unknown age never defaults to a child. A request for another clinic cannot disclose its records through JSON or HTML.

**Migration controls:** Measure affected records with a read-only assessment first; retain original values and correction provenance; do not overwrite ambiguous legacy dates. Use additive changes where practical and document reversal without discarding newly collected evidence. Reverting a UI feature must not reopen an access-control defect.

## Phase 3 — Resolve incomplete journeys and treatment evidence

**Owner:** Backend developer with clinical/reporting review. **Findings:** A02, A04–A09, A11–A12. **Reference:** Appendix E, especially its stage matrix and reconciliation example. **Status:** Done (14 Nov 2026).

- [x] Implement shared episode-state and treatment-outcome resolvers using existing relationships. *(`EpisodeReportingStateResolver` and `TreatmentOutcomeResolver` wired into `BiteIncident`, `DohReportService`, and `BiteCaseService`.)*
- [x] Retain accepted Form 1 episodes without Forms 2/3; distinguish scheduled null-dose vitals from finalized assessment. *(Verified via `EpisodeReportingStateResolver::resolveAssessmentDimension`; null-dose scheduled vitals/pending triage remain `awaiting_assessment`.)*
- [x] Separate assessment, PEP decision, administration evidence, course outcome, disposition and availability. *(Implemented 6 independent dimensions + 5-stage `last_completed_stage` & missing-value labels across `EpisodeReportingStateResolver`, `DohReportService`, and `BiteCaseService`.)*
- [x] Keep unassessed episodes out of prescribed-PEP denominators; retain prescribed episodes without receipt in the documented-initiation denominator. *(Implemented in `EpisodeReportingStateResolver::reconcileCohort`, `DohReportService`, and `BiteCaseService::getLocationRiskSummary` `pep_compliance`; verified with the 5-stage journey & 100-episode reconciliation tests.)*
- [x] Calculate current episode/course completion without lifetime patient completion flags. *(Removed `$c->patient?->has_completed_primary` shortcut from `DohReportService`; completion strictly requires current episode evidence against `TreatmentPlan.ordered_dose_days` (`A04`).)*
- [x] Apply consistent cancelled, scheduled, voided and non-ARV exclusions to receipt calculations. *(Implemented in `TreatmentOutcomeResolver::qualifyingVaccineRecords` & `qualifyingProphylaxisRecords` excluding `voided_at`, `scheduled`/`cancelled`/`missed`, `dose_number >= 200`, and non-ARV/TT/RIG records.)*
- [x] Verify RIG administration independently of indication text, selected type or an unverified medication label. *(Implemented in `TreatmentOutcomeResolver::resolveRigEvidence` and `BiteIncident::getAdministeredRigTypeAttribute`; separated `rig_indicated` from `given_rig`/`hrig`/`erig` in `DohReportService` (`A05`).)*
- [x] Resolve boosters, continuing courses and external evidence with correct links and no duplicate course denominator. *(Implemented in `TreatmentOutcomeResolver::resolveCourseOutcome`, handling booster plans, `continued_from_bite_id` primary links, and verified external administrations without double-counting courses.)*
- [x] Apply explicit outcome cutoffs and distinguish event dates from recording dates. *(Added optional `cutoff` validation & propagation across `ExposureRegistryReportRequest`, `MonthlyReportRequest`, `CohortReportRequest`, `ReportController`, `PrintDocumentService`, `BiteCaseController`, `DohReportService`, and `BiteCaseService` (`A08`).)*
- [x] Keep no-PEP decisions separate from completed vaccination; pending TT/other care must not automatically close the encounter. *(Verified in `EpisodeReportingStateResolver` & `Phase3IncompleteJourneysAndOutcomesTest`: Category I with pending TT/ATS retains `encounter_disposition = 'open'` and `resolved_status = 'awaiting_treatment'` while keeping `pep_decision = 'explicit_no_pep'`.)*
- [x] Separate overdue patients, episodes and doses using valid outstanding requirements. *(Implemented `TreatmentOutcomeResolver::summarizeOverdueMetrics` returning distinct `overdue_episodes`, `overdue_patients`, `overdue_courses`, and `outstanding_dose_slots` scoped to filtered `$cases` and `$cutoff` (`A07`, `A09`).)*
- [x] Preserve unknown referral/external outcomes; do not infer refusal or loss to follow-up from absent records. *(Referrals classified as `form_2_transferred` with `external_outcome_status = 'unknown_unless_verified'`; absent Form 3 uses `'No administration recorded'` instead of inferring refusal or treatment failure.)*

**Acceptance:** The synthetic 100-episode reconciliation in Appendix E works. Registration-only, doctor-only and transferred episodes remain visible. Past history cannot complete a new course; prescriptions do not count as administrations.

### Phase work packages

| Task ID | Work package | Required output |
|---|---|---|
| BCS-03.1 | Episode reporting-state resolution | Separate assessment, PEP decision, receipt, outcome, disposition and availability dimensions |
| BCS-03.2 | Shared administration evidence rules | Consistent ARV/RIG, local/external, cancellation/void and cutoff handling |
| BCS-03.3 | Course and backlog calculations | Correct episode/course links, mature-cohort eligibility, ongoing courses and distinct overdue counting units |

**File map:** Existing `BiteIncident`, `TreatmentRecord`, `TreatmentPlan` and appointment relationships; `backend/app/Services/Clinical/BiteCaseService.php`; `backend/app/Services/DohReportService.php`. Proposed new reporting resolvers belong under the project's service conventions; their class names in Appendix H are suggestions, not existing files.

**Resolver contract:** Return the evidence IDs internally, classification reason, effective cutoff and any conflicts. Aggregate responses expose counts/reasons only. A null-dose scheduled vitals record is not a finalized assessment. An explicit no-PEP decision is not vaccine completion. A transfer does not erase a dose already given locally.

**Verification examples:** A new untreated episode stays incomplete despite past patient completion. A cancelled RIG record or indication-only note does not establish receipt. Treatment after cutoff does not enter that historical outcome. Form 1-only episodes remain present with known animal details and unassessed category.

**Handoff:** Reuse tested shared rules in the report adapters. Do not change doctor decisions, dose orders or patient queue routing solely to satisfy an analytical display.

## Phase 4 — Reconcile DOH reports and build the summary API

**Owner:** Backend/reporting developer. **Findings:** A06–A09, A12, A15–A16. **References:** Appendices D, E and H. **Status:** Done (14 Nov 2026).

- [x] Share query and metric services across DOH templates and summary APIs while retaining validated form-specific rules. *(Implemented `ExposureReportingQuery` and `ReportingMetricService`, wired into `DohReportService`, `BiteCaseService::getLocationRiskSummary`, and `ReportController`.)*
- [x] Separate exposure-period, service-period, treatment-cohort and current-backlog measures. *(Summary API and report adapters return distinct `d0_cohort_metrics`, `service_period_metrics`, exposure-period totals, and `computeBacklogAtCutoff` backlog indicators.)*
- [x] Apply identical eligibility and status/category interpretation to current and comparison periods. *(Extracted shared `resolveLocationSummaryPeriod` in `BiteCaseService` and unified `ExposureReportingQuery` filtering for current and prior periods, fixing `A16`.)*
- [x] Return unknown buckets and an explicit bridge from all recorded exposures to report-eligible episodes. *(Added `reconciliation` / `reconciliation_bridge`, `unknown_exposure_date_count`, unassessed/missing category counts, and strict `other` vs `unknown` animal separation.)*
- [x] Return values, numerators, denominators, units, rule versions, cutoff and source references. *(Responses include `rule_version: 'bcs-phase1-local-v1'`, `cutoff`, metric value/numerator/denominator/unit structures, and source form slice references.)*
- [x] Create aggregate-only responses and separate authorized detail endpoints; exclude patient lists from conference contracts. *(Added `GET /api/reports/bite-summary` with `privacy_mode`, `GET /api/reports/bite-summary/cases` with `BiteSummaryReportRequest` authorization, and `aggregate_only` stripping `patient_cases`/`cases` on DOH and location endpoints.)*
- [x] Normalize geography without losing raw values; distinguish residence, exposure location and outside-municipality cases. *(`normalizeExposureGeography` groups by normalized exposure barangay such as `Baluarte`/`Casinglot`/`Unknown` without residence fallback and exposes `normalized_barangay`, `municipality`, and `geography_scope`.)*
- [x] Handle empty periods, zero denominators, prior zero and partial comparisons accurately. *(Zero-denominator and empty-period checks return explicit `null`/reason metadata including `pct_change_reason` and `is_partial_period`.)*
- [x] Scope caches by clinic, permissions, filters, cutoff and rules; evaluate aggregate query performance with synthetic volume. *(Scoped `Cache::remember` in `ReportingMetricService` + preloaded incident reuse (`loadIncidentsByIdsWithReuse`) verified in `test_cache_isolation_and_query_benchmark`.)*
- [x] Reconcile API results and print totals against independent fixture expectations before connecting charts. *(Verified all 5 endpoints against the 17-episode November and Q4 expectations in `Phase4SummaryAndReconciliationTest` plus frontend TypeScript contract checks via `tsc --noEmit`.)*

**Acceptance:** Counts match wherever definitions match. Scope differences have documented reconciliation. Aggregate payloads contain no patient identifiers. Unknown information remains visible under filters.

### Phase work packages

| Task ID | Work package | Required output |
|---|---|---|
| BCS-04.1 | Aggregate query and summary endpoint | Clinic-scoped reporting contract with counts, denominators, unknown reasons and definitions |
| BCS-04.2 | Existing report adapters | Registry/monthly/cohort outputs consume shared rules with documented form-specific differences |
| BCS-04.3 | Reconciliation, comparison and performance | Expected-versus-actual counts, comparable periods, consistent geography and measured query behavior |

**Proposed contract:** Request fields include period, date basis, cutoff, comparison and approved demographic/geographic filters. The authenticated context supplies clinic scope. Response sections include `scope`, `indicators`, `journey_progress`, `breakdowns`, `comparison`, `data_quality`, `reconciliation`, `source_reports` and `metric_definitions`. Metric values may be null with an explicit reason; do not convert N/A into zero.

**File map:** `DohReportService.php`, the report controllers and requests, summary service/controller (`ReportingMetricService`, `BiteCaseService`), and Bite Cases Summary frontend (`BiteCaseRiskDashboard.tsx`, `biteCaseUtils.ts`). The 3 existing DOH Submissions frontend tab components (`DohExposureRegistryTab.tsx`, `DohMonthlyReportTab.tsx`, `DohCohortReportTab.tsx`) are intentionally preserved untouched at `HEAD`; the redesigned DOH data contract & reconciliation are surfaced in **Bite Cases Summary**. Version an API contract or provide a compatibility adapter if changing the meaning of an existing field; avoid silently reusing `pep_compliance` for a different denominator.

**Verification:** The sum of disjoint assessed/unassessed groups matches recorded eligible episodes. Transfers and overdue flags are labeled overlapping. A form that excludes unassessed cases has an explicit exclusion count. Response payload checks confirm aggregate endpoints contain no patient names/IDs.

**Performance deliverable:** Measured in `Phase4SummaryAndReconciliationTest::test_cache_isolation_and_query_benchmark` on `40` synthetic episodes in SQLite `:memory:`: cold cache `16` SQL queries (`694.61 ms` in the full 15-suite regression run; `592.08 ms` in the focused 2-suite run); warm cache `0` SQL queries (`21.24 ms` / `6.00 ms`), within the test's `<= 25` cold-query bound.

## Phase 5 — Build the meeting-focused interface

**Owner:** Frontend developer. **Finding:** A13; use corrected Phase 4 data. **Reference:** Appendix C.

- [x] Build Overview, Treatment & Follow-up, and Planning & Actions tabs.
- [x] Add period/comparison filters, cutoff, scope line, cohort labels and partial-period indicators.
- [x] Add four cards: recorded exposures, Category III, PEP started and PEP completion, with denominator context.
- [x] Add assessment/treatment progress, unknown buckets and expected-pending versus missing-documentation labels.
- [x] Add decision-relevant trend, profile and barangay charts; keep identifiable details behind authorized drill-downs.
- [x] Replace competing risk scores in the meeting overview with explicit review reasons and supporting counts.
- [x] Use “No administration recorded” without implying that no treatment occurred elsewhere.
- [x] Apply consistent Poppins typography, spacing, two-column content and readable neutral/teal styling.
- [x] Check keyboard access, chart labels, error/loading/empty states, responsive layout and 100% zoom.

**Acceptance:** Staff can answer the five meeting questions, identify unfinished encounters and understand missing information. Displayed values match the API; the browser does not recalculate competing clinical metrics.

### Phase work packages

| Task ID | Work package | Required output |
|---|---|---|
| BCS-05.1 | Page shell, scope controls and KPI cards | Predictable filter behavior and visible period/cohort/denominator context |
| BCS-05.2 | Charts and incomplete-journey views | Accessible exposure profiles, barangay comparisons, assessment progress and quality indicators |
| BCS-05.3 | Detail navigation and usability | Authorized drill-downs with preserved filters and clear empty/error states |

**File map:** `frontend/src/features/bite-cases/pages/BiteCaseRiskDashboard.tsx`, related bite-case types/services/components, existing report components and `frontend/src/features/walkthrough/biteCasesWalkthroughSteps.ts`. Split the large page into focused components without duplicating backend formulas. Update the walkthrough when navigation changes.

**Interaction requirements:** An applied filter updates all compatible sections together. Sections with different populations show their own scope. Clear filters restores a documented default. Loading never briefly displays a false zero. Opening an unknown bucket explains why information is unavailable. Expired sessions and unauthorized details show a clear state without repeated navigation loops.

**Verification:** Review all three tabs at 100% zoom and a narrow viewport; test keyboard navigation, chart labels, low-count/empty data and API errors. Show only relevant chart groups rather than every analytics chart on the first screen.

**Handoff:** Provide visual review evidence and matched API values using synthetic data. Do not show identifiable patient records in conference-mode screenshots.

## Phase 6 — Save meeting snapshots, export and track actions

**Owner:** Backend/frontend developers and designated report reviewer. **Findings:** A08, A15. **References:** Appendices F and G.

- [x] Save immutable snapshots containing period, cutoff, filters, definitions, totals, limitations and source references; corrections create revisions. *(Completed in Phase 6 `BCS-06.1` via `bite_report_snapshots`, `BiteReportSnapshot`, `MeetingReportService`, and `/api/reports/bite-summary/snapshots`.)*
- [x] Generate a one-page executive summary and supporting A4 PDF with configured branding and review status. *(Completed in Phase 6 `BCS-06.2` via `prints.bite-summary-meeting-pack`, `PrintController::biteSummary`, and `/api/print/reports/bite-summary`.)*
- [x] Add six-screen presentation mode and aggregate-table export with readable unknown/pending/not-applicable labels. *(Completed in Phase 6 `BCS-06.2` via `BiteCasesPresentationDialog.tsx` and `exportAggregateSummaryToCsv` in `biteCaseUtils.ts`.)*
- [x] Enforce conference privacy in payloads and generated files, including small-cell handling and exclusion of names, IDs, precise household coordinates and identifying free text. *(Completed in Phase 6 `BCS-06.2` via `MeetingReportService::applyConferencePrivacy` with `<5` small-cell + complementary suppression.)*
- [x] Produce reviewable descriptive findings supported by counts, denominators and scope; avoid automatic clinical decisions or outbreak declarations. *(Completed in Phase 6 `BCS-06.3` via `MeetingReportService::buildDescriptiveFindings` and `buildLimitations`.)*
- [x] Add action records with evidence/snapshot, proposed response, owner, deadline, resources, baseline, target, status and review outcome. *(Completed in Phase 6 `BCS-06.3` via `bite_report_actions`, `BiteReportAction`, `/api/reports/bite-summary/actions`, and `BiteCasesPlanningTab.tsx`.)*
- [x] Ensure saving/printing does not automatically publish, email or submit data externally. *(Verified: all snapshot and print actions are strictly clinic-scoped local operations.)*

**Acceptance:** Snapshots remain reproducible after later doses or corrections. Exported and displayed figures match. Conference output passes privacy checks. Each action has evidence and measurable follow-up.

### Phase work packages

| Task ID | Work package | Required output |
|---|---|---|
| BCS-06.1 | Snapshot lifecycle | Draft generation, review/finalization, immutable finalized version and revision linkage |
| BCS-06.2 | Meeting outputs | Executive summary, supporting PDF, six-screen presentation and aggregate export |
| BCS-06.3 | Findings and action register | Reviewed descriptive findings linked to actions, owners, targets and review outcomes |

**Snapshot design:** Store clinic, snapshot ID, report version, period, cutoff, filters, rule version, aggregate payload, quality notes, generated/reviewed timestamps and source references. Decide retention and permitted access with the clinic. A revised snapshot points to the prior version; it never silently rewrites what was presented. The exact schema depends on Phase 1 mapping.

**Action design:** Store finding/source snapshot, proposed action, responsible role/person, due date, baseline, target, resource notes, status, review date and result. Suggested statuses are Proposed, Accepted, In progress, Completed and Deferred. These are planning records, not automatically sent messages or clinical orders.

**Verification:** Finalize a synthetic report, record a later dose, and confirm its historical snapshot is unchanged. Compare chart/PDF/export values, repeated page headers and configured logos. Inspect export data and metadata for identifiers; confirm aggregate-only suppression rules cannot be reversed from nearby totals.

**Fallback:** If an export cannot preserve definitions or privacy, mark that export unavailable and keep the verified internal report usable. Do not substitute the existing identifiable patient-list payload.

## Phase 7 — Verify scenarios and prepare local handoff

**Owner:** Tester and report owner; developers resolve defects. **References:** Appendices J and K; audit A01–A16.

- [x] Resolve the test bootstrap blocker and confirm database isolation before migration-based testing. *(Resolved in Phase 0/2 using `backend/phpunit.xml` with SQLite `:memory:`.)*
- [x] Run focused existing report tests and meaningful new checks for the audit findings. *(Verified: 35 passed tests / 655 assertions across Phase 3, Phase 4, Phase 6, Phase 7, DohReports, and Form2PlaceOfExposure suites.)*
- [x] Exercise every intake path with no doctor, no nurse, no PEP with pending other care, referral and verified external treatment. *(Verified across S01–S08, S17, S18, and Phase 3/4/7 feature tests.)*
- [x] Test month edges, historical age, category fallbacks, prior completion flags, RIG indication-only, voided doses, cutoff boundaries and overlapping measures. *(Verified across S09–S28 and DohReportsTest, Phase3/Phase4/Phase7 test suites.)*
- [x] Test web-print authentication, clinic isolation, unassigned users, restricted roles, aggregate/detail endpoints and export permissions. *(Verified in Phase 7 `Phase7ScenarioVerificationAndAccessTest::test_role_permissions_unassigned_clinic_cross_clinic_isolation_and_print_token_authentication` and `Phase4SummaryAndReconciliationTest`.)*
- [x] Reconcile one month and quarter against independent expected totals and accepted local report definitions. *(Verified in Phase 4 17-episode fixture and Phase 3 100-episode benchmark matching all 5 endpoints.)*
- [x] Inspect screen, PDF/print, presentation and export, including partial and empty datasets. *(Verified in Phase 7 `test_empty_dataset_zero_denominators_and_partial_period_flagging`, Phase 6 print/export tests, and frontend build.)*
- [x] Record Expected Result, Actual Result, Status and evidence per scenario; unexecuted scenarios remain “Not yet tested.” *(Documented in [Phase 7 Verification and Handoff Package](./bite_cases_summary_phase_7_verification_and_handoff.md) Section 2; all 33 scenarios S01–S33 Passed.)*
- [x] Document rule versions, limitations, migration/recovery steps and operator guidance; obtain report-owner validation of official mappings. *(Documented in [Phase 7 Verification and Handoff Package](./bite_cases_summary_phase_7_verification_and_handoff.md) Section 4; Rule version `bcs-phase1-local-v1`.)*
- [x] Close audit findings only with linked verification evidence or a documented deferral limited to optional functionality. *(Documented in [Phase 7 Verification and Handoff Package](./bite_cases_summary_phase_7_verification_and_handoff.md) Section 3: A01–A16 Closed; Phase 8 deferred.)*

**Acceptance:** No unresolved high-priority finding affects the delivered scope; required scenarios pass; outputs labeled official use validated mappings. Planning and verification do not themselves authorize commit, push, merge or deployment.

### Phase work packages

| Task ID | Work package | Required output |
|---|---|---|
| BCS-07.1 | Automated calculation/access regression | Focused executed results covering corrected findings and existing report behavior |
| BCS-07.2 | Scenario-based workflow and report review | Actual results and evidence for the Appendix J scenarios |
| BCS-07.3 | Reconciliation and handoff package | Report-owner validation, known limitations, operator guidance and recovery notes |

**Verification layers:** Use focused service tests for substantive calculations, API checks for authorization and payloads, and scenario-based checks for complete user/report flows. These are implementation verification activities; the capstone's named evaluation method can remain Scenario-Based Testing.

**Scenario record:** Scenario ID, linked audit/task ID, fixture/preconditions, role, steps, expected result, actual result, status, evidence and postconditions. Use Not yet tested, Passed, Failed or Blocked. A blocked environment is not a passing result.

**Release checklist:** Definitions and accepted form mappings recorded; high-priority defects resolved; synthetic month/quarter reconciliation complete; incomplete encounters retained; official and operational percentages correctly labeled; access and conference privacy verified; snapshot reproducibility established; migration/recovery steps documented.

**Handoff boundary:** Prepare a reviewable local result with a change summary and test evidence. Do not commit, push, merge, publish, submit official reports or deploy as part of this planning request. Future implementation should preserve existing work and follow the user's authorization at that time.

## Phase 8 — Optional advanced planning

**Owner:** Analytics/reporting developer and clinic partners. **Status:** Complete (`BCS-08.1`–`BCS-08.3`). **Reference:** Appendix F.

- [x] Add supply scenarios using verified consumption, scheduled demand, units, vial sharing, expiry and explicit buffers ([SupplyPlanningService.php](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/app/Services/Reporting/SupplyPlanningService.php), [BiteCasesPlanningTab.tsx](file:///c:/xampp/htdocs/abc/animal-bite-management-system/frontend/src/features/bite-cases/components/BiteCasesPlanningTab.tsx)).
- [x] Compare forecasting with a simple historical baseline and disclose error and coverage before claiming predictive value (Next-month run rate projection with range bounds and explicit epidemiological non-predictive disclaimer).
- [x] Add verified veterinary/surveillance links and action-review history with agreed source ownership (Municipal Agriculture Office MAO, Provincial Veterinary Office PVO, Barangay Rabies Coordinators).
- [x] Add population-based recorded-exposure rates only with matching denominators and facility-coverage limitations (Catchment population 75k, crude rate per 100k, annualized rate per 100k, presentation bias disclosure).
- [x] Interactive simulation controls (`/api/reports/bite-summary/supply-projection`, buffer days selector, conservative vs intradermal model toggle) and A4 print pack table ([bite-summary-meeting-pack.blade.php](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/resources/views/prints/bite-summary-meeting-pack.blade.php)).

**Acceptance:** Each extension has a verified source, transparent assumptions and a measurable planning purpose. No invented population, animal outcome or causal claim fills a data gap.

### Phase work packages

| Task ID | Work package | Required output |
|---|---|---|
| BCS-08.1 | Supply scenario estimates | Product/unit-aware demand, usable stock, expiry and explicit buffer assumptions |
| BCS-08.2 | External surveillance and population inputs | Verified source owner, geography/date compatibility and permitted use |
| BCS-08.3 | Forecast evaluation or additional exports | Baseline comparison, error/coverage report, limitations and useful operator controls |

**Entry requirements:** Initial reporting is verified; relevant historical periods have sufficient completeness; the clinic has an identified decision that the extension supports. No fixed amount of historical data is claimed sufficient without evaluating the proposed method.

**Verification:** Separate observed values from estimates, test future periods held out from model fitting, and compare against a simple baseline. A larger count of clinic presentations does not by itself prove greater rabies transmission. Inventory estimates must distinguish patients, doses, sites, vials and RIG quantities.

**Completion:** Deliver an extension only when it adds measurable value and remains understandable to staff. Otherwise retain descriptive analytics and record the extension as deferred without blocking the core system.

## Reference appendices

These retain the comprehensive requirements. Execute the phases above in order; consult the appendices for detail. The separate audit supersedes the earlier informal findings table and distinguishes observed behavior from pending verification.

## Appendix A - Proposed direction

Redesign Bite Cases Summary as the clinic's presentation and decision-support view of the records used by Reports & Analytics > DOH Submissions. Keep the familiar navigation name. Use “Bite Cases Summary — Reporting and Planning” as the report title.

The page should answer:

1. How many bite/exposure episodes were recorded, and what changed?
2. Which age groups, exposure categories, animals, and places account for the cases?
3. How many patients started and completed the treatment prescribed for their episode?
4. Which follow-up, referral, supply, and data issues require review?
5. What should the clinic and its partners do next, who owns the action, and how will progress be measured?

Reports & Analytics remains the place for official report templates. Bite Cases Summary turns the same validated figures into charts, explanations, and meeting actions. A meeting report is not itself proof of DOH submission or acceptance.

The summary must include valid recorded exposure episodes even when the patient stops after Form 1 or Form 2. Reaching the nurse is not a requirement for appearing in the summary. Each measure must explain which episodes qualify and which information is still unavailable.

## Appendix B - Research findings and limits

### Verified foundations

- WHO's 2025 normative guidance addresses collection and analysis of individual bite-exposure, PEP, and human rabies data at health facilities. This supports an episode-based analytical foundation. It identifies animal investigation, dog population, and dog vaccination data as related information requiring additional sources. [S1]
- PSA's release calendar lists DOH/FHSIS rabies indicators covering exposure categories I–III, Category II vaccine completion, Category III vaccine completion with RIG, and dog/cat-mediated exposure. These provide a useful national indicator crosswalk; the calendar does not provide all eligibility rules or replace a reporting manual. [S2]
- A July 2025 official DOH FOI response identifies AO 2018-0013 and the 2019 rabies Manual of Procedures as the basis of RITM training at that time. This establishes a reference point, not proof that no subsequent issuance exists. [S3]
- DOH CHD-CaLaBaRZon's published FHSIS reporting reminders emphasize complete geography, accurate and duplicate-free reports, and validation with program coordinators. This supports reconciliation and data-quality checks in the redesign; its regional reporting instructions should not be treated as Tagoloan-specific requirements. [S4]
- WHO distinguishes Category I exposures requiring no rabies prophylaxis from categories requiring PEP. The analytical implication is to separate “No PEP required” from completed vaccination and from missed treatment. Actual treatment remains a clinician decision under the clinic's approved protocol. [S5]

### What still needs local confirmation

The exact current Tagoloan/DOH Northern Mindanao report templates, revisions, deadlines, reporting-date basis, age cutoffs, cohort membership, outcome rules, and submission workflow were not verified. Direct retrieval of the full DOH MOP and WHO PDF was blocked during research; the accessible official publication pages and indexed official material were used for the claims above.

Before labeling the redesigned output “DOH-compliant,” the RHU report owner should provide and validate its currently accepted forms and instructions. Do not assume the application's current “Rabies Exposure Registry,” “ABTC Monthly Report,” and “Cohort Report” templates are exact current national forms simply because the interface calls them DOH reports.

The remaining recommendations in this plan are proposed product and calculation rules. They are not attributed to DOH as mandatory formulas.

## Appendix C - Information architecture

Use three primary tabs: **Overview**, **Treatment & Follow-up**, and **Planning & Actions**. Put detailed case records behind permission-controlled drill-downs. Do not reproduce every Reports & Analytics chart on the landing view.

### Shared controls

- Clinic, month/quarter/year/custom dates, comparison period, and data cutoff.
- Default to the last completed quarter for meeting preparation; allow current periods with a visible “Partial period” label.
- Advanced filters: municipality/barangay, geography basis, category, age group, sex, animal, and treatment-plan type.
- An always-visible scope line: clinic, period, date basis, cutoff, record count, and whether the data is draft or finalized.
- Actions: Present, Print/PDF, Export aggregate table, View source report, and Save meeting snapshot.
- Apply identical filters to comparable numerator, denominator, prior-period series, and exports. Warn when an operational measure uses a different date basis.

### Overview

Use four prominent cards in a 2-by-2 layout:

1. Recorded exposure episodes, with absolute change and comparable-period percentage change.
2. Category III exposures, with count, denominator, share, and unassessed count nearby.
3. PEP started, with eligible assessed episodes as the denominator.
4. PEP completion, with a mature treatment cohort and explicit numerator/denominator.

Below the cards, show two charts per row: exposure trend and categories; age/sex profile and animal type. Then show the leading barangays with counts and a compact aggregate map. Use a horizontal bar chart where exact rankings are the point. Include a short three-item findings summary.

Do not imply that the completion card uses the same population as exposure counts when its cohort differs. Its label must carry the cohort period and outcome cutoff.

### Treatment & Follow-up

- Treatment initiation and outcomes by category and plan type.
- Distinct states for completed course, ongoing/not yet due, overdue, no PEP required, transferred/referred, documented discontinuation, and unknown outcome. Confirm official outcome mappings separately.
- Counts of patients, episodes, and scheduled doses must have distinct labels.
- Separate RIG indicated, administered, not recorded, and documented reason for nonreceipt. The denominator for operational RIG receipt uses clinician-assessed eligibility, including prior-immunization considerations.
- Referral destinations, reasons, acknowledgment, and verified receiving-facility outcome when available.
- Presentation-to-treatment intervals using valid recorded dates; show how many records support the calculation.
- A “Current follow-up workload as of [date]” panel may include older episodes, explicitly separate from the selected period's cohort.

### Planning & Actions

- Priority issues supported by explicit figures, not a combined risk score.
- Barangay table: cases, prior-period cases, absolute change, Category III count/share, children affected, follow-up backlog, and missing-data count. Display geography basis.
- Action register: issue, supporting snapshot/metric, proposed action, owner, target date, resources, baseline, measurable target, status, and review result.
- Optional supply panel linking to inventory: consumption, stock availability, expiry, and outstanding scheduled demand. This is a clinic planning extension, not automatically a DOH submission field.

### Supporting data-quality panel

Show missing or invalid exposure dates, age/DOB, category, animal type, geography, treatment-plan links, administration evidence, and referral outcomes. Use count and percentage per field. Keep unknown information visible in totals.

Also show an **Assessment and Treatment Progress** strip: no finalized assessment; assessed with decision not recorded; PEP prescribed with no administration recorded; PEP started; and documented no-PEP decisions. These are explicitly labeled measures, not automatically additive counts. Transfers and external treatment appear as separate indicators because they can overlap treatment progress. Link each measure to its eligible episode list for authorized staff.

Distinguish expected pending information from a documentation gap. For example, a category not yet assigned before doctor assessment is expected; a finalized assessment lacking its required category needs review. The quality panel should not mark every registration-only patient as an encoding error.

## Appendix D - DOH report crosswalk

Confirmed baseline forms (`Reports & Analytics > DOH Submissions`, 14 Nov 2026): **Rabies Exposure Registry**, **ABTC Monthly Report**, and **Cohort Report (Quarterly)**. All three forms currently exclude or miscount unassessed/missing-category episodes in their Category I–III tables and derive completion/RIG incorrectly; Phases 2–4 preserve the three baseline templates while adding a mandatory reconciliation bridge (`Recorded Exposure Episodes = Categorized Cases (I + II + III) + Unassessed Episodes + Assessed-Category-Missing`) and separating continuing-course episodes from new-course `NO. GIVEN PEP` / `NO. COMPLETED` denominators.

| Existing report/source | Information to reuse | Meeting use | Validation needed |
|---|---|---|---|
| **Baseline Form 1:** Rabies Exposure Registry | Episodes, sex, age, category, animal, vaccine/RIG indicators | Who was affected; exposure patterns | Confirm bounded-week clamping, age-at-exposure, verified RIG, and missing-category/human-rabies disclosure (`D02`, `D05`) |
| **Baseline Form 2:** ABTC Monthly Report | Period totals, categories, PEP initiation, RIG, completion fields | Monthly activity and service delivery | Fix week bounds, align row vs footer `cat_total` (`I+II+III`) with unassessed bridge, and separate incident cohort vs service-date counts |
| **Baseline Form 3:** Cohort Report (Quarterly) | Defined quarterly cohort membership and episode outcomes by Cat I–III | Treatment follow-through over time | Confirm official cohort entry/cutoff (`D02`), remove `has_completed_primary` bleed-through, and disclose excluded unassessed/continuing slices |
| PSA-listed DOH/FHSIS indicators | Categories; Category II completion; Category III completion with RIG; dog/cat exposures | Indicator comparison and gap checks | Crosswalk indicator comparison only; do not replace the 3 confirmed baseline templates |
| Appointments and treatment records | Due dates and actual administration | Follow-up workload and timing | Exclude cancelled/replaced doses; identify late administration and external evidence (`D04`) |
| Inventory transactions/batches | Actual use, usable stock, expirations | Supply planning | Reconcile units, vial sharing, adjustments, and wastage |
| Verified human/animal surveillance sources | Case classifications, laboratory/animal follow-up results | One Health coordination, later phase | Separate source ownership and verification; never infer rabies from exposure category |

Each metric should include a source label: **DOH report measure**, **derived from report data**, or **clinic planning measure**. Only use the first after its mapping has been validated.

## Appendix E - Metric definitions and calculation rules

Create a versioned metric dictionary before changing charts. Every metric needs: ID, label, unit, numerator, denominator, date basis, eligibility, exclusions, unknown handling, source, owner, and rule version.

| Metric | Proposed calculation | Important interpretation |
|---|---|---|
| Exposure episodes | Distinct valid `bite_id` meeting the selected exposure-period rules | Follow-up visits do not create new exposures; one patient can have multiple episodes |
| Unique patients | Distinct patient IDs among included episodes | Show as a secondary measure, not interchangeable with episodes |
| Exposure-category share | Category count / assessed episodes with category I–III | Show unassessed separately; use an official denominator instead where the validated form requires it |
| Child exposures | Episodes with age below the locally confirmed cutoff at reference date | Current code uses <15 and >=15; preserve only after form verification; missing DOB is not age zero |
| Animal distribution | Dog, cat, specified other, and unknown episode counts | A recorded animal type does not prove the animal was rabid |
| PEP initiation | Eligible assessed episodes with verified qualifying rabies-vaccine initiation by cutoff / eligible assessed episodes | Explain external starts and continuing courses; this is not completion |
| Mature-cohort completion | Completed courses / PEP-started courses whose prescribed course and agreed follow-up window are due by cutoff | Local operational measure; retain incomplete/unknown outcomes in denominator; disclose transfers and clinically discontinued cases and any approved exclusions |
| Official completion indicator | Exact calculation in the accepted reporting specification | Keep separately named if its cohort or denominator differs from the operational measure |
| No PEP required | Episodes with documented clinician decision that rabies PEP is not required | Do not add to vaccinated/completed-course counts; TT-only care is not ARV |
| Overdue episodes | Distinct episodes with an outstanding required, noncancelled dose past its due date at cutoff | Show distinct patients and dose counts separately; superseded appointments do not create additional backlog |
| RIG receipt among indicated episodes | Eligible episodes with verified RIG administration / episodes with documented RIG indication | Type selection alone is not evidence; report unknown indication separately |
| Referral follow-through | Verified completed handoffs / referrals requiring outcome follow-up, using an agreed cutoff | Report unknown destination/outcome explicitly; transfer is not automatically nonadherence |
| Time to first consultation / PEP | Median and distribution of valid elapsed times from exposure to consultation / first qualifying vaccine administration | Negative/impossible dates flagged; calendar-day data cannot support hourly precision |
| Change from prior period | Current minus previous count; percentage = difference / previous count when previous > 0 | Prior zero: show “0 to N,” with percentage N/A; compare equally complete periods |
| Recorded resident exposure rate | Recorded episodes among residents / corresponding validated population, scaled to a stated unit | Optional; this is facility-recorded utilization/exposure data, not complete community incidence |

### Date and cohort rules

Use distinct date bases rather than one universal date filter:

- Exposure surveillance: exposure date.
- Service workload and consumption: actual service/administration/transaction date.
- Treatment cohort: approved cohort entry event, such as D0, if locally validated.
- Follow-up backlog: dose due date evaluated at an explicit cutoff.
- Official submission: whatever the accepted form specifies, stored as a versioned rule.

Store clinic timezone as Asia/Manila and apply it consistently to date boundaries. Later doses may change an updated outcome report but must not silently change a finalized meeting snapshot. A historical “as of” report requires event history or a saved snapshot; do not claim reconstruction from current status alone is exact.

Primary courses, boosters/re-exposure plans, continued courses, and verified external administrations must remain traceable to the correct episode and treatment plan. A continued course may cover linked episodes without creating a second course denominator. Do not hardcode every plan to D0/D3/D7/D28. Use documented ordered doses and a separately versioned reporting definition of completion.

### Missing data and scope

- Zero means an observed zero; N/A means not applicable; Unknown means missing/unverified; No data means no usable records.
- Missing categories must not vanish from totals or default to Category II.
- Separate residence barangay from place-of-exposure barangay. Use exposure location for prevention planning and residence for follow-up. Do not divide exposure-location counts by resident population and call the result incidence.
- Distinguish Tagoloan residents, patients from outside Tagoloan, exposures outside the municipality, and unknown locations.
- Keep duplicate/void corrections auditable; do not delete legitimate repeat exposures to make totals match.
- Historical completion and source corrections must be available as revisions, with a reason and timestamp.

### Incomplete patient journeys: required behavior

The following are product/reporting rules to implement and validate with the clinic. They do not establish new clinical or DOH submission rules.

#### A. Stage-by-stage reporting matrix

| Available evidence at cutoff | Information available for reporting | Display labels | Counting behavior |
|---|---|---|---|
| Online booking, unsent draft, or unverified pre-registration only | Appointment/intake workload, if requested | Pending registration/verification | Do not count automatically as a clinic-recorded exposure; define the accepted-registration event and deduplicate linked mobile/web intake |
| Valid recorded exposure and completed Form 1; no finalized Form 2 | Saved demographics, exposure date and animal information where actually captured | Awaiting Assessment; category: Not yet assessed; PEP decision: Not yet determined | Include in recorded episodes; exclude from assessed-category and prescribed-PEP denominators |
| Form 2 started but not finalized | Form 1 data and draft availability | Assessment in progress; category/decision not finalized | Do not present draft clinical decisions as final; retain separately recorded verified treatment evidence if it exists and flag the mismatch |
| Form 2 finalized but PEP decision missing | Verified assessment fields only | Assessment recorded; treatment decision not recorded | Flag a documentation gap; do not infer PEP indication from blank values or silently count no-PEP |
| Form 2 finalized, PEP prescribed; no verified vaccine administration | Assessed category, diagnosis, location and prescription where saved | Awaiting Treatment; No administration recorded | Include in prescribed-PEP denominator; not the initiation numerator or PEP-started completion cohort |
| Doctor records no rabies PEP required | Assessment and explicit no-PEP decision | No PEP Required; Completed - No PEP Required only when the encounter closure rule is met | Include in exposure and assessment counts; exclude from rabies-vaccine initiation and course-completion measures |
| No rabies PEP required, but TT/other care is prescribed and pending | Assessment, no-PEP decision, pending non-PEP care | No PEP Required; other treatment pending | Do not mark the entire encounter completed solely because ARV is not required; TT administration does not count as rabies vaccination |
| Doctor transfers/refers patient before local nurse treatment | Assessment and referral fields | Transferred/Referred; external treatment outcome unknown unless verified | Include recorded exposure; preserve documented PEP indication; do not infer receipt, completion, or patient refusal |
| Form 3 saved with a verified qualifying administration | Actual treatment event, product, date and linked course | Treatment started; subsequent outcome from course evidence | Count qualifying administration once; the presence of a Form 3 record alone does not prove ARV receipt |
| Verified treatment at another facility, regardless of local Form 3 availability | Accepted external proof with service date, provenance and reviewer | Treatment recorded externally | Include only in metrics allowing verified external care; exclude from this clinic's administered-dose and stock-consumption totals |
| Encounter closed before assessment/treatment, with documented reason | Last completed stage and recorded closure reason | Closed before assessment/treatment, with reason | Preserve known episode data; do not call the patient lost to follow-up or refused unless supported by the relevant documented rule/evidence |

Use the label “Awaiting Assessment” or “Awaiting Treatment” while the encounter remains open. For old or closed encounters, use “No completed assessment recorded” or “No administration recorded,” with a review flag and documented closure status. Elapsed time alone does not prove that the patient left, refused care, or was never treated elsewhere.

#### B. Keep separate status dimensions

One status field cannot accurately describe all of assessment, treatment, and referral. Derive and return separate dimensions:

- **Assessment:** not recorded, draft/in progress, finalized.
- **PEP decision:** not determined, prescribed/required, explicitly not required, documented other decision requiring review.
- **Administration evidence:** no qualifying administration recorded, verified local administration, verified external administration, both, or conflicting evidence needing review.
- **Course outcome:** not applicable, not started, ongoing, completed, clinically discontinued, or outcome unknown. Overdue is an additional flag based on valid outstanding required doses.
- **Encounter disposition:** open, closed, transferred/referred, or another documented existing disposition.
- **Data availability:** known, not yet assessed, not yet recorded, unknown/unverified, not applicable, or conflicting.

These are proposed reporting dimensions, not instructions to replace existing operational status values blindly. Map them to current model fields and evidence during implementation. A transferred episode may already have a local dose; a closed encounter may still have an ongoing course. Preserve both facts.

If a single additive breakdown is needed, partition episodes by assessment completion, then partition finalized assessments by documented treatment decision. Show transfer, overdue, and external-care counts separately with a note that they can overlap. Never sum overlapping indicators into an exposure total.

#### C. Meaning of missing values

| Label | Meaning | Example |
|---|---|---|
| Not yet assessed | The required clinical assessment is not finalized | Registration completed, no doctor assessment |
| Not yet recorded | An expected event/field has no saved evidence yet | Prescription exists but administration has not been recorded |
| Unknown / unverified | The system cannot establish the fact from available evidence | Referred patient may have received treatment elsewhere |
| Not applicable | A documented decision makes the measure inapplicable | ARV completion for an episode explicitly requiring no rabies PEP |
| Zero | No qualifying event exists in a complete, defined reporting scope | Zero verified local administrations in the selected service period |
| No data | No usable records exist for this measure/scope | Empty comparison period |
| Conflicting records | Source records disagree and need review | Final decision says no PEP while a linked ARV administration is recorded |

Missing information must remain missing with its reason. Do not replace it with a previous episode's category, residence instead of exposure location, zero, “No,” or “Completed.” A recorded zero local administrations does not prove zero treatment received anywhere.

#### D. Inclusion, provenance, and query requirements

Audit clarification: the staff-registration path can create an episode only when vitals or animal information is supplied, sets a provisional `bite_date` from consultation/today, and creates a scheduled null-dose vitals record. The mobile check-in path instead uses the intake bite date. Phase 1 must map other intake paths, and Phases 2–3 must preserve date provenance and distinguish these placeholders from finalized doctor assessment. Base incident queries already allow optional doctor/nurse relations; retain that behavior.

1. Start from the canonical set of accepted exposure episodes. Left-join assessment, treatment, appointments and referrals, or use equivalent optional relationships; never require a matching Form 2 or Form 3 to retain an episode.
2. Verify when the current application creates `bite_id`. If an accepted Form 1 can exist without it, establish a canonical reporting link or a clearly separated registration-awaiting-episode bucket. Do not silently omit it or create duplicate incidents just for reporting.
3. Count each episode once even when it has multiple forms, doses, appointments, or referral updates. Resolve revisions to the authoritative version at cutoff.
4. Keep animal type known when Form 1 captures it even if Form 2/3 is absent. Keep location unknown if its actual source stage has not been completed; do not substitute residence.
5. Link each clinical field to the correct episode, source record, author/finalization status, effective event date, and recorded/updated date. Never use the patient's latest unrelated consultation.
6. Exposure-date reports exclude records with missing exposure dates from dated trends but disclose the count in a separate missing-date panel. If shown by registration date, label that basis explicitly. Do not silently substitute dates.
7. Keep clinical decision, prescribed product, and administered product distinct. Derive initiation from qualifying administration evidence, not a prescription or form completion flag.
8. Preserve every member of the stated eligible denominator. For example, a prescribed-PEP episode with no receipt evidence stays in the denominator and is labeled accordingly; do not remove it just because it lowers the documented initiation rate.
9. Keep registrations awaiting assessment separate from treatment default or overdue-dose measures. Apply overdue logic only where a valid required dose and due date exist. A separate review-age threshold can identify unresolved encounters without being presented as a clinical deadline.
10. Official forms use their validated eligibility rules. If an official form omits unassessed episodes, show a reconciliation bridge: all recorded episodes, included episodes, pending assessment, other exclusions and reasons. The summary and form need not have identical totals when their documented scopes differ.

#### E. Illustrative reconciliation for a meeting

Synthetic example only; not actual clinic data:

| Measure | Count / calculation |
|---|---|
| Recorded exposure episodes | 100 |
| Finalized assessments | 80 |
| No finalized assessment | 20 |
| PEP prescribed among finalized assessments | 60 |
| Explicit no-PEP decisions among finalized assessments | 15 |
| Finalized assessment with treatment decision missing | 5 |
| Verified vaccine initiation among the 60 prescribed episodes | 50 |
| No administration recorded among the 60 prescribed episodes | 10 |
| Assessment completion | 80 / 100 = 80% |
| Documented PEP initiation among prescribed episodes | 50 / 60 = 83.3% |

The 20 unassessed episodes are not automatically PEP-eligible or treatment failures. The 15 no-PEP decisions are not 15 completed vaccine courses. The 50 started episodes are not necessarily completed courses. Transfers can overlap these groups and therefore are not added as another disjoint row. Compute mature-cohort completion separately, using course requirements and cutoff evidence.

Suggested meeting wording: “Of 100 recorded exposure episodes, 80 had a finalized assessment and 20 had no finalized assessment recorded. Of 60 episodes prescribed PEP, 50 had verified initiation and 10 had no administration recorded by the cutoff. Five finalized assessments had no treatment decision recorded.”

#### F. Implementation tasks for incomplete journeys

- [x] Map Form 1, Form 2 and Form 3 save/finalization events to the canonical episode and verify mobile/web deduplication. *(Technical source mapping completed in [Phase 1 package](./bite_cases_summary_phase_1.md); end-to-end runtime verification remains in Phases 3/7.)*
- [x] Document each reporting dimension and its evidence/precedence rules, including conflict handling. *(Completed in [Phase 1 package](./bite_cases_summary_phase_1.md).)*
- [x] Add shared stage and availability resolution to the reporting service without requiring treatment records. *(Completed in Phase 3 via `EpisodeReportingStateResolver`, `TreatmentOutcomeResolver`, `BiteIncident::resolveReportingState`, `DohReportService`, and `BiteCaseService`.)*
- [x] Return aggregate pending/unknown counts and reasons in the summary API; keep patient details in authorized drill-down responses. *(Completed in Phase 4 `BCS-04.1`: `GET /api/reports/bite-summary` and `GET /api/cases/location-summary?privacy_mode=aggregate_only` return aggregate counts, 5-stage `stage_matrix`, `reconciliation_bridge`, and `data_quality` without patient lists, while `GET /api/reports/bite-summary/cases` serves separate authorized drill-downs.)*
- [x] Show explicit Unknown/Unassessed options in relevant filters, charts, legends and aggregate exports. *(Completed in Phase 5 frontend filters/charts/tables (`Not Yet Assessed (Form 1 Only)`, `Assessed – Category Missing`, `All Unassessed / Category Pending`, `Animal Unknown / Unspecified`), Conference Mode privacy guard on episode CSV exports; Phase 6 will extend into saved snapshots & A4 PDF packs.)*
- [x] Add scope-aware reconciliation between registered exposures, assessed exposures, prescribed care and actual administration. *(Completed in Phase 3 via `EpisodeReportingStateResolver::reconcileCohort` and exposed on `DohReportService` + `BiteCaseService` responses; UI presentation continues in Phases 4–5.)*
- [x] Distinguish expected pending data from missing required data after finalization. *(Completed in Phase 3: `awaiting_assessment`/`awaiting_treatment` pending expectations separated from `decision_missing` / missing course documentation flags.)*
- [x] Include unresolved assessment/treatment review lists and their age as of cutoff, without inventing reasons for non-progression. *(Completed in Phase 4 via `EpisodeReportingStateResolver::computeReviewAgeInfo()`, exposed as `is_unresolved_review`, `review_age_days`, `review_age_bucket`, and `unresolved_review*` bucket filters across `/api/reports/bite-summary/cases`, `/api/cases/location-summary`, and `BiteCaseRiskDashboard.tsx`.)*
- [x] Preserve stage, evidence and missing-value labels in report snapshots and PDF/presentation exports. *(Completed in Phase 6 `BCS-06.1`–`BCS-06.2` via `MeetingReportService`, `prints.bite-summary-meeting-pack`, `BiteCasesPresentationDialog.tsx`, and `exportAggregateSummaryToCsv`.)*
- [x] Verify stage-specific scenarios before considering the redesign complete. *(Verified across all 33 Appendix J scenarios S01–S33 in `Phase7ScenarioVerificationAndAccessTest.php`, `Phase3IncompleteJourneysAndOutcomesTest.php`, `Phase4SummaryAndReconciliationTest.php`, and `Phase6SnapshotsActionsAndExportsTest.php`; documented in [Phase 7 Verification and Handoff Package](./bite_cases_summary_phase_7_verification_and_handoff.md).)*

## Appendix F - Turning analytics into future plans

The following are example decision pathways, not findings about Tagoloan's actual data.

| Observed pattern | Questions to verify | Potential action | How to assess progress |
|---|---|---|---|
| More child exposures in one barangay | Real increase, improved reporting, or small numbers? Where did exposures occur? | Coordinate school/parent awareness and veterinary outreach | Comparable exposure counts, attendance, consultation delay; avoid claiming causation from before/after counts alone |
| More overdue episodes | Contact failure, access barriers, rescheduled doses, or incomplete recording? | Review follow-up list; coordinate recall and barangay support | Contact success and subsequent verified return/completion |
| Many registrations without finalized assessment | Still waiting, duplicate intake, documented departure, or assessment not saved? | Review unresolved encounters and registration-to-doctor handoff | Assessment completion and documented disposition, using a defined cohort/cutoff |
| PEP prescriptions without administration evidence | Still waiting, referred, treated externally, declined, unavailable, or missing documentation? | Verify treatment evidence and review doctor-to-nurse handoff | Documented initiation and resolved reasons; do not infer refusal |
| Repeated RIG documentation gaps | Not indicated, referred, unavailable, or not encoded? | Clinical/documentation review and supply coordination | Verified indication and administration completeness |
| Increasing service workload | More new exposures or more returning doses? | Adjust clinic session capacity and stock preparation | Waiting time if measured, completed visits, supply availability |
| Repeated animal-related exposures in the same place | Same animal/event or unrelated events? | Share approved aggregate information with veterinary partners for investigation | Documented investigations and partner feedback |
| High “unknown barangay” share | Free-text mismatch or missing intake/assessment information? | Improve capture and validate geographic mapping | Lower unknown-location share with an audit trail |
| High transfers with unknown outcomes | Handoff not completed or receiving-facility feedback absent? | Strengthen referral acknowledgment and outcome review | Verified referral outcomes and time to acknowledgment |

Recommendation text must show its supporting count, denominator, period, and rule. Use conditional language such as “Review…” or “Consider…” until a staff member approves the action. Do not automatically classify outbreaks, prescribe treatment, or claim that a rise in clinic attendance proves a rise in transmission.

### Supply estimates, later phase

Begin with transparent scenarios: scheduled demand from existing treatment plans plus an estimate of new starts based on recent complete periods. Validate performance against a simple historical baseline before describing this as forecasting.

Keep product, route, dose/site, vial size, and session sharing explicit. Patient count is not vial count. A suggested stock requirement is expected consumption plus an approved buffer, less usable on-hand stock and confirmed usable receipts. Account for stock expiring before use. Label assumptions and low/base/high scenarios; require staff review before procurement. Do not estimate RIG volume from case counts without the required clinical/product information.

## Appendix G - Meeting and conference outputs

### Meeting pack

Provide an A4 PDF with a one-page executive summary and supporting charts/tables. Include:

- Clinic name and configured print logos.
- Period, cohort window, comparison, cutoff, filters, snapshot ID, and rule version.
- Four headline indicators and three evidence-backed findings.
- Exposure profile, barangay distribution, treatment outcomes, and key data limitations.
- Proposed actions with owners and dates.
- Source report references, definitions, prepared-by details, and review status.

### Presentation mode

Use a six-screen sequence: situation overview; exposure profile; geography; treatment/follow-up; service or supply issues; action plan. Give each screen one central message. Hide navigation and dense tables, use large readable labels, and make chart colors interpretable in grayscale. PDF and on-screen presentation are MVP; editable PowerPoint is optional later work.

### Privacy modes

- Internal clinical review: authorized users may open case records through a separate drill-down.
- Conference/public output: aggregate statistics only; exclude names, patient IDs, phone numbers, exact addresses, free-text clinical notes, and precise household markers.
- Agree on a small-cell suppression/aggregation rule with the clinic; apply complementary suppression where totals could reveal hidden cells. This is a proposed disclosure-control feature, not a claimed statutory numeric threshold.
- Public export should be aggregate-only at the data layer, not merely hide columns visually. Review hidden worksheet data, chart labels, tooltips, and export metadata.
- Saving, printing, or presenting does not automatically email, publish, or submit anything externally.

## Appendix H - Architecture and implementation approach

Create a shared backend reporting layer consumed by both the DOH templates and Bite Cases Summary. Reuse source records and validated domain rules; do not scrape printed HTML or reproduce formulas in React.

Suggested responsibilities:

- `ExposureReportingQuery`: clinic scope, date basis, canonical category/geography, eligibility, and duplicate rules.
- `EpisodeReportingStateResolver`: assessment stage, documented PEP decision, encounter disposition, field availability, and evidence conflicts; retain episodes without Form 2/3.
- `TreatmentOutcomeResolver`: episode/course relationships, required doses, verified administrations, external evidence, and outcome cutoff.
- `ReportingMetricService`: versioned numerators/denominators, trends, and breakdowns.
- `MeetingReportService`: aggregate payload, findings, source references, and privacy-safe exports.
- Existing `DohReportService`: adapt to shared rules while preserving validated form-specific calculations.

Suggested aggregate response fields: `scope`, `snapshot`, `metric_definitions`, `indicators`, `breakdowns`, `comparison`, `journey_progress`, `availability_reasons`, `reconciliation`, `data_quality`, `insights`, `source_reports`, and `permissions`. Each indicator returns value, numerator, denominator where relevant, unit, date/cohort basis, and unavailable reason. `journey_progress` must identify overlapping versus mutually exclusive measures; null numeric results must not be coerced into zero percentages.

Proposed routes: `GET /reports/bite-summary`, `POST /reports/bite-summary/snapshots`, and a permission-controlled snapshot export route. Confirm naming against project conventions during implementation.

Add schema only after mapping existing fields. Likely gaps include reliable RIG administration evidence, report snapshots/versions, action-register records, geography identifiers, and versioned reporting definitions. Preserve unknown historical information; do not backfill invented outcomes. Reuse `TreatmentPlan::ordered_dose_days`, `plan_type`, and `continued_from_bite_id` where appropriate.

Apply clinic isolation on every query and export. Keep patient details out of aggregate responses. Cache keys must include clinic, permissions/privacy mode, filters, cutoff, and rule version. Finalized snapshots are immutable; revisions create a new version. Large aggregates should use server-side grouping rather than loading every patient into the browser.

## Appendix I - Proposed permissions

| Capability | Admin | Doctor / Nurse | Registration | Patient |
|---|---|---|---|---|
| View clinic aggregates | Yes | Yes, within assigned clinic | Limited approved view | No |
| Open identifiable case details | Authorized scope | Clinical scope | Registration scope | Own/dependent records only through patient features |
| Draft meeting findings | Yes | Yes, if designated | No by default | No |
| Finalize official report/snapshot | Designated report owner | Only if explicitly assigned | No by default | No |
| Export conference aggregates | Authorized report role | If assigned | No by default | No |
| Edit clinical treatment decisions | Existing clinical policy | Existing clinical policy | No | No |

These are proposed permissions requiring reconciliation with existing clinic policy. Implement authorization in endpoints and exports, not only navigation visibility.

## Appendix J - Scenario-based verification and acceptance

| Scenario | Expected result |
|---|---|
| Accepted Form 1 with no Form 2 or Form 3 | Exposure remains visible; known intake fields retained; category not yet assessed; no treatment decision inferred |
| Booking/draft intake without accepted registration | Does not automatically inflate clinic-recorded exposure totals |
| Form 2 draft only | Draft diagnosis/category not presented as finalized; episode remains without finalized assessment |
| Finalized Form 2 with PEP prescription but no Form 3 | Included in prescribed-PEP denominator; No administration recorded; excluded from initiation numerator |
| Finalized Form 2 with missing treatment decision | Documentation-gap count increases; no inferred PEP/no-PEP decision |
| No PEP required but prescribed TT is pending | No rabies course denominator; encounter not automatically closed while other required care remains pending |
| External administration verified without local Form 3 | External receipt counted only in eligible metrics; no local administration or stock deduction inferred |
| Old encounter without assessment/administration and no documented departure reason | Missing evidence and review age shown; no invented refusal or lost-to-follow-up classification |
| Exposure date missing on accepted registration | Excluded from exposure-date trend with a disclosed missing-date count; any registration-date measure explicitly labeled |
| Episode has several treatment records and a transfer | Episode counted once; transfer can overlap initiation; no sum of overlapping groups |
| Final decision conflicts with administration evidence | Conflict flagged with source provenance; no silent overwriting of evidence |
| Official report excludes unassessed episodes | Explicit reconciliation explains the difference from all recorded exposures |
| Selected month starts/ends midweek | Weekly rows include only dates within the month; row totals equal report totals |
| One patient has two exposure episodes | Two exposures and one unique patient; separate appropriate course links |
| New exposure after a completed past course | New episode is not automatically completed |
| Exposure continues an existing course | Episode count increases where appropriate; course denominator is not duplicated |
| Category I, no rabies PEP required, with or without TT | Counted in exposures/no-PEP state; not ARV initiation or PEP completion |
| Doctor transfers patient before local treatment | Referral is visible; local receipt not invented; external outcome remains unverified until documented |
| Course not yet due for completion | Shown ongoing; excluded from a mature-cohort denominator under the approved rule |
| Dose scheduled or vaccine/RIG merely prescribed | Not counted as administered |
| Voided/cancelled dose or duplicate submission | No duplicate receipt or completion count |
| Booster or alternative clinician-approved plan | Evaluated against its own required regimen and correct reporting rule |
| Historical report rerun after patient's birthday | Historical age grouping remains stable |
| Missing DOB, category, animal, or location | Visible unknown/unassessed counts; no false zero-age or automatic category |
| Outcome occurs after the selected cutoff | Excluded from that historical cutoff; later snapshot may include it |
| Prior period has zero cases | Show absolute change and percentage N/A, not infinity or a misleading 100% |
| Current quarter is incomplete | Mark partial and compare with equally elapsed dates or decline the comparison |
| Patient has two overdue doses | Episode count 1, patient count 1, dose count 2 where both are valid outstanding requirements |
| All records absent or denominator zero | Distinguish no data, N/A, and observed zero; no misleading 0% performance |
| Another clinic's user requests the data | Server denies access to aggregates, snapshots, details, and exports |
| Conference export is generated | No identifiers, precise household markers, disclosive free text, or recoverable suppressed cells |
| Official template and summary use identical definitions | Counts match exactly; any different cohort/date basis is labeled and explained |
| Accepted source records change after finalization | Original snapshot remains reproducible; correction creates an auditable revision |

During implementation, extend `DohReportsTest.php` and add focused shared-service and end-to-end checks for these substantive rules. Use synthetic records for tests. Existing feature-test execution was attempted during Phase 0 but stopped at bootstrap loading; no feature assertions ran. The isolated probes reproduced current defects and are not acceptance tests for the redesign.

## Appendix K - Definition of done

The redesign is ready when the clinic can generate a reproducible meeting pack from validated report data; every displayed figure has a clear definition and source; official totals reconcile for identical scopes; incomplete/unknown information is disclosed; external presentations exclude patient-identifying information; and the action register links each proposed intervention to measurable evidence. Accepted exposures must remain reportable without doctor or nurse records, and expected pending information, unknown outcomes, explicit no-PEP decisions, and verified treatment must remain distinguishable in every chart, export and snapshot.

Planning work in this document does not establish actual Tagoloan findings, clinical compliance, or DOH acceptance. Implementation should preserve existing clinical decisions and workflow while improving how their recorded results are counted and presented.

## Sources

Accessed/researched 14 November 2026. Dates below refer to the source where identifiable.

- **S1 — WHO, 8 September 2025.** [Routine health information system and health facility data for neglected tropical diseases: Rabies](https://www.who.int/publications/i/item/9789240107304). Official publication overview verified; full PDF retrieval blocked.
- **S2 — Philippine Statistics Authority.** [System of Designated Statistics release calendar](https://psa.gov.ph/philippine-statistical-system/sds/advance-release-calendar?page=22). DOH/FHSIS rabies indicator listing for Q4 2025, release date 31 March 2026. This is an indicator listing, not a full calculation specification.
- **S3 — DOH official FOI response, 29 July 2025.** [Rabies Vaccination Guidelines](https://www.foi.gov.ph/agencies/doh/rabies-vaccination-guidelines/). Identifies the RITM training references at the date of response. Official indexed response retrieved; direct page fetch intermittently unavailable.
- **S4 — DOH CHD-CaLaBaRZon.** [FHSIS Quarterly Reports 2025](https://ro4a.doh.gov.ph/fhsis-quarterly-reports-2025/). Official indexed reporting reminders retrieved; direct fetch blocked. Used for data-quality principles, not Region X-specific instructions.
- **S5 — WHO.** [Rabies vaccinations and immunization](https://www.who.int/teams/control-of-neglected-tropical-diseases/rabies/vaccinations-and-immunization/). Used only for the analytical distinction between exposure category, treatment indication, and receipt; not to prescribe a new regimen.
