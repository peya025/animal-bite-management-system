# Person 1 — Backend configuration and data integrity

**Status:** Not started  
**Role:** Backend implementer and configuration contract owner  
**Read first:** [Team ownership/handoffs](team_assignments.md), [audit](admin_module_configuration_audit.md), [plan](implementation_plan.md), [inventory](field_inventory.md).

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

- [ ] Document stable field/section IDs, allowed values, defaults, aliases, supported stations, and edit capability.
- [ ] Obtain Person 3's full field classification and Person 4's approved station policy.
- [ ] Publish example GET/PUT and 422/conflict responses with schema version and revision semantics.
- [ ] Add regression tests for missing-clinic fallback, unsupported keys, null booleans, and six-rule setup/seed round trips.

**Handoff:** Persons 2–4 receive one reviewed contract and representative fixtures before integrating.

### P1-02 — Correct access and request validation

- [ ] Remove fallback to the first clinic; require valid authorized clinic context for reads and writes.
- [ ] Preserve scoping when a request supplies a different `clinic_id`.
- [ ] Align admin write capability with Person 2's developer-access behavior.
- [ ] Reject null/malformed booleans and unsupported field/section/station keys with actionable errors.
- [ ] Define omission and explicit false semantics; ensure false survives normalization.
- [ ] Reject unsupported station transitions using Person 4's policy once integrated, rather than duplicating its conditions.

### P1-03 — Normalize data and initialization

- [ ] Implement the authoritative registry and effective-configuration resolver.
- [ ] Normalize empty, six-rule, 41-rule, partial, and null configurations; preserve explicit valid overrides.
- [ ] Centralize setup/seeder defaults; make repeated seeding non-destructive.
- [ ] Add an additive corrective migration/backfill with repeatability and recovery instructions.
- [ ] Preserve unique clinic constraints, unrelated SSO settings, and existing false flags.
- [ ] Map legacy aliases deliberately; do not rewrite applied historical migrations.
- [ ] Document whether missing rows are created on read or only during initialization; test concurrent creation if retained.

### P1-04 — Prevent lost updates and record changes

- [ ] Implement atomic revision preconditions; return conflict information for stale saves.
- [ ] Commit configuration and its actor/clinic/before-after audit event in one transaction.
- [ ] Define no-op saves; do not record denied/failed/conflicting requests as successful changes.
- [ ] Expose history through existing authorized audit facilities or a scoped response agreed with Person 2.
- [ ] Preserve compatibility with existing clients during the rollout window.

### P1-05 — Validate and hand off

- [ ] Run owned tests using isolated databases, including a true concurrent-update case where practical.
- [ ] Verify the migration/backfill on the intended deployment database engine in a test environment.
- [ ] Provide Person 4 with exact commands/results, migration/recovery evidence, and any limitations.
- [ ] Review Person 2's real response handling and Persons 3/4's use of configuration scope/version.

## Can start now / must wait

Start security/null/default regression work immediately. Final schema mappings need Person 3's inventory review. Station update restrictions depend on Person 4's approved capability policy. These dependencies do not block removing implicit clinic fallback or making input errors controlled.

## Acceptance criteria

- [ ] AC-01–03, AC-05–06, AC-08, and AC-13 pass; API portions of AC-07/AC-12 are covered.
- [ ] Every supported key survives a valid round trip; unsupported keys cannot silently disappear behind a success response.
- [ ] New and legacy clinics resolve to the same contract without losing explicit valid choices.
- [ ] Missing clinic never targets another clinic; null switches never reach a database constraint.
- [ ] Two saves from one revision cannot both silently succeed; configuration and audit history remain consistent.
- [ ] Frontend and consumer teams have stable examples, fixtures, and compatibility instructions.

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

## Manual testing instructions

Complete [shared setup](manual_testing_setup.md) first. Use the API-client procedure there. Record all cases as Not run until executed. For every rejected write, compare a new GET and database/audit counts with the baseline to prove there was no successful mutation.

### P1-M01 — Authentication and role matrix

**Covers:** AC-01, AC-04; MC-09.

1. Save a known-good configuration request using A-Admin-1.
2. Repeat GET and PUT without authentication, then as A-Registration, A-Doctor, A-Treatment, A-Developer, and A-Inactive using their own credentials/session.
3. Repeat the valid admin write with a harmless approved rule change.

**Expected:** Anonymous requests return 401; active non-admin staff may read within the declared scope but cannot write; inactive access is denied; developer follows the frozen policy. Admin write succeeds and only its intended changes persist. No denied request creates a successful configuration-change event.

**Evidence:** Role/status table, sanitized responses, resulting revision and audit event. Restore the admin change using a fresh revision.

### P1-M02 — Clinic isolation and missing association

**Covers:** AC-02–03; MC-07.

1. Give Clinic A and B visibly different RF1 values; record both GET responses.
2. As A-Admin-1, send a writable body containing Clinic B's ID, using the contract's handling of extraneous target fields.
3. GET as both admins; inspect which clinic, if any, changed.
4. As NoClinic-Admin, attempt GET and a valid PUT. Inspect both clinics again and count configuration rows.

**Expected:** A cannot select B through the payload; the request either rejects the field or remains scoped to A as documented. Missing clinic returns the specified controlled denial with no fallback, row creation, or mutation. B is unchanged in both cases.

**Evidence:** Both clinic responses before/after, missing-clinic error, row counts. Restore only A's intended change if one occurred.

### P1-M03 — Supported keys round-trip without silent loss

**Covers:** AC-07; MC-02–04.

1. Obtain a fresh normalized config and the catalog of writable fields/sections/stations.
2. For each supported configurable key, choose an allowed non-baseline value, send it with the current revision, then GET again.
3. Record submitted, returned, and stored values in a key-by-key table. Exercise explicit false for every supported boolean where the workflow policy allows it.
4. Repeat with a permitted combination of multiple changes.

**Expected:** Every supported change survives exactly; canonical alias normalization is explicit. Unsupported combinations are rejected with an explanation, not dropped. Locked keys cannot become editable through the API.

**Evidence:** Complete catalog coverage table, not just one successful field. Restore baseline between incompatible combinations.

### P1-M04 — Invalid payload matrix

**Covers:** AC-08, AC-16; MC-04/08.

1. Duplicate a fresh valid request for each row: null section flag; string `invalid` instead of boolean; unknown station; unknown section; unknown field-rule key; rule value `invalid`; missing required rule; missing required top-level data; forbidden rule on LF1.
2. Send one altered request at a time. GET after every attempt.
3. Separately omit an optional key and submit explicit false, true, and documented supported boolean encodings. Record omission behavior.

**Expected:** Invalid inputs return contract-specific field errors, normally 422, without 500 or partial persistence. Valid omitted/false values follow the declared contract and never silently become true.

**Evidence:** Input variation/status/error-path matrix and unchanged revision for rejected writes. Refresh the revision before each valid variant.

### P1-M05 — Fresh setup to first configuration save

**Covers:** AC-05; MC-06.

1. Restore the dedicated fresh dataset with no completed clinic setup.
2. Complete setup through the application using synthetic clinic/admin details.
3. Open `/setup/modules`; GET the configuration and compare its keys/defaults with the approved catalog.
4. Change RF1, save, reload, and GET again.

**Expected:** Complete supported rules are available immediately; no missing-rule 422 occurs; the edit persists. Setup creates one correct clinic configuration.

**Evidence:** Setup result, key-count/catalog comparison, persisted edit. Reset the disposable setup dataset afterward; do not reinitialize a shared clinic.

### P1-M06 — Legacy normalization and repeatability

**Covers:** AC-06; MC-06.

1. Restore each legacy dataset separately: no row, six-key, 41-key, partial, and null rules.
2. Record explicit choices, including a false section flag, Hidden field, and unrelated SSO value where present.
3. Apply the documented new migration/backfill, inspect its report, and GET the config. Make and save one supported change.
4. Rerun the documented normalization/backfill and compare results with the first run.

**Expected:** Each fixture becomes usable without losing valid explicit choices; aliases follow the reviewed mapping; no duplicate row appears. A repeat run does not reset settings. Unknown/unmappable historical values are handled as documented and surfaced for review.

**Evidence:** Before-after diff for every dataset, rerun comparison, save/reload result. Restore snapshots between datasets.

### P1-M07 — Reseeding preserves customization

**Covers:** AC-06; MC-06.

1. In the disposable seeded dataset, save custom RF1 and permitted false section values; record them and the revision/history policy.
2. Run the revised default configuration seeder using Person 1's documented test command.
3. GET and compare the customization, related configuration fields, row counts, and history.
4. Run the seeder again.

**Expected:** Both runs preserve customization and do not duplicate rows or create misleading user-change events. Defaults only fill the intended gaps according to the initialization policy.

**Evidence:** Seeder command/build, before-after responses, repeat-run results. Never use the old destructive seeder as an ordinary reset procedure.

### P1-M08 — Stale write and simultaneous write

**Covers:** AC-12; MC-10.

1. Read the same revision into two separate API requests using A-Admin-1 and A-Admin-2.
2. In request A change RF1; in request B change another approved field while retaining the original revision.
3. Send A, then B. Inspect final values and audit history.
4. Repeat from a new common revision, triggering the requests as close together as possible with two clients. Record actual timings; also retain automated concurrency coverage for true contention.

**Expected:** Exactly one mutation succeeds per shared revision; the loser gets the documented conflict response. No newer value is silently reset. A retry must explicitly use the latest revision and reconciled draft.

**Evidence:** Both requests' redacted preconditions/statuses, final config and events. Restore through a new valid revision.

### P1-M09 — Audit diff, no-op, and failed saves

**Covers:** AC-13; MC-11.

1. Save two approved field changes as A-Admin-1 and inspect authorized history.
2. Verify actor, clinic, timestamp, old/new values, and revision.
3. Submit the same values with a fresh valid revision, then an invalid request, forbidden-role request, and stale request.

**Expected:** One real change produces the intended event with exact diff; no-op behavior matches the contract. Rejected requests never appear as successful updates. Clinic B and unrelated SSO/credential data do not leak into the event.

**Evidence:** Redacted event and request outcome table; retain history rather than deleting it after testing.

### P1-M10 — Configuration and audit roll back together

**Covers:** AC-13; MC-11.

1. Use a disposable test environment with a controlled audit-write failure hook prepared by Person 1. Record the baseline config/revision and event count.
2. Enable that failure for one save, attempt an approved change, then disable the hook.
3. GET the config and inspect audit history. Retry the change normally.

**Expected:** The failed transaction leaves both configuration and audit history unchanged; the client receives failure, not success. The normal retry creates one complete change/event. If no failure fixture exists, mark this manual case Blocked and reference automated transaction-failure coverage separately.

**Evidence:** Failure mechanism/build, baseline/final values and counts. Confirm the hook is disabled/removed before handoff.

### P1-M11 — Existing client compatibility

**Covers:** Contract compatibility; MC-04/06.

1. Save a sanitized valid request from the old supported client and the new client before the test.
2. Submit each against the updated backend using disposable fixtures and the declared revision/compatibility policy.
3. Include one old alias and one deliberately unsupported old key.

**Expected:** Supported aliases normalize as documented; incompatible old clients receive an actionable controlled error. No successful response silently loses settings or weakens stale-write protection.

**Evidence:** Client/version matrix, submitted and canonical keys, documented compatibility-window result.

### P1-M12 — Deployment-engine migration and recovery rehearsal

**Covers:** Release migration/recovery gate; AC-06.

1. On a disposable database using the intended deployment engine, load the legacy fixture snapshot and record counts/overrides.
2. Apply the exact release migration/backfill steps; run P1-M03, M04, and M06's key preservation checks.
3. Follow the documented recovery process on that disposable environment, preserving a copy of evidence/history.
4. Confirm the chosen compatible application version can read the restored configuration and perform an approved save.

**Expected:** No engine-specific boolean/null/JSON/constraint issue; preserved choices and a usable recovery path. Historical destructive down migrations are not the recovery method.

**Evidence:** Engine/version, commands, before-after/recovery report, reviewer sign-off. Restore the designated test environment for other testers.

## Completion packet

Deliver the reviewed contract, fixtures, migration/backfill/recovery instructions, automated results, and P1-M01–M12 outcome records to Person 4. Link each failure to an owner and defect; do not claim a migration or concurrency check passed merely because the ordinary API tests pass.
