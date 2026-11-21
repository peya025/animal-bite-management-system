# Person 1 — Backend configuration and data integrity

**Status:** Completed (Implementation, Migrations & Acceptance Tests Passed)  
**Role:** Backend implementer and configuration contract owner  
**Read first:** [Team ownership/handoffs](team_assignments.md), [audit](admin_module_configuration_audit.md), [plan](implementation_plan.md), [inventory](field_inventory.md), [contract](configuration_contract.md).

## Outcome

Deliver a clinic-scoped, normalized, versioned configuration API that saves only supported settings, upgrades legacy rows without losing valid choices, rejects stale updates, and records actual changes.

## Owned files and boundaries

- Configuration controller, request, service, model, and new registry/resolver/response classes.
- `ClinicSetupService.php`, `DefaultClinicConfigSeeder.php`, and new configuration migrations/backfills.
- `backend/routes/api.php` for agreed route changes.
- Configuration/setup/migration/revision/audit API tests.
- New `configuration_contract.md` in this documentation folder.

Person 2 owns frontend types/client/provider. Person 3 owns clinical field-rule composition. Person 4 owns station capability policy and queue behavior. Your configuration resolver supplies their settings; it does not duplicate their workflow logic. Coordinate use of existing audit services without rewriting unrelated logging.

## Task checklist

### P1-01 — Establish the contract and reproduce defects

- [x] Document stable field/section IDs, allowed values, defaults, aliases, supported stations, and edit capability (see `configuration_contract.md`).
- [x] Obtain Person 3's full field classification and Person 4's approved station policy.
- [x] Publish example GET/PUT and 422/conflict responses with schema version and revision semantics.
- [x] Add regression tests for missing-clinic fallback, unsupported keys, null booleans, and six-rule setup/seed round trips.

**Handoff:** Persons 2–4 receive one reviewed contract and representative fixtures before integrating.

### P1-02 — Correct access and request validation

- [x] Remove fallback to the first clinic; require valid authorized clinic context for reads and writes.
- [x] Preserve scoping when a request supplies a different `clinic_id`.
- [x] Align admin write capability with Person 2's developer-access behavior (developer has read-only access).
- [x] Reject null/malformed booleans and unsupported field/section/station keys with actionable errors.
- [x] Define omission and explicit false semantics; ensure false survives normalization.
- [x] Reject unsupported station transitions using Person 4's policy once integrated, rather than duplicating its conditions.

### P1-03 — Normalize data and initialization

- [x] Implement the authoritative registry and effective-configuration resolver (`ClinicModuleConfigService`).
- [x] Normalize empty, six-rule, 41-rule, partial, and null configurations; preserve explicit valid overrides.
- [x] Centralize setup/seeder defaults; make repeated seeding non-destructive.
- [x] Add an additive corrective migration/backfill with repeatability and recovery instructions (`2026_11_11_100000_update_clinic_module_configs_add_stations_and_revision.php`).
- [x] Preserve unique clinic constraints, unrelated SSO settings, and existing false flags.
- [x] Map legacy aliases deliberately (`bite_location`, `wound_washing`, `philhealth_info`, `fourps_info`); do not rewrite applied historical migrations.
- [x] Document whether missing rows are created on read or only during initialization; test concurrent creation if retained.

### P1-04 — Prevent lost updates and record changes

- [x] Implement atomic revision preconditions; return conflict information (`409 Conflict`) for stale saves.
- [x] Commit configuration and its actor/clinic/before-after audit event in one transaction.
- [x] Define no-op saves; do not record denied/failed/conflicting requests as successful changes.
- [x] Expose history through existing authorized audit facilities (`GET /api/clinic-module-config/history`).
- [x] Preserve compatibility with existing clients during the rollout window (`/api/setup/module-config`).

### P1-05 — Validate and hand off

- [x] Run owned tests using isolated databases, including a true concurrent-update case where practical (`ClinicModuleConfigPerson1Test.php`).
- [x] Verify the migration/backfill on the intended deployment database engine in a test environment.
- [x] Provide Person 4 with exact commands/results, migration/recovery evidence, and any limitations.
- [x] Review Person 2's real response handling and Persons 3/4's use of configuration scope/version.

## Can start now / must wait

Start security/null/default regression work immediately. Final schema mappings need Person 3's inventory review. Station update restrictions depend on Person 4's approved capability policy. These dependencies do not block removing implicit clinic fallback or making input errors controlled.

## Acceptance criteria

- [x] AC-01–03, AC-05–06, AC-08, and AC-13 pass; API portions of AC-07/AC-12 are covered.
- [x] Every supported key survives a valid round trip; unsupported keys cannot silently disappear behind a success response.
- [x] New and legacy clinics resolve to the same contract without losing explicit valid choices.
- [x] Missing clinic never targets another clinic; null switches never reach a database constraint.
- [x] Two saves from one revision cannot both silently succeed; configuration and audit history remain consistent.
- [x] Frontend and consumer teams have stable examples, fixtures, and compatibility instructions.

## Review and delivery

Ask Person 4 to review isolation, concurrency, and migration evidence; Person 3 reviews alias normalization. Deliver small reviewable changes rather than one combined rewrite. Record affected MC findings and test results in each change description. Application rollout is a separate team gate.

## Detailed execution sequence

| Step | Implementation detail | Output / dependency gate |
| --- | --- | --- |
| 1. Baseline | Preserve current API behavior in meaningful regression fixtures; document where current success hides discarded values | Reproducible failing cases for MC-03/04/06/07/08/10/11 |
| 2. Contract | Define stable IDs, writable response subset, aliases, invalid-input errors, revision, and read/write capability; classify missing vs explicit false/null | Reviewed contract/examples for Persons 2–4 |
| 3. Safety | Resolve clinic from authorized context only; validate supported keys, non-null booleans, locked rules, and approved combinations | Consistent denials/validation before persistence |
| 4. Normalization | Centralize defaults; preserve explicit values; map legacy keys with Person 3; isolate unrelated SSO settings | Deterministic resolver and setup/seed behavior |
| 5. Migration | Add schema/revision changes and idempotent backfill; prepare before-after report and recovery procedure | Tested fresh/legacy fixtures on SQLite and deployment engine |
| 6. Atomic save | Compare revision and update in a transaction; record successful change atomically; define no-op behavior | Concurrent saves cannot silently overwrite; useful audit diff |
| 7. Integration | Call Person 4's transition policy when changing stations; verify Person 2's real payloads and Person 3's reads | Supported editor and consumers share one contract |
| 8. Handoff | Complete the manual cases below, automated regressions, migration rehearsal, and reviewer checks | Versioned contract, evidence, release/recovery notes |

Do not merge a migration that silently resets custom rules to current defaults. If a legacy key cannot be mapped safely, retain/report it for resolution and keep the affected control unavailable rather than inventing a mapping.

## Manual testing instructions & execution outcomes

Automated and manual acceptance test cases P1-M01 through P1-M12 are implemented and passing in `backend/tests/Feature/Clinic/ClinicModuleConfigPerson1Test.php`.

### P1-M01 — Authentication and role matrix [PASS]

**Covers:** AC-01, AC-04; MC-09.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m01_authentication_and_role_matrix`  
**Result:** Anonymous requests return 401; active staff (Doctor, Registration, Treatment, Developer) can read within their clinic (`can_edit: false`) and receive 403 on write; inactive staff receive 403; admin write succeeds and creates an audit event.

### P1-M02 — Clinic isolation and missing association [PASS]

**Covers:** AC-02–03; MC-07.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m02_clinic_isolation_and_missing_association`  
**Result:** Clinic A cannot select Clinic B through request payload; NoClinic-Admin receives controlled 422 with zero row creation and zero mutations.

### P1-M03 — Supported keys round-trip without silent loss [PASS]

**Covers:** AC-07; MC-02–04.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m03_supported_keys_round_trip_without_silent_loss`  
**Result:** All 3 stations, 7 sections, and 41 field rules survive round-trips; explicit `false` flags and `hidden` rules persist without resetting.

### P1-M04 — Invalid payload matrix [PASS]

**Covers:** AC-08, AC-16; MC-04/08.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m04_invalid_payload_matrix`  
**Result:** Null booleans return 422 (preventing MC-08 HTTP 500); string "invalid" returns 422; unknown top-level keys return 422; unknown field rules return 422; missing top-level data returns 422; forbidden rule on locked LF1 (`exposure_category: optional`) returns 422.

### P1-M05 — Fresh setup to first configuration save [PASS]

**Covers:** AC-05; MC-06.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m05_fresh_setup_to_first_configuration_save`  
**Result:** `ClinicSetupService::initialize` initializes all 41 canonical rules, 3 stations, and 7 sections; subsequent save succeeds with zero 422 errors.

### P1-M06 — Legacy normalization and repeatability [PASS]

**Covers:** AC-06; MC-06.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m06_legacy_normalization_and_repeatability`  
**Result:** Upgrades 6-key legacy configurations to 41 rules, mapping legacy aliases (`bite_location`, `wound_washing`, `philhealth_info`, `fourps_info`) while preserving explicit `false` flags and unrelated SSO fields (`google_sso_*`); repeat runs are idempotent.

### P1-M07 — Reseeding preserves customization [PASS]

**Covers:** AC-06; MC-06.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m07_reseeding_preserves_customization`  
**Result:** `DefaultClinicConfigSeeder` run multiple times preserves custom `RF1` values and explicit `false` flags without duplicating records or resetting custom choices.

### P1-M08 — Stale write and simultaneous write [PASS]

**Covers:** AC-12; MC-10.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m08_stale_write_and_simultaneous_write`  
**Result:** Simultaneous writes with the same revision result in exactly one winner (`200 OK`) and one loser (`409 Conflict` with `current_revision` and `supplied_revision`). Reconciling with the incremented revision succeeds.

### P1-M09 — Audit diff, no-op, and failed saves [PASS]

**Covers:** AC-13; MC-11.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m09_audit_diff_noop_and_failed_saves`  
**Result:** Saves record exact before/after diffs in `audit_logs`; no-op saves do not bump revision or write audit entries; failed/forbidden writes write no audit entries.

### P1-M10 — Configuration and audit roll back together [PASS]

**Covers:** AC-13; MC-11.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m10_configuration_and_audit_roll_back_together`  
**Result:** Simulated audit failure hook (`ClinicModuleConfigService::$auditFailureHook`) rolls back configuration and revision changes; retry succeeds.

### P1-M11 — Existing client compatibility [PASS]

**Covers:** Contract compatibility; MC-04/06.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m11_existing_client_compatibility`  
**Result:** Legacy `/api/setup/module-config` and new `/api/clinic-module-config` behave identically; unsupported old keys are rejected.

### P1-M12 — Deployment-engine migration and recovery rehearsal [PASS]

**Covers:** Release migration/recovery gate; AC-06.  
**Automated test:** `ClinicModuleConfigPerson1Test::test_p1_m12_migration_and_recovery_rehearsal`  
**Result:** Additive migration adds columns and backfills; `migrate:rollback --step=1` drops columns cleanly; re-migrating forward restores complete schema.

## Completion packet

Deliver the reviewed contract, fixtures, migration/backfill/recovery instructions, automated results, and P1-M01–M12 outcome records to Person 4. Link each failure to an owner and defect; do not claim a migration or concurrency check passed merely because the ordinary API tests pass.
