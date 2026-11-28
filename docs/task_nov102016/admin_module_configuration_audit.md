# Admin Module Configuration: comprehensive audit

**Date:** 10 November 2026, Asia/Manila  
**Baseline:** `96ec9341`  
**Scope:** Admin > Clinic Setup > Module Configuration (`/setup/modules`) and the code responsible for persistence, permissions, defaults, and downstream behavior.  
**Disposition:** Repair required before presenting these controls as authoritative live workflow settings.

## 1. Executive assessment

The page offers three station switches, 17 section switches, and 81 field-rule selectors. The backend supports one station switch, seven older section flags, and 41 field-rule keys. Only 17 field keys overlap. Only two visible section titles match the keys used to construct the save payload.

The problems extend beyond inconsistent naming. Section changes are excluded from dirty-state detection; unsupported values are silently discarded; default configurations differ between setup, seeding, and lazy creation; and the live forms and queue logic do not consume the saved workflow settings. A successful save therefore does not establish that the workflow or forms changed.

The highest-priority access issue is the fallback to the first clinic when the authenticated administrator has no clinic. This was reproduced with an isolated fixture. An administrator assigned to a valid clinic remained correctly scoped even when a different `clinic_id` was supplied in the request.

No critical-priority finding is asserted. Clinical behavior was reviewed as software behavior; this audit does not assess the medical correctness of treatment protocols.

## 2. Method and limits

- Inspected the admin page, API client, TypeScript contract, shared hook, routes, controller, request validation, service, model, migrations, setup service, seeder, and related tests.
- Traced configuration references across `frontend/src`, `backend/app`, `backend/routes`, `backend/database`, and `mobile/lib`.
- Examined representative live registration, consultation, treatment-card, and queue code to distinguish saved settings from actual runtime enforcement.
- Programmatically compared visible field/section definitions with backend defaults; the complete inventory is [here](field_inventory.md).
- Ran the existing configuration and setup feature tests and ten temporary diagnostic feature tests against SQLite `:memory:`. No live clinic database was queried or changed for this audit.
- Evaluated the page's actual `hasChanges` function in an isolated JavaScript context to reproduce section-only changes being missed.
- Did not perform authenticated browser interaction, screenshot review, assistive-technology testing, production deployment checks, or the complete application test/build suite. Visual overflow and some interaction risks are explicitly marked for browser verification.
- No repository or parent `AGENTS.md` was found in the inspected locations. No implementation changes are included.

Evidence classifications below: **runtime** = reproduced with isolated execution; **source** = established by inspected code; **risk** = plausible consequence needing the specified additional verification.

## 3. Current architecture and contract

| Layer | Current implementation | Evidence |
| --- | --- | --- |
| Navigation | Clinic Setup menu is admin-only; page route permits admin and developer | [navigationConfig.ts](../../frontend/src/shared/config/navigationConfig.ts), line 104; [App.tsx](../../frontend/src/App.tsx), line 100 |
| Editor | Local state for station flags, section flags keyed by display title, and field rules | [ModuleConfigPage.tsx](../../frontend/src/features/clinic-setup/pages/ModuleConfigPage.tsx), lines 233–348 |
| API client | GET returns config directly; PUT returns `response.data.config`; update type permits arbitrary keys | [clinicConfigApi.ts](../../frontend/src/services/clinicConfigApi.ts), lines 8–22 |
| API access | Both routes use `auth:sanctum` and `active.user`; PUT authorization separately requires `isAdmin()` | [api.php](../../backend/routes/api.php), lines 168–211; [UpdateClinicModuleConfigRequest.php](../../backend/app/Http/Requests/Clinic/UpdateClinicModuleConfigRequest.php), lines 14–54 |
| Controller | Uses authenticated user's clinic and only validated request data | [ClinicModuleConfigController.php](../../backend/app/Http/Controllers/Admin/ClinicModuleConfigController.php), lines 22–43 |
| Service | GET uses `firstOrCreate`; PUT uses `updateOrCreate`; both fall back to first clinic for null clinic ID | [ClinicModuleConfigService.php](../../backend/app/Services/Clinic/ClinicModuleConfigService.php), lines 78–110 |
| Storage | Unique clinic FK with cascade delete; nullable JSON rules; one station and seven non-null section booleans | [initial migration](../../backend/database/migrations/2026_07_30_000000_create_clinic_module_configs_table.php), lines 14–21; [section migration](../../backend/database/migrations/2026_09_05_163325_add_section_enabled_to_clinic_module_configs.php), lines 11–18 |
| Runtime helper | Hook offers visibility/required/triage helpers, but no application imports/callers were found | [useClinicModuleConfig.ts](../../frontend/src/hooks/useClinicModuleConfig.ts), lines 9–96 |

### Payload semantics

- `triage_module_enabled`: required boolean.
- Seven legacy section flags: optional in the request and nullable according to validation, despite non-null storage.
- `field_rules`: required array; all 41 backend keys are required with values `required`, `optional`, or `hidden`.
- `registration_module_enabled` and `treatment_module_enabled`: sent by the page but absent from backend validation, fillable properties, and database migrations.
- Extra field-rule keys are excluded from validated data by the installed Laravel validation behavior; this was verified through the endpoint. They are not automatically persisted just because `field_rules` is JSON.
- GET returns the stored model without merging missing defaults or selecting a dedicated response resource. It creates a configuration when missing, so it also has a write side effect.
- `google_sso_*` fields share this model and have a real consumer in [GoogleStaffSsoService.php](../../backend/app/Services/Auth/GoogleStaffSsoService.php), lines 72–90. They are not configurable through this page/request. The absence of workflow consumers must not be generalized to SSO.
- Staff assignments and Predefined Templates are separate features. The template page explicitly describes its changes as preview-only ([PredefinedTemplatesPage.tsx](../../frontend/src/features/clinic-setup/pages/PredefinedTemplatesPage.tsx), line 476); this is not an additional live-configuration defect.

## 4. Findings register

Priority: **P1** = repair before relying on this feature operationally; **P2** = correctness, reliability, or usability repair; **P3** = polish requiring verification.

| ID | Priority | Finding | Evidence class |
| --- | --- | --- | --- |
| MC-01 | P1 | Section-only edits cannot be saved or reset | Source + isolated JavaScript |
| MC-02 | P1 | 15 of 17 section controls do not map to persisted settings | Source |
| MC-03 | P1 | Registration and Treatment switches silently fail to persist | Runtime |
| MC-04 | P1 | Field catalog mismatch silently drops 64 visible controls | Runtime + source inventory |
| MC-05 | P1 | Saved workflow and field settings are not enforced by live consumers | Source |
| MC-06 | P1 | Setup/seeding produce incompatible rules and can overwrite customization | Runtime + source |
| MC-07 | P1 | Missing clinic association falls back to another clinic | Runtime |
| MC-08 | P2 | Null section values pass validation and cause a server error | Runtime |
| MC-09 | P2 | Developer can enter the editor but cannot save | Runtime + source |
| MC-10 | P2 | Stale saves overwrite newer changes without conflict detection | Runtime |
| MC-11 | P2 | Configuration saves have no audit event/history | Runtime + source |
| MC-12 | P2 | Editor recovery and save lifecycle are incomplete | Source + risk |
| MC-13 | P2 | Controls lack accessible naming and reliable keyboard structure | Source + risk |
| MC-14 | P3 | Fixed grids need responsive verification | Source + risk |
| MC-15 | P2 | Tests and existing guide do not cover actual page-to-workflow behavior | Source + test results |

### MC-01 — Section edits are absent from change detection

**Evidence:** `ModuleConfigPage.tsx:340–348` compares three station flags and field rules, but never `sectionEnabled`. Save and Reset both depend on `hasChanges()` at lines 883 and 894.

**Reproduction:** Load a configuration, change only Socioeconomic Information from Enabled to Disabled. Isolated evaluation of the actual function returns `false`. Neither action becomes available. Changing a field as well can incidentally allow a correctly mapped section flag to be saved.

**Impact / fix:** An ordinary primary interaction fails. Compare the complete normalized editable state against its saved baseline, including sections. Add separate tests for section-only Save and Reset.

### MC-02 — Section labels are being used as incompatible identifiers

**Evidence:** Visible section definitions at `ModuleConfigPage.tsx:25–231` differ from the seven state keys at lines 253–260 and payload mapping at lines 305–311. Toggle handlers write `[section.title]` at lines 668, 746, and 824.

**Reproduction:** Turn off Residential Address, then change a field to enable Save. The visible switch writes `sectionEnabled['Residential Address']`, but the payload reads `sectionEnabled['Address Information']`. Reload restores the visible section to its default enabled presentation. The same disconnect affects all displayed sections except Socioeconomic Information and Government Programs.

**Impact / fix:** Fifteen section toggles are local presentation state only. Introduce stable section IDs with explicit storage mappings; use the [section inventory](field_inventory.md#section-persistence-mapping) to avoid conflating an old group flag with a new subsection.

### MC-03 — Two station switches are unsupported

**Evidence:** The page reads missing flags with `?? true` at lines 275/277 and sends them at lines 302/304. Neither flag is supported by the request/model/schema. A complete valid PUT with both flags set to false returned 200 with neither key present in `config`.

**Impact:** The page announces success, although both switches reset to Enabled on reload. Only `setConfig(updatedConfig)` runs after save, so local false values remain different from the response baseline and Save stays enabled. Isolated execution reproduced this dirty-state mismatch. Text claiming disabled registration blocks walk-ins or disabled treatment blocks vaccination is not backed by these flags.

**Fix:** Define supported station behavior before persisting new flags. Until implemented end to end, mark unavailable controls clearly or remove them. Do not interpret persistence alone as workflow enforcement.

### MC-04 — The visible and validated field contracts disagree

**Evidence:** 81 visible controls versus 41 backend keys; 17 overlap, 64 are UI-only, 24 are backend-only. See [complete inventory](field_inventory.md). `FieldRules` has an open string index at `frontend/src/types/index.ts:221`, and the API client and editor use permissive types/casts.

**Reproduction:** Send all 41 valid rules plus `first_name: 'hidden'`. PUT succeeds, but `first_name` is absent from the returned/stored rules. A deliberately unknown key with an invalid value is likewise discarded rather than reported. Backend-only rules loaded by GET remain in editor state and are resubmitted, even though the administrator cannot see or edit them here.

**Impact:** Most field selectors cannot affect saved configuration. Missing keys display as Optional, even when the live form requires them (for example first name). The editor also stays dirty after an unsupported field change because its local rules are not normalized from the response.

**Fix:** Establish one explicit field catalog with allowed rules, form ownership, defaults, dependencies, and payload aliases. Reject unsupported keys clearly, or implement them fully. Preserve known legacy values during migration rather than blindly deleting them.

### MC-05 — Live forms and workflow ignore these settings

**Evidence:** The hook exists but has no import/call sites in `frontend/src`. Configuration references in backend application code are limited to configuration/setup/model and SSO paths, not clinical field validation or queue routing. `QueueService.php:271–274` selects queues by visit type without reading module configuration.

Representative contradictions:

- `PatientInfoSection.tsx:143–185` renders blood type and spouse name using fixed presentation and marital-status conditions, without the configuration hook.
- `AddPatientModal.tsx:238–280` requires identity and contact values independently of the page's rule selectors.
- `StorePatientRequest.php:44–51` treats blood type, spouse name, and address details as nullable regardless of saved rules.
- `StoreTreatmentRecordRequest.php` and `StoreTagoloanTreatmentCardRequest.php` retain their own rules and do not resolve module configuration.
- No module-configuration consumer was found in `mobile/lib`.

**Impact:** Required/Hidden labels do not govern the live forms. A saved `triage_module_enabled=false` does not implement the displayed promise of skipping triage. This is an absence of integration, not evidence that existing clinical safeguards have already been bypassed.

**Fix:** Define the product scope, then connect supported policies to UI, server validation, and applicable workflow entry points. Keep existing identity, clinical, inventory, and authorization safeguards authoritative. Never wire arbitrary field hiding directly into removal of essential validation.

### MC-06 — Defaults and data lifecycle are inconsistent

**Evidence:** `ClinicModuleConfigService.php:15–69` defines 41 rules, while `ClinicSetupService.php:82–92` and `DefaultClinicConfigSeeder.php:19–31` create six legacy rules. GET only supplies defaults for a missing row, not a partial existing one. The historical `2026_07_30_235314` migration replaces all rules in both directions instead of merging.

**Reproduction:** Seed through `DefaultClinicConfigSeeder`, GET the configuration (six rules), modify the triage flag, and PUT the result: 422 with missing required field-rule errors. Rerunning that seeder over a customized row restores triage=true and replaces the rules with six legacy entries; this was reproduced.

**Impact:** Newly initialized or seeded clinics can open the editor but cannot save a normal round trip. Reseeding destroys customization. The database also permits `field_rules=null`, whereas the editor dereferences it without normalization; a null/partial configuration is an additional source-established compatibility risk, not a browser-reproduced crash.

**Fix:** Centralize initialization, merge missing defaults while preserving explicit choices, backfill safely, and make default seeding non-destructive. Add a new corrective migration; do not rewrite historical migrations already applied elsewhere.

### MC-07 — Null clinic association is resolved to the first clinic

**Evidence:** Both service methods use `$clinicId ?? Clinic::first()?->id` at lines 80/105. The current request checks admin role but does not require a clinic.

**Reproduction:** In an isolated fixture, set an active admin's `clinic_id` to null and PUT a valid configuration. The response is 200 and identifies the first clinic. This is conditional on a clinic-less authenticated admin existing; no claim is made about such accounts in deployed data.

**Impact / fix:** Missing tenant context can mutate an unintended clinic. Reject missing clinic context with a controlled response. If cross-clinic administration is a real requirement, use explicit, authorized clinic selection rather than an implicit fallback. Preserve the positive behavior that a valid clinic-scoped user cannot override the target using request `clinic_id`.

### MC-08 — Nullable validation contradicts storage

**Evidence:** Seven section rules are `nullable|boolean` (`UpdateClinicModuleConfigRequest.php:43–49`), while their migration columns are non-null booleans.

**Reproduction:** Submit a complete valid payload with `socioeconomic_section_enabled: null`. The endpoint returns HTTP 500 on SQLite because null reaches the database constraint.

**Fix:** Specify omission semantics and use non-null boolean validation when a section key is present. Test omitted, null, false, true, and malformed values. The intended result for null is a controlled validation response, not a database error; verify on the deployed database engine as well.

### MC-09 — Developer page access differs from save permission

**Evidence:** `App.tsx:100` permits admin/developer. Request authorization calls `User::isAdmin()`, which only accepts role `admin` (`User.php:114–116`). A developer fixture could GET but received 403 on PUT. The navigation menu is admin-only, so this chiefly affects direct route access.

**Fix:** Make developer access intentionally read-only or deny editor entry, unless a separate authorized capability is designed. Use the same declared capability for navigation, route access, and action availability; do not broaden write access accidentally.

### MC-10 — Concurrent editing loses changes

**Evidence:** Full `field_rules` snapshots are replaced by `updateOrCreate` with no version comparison. Although `updated_at` is returned, it is not used as a precondition.

**Reproduction:** Two clients begin with blood type Optional. Client A saves Required. Client B saves its old snapshot with only spouse name Hidden. The endpoint succeeds and blood type becomes Optional again. Reproduced by sequential stale payloads.

**Fix:** Add an atomic revision/precondition check, return a conflict response for stale writes, and preserve the losing client's draft for comparison. A transaction without a revision check does not by itself prevent this issue.

### MC-11 — There is no configuration change audit trail

**Evidence:** The controller/service/model do not emit an audit event; `AuditMiddleware` is not attached by the inspected bootstrap/routes. A configuration PUT left `AuditLog::count()` unchanged in the diagnostic fixture.

**Impact / fix:** Administrators cannot establish who changed configuration or inspect before/after values. Persist a clinic-scoped event containing actor, version, changed keys, and old/new values atomically with the save. Limit contents to configuration, not patient data or credentials. Failed/conflicting saves must not create a successful-change event.

### MC-12 — Failure recovery and state synchronization are incomplete

**Evidence:** `loadConfig` catches errors but exits loading into the editor (`ModuleConfigPage.tsx:269–292,460–484`); Save/Reset remain disabled if `config` is null. There is no dedicated retry. `handleSave` updates only the baseline config, not all editable state (lines 315–316). Controls remain editable during saving; only action buttons disable. No navigation/unload guard is present.

**Consequences:** Initial-load failure displays enabled-looking defaults that were never loaded; unsupported/discarded edits remain marked dirty after success; users can leave with unsaved edits; edits made during a request need explicit handling. The last two are source-based interaction risks pending browser verification.

**Fix:** Separate loading/error/ready states, provide Retry, normalize successful responses, protect newer local edits from an earlier response, display field-level validation errors, and guard navigation with unsaved changes. Label the flow diagram as a draft until saved and operationally supported.

### MC-13 — Accessibility is incomplete

**Evidence:** Station/section switches have `role="switch"` and `aria-checked` but no accessible label; the visual title is not linked. Switches suppress focus outlines. Section switches are focusable interactive descendants of accordion buttons. Selects are visually adjacent to names but lack associated labels. Accordion buttons lack `aria-expanded`/`aria-controls`. Keyboard handlers do not prevent Space's default scrolling (`ModuleConfigPage.tsx:547–562,654–690`, repeated for other forms).

**Fix / verification:** Use labelled native controls or established accessible components; separate accordion actions from switches; restore visible focus and expansion semantics; test keyboard-only navigation and an accessibility scanner. Screen-reader behavior has not been measured in this audit.

### MC-14 — Fixed desktop grids need responsive testing

**Evidence:** Station cards use inline `repeat(3, 1fr)` at line 486; section cards use `repeat(2, 1fr)` at lines 648/726/804. Field rows contain fixed/minimum widths and have no local narrow-layout alternative.

**Risk / fix:** Long labels and controls may overflow at mobile widths, zoom, or in a narrow app pane. Verify at 360, 768, and 1280 CSS pixels and 200% zoom; introduce responsive columns and wrapping based on measured failures. No observed screenshot overflow is claimed.

### MC-15 — Existing verification gives incomplete assurance

**Evidence:** Six configuration tests exercise the 41-key API contract, not the 81-control page or downstream behavior. Seven setup tests do not cover setup-to-editor save compatibility. No module-configuration browser test was found in `frontend/tests`.

The [Cycle 8 guide](../ui-test-guides/cycle_8_clinic_module_config_ui_guide_test.md) names `/admin/settings` or `/setup/module-config` as page paths rather than `/setup/modules`, describes 41 configurable fields, and assumes station/forms already respect configuration. Its historical TypeScript/Flutter and assertion-count claims are not fresh audit results.

**Fix:** Add contract, lifecycle, consumer, permission, and browser regression tests before declaring the feature ready; update the guide with the actual route and verified expectations.

## 5. Verified strengths

- Anonymous GET/PUT requests are rejected and non-admin writes are rejected by the existing configuration tests.
- Valid supported updates persist; malformed known rule values and missing required rules return validation errors.
- A non-null authenticated clinic ID controls the target; a submitted foreign `clinic_id` is ignored (diagnostic test).
- The schema enforces one configuration per clinic and referential integrity.
- The service/request/controller separation offers a clear place to centralize the contract.
- Existing treatment requests have independent safeguards that should be preserved during integration.

## 6. Execution record

All database tests used `APP_ENV=testing`, `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, empty `DB_URL`, and array-based cache/session/mail. No cached application configuration was present. Initial restricted runs reported the PHPUnit bootstrap unreadable despite PHP being able to load it; rerunning with the approved execution context succeeded without changing application files.

```powershell
# From backend/, with the isolated environment above:
php vendor/bin/phpunit tests/Feature/Clinic/ClinicModuleConfigCharacterizationTest.php tests/Feature/Clinic/ClinicSetupCharacterizationTest.php --do-not-cache-result
```

**Result:** PHP 8.2.12, PHPUnit 11.5.55; **13 tests, 74 assertions, passed**.

Ten temporary `ModuleConfigAuditProbeTest` checks also passed, with **29 assertions**:

| Probe | Observed result |
| --- | --- |
| Unsupported station flags false | 200; both keys absent from response |
| UI-only field + arbitrary invalid unknown field | 200; both extra keys dropped |
| Six-rule seeded configuration round trip | GET has six rules; PUT returns 422 |
| Null socioeconomic flag | 500 |
| Admin with null clinic | 200; first clinic modified |
| Developer GET/PUT | 200 / 403 |
| Audit count after successful PUT | Unchanged |
| Newer save followed by stale snapshot | Newer field change overwritten |
| Foreign request clinic ID from scoped admin | Current user's clinic used; other clinic untouched |
| Reseed customized configuration | Triage enabled again; rules replaced with six defaults |

The temporary probe source was removed after execution. The steps above and individual findings document the fixtures/payload changes needed to recreate these observations; these probes are not permanent regression coverage.

The isolated JavaScript check returned `sectionOnlyChangeEnablesSave: false` and `unsupportedRegistrationRemainsDirtyAfterSuccessfulSave: true`. It exercised extracted logic, not a browser rendering.

## 7. Recommended order

First contain misleading controls and remove implicit clinic fallback; then establish one versioned contract and repair default data. Fix editor mapping/state before connecting supported rules to live consumers. Add concurrency protection, audit history, and end-to-end verification before rollout. The detailed, dependency-ordered work is in [implementation_plan.md](implementation_plan.md).
