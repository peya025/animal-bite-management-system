# Form 1, Booking, and Mobile Login Improvement Plan

**Created:** 2026-08-22  
**Scope:** Web Form 1 (`AddPatientModal`), backend patient persistence, mobile patient profile setup, mobile booking flow, and mobile login/onboarding.

---

## Executive Summary

After re-checking the current codebase and recent migrations, the backend is now **much closer to the web Form 1 UI** than before.

### Good news
The following are already broadly supported end-to-end:
- core Form 1 patient details
- address breakdown
- socioeconomic fields
- PhilHealth fields
- 4Ps fields
- DSWD NHTS
- generic membership-related fields:
  - `has_membership`
  - `other_membership`
  - `other_membership_name`
  - `other_membership_no`

### Main remaining problem
The current advanced membership UI uses richer concepts like:
- `other_memberships` array
- `senior_citizen_id`
- `pwd_id`
- `indigenous_tribe`
- `other_membership_custom_name`
- `other_membership_custom_id`

But those are currently serialized into generic string columns.

That is workable short-term, but **fragile long-term**.

---

# Recommended Long-Term Architecture

## Recommendation: Keep `patient_details` for core Form 1 fields, and add a new normalized `patient_memberships` table

This is the recommended long-term solution.

### Why this is the best long-term choice

The current generic-column strategy stores advanced membership data as serialized JSON-like strings inside:
- `other_membership`
- `other_membership_name`
- `other_membership_no`

That causes several long-term issues:
- hard to query
- hard to validate consistently
- hard to edit cleanly
- hard to report on
- easy to hit column length limits
- creates duplicate parsing logic across web/mobile/detail/edit flows

### Instead, use two layers:

## 1. `patient_details` stays for non-repeatable personal fields
Examples:
- blood type
- mother’s maiden name
- civil status
- spouse name
- municipality / barangay / purok / province
- educational attainment
- employment status
- family member position
- patient-level email/contact/emergency contact if needed

## 2. New `patient_memberships` table for repeatable / structured memberships
One row per membership.

Suggested fields:
- `id`
- `patient_id`
- `membership_type`
  - `philhealth`
  - `fourps`
  - `dswd_nhts`
  - `senior_citizen`
  - `pwd`
  - `indigenous_member`
  - `other`
- `is_active`
- `status_value`
  - for yes/no style programs if needed
- `category`
  - e.g. PhilHealth category, 4Ps category
- `relationship_value`
  - e.g. 4Ps relationship
- `registered_beneficiary`
  - e.g. registered 4Ps beneficiary
- `membership_id_no`
  - PhilHealth no., Senior ID, PWD ID, custom membership ID
- `membership_label`
  - custom name for `other`
- `extra_value`
  - e.g. indigenous tribe name
- timestamps

### Benefits
- no JSON stuffing into short string columns
- simpler reporting/filtering
- easier mobile/web parity
- future-ready for more membership types
- better validation rules by membership type

---

# Current Findings

## A. Web Form 1 is richer than mobile Form 1

### Web currently supports
- patient email
- PhilHealth details
- 4Ps category + relationship + beneficiary
- DSWD NHTS
- Senior Citizen ID
- PWD ID
- Indigenous tribe
- custom/other memberships
- multiple memberships in one patient form

### Mobile currently supports only part of this
Missing in mobile UI today:
- patient email
- `has_membership`
- multi-membership selection
- 4Ps category
- 4Ps relationship
- registered 4Ps beneficiary
- senior citizen ID
- PWD ID
- indigenous tribe
- custom/other membership fields

---

## B. Backend is improved, but still structurally compromised for memberships

### Current backend supports many fields already
Confirmed in:
- `backend/app/Http/Controllers/PatientController.php`
- `backend/app/Http/Controllers/Mobile/PatientProfileController.php`
- `backend/app/Models/PatientDetails.php`
- latest `patient_details` migrations

### Remaining structural issue
Advanced membership values are not modeled as proper structured records.

---

## C. Mobile booking flow still needs product separation

Current mobile booking lets the user choose:
- consultation
- vaccination

But both still route through intake-driven booking behavior.

### Risk
Vaccination booking may be using a consultation-style intake path even when a lighter follow-up flow would be more appropriate.

---

## D. Mobile login/onboarding still has placeholder UX
Still missing or incomplete:
- forgot password
- Google sign-in
- Apple sign-in
- clearer path between sign-up vs invitation activation

---

# Solution Plan

---

# Priority 1 — Highest Priority Tasks

These should be done first.

## 1. Introduce a proper membership data model

### Recommended action
Create a new backend table:
- `patient_memberships`

### Goal
Move membership-specific data out of overloaded generic string columns.

### What to include
- migration
- model
- patient relation
- create/update sync logic
- API serialization logic

### Files likely affected
- `backend/database/migrations/...create_patient_memberships_table.php`
- `backend/app/Models/Patient.php`
- `backend/app/Models/PatientDetails.php`
- `backend/app/Models/PatientMembership.php`
- `backend/app/Http/Controllers/PatientController.php`
- `backend/app/Http/Controllers/Mobile/PatientProfileController.php`

---

## 2. Freeze and define the official Form 1 field contract

### Goal
Create one source of truth for which fields are:
- required
- optional
- repeatable
- patient-level vs membership-level

### Recommended output
A small internal schema spec covering:
- web Form 1
- mobile Form 1
- backend API request format
- backend response format

### Why
Right now the UI has outrun the original data model.

---

## 3. Remove fragile JSON-in-string membership storage from new write paths

### Goal
Stop relying on serialized values in these fields for future writes:
- `other_membership`
- `other_membership_name`
- `other_membership_no`

### Transition strategy
- keep old columns temporarily for backward compatibility
- write new data into `patient_memberships`
- optionally backfill old data later

---

## 4. Standardize validation rules across web and mobile patient creation/update

### Problem
Current validation is close, but not truly centralized.

### Goal
Use the same logic for:
- web patient create
- web patient update
- mobile patient create

### Examples to standardize
- PhilHealth uniqueness
- yes/no membership values
- conditional 4Ps fields
- PWD/Senior/custom membership IDs
- DOB rules
- email rules

---

# Priority 2 — High Priority Tasks

## 5. Upgrade mobile Form 1/profile setup to match the final Form 1 contract

### Add to mobile UI
- patient email
- has membership toggle
- multi-membership support
- 4Ps category
- 4Ps relationship
- registered 4Ps beneficiary
- senior citizen ID
- PWD ID
- indigenous tribe
- custom membership name/id

### Files likely affected
- `mobile/lib/views/profile_setup_view.dart`
- `mobile/lib/models/patient_profile.dart`
- `mobile/lib/services/mobile_api.dart`

---

## 6. Expand mobile patient response models

### Goal
Support more than dropdown-level patient data.

### Recommendation
Split mobile models into:
- lightweight patient list item
- full patient profile/details model

### Why
Current `PatientProfile` is too thin for future:
- detail screen
- edit screen
- full Form 1 display

---

## 7. Update web patient detail/edit views to use structured membership data

### Goal
Avoid re-parsing generic JSON strings once `patient_memberships` exists.

### Files likely affected
- `frontend/src/features/patients/components/EditPatientModal.tsx`
- `frontend/src/features/patients/components/PatientDetailsModal.tsx`
- `frontend/src/features/queue/pages/QueuePatientDetailPage.tsx`
- `frontend/src/features/patients/services/patientService.ts`

---

# Priority 3 — Medium Priority Tasks

## 8. Split mobile booking flows by appointment type

### Recommended behavior
- `consultation` → requires bite intake
- `vaccination` → lighter booking flow or scheduled follow-up path

### Why
Current flow is functionally consultation-heavy.

### Files likely affected
- `mobile/lib/views/booking_view.dart`
- `mobile/lib/views/bite_intake_view.dart`
- `mobile/lib/models/booking_draft.dart`
- `mobile/lib/services/mobile_api.dart`
- `backend/app/Http/Controllers/Mobile/MobileAppointmentController.php`

---

## 9. Add richer booking fields if product requires them

Potential additions:
- preferred time slot
- reason/notes
- vaccination follow-up context
- duplicate booking prevention
- confirmation/review screen before submit

---

## 10. Improve conditional validation and inline field errors in web Form 1

### Recommended improvements
- validate conditional membership subfields inline
- validate PhilHealth number length consistently
- validate mobile-only and web-only conditional sections consistently
- ensure every section supports field-level errors

Files likely affected:
- `frontend/src/features/patients/components/AddPatientModal/AddPatientModal.tsx`
- `frontend/src/features/patients/components/AddPatientModal/sections/*.tsx`

---

# Priority 4 — Lower Priority / UX and polish

## 11. Finish mobile auth UX

### Implement or remove placeholders
- forgot password
- Google sign-in
- Apple sign-in

### Clarify onboarding paths
- self sign-up
- invitation activation
- existing patient record linking

Files likely affected:
- `mobile/lib/views/login_view.dart`
- `mobile/lib/views/sign_up_view.dart`
- `mobile/lib/views/patient_activation_view.dart`
- backend auth/reset endpoints if added

---

## 12. Add reporting/filtering support for memberships

Once memberships are structured, support:
- counts by membership type
- PWD / senior / 4Ps filtering
- printable summaries
- dashboard KPIs

---

## 13. Add mobile patient profile editing

After full parity exists:
- allow mobile users to edit patient profiles
- view full Form 1 data
- update details safely

---

# Suggested Implementation Phases

## Phase 1 — Data foundation
1. Create `patient_memberships` table
2. Add model + relationships
3. Update create/update controllers to support structured membership writes
4. Keep compatibility for old generic fields during transition

## Phase 2 — Contract alignment
1. Finalize official Form 1 field contract
2. Update mobile/web services and response shapes
3. Normalize validation rules

## Phase 3 — UI parity
1. Expand mobile profile setup
2. Update web edit/detail views
3. Remove old parsing hacks where possible

## Phase 4 — Booking and auth polish
1. Split booking by appointment type
2. Add optional booking enhancements
3. Finish mobile auth flows

---

# Recommended File-by-File Starting Checklist

## Backend
- [ ] Create `patient_memberships` migration
- [ ] Create `PatientMembership` model
- [ ] Add relation on `Patient`
- [ ] Update `PatientController@store`
- [ ] Update `PatientController@update`
- [ ] Update `Mobile\PatientProfileController@store`
- [ ] Add serializer/transformer strategy for memberships in API responses

## Web frontend
- [ ] Refactor `patientService.ts` to stop JSON stuffing when new backend is ready
- [ ] Update `EditPatientModal.tsx` to read/write structured memberships
- [ ] Update `PatientDetailsModal.tsx` to display structured memberships
- [ ] Add full field-level validation support to all Form 1 sections

## Mobile app
- [ ] Expand `profile_setup_view.dart` to full Form 1 parity
- [ ] Expand `mobile_api.dart` payload shape
- [ ] Create fuller patient details model
- [ ] Split booking flows by type
- [ ] Clarify login/signup/activation UX

---

# Final Recommendation

## Best long-term decision

**Do not keep expanding membership data inside generic string columns.**

### Recommended architecture
- keep `patient_details` for one-to-one patient demographics and Form 1 detail fields
- create a new normalized `patient_memberships` table for repeatable and program-specific memberships

This gives you:
- cleaner backend design
- easier mobile/web parity
- safer future migrations
- better reporting and filtering
- less fragile edit/detail logic

---

# Immediate Next Step

If execution starts now, the first concrete task should be:

> **Create and adopt `patient_memberships` as the long-term membership storage model while keeping temporary backward compatibility with current `patient_details` fields.**

That is the safest and most maintainable foundation for the rest of the work.
