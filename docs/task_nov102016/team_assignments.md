# Four-person implementation assignments

**Prepared:** 10 November 2026  
**Status:** Ready to assign; no implementation started. Replace Person 1–4 with team members' names.  
**Scope:** The existing [implementation plan](implementation_plan.md), including all 15 [audit findings](admin_module_configuration_audit.md).

## 1. Assignment overview

| Person | Main responsibility | Separate task brief | Main deliverable |
| --- | --- | --- | --- |
| 1 | Backend configuration, data migration, security, revisions, and audit events | [Person 1 tasks](person_1_backend_configuration.md) | Reliable versioned configuration API and safe legacy-data normalization |
| 2 | Admin editor, shared frontend configuration access, and accessibility | [Person 2 tasks](person_2_admin_editor.md) | Editor whose controls save correctly and accurately describe live support |
| 3 | Form 1/2/3 field behavior and matching server validation | [Person 3 tasks](person_3_form_integration.md) | Consistent Required/Optional/Hidden behavior across supported live forms |
| 4 | Station capabilities, queue transitions, and end-to-end release verification | [Person 4 tasks](person_4_workflow_and_verification.md) | Working station behavior without stranded queues, plus integrated verification evidence |

This split gives each person implementation work. Each person writes and runs tests for their own changes. Person 4 coordinates final end-to-end evidence; they are not responsible for writing everyone else's tests. Persons 3 and 4 require full-stack familiarity.

Each linked person-specific document includes a staged execution plan and numbered manual acceptance tests with steps, expected results, and evidence requirements. Complete the [shared manual testing setup](manual_testing_setup.md) first. These instructions describe future acceptance testing; they are not additional tests already performed during the audit.

### Manual testing index

| Person | Manual cases | Main checks | Instructions |
| --- | --- | --- | --- |
| 1 | P1-M01–P1-M12 (12 cases) | Roles/clinics, payloads, setup/legacy data, revisions, audit, migration/recovery | [Backend manual tests](person_1_backend_configuration.md#manual-testing-instructions) |
| 2 | P2-M01–P2-M13 (13 cases) | Catalog, Save/Reset, failures, conflicts, keyboard/layout, cache, history | [Editor manual tests](person_2_admin_editor.md#manual-testing-instructions) |
| 3 | P3-M01–P3-M12 (12 cases) | Live field rules, conditions, aliases, create/edit/API enforcement, history/mobile/print | [Form manual tests](person_3_form_integration.md#manual-testing-instructions) |
| 4 | P4-M01–P4-M13 (13 cases) | End-to-end flow, all station combinations, active queues, role boundaries, side effects, release | [Workflow manual tests](person_4_workflow_and_verification.md#manual-testing-instructions) |

There are **50 numbered manual scenarios**. Several require repetition across every supported field, section, role, dataset, station combination, or entry point; the scenario count is not a limit on coverage. Run backend foundation cases first, editor/consumer cases after their dependencies are integrated, then Person 4's combined cases. Use the shared evidence template and reset procedure for each run.

## 2. Shared kickoff: agree before integrating

All four review the audit and field inventory together. Person 1 records the agreed contract in a new `configuration_contract.md` in this folder; Person 4 records workflow decisions in a new `workflow_decisions.md`. These are implementation deliverables, not files already supplied by this assignment.

- Person 1 proposes API shape, stable field/section IDs, normalization, revisions, validation errors, and clinic permissions.
- Person 2 confirms the schema can drive the editor and a shared frontend provider.
- Person 3 classifies fields as configurable, locked, derived, legacy alias, or unsupported; documents input/API mappings and conditional fields.
- Person 4 specifies registration/triage/treatment capabilities and behavior for already queued patients and appointments.
- Resolve clinical/workflow questions with the clinic workflow owner. Keep an unapproved behavior unavailable; do not invent triage bypass or relax essential validation.
- Declare developer access, mobile scope, print/history behavior, and compatibility with existing clients.

**Kickoff exit:** One reviewed contract with example GET/PUT, invalid-input and stale-save responses; a complete field classification; and an explicit supported-station policy. Publish shared fixtures so people can develop against the same examples.

## 3. Work sequence and handoffs

| Stage | Person 1 | Person 2 | Person 3 | Person 4 | Exit condition |
| --- | --- | --- | --- | --- | --- |
| A — Start in parallel | Reproduce API defects; repair missing-clinic/null handling; propose contract | Reproduce dirty-state issue; repair loading/error/keyboard behavior; prepare editor against fixtures | Trace create/edit/form aliases and baseline validation; add consumer regression fixtures | Trace station/queue entry points; prepare workflow cases and browser test structure | Contract and workflow decisions reviewed |
| B — Foundation | Registry, normalized API, safe migration, setup/seeder repair, revision/audit support | Typed client/provider and schema-driven editor; save/reset/conflict handling | Rule composer and form integration against agreed schema | Capability policy and queue transitions against agreed schema | Foundation tests pass; shared APIs are stable |
| C — Integration | Resolve API and migration defects found by consumers | Connect editor to real API; invalidate provider on saves; audit/conflict UI | Verify actual saved rules in Form 1/2/3 and server requests | Connect capabilities to actual entry points; verify editor -> workflow behavior | Supported controls persist and affect their documented consumers |
| D — Release evidence | Validate migration/recovery and server test results | Type/build, accessibility, responsive and editor browser checks | Run clinical form/history regression checks | Run integrated matrix and compile findings/release checklist | All release gates satisfied |

Persons 2–4 can start immediately on analysis, fixtures, and isolated repairs. Final integration depends on Person 1's contract; live activation depends on reviewed workflow decisions and combined tests. Merge compatible backend support before the frontend sends new keys. Do not deploy partially connected controls as live functionality.

Recommended small review units: contract/fixtures; configuration safety; schema/migration; editor/provider; form consumers; station consumers; revision/audit integration; release verification. Backend revision/audit implementation stays with Person 1 even when delivered in a later review unit.

## 4. File ownership and overlap rules

| Area | Primary writer | Coordination rule |
| --- | --- | --- |
| Configuration controller/request/service/model, registry/resolver, configuration migrations, setup/default seeder | Person 1 | Other people request contract changes; do not create competing defaults or migrations |
| `backend/routes/api.php` | Person 1 | Person 4 supplies required capability-route edits for Person 1 to apply |
| Admin `ModuleConfigPage.tsx` and editor components/styles | Person 2 | Persons 3/4 supply supported-field/station metadata, not parallel editor changes |
| `clinicConfigApi.ts`, configuration types in `types/index.ts`, `useClinicModuleConfig.ts` or replacement provider | Person 2 | Person 1 supplies API schema; Persons 3/4 consume the shared interface |
| `frontend/src/App.tsx`, `navigationConfig.ts`, shared frontend access helpers | Person 2 | Person 4 specifies station restrictions; Person 2 applies shared navigation/route edits |
| Patient create/edit, consultation and vaccination field components; clinical field requests; field-rule composer | Person 3 | Person 4 proposes capability guards in shared request/form files to Person 3 |
| Queue/check-in services/controllers, new station capability policy, queue UI | Person 4 | Person 3 requests patient-service persistence changes where files overlap |
| `PatientService.php`, `TreatmentRecordService.php`, `TagoloanTreatmentCardService.php`, `QueueService.php` | Person 4 | Person 3 supplies narrowly scoped persistence/field changes; Person 4 applies or explicitly transfers ownership |
| Configuration/setup/API regression test files | Person 1 | Person 4 reviews cross-tenant and lifecycle cases |
| Editor/provider tests | Person 2 | Person 4 owns combined browser scenarios, not duplicate editor tests |
| Clinical field/create/edit regression tests | Person 3 | Preserve pre-existing clinical/stock safeguards |
| Workflow tests, combined module-config browser suite, final verification docs | Person 4 | Test helpers/config shared with other suites require coordination |

These are ownership defaults, not permission to rewrite whole files. Before a shared-file edit, agree the exact change and one writer; handoffs include the commit and affected symbols. An explicit temporary ownership transfer is preferable to two people editing the same service simultaneously.

Use separate branches if the team uses Git branches, for example `codex/module-config-backend`, `codex/module-config-editor`, `codex/module-config-forms`, and `codex/module-config-workflow`. These branches have not been created by this documentation task.

## 5. Audit finding ownership

| Finding | Accountable person | Supporting person(s) |
| --- | --- | --- |
| MC-01 Section-only edits | 2 | 4 verifies browser behavior |
| MC-02 Section mapping | 2 | 1 defines stable persisted IDs |
| MC-03 Unsupported station switches | 4 | 1 storage/validation; 2 editor availability |
| MC-04 Field catalog mismatch | 1 | 2 typed editor; 3 field classification and consumers |
| MC-05 Missing live consumers | 3 for fields; 4 for stations | 2 provider; 1 normalized contract |
| MC-06 Inconsistent defaults | 1 | 3 reviews aliases; 4 verifies setup round trip |
| MC-07 Missing clinic fallback | 1 | 4 reviews isolation tests |
| MC-08 Null flags cause 500 | 1 | 2 presents validation errors |
| MC-09 Developer access mismatch | 2 | 1 server permissions |
| MC-10 Lost concurrent changes | 1 | 2 conflict experience; 4 integrated check |
| MC-11 Missing audit history | 1 | 2 admin access to history |
| MC-12 Editor lifecycle | 2 | 4 browser verification |
| MC-13 Accessibility | 2 | 4 independent verification |
| MC-14 Responsive layout | 2 | 4 independent verification |
| MC-15 Coverage/documentation gaps | 4 | Everyone supplies tests/evidence for owned changes |

## 6. Acceptance coverage ownership

IDs refer to the [implementation plan test matrix](implementation_plan.md#4-acceptance-test-matrix).

| Checks | Main writer | Required partner |
| --- | --- | --- |
| AC-01–03, AC-05–06, AC-08, AC-13 | Person 1 | Person 4 reviews integration evidence |
| AC-04, AC-09–11, AC-20 | Person 2 | Person 1 for permissions; Person 4 for independent browser checks |
| AC-07, AC-12 | Person 1 API tests + Person 2 editor tests | Person 4 combined browser tests |
| AC-14–16, AC-19 | Person 3 | Person 1 for registry rules; Person 2 for provider |
| AC-17 | Person 4 | Person 1 for station update validation; Person 3 for form entry points |
| AC-18 | Person 2 provider lifecycle tests | Persons 3/4 verify consumer behavior |
| AC-21 | Person 3 field/clinical regressions + Person 4 workflow/stock regressions | Both review the combined result |
| AC-22 | Person 3 verifies declared mobile/print/history scope | Person 4 records release evidence |

## 7. Team release gate

> **Release Gate Status (2026-11-13):** **HOLD — DO NOT RELEASE.** See [verification_results.md](verification_results.md) for the 3 open release blockers (`AC-21` 32 backend clinical failures, Playwright Chromium runner error, MySQL staging rehearsal pending).

- [ ] Every person completes the acceptance checklist in their separate task brief. *(Person 4 backend/station policy completed; browser & staging items open.)*
- [ ] Every released control has storage, correct validation, a supported consumer, and test evidence. *(Open: `bite_site` mapped to `treatment_section_enabled` instead of `triage_section_enabled`; live browser evidence pending.)*
- [ ] No unresolved P1 finding affects released behavior; unavailable behavior remains visibly unavailable. *(`MC-03`/`MC-05` resolved; `MC-04` has open Person 3 default-required clinical regressions.)*
- [ ] A newly initialized clinic and an upgraded legacy clinic both pass edit/save/reload and supported workflow checks. *(API-verified on SQLite `:memory:`; browser + MySQL staging pending.)*
- [x] No cross-clinic fallback, silent unknown-key loss, null-driven 500, or silent stale overwrite remains. *(Verified in `ClinicModuleConfigPerson1Test`, `ClinicModuleConfigCharacterizationTest`, and `StationWorkflowPolicyTest`.)*
- [ ] Hidden fields preserve history, and essential clinical/authorization/inventory safeguards still pass. *(`Form1IntegrationTest` and `StationWorkflowPolicyTest` pass, but full backend suite has 32 failures: 31 from `EffectiveFieldRuleComposer` required defaults + 1 `DualNurseWorkstationTest`.)*
- [ ] Migration/backfill and recovery are demonstrated on the intended database engine. *(SQLite `:memory:` verified; MySQL/MariaDB staging rehearsal pending; `MySqlConcurrencyTest` skipped on SQLite.)*
- [x] Person 4 publishes `verification_results.md` with commands, environment, results, open limitations, and finding-to-evidence links.
- [ ] Person 1 reviews backend/migration evidence, Person 2 reviews UI evidence, and Person 3 reviews field/clinical evidence before release.

Completion is measured by these outcomes, not by four branches being merged. This assignment package authorizes no deployment or changes to live clinic data on its own.
