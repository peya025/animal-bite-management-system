# Release Verification Results — Admin Module Configuration & Station Workflow Overhaul

**Coordinator:** Person 4 (Workflow Implementer & Release Verification Coordinator)  
**Date:** 2026-11-13  
**Workspace / Branch:** `deployment` (`c:\xampp\htdocs\abc\animal-bite-management-system`)  
**Release Gate Verdict:** **HOLD — DO NOT RELEASE TO PRODUCTION YET**

> **Executive Summary:** Person 1 (Backend Configuration), Person 2 (Admin Editor & Provider), Person 3 (Form Field Integration), and Person 4 (Station Capability Policy & Workflow Safeguards) implementations are present and integrated on `deployment`. Targeted module-config, form-integration, and station-workflow test suites pass (**39 passed, 319 assertions**), and the frontend TypeScript + Vite production build compiles cleanly (`exit 0`). However, **3 explicit Release Gate Blockers** remain open and must be resolved before release sign-off:
> 1. **Clinical Regression (`AC-21` — 32 failures in full backend suite):** `31` existing clinical/registration feature tests fail with HTTP `422` due to Person 3's `EffectiveFieldRuleComposer` enforcing `required` defaults on `address_municipality`, `address_barangay`, `province`, `treatment_plan`, and `place_of_exposure`, plus `1` pre-existing failure in `DualNurseWorkstationTest`.
> 2. **Live Browser / Playwright E2E Gap (`P4-M12`, `AC-04/09/10/12/20`):** Playwright E2E specs could not run in Chromium from CLI (`node_modules/.bin/playwright.cmd` absent; Node ESM fails on `react-transition-group` directory import from `@mui/material` when invoking `@playwright/test/cli.js` directly). Keyboard/zoom/live DOM save->reload scenarios remain **Not executed (environment blocked)**.
> 3. **MySQL/MariaDB Staging Rehearsal Gap (`P4-M13`, `AC-05/06`):** Migration, backfill idempotency, and optimistic concurrency were verified on SQLite `:memory:`, not yet executed against the target MySQL/MariaDB staging database (`MySqlConcurrencyTest` skipped under SQLite).

---

## 1. Environment & Verification Commands Executed

| Area | Command Executed | Result Summary | Environment / Notes |
| --- | --- | --- | --- |
| Targeted Module + Form + Station Suites | `cd backend; php artisan test tests/Feature/Clinic/ClinicModuleConfigCharacterizationTest.php tests/Feature/Clinic/ClinicModuleConfigPerson1Test.php tests/Feature/Form1IntegrationTest.php tests/Feature/Form2AndForm3IntegrationTest.php tests/Feature/StationWorkflowPolicyTest.php` | **39 passed (319 assertions), 0 failed, exit 0** | PHPUnit / Laravel SQLite `:memory:` |
| Person 4 Station Workflow Policy Suite | `cd backend; php artisan test tests/Feature/StationWorkflowPolicyTest.php` | **9 passed (102 assertions), 0 failed, exit 0** | PHPUnit / Laravel SQLite `:memory:` |
| Full Backend Regression Suite | `cd backend; php artisan test` | **32 failed, 1 skipped (`MySqlConcurrencyTest`), 459 passed (3125 assertions), exit 1** (Duration: `54.71s`) | `31` failures from Person 3 `EffectiveFieldRuleComposer` required defaults + `1` `DualNurseWorkstationTest` |
| Frontend TypeScript + Production Bundle | `cd frontend; npm run build` (`tsc -b && vite build`) | **Passed, exit 0** (`18.74s`) | Compiled all 7 edited TSX files + `dist/` cleanly |
| Frontend ESLint (7 Person 4 edited TSX files) | `cd frontend; npx eslint ...` | **Exit 1 (`197 problems: 191 errors, 6 warnings`)** | Pre-existing repo debt (`@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`); 0 syntax errors |
| Playwright Browser E2E (`module-config.spec.ts`) | `cd frontend; node ./node_modules/@playwright/test/cli.js test tests/module-config/module-config.spec.ts` | **Not executed / runner error** | `playwright.cmd` missing; `ERR_UNSUPPORTED_DIR_IMPORT` on `@mui/material` / `react-transition-group` |

---

## 2. Audit Finding Disposition (`MC-01` – `MC-15`)

All 15 findings from [admin_module_configuration_audit.md](admin_module_configuration_audit.md) are tracked below with implementation and verification status:

| ID | Summary | Primary Owner | Implementation Evidence | Disposition |
| --- | --- | --- | --- | --- |
| `MC-01` | Save/Reset dirty state & baseline sync | Person 2 | `ModuleConfigPage.tsx` unified draft/baseline state & section-only change detection | **Implemented / Build-Verified; Browser Pending** (`P2`/`P4-M12`) |
| `MC-02` | Schema-driven rendering instead of title-based mapping | Person 2 | `ModuleConfigPage.tsx` stable section/field IDs; `tests/module-config/module-config.spec.ts` | **Implemented / Build-Verified; Browser Pending** |
| `MC-03` | Live workflow/station switches & rejection of unsafe combinations | Person 4 | `StationCapabilityPolicy.php`, `UpdateClinicModuleConfigRequest.php`, `ModuleConfigPage.tsx` (`000`/`101`/`100` blocked, active-triage guard); `StationWorkflowPolicyTest.php` | **Resolved & Automated-Verified** (`P4-M01`..`M05`) |
| `MC-04` | Field rules (Required/Optional/Hidden) connected to live forms & server | Person 3 | `EffectiveFieldRuleComposer` + `Form1IntegrationTest.php` + `Form2AndForm3IntegrationTest.php` | **Integrated; Open Mapping Defect** (`bite_site` mapped to `treatment_section_enabled` instead of `triage_section_enabled`; `31` baseline clinical test failures under `AC-21`) |
| `MC-05` | Enforced station capability checks across queue, check-in, clinical mutations & UI entry points | Person 4 | `EnforcesStationCapabilities.php`, `QueueController.php`, `PatientController.php`, `BiteIncidentIntakeController.php`, `BiteCaseController.php`, `TreatmentRecordController.php`, `TagoloanTreatmentCardController.php`, `VaccinationController.php`, `VaccinationRecordController.php`, `AppointmentController.php`, `TreatmentRecordService.php`; UI gating in `PatientListPage.tsx`, `DoctorPatientListPage.tsx`, `NursePatientListPage.tsx`, `VaccinationSchedulePage.tsx`, `QueueDashboardPage.tsx` | **Resolved & Automated-Verified** (API + UI compile) |
| `MC-06` | Normalized API contract, setup defaults, and legacy backfill | Person 1 | `ClinicModuleConfigPerson1Test.php` (41-key schema, legacy normalization, idempotent backfill) | **Resolved on SQLite; MySQL Staging Pending** |
| `MC-07` | Missing clinic context / cross-clinic isolation | Person 1 / Person 4 | `ClinicModuleConfigPerson1Test.php` (`test_p1_m01..m02`); `StationWorkflowPolicyTest.php` (`test_p4_m10_multi_clinic_isolation_and_full_workflow_round_trip`) | **Resolved & Automated-Verified** |
| `MC-08` | Unknown keys, invalid enums, null boolean coercion | Person 1 | Strict validation in `UpdateClinicModuleConfigRequest`; `ClinicModuleConfigPerson1Test.php` | **Resolved & Automated-Verified** |
| `MC-09` | Developer/staff access boundaries & role vs capability separation | Person 1 / 2 / 4 | `StationWorkflowPolicyTest.php` (`test_p4_m08_role_403_precedes_station_422_and_assigned_module_does_not_escalate`); `ClinicModuleConfigPerson1Test.php` | **API Verified; Browser Route Guard Pending** |
| `MC-10` | Optimistic concurrency revision check & conflict preservation | Person 1 / 2 | Atomic revision check on `PUT /api/clinic-module-config`; draft retention in `ModuleConfigPage.tsx` | **API Verified; Browser Conflict UI Pending** |
| `MC-11` | Atomic audit diff event logging & history viewer | Person 1 / 2 | `test_p1_m09_audit_diff_noop_and_failed_saves` (`PASS`); no-op/failed saves do not emit misleading events | **API Verified; Browser History UI Pending** |
| `MC-12` | Keyboard/screen-reader accessibility & Space-scroll prevention | Person 2 | Updated interactive switches/alerts in `ModuleConfigPage.tsx`; `P4-M12` | **Implemented; Manual/Browser Accessibility Audit Pending** |
| `MC-13` | Narrow layout (360/768/1280px) & 200% zoom usability | Person 2 | Scoped responsive layout updates | **Implemented; Manual/Browser Layout Check Pending** |
| `MC-14` | Unsaved navigation guard & slow-save draft protection | Person 2 | Save lock / draft retention in `ModuleConfigPage.tsx` | **Implemented; Browser Timing Check Pending** |
| `MC-15` | Up-to-date Cycle 8 guide & regression test matrix | Person 4 | Updated [cycle_8_clinic_module_config_ui_guide_test.md](../ui-test-guides/cycle_8_clinic_module_config_ui_guide_test.md), published `verification_results.md` | **Docs Updated; Blocked on Full Regression & Browser Runs** |

---

## 3. Acceptance Matrix (`AC-01` – `AC-22`)

| AC ID | Scenario | Status | Evidence / Blocker |
| --- | --- | --- | --- |
| `AC-01` | Anonymous read/write; inactive staff; staff write denied | **PASS (API)** | `ClinicModuleConfigPerson1Test.php`, `ClinicModuleConfigCharacterizationTest.php` |
| `AC-02` | Admin Clinic A cannot access/mutate Clinic B | **PASS (API)** | `ClinicModuleConfigPerson1Test.php`, `StationWorkflowPolicyTest.php` (`test_p4_m10`) |
| `AC-03` | Admin with missing clinic receives controlled denial | **PASS (API)** | `ClinicModuleConfigPerson1Test.php` |
| `AC-04` | Developer direct URL and save attempt | **PARTIAL (API PASS; Browser NOT RUN)** | API tested in Person 1 suite; Playwright browser check blocked by runner |
| `AC-05` | New setup and seeded clinic round trip | **PARTIAL (SQLite PASS; MySQL NOT RUN)** | `ClinicModuleConfigPerson1Test.php` passes on SQLite `:memory:` |
| `AC-06` | Legacy/partial/null config and backfill rerun | **PARTIAL (SQLite PASS; MySQL NOT RUN)** | `ClinicModuleConfigPerson1Test.php` passes on SQLite `:memory:` |
| `AC-07` | Every supported field and section persists PUT/GET and reload | **PARTIAL (API PASS; Browser NOT RUN)** | `ClinicModuleConfigPerson1Test.php` + `Form1IntegrationTest.php` + `Form2AndForm3IntegrationTest.php` |
| `AC-08` | Unknown key, invalid enum, missing required key, null switch -> 422 | **PASS (API)** | `ClinicModuleConfigPerson1Test.php` |
| `AC-09` | Only one section changes -> Save/Reset enabled and work | **BLOCKED (Browser NOT RUN)** | UI code built (`npm run build`), Playwright spec blocked in CLI |
| `AC-10` | Save succeeds / save fails / load fails recovery | **BLOCKED (Browser NOT RUN)** | UI code built; live error/retry UI requires browser runner |
| `AC-11` | User edits during slow save -> no lost/newer edits | **BLOCKED (Browser NOT RUN)** | UI code built; network-throttled browser check not executed |
| `AC-12` | Two admins save same revision -> one commit, one conflict | **PARTIAL (API PASS; Browser NOT RUN)** | `ClinicModuleConfigPerson1Test.php` passes optimistic locking; conflict UI pending browser |
| `AC-13` | Successful, failed, and no-op saves -> atomic audit history | **PASS (API)** | `test_p1_m09_audit_diff_noop_and_failed_saves` passes (`0.11s`) |
| `AC-14` | Required/Optional/Hidden on representative fields (UI & API) | **PARTIAL (Form Suites PASS; Open Regression & Browser NOT RUN)** | `Form1IntegrationTest.php` + `Form2AndForm3IntegrationTest.php` pass; live browser not run |
| `AC-15` | Conditional field applicability (no invisible required control) | **PARTIAL (API PASS; Browser NOT RUN)** | `Form1IntegrationTest.php` passes; live DOM condition check pending |
| `AC-16` | Essential/derived field locked against Hidden/Optional | **PASS (API)** | `ClinicModuleConfigPerson1Test.php` |
| `AC-17` | Disable supported station with existing work -> defined transition/rejection | **PASS (API + Queue DB + Frontend Build)** | `StationWorkflowPolicyTest.php` (`9 passed, 102 assertions`) |
| `AC-18` | Clinic switch, logout, stale session, config fetch failure | **PARTIAL (Stale Session API PASS; Browser Cache NOT RUN)** | `test_p4_m09` covers stale session vs live DB; client provider cache reset pending browser |
| `AC-19` | Hide section on edit preserves historical stored values | **PARTIAL (Form Suites PASS; Browser NOT RUN)** | `Form1IntegrationTest.php` passes; UI check pending |
| `AC-20` | Keyboard, screen-reader labels, 360/768/1280px & 200% zoom | **BLOCKED (Browser/Manual NOT RUN)** | Requires live browser / manual accessibility pass |
| `AC-21` | Re-exposure, reassessment, vaccination, stock regression suites | **FAIL — BLOCKER (32 failed in full suite)** | **31 failures** due to Person 3 `EffectiveFieldRuleComposer` required defaults (`422` vs `201/409`) + **1 pre-existing failure** (`DualNurseWorkstationTest`) |
| `AC-22` | Mobile/print scope behavior | **PASS (Scope Documented)** | Feature documented as web-only; print/history preserved |

---

## 4. Person 4 Scenario Results (`P4-M01` – `P4-M13`)

Automated API/database counterparts are implemented in `backend/tests/Feature/StationWorkflowPolicyTest.php` (`9 passed, 102 assertions`). Frontend UI build verified via `npm run build` (`exit 0`). Browser-dependent steps remain blocked on Playwright runner repair.

| Case | Title | Automated Result | Browser UI Result | Notes / Observed Outcome |
| --- | --- | --- | --- | --- |
| `P4-M01` | Station Combination Matrix (`111`..`000`) & Baseline E2E Flow | **PASS** (`test_p4_m01_station_combination_matrix_enforced`) | **NOT RUN** (spec written in `module-config.spec.ts`) | Backend enforces `111`, `110`, `011`, `010`, `001` = allowed; `101`, `100`, `000` = `422`. Frontend `ModuleConfigPage.tsx` blocks `101`/`100`/`000` before Save. |
| `P4-M02` | Cannot disable triage while active triage queue exists today (`001` guard) | **PASS** (`test_p4_m02_cannot_disable_triage_while_active_triage_queue_exists_today`) | **NOT RUN** | Verified `422` when `waiting`/`called`/`in_service` triage ticket exists today; succeeds after ticket completes. |
| `P4-M03` | Registration disabled (`011`) blocks intake but preserves read & follow-up | **PASS** (`test_p4_m03_registration_disabled_blocks_registration_but_keeps_read_and_followup_open`) | **NOT RUN** | `POST /api/patients`, `POST /api/bite-intake/check-in` -> `422 station_disabled`; patient reads, doctor triage, and nurse treatment remain allowed. |
| `P4-M04` | Triage disabled (`001`) blocks triage actions while treatment follow-up works | **PASS** (`test_p4_m04_triage_disabled_001_blocks_triage_actions_while_treatment_followup_works`) | **NOT RUN** | New consultation check-in, Form 2 save, transfer-out, reschedule -> `422`; follow-up dose administration & appointment check-in succeed. |
| `P4-M05` / `M06` | Treatment disabled (`110`/`010`) blocks Form 3 & completes Form 2 without stranding | **PASS** (`test_p4_m05_m06_treatment_disabled_blocks_treatment_and_form2_completes_without_stranding`) | **NOT RUN** | `TreatmentRecordService` and `QueueController::complete` mark Form 2 triage ticket `completed` locally instead of creating a dead-end `vaccination` waiting ticket. |
| `P4-M07` | Anti-triage bypass blocks Day 0 direct treatment when triage disabled | **PASS** (`test_p4_m07_anti_triage_bypass_blocks_day0_direct_treatment`) | **NOT RUN** | Direct `POST /api/vaccinations`, `/tagoloan-cards`, `/queue` walk-in/follow-up without completed triage blocked (`422`); Day 0 dose without assessment rejected. |
| `P4-M08` | Role (`403`) vs station capability (`422`) boundary & `assigned_module` non-escalation | **PASS** (`test_p4_m08_role_403_precedes_station_422_and_assigned_module_does_not_escalate`) | **NOT RUN** | Unauthorized roles always receive `403` even when target station is disabled; `assigned_module` never grants role permissions. |
| `P4-M09` | Stale session & queue `callNext` respect live station toggle | **PASS** (`test_p4_m09_stale_session_and_queue_call_next_respect_live_station_toggle`) | **NOT RUN** | `callNext` refuses calls for disabled stations (`422`) and auto-skips disabled stations only for Admin auto-selection; stale client sessions fail server-side. |
| `P4-M10` | Multi-clinic isolation & full Form 1 -> Form 2 -> Form 3 round trip | **PASS** (`test_p4_m10_multi_clinic_isolation_and_full_workflow_round_trip`) | **NOT RUN** | Disabling stations in Clinic A leaves Clinic B `111` fully operational across Form 1 -> Form 2 -> Form 3 -> stock deduction. |
| `P4-M11` | Fresh & upgraded legacy clinic integrated smoke test | **PARTIAL PASS** (Person 1 migration + `test_p4_m10`) | **NOT RUN** | Covered at API layer on SQLite `:memory:`; staging upgrade test pending. |
| `P4-M12` | Independent UI & access verification (keyboard/zoom/conflicts/recovery) | **BLOCKED** | **NOT RUN** | Playwright CLI broken (`ERR_UNSUPPORTED_DIR_IMPORT` on MUI ESM / missing `.bin/playwright.cmd`). |
| `P4-M13` | Release & recovery rehearsal (staging MySQL + rollback + team sign-off) | **BLOCKED** | **NOT RUN** | Blocked on `AC-21` fixes, Playwright execution, and MySQL staging rehearsal. |

---

## 5. Station Enforcement-Point Coverage Inventory

Every backend station-sensitive controller action uses `App\Http\Controllers\Concerns\EnforcesStationCapabilities` -> `App\Services\Clinic\StationCapabilityPolicy`:

| Endpoint / Method | Required Role | Guarded Station(s) | Disabled Response | Non-Stranding / Clinical Behavior |
| --- | --- | --- | --- | --- |
| `PUT /api/clinic-module-config` (`UpdateClinicModuleConfigRequest`) | `admin` | Validates `registration`, `triage`, `treatment` tuple | `422` validation error | Rejects `000`, `101`, `100`; rejects disabling triage (`001`) while active triage queue exists today. |
| `POST /api/patients` (`PatientController::store`) | `admin`, `registration`, `triage` | `registration` | `422 station_disabled` | Zero partial `patients` / `bite_incidents` / `queue_entries` writes. |
| `POST /api/patients/{id}/check-in` (`PatientController::checkIn`) | `admin`, `registration`, `triage` | `registration` | `422 station_disabled` | Existing read endpoints (`GET /api/patients*`) stay open. |
| `POST /api/patients/{id}/check-in-nurse` (`PatientController::checkInNurse`) | `admin`, `registration`, `triage`, `treatment` | `treatment` | `422 station_disabled` | Preserves prior triage/case eligibility requirements before queue creation. |
| `POST /api/bite-intake/check-in` (`BiteIncidentIntakeController::checkIn`) | `admin`, `registration`, `triage` | `registration` + `triage` | `422 station_disabled` | Prevents walk-in triage intake if either Registration or Triage is off. |
| `POST /api/bite-cases/new-exposure` (`BiteCaseController::registerNewExposure`) | `admin`, `registration`, `triage` | `triage` (+ `registration` for non-admin/non-triage) | `422 station_disabled` | New exposure requires clinical triage assessment. |
| `POST/PUT /api/bite-cases`, `/transfer-out` (`BiteCaseController`) | `triage` (role 403 first) | `triage` | `422 station_disabled` | Blocks clinical case mutation/transfer while triage is disabled. |
| `POST /api/treatments`, `/addendum` (`TreatmentRecordController`) | `triage` | `triage` | `422 station_disabled` | `TreatmentRecordService::storeConsultation` completes triage queue locally when Treatment is off (no stranded `vaccination` waiting ticket). |
| `POST /api/tagoloan-cards` (`TagoloanTreatmentCardController::store`) | `treatment`, `triage` | `treatment` | `422 station_disabled` | Enforces role check before station capability check. |
| `POST /api/vaccination-records` (`VaccinationRecordController::store`) | `treatment`, `triage` | `treatment` | `422 station_disabled` | Checked after 403 triage-doctor role rule; prevents stock deduction when off. |
| `POST /api/vaccinations/administer`, `POST /missed` (`VaccinationController`) | `treatment` (after triage-doctor 403 check) | `treatment` | `422 station_disabled` | No dose record or stock deduction on denial. |
| `PUT /api/vaccinations/{id}`, `POST /reschedule` (`VaccinationController`) | `triage` / clinical | `triage` | `422 station_disabled` | Schedule modifications tied to clinical plan require Triage enabled. |
| `POST /api/appointments/{id}/check-in`, `/check-in-by-patient` (`AppointmentController`) | Staff roles | `triage` (consultation) or `treatment` (follow-up) | `422 station_disabled` | Preserves appointment rows without corrupting status. |
| `POST /api/queue`, `/call-next`, `/call`, `/serve`, `/recall`, `/skip`, `/complete` (`QueueController`) | Role-scoped | Station resolved via `resolveQueueStation()` / `resolveStationForVisitType()` | `422 station_disabled` | `QueueService::addToQueue` gates MySQL advisory lock for SQLite test parity; `complete` completes cleanly instead of forwarding to disabled Treatment. |

---

## 6. Detailed Breakdown of Open Release Blockers

### Blocker 1 — Person 3 Clinical / Field-Rule Regressions (`32 failed` in full backend suite)
Running `cd backend; php artisan test` failed **32** tests (`459 passed`, `1 skipped`):
- **31 failures from Person 3 `EffectiveFieldRuleComposer` defaults (`422` vs expected `201` / `409`):**
  - `CategoryITreatmentLogicTest`: 9 failed
  - `PatientDuplicatePreventionTest`: 3 failed
  - `ConsultationDateTimeAutoFillTest`: 3 failed
  - `Form2PlaceOfExposureTest`: 2 failed
  - `ProphylaxisWorkflowTest`: 1 failed (`false is true`)
  - `RegistrationAnimalTest`: 1 failed (`false is true`)
  - `ReturningPendingTreatmentWorkflowTest`: 5 failed
  - `TriageDoctorAndReExposureTest`: 7 failed
  - Root cause observed during triage: `EffectiveFieldRuleComposer` marks `address_municipality`, `address_barangay`, `province`, `treatment_plan`, and `place_of_exposure` unconditionally `required` by default, breaking existing API payloads and workflows. Also `bite_site` was observed mapped under `treatment_section_enabled` instead of `triage_section_enabled`.
- **1 pre-existing failure:**
  - `DualNurseWorkstationTest > dose administration stamps server side identity and signature` (failed asserting row in `bite_incidents`).

### Blocker 2 — Live Browser & Accessibility Execution Blocked
- `frontend/tests/module-config/module-config.spec.ts` (including `P4-M01` station policy case) was not runnable via CLI because `playwright` binary is missing from `frontend/node_modules/.bin/` and invoking `node ./node_modules/@playwright/test/cli.js` errors on `ERR_UNSUPPORTED_DIR_IMPORT` importing `react-transition-group/TransitionGroupContext` from `@mui/material/internal/Transition.mjs`.
- Manual Chromium verification (`P4-M12`, `AC-04/09/10/11/12/14/15/19/20` at 360px/768px/1280px and 200% zoom) must be run once Playwright/browser tooling is restored in dev/CI.

### Blocker 3 — MySQL/MariaDB Staging Migration & Rollback Rehearsal
- All automated PHPUnit checks ran against SQLite `:memory:` (`MySqlConcurrencyTest` skipped with warning).
- Staging rehearsal against MySQL/MariaDB must verify additive column/backfill idempotency, strict `TINYINT(1)` / boolean handling, and config snapshot rollback before production cutover.

---

## 7. Pre-Release Pilot & Rollback Checklist

Before clearing **HOLD**:
1. **Person 3 fix + full suite green:** Reconcile `EffectiveFieldRuleComposer` default required rules (`address_municipality`, `address_barangay`, `province`, `treatment_plan`, `place_of_exposure`) and `bite_site` section mapping, plus investigate `DualNurseWorkstationTest`; rerun `cd backend; php artisan test` until `0 failed`.
2. **Browser E2E + Accessibility pass:** Fix Playwright installation/runner or execute `tests/module-config/module-config.spec.ts` + manual Cycle 8 walkthrough (`P2-M10/M11`, `P4-M12`) in Chromium against live backend + frontend dev/preview servers.
3. **MySQL Staging Rehearsal:** Snapshot clinic config table, run migration + backfill twice on staging MySQL/MariaDB, verify idempotency + `MySqlConcurrencyTest`, test `111 -> 001 -> 111` recovery, then complete sign-off by Persons 1, 2, 3, and 4 in [team_assignments.md](team_assignments.md).
