# Person 2 — Admin editor and shared frontend configuration

**Status:** Not started  
**Role:** Frontend implementer  
**Read first:** [Team ownership/handoffs](team_assignments.md), [audit](admin_module_configuration_audit.md), [plan](implementation_plan.md), [inventory](field_inventory.md).

## Outcome

Deliver an accessible admin editor where supported settings load, change, reset, save, and reload accurately. Provide one clinic-aware frontend configuration interface for the form and workflow implementers.

## Owned files and boundaries

- `ModuleConfigPage.tsx` and extracted editor components/styles.
- `clinicConfigApi.ts`, configuration types in `types/index.ts`, and `useClinicModuleConfig.ts` or its replacement provider.
- `App.tsx`, `navigationConfig.ts`, and shared frontend access helpers for agreed configuration/station restrictions.
- Editor/provider tests and admin access to configuration change history.

Person 1 owns API/schema/migration decisions. Person 3 owns field controls inside live patient/consultation/treatment forms. Person 4 owns queue UI and station policies. Apply requested shared navigation/provider changes yourself or explicitly transfer ownership; avoid simultaneous edits.

## Task checklist

### P2-01 — Fix immediately misleading states

- [ ] Reproduce section-only dirty-state failure and unsupported values appearing saved.
- [ ] Introduce separate loading/error/ready states and a functioning Retry action.
- [ ] Mark unsupported controls unavailable and describe the flow diagram as draft until saved and supported.
- [ ] Align developer route/action availability with the agreed read-only or denied policy.

### P2-02 — Implement the typed client and provider

- [ ] Consume Person 1's stable schema/response contract; remove permissive configuration `any`/open-key escapes.
- [ ] Publish a shared interface for effective field rules, sections, station capabilities, loading/error state, clinic ID, and revision.
- [ ] Key caches by clinic; clear on logout/clinic switch and refresh/invalidate after saves.
- [ ] Define behavior for stale sessions and mid-form updates with Persons 3/4.
- [ ] Preserve baseline required validation when configuration cannot load; do not turn all fields optional.
- [ ] Provide fixture-based examples so Persons 3/4 can integrate before the live API is ready.

### P2-03 — Repair editor mapping and state

- [ ] Render sections using stable IDs and explicit storage mappings, never display titles.
- [ ] Use normalized draft and saved baseline objects covering modules, sections, and all editable fields.
- [ ] Ensure each section-only edit enables Save and Reset.
- [ ] Reset to the last saved state; make fetching newer server state a deliberate action.
- [ ] Synchronize all draft/baseline state after successful saves, or preserve later local edits if editing during save is allowed.
- [ ] Show field-addressable validation errors; retain drafts on network errors and revision conflicts.
- [ ] Offer clear reload/compare behavior for conflicts without silently overwriting the draft.
- [ ] Guard navigation when changes are unsaved and prevent duplicate submissions.
- [ ] Expose configuration history through the authorized audit path agreed with Person 1.

### P2-04 — Improve accessibility and narrow layouts

- [ ] Label switches/selects and show visible keyboard focus.
- [ ] Separate accordion actions from section switches; implement expansion state and keyboard behavior correctly.
- [ ] Consolidate repeated card rendering after behavior is covered by tests.
- [ ] Verify 360/768/1280 CSS-pixel layouts, long labels, and 200% zoom.
- [ ] Ensure error/success/conflict feedback is accessible and meaningful.

### P2-05 — Integrate and verify

- [ ] Replace fixture-only responses with the real API and verify save/reload for every supported section and representative fields.
- [ ] Apply Person 4's agreed route/navigation capability restrictions without weakening role checks.
- [ ] Run editor/provider tests, frontend type/build checks, keyboard checks, and accessibility checks.
- [ ] Give Person 4 test results and instructions for independent browser verification.

## Can start now / must wait

Start editor failure-state, dirty-state, accessibility, and test preparation immediately. Final section mappings, typed payloads, revisions, and capabilities require Person 1's contract. Do not enable station controls solely because their values persist; activation also requires Person 4's workflow implementation and verification.

## Acceptance criteria

- [ ] AC-04, AC-09–11, AC-18, and AC-20 pass; UI portions of AC-07/AC-12 are covered.
- [ ] Section-only edits save/reset correctly and persist after a full reload.
- [ ] A successful save leaves no unsupported local values or incorrect dirty marker.
- [ ] Failure/conflict handling retains drafts and offers recovery.
- [ ] Read-only users cannot initiate writes; controls have clear accessible names and keyboard focus.
- [ ] Persons 3/4 use one provider rather than independent configuration caches.
- [ ] The editor only promises behavior that has an approved, verified live implementation.

## Review and delivery

Person 1 reviews request/response and capability handling. Person 4 reviews real browser behavior, keyboard access, and narrow layouts. Deliver the provider contract early to unblock consumer integration, then deliver editor behavior in small reviewed changes.

## Detailed execution sequence

| Step | Implementation detail | Output / dependency gate |
| --- | --- | --- |
| 1. Reproduce | Capture section-only dirty failure, reload resets, and unsupported-field success; separate confirmed behavior from layout risks | Editor regression scenarios and baseline screenshots |
| 2. Model state | Build a typed saved baseline and draft from Person 1's normalized schema; define equality for all editable values | One draft/save/reset model, stable section IDs |
| 3. Shared access | Implement clinic-keyed provider with revision, capability, loading/error, and invalidation behavior | Interface/fixtures for Persons 3/4 before their final integration |
| 4. Editor controls | Render supported catalog metadata; lock essential/unsupported controls; remove title-based persistence | Every enabled control maps to an approved writable value |
| 5. Save lifecycle | Validate draft, serialize writable fields, apply revision, handle success/422/conflict/transport error | No false success, lost draft, or stale dirty state |
| 6. Interactions | Reset, Retry, leaving-with-unsaved-changes, disabled inputs or controlled in-flight edits | Predictable action behavior with accessible feedback |
| 7. Accessibility/layout | Label controls, separate switches from accordion actions, restore focus, add responsive rules | Keyboard and narrow-width usability |
| 8. Integration | Connect real API/provider consumers, audit history, shared navigation capabilities; test below | Build results, manual evidence, reviewed screenshots |

Use tests to establish save/reset semantics before extracting shared rendering components. A reusable component that retains the incorrect state model does not resolve the original defect.

## Manual testing instructions

Use the accounts, RF1–RF3 fields, fresh revisions, network-failure steps, and evidence template in [shared setup](manual_testing_setup.md). Start at `/setup/modules` with A-Admin-1 unless a case specifies another role. The expected results below are post-implementation acceptance criteria, not claims about the current page.

### P2-M01 — Initial load and supported catalog

**Covers:** AC-07; MC-02–04/12.

1. Load the page with Network open; compare its configuration GET with visible station/section/field controls.
2. Expand every section, note all supported controls, and compare defaults with Person 1's catalog.
3. Inspect locked, derived, deprecated, and unsupported entries; inspect the flow diagram before any edit.

**Expected:** Values agree with the authoritative response; absent keys are not falsely shown as saved Optional values. Unavailable entries clearly explain their status and cannot be changed. The diagram identifies draft versus saved state accurately.

**Evidence:** Catalog-to-screen checklist and representative screenshots. No state change is needed.

### P2-M02 — Section-only save and reset

**Covers:** AC-09; MC-01/02.

1. Toggle exactly one supported optional section and change nothing else.
2. Confirm Save and Reset become available; click Reset and check the baseline returns without an unintended PUT.
3. Toggle again, save, inspect the exact section key in the PUT, then reload the page.
4. Repeat independently for every supported section, including sections whose display titles differ from their IDs.

**Expected:** Each section-only edit is detected; Reset clears it; Save persists it after reload with no unrelated section change. The success baseline is clean.

**Evidence:** Per-section table of ID, reset result, submitted value, and reload value. Restore each section with a new valid save.

### P2-M03 — Field-only and mixed saves

**Covers:** AC-07; MC-04.

1. Change only RF1 to another allowed rule, save, and reload.
2. Change RF1 plus a supported section; save and inspect the response.
3. Repeat RF2/RF3, and iterate all supported field controls for serialization/persistence; use allowed values only.
4. Restore the baseline and confirm no unwanted fields/stations changed.

**Expected:** Submitted, returned, and displayed values agree. No UI-only key is silently discarded; Save becomes inactive once the returned baseline is accepted.

**Evidence:** Key-level coverage table and sanitized PUT/GET pairs. Live behavior is checked separately by Person 3.

### P2-M04 — Initial load fails, then Retry succeeds

**Covers:** AC-10; MC-12.

1. Block the configuration request using the shared procedure and reload the page.
2. Inspect the visible error and available actions; attempt keyboard navigation.
3. Unblock the request and select Retry.

**Expected:** An explicit error replaces the ready editor; enabled-looking unsaved defaults are not presented as real configuration. Retry loads the actual values and the page becomes usable. No PUT occurs during recovery.

**Evidence:** Error and recovered screenshots plus Network statuses. Remove request blocking afterward.

### P2-M05 — Save fails without losing the draft

**Covers:** AC-10; MC-12.

1. Load normally, change RF1 and a supported section, and record the draft.
2. Set the browser offline and select Save.
3. Restore connectivity; inspect the retained draft, then retry once with the proper current revision.
4. Reload to verify persistence.

**Expected:** Failure is clearly reported; no success modal/history entry is fabricated; draft values remain available. Retry succeeds once and reload confirms them.

**Evidence:** Draft before/after failure, failure/success responses, final persisted values. Restore baseline and normal network settings.

### P2-M06 — Field validation and conflict recovery

**Covers:** AC-08/12; MC-10/12.

1. Use a controlled 422 response fixture for a named config field, or submit an invalid supported combination if the editor permits constructing one.
2. Verify the field error and summary; correct the issue and save.
3. Separately open two independent admin sessions at the same revision. Save a change in A; attempt a different draft from B without reloading.
4. Use B's reload/compare/reconcile action and retry only after reviewing the newer values.

**Expected:** Errors point to the right controls and retain the draft. Stale save shows the declared conflict UX, not success; the winner's changes remain intact. Explicit reconciliation uses the latest revision.

**Evidence:** 422 mapping, both revisions/responses, conflict screenshot, final values. Label injected responses as simulations rather than backend validation proof.

### P2-M07 — Slow save and duplicate clicks

**Covers:** AC-11; MC-12.

1. Apply a verified slow-response fixture/throttle, edit RF1, and select Save.
2. While PUT is demonstrably pending, attempt a second save, a section toggle, RF2 change, and Reset.
3. Wait for completion and inspect the final draft/baseline and network request count.

**Expected:** Either all editing is disabled during saving, or later edits remain explicitly unsaved; an earlier response never overwrites them. Duplicate clicks do not create duplicate writes/events. Reset follows the chosen pending-request policy.

**Evidence:** Pending-request timing, attempted controls, final values and request/event count. Remove throttling. If no overlap occurred, rerun rather than mark Pass.

### P2-M08 — Leaving with unsaved changes

**Covers:** MC-12.

1. Change one section without saving, then follow the dashboard/menu link.
2. Choose to stay; confirm the draft remains. Repeat and choose to leave/discard.
3. Reopen the editor, make an edit, and test browser back, refresh, and close-tab warning behavior supported by the selected browser.
4. Save or Reset, then navigate again.

**Expected:** In-app navigation protects the draft; intentional discard leaves the saved configuration unchanged. Browser unload protection behaves as documented. A clean page does not show an unnecessary unsaved warning.

**Evidence:** Navigation outcome table and revision comparison. Record browser-specific limitations explicitly.

### P2-M09 — Developer and staff access

**Covers:** AC-04; MC-09.

1. Sign in separately as developer and ordinary staff; inspect navigation and directly open `/setup/modules`.
2. Try to reach edit/save actions with pointer and keyboard.
3. As admin, confirm normal edit capability; inspect history access under each role.

**Expected:** Route/menu/actions follow the declared role policy. Read-only access is visibly read-only; denied roles cannot reach editable controls. Server enforcement is verified by Person 1, not inferred from hidden buttons.

**Evidence:** Role/route/action table and screenshots, with no credentials.

### P2-M10 — Keyboard and accessible names

**Covers:** AC-20; MC-13.

1. Use only Tab/Shift+Tab, Enter, Space, and arrow keys to open sections, toggle a switch, change a selector, save, and dismiss feedback.
2. Check that the switch does not unexpectedly expand its parent accordion and Space does not scroll while activating it.
3. Inspect accessible names/states in the browser accessibility tree; use a screen reader available to the team to confirm name, role, checked/expanded state, errors, and success feedback.
4. Repeat after a validation failure and dialog close to inspect focus placement.

**Expected:** Every control is named, focus is visible and logical, interactive controls are not nested incorrectly, and dialogs/errors remain usable. If no screen reader is available, record that portion Not run rather than equating an automated scan with manual verification.

**Evidence:** Keyboard checklist, scanner output if used, reader/browser details, and focus screenshots.

### P2-M11 — Narrow widths and zoom

**Covers:** AC-20; MC-14.

1. Test 360, 768, and 1280 CSS-pixel widths; expand the longest section and inspect long labels/errors.
2. At each width, attempt selector changes, section toggles, Save, Reset, and feedback dismissal.
3. Test 200% browser zoom on a desktop viewport and a narrow app pane.

**Expected:** Controls remain visible and operable, text is readable, and no overlap/clipping or blocking horizontal overflow hides actions. Cards wrap rather than retaining an unusable fixed grid.

**Evidence:** Viewport/zoom-labelled screenshots and action outcomes. Reset zoom afterward.

### P2-M12 — Clinic cache and active-session refresh

**Covers:** AC-18; MC-05/12.

1. Give A and B different RF1 settings. Log in as A and open a supported form using the shared provider.
2. Log out, then log in as B in the same browser profile. Open the editor and form; use a supported clinic-switch feature too if one exists.
3. In another A session, save a change while the first A form is already open. Exercise the declared stale-open-form policy.
4. Block a provider fetch and confirm the consumer follows its documented failure policy.

**Expected:** No A values remain in B's state; logout/clinic change clears the appropriate cache. Same-clinic refresh follows the documented rule without silently destroying a form draft or weakening required validation.

**Evidence:** Clinic/revision/value table and update/failure UI. Do not simulate a clinic switch by manually changing user storage; test actual supported session transitions.

### P2-M13 — History reflects an actual successful save

**Covers:** AC-13; MC-11.

1. Save an approved rule change, open the authorized configuration history/activity view, and locate it by actor/time/revision.
2. Compare the displayed old/new values with the editor and API.
3. Cause a failed save and confirm it is not shown as a successful change.

**Expected:** An administrator can find the actual change and distinguish it from failed attempts. Only authorized clinic information appears; history does not invent a successful restore feature if none was implemented.

**Evidence:** Redacted event, saved values, and permitted/denied history access. Preserve audit records.

## Completion packet

Deliver P2-M01–M13 results, catalog/section coverage, viewport screenshots, keyboard/screen-reader notes, provider contract, and build/test output. Person 4 independently reruns the key section-only save and one real provider-to-form scenario. Record unexecuted accessibility or race tests as such.
