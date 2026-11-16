# Bite Cases Summary — Phase 1 Definition and Baseline Package

Date: 14 November 2026  
Rule draft: `bcs-phase1-local-v1`  
Status: Technical definitions, source mapping, confirmed 3-form baseline crosswalk, and synthetic baseline prepared and checked. Clinic agreement on final permission policy (`D03`) and local reporting edge policies (`D02`, `D04–D07`) remains pending. No application behavior changed.

Parent: [Phased plan](./bite_cases_summary_reporting_redesign_plan.md). Evidence: [Pre-implementation audit](./bite_cases_summary_preimplementation_audit.md).

## Delivered in this phase

| Work package | Result | Remaining dependency |
|---|---|---|
| BCS-01.1 Report ownership and definitions | Confirmed the 3 `Reports & Analytics > DOH Submissions` forms (`Rabies Exposure Registry`, `ABTC Monthly Report`, `Cohort Report (Quarterly)`) as the baseline; operational rules and column crosswalk specified | Clinic confirmation of remaining edge-rule policy (`D02`, `D04–D07`) and designated report owner |
| BCS-01.2 Data provenance | Repository creation paths and field/evidence rules mapped | Runtime validation of legacy records and any additional import paths |
| BCS-01.3 Fixtures and permissions | Synthetic monthly/quarterly fixture with 3-form baseline expectations, Appendix E reconciliation, executable arithmetic verifier, and permission proposal | Clinic agreement on future capabilities (`D03`); application tests in later phases |

Deliverables:

- This metric dictionary, crosswalk, source map, permissions and decision register.
- [Synthetic fixture](./bite_cases_summary_phase_1_fixtures.json): 17 episodes, 11 distinct courses, 3 excluded non-episode inputs, and the Appendix E 100-episode reconciliation benchmark.
- [Fixture verifier](./bite_cases_summary_phase_1_verify.php): database-free reference arithmetic and integrity checks, not production reporting code.

## 1. Reporting populations and default rules

### Recorded exposures

A recorded exposure is an accepted, clinic-scoped incident linked to the patient and the relevant encounter. It does not require doctor assessment or nurse administration. A demographic patient registration, unsent draft or booking alone is not automatically an exposure.

For an exposure-date report, include distinct accepted episodes with a usable exposure date inside the selected interval. Display accepted episodes with unknown/provisional dates in a separate registration-date-based count. Never silently count consultation date as exposure date. Therefore “recorded exposures in this exposure period” and “registrations received during this period” are different measures.

Exclude duplicate/void records according to their auditable disposition; do not merge legitimate re-exposures. In this phase, records in fixtures are normalized synthetic facts, not inserts for the current database schema.

### Assessed, prescribed and treated

- **Assessed:** an episode has a finalized doctor assessment by the cutoff, supported by its episode-linked finalized record. A scheduled null-dose vitals record does not qualify.
- **Category known:** finalized assessment and explicit I/II/III category. A missing category after finalization is a documentation gap; a patient not yet assessed belongs in a different bucket.
- **New course prescribed:** finalized decision requiring a new primary/booster course for the episode. Retain such episodes without receipt in this denominator.
- **Continued course:** explicit decision to continue a linked course, counted separately from new-course initiation. This resolves an ambiguity in the earlier broad “PEP started” draft: the card must say **New-course PEP initiation**, or explicitly present new and continuing groups separately.
- **Administration recorded:** qualifying nonvoid, noncancelled actual administration, supported by event date and local or accepted external evidence. Prescription, dose number alone and RIG indication do not establish receipt.
- **No PEP required:** explicit doctor decision; not inferred from absence of nurse records. Pending TT/other care is independent of the rabies PEP decision and may keep the encounter open.

### Reporting dimensions, precedence, and conflict rules

Each accepted exposure episode derives six independent reporting dimensions as of the selected cutoff rather than overloading a single status column:

| Dimension | Allowed reporting values | Primary evidence & precedence | Conflict / edge handling |
|---|---|---|---|
| `assessment` | `not_recorded`, `draft_in_progress`, `finalized` | Episode-linked consultation (`TreatmentRecord` with `nature_of_visit` populated and `dose_number` null, distinct from prophylaxis rows) + episode `confirmed_at` / assessment fields; `finalized` beats `draft_in_progress` beats `not_recorded` | Scheduled null-dose registration vitals (`status = scheduled`, no `nature_of_visit`) stay `not_recorded`; draft consultations stay `draft_in_progress`; verified treatment without finalized assessment flags a conflict while preserving the treatment event |
| `pep_decision` | `not_determined`, `new_course_prescribed`, `continue_course`, `explicit_no_pep`, `missing_after_finalization`, `conflict_review` | Only evaluated after `assessment = finalized` (otherwise `not_determined`). `TreatmentPlan` (`plan_type` / `status` / `decided_at`) + finalized consultation orders (`prescribed_vaccine_type`, `no_injection_required`, Category I rules) | Blank decision on a finalized assessment is `missing_after_finalization` (never inferred as `explicit_no_pep`). If `explicit_no_pep` coexists with a verified qualifying ARV administration, classify as `conflict_review` and retain both source records |
| `administration_evidence` | `no_qualifying_administration`, `verified_local`, `verified_external`, `both_local_and_external`, `conflict_review` | Qualifying nonvoid, noncancelled ARV administration rows (`status = administered` / completed dose event) with effective service date `<= cutoff` and verification timestamp `<= cutoff` | Prescriptions, scheduled rows, cancelled/voided rows, TT/ATS rows, and RIG indication text alone do not establish ARV receipt. RIG receipt is tracked separately from ARV initiation |
| `course_outcome` | `not_applicable`, `not_started`, `ongoing_not_due`, `completed`, `clinically_discontinued`, `outcome_unknown` | Course-scoped evaluation of ordered required dose slots (`TreatmentPlan.ordered_dose_days` / fixture `required_due_dates`) against verified administrations through `cutoff`. Overlapping `overdue` flag triggers when any required unfulfilled slot has `due_date < cutoff` | `explicit_no_pep` -> `not_applicable`. Prescribed without ARV initiation -> `not_started`. Past patient `has_completed_primary` flag never completes a new course. Referred episodes keep any already-given local doses and set `outcome_unknown` until external outcome is verified |
| `encounter_disposition` | `open`, `closed`, `transferred_referred`, `closed_before_assessment`, `closed_before_treatment` | Encounter/queue/consultation closure and referral fields (`outcome = 'Transferred/Referred'`, `referred_to`, documented closure reason) | Pending non-PEP care (e.g., TT/ATS ordered) keeps `open` even when `pep_decision = explicit_no_pep`. `transferred_referred` overlaps `administration_evidence` and never deletes local doses or implies patient refusal |
| `data_availability` | `known`, `not_yet_assessed`, `not_yet_recorded`, `unknown_unverified`, `not_applicable`, `conflicting` | Stage-aware availability per field/measure at `cutoff` | Missing category before `finalized` assessment is `not_yet_assessed` (expected pending); missing category or decision after `finalized` is `not_yet_recorded` (documentation gap); missing external outcome after transfer is `unknown_unverified` |

### Time and maturity

All period boundaries and cutoffs use Asia/Manila. Date-only fixtures include the entire cutoff day. The baseline has no late-entered records or reassessments; production reporting must distinguish effective clinical date, evidence-recording time and version/snapshot time.

The local **mature-cohort completion** measure uses distinct started courses whose first qualifying ARV administration falls within the selected cohort period and whose last prescribed required-dose date is at or before cutoff. It does not use all exposure episodes as the denominator. The fixture uses no additional grace interval; any approved local reporting grace period must be versioned before use. This is a product rule for verification, not a DOH completion definition or a treatment recommendation.

Required doses come from the actual ordered plan. Fixture dose dates are examples only. Match actual administrations to required dose slots in Phase 3; do not copy the verifier's exact-date matching into production because late valid doses require proper slot resolution.

## 2. Metric dictionary

Every metric entry conforms to the 12-field schema below (`rule_version = bcs-phase1-local-v1`, `classification = local_operational` unless later validated against an approved RHU/DOH specification):

- **Shared metadata:** `clinic_id` scope, `period_start`..`period_end` (`Asia/Manila`), `outcome_cutoff`, `classification`, and `rule_version` (`bcs-phase1-local-v1`).
- **Display & zero rules:** Ratios are stored as exact integer numerators/denominators and displayed to one decimal place. A zero denominator returns `null` with reason `not_applicable` or `no_data`, never a fabricated `0%`.

| `metric_id` & user-facing label | Classification & rule version | Counting unit & eligible population | Numerator / denominator | Period basis & outcome cutoff | Exclusions, unknown handling & numeric example |
|---|---|---|---|---|---|
| `EXP01` — Recorded exposure episodes | `local_operational` / `bcs-phase1-local-v1` | Distinct accepted `bite_id`; clinic-scoped accepted exposure episodes | Numerator: matching accepted `bite_id` count; Denominator: N/A (count) | Exposure date (`bite_date`) within period; cutoff applies to episode disposition | Exclude bookings, unsubmitted drafts, demographic-only records, and voided/duplicate episodes; provisional/missing dates move to `EXP03` |
| `EXP02` — Unique patients | `local_operational` / `bcs-phase1-local-v1` | Distinct `patient_id`; patients linked to `EXP01` episodes | Numerator: distinct `patient_id` in `EXP01`; Denominator: N/A (count) | Same exposure-date scope as `EXP01`; evaluated at cutoff | Same exclusions as `EXP01`; missing `patient_id` link is flagged as data-quality error rather than fabricating identity |
| `EXP03` — Registered episodes with unknown exposure date | `local_operational` / `bcs-phase1-local-v1` | Distinct accepted `bite_id`; accepted episodes lacking a verified exposure date | Numerator: matching `bite_id` with provisional/null `exposure_date`; Denominator: N/A (count) | Registration/check-in date within period (explicitly non-exposure basis); cutoff applies to disposition | Exclude verified exposure-date episodes (`EXP01`); includes staff-registration/fallback provisional `bite_date` values |
| `AS01` — Finalized assessments | `local_operational` / `bcs-phase1-local-v1` | Distinct `bite_id`; `EXP01` episodes | Numerator: `EXP01` with `assessment = finalized` by cutoff; Denominator: N/A (count) | Exposure period + assessment effective/recorded by cutoff | Exclude draft consultations and scheduled null-dose vitals; unassessed episodes remain visible in `AS03` |
| `AS02` — Assessment completion | `local_operational` / `bcs-phase1-local-v1` | Percentage of episodes; `EXP01` episodes | Numerator: `AS01`; Denominator: `EXP01` | Exposure period; assessment finalized `<= cutoff` | Same exclusions as `EXP01`/`AS01`; unassessed stays in denominator. **Example:** Nov `12 / 14 = 85.7%`; Appendix E `80 / 100 = 80.0%` |
| `AS03` — No finalized assessment recorded | `local_operational` / `bcs-phase1-local-v1` | Distinct `bite_id`; `EXP01` episodes | Numerator: `EXP01 - AS01`; Denominator: N/A (count) | Exposure period; evaluated at cutoff | Disaggregate open awaiting-assessment vs documented closed disposition; never infer no-PEP |
| `CAT01` — Exposure categories (I, II, III, unassessed, assessed-missing) | `local_operational` / `bcs-phase1-local-v1` | Distinct `bite_id`; `EXP01` episodes partitioned by category bucket | Numerator: count per bucket (`I`, `II`, `III`, `not_yet_assessed`, `assessed_category_missing`); Denominator: N/A (counts) | Exposure period; finalized assessment category at cutoff | Unfinalized drafts remain `not_yet_assessed`; finalized without category is `assessed_category_missing` (never defaults to `II`) |
| `CAT02` — Category III share | `local_operational` / `bcs-phase1-local-v1` | Percentage of assessed episodes with known category; `EXP01` with `assessment = finalized` and `category in {I, II, III}` | Numerator: `CAT01` Category `III`; Denominator: `CAT01` (`I + II + III`) | Exposure period; finalized category at cutoff | Excludes `not_yet_assessed` and `assessed_category_missing` from denominator while showing both nearby. **Example:** Nov `3 / 11 = 27.3%` (not `3 / 14`) |
| `DEC01` — No PEP required | `local_operational` / `bcs-phase1-local-v1` | Distinct `bite_id`; `EXP01` with `assessment = finalized` | Numerator: `pep_decision = explicit_no_pep`; Denominator: N/A (count) | Exposure period; finalized decision `<= cutoff` | Exclude from vaccine initiation/completion denominators; pending TT/ATS tracked separately in encounter disposition |
| `DEC02` — Treatment decision missing | `local_operational` / `bcs-phase1-local-v1` | Distinct `bite_id`; `EXP01` with `assessment = finalized` | Numerator: `pep_decision = missing_after_finalization`; Denominator: N/A (count) | Exposure period; evaluated at cutoff | Documentation-gap count; never infer `explicit_no_pep` from blank decision fields |
| `PEP01` — New-course PEP prescribed | `local_operational` / `bcs-phase1-local-v1` | Distinct `bite_id`; `EXP01` with `assessment = finalized` | Numerator: `pep_decision = new_course_prescribed` (primary or booster); Denominator: N/A (count) | Exposure period; finalized decision `<= cutoff` | Excludes `continue_course`, `explicit_no_pep`, and unassessed episodes; retains no-receipt episodes |
| `PEP02` — Documented new-course initiation | `local_operational` / `bcs-phase1-local-v1` | Percentage of prescribed episodes; `PEP01` episodes | Numerator: `PEP01` with verified qualifying ARV administration by cutoff; Denominator: `PEP01` | Exposure period; ARV service date and verification `<= cutoff` | Includes verified external starts (labeled separately); retains no-receipt episodes in denominator. **Example:** Nov `5 / 8 = 62.5%`; Q4 `7 / 10 = 70.0%`; Appendix E `50 / 60 = 83.3%` |
| `PEP03` — No administration recorded for new course | `local_operational` / `bcs-phase1-local-v1` | Distinct `bite_id`; `PEP01` episodes | Numerator: `PEP01 - initiated` (`PEP02` numerator); Denominator: N/A (count) | Exposure period; evaluated at cutoff | Includes referred episodes without verified receipt; label as no administration recorded, not proof of non-treatment elsewhere |
| `PEP04` — Continuing-course episodes | `local_operational` / `bcs-phase1-local-v1` | Distinct `bite_id`; `EXP01` with `assessment = finalized` | Numerator: `pep_decision = continue_course` with valid prior course link; Denominator: N/A (count) | Exposure period; decision `<= cutoff` | Excluded from `PEP01` new-course denominator; never creates a second course denominator |
| `OUT01` — Mature started courses | `local_operational` / `bcs-phase1-local-v1` | Distinct `course_id`; started courses with `D0` inside cohort period | Numerator: started courses whose final required due date `<= cutoff`; Denominator: N/A (count) | Cohort entry (`D0` verified ARV date) within period; maturity evaluated at `cutoff` | Excludes unstarted courses, courses missing ordered dose plans (disclosed separately), and courses maturing after cutoff (`OUT03`) |
| `OUT02` — Mature-cohort completion | `local_operational` / `bcs-phase1-local-v1` | Percentage of mature courses; `OUT01` courses | Numerator: `OUT01` courses with all required slots fulfilled by verified ARV events `<= cutoff`; Denominator: `OUT01` | Cohort entry (`D0`) within period; doses verified `<= cutoff` | Retains incomplete, transferred-without-proof, and clinically discontinued mature courses in denominator (disclosed separately). **Example:** Nov `3 / 4 = 75.0%`; Q4 `6 / 7 = 85.7%` |
| `OUT03` — Started, not yet mature | `local_operational` / `bcs-phase1-local-v1` | Distinct `course_id`; started `D0`-cohort courses | Numerator: started courses with final required due date `> cutoff`; Denominator: N/A (count) | Cohort entry (`D0`) within period; maturity compared against `cutoff` | Kept separate from noncompletion (`OUT02` excludes these). **Example:** Nov `1`; Q4 `0` |
| `FU01` — Overdue started courses / episodes / patients / slots | `local_operational` / `bcs-phase1-local-v1` | Separate distinct counts (`course_id`, `bite_id`, `patient_id`, required dose slots); active started courses | Numerator: distinct count with unfulfilled valid required slot `due_date < cutoff`; Denominator: N/A (counts) | Dose due date `< cutoff` (backlog basis, distinct from `EXP01` exposure period) | Excludes cancelled/voided/superseded appointments; never relabel dose slots as patients or episodes |
| `RIG01` — Verified RIG receipt among indicated episodes | `local_operational` / `bcs-phase1-local-v1` | Percentage of RIG-indicated episodes; `EXP01` with documented RIG indication | Numerator: indicated `EXP01` with verified qualifying RIG administration `<= cutoff`; Denominator: `EXP01` with documented RIG indication | Exposure period; RIG service date and verification `<= cutoff` | Indication text or `rig_type` accessor alone never counts as receipt; includes verified external RIG; unknown indication reported separately. **Example:** Nov/Q4 `2 / 3 = 66.7%` |
| `REF01` — Transferred/referred episodes | `local_operational` / `bcs-phase1-local-v1` | Distinct `bite_id`; `EXP01` episodes | Numerator: `EXP01` with documented transfer/referral `<= cutoff`; Denominator: N/A (count) | Exposure period; referral timestamp `<= cutoff` | Overlapping flag (do not sum with initiation/completion); unknown destination/external outcome disclosed explicitly |
| `SVC01` — Local ARV administration events | `local_operational` / `bcs-phase1-local-v1` | Distinct `treatment_id` (local administration event); all clinic ARV records | Numerator: nonvoid, noncancelled local ARV events with `service_date` in period and verified `<= cutoff`; Denominator: N/A (count) | Service/administration date (`treatment_date`) within period, regardless of `bite_date` | Excludes TT/ATS/RIG, scheduled vitals, external events, cancelled/voided rows; counts events, not patients or vials. **Example:** Nov `9`, Q4 `15` |
| `SVC02` — Verified external ARV events | `local_operational` / `bcs-phase1-local-v1` | Distinct verified external ARV events; linked clinic episodes | Numerator: verified nonvoid external ARV events with `service_date` in period and verified `<= cutoff`; Denominator: N/A (count) | Service date within period; verification `<= cutoff` | Excluded from `SVC01` local workload and clinic stock consumption; unverified external claims excluded |
| `PROFILE01` — Age / sex / animal / geography distributions | `local_operational` / `bcs-phase1-local-v1` | Distinct `bite_id` and share (% of `EXP01`); `EXP01` episodes | Numerator: `EXP01` in each dimension bucket (including `unknown`); Denominator: `EXP01` (or declared known subset) | Exposure period; age calculated at exposure date (`bite_date`) | Missing DOB never resolves to age `0`; unknown animal/location retained explicitly; residence never substitutes for exposure place. **Example:** Nov `2` unassessed / `14` episodes = `14.3%` unassessed share |
| `TREND01` — Period change | `local_operational` / `bcs-phase1-local-v1` | Absolute delta and percentage change; comparable period series | Numerator: `current_count - prior_count`; Denominator: `prior_count` (when `prior_count > 0`) | Same date basis, filters, and period elapsed completeness | Partial periods compared only against equally elapsed prior days or declined; prior `0` returns percentage `null` (`not_applicable`). **Example:** `12` -> `15` episodes: `+3`, `3 / 12 = +25.0%`; `0` -> `4`: `+4`, percentage `N/A` |
| `QUALITY01` — Field availability | `local_operational` / `bcs-phase1-local-v1` | Count and share (%) of missing/invalid/conflicting records per field; stage-eligible records | Numerator: eligible records with `not_yet_recorded`, `unknown_unverified`, or `conflicting`; Denominator: stage-eligible records for that field | Same scope as underlying measure at `cutoff` | Expected pending (`not_yet_assessed`) excluded from post-finalization gap rates and reported separately. **Example:** Nov `1` finalized assessment missing category / `12` finalized = `8.3%` gap rate |
| `HR01` — Human rabies | `provisional_unavailable` / `bcs-phase1-local-v1` | Null surveillance outcome; clinic surveillance scope | Numerator: `null`; Denominator: `null` | N/A until verified surveillance source is linked | Never infer from Category `III` or hardcode `0`; returns `null` with `unavailable_reason = source_not_verified` |

Report owner: designated RHU reporting lead, currently unassigned in this package. Technical owner: backend reporting implementation. Clinical meaning and official mappings require the clinic's validation; this draft does not claim that validation occurred.

## 3. Confirmed 3-form baseline and crosswalk

User confirmation on 14 November 2026 established the three forms under `Reports & Analytics > DOH Submissions` as the reporting baseline:

1. **Rabies Exposure Registry** (`Weekly · Landscape`) — `frontend/src/features/reports/components/AdminDohReportsSection.tsx`, `DohReportsSection.tsx`, `backend/app/Services/DohReportService.php::getExposureRegistry`, `backend/resources/views/prints/exposure-registry.blade.php` (`/reports/exposure-registry`).
2. **ABTC Monthly Report** (`Monthly · Landscape`) — `AdminDohReportsSection.tsx`, `DohReportsSection.tsx`, `backend/app/Services/DohReportService.php::getMonthlyReport`, `backend/resources/views/prints/monthly-report.blade.php` (`/reports/monthly`).
3. **Cohort Report (Quarterly)** (`Quarterly · Portrait`) — `AdminDohReportsSection.tsx`, `DohReportsSection.tsx`, `backend/app/Services/DohReportService.php::getCohortReport`, `backend/resources/views/prints/cohort-report.blade.php` (`/reports/cohort`).

### Live baseline screenshot evidence (`ABTC Monthly Report — November 2026`)

Visual review of the clinic's `Reports & Analytics > DOH Submissions > ABTC Monthly Report` preview for November 2026 directly confirmed the defects driving Phases 2–4:

- **Spilled week bounds (`A03`):** First weekly row is `10/26/2026` (extending into October) and last is `11/30/2026` (extending into December) because `generateWeekRanges()` uses full Monday–Sunday weeks without clamping to `2026-11-01`..`2026-11-30`.
- **Unassessed-case & footer mismatch (`A09`):** On `11/9/2026`, `NO. OF CASES` shows `M=6, F=4` (10 cases) and `NO. GIVEN PEP=3`, while `NO. OF CASES CATEGORY` shows `I=0, II=0, III=5, TOTAL=5` (omitting 5 unassessed/missing-category episodes from `cat_total`). In the `TOTAL` footer row, `NO. OF CASES` sums to `M=6, F=5` (11 cases) and `NO. OF CASES CATEGORY` shows `I=0, II=0, III=6, TOTAL=11` (`0 + 0 + 6 != 11`, because weekly rows sum `wCat1 + wCat2 + wCat3` at `DohReportService.php:256` whereas the footer puts `$totalCases` into `totals['cat_total']` at `DohReportService.php:273`).

### Form crosswalk & column-by-column baseline mapping

| Baseline form & scope | Exact form columns / indicators | Current `DohReportService` defect | Phase 1 baseline mapping & reconciliation rule |
|---|---|---|---|
| **1. Rabies Exposure Registry** (`Weekly · Landscape`; quarterly/date-range weekly rows) | `Inclusive Dates`, `Human Popn`, `Male`, `Female`, `Total`, `Age (<15, 15>, Total)`, `Bite Category (Cat I, Cat II, Cat III, Total, %)`, `No. HR`, `TCV`, `HRIG`, `ERIG`, `Animal Type (Dog, Cat, Others, Total)`, `%TCV`, `%ERIG` | Unclamped Monday–Sunday weeks (`A03`); `cat_percentage` hardcoded `'100%'` (`A12`); `no_hr` hardcoded `0` (`A10`); missing DOB falls back to `0` -> `<15` (`A11`); `HRIG`/`ERIG` derived from `rig_type` indication text (`A05`); missing animal dropped from `animal_total` | Bounded weeks (`max(week_start, period_start)`..`min(week_end, period_end)`); `EXP01` total + `PROFILE01` age at `bite_date` & sex/animal (unknown bucket disclosed alongside); `CAT01` (`I+II+III`) reconciled to `EXP01` via unassessed + assessed-category-missing bridge; `HR01` unavailable (`source_not_verified`) until verified surveillance source exists; `TCV` (`PEP02` numerator + `SVC` note), `HRIG`/`ERIG` from verified RIG administration (`RIG01`) only; `%TCV`/`%ERIG` use explicit denominator and return `N/A` when `0` |
| **2. ABTC Monthly Report** (`Monthly · Landscape`; weekly rows + total + completion box) | `INCLUSIVE DATES`, `NO. OF CASES (M, F)`, `NO. GIVEN PEP`, `NO. OF CASES CATEGORY (I, II, III, TOTAL)`, `NO. OF COMPLETED VACCINE CATEGORY (I, II, III, TOTAL)`, `NO GIVEN RIG`, `COMPLETION RATE` (`NO. OF COMPLETED VACCINE CATEGORY ÷ TOTAL NO. CASES CATEGORY`) | Unclamped weeks (`A03`); footer `cat_total` mixes total recorded cases (`$totalCases`) with `I+II+III` on weekly rows (`A09`); completion uses `has_completed_primary` lifetime flag (`A04`) and ignores cutoff (`A08`); `given_rig` uses `rig_type` text (`A05`); rate divides by `$cases->count()` without distinguishing unassessed/no-PEP cases | Clamped weekly rows within selected month; `NO. OF CASES (M, F)` maps to `EXP01` (`M + F + unknown_sex`); `NO. OF CASES CATEGORY (I–III, TOTAL)` sums `I+II+III` consistently in rows and footer, with explicit reconciliation (`EXP01 = cat_total + unassessed + assessed_category_missing`); `NO. GIVEN PEP` maps to verified new-course initiation (`PEP02` numerator, continuing episodes disclosed separately); `NO. OF COMPLETED VACCINE CATEGORY` maps to course-scoped verified completion by cutoff (`OUT02` numerator by category, never `has_completed_primary`); `NO GIVEN RIG` maps to verified RIG administration (`RIG01` numerator); form-level completion box stays labeled with its form numerator/denominator while Bite Cases Summary displays `OUT02` mature-cohort completion separately |
| **3. Cohort Report (Quarterly)** (`Quarterly · Portrait`; Q1–Q4 + annual total by `CAT 1`, `CAT 2`, `CAT 3`, `TOTAL`) | Indicators: `NO. OF CASES`, `NO. GIVEN PEP`, `NO. COMPLETED`, `NO. GIVEN RIG`, `COMPLETION RATE` | Loops only `['I', 'II', 'III']` (`DohReportService.php:368`), silently dropping unassessed/missing-category episodes (`A09`); `NO. COMPLETED` uses `has_completed_primary` (`A04`) without cutoff (`A08`); `NO. GIVEN RIG` uses `rig_type` text (`A05`) | Retain Q1–Q4 + annual `CAT 1–3 / TOTAL` matrix structure; add reconciliation bridge (`Total Recorded Exposures = Categorized I–III + Unassessed + Assessed-Category-Missing`) and keep continuing-course episodes (`PEP04`) separate from new-course `NO. GIVEN PEP` / `NO. COMPLETED` so courses are never double-counted; derive `NO. GIVEN PEP`, `NO. COMPLETED`, and `NO. GIVEN RIG` strictly from verified cutoff-bounded events (`PEP02`, `OUT02`, `RIG01`); distinguish form-specific `NO. COMPLETED ÷ NO. OF CASES (I–III)` from mature started-course completion (`OUT02`) |
| **Bite Cases Summary & Location Endpoint** | Presentation/planning view backed by the 3 baseline forms (`Overview`, `Treatment & Follow-up`, `Planning & Actions`) | Mixes all-active clinic totals with filtered period rows (`A07`), weak receipt checks (`A06`), competing risk scores (`A13`), exposes patient records (`A15`), and uses mismatched prior-period status filters (`A16`) | Consumes the same shared `EXP/AS/CAT/DEC/PEP/OUT/FU/RIG/REF/SVC` rules as the 3 baseline forms; exposes aggregate-only payloads for conference/summary views and keeps identifiable records behind authorized drill-downs |

**Reconciliation invariant across all 3 baseline forms and Bite Cases Summary:**  
`EXP01 (Recorded Exposures) = Categorized Cases (Cat I + Cat II + Cat III) + Unassessed Episodes (AS03) + Assessed-Category-Missing`.

All existing DOH methods live in `backend/app/Services/DohReportService.php` and templates in `backend/resources/views/prints/`. Because the user confirmed these 3 forms as the clinic's baseline, Phases 2–4 will build adapters and reconciliations directly against these 3 forms rather than waiting for external templates.

## 4. Creation paths and data provenance

### Episode/record paths inspected

| Path and source | Current creation/link behavior | Required reporting treatment |
|---|---|---|
| Staff registration — `PatientService.php:461-518` | Incident created when vitals or registration animal values exist; `bite_date` from `reg_date_of_consultation`/today; `awaiting_assessment` state; scheduled `dose_number = null` vitals record | Retain accepted episode; provisional date and scheduled vitals record are not exposure-date or finalized-assessment evidence |
| Returning-patient triage check-in — `PatientService.php:910-947, 1017-1022` | Looks up open incident; marks pending `BiteIncidentIntake` as `converted` and creates `Queue` with `'bite_id' => $biteIncident?->bite_id` (which can be `null` when no open incident exists yet, relying on `TreatmentRecordService.php:312-342`) | Track intake conversion separately from episode existence; audit any converted `BiteIncidentIntake` with `bite_id = null` so accepted mobile/returning intakes are not silently lost |
| Existing-patient re-exposure — `BiteCaseService::registerNewExposure` | Validated exposure date; new pending episode, scheduled vitals, queue link; current eligibility/queue checks | Count new episode once; do not use lifetime primary-completion flag as its outcome |
| Mobile intake — `BiteIncidentIntakeService::checkIn` | Locks intake; checks linked appointment; existing `bite_id` supports repeat check-in reuse; creates pending episode using intake date; links intake/appointment/queue | Booking alone excluded; successful accepted check-in is canonical; retain source intake ID |
| Direct incident creation — `BiteCaseService::storeBiteCase` | Creates episode with supplied date/category and optional intake conversion | Incident presence alone does not prove a doctor assessment or administered treatment; audit authoritative assessment evidence |
| Doctor fallback — `TreatmentRecordService.php:312-342` | Creates pending episode for a `new_case` queue lacking `bite_id`, using `consultation_date` or today (`Carbon::today()`) | Preserve provisional-date provenance; link queue and episode; verify no second incident when one already exists |
| Doctor save — `TreatmentRecordService.php:545` onward | Updates/creates `status = 'completed'` consultation (`nature_of_visit`, `outcome`, `prophylaxis_orders`); updates category/location/confirmation; creates/updates `TreatmentPlan` | Link assessment to the same episode; require finalized consultation attributes (`nature_of_visit`) and decision evidence; do not use a different episode's latest consultation |
| Nurse vaccination & prophylaxis — `VaccinationRecordService.php:88-150, 432-558`; `ProphylaxisService.php:182-364` | Validates `TreatmentPlan.plan_type`; auto-heals missing `full_pep` plan when `whereNull('dose_number')` consultation exists; `ProphylaxisService::administer` writes `dose_number = null` rows with `status = 'completed'` (administered) or `status = 'cancelled', outcome = 'not_administered'` (non-receipt); `VaccinationRecordService:544-558` sets `BiteIncident.status = 'completed'` on `no_vaccine` even when prophylaxis was `not_administered`, and on hardcoded dose numbers `0/3/7` | Distinguish Doctor Form 2 consultations (`nature_of_visit` populated / null `medication_given`) from `ProphylaxisService` `dose_number = null` rows (`medication_given` set) and legacy markers (`200/201/300/400/401`). Derive course outcome from actual `TreatmentPlan.ordered_dose_days` and verified ARV events rather than `BiteIncident.status` |
| External proof review — `BiteCaseService::reviewExternalProof` | Incident verification source and reviewer/time updated | Episode-level reviewed history is not automatically proof for every external dose; each accepted dose needs source/date/link evidence |

This is a source map, not a runtime assertion that all possible import/admin paths have been exercised. Console sample generators are not accepted clinical-data sources.

### Field map

| Reporting fact | Episode key & source table / record | Author / actor & finalization state | Effective event date & recording timestamp | Missing-value label & provenance limitation |
|---|---|---|---|---|
| Episode identity | `bite_incidents.bite_id`, `patient_id`, `clinic_id`; linked `bite_incident_intakes` / `appointments` / `queues` (`bite_id`) | `bite_incidents.created_by`; accepted episode vs non-episode (`pending` intake / `scheduled` booking) | Episode creation event; `bite_incidents.created_at` / `updated_at` | `unknown_unverified` if orphan/missing patient link; deduplicate by ID, never patient name |
| Registration / check-in | `bite_incident_intakes` / `queues` / `bite_incidents` | `checked_in_by`, `created_by`; `converted` intake or `checked_in` queue | Check-in service date (`queue_date`); `checked_in_at`, `submitted_at`, `created_at` | `not_yet_recorded` if timestamp absent; `created_at` alone may reflect migration |
| Exposure date | `bite_incidents.bite_date`, `bite_incident_intakes.bite_date` | Registration staff, patient intake, or doctor fallback (`created_by`) | Reported exposure date (`bite_date`); `bite_incidents.created_at` | `unknown_unverified` / `provisional` when sourced from consultation/today fallback (`PatientService:468`, `TreatmentRecordService:323`); preserve uncertainty until Phase 2 |
| Assessment / category | `bite_incidents` (`severity`, `exposure_category`, `confirmed_at`, `confirmed_by`) + episode-linked consultation `treatment_records` (`nature_of_visit`) | `confirmed_by` / `administered_by`; `finalized` (`status = completed` consultation with `nature_of_visit`) vs `draft` vs `scheduled` vitals | `consultation_date` / `confirmed_at`; `treatment_records.created_at` / `updated_at` | `not_yet_assessed` before finalization; `not_yet_recorded` if finalized without category; scheduled `dose_number = null` vitals and legacy intake category are not finalized assessment |
| Treatment decision | `treatment_plans` (`plan_type`, `status`, `decided_at`, `decided_by`) + consultation `prescribed_vaccine_type`, `prophylaxis_orders`, `outcome` | `treatment_plans.decided_by` / consultation `administered_by`; `approved` / finalized decision vs blank | `decided_at` / `consultation_date`; `treatment_plans.created_at` / `updated_at` | `not_yet_assessed` if unfinalized; `not_yet_recorded` if finalized and blank; `conflicting` if `no_pep` coexists with verified ARV; empty dose array does not equal no-PEP |
| Course identity / requirements | `treatment_plans` (`treatment_plan_id`, `bite_id`, `plan_type`, `ordered_dose_days`, `continued_from_bite_id`); `appointments` | `decided_by`; active/approved plan vs auto-healed default | Plan `decided_at`; `ordered_dose_days` relative to D0; `treatment_plans.created_at` | `not_yet_recorded` if started course lacks ordered plan; Phase 3 must detect cycles and wrong-patient links |
| ARV administration | `treatment_records` (`treatment_id`, `bite_id`, `dose_number`, `vaccine_brand`, `status`, `voided_at`, `is_external`) | `administered_by` / external reviewer; `completed` nonvoid/noncancelled vs `scheduled` / `cancelled` / `voided` | `treatment_date` (service date); `administered_at`, `created_at` | `not_yet_recorded` if prescribed without receipt; never use `has_completed_primary` or `BiteIncident.status = 'completed'` as receipt/completion |
| RIG indication & receipt | Indication: consultation `prophylaxis_orders['rig']` / `rig_indication`; Receipt: `treatment_records` (`medication_given` / legacy `dose_number` `[200, 201]`, `status = completed`, nonvoid) | Prescribing doctor / administering nurse; `completed` receipt vs `cancelled` (`outcome = not_administered`) | `treatment_date` / `consultation_date`; `administered_at` | `unknown_unverified` for missing indication; `not_yet_recorded` for indicated without receipt; never use `BiteIncident.rig_type` accessor (derives from `rig_decision_reason`) as receipt |
| External evidence | `bite_incidents` (`external_verification_*`) + `treatment_records` (`is_external`, `treatment_date`, `status`) | Reviewer (`verified_by`); verified event vs unverified claim | External service `treatment_date`; verification timestamp (`verified_at`) | `unknown_unverified` until per-event proof/date/link passes policy (D04); no blanket verification of all history |
| Referral / disposition | `bite_incidents` referral/transfer fields + consultation `referred_to`, `reason_for_referral`, `outcome` (`Transferred/Referred`) | Consultation/transfer actor; documented transfer or closure reason | Transfer / consultation date; `updated_at` | `unknown_unverified` for external outcome after transfer; `not_applicable` where not transferred; transfer overlaps local receipt |
| Animal | `bite_incidents.animal_type`, `RegistrationAnimal` values, `bite_incident_intakes` | Registration staff / mobile intake / nurse promotion; preserved across stages | Incident `bite_date` / registration; `bite_incidents.created_at` | `unknown_unverified` when absent (never merge into `"other"`) |
| Age / sex | `patients.date_of_birth`, `patients.gender`, `patients.age` | Registration / patient master record | Age computed at `bite_date` (exposure reference date); `patients.updated_at` | `unknown_unverified` if DOB missing (never default to age `0`) |
| Geography | Exposure `bite_incidents.bite_place` + intake location vs `patients` residence address/barangay | Registration / intake / assessment | Exposure event date (`bite_date`); `updated_at` | `unknown_unverified` when exposure location missing (never substitute residence) |
| Human rabies | No verified repository surveillance source identified | None | N/A | `unknown_unverified` (`source_not_verified`); return `null`, never hardcoded `0` |

## 5. Permission baseline and proposed policy

Observed: report API allows a broad staff-role list; DOH cards are hidden for registration, triage and treatment roles; web print lacks explicit authentication middleware in the reviewed route. These are different layers and are not evidence of agreed clinic policy.

The following proposal is a conservative implementation target for validation, not a permission change already made:

| Capability | Admin | Doctor/Nurse | Registration | Patient/unauthenticated |
|---|---|---|---|---|
| Bite-summary aggregates | Own assigned clinic | Own assigned clinic | Only if explicitly enabled by clinic policy | No |
| Identifiable episode detail | Existing authorized scope | Existing clinical scope | Existing registration scope | No through reporting endpoints |
| Official report preparation/finalization | Assigned report capability; do not assume all admins can attest official submission | Only if assigned report capability | Only if assigned report capability | No |
| Conference aggregate export | Assigned export capability | Only if assigned | Only if assigned | No |
| Change clinical orders from reporting | No new capability | Existing clinical workflow only | No | No |

Server enforcement must deny unauthenticated and unauthorized cross-clinic access. Unassigned users must not select a clinic via query parameter. Developer/system support roles need explicit policy rather than accidental universal access. Finalization, exporting and official submission are separate actions.

## 6. Synthetic baseline and verified results

The JSON is normalized fixture data, not production seed data. Dates through December 2026 are hypothetical examples. No real patient names, numbers or health records were used.

| Measure | November 1–30, cutoff November 30 | Q4 October 1–December 31, cutoff December 31 |
|---|---:|---:|
| Known-date exposure episodes | 14 | 16 |
| Unique patients | 13 | 15 |
| Finalized assessment / unassessed | 12 / 2 | 14 / 2 |
| Category I / II / III | 2 / 6 / 3 | 2 / 8 / 3 |
| Finalized assessment but category missing | 1 | 1 |
| No-PEP decisions / missing decisions | 2 / 1 | 2 / 1 |
| New course prescribed / initiated / no receipt | 8 / 5 / 3 | 10 / 7 / 3 |
| Continuing episode (existing course) | 1 | 1 |
| Mature D0-cohort courses / completed | 4 / 3 | 7 / 6 |
| Started but not yet mature | 1 | 0 |
| Overdue started courses / outstanding dose slots | 1 / 2 | 1 / 2 |
| RIG indicated / verified receipt | 3 / 2 | 3 / 2 |
| Transferred episodes (overlapping flag) | 1 | 1 |
| Registered episode with unknown/provisional exposure date | 1 | 1 |
| Local / verified external ARV service events | 9 / 3 | 15 / 3 |

### Scenario evidence

- E01 and E02 stay visible despite no finalized doctor assessment; E02 is a draft.
- E03 has finalized assessment but missing category/decision, so it is a documentation gap rather than awaiting assessment.
- E04 and E05 are no-PEP decisions; E05 still has pending TT and is not a closed encounter.
- E06 and E13 have prescribed new courses without administration; E13's completed past primary flag must not complete this episode.
- E07 is transferred with RIG indication but no receipt evidence; it is not automatically classified as refusal or completed treatment.
- E08 is complete; E17 is a new exposure continuing C08, with the same patient and course. Count two episodes but one course and one patient.
- E09 has one qualifying ARV administration plus a cancelled and a voided entry. Only the valid event counts; two required slots remain outstanding. Verified RIG is a different event.
- E10 starts late in November; December doses do not enter the November cutoff. It becomes complete for the later quarter cutoff.
- E11 is a booster with its own ordered requirements. E12 has verified external administrations that do not count as local service or stock use.
- E14's exposure is outside November but its November dose events count in service workload. E15 is outside November entirely; both belong in Q4.
- E16 has a provisional stored date and no known exposure date; it appears in the unknown-date registration count, not in exposure-date trends.
- BOOK01, DRAFT01 and PERSON01 are excluded non-episode inputs; do not insert them as fake episodes to fill a chart.

### Appendix E 100-episode reconciliation benchmark

Independently checked in `appendix_e_reconciliation` inside [Synthetic fixture](./bite_cases_summary_phase_1_fixtures.json):

- `100` recorded exposure episodes = `80` finalized assessments + `20` no finalized assessment recorded (`AS02`: `80 / 100 = 80.0%`).
- `80` finalized assessments = `60` PEP prescribed + `15` explicit no-PEP decisions + `5` finalized assessments with treatment decision missing.
- `60` PEP prescribed = `50` verified vaccine initiation + `10` no administration recorded (`PEP02`: `50 / 60 = 83.3%`).
- The `20` unassessed episodes stay out of the `60` prescribed-PEP denominator; the `15` explicit no-PEP decisions stay out of vaccine initiation and completion counts.

### Baseline 3-form adapter & reconciliation counts

Computed and verified in `baseline_forms` inside [Synthetic fixture](./bite_cases_summary_phase_1_fixtures.json) (continuing-course episode `E17` stays visible in recorded/category counts and is tracked separately from new-course `given_pep` and `completed` so course `C08` is never double-counted):

| Baseline form / reconciliation slice | November 1–30, cutoff Nov 30 | Q4 Oct 1–Dec 31, cutoff Dec 31 |
|---|---:|---:|
| Bridge: Total recorded exposure episodes (`EXP01`) | 14 | 16 |
| Bridge: Categorized cases (`Cat I + II + III` = `2+6+3` / `2+8+3`) | 11 | 13 |
| Bridge: Unassessed (`AS03`) + Assessed-category-missing | 2 + 1 = 3 | 2 + 1 = 3 |
| ABTC Monthly Form: `NO. OF CASES` / `NO. GIVEN PEP` | 14 / 5 | 16 / 7 |
| ABTC Monthly Form: `NO. COMPLETED VACCINE CATEGORY` (`I / II / III / TOTAL`) | 0 / 2 / 1 / 3 | 0 / 5 / 1 / 6 |
| ABTC Monthly Form: `NO GIVEN RIG` | 2 | 2 |
| Cohort Report slice: `NO. OF CASES` (`I / II / III / TOTAL`) | 2 / 6 / 3 / 11 | 2 / 8 / 3 / 13 |
| Cohort Report slice: `NO. GIVEN PEP` (`I / II / III / TOTAL`) | 0 / 3 / 2 / 5 | 0 / 5 / 2 / 7 |
| Cohort Report slice: `NO. COMPLETED` (`I / II / III / TOTAL`) | 0 / 2 / 1 / 3 | 0 / 5 / 1 / 6 |
| Cohort Report slice: `NO. GIVEN RIG` (`I / II / III / TOTAL`) | 0 / 0 / 2 / 2 | 0 / 0 / 2 / 2 |

### Verification executed

From the repository root:

```powershell
& C:\xampp\php\php.exe docs/tasks/bite_cases_summary_phase_1_verify.php
```

Result: **183 fixture integrity/arithmetic checks, 0 failures.** The checker verifies identity/link integrity, expected monthly/quarterly counts, assessment/decision reconciliation, 3-form baseline adapter counts and category/unassessed bridges, and the Appendix E 100-episode reconciliation benchmark. It requires no Laravel bootstrap or database. It does not establish that the current application produces these expected values, and it does not resolve the earlier PHPUnit bootstrap issue.

Fixture limitations: exact-dose-date matching only; no revised assessments, late entries or historical void timeline; all category/decision facts effective on the episode date. Phase 3/7 must test those additional cases before claiming application readiness. Application performance, authorization and UI were not tested in Phase 1.

## 7. Unresolved decision register

| Decision | Owner required | Working treatment | Blocks |
|---|---|---|---|
| D01 Baseline DOH/ABTC form versions (`Rabies Exposure Registry`, `ABTC Monthly Report`, `Cohort Report`) | **Confirmed by user (14 Nov 2026)** | The 3 `Reports & Analytics > DOH Submissions` templates are locked in as the baseline forms; future official revisions remain versioned adapters | Resolved for baseline |
| D02 Official cohort entry, maturity, completion and transfer rules | RHU reporting/clinical lead | Both form-level `NO. COMPLETED ÷ TOTAL CASES` and operational `OUT02` mature D0-cohort rules are retained separately with an explicit bridge | Official submission rule attestation only; not engineering implementation |
| D03 Final report/export permission matrix and support-role access | Clinic administrator/report owner | Conservative clinic-scoped policy proposed; deny unauthorized access in Phase 2 | Final capability rollout |
| D04 Per-event external evidence requirements | Clinical lead/report owner | External flags alone insufficient; fixture proof is explicitly verified | Production external receipt/completion logic |
| D05 Legacy provisional exposure dates and historical edits | Data owner and backend developer | Preserve uncertainty; no destructive bulk corrections | Migration/backfill and exact historical reconstruction |
| D06 Required non-PEP care and encounter closure mapping | Clinical lead | No-PEP decision does not force encounter closure | Final status resolver edge cases |
| D07 Geographic coding, population sources and disclosure threshold | Clinic/data owner | Counts with unknown bucket; no population rates or assumed statutory small-cell number | Optional rates and public-output disclosure policy |

The current user instruction authorizes phase-by-phase work, not a claim that these clinic decisions have been supplied. Independent engineering tasks can proceed without inventing answers. Any official report release dependent on unresolved definitions remains provisional.

## 8. Phase handoff

Technical Phase 1 deliverables are ready for implementation use. Phase 1 local-policy acceptance is still pending D01–D07 where applicable. Do not mark all checkboxes complete or describe these definitions as DOH-approved.

Next bounded work package: Phase 2 access protection and date/filter integrity, using the audited current routes and preserving unrelated local changes. Keep changes independently reviewable. Do not silently replace existing clinical decision logic or broaden roles while implementing reporting foundations.

This turn stops at the Phase 1 handoff. Production code, database records and live reports remain unchanged; nothing has been committed, pushed, merged or deployed.
