# Admin Module Configuration implementation plan

**Prepared:** 10 November 2026 (Asia/Manila)  
**Status:** Proposed; implementation has not started.  
**Inputs:** [Audit](admin_module_configuration_audit.md) and [field inventory](field_inventory.md).  
**Objective:** Every available admin control must have a defined contract, persist predictably, and affect only its documented consumers, with correct clinic isolation and verifiable behavior.

**Team execution:** Use the [four-person assignments](team_assignments.md) to distribute this plan. Each person has a separate task file; the phases and acceptance criteria below remain the shared requirements.

## 1. Scope and working decisions

The following are recommended defaults for implementation. Resolve the product/clinical decisions in Phase 0 before implementing dependent behavior; they do not prevent the immediate correctness repairs.

| Decision | Recommended direction | Reason / dependency |
| --- | --- | --- |
| Supported catalog | Explicitly classify all 81 visible fields and 24 backend-only fields before enabling controls | A displayed field is not automatically safe or meaningful to configure |
| Station disabling | Treat as an operational capability with explicit workflow rules | A boolean must not silently bypass assessment, authorization, or stock controls |
| Developer access | Read-only if access is needed; admin owns writes | Aligns with current server authorization without granting new powers |
| Missing clinic | Reject; require an explicit authorized clinic selection for any future cross-clinic tool | Eliminates first-clinic fallback |
| Essential fields | Lock required identity/clinical/system fields and explain the constraint | Configuration must not weaken existing invariants |
| Hidden fields | Hide editable controls only where permitted; preserve stored history | Hiding a form input is not a data-deletion or privacy mechanism |
| Disabled sections | Suppress configurable optional inputs; validate dependent rules consistently | Avoid invisible required fields and impossible forms |
| Existing episodes/queues | Define an explicit transition policy before activating workflow changes | Do not strand patients or retroactively reinterpret recorded care |
| Mobile and print | Make scope explicit; preserve historical/print records by default | No mobile configuration consumer currently exists |
| Templates | Keep preview separate in this repair | No implicit publication of preview changes |

No redesign of treatment protocols, authentication/SSO, staff assignment semantics, or unrelated modules is included. Integrations with those systems must preserve their current safeguards.

## 2. Target contract

Create one authoritative field and section registry in the backend, with generated/shared frontend types or a schema response consumed by the editor. Choose the least disruptive representation after examining deployed clients; do not introduce a new payload shape without a compatibility path.

Each configurable field definition should include:

- Stable ID, form and section ID, label, and default rule.
- Allowed rule values and any locked minimum requirement.
- Visibility/dependency conditions (for example spouse name only when married).
- Explicit mapping to frontend input and backend request/storage names.
- Applicable operations (create, edit, consultation, dose entry) and platforms.
- Deprecation/alias information for legacy keys.

Each section definition should include its stable ID, supported enabled/disabled behavior, and storage mapping. Never use translated/display titles as persistence keys.

The effective configuration response should be complete and normalized, include a schema version and monotonically increasing revision, and expose capability information such as edit permission. Keep editable draft state and last saved state separate in the frontend.

Unknown keys should generate actionable validation errors rather than success with discarded changes. If a compatibility window accepts legacy aliases, document and normalize them explicitly. Use a dedicated response representation so unrelated model attributes do not silently expand this API.

## 3. Ordered work packages

### Phase 0 — Define supported behavior and regression fixtures

**Addresses:** MC-02 through MC-06, MC-09, MC-15  
**Owners:** Product owner/clinic workflow lead with backend, frontend, and QA implementers  
**Dependency:** None

- [ ] Review the full inventory and mark each field: configurable, locked, derived/read-only, legacy alias, or unsupported.
- [ ] Define whether disabling registration permits other check-in routes, whether treatment can be disabled while appointments exist, and whether a triage bypass is permitted at all.
- [ ] Specify handling of active queues, existing treatment schedules, staff assignment conflicts, and all-stations-disabled requests.
- [ ] Decide mobile/create/edit/print applicability and describe it next to controls.
- [ ] Choose developer read-only access or route denial; keep server write access admin-only unless explicitly redesigned.
- [ ] Add permanent failing regression cases for the highest-priority audit findings; temporary diagnostic tests from the audit are not retained coverage.

**Acceptance:** A field/section/station contract exists with no ambiguous editable control. Tests reproduce silent drops, section-only dirty-state failure, incompatible defaults, and missing-clinic behavior before repairs.

### Phase 1 — Contain misleading behavior and enforce clinic context

**Addresses:** MC-03, MC-05, MC-07, MC-08, MC-09, MC-12  
**Owners:** Backend and frontend  
**Dependency:** Can begin immediately; station activation still depends on Phase 0

- [ ] Remove implicit `Clinic::first()` fallback from configuration reads and writes; return a controlled missing-clinic response.
- [ ] Preserve authenticated clinic scoping and reject/ignore user-supplied target IDs according to the explicit API contract.
- [ ] Change nullable section validation to the selected non-null contract, preserving valid `false` values and documented omission behavior.
- [ ] Mark unsupported station/field controls unavailable and explain their status until end-to-end support exists.
- [ ] Correct the flow diagram and help text so draft or unsupported settings are not described as live behavior.
- [ ] Align developer route/action availability with the chosen read-only/denied policy.
- [ ] Render an explicit error state with Retry when configuration fails to load; do not present unverified defaults as a ready editor.

**Likely files:** `ClinicModuleConfigService.php`, `UpdateClinicModuleConfigRequest.php`, `ClinicModuleConfigController.php`, `ModuleConfigPage.tsx`, `App.tsx`, and navigation/access capability helpers.

**Acceptance:** Missing clinic never reads/writes another clinic; null section values produce validation errors; every visible enabled control is backed by a supported contract; read-only users cannot initiate saves; load failures are recoverable.

### Phase 2 — Unify schema, initialization, and migration

**Addresses:** MC-02, MC-03, MC-04, MC-06, MC-08  
**Owner:** Backend, with frontend contract review  
**Dependency:** Phase 0 catalog; deploy before the editor starts sending new keys

- [ ] Implement the registry and normalized configuration resolver.
- [ ] Replace duplicated defaults in `ClinicSetupService` and `DefaultClinicConfigSeeder` with that resolver.
- [ ] Add a forward-only corrective migration/backfill for missing/null/legacy rules. Preserve explicit valid Required/Optional/Hidden values and all existing false section choices.
- [ ] Map six legacy seed keys deliberately; do not assume `bite_location`, `bite_site`, and `body_part_affected` are equivalent without checking their consumers.
- [ ] Make repeated seeding non-destructive and idempotent. Do not change historical migration files as the deployment repair.
- [ ] Introduce storage only for approved station/section controls; preserve the unique clinic constraint.
- [ ] Replace open string-index request types and `any` casts with precise contract types.
- [ ] Reject invalid/unknown keys and invalid values with field-addressable errors.
- [ ] Decide whether missing rows are initialized during setup/backfill or lazily; if retaining lazy creation, document GET's write side effect and test concurrent initialization.
- [ ] Return a complete versioned response while preserving existing consumers during the compatibility window.

**Likely files:** New registry/resolver, configuration service/request/model, new migration, setup service, default seeder, frontend `types/index.ts` and `clinicConfigApi.ts`.

**Acceptance:** Empty, six-key, 41-key, partial, and null legacy fixtures resolve to the same supported shape without overwriting explicit choices. Setup -> GET -> edit -> PUT -> GET succeeds. Repeated backfills/seeds change nothing after the first normalization. Every available editor field survives a round trip.

### Phase 3 — Repair editor state and accessible controls

**Addresses:** MC-01, MC-02, MC-03, MC-04, MC-12, MC-13, MC-14  
**Owner:** Frontend  
**Dependency:** Stable Phase 2 response/schema

- [ ] Render sections from stable IDs and explicit metadata; replace all title-based state/payload mapping.
- [ ] Use one normalized draft and saved baseline for modules, sections, and fields.
- [ ] Compare the complete editable state; section-only edits enable Save and Reset.
- [ ] Reset locally to the saved baseline, or explicitly offer a separate Reload action; do not silently replace a draft with someone else's changes.
- [ ] On successful save, synchronize all relevant state from the authoritative response. If editing is allowed while saving, retain changes made after the submitted snapshot; otherwise disable all editor inputs during the request.
- [ ] Preserve drafts after validation/network/conflict errors. Display individual server errors next to affected controls and an accessible summary.
- [ ] Warn on leaving with unsaved changes; distinguish draft flow from saved flow.
- [ ] Use labelled switches/selects, visible focus, valid interactive structure, and linked accordion state. Prevent unintended Space scrolling.
- [ ] Replace duplicated form-card render blocks with a reusable section/field renderer after behavior is covered.
- [ ] Add narrow-layout rules and verify long labels at target widths and zoom.

**Likely files:** `ModuleConfigPage.tsx`, extracted editor components/state utilities, scoped styles, configuration API types.

**Acceptance:** Toggle each supported section independently, Save, reload, and confirm persistence; Reset works for the same cases. No stale dirty marker follows success. Keyboard users can identify and operate every control. The page remains usable at 360/768/1280 CSS pixels and 200% zoom.

### Phase 4 — Apply approved rules to actual consumers

**Addresses:** MC-05 and approved parts of MC-03/MC-04  
**Owners:** Backend and frontend, with clinic workflow validation  
**Dependency:** Phases 0–3; workflow decisions must be resolved first

- [ ] Create a shared effective-rule resolver for UI and a matching server rule composer. Keep permission checks separate from presentation configuration.
- [ ] Integrate Form 1 registration and edit paths, including membership conditions and input/API aliases such as `sex` -> `gender` and `emergency_contact_phone` -> `emergency_contact_number`.
- [ ] Integrate approved Form 2 rules and Form 3/card/dose controls without weakening treatment authorization, prescription, category, or inventory constraints.
- [ ] Apply required rules only when the field is applicable and editable. Prevent hidden required controls, parent/child contradictions, and server/UI disagreement.
- [ ] Preserve historical stored values when a field/section is hidden. Define how newly submitted hidden values are treated rather than accidentally erasing them on update.
- [ ] For each approved station flag, enforce the capability at both UI entry points and backend operations, including direct API calls, queue routing, returning patients, appointments, and reassessment.
- [ ] Add explicit transition handling for already queued patients and active episodes. Reject unsafe combinations until a valid transition exists.
- [ ] Introduce a clinic-keyed configuration cache/provider and invalidation after saves. Reset it on logout/clinic change; handle stale sessions and mid-form updates deliberately.
- [ ] Define failure behavior when configuration cannot load; preserve baseline required validation and never silently weaken it through the unused hook's current optional defaults.
- [ ] Integrate mobile only if approved in Phase 0; otherwise clearly describe the feature as web-only. Preserve print/historical views unless separately specified.

**Likely files:** `useClinicModuleConfig.ts` or replacement provider, registration create/edit components and requests, consultation components/requests, treatment-card/vaccination components/requests, queue/check-in services, and related authorization/capability helpers.

**Acceptance:** Every available rule has a tested live consumer and server equivalent where applicable. Required fields reject missing values; permitted Hidden fields disappear from entry controls without deleting history; non-applicable conditional fields do not block submission. Approved station changes affect direct API access and queue behavior consistently. Unsupported transitions fail clearly instead of bypassing safeguards.

### Phase 5 — Add revision checks and change history

**Addresses:** MC-10, MC-11  
**Owners:** Backend and frontend  
**Dependency:** Phase 2 contract; required before final rollout

- [ ] Add a revision column/precondition and perform compare-and-update atomically.
- [ ] Reject stale updates with a conflict response that returns enough information to reload/compare; preserve the local draft.
- [ ] Store a clinic-scoped before/after diff, actor, timestamp, and resulting revision in the existing audit infrastructure within the save transaction.
- [ ] Emit exactly one change event for an actual successful change; define no-op save behavior explicitly.
- [ ] Avoid logging patient records, tokens, or unrelated SSO details in this event.
- [ ] Provide administrators a way to inspect previous configuration changes. If restore is implemented, make it a new validated revision with its own event.

**Acceptance:** Of two saves using the same revision, one succeeds and the other conflicts; neither silently overwrites the first. A save and its audit record either both commit or both roll back. No-op, denied, invalid, and conflicting requests do not create misleading success events.

### Phase 6 — Regression verification and documentation

**Addresses:** All findings, particularly MC-15  
**Owner:** QA with implementers  
**Dependency:** Completed applicable work packages

- [ ] Convert the matrix below into meaningful automated coverage; do not rely only on snapshots or tests mirroring implementation helpers.
- [ ] Add browser tests for the real admin page and representative downstream forms, using an isolated test clinic.
- [ ] Run related setup/authentication, registration, consultation, treatment, inventory, and queue regression suites for the integration changes.
- [ ] Run frontend type/build checks and accessibility/keyboard/narrow-layout verification.
- [ ] Test database migration and null/boolean semantics on the deployment database engine, not only SQLite.
- [ ] Update the Cycle 8 guide to `/setup/modules`, current controls, actual expected behavior, and fresh test results.
- [ ] Update this audit's findings with resolution evidence and commit references; preserve the original observations.

**Acceptance:** No open P1 remains for released controls; relevant regression checks pass; each supported control has verified persistence and live behavior; deferred behavior is visibly unavailable and documented.

## 4. Acceptance test matrix

| ID | Scenario | Required result | Coverage |
| --- | --- | --- | --- |
| AC-01 | Anonymous read/write; inactive staff; staff write | Appropriate denial; no mutation | API |
| AC-02 | Admin clinic A submits clinic B ID | No access/mutation to B | API |
| AC-03 | Admin with missing clinic | Controlled denial, no fallback or row creation | API |
| AC-04 | Developer direct URL and save attempt | Consistent declared read-only/denied behavior | API + browser |
| AC-05 | New setup and seeded clinic round trip | Complete supported config; successful save | Feature |
| AC-06 | Legacy/partial/null config and backfill rerun | Valid choices preserved; complete defaults; idempotent | Migration + feature |
| AC-07 | Every supported field and section | Value persists through PUT/GET and reload | Parameterized contract + browser |
| AC-08 | Unknown key, invalid enum, missing required key, null switch | Field-specific 422; no 500 or silent discard | API |
| AC-09 | Only one section changes | Save/Reset enabled; both perform correctly | Browser |
| AC-10 | Save succeeds; save fails; load fails | Clean baseline or retained draft; meaningful Retry/error | Browser |
| AC-11 | User edits during slow save | No lost/newer edits or false saved state | Browser |
| AC-12 | Two admins save same revision | One commit; one explicit conflict | API concurrency + browser |
| AC-13 | Successful, failed, and no-op saves | Correct atomic audit history | Feature |
| AC-14 | Required/Optional/Hidden on permitted representative fields | UI and server agree; direct requests cannot bypass requirements | Browser + API |
| AC-15 | Hidden spouse/conditional membership field with required rule | Applicability resolved; no invisible required control | Browser + API |
| AC-16 | Essential/derived field requested Hidden or Optional | Unsupported rule rejected or locked per catalog | API + browser |
| AC-17 | Disable supported station with existing work | Defined transition or explicit rejection; no stranded queue | Workflow feature + browser |
| AC-18 | Clinic switch, logout, stale session, config fetch failure | No other-clinic cache; required baseline remains safe | Integration |
| AC-19 | Hide section on edit of existing patient | Historical values remain stored and available in authorized history | Feature + browser |
| AC-20 | Keyboard, screen-reader names, target widths/zoom | Operable labelled controls, visible focus, no blocking overflow | Accessibility + manual browser |
| AC-21 | Re-exposure, reassessment, vaccination and stock flows | Existing clinical/authorization/inventory safeguards still pass | Regression suites |
| AC-22 | Mobile/print behavior | Matches explicitly chosen scope; no accidental history loss | Contract + relevant UI |

For field rules, sample all distinct control/condition types in browser tests and exhaustively test registry serialization/validation at the API layer. Include true/false/null/omitted values separately so false is never replaced by a default.

## 5. Deployment, migration, and rollback

1. **Inventory before mutation:** Produce a read-only report of config rows by shape/version and missing clinic associations. Do not infer deployed data condition from this source audit.
2. **Back up:** Capture configuration rows, revisions, and schema before applying the corrective migration. Keep backups access-controlled.
3. **Stage normalization:** Apply additive schema changes and normalization in a test environment; compare before/after values and rerun to prove idempotency.
4. **Deploy compatible backend first:** Support the approved transition contract before releasing an editor that sends new keys. Preserve old-client behavior where valid; explicitly reject unsupported operations.
5. **Stage consumers:** Enable approved behavior only after contract and consumer regression tests pass. Do not suddenly enforce previously ignored settings against active patients without a documented transition.
6. **Pilot:** Verify one designated test/pilot clinic through save/reload plus registration, consultation, treatment, and queue operations.
7. **Observe:** Review validation errors, conflict rates, failed saves, audit events, and queue anomalies. Record configuration revision in operational diagnostics where useful, without patient data in config logs.
8. **Rollback if needed:** Revert application behavior using the compatible prior release/feature gate; preserve additive columns and audit history. Restore configuration only from a known snapshot through an intentional, reviewed recovery operation. Do not rerun destructive default seeders or historical down migrations as a rollback strategy.

## 6. Completion checklist

- [ ] All released controls have stable IDs, explicit meaning, storage, validation, and consumer coverage.
- [ ] Fresh and existing clinics can load, edit, save, and reload without silent drops.
- [ ] Missing clinic context and role mismatches are resolved.
- [ ] Server rules enforce supported requirements while preserving essential safeguards.
- [ ] Concurrent saves cannot silently lose changes; audit history identifies changes and actors.
- [ ] Load/save/error/reset/navigation and keyboard/responsive behavior are verified.
- [ ] Migration preserves existing valid choices and has a tested recovery path.
- [ ] Actual test commands/results and any intentionally deferred features are recorded.

Implementation is complete only when this behavior is demonstrated across the editor, API, persistence, and approved live workflows—not merely when the page saves successfully.
