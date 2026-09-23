# Mobile Bite Intake Alignment with Web Forms 1, 2, and 3

## Purpose

Make the mobile workflow follow the existing clinic web forms while showing and collecting only information appropriate for a patient.

The mobile application must not become a separate clinical form. It should be a patient-facing projection of the shared clinic data model:

- Form 1 remains the source of patient demographic, address, contact, and membership information.
- Mobile bite intake collects factual, patient-reported exposure history that is useful to Form 2 and Form 3.
- Form 2 remains the doctor's authoritative assessment, diagnosis, and treatment decision.
- Form 3 remains the nurse/clinic treatment and vaccination record for a doctor-approved episode.
- Registration check-in confirms physical arrival and creates the queue entry; booking alone must not create a ghost queue.

This document is the implementation plan. It does not authorize mobile users to enter clinical findings or treatment decisions.

## Investigation Summary

### What is already connected

- Mobile profile setup writes to the same patient, patient-detail, address, and membership records used by web Form 1.
- A mobile consultation booking can carry a separate patient-reported bite intake.
- Registration check-in links the appointment, intake, bite episode, and Doctor queue.
- Web Form 2 can show the original mobile report separately from the clinician-confirmed assessment.
- Web Form 3 is episode-specific and is gated by the Doctor's approved plan.

### What is not yet consistently aligned

The workflow is connected, but the mobile intake and the web forms still define some of the same concepts independently. This creates vocabulary and meaning drift.

| Concept | Current mismatch | Required direction |
|---|---|---|
| Exposure field name | Mobile/API uses `exposure_type`; other layers use `exposure_mode` or `mode_of_exposure` | Define one canonical domain name and map legacy storage names through adapters |
| Exposure date/place | Intake uses incident/bite variants while Form 3 uses `date_of_exposure` and `place_of_exposure` | Use one shared contract while retaining backward-compatible database mappings |
| Body site | Mobile has a broad group plus a separate overlapping location list; Form 3 has six body groups plus exact text | Adopt the Form 3 group model, exact body-site detail, and laterality across the patient-safe flow |
| Animal species | Mobile includes Dog, Cat, Bat, Monkey, Unknown, and Others; Form 3 exposes Dog, Cat, and Other | Publish one shared option list and update both mobile and web to consume it |
| Animal status | `animal_status` currently represents ownership in some code, which is ambiguous | Separate species, ownership, availability for observation, and reported condition |
| Previous history | Mobile asks about previous rabies vaccination; Form 3 asks about past bite and completed PEP | Record past bite history and prior PEP as different patient-reported facts |
| Clinical authority | Patient-reported values can resemble Form 2/Form 3 fields | Preserve a raw intake source and require clinician confirmation before values become authoritative |
| Validation/options | Flutter, React, and Laravel contain duplicated lists and rules | Publish a versioned shared schema/dictionary and add contract tests |

## Non-Negotiable Ownership Rules

| Information | Owner/source | Mobile behavior | Clinic behavior |
|---|---|---|---|
| Patient demographics and membership | Form 1 / patient record | Display selected patient; edit through mobile profile, not bite intake | Registration verifies/corrects Form 1 |
| Incident facts and history | Patient-reported intake | Collect and label as unverified | Form 2 compares and confirms/corrects |
| WHO exposure category and severity | Doctor | Do not ask or infer | Doctor records in Form 2 |
| Clinical wound findings and diagnosis | Doctor | Do not collect | Doctor records in Form 2 |
| Vaccine/RIG/PEP decision | Doctor | Do not collect or calculate | Doctor records treatment plan in Form 2 |
| Vaccine/RIG actually administered | Nurse/authorized clinic staff | Do not collect | Record in Form 3 |
| Queue number and workflow status | System/Registration | Show appointment/check-in status only | Check-in creates one queue entry |

Using the same labels and option identifiers does not make a mobile answer clinically authoritative. The original intake and the clinician-confirmed record must remain separate and auditable.

## Patient-Safe Projection of the Web Forms

### Form 1: reuse, do not duplicate in bite intake

The selected patient profile should supply these values to the booking flow as read-only context:

- First, middle, and last name; suffix
- Date of birth
- Sex/gender
- Contact number and email
- Address
- Emergency contact
- Blood type, if known
- Civil status and spouse details, when applicable
- Mother/guardian information, when applicable
- Education, employment, and family information already supported by Form 1
- PhilHealth, 4Ps, DSWD NHTS, and other membership details already supported by Form 1

Mobile may offer an `Update profile` action when these are missing or incorrect, but it must not ask for a second copy inside bite intake.

Form 1-only clinic workflow fields such as visit type, queue priority, registration verification, and staff workflow state must not be editable by the patient as intake data.

### Form 2: patient-appropriate questions

Mobile should collect these facts using the same labels and value identifiers used by the corresponding web exposure assessment:

- Date of exposure
- Approximate time of exposure
- Place of exposure
- Plain-language account of what happened
- Reported mode of exposure, including an `Unsure` option
- Body-part group
- Specific body part or wound location in plain language
- Laterality: left, right, both/multiple, or not applicable
- Animal species and an `Other` detail when needed
- Animal ownership: owned, stray, or unknown
- Whether the animal is available for observation
- Patient-reported condition: apparently healthy, sick, dead, or unknown
- Whether the wound was washed
- Washing method and approximate duration
- First aid or treatment already received
- Referring or previous facility, when applicable

All of these must be labelled `Patient-reported - clinic verification required` in the intake review and in Form 2.

### Form 3: patient-appropriate history only

The mobile intake may collect factual history that Form 3 needs, but it must not fill the nurse's treatment record directly:

- Previous animal-bite history: yes, no, or unsure
- Approximate previous bite date or dates, when known
- Previous PEP/rabies vaccination: completed, incomplete, none, or unsure
- Approximate PEP/vaccination date
- Facility where it was received, when known
- Optional proof/card upload in a future phase, stored as unverified evidence

Past bite history, prior PEP completion, and previous vaccination are related but not interchangeable. They require separate fields.

### Fields excluded from mobile

The following stay in the clinic web workflow:

- WHO Category I, II, or III
- Clinical severity
- Diagnosis and ICD-10 code
- Official clinical chief complaint
- Clinical wound description or findings
- Vital signs and laboratory findings
- Final animal rabies/observation status
- Vaccine or booster regimen decision
- Vaccine brand, batch, expiry, dose, route, schedule, and administration site
- RIG indication, product, and dosage
- Tetanus or other medication decision
- Prescriptions and orders
- Provider and nurse names or signatures
- Treatment administration dates and inventory deductions
- Doctor approval and clinical notes

## Proposed Canonical Contract

The contract should describe domain meaning independently from legacy table column names. Existing columns can be supported by serializers/adapters during migration.

### Form 1 reference

- `patient_id`
- `profile_version` or `profile_updated_at`
- No duplicated demographic snapshot unless audit/legal requirements explicitly require one

### Patient-reported intake

- `date_of_exposure`
- `time_of_exposure`
- `place_of_exposure`
- `incident_narrative`
- `reported_mode_of_exposure`
- `body_part_group`
- `body_part_detail`
- `laterality`
- `animal_species`
- `animal_species_other`
- `animal_ownership`
- `animal_available_for_observation`
- `animal_condition_reported`
- `wound_washed`
- `wash_method`
- `wash_duration_minutes`
- `care_received`
- `referral_source`
- `past_bite_history`
- `past_bite_dates`
- `prior_pep_status`
- `prior_pep_date`
- `prior_pep_facility`
- `schema_version`
- `submitted_at`

### Provenance and clinical confirmation

- Patient values stay in `bite_incident_intakes`.
- Clinician-confirmed values stay in the episode/clinical assessment records.
- Form 2 displays both values side by side when they differ.
- `clinically_reviewed_by` and `clinically_reviewed_at` record the review.
- Form 3 reads the confirmed episode and Doctor plan by `bite_id`, not the latest patient intake.

## Recommended Shared Dictionaries

The exact identifiers must be approved once and consumed by mobile, web, and backend validation.

### Body-part groups

Use the Form 3 grouping as the shared starting point:

- Head and neck
- Upper extremities
- Lower extremities
- Trunk/torso
- Multiple sites
- Not applicable for ingestion/handling exposure

Add a plain-text body-part detail and laterality instead of maintaining a second, overlapping fixed list.

### Animal species

Recommended shared list:

- Dog
- Cat
- Bat
- Monkey/non-human primate
- Other
- Unknown

This intentionally expands the current web Form 3 list rather than discarding facts already supported by mobile. The web, mobile, backend, reports, and tests must all change together.

### Previous exposure and PEP

Use separate concepts:

- `past_bite_history`: yes, no, unsure
- `prior_pep_status`: completed, incomplete, none, unsure

Do not translate a prior vaccination answer directly into `pep_completed` without clinic verification.

## Affected Areas

### Mobile application

| Area | Expected change |
|---|---|
| `mobile/lib/views/profile_setup_view.dart` | Confirm Form 1 option/value parity and keep demographic editing outside intake |
| `mobile/lib/models/patient_profile.dart` | Add explicit adapters for web/API aliases such as sex/gender and emergency-contact naming |
| `mobile/lib/views/bite_intake_view.dart` | Reorganize sections to mirror the patient-safe Form 1/2/3 projection; replace overlapping body fields; add distinct bite/PEP history |
| `mobile/lib/models/bite_intake_draft.dart` | Move to canonical contract keys and retain backward-compatible decoding during rollout |
| `mobile/lib/services/mobile_api.dart` | Send schema version and canonical values; parse validation errors consistently |
| Mobile mock data and tests | Update fixtures, serialization tests, validation tests, and review-screen widget tests |

### Web Form 1

| Area | Expected change |
|---|---|
| `frontend/src/features/patients/types/patient.types.ts` | Normalize field aliases used by mobile and web |
| Add-patient Form 1 sections/options | Move reusable option identifiers to shared frontend constants generated from or checked against the backend contract |
| `frontend/src/features/patients/components/PatientDetailsModal.tsx` | Verify mobile-updated profile values render without special-case mappings |

### Web Form 2

| Area | Expected change |
|---|---|
| `frontend/src/features/consultations/components/GeneralTreatmentForm.tsx` | Load the versioned patient intake and preserve the confirmation gate |
| `frontend/src/features/consultations/components/ExposureAssessmentSection.tsx` | Render matching labels/options for reported and confirmed values, including prior bite/PEP history where clinically useful |
| Consultation types, constants, hooks, and services | Replace local duplicate enums with canonical identifiers and typed adapters |
| Form 2 submission | Continue writing only clinician-confirmed values to authoritative clinical records |

### Web Form 3

| Area | Expected change |
|---|---|
| `frontend/src/features/vaccinations/components/VaccinationRecordForm.tsx` | Consume the shared exposure/body/animal identifiers and confirmed history; keep clinical and administration fields staff-only |
| `frontend/src/features/vaccinations/components/TagoloanTreatmentCardModal.tsx` | Verify episode-specific loading and display of confirmed values |
| Form 3 types/services | Stop maintaining separate option lists and preserve `bite_id` scoping |

### Backend and API

| Area | Expected change |
|---|---|
| `backend/app/Http/Controllers/Mobile/PatientProfileController.php` | Normalize Form 1 aliases and return one profile representation |
| `backend/app/Http/Controllers/Mobile/MobileAppointmentController.php` | Validate the versioned patient-safe intake contract and support old mobile payloads during transition |
| `backend/app/Http/Controllers/BiteIncidentIntakeController.php` | Return normalized intake data and provenance for Form 2 |
| `backend/app/Http/Controllers/TreatmentRecordController.php` | Map confirmed Form 2 values without treating raw intake as diagnosis |
| Vaccination/treatment-card controllers | Read confirmed episode fields by `bite_id`; never select the latest intake by patient alone |
| Routes/API resources | Add a read-only intake schema/options endpoint or equivalent versioned contract source |
| Authorization policies | Enforce patient, Registration, Doctor, and Nurse field ownership server-side |

### Database and models

Affected records include:

- `patients`
- `patient_details`
- patient membership tables
- `appointments`
- `bite_incident_intakes`
- `bite_incidents`
- `treatment_plans`
- `treatment_records`
- treatment/vaccination cards
- `queues`

Expected schema work:

- Add missing canonical intake fields and `schema_version`.
- Preserve raw patient submissions and audit timestamps.
- Use nullable/unassessed clinical values before Form 2.
- Add indexes/constraints supporting `clinic_id + patient_id + bite_id` where appropriate.
- Do not destructively rename legacy columns in the first release; use compatibility mappings and backfill first.

### Reports and operational workflows

The following must be regression-tested because vocabulary or episode linkage changes can alter their output:

- Registration and queue dashboards
- Doctor consultation queue
- Nurse treatment queue
- DOH/clinic reports
- Exposure location/body-site/animal summaries
- Patient treatment history and vaccination cards
- Reconciliation/audit commands

Raw, unassessed mobile answers must not be counted as confirmed diagnoses or WHO exposure categories.

## Implementation Phases

### Phase 0 - Approve the field matrix

1. Review the inclusion/exclusion lists with Registration, a Doctor, and a Nurse.
2. Approve exact option identifiers for exposure mode, body group, animal species, and history.
3. Approve which Form 1 fields a patient may update from mobile.
4. Freeze contract version `v1` before code changes.

Deliverable: approved source-of-truth matrix and versioned contract specification.

Exit criteria: every field has a definition, owner, allowed role, null/unsure behavior, and destination.

### Phase 1 - Establish one shared contract

1. Add a backend-owned, versioned schema/options definition.
2. Add typed frontend and Flutter representations of the same identifiers.
3. Add compatibility maps for legacy names such as `exposure_type`, `exposure_mode`, and `mode_of_exposure`.
4. Add contract tests that fail when mobile, web, and backend option values drift.

Deliverable: one testable data dictionary used across all three clients/layers.

Exit criteria: no exposure/body/animal enum is independently hard-coded without a parity test.

### Phase 2 - Align Form 1 and mobile profile

1. Map sex/gender, emergency-contact, address, and membership aliases explicitly.
2. Make booking show the selected patient summary as read-only.
3. Route corrections to profile editing rather than duplicating fields in bite intake.
4. Verify the same saved patient renders correctly in web Forms 1, 2, and 3.

Deliverable: one shared patient profile with no demographic duplication in intake.

Exit criteria: updating an allowed mobile profile field is visible in the corresponding web patient record.

### Phase 3 - Rebuild the mobile intake as a patient-safe projection

1. Reorder the mobile steps to follow the patient-safe Form 2/Form 3 field sequence.
2. Replace overlapping body location fields with group, detail, and laterality.
3. Use the shared animal and exposure dictionaries.
4. Split past bite history from previous PEP/vaccination history.
5. Add `Unsure` choices and conditional validation.
6. Keep the review screen and display the patient-reported warning.
7. Submit `schema_version` with the payload.

Deliverable: mobile UI and payload aligned with the web vocabulary, with no clinical-only fields.

Exit criteria: every mobile intake answer has a defined destination in the Form 2 comparison view or verified Form 3 history.

### Phase 4 - Add backend compatibility and provenance

1. Add non-destructive schema fields and migrations.
2. Accept both legacy and canonical payloads for a defined mobile support window.
3. Normalize responses to the canonical contract.
4. Preserve the original raw submission and schema version.
5. Enforce allowed patient fields on the server; reject clinical fields even if manually submitted.
6. Keep booking separate from check-in and make check-in idempotent.

Deliverable: backward-compatible API and auditable intake storage.

Exit criteria: old and new supported mobile versions can book, and neither can write clinical decisions.

### Phase 5 - Align Form 2 verification

1. Load the exact intake tied to the current appointment/episode.
2. Show patient-reported values beside separate clinician-confirmed controls.
3. Use matching labels/options while retaining separate ownership.
4. Require explicit Doctor confirmation of incident facts and clinical category.
5. Store confirmer and timestamp.
6. Ensure no default category, severity, diagnosis, or plan is derived from the intake.

Deliverable: an explicit raw-to-confirmed Form 2 workflow.

Exit criteria: Form 2 cannot be completed through silent defaults, and the original patient report remains unchanged.

### Phase 6 - Align and protect Form 3

1. Load demographics from Form 1 and confirmed episode data from Form 2.
2. Map verified past bite/PEP history into the treatment card where required.
3. Keep patient-reported history visibly unverified until staff confirmation.
4. Keep diagnosis, plan, vaccine/RIG selection, administration, inventory, and signatures staff-only.
5. Require the correct Doctor-approved `bite_id` before Form 3 opens.

Deliverable: one episode-specific clinic treatment card using confirmed shared data.

Exit criteria: mobile data cannot directly create or alter a treatment administration record.

### Phase 7 - Reconcile existing data

1. Run the existing audit in report-only mode.
2. Add mismatch reporting for legacy names, invalid enum values, ambiguous animal status, overlapping body-site values, and conflated PEP history.
3. Automatically backfill only deterministic mappings.
4. Place ambiguous records in a staff-review report instead of guessing.
5. Retain before/after reports and a database backup.

Deliverable: reviewed migration report, deterministic backfill, exception list, and rollback procedure.

Exit criteria: no historical diagnosis, category, or treatment decision is invented by migration.

### Phase 8 - Test and release

1. Run backend feature tests for validation, permissions, check-in idempotency, and episode linkage.
2. Add frontend component tests for raw-versus-confirmed rendering and Form 3 gates.
3. Add Flutter model, validation, serialization, and widget tests.
4. Add end-to-end scenarios from mobile booking through Registration, Form 2, and Form 3.
5. Release backend compatibility first, then web, then mobile.
6. Monitor old/new schema versions, validation failures, duplicate queues, and unmatched episodes.

Deliverable: staged release with observability and rollback steps.

Exit criteria: supported old clients remain functional during rollout, and the new workflow passes clinic user acceptance testing.

## Required End-to-End Test Scenarios

- Mobile profile data appears consistently in Forms 1, 2, and 3.
- Bite intake does not duplicate patient demographics.
- A booking creates an appointment/intake but no live queue ticket.
- Registration check-in creates exactly one Doctor queue entry on retry or double-click.
- A patient cannot submit WHO category, diagnosis, treatment plan, or administration fields through a modified API request.
- Form 2 loads the intake tied to the selected episode, not the latest intake for the patient.
- Reported and confirmed values can differ without overwriting either record.
- Form 2 requires explicit Doctor confirmation.
- Form 3 stays locked until the Doctor-approved plan exists.
- A Nurse cannot change the Doctor's plan through Form 3.
- Multiple bite episodes for one patient remain separated by `bite_id`.
- Previous cards and treatment records are not overwritten by re-exposure.
- Reports exclude unassessed intake values from clinical totals.
- Legacy and canonical payloads produce the same normalized intake during the compatibility window.
- Invalid or unknown legacy values are flagged for review, not silently recoded.

## Recommended Execution Order

1. Approve the field matrix and shared dictionaries.
2. Implement the backend-owned versioned contract and compatibility mappings.
3. Align Form 1/mobile profile aliases.
4. Update Form 2 and Form 3 to consume the shared contract.
5. Update the mobile intake to the approved patient-safe subset.
6. Reconcile historical records.
7. Complete end-to-end testing and staged deployment.

The backend compatibility layer should be deployed before the mobile update so older installed app versions continue to work.

## Decisions Required Before Implementation

The plan recommends these defaults unless clinical stakeholders reject them:

1. Expand the shared animal list to Dog, Cat, Bat, Monkey/non-human primate, Other, and Unknown, then update web and mobile together.
2. Use Form 3's six body-part groups plus free-text detail and laterality; remove the mobile-only overlapping location enum.
3. Store previous bite history separately from prior PEP status.
4. Keep raw intake and confirmed clinical values in separate records even when their labels and option identifiers match.
5. Use a non-destructive compatibility period rather than immediately renaming existing database columns.

## Definition of Done

- Mobile shows only patient-appropriate fields derived from the web workflow.
- Form 1 is the single source for patient demographic and membership information.
- Mobile and web use the same approved labels, identifiers, and validation meanings.
- Patient-reported intake remains separate from clinician-confirmed data.
- Registration check-in, not booking, creates the queue entry.
- Form 2 exclusively owns assessment, diagnosis, and treatment planning.
- Form 3 exclusively owns authorized treatment administration and inventory use.
- Every booking, intake, episode, queue entry, plan, and administration record is tied to the correct `bite_id`.
- Automated contract and end-to-end tests prevent future mobile/web drift.