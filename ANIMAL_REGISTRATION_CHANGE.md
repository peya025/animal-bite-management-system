# Animal registration implementation handoff

Implemented locally only. No commit or push was made. Existing unrelated local changes were preserved.

Animal is now captured by registration on the bite incident, before Doctor Assessment or Nurse Treatment. Form 3 no longer edits or requires it. The Form 1 subtitle is unchanged. Doctor category, referral, vaccine administration and case/risk/status calculations were not changed.

One small database addition was necessary: existing nullable observation availability cannot distinguish an unanswered field from an explicit Unknown. The new `animal_available_answered` flag preserves that selection on reopening. The targeted migration was applied locally; all other animal fields reuse the existing schema. Historical null values remain unanswered because their original intent cannot be inferred.

## Modified and added files

- [frontend/src/features/patients/components/AddPatientModal/AnimalSection.tsx](C:/xampp/htdocs/ABC/animal-bite-management-system/frontend/src/features/patients/components/AddPatientModal/AnimalSection.tsx): New shared Animal section using the original segmented controls, options and two-column layout; unanswered fields have no selection.
- [frontend/src/features/patients/components/AddPatientModal/sections/RegistrationVitalsSection.tsx](C:/xampp/htdocs/ABC/animal-bite-management-system/frontend/src/features/patients/components/AddPatientModal/sections/RegistrationVitalsSection.tsx): Places Animal after the CHU/RHU transaction section and immediately before Consultation Details & Vitals. Also covers returning-patient re-exposure registration.
- [frontend/src/features/patients/types/patient.types.ts](C:/xampp/htdocs/ABC/animal-bite-management-system/frontend/src/features/patients/types/patient.types.ts): Adds optional animal values and selected incident ID to enrolment state, including draft state.
- [frontend/src/features/patients/services/patientService.ts](C:/xampp/htdocs/ABC/animal-bite-management-system/frontend/src/features/patients/services/patientService.ts): Includes answered animal fields in registration submissions.
- [frontend/src/features/patients/components/PatientDetailsModal.tsx](C:/xampp/htdocs/ABC/animal-bite-management-system/frontend/src/features/patients/components/PatientDetailsModal.tsx): Sends animal fields when registering a new exposure for an existing patient.
- [frontend/src/features/patients/components/EditPatientModal.tsx](C:/xampp/htdocs/ABC/animal-bite-management-system/frontend/src/features/patients/components/EditPatientModal.tsx): Adds an explicit bite-incident selector for editing animal answers; restores saved incident values and preserves drafts.
- [frontend/src/features/queue/components/QueuePatientDetailModal.tsx](C:/xampp/htdocs/ABC/animal-bite-management-system/frontend/src/features/queue/components/QueuePatientDetailModal.tsx): Shows incident animal information read-only in Form 1; preserves pre-existing local changes.
- [frontend/src/features/vaccinations/components/VaccinationRecordForm.tsx](C:/xampp/htdocs/ABC/animal-bite-management-system/frontend/src/features/vaccinations/components/VaccinationRecordForm.tsx): Removes editable Animal controls, animal-required checks, and animal fields from nurse submissions, including old draft values.
- [frontend/src/features/bite-cases/components/BiteMap/BiteMap.tsx](C:/xampp/htdocs/ABC/animal-bite-management-system/frontend/src/features/bite-cases/components/BiteMap/BiteMap.tsx): Formats Dog, Cat, Other and Unknown in marker popups; preserves pre-existing map changes.
- [backend/app/Support/RegistrationAnimal.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/app/Support/RegistrationAnimal.php): Centralizes registration animal validation and conversion to existing incident fields. Blank values are omitted from updates.
- [backend/app/Http/Requests/Clinical/StorePatientRequest.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/app/Http/Requests/Clinical/StorePatientRequest.php): Validates animal answers on initial registration.
- [backend/app/Http/Requests/Clinical/RegisterExposureRequest.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/app/Http/Requests/Clinical/RegisterExposureRequest.php): Validates animal answers for returning-patient new exposures.
- [backend/app/Http/Requests/Clinical/UpdatePatientRequest.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/app/Http/Requests/Clinical/UpdatePatientRequest.php): Validates that the selected incident belongs to this patient and clinic; restricts animal editing to registration/admin/developer roles.
- [backend/app/Services/Clinical/PatientService.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/app/Services/Clinical/PatientService.php): Saves animal answers in the registration transaction, scopes edits to an explicitly selected incident, and invalidates relevant case/statistics caches.
- [backend/app/Services/Clinical/BiteCaseService.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/app/Services/Clinical/BiteCaseService.php): Saves animal answers on new exposure registration; prefers saved incident species over intake data in location analytics.
- [backend/app/Services/Clinical/TagoloanTreatmentCardService.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/app/Services/Clinical/TagoloanTreatmentCardService.php): Stops nurse card submissions overwriting incident animal fields; preserves legacy card species/details if incident species is absent.
- [backend/app/Services/VaccinationRecordService.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/app/Services/VaccinationRecordService.php): Stops vaccination submissions overwriting incident animal fields; handles unanswered species without defaulting the incident to Dog.
- [backend/app/Services/DohReportService.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/app/Services/DohReportService.php): Prefers incident species over older intake values for reports.
- [backend/app/Models/BiteIncident.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/app/Models/BiteIncident.php): Adds the observation-answer flag to mass assignment and boolean casting.
- [backend/database/migrations/2026_11_07_160000_track_registration_observation_answer.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/database/migrations/2026_11_07_160000_track_registration_observation_answer.php): Adds one boolean flag to distinguish explicitly selected Unknown observation availability from unanswered. Existing species and animal values are untouched. Applied locally.
- [backend/tests/Feature/RegistrationAnimalTest.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/tests/Feature/RegistrationAnimalTest.php): New regression tests for registration persistence, map data/statuses, species totals, editing isolation, blanks, explicit Unknown, and invalid input.
- [backend/tests/Feature/TriageDoctorAndReExposureTest.php](C:/xampp/htdocs/ABC/animal-bite-management-system/backend/tests/Feature/TriageDoctorAndReExposureTest.php): Updates a nurse regression to verify stale Cat input cannot replace registered Dog.
- [frontend/tests/registration/registration.spec.ts](C:/xampp/htdocs/ABC/animal-bite-management-system/frontend/tests/registration/registration.spec.ts): Adds browser coverage for blank defaults, section order, two-column positioning, selections and draft restoration.

## Verification

- TypeScript project check (`npx tsc -b --pretty false`): passed.
- Selected backend regression suite: **43 tests, 440 assertions passed**. PHPUnit reports one existing test discovery warning (`VaccineCategoryRelationshipTest` class missing), so its process exits with a warning status despite passing assertions.
- Included suites: RegistrationAnimalTest, CategoryITreatmentLogicTest, TriageDoctorAndReExposureTest, ExposureCategoryOwnershipTest, DohReportsTest, BiteMapDetailsTest.
- New browser test: **passed**. Verified initially unanswered controls, requested section order, two columns, selected values and draft restoration. Screenshot visually reviewed.
- Broad registration browser suite: **12 passed, 17 failed**. Failures involve registration selectors/timeouts, doctor/nurse harness controls, print logos, reports and signatures. This run was not a clean full-suite pass, and no baseline comparison was performed to establish that every failure predates this change. Unrelated workflows were not rewritten to satisfy those tests.
- Registration animal tests exercise Dog, Cat and Other through the registration API, then actual map API responses across completed/transferred/active states; confirm species totals and multiple-incident edit isolation. Status changes in the new test are fixtures, not a full interactive doctor/referral walkthrough. Separate existing backend suites cover Category I and re-exposure workflows.
- Map inclusion rules remain unchanged: a case still needs the existing assessed severity, exposure place and eligible status to appear. Animal data is saved immediately at Form 1 even while the incident is awaiting assessment.

## Review notes

Reopen the patient's edit form and select the intended bite incident to inspect or edit its animal answers. Demographic-only edits do not target an incident. Empty animal values cannot erase saved answers. Nurse saves cannot replace them with stale defaults.

The existing Bite Cases Summary and registration analytics already read bite incident fields. Saving to that source fixes their species data without changing counts or classifications. DOH report precedence was adjusted to use the same source.

Pre-existing changes in the BiteCaseController, API routes, map-details modal, map tests and map browser configuration were left intact and are not part of this feature's file list.
