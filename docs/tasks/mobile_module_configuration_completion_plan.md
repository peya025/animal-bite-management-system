# Mobile module configuration: progress review and completion plan

Reviewed: 20 November 2026

This is a current-status companion to [the original integration plan](module_configuration_forms_mobile_integration_plan.md). It records what is present in the working tree and the work needed to make the mobile connection release ready. The configuration work is currently uncommitted alongside other local changes; preserve those changes when implementing the remaining items.

## Progress found

| Area | Current state | Evidence |
| --- | --- | --- |
| Configuration source and mobile API | Implemented in source. `GET /api/mobile/form-configuration` returns clinic-scoped, patient-facing profile and intake rules; patient and appointment contexts are resolved through the account. | `backend/routes/api.php`, `backend/app/Http/Controllers/Mobile/MobileFormConfigurationController.php`, `backend/app/Services/{Clinic/FormConfigurationProjector.php,Mobile/MobileClinicContextResolver.php}` |
| Server enforcement | Implemented in source for mobile profile create/update and consultation create/intake update. The policy filters hidden fields, checks configured requirements, and preserves omitted intake and membership values. An additive migration permits unanswered patient-reported intake fields. | `backend/app/Services/Clinic/MobileFormPolicy.php`, mobile request classes, `backend/database/migrations/2026_11_17_130000_allow_missing_patient_reported_intake_answers.php`, `backend/tests/Feature/Mobile/MobileConfiguredFormsTest.php` |
| Mobile profile screens | Implemented in source for self, dependent, and edit flows. The screen loads policy, changes visible/required fields and steps, builds an omission-safe payload, and refreshes policy before save. | `mobile/lib/controllers/profile_setup_controller.dart`, `mobile/lib/views/profile_setup_view.dart`, `mobile/lib/utils/{configured_field_policy.dart,configured_payload_builder.dart}` |
| Mobile consultation and intake | Implemented in source for consultation booking and later intake editing. It distinguishes unanswered washing from an explicit No, supports disabled intake, checks profile completeness, and refreshes policy before submission. | `mobile/lib/controllers/bite_intake_controller.dart`, `mobile/lib/views/booking_view.dart`, `mobile/lib/widgets/history/history_record_card.dart` |
| Web/admin consistency | Partly implemented. Shared web policy/payload helpers and admin affected-surface labels exist. The original plan still lists Form 2/3 keys without complete UI gating and full regression coverage. | `frontend/src/shared/forms/`, `frontend/src/pages/admin/ModuleConfigPage.tsx`, original plan's Phase 5 addendum |
| Release verification | Incomplete. The original plan records earlier SQLite and mock Flutter passes, but no MySQL migration, live mobile/backend walk-through, older-client check, or staged release. | Original plan's Phases 5-6 |

The original plan's Phase 0 inventory remains unchecked. Its Phase 1-4 implementation notes describe work now visible in source, while Phase 5 is partial and Phase 6 is pending. Treat those phases as **implemented locally**, not released or fully verified.

## Remaining work, in order

### 1. Close the mobile contract and coverage inventory

Create one field matrix from `FormFieldCatalog`, the Flutter controls, request rules, and storage columns. For each mobile field, record its section, rule, condition, payload alias, update behavior, and staff handoff. Confirm body-part group/detail and captured/available animal meanings. Check the complete MySQL schema and downstream staff/report consumers for nullable intake values. Mark every admin field as mobile profile, mobile intake, staff-only, or unsupported, and make unsupported behavior explicit in the admin UI.

**Done when:** each patient-facing setting has matching display, validation, submission, storage, and staff review behavior; no unsupported setting appears to be functional on mobile.

### 2. Finish policy-change and clinic-context safeguards

The app currently refreshes configuration before save and compares revisions locally, but does not send a configuration revision with profile or intake writes. Add a separate revision to those requests and a documented server response for a rule change between refresh and write. Keep the draft and point to newly required fields. Test appointment-context ownership at the API boundary. Decide how clinics are made available for new profiles: the current endpoint accepts any existing `clinic_id`, consistent with the existing location flow, so a restricted clinic list needs an explicit rule if required by deployment.

**Done when:** a concurrent admin change cannot silently apply a different policy to a mobile submission; wrong patient/appointment/clinic contexts cannot reveal another clinic's rules; old clients receive usable field errors.

### 3. Complete affected web and admin alignment

Finish the Form 2/3 audit listed in the original plan, especially `animal_observation_status`, `protocol_type`, `dosage_ml`, `vaccine_brand`, `vaccine_generic`, `batch_no`, `tt_status`, `medication_given`, `adverse_reaction`, and `cost_recovery`. For each, either connect web rendering, validation, and payload behavior or label it as staff-controlled/unsupported in Module Configuration. Review the active patient edit paths and registration form with the same matrix. Reconcile the older configuration contract and UI testing guide with the implemented mobile surfaces and field count. Coordinate Form 3 changes with the local vaccination/inventory edits.

**Done when:** an admin change has the documented effect on every advertised surface, without weakening clinical role restrictions.

### 4. Run focused integration and device verification

Run backend configured-form, appointment, check-in, and ownership tests against both SQLite and a MySQL test database after applying the additive migration. Run Flutter policy/widget tests and a real mobile build against the Laravel API using two clinics and synthetic self/dependent patients. Exercise required, optional, hidden, and disabled sections; edit preservation; explicit false versus unanswered washing; policy changes during a draft; lost configuration access; consultation versus booster/vaccination; and staff check-in after an empty intake. Run affected web build and module-configuration UI checks. Test an older mobile client without revision and record its supported behavior.

**Done when:** results and any limitations are recorded in the original plan, including the exact commands, database, app build, and outcomes.

### 5. Stage the release

Deploy and verify the additive backend schema and API first. Then release the mobile build and monitor configuration fetch, validation failures, and empty-intake check-in with test-clinic data. Keep rollback at the app/API capability level while retaining the additive nullable schema and patient records.

**Done when:** the live mobile flow matches the field matrix and staff can complete the existing clinical workflow.

## Verification performed during this review

- Backend: `MobileFormConfigurationTest` and `MobileConfiguredFormsTest` passed locally on SQLite: **9 tests, 51 assertions**. PHPUnit's normal CLI path could not open its bootstrap in this Windows environment; the tests passed through its programmatic entry point with the existing autoloader and SQLite in-memory environment.
- Flutter: the targeted test command produced no output and was interrupted after waiting; this review does **not** claim a new Flutter pass. The original plan records an earlier full Flutter pass of 108 tests.
- Web: a fresh TypeScript build command likewise produced no output and was interrupted; the original plan records an earlier clean `tsc -b` run.
- No live device, MySQL database, deployment, or full end-to-end check was performed in this review.
