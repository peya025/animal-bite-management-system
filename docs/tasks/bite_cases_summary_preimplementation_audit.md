# Bite Cases Summary: Pre-implementation Audit

Audit date: 14 November 2026  
Scope: Current local implementation, reviewed before revising the phased redesign plan.  
Status: Complete across all implementation and verification phases (Phases 0 through 7: `BCS-00.1` through `BCS-07.3`). All 16 audit findings (`A01`–`A16`) are **Closed** and verified with 35 passing feature tests (655 assertions) across `tests/Feature/Reports/` and `tests/Feature/DohReportsTest.php` and `tests/Feature/Form2PlaceOfExposureTest.php`. Phase 8 advanced supply forecasting remains deferred. Full verification matrix and audit closure evidence documented in [Phase 7 Verification & Handoff Package](./bite_cases_summary_phase_7_verification_and_handoff.md).

Related plan: [Phased reporting and planning redesign](./bite_cases_summary_reporting_redesign_plan.md).

## Audit method and limits

- Inspected report queries, category/age/RIG accessors, status resolution, registration and mobile check-in episode creation, report request validation, routes, print services, summary UI and existing report tests.
- Ran five isolated PHP probes against the actual `DohReportService` and `BiteIncident` code, using synthetic in-memory values and Composer autoload. No Laravel application boot or database access was needed for these probes.
- Resolved the PHPUnit bootstrap path issue (`BCS-00.2`): running PHPUnit from `backend/` (`Push-Location backend; & C:\xampp\php\php.exe vendor/phpunit/phpunit/phpunit ...; Pop-Location`) cleanly loads `backend/phpunit.xml` and `backend/vendor/autoload.php` with SQLite `:memory:` isolation (`PHPUnit 11.5.55`, PHP `8.2.12`).
- Phase 2 automated verification passed: `50 tests, 364 assertions` across report/print/map suites (`PrintControllerCharacterizationTest`, `PrintAuthAndAuthorizationTest`, `ReportControllerCharacterizationTest`, `DohReportsTest`, `PrintLogosSetupTest`, `BiteMapDetailsTest`, `RegistrationReportsTest`, `RegistrationReportControllerCharacterizationTest`) and `46 tests, 369 assertions` across clinical regression suites (`RegistrationReturningPatientCheckInTest`, `TriageDoctorAndReExposureTest`, `CategoryITreatmentLogicTest`, `ExposureCategoryOwnershipTest`, `PrintLogosSetupTest`).
- Did not inspect actual patient records, query the clinic database, exercise live HTTP routes, or inspect the rendered UI. This audit does not establish the number of affected real records or a live data disclosure.
- Previously researched DOH/WHO references remain in the plan. This audit checked the repository, not a newly obtained Tagoloan reporting specification.
- Existing unrelated task documents and README changes were present before this audit and were preserved.

Evidence labels: **Reproduced** = behavior observed using actual code and synthetic input; **Source confirmed** = executable source path inspected, without end-to-end reproduction; **Pending** = requires runtime or local reporting-policy validation.

## Executive finding

Implement reporting accuracy and access controls before redesigning the presentation. The current incident queries already permit missing doctor/nurse relationships; the main gaps are inconsistent definitions, provisional exposure dates, incomplete-state interpretation, and period/outcome calculations. Avoid rebuilding registration or changing clinical decisions simply to populate a report.

## Findings register

Priority: **High** means address before report finalization or conference export; **Medium** means address before the relevant feature is considered complete. Findings resolved through Phases 2–3 carry closure notes below; Phases 4–7 items remain open for upcoming implementation.

| ID | Priority / evidence | Finding and consequence | Source evidence | Planned phase / status |
|---|---|---|---|---|
| A01 | High / Source confirmed | Web print routes have no explicit auth middleware. Print service permits absent authenticated user, request `clinic_id`, and fallback to the first clinic. This is an access-control concern independent of hiding UI cards. Actual HTTP accessibility was not tested. | `backend/routes/web.php:11`; `backend/app/Services/Print/PrintDocumentService.php:22`, `:64`, `:84`, `:103`; global middleware in `backend/bootstrap/app.php` | Phases 2, 7 **Closed** (auth/query token verification & cross-clinic isolation in `PrintAuthAndAuthorizationTest` and `Phase7ScenarioVerificationAndAccessTest`) |
| A02 | High / Source confirmed | A staff-registration episode can put consultation date or today's date into `bite_date` before exposure assessment. Date-based reports can mistake a provisional value for the true exposure date. Incident creation in this path is conditional on vitals or animal data. | `backend/app/Services/Clinical/PatientService.php:461`; fallback creation in `backend/app/Services/Clinical/TreatmentRecordService.php:312` | Phases 1–5, 7 **Closed** (`bite_date_is_provisional`, `unknown_exposure_date_count`, and summary API/UI disclosures verified in `DohReportsTest` and `Phase7ScenarioVerificationAndAccessTest`) |
| A03 | High / Reproduced | Weekly ranges extend outside the requested period, and report queries use the expanded bounds. November 2026 produces 26 October through 6 December. Neighboring records can enter registry totals and monthly weekly rows. | `backend/app/Services/DohReportService.php:33`, `:220`, `:439` | Phases 2, 7 **Closed** (`generateWeekRanges` and `buildBoundedWeeklyTrend` clamped to period bounds in `DohReportsTest`) |
| A04 | High / Reproduced | An episode with `awaiting_assessment` status and patient `has_completed_primary=true` produces 100% completion in the completion helper. Current episode outcome can be replaced by lifetime history. | `backend/app/Services/DohReportService.php:372`, `:501`, `:509` | Phases 3, 7 **Closed** (`has_completed_primary` removed; `TreatmentOutcomeResolver` uses current-episode `TreatmentPlan` evidence in `Phase3IncompleteJourneysAndOutcomesTest`) |
| A05 | High / Reproduced | RIG type can be derived from text describing an indication and then counted as RIG receipt. The accessor also checks medication labels without validating completed, nonvoid administration. | `backend/app/Models/BiteIncident.php:338`; `backend/app/Services/DohReportService.php:59`, `:217`, `:373` | Phases 3, 7 **Closed** (`TreatmentOutcomeResolver::resolveRigEvidence` separates `rig_indicated` from verified `given_rig`/`hrig`/`erig` in `Phase3IncompleteJourneysAndOutcomesTest`) |
| A06 | High / Source confirmed | “PEP compliance” is any matching dose, not completion. Summary receipt checks lack the DOH helper's void/cancel and dose-code exclusions. Current status resolution uses similar broad receipt predicates. | `backend/app/Services/Clinical/BiteCaseService.php:468`, `:536`, `:557`; `backend/app/Models/BiteIncident.php:128`; compare `DohReportService.php:476` | Phases 3–7 **Closed** (`TreatmentOutcomeResolver`, explicit `new_course_prescribed`/`new_course_started`/`initiation_rate_pct` & versioned `ReportingMetricService` contract in `Phase3IncompleteJourneysAndOutcomesTest`, `Phase7ScenarioVerificationAndAccessTest`) |
| A07 | High / Source confirmed | Headline overdue/compliance figures use all currently active clinic episodes; selected-period rows use a filtered set. Overdue is evaluated against today. A historical report mixes reporting scopes. | `backend/app/Services/Clinical/BiteCaseService.php:475`, `:545` | Phases 3–7 **Closed** (`computeBacklogAtCutoff`, `d0_cohort_metrics`, `service_period_metrics`, and exposure-period splits separated cleanly in `Phase3IncompleteJourneysAndOutcomesTest`) |
| A08 | High / Reproduced in helper; query path source confirmed | DOH receipt helper accepts a dose after the reporting cutoff because it has no cutoff argument. Report queries restrict exposure date but do not bound related treatment events. Historical outcome totals can change later. | `backend/app/Services/DohReportService.php:33`, `:191`, `:349`, `:476` | Phases 3, 6, 7 **Closed** (`cutoff` evaluated across all reporting services; immutable `BiteReportSnapshot` with auditable version revisions in `Phase6SnapshotsActionsAndExportsTest`) |
| A09 | High / Source confirmed | Cohort totals iterate only categories I–III, dropping unassessed episodes from that total. Registry/monthly totals use different counting paths. No reconciliation explains the difference. This is a reporting-scope gap; official inclusion still needs validation. | `backend/app/Services/DohReportService.php:368`, `:377`, `:404`; category accessor `backend/app/Models/BiteIncident.php` | Phases 3–7 **Closed** (`reconciliation`/`reconciliation_bridge`, `cohort_quarterly_form_slice`, `isExcludedNonEpisode`, and 17-episode reconciliation across all 5 endpoints in `Phase4SummaryAndReconciliationTest`) |
| A10 | High / Source confirmed | Human rabies count is hardcoded to zero. Missing surveillance evidence is presented as a numeric result. | `backend/app/Services/DohReportService.php:85`, `:128` | Phases 2, 7 **Closed** (`human_rabies_cases` returns `null` with `unavailable_reason = 'source_not_verified'` in `DohReportsTest`) |
| A11 | Medium / Source confirmed | Age groups use current age; missing DOB can resolve to stored age or zero. Historical age groups can shift, and unknown age can be interpreted as a young child. | `backend/app/Models/Patient.php:529`; `backend/app/Services/DohReportService.php:51` | Phases 2, 7 **Closed** (`Patient::ageAtDate($biteDate)` computes age at exposure date; unknown DOB separated from `<15` in `DohReportsTest`) |
| A12 | Medium / Source confirmed | DOH category filters use severity codes while display can fall back to intake category. Unknown animal types merge into “other” in the location summary. Fixed 100% category labels hide unassessed cases. | `DohReportService.php:37`, `:84`; `BiteIncident.php` category accessor; `BiteCaseService.php:522` | Phases 2–7 **Closed** (canonical category/animal separation, strict `other_animals` vs `unknown_animals`, unassessed counts retained across all endpoints in `Phase4SummaryAndReconciliationTest`) |
| A13 | Medium / Source confirmed | Backend category-weighted risk can reach 150; frontend has a different bounded 35/35/20/10 formula and clamps backend display. There is no single interpretation for meeting use. | `backend/app/Services/Clinical/BiteCaseService.php:515`; `frontend/src/features/bite-cases/pages/BiteCaseRiskDashboard.tsx:220`, `:917` | Phases 5–7 **Closed** (replaced competing risk score with transparent observable KPI cards, patient journey matrix, and location rankings in `BiteCasesOverviewTab.tsx`) |
| A14 | Medium / Source confirmed | Category/month inputs are loosely validated; date order is not enforced in the request classes. Registry swaps reversed dates while monthly processing does not use the same normalization. | `backend/app/Http/Requests/Reports/ExposureRegistryReportRequest.php`, `MonthlyReportRequest.php`; `DohReportService.php:22`, `:177` | Phases 2, 7 **Closed** (strict `FormRequest` validation enforcing date order, category, and cutoff in `ReportControllerCharacterizationTest`) |
| A15 | High for conference feature / Source confirmed | Report JSON includes identifiable `patient_cases`; UI card restrictions are narrower than report API role access. A conference export cannot safely reuse the full response without an aggregate-only contract. Existing internal access is not automatically unauthorized. | `DohReportService.php:160`, `:312`, `:430`, `:456`; `backend/routes/api.php:192`; `DohReportsSection.tsx:52` | Phases 1–2, 4, 6, 7 **Closed** (`/api/reports/bite-summary` is aggregate-only; drilldowns isolated to `/api/reports/bite-summary/cases`; `privacy_mode=aggregate_only` suppresses `<5` small cells and strips PII in `Phase6SnapshotsActionsAndExportsTest`) |
| A16 | Medium / Source confirmed | Current-period status filtering uses resolved status; prior-period filtering uses stored status. Comparisons can select different kinds of episodes under the same filter. Geography also groups free text. | `backend/app/Services/Clinical/BiteCaseService.php:425`, `:449`, `:466`, `:508` | Phases 4, 7 **Closed** (`resolveLocationSummaryPeriod` & `ExposureReportingQuery` comparison parity; normalized exposure geography without residence fallback in `Phase4SummaryAndReconciliationTest`) |

File names shortened in some evidence cells refer to the full paths shown elsewhere in the table. Line numbers refer to the source reviewed on this date; verify them after implementation changes.

## Existing behavior to preserve

1. Summary and DOH base queries start from `BiteIncident` with eager-loaded optional relationships, not inner joins requiring nurse treatment. A blanket claim that they exclude all Form 1-only records would be incorrect.
2. Staff registration can create `pending_assessment` / `awaiting_assessment` episodes, save animal data through `RegistrationAnimal`, and create a null-dose scheduled vitals record. A null-dose record is therefore not enough evidence of a finalized doctor assessment (`PatientService.php:461–517`).
3. Mobile check-in creates a pending-assessment episode with the intake bite date (`BiteIncidentIntakeService.php:163`), unlike the staff-registration provisional-date path. Both need explicit provenance and deduplication.
4. `BiteIncident::resolveStatus` already recognizes awaiting assessment, referral, awaiting treatment, completed and no-PEP states. Extend shared reporting interpretation after reviewing these rules; do not blindly replace workflow states.
5. The DOH receipt helper excludes voided, scheduled and cancelled doses and dose numbers 200 or higher. Preserve these protections while validating actual product/event semantics and adding cutoff handling.
6. API report queries use clinic scope, and assigned users' clinic IDs take precedence in the controller. The unresolved fallback for unassigned users and the separate web-print path still require tests.
7. Existing report tests cover API structure, representative totals, category filtering, configured clinic details, some authorization behavior and print rendering. They are useful regression starting points, not sufficient coverage of incomplete journeys.

## Executed probes

The probes invoked the current service methods through Composer autoload; private calculation helpers were invoked using reflection only in the temporary audit process. No repository source was modified to execute them.

| Probe | Synthetic input | Observed result | Assessment |
|---|---|---|---|
| P01 | `generateWeekRanges(2026-11-01, 2026-11-30)` | First start `2026-10-26`; last end `2026-12-06` | A03 reproduced |
| P02 | One awaiting-assessment episode; patient has past primary completion flag | `computeCompletionRate` returns `100%` | A04 reproduced |
| P03 | Incident has only `rig_decision_reason = HRIG indicated due to deep bite`; no intake | Derived `rig_type = HRIG` | A05 reproduced; report code treats this derived type as receipt |
| P04 | Completed dose dated `2026-12-01`, considered for a November report | Receipt helper returns true and has no cutoff argument | A08 helper limitation reproduced; full report effect not executed |
| P05 | Same dose with `voided_at` populated | DOH receipt helper returns false | Existing exclusion verified |

Standalone PHP command exited successfully. These are diagnostic observations, not five passing acceptance tests for a redesign.

### PHPUnit verification (resolved)

Running PHPUnit from the repository root failed because `backend/phpunit.xml` resolves `vendor/autoload.php` relative to the working directory. Running from `backend/` (`Push-Location backend; & C:\xampp\php\php.exe vendor/phpunit/phpunit/phpunit ...; Pop-Location`) cleanly boots `PHPUnit 11.5.55` on `PHP 8.2.12` using SQLite `:memory:`.

After Phase 2 implementation (`BCS-02.1`–`BCS-02.3`), executed report/print/map feature suites (`50 tests, 364 assertions`) and clinical regression suites (`46 tests, 369 assertions`) passed with 0 failures.

After Phase 3 implementation (`BCS-03.1`–`BCS-03.3`), `Phase3IncompleteJourneysAndOutcomesTest` passed (`7 tests, 106 assertions`) and the combined 14-suite reporting + clinical workflow regression run passed (`118 tests, 834 assertions`, 0 failures), along with `183` Phase 1 fixture checks.

After Phase 4 implementation (`BCS-04.1`–`BCS-04.3`), `Phase4SummaryAndReconciliationTest` + `Form2PlaceOfExposureTest` passed (`10 tests, 235 assertions`) and the 15-suite reporting/print/map/registration/clinical PHPUnit regression passed (`111 tests, 1039 assertions`, 0 failures), alongside `183` Phase 1 fixture checks (`0` failures) and frontend `npx tsc --noEmit` (exit code `0`). Synthetic benchmark on `40` episodes measured `cold=16 queries (694.61 ms)` / `warm=0 queries (21.24 ms)` in the full 15-suite run (`cold=16 queries (592.08 ms)` / `warm=0 queries (6.00 ms)` in the focused 2-suite run). Remaining audit work covers Phases 5–6 (`A13` summary UI risk alignment, Phase 5 dashboard UI presentation & unknown/pending labels, and immutable historical snapshots/PDF conference exports for `A08`/`A15`) plus Phase 7 end-to-end verification.

## Audit questions still open

- Which current DOH/Region X forms and definitions does the RHU accept? Which unassessed/registration-only records belong in each official submission?
- What proportion of stored `bite_date` values is provisional rather than verified exposure dates? Source review identifies the path, not affected records.
- Which accepted intake pathways can leave a legitimate registered exposure without a canonical episode? Do not count every demographic patient registration as a bite incident.
- Can reliable event/finalization and administration timestamps reconstruct historical states, or are saved snapshots required for those periods?
- What are the approved external-treatment evidence and referral acknowledgment rules?
- Do HTTP authorization and clinic-isolation tests reproduce the A01 path? Verify with synthetic clinic fixtures, not real patient information.
- Which permissions are intended for doctor/nurse/registration reporting? Align server policy with that decision.

## Audit outcome and implementation order

The source review and five probes are complete; the audit does not close any finding. Carry A01–A16 into the phase plan. Start with definitions and reproducible fixtures, then access/date integrity, incomplete-journey and treatment calculations, reconciled APIs, UI, snapshots/exports, and full scenario verification. Keep advanced forecasting outside the initial release.
