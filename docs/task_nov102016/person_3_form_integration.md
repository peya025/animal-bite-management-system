# Person 3 — Live form rules and server validation

**Status:** Not started  
**Role:** Full-stack form integration implementer  
**Read first:** [Team ownership/handoffs](team_assignments.md), [audit](admin_module_configuration_audit.md), [plan](implementation_plan.md), [inventory](field_inventory.md).

## Outcome

Make supported Required/Optional/Hidden settings affect the real Form 1, Form 2, and Form 3 inputs and matching server validation. Preserve essential requirements, conditional-field behavior, existing patient history, and clinical safeguards.

## Owned files and boundaries

- Patient registration/create/edit field components, including `AddPatientModal` and relevant edit variants.
- Consultation field components/hooks, including `GeneralTreatmentForm` and `useGeneralTreatmentForm`.
- Vaccination/treatment-card field components and applicable dose-entry controls.
- Clinical field request validation, including patient, treatment-record, and treatment-card requests; new effective field-rule composer.
- Clinical field/create/edit regression tests; approved mobile field integration if included in the contract.

Person 1 owns the registry, normalization, API, and migrations. Person 2 owns the shared provider/client/types. Person 4 owns station/queue policies and shared persistence services listed in the team ownership table. Propose changes needed in `PatientService.php`, `TreatmentRecordService.php`, and `TagoloanTreatmentCardService.php` to Person 4 instead of editing them concurrently.

## Task checklist

### P3-01 — Complete the field-to-consumer map

- [ ] Classify every visible field and backend-only field: configurable, locked, derived/read-only, legacy alias, or unsupported.
- [ ] Record each field's create/edit/component/request/storage mapping and applicable platform.
- [ ] Identify identity/clinical/system invariants that configuration must not weaken.
- [ ] Document conditional relationships such as marital status, memberships, referral details, and external doses.
- [ ] Resolve aliases such as `sex`/`gender`, emergency phone names, consultation date, body-part fields, and treatment-card names.
- [ ] Provide Person 1 the classification for the shared contract and Person 2 the labels/dependency requirements.

### P3-02 — Build consistent effective field behavior

- [ ] Consume Person 1's normalized registry and Person 2's provider rather than duplicating defaults.
- [ ] Implement a server field-rule composer that adds approved configurable requirements without removing essential validation.
- [ ] Define precedence for mandatory rules, applicability conditions, disabled sections, and per-field rules.
- [ ] Ensure non-applicable conditional fields do not become invisible required inputs.
- [ ] Define whether hidden submitted values are ignored, rejected, or retained by operation; preserve existing values on edit when controls are absent.
- [ ] Preserve baseline requirements during configuration load errors or stale sessions.

### P3-03 — Integrate Form 1 first

- [ ] Apply approved visibility/required states to registration fields, address, contact, socioeconomic, and membership sections.
- [ ] Cover the actual create and edit entry points; identify any alternate patient editor that could bypass configured requirements.
- [ ] Apply equivalent rules in create/update requests and direct API submissions.
- [ ] Keep existing uniqueness, value-format, conditional membership, and identity safeguards.
- [ ] Verify hidden/disabled fields do not erase stored values when updating a patient.

**Checkpoint:** Demonstrate an actual admin save changing an approved Form 1 field, with matching UI and server behavior, before repeating the integration pattern elsewhere.

### P3-04 — Integrate Form 2 and Form 3

- [ ] Apply approved rules to consultation and treatment/card/dose controls, including relevant aliases and conditional inputs.
- [ ] Preserve prescription permissions, reassessment requirements, category rules, dose checks, and inventory-related invariants.
- [ ] Coordinate capability guards with Person 4: field visibility does not authorize a disabled station operation.
- [ ] Cover both new and existing records; avoid retroactive reinterpretation of recorded care.
- [ ] Verify downstream history and print views preserve existing records when entry fields are hidden.
- [ ] If mobile scope is approved, integrate applicable mobile inputs and API rules; otherwise document and verify web-only behavior explicitly.

### P3-05 — Verify and hand off

- [ ] Add tests for required/optional/hidden, locked fields, parent/child conditions, disabled sections, and direct API bypass attempts.
- [ ] Run relevant registration, consultation, treatment, and history regression tests.
- [ ] Test against saved configuration from Person 1's API, not only mocked provider values.
- [ ] Supply Person 4 with representative form scenarios, exact test results, and remaining limitations.

## Can start now / must wait

Start field classification, alias mapping, current-behavior regression fixtures, and identifying all entry points immediately. Final consumer integration requires Person 1's schema and Person 2's provider. Changes affecting shared persistence or queue transitions need Person 4's handoff. Essential clinical requirements require workflow-owner resolution if there is ambiguity; keep them locked in the meantime.

## Acceptance criteria

- [ ] AC-14–16 and AC-19 pass; field/clinical parts of AC-21 and declared scope in AC-22 are covered.
- [ ] Every released configurable field has a real consumer and applicable server enforcement.
- [ ] Missing approved required values fail both UI and direct API submission.
- [ ] Optional/hidden conditional fields do not block submission when inapplicable.
- [ ] Hiding an entry field never accidentally clears existing patient/treatment data.
- [ ] Essential identity, authorization, clinical, and stock safeguards remain unchanged in effect.
- [ ] Configuration errors cannot silently make all fields optional.
- [ ] Unsupported fields remain unavailable in the editor through the shared catalog, with no misleading promise of support.

## Review and delivery

Person 1 reviews rule composition and alias compatibility; Person 4 reviews field/workflow interactions. Split delivery into the shared composer, Form 1, Form 2, and Form 3 so each can be reviewed and tested separately. Do not mark MC-05 fully resolved until Person 4's station consumers are also complete.

## Detailed execution sequence

| Step | Implementation detail | Output / dependency gate |
| --- | --- | --- |
| 1. Consumer inventory | Trace each configuration ID to live input, request key, persistence, create/edit entry points, conditions, and platform | Reviewed mapping for all visible and legacy-only keys |
| 2. Precedence rules | Define essential invariants first, then applicability, section state, and permitted configurable rule; distinguish hidden UI from data access | Shared decisions for registry and server composer |
| 3. Rule composition | Combine configurable rules with format/uniqueness/domain checks; define missing versus explicit null on updates | API tests prevent bypass and accidental clearing |
| 4. Form 1 vertical slice | Connect provider, visibility, required indicators, submit validation, serialization, and create/update requests for one approved field, then the full supported catalog | Admin save changes actual registration and direct API behavior |
| 5. Forms 2/3 | Repeat the vertical slice with consultation/card/dose-specific mappings and preserved permissions/clinical constraints | Form-specific regression suites and real persisted values |
| 6. History and stale forms | Verify hidden fields retain prior values; coordinate revision/load-failure behavior with Person 2 | No silent draft/history loss or validation weakening |
| 7. Other entry points | Cover alternate editors, conditional inputs, mobile/print scope, and Person 4's station guards | No unsupported alternate path bypasses rules |
| 8. Handoff | Run manual matrix below and relevant regression suites; review shared-service patches with Person 4 | Consumer coverage and evidence packet |

Do not implement `hidden` by simply removing a database property or using unconditional nulls in form serialization. Distinguish an omitted hidden field from an explicit user request to clear an editable field.

## Manual testing instructions

Complete [shared setup](manual_testing_setup.md), particularly selection of RF1/RF2/RF3, CF1, and LF1. Use the live registration modal at `/patients`; use the synthetic queue entry's Form 2/Form 3 tabs with the appropriate staff roles. Set every configuration through the real admin editor/API and record its saved revision.

For each successful create or dose submission, use a new fixture or restore the documented synthetic snapshot. For each failure, check record and stock counts as applicable; a validation message alone does not prove that no partial write occurred.

### P3-M01 — Form 1 Required is enforced in UI and API

**Covers:** AC-14; MC-05.

1. As admin set RF1 to Required and save. Open the registration modal in a fresh A-Registration session.
2. Complete all other necessary fields; leave RF1 empty and submit.
3. Supply a valid RF1 value, submit, and inspect the saved patient.
4. Capture a valid registration request, adapt it to a new unique synthetic patient, omit RF1, and send directly through the API client.

**Expected:** UI identifies the missing field; direct API returns the matching field error without a patient/queue partial write. A complete valid request saves the actual mapped value.

**Evidence:** Config revision, form error, redacted API response, before-after patient/queue counts, stored field value. Restore RF1 afterward.

### P3-M02 — Optional and Hidden rules

**Covers:** AC-14/19; MC-05.

1. Set RF1 to Optional, reopen registration, leave it empty while completing baseline-required inputs, and submit a new fixture.
2. Set RF1 to Hidden, reopen another registration, and inspect both visual controls and keyboard focus order.
3. Submit valid remaining inputs and inspect the request/body and stored patient.
4. Send a direct request containing the hidden RF1 value to test the declared hidden-submission policy.

**Expected:** Optional emptiness is accepted; Hidden removes the editable control and its hidden required error. Direct hidden values follow the frozen ignore/reject/retention policy. Essential fields remain enforced and history is not deleted.

**Evidence:** Optional/Hidden screenshots, actual request keys, response and persistence comparison. Use separate patients for the two creates.

### P3-M03 — Conditional required field

**Covers:** AC-15; MC-05.

1. Set CF1 to Required under an approved parent condition, such as spouse name when married.
2. Open the form with the parent condition false; complete and submit without CF1.
3. On another fixture, make the parent condition true, leave CF1 empty, and attempt submission. Then fill it and save.
4. Repeat through direct API requests for condition false and true.
5. Change the parent from true to false in an edit and check stored-value handling against the contract.

**Expected:** Required applies only when applicable. No invisible input blocks the false-parent case; the true-parent case is enforced at both layers. Turning a condition off handles prior data according to the documented retention policy.

**Evidence:** Parent/child value matrix, responses, persisted values. Repeat for each distinct dependency type in the supported catalog, not only marital status.

### P3-M04 — Disable and re-enable an optional section

**Covers:** AC-15/19; MC-02/05.

1. Pick an approved optional section with one configured Required field and stored values on an existing patient.
2. Disable the section through admin, then open create and edit forms as authorized staff.
3. Submit a valid create and change an unrelated editable value on the existing patient.
4. Re-enable the section and reopen the existing patient.

**Expected:** The section follows its approved behavior; suppressed optional inputs do not generate impossible required errors. Existing values survive unrelated edits and reappear when enabled. If disabling that section is forbidden, the admin operation rejects it and does not persist false.

**Evidence:** Section revision, form state, before-after stored values, re-enabled view. Restore the original section state.

### P3-M05 — Locked fields and baseline constraints

**Covers:** AC-16/21; MC-04/05.

1. Locate LF1 and try to make it Optional or Hidden in the admin UI and configuration API.
2. Submit a patient/clinical request missing that required value through the direct API.
3. For a configurable field made Optional, submit an invalid non-empty format/value; test existing uniqueness checks using a controlled duplicate fixture where relevant.

**Expected:** Locked rules cannot be relaxed. Optional means absence may be allowed; it does not mean malformed supplied values or duplicates bypass baseline validation. Failed requests cause no partial clinical/queue/stock writes.

**Evidence:** Locked-control explanation, API errors, invariant regression table and counts.

### P3-M06 — Alias and storage mapping

**Covers:** AC-07/14; MC-04/05.

1. Build a checklist from the reviewed field map, including UI/API names that differ.
2. For each configurable mapped field, save an allowed rule, submit a distinct valid value through its live form, and inspect the captured request.
3. Reopen the saved record and compare the displayed and stored/API-returned value.
4. Repeat on create and edit wherever both exist.

**Expected:** The rule applies to the intended field, error messages point to the visible control, and the correct request/storage property changes. Similar names do not accidentally control a different form field.

**Evidence:** Configuration ID -> input -> request key -> returned value table, including consultation/body-part aliases where supported.

### P3-M07 — Hidden fields preserve existing history

**Covers:** AC-19; MC-05.

1. Start with an existing synthetic patient containing RF1 and a completed record containing RF2/RF3 where applicable; export/read baseline values.
2. Hide those entry fields in admin, reopen their edit screens, and change only an unrelated permitted value.
3. Inspect the update payload and stored records; open authorized patient history and print preview.
4. Re-enable the fields and reopen the original record.

**Expected:** Hidden/omitted fields do not become null or empty through unrelated updates. Historical/print views match the declared preservation policy. Hidden is not represented as an authorization/privacy restriction.

**Evidence:** Before-after values and print/history comparison. No real printer or external delivery is needed; use preview.

### P3-M08 — Form 2 rules and authorization

**Covers:** AC-14/16/21; MC-05.

1. Use a synthetic patient eligible for consultation. As admin set RF2 Required; as A-Doctor open the queue entry's Form 2.
2. Submit all otherwise valid data with RF2 empty, then correct it and save; inspect the consultation and queue transition.
3. Test Optional/Hidden only where the approved catalog permits them, using separate eligible fixtures.
4. Replay the corresponding missing-required request directly; also attempt the operation with an unauthorized staff role.

**Expected:** Configurable rule matches UI/server; valid save uses the correct mapped value. Unauthorized writes remain denied. Configuration cannot bypass prescription/category/reassessment requirements or cause an invalid queue transition.

**Evidence:** Rule-by-outcome table, role denial, consultation count/value, queue state. Use the pre-approved clinical fixtures; this test does not define treatment policy.

### P3-M09 — Form 3/card/dose rules and side effects

**Covers:** AC-14/16/21; MC-05.

1. Use a treatment-eligible synthetic episode with reviewed order and known stock. Record dose, appointment, and inventory totals.
2. Set RF3 Required; as A-Treatment attempt its actual card/dose operation with RF3 empty.
3. Inspect counts, correct RF3, and submit once. Reopen the card/dose record and check mapped values and side effects.
4. Test Optional/Hidden using separate fixtures where permitted. Attempt the direct missing-required request and a request from an unauthorized role.

**Expected:** Missing/unauthorized submissions create no dose, schedule, or stock mutation. A valid operation has exactly its normal documented effects, once. Field configuration does not disable dose, prescription, or inventory safeguards.

**Evidence:** Request/result, record counts, stock transaction changes and stored field values. Restore only through the test-fixture process, not by deleting audit history.

### P3-M10 — All real create/edit entry points

**Covers:** AC-14/19; MC-05.

1. List actual supported patient registration/edit, consultation, and card/dose entry points from the consumer map, including patient-list and queue/modal alternatives.
2. Apply a representative Required rule; attempt empty submission from each applicable path and its direct API.
3. Apply Hidden and check each corresponding edit path preserves existing values.

**Expected:** No alternate editor or request bypasses the rule or clears hidden values. Read-only/historical paths remain read-only. Do not test the placeholder `/patients/create` as if it were the live registration path.

**Evidence:** Entry-point coverage table with role, URL/action, request path, result and data preservation.

### P3-M11 — Failed fetch and changes while a form is open

**Covers:** AC-18; MC-05/12.

1. Open a new form while blocking configuration retrieval using shared setup; inspect whether input/submission is blocked or baseline validation is retained per contract.
2. Restore connectivity and recover without losing unrelated typed input where the UX promises retention.
3. In another session change RF1 while a registration draft is open, then try to submit the older draft.
4. Repeat one supported consultation/treatment case with a rule change mid-form.

**Expected:** Load failure never silently converts essential fields to Optional. Open-form behavior follows the documented revision/refresh policy; the server still enforces the applicable contract and returns actionable errors instead of silently accepting invalid data. Draft handling is explicit.

**Evidence:** Provider/request revision, form feedback, final values. Remove network overrides and restore config.

### P3-M12 — Declared mobile and print scope

**Covers:** AC-22; MC-05.

1. Record whether mobile field configuration is supported or intentionally web-only in this release.
2. If supported, save an approved rule and test its actual mobile form plus direct mobile API for Required/Hidden and conditional behavior.
3. If excluded, verify the admin description states the limitation and mobile behavior remains its documented baseline; do not mark an advertised mobile feature Not applicable.
4. Compare historical print previews before/after an entry-field rule change.

**Expected:** The released behavior matches the stated scope; shared backend validation does not inadvertently break an excluded client, and historical records remain readable/printable as intended.

**Evidence:** Platform/build, scope statement, mobile outcomes or justified Not applicable, before-after print preview.

## Per-field coverage and completion packet

Create a row for every released configurable field, and separate rows for materially different operations. Repeat the applicable cases above; RF1/RF2/RF3 are starting examples, not substitutes for complete coverage.

| Config ID | Form / operation / role | Allowed rules tested | Condition cases | UI / request / stored key | Manual case IDs | Result / defect |
| --- | --- | --- | --- | --- | --- | --- |
| Fill during execution | Create/edit/card/dose as applicable | Required/Optional/Hidden or locked | True/false/section disabled | Record actual mappings | P3-Mxx | Not run |

Deliver this matrix, P3-M01–M12 evidence, relevant regression results, and a list of unsupported/locked fields to Person 4. Review patient-history and clinical side effects jointly before claiming field integration complete.
