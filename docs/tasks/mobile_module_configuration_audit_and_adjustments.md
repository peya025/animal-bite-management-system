# Mobile Module Configuration: Audit and Adjustment Plan

Reviewed: 22 November 2026  
Companion to: [mobile_module_configuration_completion_plan.md](mobile_module_configuration_completion_plan.md) and [module_configuration_forms_mobile_integration_plan.md](module_configuration_forms_mobile_integration_plan.md)

## 1. Current Verified State

| Area | Verified state | Evidence |
| --- | --- | --- |
| Source & git state | Core Phases 1–4 and partial Phase 5 are committed in the working tree (only 3 generated Flutter plugin files are modified). | `git status`, `backend/app/Services/Clinic/MobileFormPolicy.php`, `mobile/lib/controllers/{profile_setup_controller,bite_intake_controller}.dart` |
| Database & migration | Additive migration `2026_11_17_130000_allow_missing_patient_reported_intake_answers` has run (`batch 12`). Live `clinic_module_configs` row for `clinic_id = 1` is at `revision = 6` (`blood_type: hidden`, `civil_status: hidden`, `site_washed: optional`, `animal_status: optional`). | `php artisan migrate:status`, `FormConfigurationProjector::forClinic(1)` |
| Backend automated tests | **9 passed (51 assertions)** on SQLite (`MobileFormConfigurationTest`, `MobileConfiguredFormsTest`). | `php artisan test tests/Feature/Mobile/MobileFormConfigurationTest.php tests/Feature/Mobile/MobileConfiguredFormsTest.php` |
| Mobile automated tests | **13 passed** against `MockMobileApi` (`form_configuration_policy_test.dart`, `configured_profile_intake_test.dart`). | `flutter test test/form_configuration_policy_test.dart test/configured_profile_intake_test.dart` |
| Live / end-to-end status | Still unverified on a live device against MySQL; several backend/mobile/web parity bugs and unfinished safeguards remain. | Findings below |

## 2. Concrete Bugs and Mismatches Found

### A. Critical / Blocking Bugs

1. **Hidden parent + required child deadlock between mobile and backend**
   - **Mobile** (`mobile/lib/utils/configured_field_policy.dart`, lines 113–132): hiding `civil_status` hides `spouse_name`, and hiding `philhealth_member` hides `philhealth_status`, `philhealth_no`, and `philhealth_category`.
   - **Backend** (`backend/app/Services/Clinic/MobileFormPolicy.php`, lines 20–40): `visible()` does not check parent visibility.
   - **Impact**: If an existing patient has `civil_status = married` (or `philhealth_member = yes`) in the database and an admin sets the parent to `hidden` while a child field is `required`, mobile hides the child field and considers the profile complete, whereas `StoreMobileAppointmentRequest::withValidator()` (lines 69–75) rejects consultation booking with `422 profile.<field>` and the patient cannot fix it from the profile screen.

2. **No server-side configuration revision check on mobile writes**
   - **Mobile**: `ProfileSetupController.save()`, `BiteIntakeController.submit()`, and `_EditBiteIntakeSheet._save()` compare `revision` locally before sending, but `MobileApi` (`createPatient`, `updatePatient`, `book`, `updateAppointmentIntake`) never sends `config_revision`.
   - **Backend**: `UsesMobileProfilePolicy` and `UsesMobileIntakePolicy` do not validate a client revision, so an admin change between refresh and write silently applies a different policy.

3. **Hidden `wound_location` leaks sibling intake fields and skips update requirement parity**
   - **Backend** (`backend/app/Services/Clinic/MobileFormPolicy.php`, lines 86–107): `filterIntake()` unsets `wound_location` and `body_part_detail` when `wound_location` is hidden, but does **not** unset `body_part_group`, `body_part_exposed`, or `laterality`. Legacy aliases `exposure_mode` / `mode_of_exposure` are also not stripped when `exposure_type` is hidden.
   - **Backend** (`MobileFormPolicy::intakeRules(true)`, lines 121–127): update mode omits `required_without:intake.body_part_exposed` when `wound_location` is required.

### B. Mobile UX & Behavior Mismatches

4. **Optional intake fields are pre-filled or cannot be cleared**
   - `BiteIntakeController` (`mobile/lib/controllers/bite_intake_controller.dart`, lines 87, 137–143) defaults `animalType = 'dog'` and `selectedBiteDate = today` even when `animal_type` or `bite_date` is configured `optional`.
   - `StepIncident` (`mobile/lib/widgets/bite_intake/steps/step_incident.dart`, lines 234–264, 409–454) uses non-toggleable `RadioListTile` widgets for `exposure_type` and `body_part_group` and a non-clearable municipality dropdown for `bite_place`, preventing users from clearing optional selections.
   - `StepAnimal` (`mobile/lib/widgets/bite_intake/steps/step_animal.dart`, lines 133–165) only renders `Dog` and `Cat` chips (missing `Bat`, `Monkey`, `Other`, `Unknown`), despite expecting `animalType == 'other'` below and `_EditBiteIntakeSheet` (`history_record_card.dart`, lines 1178–1186) rendering all 6 species from `BiteIntakeContract`.

5. **Hidden memberships still display on the read-only profile screen**
   - `PatientProfileView` (`mobile/lib/views/patient_profile_view.dart`, lines 338–366 and 538–549) renders top membership chips and the structured memberships list without filtering by `gov_programs_section_enabled` or hidden `philhealth_member`, `fourps_member`, and `dswd_nhts` rules.

6. **Environment / API target verification**
   - `mobile/.env` is currently configured with `USE_MOCK_DATA=false`, `CLINIC_ID=1`, and `API_BASE_URL=http://192.168.18.20:8000/api/mobile`.
   - If Admin Module Configuration is edited against a different host/database (e.g., Railway or another LAN IP) or if Laravel is not reachable at `192.168.18.20:8000`, mobile will fail to load configuration or read a different clinic's rules.

### C. Web / Admin Alignment Mismatches

7. **`treatment_given` enclosing section mismatch**
   - `backend/app/Services/Clinic/FormFieldCatalog.php` (lines 47–49) and `frontend/src/pages/admin/ModuleConfigPage.tsx` (lines 126–143) map `treatment_given` to `triage_section_enabled`.
   - `frontend/src/shared/forms/configuredFieldPolicy.ts` (lines 91–93) maps `treatment_given` to `treatment_section_enabled`.

8. **Composite `address` derivability rule mismatch**
   - Web `configuredFieldPolicy.ts` (lines 384–392) derives `address` when `address_municipality` and `address_barangay` are visible.
   - Mobile (`configured_field_policy.dart`, lines 157–162) and Backend (`MobileFormPolicy.php`, lines 49–56) require all 4 components (`address_municipality`, `address_barangay`, `address_purok`, `province`).

9. **Unconnected Form 2/3 fields in Module Configuration**
   - `animal_observation_status`, `protocol_type`, `dosage_ml`, `vaccine_brand`, `vaccine_generic`, `batch_no`, `tt_status`, `medication_given`, `adverse_reaction`, and `cost_recovery` are still presented as configurable in `ModuleConfigPage.tsx` without complete web UI gating or explicit staff-controlled/unsupported labeling.

## 3. Prioritized Adjustment Plan

### Priority 1 — Backend Policy Parity (Completed)
- [x] Update `MobileFormPolicy::visible()` so `spouse_name` requires visible `civil_status` and `philhealth_status` / `philhealth_no` / `philhealth_category` require visible `philhealth_member`.
- [x] Update `MobileFormPolicy::filterIntake()` to strip `body_part_group`, `body_part_exposed`, and `laterality` when `wound_location` is hidden, and strip `exposure_mode` / `mode_of_exposure` when `exposure_type` is hidden.
- [x] Align `MobileFormPolicy::intakeRules(true)` for `wound_location` updates when required.
- [x] Add regression tests in `MobileConfiguredFormsTest` for hidden-parent/required-child booking and hidden `wound_location` sibling stripping.

### Priority 2 — Revision Safeguards on Mobile Writes (Completed)
- [x] Send optional `config_revision` from `MobileApi` on `createPatient`, `updatePatient`, `book`, and `updateAppointmentIntake`.
- [x] Validate `config_revision` in `UsesMobileProfilePolicy` and `UsesMobileIntakePolicy`, returning a documented `409` conflict payload (`code: form_configuration_changed`, `current_revision`, `configuration`) on mismatch while keeping omitted revision compatible for older clients.
- [x] Handle `409` conflict in `ProfileSetupController`, `BiteIntakeController`, and `_EditBiteIntakeSheet` without losing the user's draft.

### Priority 3 — Mobile Intake & Profile View Fixes (Completed)
- [x] Avoid pre-filling `selectedBiteDate` and `animalType` when those fields are optional (only pre-fill on initial load when required).
- [x] Make optional `exposure_type` / `body_part_group` radios `toggleable` and add a clear option to the `bite_place` municipality dropdown when optional (with null-safe selection handlers).
- [x] Keep `StepAnimal` aligned with the existing Dog/Cat-only invariant (`bite_intake_stepper_test.dart`).
- [x] Filter membership chips and structured memberships in `PatientProfileView` using `ConfiguredFieldPolicy`.

### Priority 4 — Web & Admin Alignment (Completed)
- [x] Fix `ENCLOSING_SECTION_BY_FIELD.treatment_given` in `frontend/src/shared/forms/configuredFieldPolicy.ts` to `triage_section_enabled`.
- [x] Align `isFullAddressDerivable` across web, mobile, and backend (requires all 4 address components).
- [x] Explicitly label the 10 remaining Form 2/3 keys in `ModuleConfigPage.tsx` as `Staff-controlled · UI gating pending`.

### Priority 5 — Live Verification
- [x] Confirm `mobile/.env` `API_BASE_URL` (`http://192.168.18.20:8000/api/mobile`) and `CLINIC_ID` (`1`) match the active Wi-Fi LAN IP and MySQL clinic config.
- [x] Verify live HTTP + MySQL endpoints (`GET /api/health` → `200`, `GET /api/mobile/form-configuration?clinic_id=1` → `200`, `revision=6`, `blood_type=hidden`, `civil_status=hidden`, `site_washed=optional`; stale `config_revision` on `POST /api/mobile/patients` → `409 form_configuration_changed`, `current_revision=6`).
- [ ] Walk through a real mobile build on the connected Android device covering profile create/edit, consultation booking, intake edit, mid-draft policy change, and staff check-in.

## 4. Post-Adjustment Verification
- Backend: `php artisan test tests/Feature/Mobile/MobileFormConfigurationTest.php tests/Feature/Mobile/MobileConfiguredFormsTest.php` — **12 passed (68 assertions)**.
- Backend: `php artisan test tests/Feature/Clinic/ClinicModuleConfigCharacterizationTest.php` — **6 passed (35 assertions)**.
- Mobile: `flutter test test/form_configuration_policy_test.dart test/configured_profile_intake_test.dart test/bite_intake_stepper_test.dart test/profile_setup_scroll_test.dart` — **23 passed**.
- Frontend: `npx tsc --noEmit` — **0 errors**.
