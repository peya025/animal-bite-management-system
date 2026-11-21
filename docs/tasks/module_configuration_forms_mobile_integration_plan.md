# Module Configuration Integration with Existing Forms and Mobile Profiles

Date: 17 November 2026  
Status: Audit completed; Phases 1–4 implemented locally, Phases 5–6 pending.  
Scope: Laravel configuration/validation/persistence, existing React Forms 1–3, Flutter patient profile setup, consultation intake, and appointment integration.

## 1. Goal

Make the clinic's Module Configuration consistently control the applicable fields in existing web forms and mobile profile/intake screens. Required, optional, hidden, and section-disabled settings must agree across rendering, validation, submission, and persistence.

Reuse the current configuration service and form components. Do not build another configuration database or replace the existing clinical workflow. Mobile users provide patient-reported information; configuration must never allow them to enter a doctor's exposure category, diagnosis, or prescription.

## 2. Audit scope and limitations

This audit inspected application source, routes, migrations, existing test files, and the previous configuration contract. No application tests, live database inspection, or device sessions were run. Findings below describe source behavior; runtime verification belongs to the implementation phases.

Existing local inventory/vaccination changes were present before this audit. They were not edited. Coordinate changes to Form 3 with that work rather than overwriting it.

Repository task documentation is organized under `docs/tasks/`; this plan lives there. No commit, push, merge, or deployment is part of this task.

### Source evidence and findings

All paths below are relative to the repository root.

| ID | Finding | Evidence | Implication |
|---|---|---|---|
| A01 | A clinic-scoped, versioned configuration service already exists, with defaults, aliases, locked exposure category, revision checking, and atomic audit logging. | `backend/app/Services/Clinic/ClinicModuleConfigService.php` | Extend this source of truth. Preserve existing admin API behavior. |
| A02 | The older contract describes 41 fields; the current defaults also contain three fee fields. | Service above; `docs/task_nov102016/configuration_contract.md` | Derive the catalog from current code; update stale documentation and avoid hard-coded field counts. |
| A03 | Web integration is already partial and substantial. Registration sections, patient editing, consultation, and vaccination components use configuration helpers. | `frontend/src/hooks/useClinicModuleConfig.tsx`; `features/patients/components/AddPatientModal/`; `EditPatientModal.tsx`; `PatientEditModal.tsx`; `features/consultations/components/GeneralTreatmentForm.tsx`; `features/vaccinations/components/VaccinationRecordForm.tsx` | Fill coverage gaps instead of reimplementing all forms. Audit all edit entry points. |
| A04 | Backend web requests already call `EffectiveFieldRuleComposer`. | `backend/app/Services/Clinic/EffectiveFieldRuleComposer.php`; `Http/Requests/Clinical/{StorePatientRequest,UpdatePatientRequest,StoreTreatmentRecordRequest,StoreTagoloanTreatmentCardRequest}.php`; `Http/Requests/Vaccination/StoreVaccinationRecordRequest.php` | Reuse/refactor the composer. Mobile must not grow an unrelated rule engine. |
| A05 | Composer requiredness accounts for sections and some conditions, but ordinary visibility checks do not combine section state. It catches configuration failures and falls back to defaults. Some required fields use `sometimes`, including address handling. | `EffectiveFieldRuleComposer.php` | Define one effective-policy result and explicitly distinguish create, patch, and completion validation. Do not blindly copy the web composer into mobile. |
| A06 | Mobile profile setup serves new self profiles, dependents, and existing-profile edits. It uses fixed controls and builds a broad payload including null values and memberships. | `mobile/lib/views/profile_setup_view.dart`, especially `_submit` payload around lines 622–671; `mobile/lib/app/app_router.dart` | Integrate all three modes; hiding widgets alone is insufficient. |
| A07 | Mobile profile requests have fixed nullable rules for configurable demographic/address/program fields. | `backend/app/Http/Requests/Mobile/{StoreMobilePatientRequest,UpdateMobilePatientRequest}.php` | Admin-required fields can remain optional at the mobile API unless validation is connected. |
| A08 | Mobile profiles are linked to a `PatientAccount`; patient data and details are stored separately. Existing-chart matching and account relationships already exist. | `backend/app/Services/Mobile/MobilePatientProfileService.php` | Preserve linking, ownership checks, self/dependent uniqueness, and cache invalidation. Account settings are not patient demographics. |
| A09 | Profile updates unconditionally reconstruct and synchronize memberships. Synchronization deletes existing rows before recreating them; legacy field conversion emits default no/null values. | `MobilePatientProfileService::updatePatient`; `backend/app/Services/PatientMembershipService.php` | Omitting a hidden government-program section could erase memberships unless persistence is made presence-aware. |
| A10 | Mobile has an intake contract endpoint, but its response is static options/prohibited clinical fields, not clinic-specific effective rules. | `backend/app/Http/Controllers/Clinical/BiteIntakeSchemaController.php`; `backend/app/Support/BiteIntakeContract.php`; `mobile/lib/services/mobile_api.dart:274` | Keep the intake vocabulary contract and add a separate patient-facing configuration projection. |
| A11 | Consultation creation and intake updates use fixed `BiteIntakeContract::validationRules()`. | `backend/app/Http/Requests/Mobile/{StoreMobileAppointmentRequest,UpdateMobileAppointmentIntakeRequest}.php` | Connect both create and update. Vaccination/booster booking must not accidentally acquire consultation requirements. |
| A12 | Intake normalization inserts absent keys and converts missing washing information to false; storage normalizes again. | `BiteIntakeContract::normalize`, `storagePayload` | Preserve omission through both normalization passes; absence must not become a negative answer or erase history. |
| A13 | Intake submit has hard-coded final checks and non-null assertions. It currently sends `siteWashed: false`, null washing details, and null care received. | `mobile/lib/views/bite_intake_view.dart:388–449` | Dynamic widgets alone will still fail or submit invented answers. Refactor submit checks and draft types together. |
| A14 | Intake tables initially require several core columns; the centralization migration still explicitly makes exposure type non-null. | `backend/database/migrations/2026_06_19_100001_create_bite_incident_intakes_table.php`; `2026_09_23_000100_centralize_mobile_bite_intake_workflow.php` | Inspect the complete migration chain and live schema before permitting omitted values. No fake dates/species/answers to satisfy SQL constraints. |
| A15 | Mobile defaults clinic context from `CLINIC_ID` with fallback 1 when creating profiles; booking uses the selected patient's stored clinic. Staff configuration routes use staff middleware. | `mobile/lib/services/mobile_api.dart`; `backend/app/Services/Mobile/MobileAppointmentService.php`; `backend/routes/api.php` | Add a patient-authorized config endpoint and explicit clinic resolution, rather than calling the staff editor endpoint from Flutter. |
| A16 | The web hook has a clinic-keyed memory cache and defaults outside its provider. Mobile API selection is dynamic and can use mocks. | `frontend/src/hooks/useClinicModuleConfig.tsx`; `mobile/lib/services/api.dart` | Verify provider coverage and clinic-switch races; add the mobile configuration method to both real and mock API implementations. |

`frontend/src/hooks/useClinicModuleConfig.ts` is a re-export of the `.tsx` implementation, not a second engine. Keep compatibility imports during cleanup.

## 3. Current mobile flow

### Profile setup

1. `app_router.dart` opens `ProfileSetupView` for self creation, dependent creation, or editing an existing `PatientProfile`.
2. The view loads location context, manages its stepper/controllers, validates visible controls, and builds patient, address, socioeconomic, and membership values.
3. `MobileApi.createPatient` posts to `/api/mobile/patients`, including configured clinic context. `updatePatient` patches `/api/mobile/patients/{patient}`.
4. Mobile request classes validate; `MobilePatientProfileService` creates or links the record, updates patient details/memberships, and attaches the account relationship.
5. Editing or `returnToBooking` returns the saved patient to the caller; initial setup proceeds to the menu.

### Intake and appointment

1. `mobile/lib/views/booking_view.dart` selects a patient and booking details. It can open profile setup and receive the new profile back.
2. A consultation opens `BiteIntakeView` with `BiteIntakeRouteArgs`. Other booking paths retain their existing service-specific handling.
3. Intake loads `biteIntakeContract()` and coordinates patient, incident, animal, history, and review steps from `mobile/lib/widgets/bite_intake/steps/`.
4. Submit builds `BiteIntakeDraft` and calls `api.book`; JSON uses patient-facing aliases such as `date_of_exposure` and `animal_species`.
5. `StoreMobileAppointmentRequest` normalizes/validates consultation intake. `MobileAppointmentService` resolves the account-linked patient, applies existing booking guards, and creates appointment/intake records using the patient's clinic.
6. The existing intake update endpoint uses a separate request and service path. It needs the same policy and omission semantics.
7. Staff review/check-in remains in the existing `OnlineIntakeCheckInModal`, `CheckInBiteIntakeRequest`, and `BiteIncidentIntakeService` workflow. Patient-reported data must remain distinguishable from clinical confirmation.

## 4. Target rules and ownership

### Effective field policy

Resolve a field once into `visible`, `required`, `editable`, and its canonical payload mapping. Apply the same result to rendering, validation, error focus, review summaries, and serialization.

| Situation | Expected behavior |
|---|---|
| Required, applicable, enabled section | Show marker and enforce value on create/completion. Validate format on server and client. |
| Optional, applicable, enabled section | Allow omission; validate format when supplied. |
| Hidden or section disabled | Do not render an input, require it, or submit it. Preserve stored data. |
| Conditional field not applicable | Do not require it. Do not silently erase its historical value. |
| Explicit clearing of visible optional field | Permit intentional null/empty clearing through a documented update contract. |
| Required boolean | An explicit false is a valid answer; missing is not false. |
| Clinical-only field in patient submission | Reject through existing prohibited-field validation, regardless of admin field visibility. |
| Historical read-only records | Keep saved values accessible to authorized staff; hidden input settings are not historical deletion rules. |

Keep identity and ownership invariants independent from optional demographic sections. Keep `exposure_category` locked in clinician workflows and prohibited in mobile intake. A disabled station must not bypass doctor assessment or authorize a patient to prescribe treatment.

For ordinary profile PATCH, validate submitted fields plus their relevant dependencies using existing values as context. Do not require every newly configured field during unrelated edits. For a new consultation, validate profile completeness against current applicable requirements and return actionable missing-profile fields before booking; allow the user to update the selected profile and return with the booking draft retained. Do not apply that completeness gate to already scheduled follow-up care without a separate workflow requirement.

### Canonical mappings

| Configuration key | Existing mobile/API value | Required treatment |
|---|---|---|
| `blood_type`, `mother_maiden_name`, `civil_status`, `spouse_name` | Same profile keys | Spouse applies only when married; resolve hidden parent dependencies explicitly. |
| `address_municipality`, `address_barangay`, `address_purok`, `province` | Same keys, plus derived `address` | Do not rebuild a partial address over an existing complete address when some components are hidden. |
| `educational_attainment`, `employment_status`, `family_member` | Same profile keys | Apply socioeconomic section flag. |
| `philhealth_member`, `philhealth_status`, `philhealth_no`, `philhealth_category`, `fourps_member`, `dswd_nhts` | Legacy fields plus `memberships` collection | One authoritative adapter; preserve omitted/hidden membership types. |
| `bite_date` | `date_of_exposure` → `bite_date` | Use presence-aware aliases; remove forced non-null draft assumptions if hiding is supported. |
| `bite_place` | `place_of_exposure` → `bite_place` | Preserve distinction from home address. |
| `site_washed` | `site_washed` / accepted `wound_washed` alias | Replace constant false with an actual visible answer or omission. |
| `exposure_type` | `reported_mode_of_exposure` → `exposure_type` | Preserve current contract enums and legacy compatibility. |
| `animal_type` | `animal_species` → `animal_type` | Other-species details apply only when visible and species is Other. |
| `animal_status` | `animal_ownership` → `animal_status` | This means ownership, not reported animal condition. |
| `wound_location` | `body_part_detail` → `wound_location` | Define whether required means detail or group+detail; current submit requires group, while backend detail is nullable. Do not equate these silently. |
| `patient_description` | `incident_narrative` → `patient_description` | Same incident section policy. |
| `animal_captured` | Existing backend field; mobile currently sends observation availability | Capture and availability are different concepts. Do not alias; provide a distinct control or explicitly mark mobile unsupported until implemented. |
| Triage/treatment keys | Clinician Forms 2–3 | Exclude from mobile editable projection. |
| `rig_fee`, `anti_rabies_fee`, `additional_fees` | Staff registration fee controls | Keep staff-only; no patient payment collection is introduced by this integration. |

Fields without a current configuration key (referral details, history, other membership types, incident time, etc.) retain explicit baseline behavior. Do not invent new admin keys without adding them to the catalog, validation, editor, contract, and tests.

## 5. API and persistence design

### Patient-facing configuration endpoint (proposed)

Add authenticated `GET /api/mobile/form-configuration` within `auth:sanctum` + `patient.account` middleware. Return a read-only, allowlisted projection, not admin history or edit capabilities.

Resolve context before configuration lookup:

- New profile: validate the deployment/selected clinic against clinics available to the mobile application. Never trust an arbitrary client clinic ID simply because it exists.
- Existing profile/booking: authorize the account-to-patient link first, then derive clinic from that patient.
- Existing appointment intake update: authorize the appointment, then derive its clinic. Reject conflicting client context.
- Missing context: return a controlled error with a retry/selection action. Do not silently fall back to clinic 1 on the server.

Suggested response properties: `schema_version`, `revision`, `clinic_id`, `profile` and `intake` projections containing section flags, field policies, supported capabilities, and baseline constraints. Retain the separate intake vocabulary version; it is not the configuration revision.

Keep existing `/api/mobile/bite-intake-schema` compatible. Extend the real/mock Flutter API with typed configuration parsing and a dedicated repository. Do not expose PUT access to patient accounts.

### Request/persistence pipeline

1. Authorize account, patient, appointment, and clinic context.
2. Load one normalized configuration snapshot for this request.
3. Normalize only keys actually supplied, retaining their presence and accepted aliases.
4. Apply context-specific configurable requirements over existing type/format rules. Keep prohibited clinical fields intact.
5. Exclude hidden and disabled-section inputs server-side, including forged or old-client payloads. Log rejected policy mismatches without logging sensitive answers.
6. Persist only allowed, validated, present fields; retain hidden values and omitted relationships.

Membership updates need per-type merge semantics when only some membership controls are editable. An absent collection must preserve records; an explicit editable removal may delete the relevant type. Do not pass unfiltered `$request->all()` into membership synchronization after dynamic validation.

Fix `storagePayload()` so a second normalization cannot reintroduce excluded keys. Track omission before normalization; do not infer presence from a normalized array. Account for existing-chart linking as well as ordinary profile updates.

Before hiding non-null intake columns, inspect all migrations, model casts, check-in conversion, reports, and downstream assumptions. Add an additive nullable migration where necessary, with unknown represented as missing data rather than invented answers. Until that compatibility work is complete, do not advertise unsupported hidden/optional settings as functional. A disabled intake section should allow consultation scheduling without fabricated incident values, while staff collection and doctor assessment remain required at their appropriate workflow stage.

### Refresh and errors

- Cache by authenticated session and clinic; clear on logout, clinic change, or account switch. Discard late responses for the previous clinic/patient.
- Fetch on entry and refresh before final submit. Keep typed values while refreshing.
- Server always validates against current policy. For newer clients, accept a separate configuration revision and return a documented configuration-changed response when mismatched; do not reuse intake schema version as revision.
- On a changed policy, retain the draft, recompute visible steps, and focus the first newly required input. Never silently submit again after a conflict.
- If initial config fails, show Retry and preserve drafts. A last-known same-clinic snapshot may support editing, but final submission requires server validation. Never substitute another clinic's configuration.
- Older clients may omit revision during the compatibility period; still enforce authorization and current rules, with field errors and an update-app message when the old client cannot render a new requirement.

## 6. Proposed clean file structure

Paths marked new are proposed. Existing entry points stay in place to avoid breaking imports/routes. Prefer narrow policy helpers and existing step widgets over a general-purpose dynamic form builder.

| Area | File/path | Responsibility |
|---|---|---|
| Backend existing | `backend/app/Services/Clinic/ClinicModuleConfigService.php` | Configuration persistence, defaults, revision, auditing. |
| Backend existing | `backend/app/Services/Clinic/EffectiveFieldRuleComposer.php` | Public facade for effective rules; reuse existing request integration. |
| Backend new | `backend/app/Services/Clinic/FormFieldCatalog.php` | Section membership, surfaces, aliases, and dependency metadata; no second defaults source. |
| Backend new | `backend/app/Services/Clinic/FormConfigurationProjector.php` | Safe profile/intake projections from the same resolved policy. |
| Backend new | `backend/app/Services/Mobile/MobileClinicContextResolver.php` | Authorized new-profile/patient/appointment clinic resolution. |
| Backend new | `backend/app/Services/Clinic/ConfiguredPayloadFilter.php` | Presence-aware field allowlisting and hidden-field protection. |
| Backend new | `backend/app/Http/Controllers/Mobile/MobileFormConfigurationController.php` | Thin read-only endpoint. |
| Backend existing | `backend/app/Http/Requests/Mobile/` | Profile/appointment request adapters call shared policy, preserving endpoint-specific constraints. |
| Backend existing | `backend/app/Support/BiteIntakeContract.php` | Vocabulary, safe alias normalization, baseline validation and storage allowlist. |
| Backend existing | `backend/app/Services/Mobile/{MobilePatientProfileService,MobileAppointmentService}.php` | Domain persistence and existing workflow guards. |
| Mobile new | `mobile/lib/models/form_configuration.dart` | Typed field rules, sections, clinic and revision. |
| Mobile new | `mobile/lib/services/form_configuration_repository.dart` | Fetch/cache/refresh through existing API transport. |
| Mobile new | `mobile/lib/utils/configured_field_policy.dart` | Pure dependency/visibility/requiredness evaluation. |
| Mobile new | `mobile/lib/utils/configured_payload_builder.dart` | Canonical mapping and omission-safe profile/intake payloads. |
| Mobile new | `mobile/lib/controllers/profile_setup_controller.dart` | Profile draft, policy loading, validation and submission coordination. |
| Mobile new | `mobile/lib/controllers/bite_intake_controller.dart` | Intake draft, dynamic steps, policy refresh and error navigation. |
| Mobile new | `mobile/lib/widgets/profile_setup/sections/` | Extract identity, address, socioeconomic, and membership sections from the large view. |
| Mobile existing | `mobile/lib/widgets/bite_intake/steps/` | Reuse current step widgets; receive policy/state via explicit parameters. |
| Mobile existing | `mobile/lib/views/{profile_setup_view,bite_intake_view,booking_view}.dart` | Thin screens and navigation; no duplicated rule definitions. |
| Mobile existing | `mobile/lib/services/{mobile_api,mock_mobile_api}.dart` | Matching configuration methods; existing API factory remains compatible. |
| Web new | `frontend/src/shared/forms/configuredFieldPolicy.ts` | One combined section/field/condition evaluation helper. |
| Web new | `frontend/src/shared/forms/configuredPayload.ts` | Shared omission-safe adapters for applicable patient/form payloads. |
| Web existing | `frontend/src/hooks/useClinicModuleConfig.tsx` | Provider, clinic-scoped state and refresh; delegate effective field decisions. |
| Tests new | `backend/tests/Feature/Mobile/MobileFormConfigurationTest.php` | Authorization, projection, required/hidden rules, revision handling. |
| Tests new | `mobile/test/form_configuration_policy_test.dart` | Shared policy/serialization fixtures. |
| Tests new | `mobile/test/configured_profile_intake_test.dart` | Widget flow, dynamic steps and retained drafts. |

Split the existing composer further only if necessary: profile and intake rule classes may live under `backend/app/Services/Clinic/FormRules/`, with the composer remaining the facade. Resolve configuration once per request rather than querying from each field helper. Avoid reorganizing unrelated feature folders.

## 7. Implementation phases and exit criteria

### Phase 0 — Complete the field and persistence inventory

- [ ] Record each admin key's actual screen, payload key, storage column, section, condition, and validation owner. Include each patient edit modal and staff intake review.
- [ ] Verify database nullability from the full migration chain and a development database; identify downstream non-null assumptions.
- [ ] Resolve body-part group/detail semantics, capture versus availability, and section-disabled consultation behavior using the recommendations above.
- [ ] Characterize current self/dependent/edit/booking behavior and existing composer semantics before refactoring.

Exit: every field is supported, staff-only, or explicitly pending; no advertised rule lacks a validation and storage strategy.

### Phase 1 — Shared policy and mobile configuration API

- [ ] Add catalog metadata, authorized clinic resolver, and read-only projector.
- [ ] Consolidate effective section/field/conditional policy around the existing composer; reconcile misleading section mappings with the active forms.
- [ ] Add the mobile endpoint and contract documentation; preserve the staff admin API and intake vocabulary endpoint.
- [ ] Add real/mock mobile API support and typed configuration model.

Exit: two clinics return independent rules; unauthorized profile/appointment references fail; patient tokens cannot edit configuration or obtain staff-only fields.

Implementation note (17 November 2026): The read-only endpoint, catalog, projector, mobile clinic resolver, typed Flutter model/API/repository, and endpoint contract are in place. Existing web composer section lookup now uses the catalog and visibility checks consider disabled sections. The endpoint was verified for clinic isolation and patient ownership with `MobileFormConfigurationTest` (2 tests, 15 assertions). PHP syntax checks and targeted Dart analysis passed. The test suite was invoked through PHPUnit's programmatic entry point with SQLite in-memory variables because its normal CLI wrapper could not open the bootstrap file in this environment. Appointment ownership has source-level authorization via `booked_by_account_id` and awaits its own runtime test. Phase 1 does not yet enforce rules on mobile form submissions; that belongs to Phase 2.

### Phase 2 — Backend validation and safe persistence

- [ ] Connect mobile profile create/update and consultation create/intake update to shared policy.
- [ ] Make normalization, filtering, membership merges, derived addresses, and persistence omission-safe.
- [ ] Implement required schema compatibility changes before enabling omitted intake fields.
- [ ] Validate the effective profile state at new-consultation completion without blocking unrelated edits or scheduled follow-ups.
- [ ] Preserve clinical prohibited fields, appointment guards, and existing ownership checks.

Exit: direct API calls cannot bypass required rules or modify hidden values; omitted membership/intake fields retain stored values; no SQL failures for supported configurations.

Implementation note (17 November 2026): `MobileFormPolicy` resolves one clinic's effective field and section rules per request. Mobile profile create/update and consultation create/intake update now validate these rules; new consultations check the selected profile's required information and return `profile.<field>` errors. Hidden profile fields and derived partial addresses are removed before validation/persistence. Membership updates merge permitted types and retain hidden program types and hidden PhilHealth detail. Intake normalization and storage now preserve omitted values, and an additive migration allows missing patient-reported answers in the intake table. An intake-free consultation still creates a linked *empty intake record* for staff check-in; it contains no invented exposure answers. If the bite date remains unknown at check-in, the workflow creates a provisional incident date explicitly marked `bite_date_is_provisional`, pending clinical confirmation. The date is not represented as patient-reported exposure data. Existing appointment guards, account ownership, and prohibition of patient-submitted clinical fields remain in force. The mobile screens still need Phases 3–4 to render required/hidden policies, particularly the washing question currently sent as false by the old intake UI.

Verification: SQLite migrations ran in 60 targeted feature tests (364 assertions) spanning mobile profile, appointment, configured form, existing mobile check-in, and clinic configuration behavior. The new tests cover hidden update preservation, required fields, membership detail, disabled intake with staff check-in, partial intake update, explicit false, body-part group, and blocked clinical input. Run the new migration and repeat the focused checks on MySQL before release; MySQL schema migration and device UI were not exercised locally.

### Phase 3 — Mobile profile setup integration

- [x] Extract controller and section widgets incrementally, preserving current navigation and scroll behavior.
- [x] Use one policy for visibility, markers, validation, payloads, review, and error focus in self/dependent/edit modes.
- [x] Remove empty steps when sections are disabled. Keep identity essentials and retain draft values across policy refresh.
- [x] Handle PSGC address dependencies and membership subfields without forcing hidden inputs.

Exit: changing a clinic field to required/optional/hidden affects all profile modes consistently; hidden edits do not clear data; returning to booking retains the selected patient and booking draft.

Implementation note (17 November 2026): Extracted `ProfileSetupController` and section widgets (`ProfileBasicInfoSection`, `ProfileAddressContactSection`, `ProfileSocioeconomicProgramSection`, `profile_form_controls.dart`) driven by `ConfiguredFieldPolicy` and `ConfiguredPayloadBuilder`. Added PhilHealth status/category and 4Ps subfields, omitted hidden fields and partial derived addresses, preserved hidden membership types/details, added `FormConfigurationRepository` per-context caching + logout cache clearing + Retry state on initial config failure, added pre-save policy refresh conflict handling (retaining draft and jumping to newly required fields), and connected `BookingView` consultation pre-check with actionable `Update profile` return flow while keeping vaccination/booster booking free of the demographic gate.

### Phase 4 — Mobile intake and appointment integration

- [x] Replace hard-coded final validation and forced draft values with effective policy.
- [x] Change nullable/required draft properties where supported; handle absent fields without non-null assertion crashes.
- [x] Add an actual washing answer when enabled; do not send false for an unanswered/hidden question.
- [x] Derive active steps from visible content and use stable step IDs rather than assuming indices 0–4.
- [x] Ensure review cards and error navigation reflect active steps only.
- [x] Apply identical policy to intake editing; preserve consultation versus vaccination/booster behavior.

Exit: no empty-step navigation traps or hidden-field blockers; a disabled intake section can schedule the approved consultation path without fabricated answers; staff can still review/complete the intake safely.

Implementation note (17 November 2026): Updated `BiteIntakeDraft` to allow nullable patient-reported fields and omit absent keys in `toJson()`, extracted `BiteIntakeController` using `IntakeStepId` active steps, added explicit `site_washed` (`Yes`/`No`/unanswered) and `animal_captured` controls, required `bite_place` when configured required, rendered active-step review cards (and check-in notice when `bite_intake_section_enabled` is false), handled mid-draft policy revision changes and `profile.*` server validation errors (`ApiException.fieldErrors`) with `Update profile` recovery, added `PUT`/`DELETE` handling to `MobileApi._send`, and updated `_EditBiteIntakeSheet` in `history_record_card.dart` to fetch `FormConfigurationRepository.forAppointment` and submit omission-safe partial updates.

Verification: `flutter analyze` reported 0 errors (1 pre-existing `avoid_print` info in `test/date_selector_exceptions_test.dart`) and the full `flutter test` suite passed (108 tests, including `test/form_configuration_policy_test.dart`, `test/configured_profile_intake_test.dart`, `test/profile_setup_scroll_test.dart`, and `test/bite_intake_stepper_test.dart`). Tested against `MockMobileApi` overrides; live device run against the Laravel MySQL backend remains part of Phase 6.

### Phase 5 — Web alignment and admin clarity

- [ ] Audit remaining Forms 1–3 and patient edit paths against the same field matrix.
- [ ] Consolidate visibility/requiredness/payload handling; verify provider coverage and clinic cache races.
- [ ] Show affected surfaces in Module Configuration so staff understand whether a setting affects profile, intake, or clinician-only forms.
- [ ] Preserve fee scope and existing clinical safeguards; coordinate with ongoing vaccination/inventory work.
- [ ] Update the older configuration contract and user-facing descriptions to match implemented capabilities.

Exit: one admin change produces matching applicable behavior on web/mobile/server; clinical-only fields stay clinical-only.

### Phase 6 — Regression verification and staged release

- [ ] Run targeted backend tests and Flutter policy/widget tests, then affected web checks.
- [ ] Walk through a real mobile build with a test clinic and synthetic patients.
- [ ] Exercise a supported older client and configuration changes during an open draft.
- [ ] Release additive backend compatibility before the mobile build. Enable complete dynamic intake behavior only after schema and consumer compatibility checks pass.
- [ ] Document rollback: stop serving the new capability while retaining data and additive nullable schema. Do not roll back by forcing unknown values into non-null columns.

Exit: test matrix below passes and deployment is a separate reviewed action. Implementation completion must include actual commands/results, not only checked boxes.

## 8. Verification matrix

| Scenario | Expected result |
|---|---|
| Blood type required | Self/dependent create and server reject missing value; valid value succeeds. |
| Blood type hidden on edit | No control/payload key; stored value remains unchanged, including forged requests. |
| Socioeconomic section disabled with required children | No empty step and no hidden-field validation errors. |
| Married spouse rule | Required only when applicable; hidden parent dependency cannot make the form impossible to complete. |
| Government section hidden | Existing memberships and legacy flags survive an unrelated profile update. |
| One membership type editable | Updating it preserves hidden membership types. |
| Address component hidden | Existing full address is not replaced with an incomplete recomposition. |
| Washing answer false | Explicit false accepted; unanswered is distinguishable and rejected only if required. |
| Required intake field becomes hidden | Create/update omit it safely; server and database accept the supported contract without fake data. |
| Whole intake section disabled | Consultation creates an empty linked intake for staff check-in; no fabricated exposure answers or clinical bypass. |
| Conditional animal Other/referral inputs | Only applicable visible children validate; existing optional referral remains optional. |
| Clinical field injected from mobile | Server rejects exposure category/diagnosis/prescription even if configuration says required. |
| Account owns multiple profiles | Selected patient's authorized clinic controls configuration and booking. |
| Wrong patient/clinic/appointment ID | Access denied; no cross-clinic settings or patient records leak. |
| Clinic changes during fetch | Late old-clinic response is ignored. |
| Admin changes rules during draft | Draft retained; policy refreshed; user sees and completes newly required fields. |
| Config unavailable | Retry shown; draft preserved; no unrelated clinic fallback. |
| Existing scheduled follow-up | No new consultation intake or demographic-completion gate is imposed unintentionally. |
| Check-in and clinical progression | Intake remains patient-reported; doctor/nurse workflow protections remain intact. |
| Old client without revision | Compatible payloads work; unsupported new requirements produce actionable errors. |

Reuse and extend existing suites: `backend/tests/Feature/Auth/MobilePatientProfileCharacterizationTest.php`, `backend/tests/Feature/Mobile/MobileAppointmentCharacterizationTest.php`, `backend/tests/Feature/Clinic/ClinicModuleConfigCharacterizationTest.php`, `ClinicModuleConfigPerson1Test.php`, `RegistrationFeesModuleConfigTest.php`, `frontend/tests/module-config/module-config.spec.ts`, and `mobile/test/{bite_intake_contract_test,bite_intake_stepper_test,profile_setup_scroll_test}.dart`.

Use shared contract fixtures covering required/optional/hidden, disabled sections, false/null/absent values, and aliases across PHP, TypeScript, and Dart. Test outcomes and data preservation rather than duplicating implementation logic in tests.

## 9. Completion checklist

- [ ] Every applicable field uses one consistent policy across input, validation, review, and persistence.
- [ ] Mobile clinic context is authorized and independent of an assumed staff user model.
- [ ] Hidden/omitted fields preserve existing values, addresses, and memberships.
- [ ] Unknown intake information remains unknown throughout storage and staff review.
- [ ] Current clinical workflow, role permissions, and appointment guards remain covered by regression checks.
- [ ] Existing views are smaller coordinators, with reusable policy and payload code in named files.
- [ ] Contract documentation lists supported surfaces and accurate field metadata.
- [ ] Test results and remaining limitations are recorded before marking implementation complete.


## Phase 5 status (web alignment)
- Added frontend/src/shared/forms/configuredFieldPolicy.ts and configuredPayload.ts; useClinicModuleConfig delegates to them (section + station gating, conditional parents, locked exposure_category, stale-request guard on clinic switch/logout).
- Form 1 create (patientService), EditPatientModal, PatientEditModal now omit hidden/disabled fields and partial composite address; RegistrationAddressSection honors municipality/barangay/province visibility.
- ModuleConfigPage: corrected animal_status/animal_captured descriptions; sections show affected-surface badges.
- Verified: tsc -b clean; 7 new Playwright unit specs pass. Not done: Form 2/3 audit beyond existing gating, AnimalSection config gating, docs/task_nov102016/configuration_contract.md update, full UI regression (registration Playwright suite not run).

## Phase 5 addendum: Form 2/3 audit
- Web UI consumers of Form 2/3 keys: bite_site, treatment_given (Form 2), route (Form 3), and now injection_site (RIG wound-infiltration input in ProphylaxisAdministrationSection is hidden when the rule is hidden; it stays required when visible to preserve the existing clinical safeguard).
- Keys with NO web UI gating yet (product decision needed; several are inventory-driven or auto-filled): animal_observation_status, protocol_type, dosage_ml, vaccine_brand, vaccine_generic, batch_no, tt_status, medication_given, adverse_reaction, cost_recovery. Backend validates protocol_type, injection_site, dosage_ml; the web already sends defaults for injection_site/dosage_ml and omits protocol_type, so required settings do not currently block saves from the web.
- AnimalSection.tsx is unused (no importers); not gated.
- VaccinationRecordForm.tsx, DoseCard.tsx and DoseRow.tsx (pre-existing local edits) were not modified.
