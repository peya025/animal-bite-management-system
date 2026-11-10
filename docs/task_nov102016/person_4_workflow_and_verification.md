# Person 4 — Station workflow and integrated verification

**Status:** Not started  
**Role:** Full-stack workflow implementer and final verification coordinator  
**Read first:** [Team ownership/handoffs](team_assignments.md), [audit](admin_module_configuration_audit.md), [plan](implementation_plan.md), [inventory](field_inventory.md).

## Outcome

Make supported Registration/Triage/Treatment station settings govern actual authorized entry points and queue transitions without stranding patients or bypassing safeguards. Demonstrate that the combined API, admin editor, forms, and workflow behave correctly together.

## Owned files and boundaries

- New station capability/transition policy and applicable queue/check-in services/controllers.
- `QueueService.php`, `PatientService.php`, `TreatmentRecordService.php`, and `TagoloanTreatmentCardService.php` for coordinated changes.
- Queue/station UI entry points, workflow tests, and combined module-configuration browser tests.
- New `workflow_decisions.md` and `verification_results.md` in this folder; the Cycle 8 UI guide update.

Person 1 owns configuration persistence and `backend/routes/api.php`; request route/policy-call changes from them. Person 2 owns shared frontend routing/navigation/provider; supply capability requirements to them. Person 3 owns field components/clinical requests; coordinate entry-point guards rather than editing their files independently. Each person owns their component-level tests; your job is the combined evidence and workflow tests.

## Task checklist

### P4-01 — Define supported operational behavior

- [ ] Trace every station-sensitive route and operation: registration, walk-ins, returning patients, appointments, consultation, reassessment, treatment, dose recording, and queue transitions.
- [ ] Define the meaning of disabling each station with the clinic workflow owner.
- [ ] Specify behavior for active queues, ongoing episodes, existing schedules, assigned staff, and all-stations-disabled requests.
- [ ] Do not infer permission to skip triage from the existing editor's help text.
- [ ] Record accepted, rejected, and unsupported combinations in `workflow_decisions.md`.
- [ ] Give Person 1 validation/capability requirements and Person 2 accurate labels/availability rules.

### P4-02 — Implement one capability/transition policy

- [ ] Resolve station availability using Person 1's effective configuration and current clinic context.
- [ ] Keep operational capability checks separate from role authorization; both must pass.
- [ ] Provide one policy callable from configuration updates and operational services so transition rules are not duplicated.
- [ ] Reject unsupported or unsafe changes clearly until a valid transition exists.
- [ ] Define behavior for configuration changes during active visits; avoid silently rerouting existing patients.
- [ ] Preserve existing clinical, prescription, appointment, and inventory safeguards.

### P4-03 — Integrate live station behavior

- [ ] Apply capability checks to direct backend operations, not only UI visibility.
- [ ] Integrate approved routing behavior for new, returning, reassessment, and follow-up cases.
- [ ] Update queue/station UI to explain unavailable actions without pretending existing work disappeared.
- [ ] Ask Person 2 to apply agreed shared route/navigation changes and Person 3 to apply form-entry guards where needed.
- [ ] Coordinate Person 3's required persistence changes in the shared services you own.
- [ ] Verify staff assignment does not override a disabled capability or inadvertently grant permissions.

### P4-04 — Build meaningful workflow and browser coverage

- [ ] Add workflow tests for supported station combinations, active-queue transitions, direct requests, and blocked operations.
- [ ] Add browser tests for admin save -> reload -> downstream form/queue effect using an isolated clinic.
- [ ] Verify fresh setup and legacy migration paths reach a usable editor and supported workflow.
- [ ] Exercise two-admin stale-save behavior, read-only access, and save/load recovery with Persons 1/2.
- [ ] Independently verify keyboard behavior, accessible naming, target widths, and zoom after Person 2's fixes.
- [ ] Run relevant returning-patient, reassessment, vaccination, queue, and stock regression tests.

### P4-05 — Compile release evidence and recovery checks

- [ ] Collect each person's test commands, environment, results, and unresolved limitations; do not replace their tests with a single broad happy-path test.
- [ ] Map all MC findings and AC-01–22 to evidence or an explicitly unavailable/deferred feature.
- [ ] Record integrated results in `verification_results.md`, distinguishing automated, manual, and unexecuted checks.
- [ ] Update the Cycle 8 guide with `/setup/modules`, actual supported controls, and current verified behavior.
- [ ] Review Person 1's migration/backfill/recovery demonstration on the intended database engine.
- [ ] Prepare pilot and rollback steps from the shared plan; preserve audit history and configuration snapshots.
- [ ] Obtain technical reviews from Persons 1–3 before recommending release. Publishing the checklist does not itself deploy the feature.

## Can start now / must wait

Start workflow tracing, decision tables, regression fixtures, and browser test preparation immediately. Policy semantics require the workflow-owner decisions. Integration needs Person 1's registry and Person 2's provider; complete browser scenarios need Person 3's real form consumers. Keep unsupported settings unavailable until those dependencies are satisfied.

## Acceptance criteria

- [ ] AC-17 passes; workflow/stock parts of AC-21 are covered; combined AC-07/AC-12 and final matrix evidence are recorded.
- [ ] Supported station switches affect both UI and direct API behavior consistently.
- [ ] Disabling a station either uses its approved transition or fails clearly; no patient is silently stranded or rerouted.
- [ ] Existing role checks, clinical safeguards, and inventory rules still pass.
- [ ] A browser test proves configuration is persisted and used by a downstream operation, not merely that a success modal appears.
- [ ] All 15 findings have an owner and current disposition; no unsupported behavior is presented as working.
- [ ] Final evidence distinguishes verified behavior from pending browser, database, or mobile checks.
- [ ] Release and recovery instructions are reviewed by the other three implementers.

## Detailed execution sequence

| Step | Implementation detail | Output / dependency gate |
| --- | --- | --- |
| 1. Operation inventory | Map station-sensitive UI actions to API operations, roles, services, queue states, appointments, and stock effects | Complete enforcement-point checklist |
| 2. Decision table | Review station combinations and waiting/in-service/returning cases with the workflow owner | Supported/rejected behavior; no guessed bypass |
| 3. Policy | Centralize capability checks and transition validation, independent of role authorization | Interface for Person 1's configuration update and live operations |
| 4. Backend operations | Apply policy at actual mutations; coordinate shared-service changes with Person 3 | Direct requests cannot bypass disabled capabilities |
| 5. Frontend entry points | Update queue UI; send shared navigation changes to Person 2 and form guards to Person 3 | Accurate explanations for unavailable operations |
| 6. Active work | Define current-visit/stale-session behavior, re-enable handling, and staff-assignment interaction | No vanished/duplicated/stranded queues or implicit role grants |
| 7. Integration | Exercise admin save -> revision -> form/provider -> operation -> queue/history/stock outcomes | Actual workflow evidence, not just success-modal evidence |
| 8. Release review | Collect evidence, verify migration/recovery, update guide and finding status | Complete matrix, open risks, pilot and rollback instructions |

List all three-station boolean combinations, but do not assume every combination should be accepted. Specify whether each is supported, rejected, or unavailable and how active work is handled. Unsupported combinations need rejection tests rather than fabricated workflow expectations.

## Manual testing instructions

Complete [shared setup](manual_testing_setup.md) and freeze `workflow_decisions.md` first. Use separate staff browser profiles and disposable synthetic episodes. Capture baseline queue, appointment, clinical record, and inventory counts before operations with side effects.

For every station-disable case choose the expected outcome before testing: **accepted with a defined transition**, or **rejected with current configuration retained**. An undecided expectation is Blocked. Arbitrary routing is not acceptable merely because the screen does not crash.

### P4-M01 — Baseline end-to-end operation

**Covers:** AC-07/14/21; MC-03/05/15.

1. Restore the supported baseline station configuration and record its revision and test stock.
2. As A-Registration register a synthetic patient through `/patients`; inspect the new queue entry.
3. As A-Doctor open that entry, complete the pre-approved fixture consultation in Form 2, and submit.
4. As A-Treatment open the eligible Form 3 operation, enter approved fixture data, and submit once.
5. Inspect patient history, queue state, follow-up appointment, dose record, and stock transactions.

**Expected:** Each step follows the baseline workflow, role rules, and clinical fixture expectations; exactly the intended records/stock effects occur. The same episode remains traceable across forms.

**Evidence:** Patient/episode/queue IDs, revisions, transitions, before-after counts and stock changes. Restore the fixture afterward.

### P4-M02 — Registration disabled

**Covers:** AC-17; MC-03/05.

1. Request registration disabling, including an intentionally unsupported combination if the policy forbids it.
2. Reload admin and registration views. Attempt the registration action, direct route, direct patient-create request, and relevant walk-in queue-creation request from the operation inventory.
3. Test any explicitly allowed alternative check-in path separately.
4. Re-enable registration where supported and repeat one valid registration with a new fixture.

**Expected:** Rejected configuration leaves previous values intact. Accepted disabling blocks exactly the declared capabilities at UI and backend with no partial patient/queue writes; permitted alternatives follow policy. Re-enabling restores actions without duplicates.

**Evidence:** Configuration response, action/API table, record counts, and staff-facing explanation.

### P4-M03 — Triage disabled or unsupported bypass

**Covers:** AC-17/21; MC-03/05.

1. Attempt the agreed triage-disable setting and reload to verify persistence or explicit rejection.
2. If accepted, register a new fixture and trace its documented destination; attempt doctor and nurse operations with the correct roles.
3. Attempt a treatment request lacking the fixture's required assessment/order; inspect records/stock afterward.
4. Re-enable triage where supported and test a separate new patient.

**Expected:** Results match the reviewed policy. No flag authorizes treatment without essential prerequisites. An unsupported bypass is unavailable/rejected and does not change flow despite the old editor's promise.

**Evidence:** Policy row, setting response, actual queue path, denied request, and unchanged counts for invalid treatment.

### P4-M04 — Treatment disabled

**Covers:** AC-17/21; MC-03/05.

1. Use an eligible treatment fixture with known stock; request treatment disabling.
2. Reload treatment/queue views and attempt applicable card/dose and appointment check-in operations from the inventory.
3. Replay those operations directly with the correct role and valid payload.
4. Re-enable where supported and complete one valid eligible operation.

**Expected:** Rejection preserves the old config; accepted disabling enforces the declared scope on the server. Denials create no doses, appointments, or stock deductions. Re-enabling does not duplicate entries or bypass eligibility.

**Evidence:** UI/API results, clinical/schedule/stock counts, and result after re-enable.

### P4-M05 — Station combination matrix

**Covers:** AC-17; MC-03.

1. Enumerate Registration/Triage/Treatment combinations: 111, 110, 101, 100, 011, 010, 001, 000, where 1 means enabled.
2. For each row use a clean fixture and fresh revision; attempt it via editor where exposed and directly through the API.
3. For accepted rows run one permitted operation and one prohibited operation where such operations exist.
4. For rejected/unavailable rows verify persisted values and the explanation.

**Expected:** All rows match the pre-approved table, including all-disabled. No response partially accepts a combination or silently drops a flag. Accepted operations retain role and clinical requirements.

**Evidence:** Eight-row policy/request/reload/operation matrix with failures or justified unavailable outcomes. Restore baseline between rows.

### P4-M06 — Waiting and in-service patients during a change

**Covers:** AC-17; MC-05.

1. Prepare two queue entries for the affected station: one waiting, one in service. Record IDs/states and appointments.
2. Attempt the station change while both staff views remain open.
3. Refresh one staff view and leave the other stale; attempt the next appropriate action in each.
4. Complete the documented transition or undo the change through a fresh valid save.

**Expected:** The policy rejects the change, explicitly preserves/drains active work, or uses its reviewed transition. Patients do not disappear, duplicate, jump an unauthorized stage, or become unrecoverable. Stale requests remain server-checked.

**Evidence:** Before-after queue/appointment table, stale/refreshed responses, and recovery outcome.

### P4-M07 — Returning, reassessment, and follow-up pathways

**Covers:** AC-17/21; MC-05.

1. Use separate fixtures for missed initial triage, pending-treatment reassessment, scheduled follow-up, and new exposure/re-exposure.
2. For each, record expected destination and prerequisite rules from the reviewed fixture.
3. Execute its actual check-in/action path with the relevant station enabled, then on a clean fixture with its disabled/rejected setting.
4. Test direct API access for one denied operation per distinct pathway.

**Expected:** Each path respects clinical eligibility and capability policy. Settings do not merge episodes or reinterpret an old visit as a new one. Denials cause no partial check-in/queue/schedule writes.

**Evidence:** Pathway matrix with fixture IDs, role, endpoint, expected/actual station, and side effects.

### P4-M08 — Role and staff-assignment boundaries

**Covers:** AC-01/04/17/21.

1. With a station enabled, attempt its mutation as an authorized user and a user without the necessary role.
2. Assign the test user to a different module through the supported admin flow; repeat according to assignment policy.
3. Disable the station where supported and try with an otherwise authorized, explicitly assigned user.
4. Attempt direct requests after UI entry points are hidden/removed.

**Expected:** Role, assignment, and enabled capability combine as specified; neither assignment nor a module flag grants an otherwise unauthorized operation. Direct requests are enforced independently of menus.

**Evidence:** Role/assignment/capability matrix, responses, and unchanged counts for denials. Restore assignments afterward.

### P4-M09 — Double action and mid-operation configuration change

**Covers:** AC-11/18/21.

1. In an eligible fixture trigger the real check-in or dose action twice rapidly; inspect pending requests and use a verified delay if needed.
2. Refresh and inspect queue/dose/stock counts.
3. On a separate fixture leave the form open, change station availability in admin, and attempt the stale operation.

**Expected:** Existing duplicate-action safeguards hold: no extra active queue/dose/stock transaction for one intended action. Stale operations follow the declared active-visit policy with clear recovery and no partial mutation. Record pre-existing baseline duplicate defects separately rather than masking them.

**Evidence:** Request timings/IDs, config revision, counts, and staff feedback. Restore the fixture and remove delays.

### P4-M10 — One real saved rule across the entire system

**Covers:** AC-07/14/18; MC-04/05/15.

1. Make RF1 Required, save, and reload admin to confirm the persisted revision.
2. In an existing registration session follow the refresh policy and attempt submission without RF1.
3. Repeat directly through its clinical API, then supply a valid value and save a new fixture.
4. Reopen the patient to confirm storage. Repeat one approved RF2 or RF3 case with its role.

**Expected:** Editor, GET, provider, live input, server error, and stored value describe the same rule. An editor save alone does not pass this test.

**Evidence:** Linked screenshots/responses across the chain with the same clinic/revision and fixture. Restore original rules.

### P4-M11 — Fresh and upgraded clinic integrated smoke test

**Covers:** AC-05–07/21; MC-06/15.

1. With Person 1 complete fresh setup and save an approved editor change.
2. Run P4-M01 and P4-M10 on that clinic with clean synthetic records.
3. Restore the separate legacy dataset, apply the reviewed migration/backfill, and repeat those checks.
4. Compare custom values, queue/episode integrity, and unrelated settings before/after upgrade.

**Expected:** Both initialization paths support the actual editor/workflow and preserve valid overrides. No six-rule validation failure is hidden by testing only pre-normalized data.

**Evidence:** Dataset/build/migration identifiers, API/UI outcomes, retained-value comparisons, and flow result.

### P4-M12 — Independent UI and access verification

**Covers:** AC-04/09–12/20; MC-01/09/10/12–14.

1. Rerun Person 2's section-only Save/Reset case using a different supported section.
2. Check developer/staff direct route access and one load/save failure recovery case.
3. Use two admin profiles for conflicting drafts and verify explicit reconciliation.
4. Perform P2-M10/M11 keyboard, narrow-width, and 200% zoom checks and record your own observations.

**Expected:** Results independently match the contract: no inaccessible control, false saved state, role mismatch, or silent overwrite remains in released behavior.

**Evidence:** Independent tester/build, linked case outcomes, redacted screenshots and revisions. Clear network overrides.

### P4-M13 — Release and recovery rehearsal

**Covers:** All release gates; MC-15.

1. Verify every AC-01–22 row has evidence/owner and each MC finding has a disposition.
2. Review Person 1's migration/engine/recovery results, Person 2's UI/provider/build results, and Person 3's field/history coverage.
3. Rehearse the deployment sequence in disposable staging; test the declared old/new client compatibility window.
4. Perform the documented rollback/recovery rehearsal, then a configuration save and supported workflow smoke test.
5. Produce the pilot checklist and unresolved/unavailable feature list before recommending release.

**Expected:** Supported behavior works after deployment and recovery. No destructive seeding or unreviewed clinical transition is used to force a pass. Advertised behavior with failed/blocked acceptance remains a release issue.

**Evidence:** Completed matrix, builds/environment/commands, recovery smoke result, defects, and reviews by Persons 1–3. This rehearsal is not a live deployment.

## Enforcement-point coverage and completion packet

Use a row for every station-sensitive operation; the three visible switches are insufficient coverage alone.

| Operation / endpoint | Role / assignment | Station / active-work state | Policy expectation | UI result | API result | Queue / record / stock effects | Case / outcome |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fill during execution | Fixture role | Include stale sessions | Pre-agreed allowed/denied result | Actual result | Status/error | Before-after counts | P4-Mxx / Not run |

Deliver the operation inventory, eight-combination matrix, P4-M01–M13 results, shared AC/MC index, updated Cycle 8 guide, and release/recovery checklist. Preserve historical audit findings and append resolution evidence instead of rewriting the original observations as though the defects never existed.

## Review and delivery

Person 3 reviews clinical/workflow interactions; Person 1 reviews policy integration, scoping, and concurrent updates. Deliver the decision table and policy interface early, then station behavior in small reviewable changes. Final verification coordinates all four people's work; it does not transfer responsibility for their defects to you.
