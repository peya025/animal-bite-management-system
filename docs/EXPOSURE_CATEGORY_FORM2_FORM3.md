# Exposure Category: Form 2 ownership

## Existing flow investigated

- `bite_incidents.severity` is the clinical source: `minor` = I, `moderate` = II, `severe` = III; `unassessed` has no category.
- Form 3 (`VaccinationRecordForm`) previously required an I/II/III radio selection, preferred the saved card category when loading, and posted it with vaccination data.
- `VaccinationRecordController::store` and `TagoloanTreatmentCardController::store` previously mapped the submitted category to incident severity. Both also saved the category on the existing `tagoloan_treatment_cards` row.
- Form 2 uses `useGeneralTreatmentForm`, `consultationService`, and `TreatmentRecordController`. Its save route is restricted to admin/triage/doctor. Before this change, it saved consultation/plan data but left severity untouched.
- Patient, queue, case, vaccination, prophylaxis, registration-report and analytics consumers use the linked bite incident. Treatment records are linked through `bite_id`; category is not a separate treatment-record column.
- DOH category filters still referenced an intake `bite_category` column absent from the current migrations. Filters now use incident severity. Report rows/counts use the existing severity-first `bite_category` accessor.
- Treatment-card API consumers, including mobile and print views, can read the card's category; they must prefer the linked incident over an older card snapshot.
- `/treatment-records` also contains a separate localStorage-only document editor, labeled Form 2 by its route. It has no patient/bite IDs or clinical API connection. That unrelated document workflow is unchanged.

## Current flow

1. GET `/api/treatment-records/patient/{patientId}?bite_id={biteId}` loads the selected episode's category, with a legacy card fallback when no assessed category exists.
2. Form 2 presents the same I/II/III choices and requires a selection. POST `/api/treatment-records` validates a supplied category and updates that episode's existing severity field after the existing authorization, relationship and treatment-lock checks.
3. Older clients omitting the field preserve the current severity. Invalid or empty submitted values are rejected. Category does not bypass the existing post-administration lock.
4. Form 3 retrieves the category from `/api/tagoloan-treatment-cards/patient/{patientId}?bite_id={biteId}` and renders informational text. It has no category in editable form state or the vaccination request payload.
5. An open Form 3 refreshes category on a Form 2 save event, window focus/visibility, and every 15 seconds while visible. Only category is refreshed, preserving unsaved nurse fields.
6. Both Form 3 save endpoints ignore category submitted by old/tampered clients. Existing card storage remains compatible, but its model accessor always prefers assessed incident severity. Legacy card-only values remain readable and are not cleared when no assessed category exists.

No migration, new category column, new category record, or existing-patient data rewrite is used. Other exposure fields, plans, dose schedules, queue transitions, and treatment locks retain their existing ownership and behavior.

## Verification

- `ExposureCategoryOwnershipTest`: all three values, updates, stale card reads, both Form 3 write paths, invalid values, authorization, episode/patient/clinic isolation, legacy records, post-treatment lock, and report filters.
- Existing suites: prophylaxis, triage/re-exposure, dual nurse workstations, DOH reports and print routes, registration reports, returning-patient check-in, consultation timestamps, and mobile workflow.
- `frontend/tests/registration/exposure-category.spec.ts`: real form components with mocked APIs; Form 2 save/update, read-only Form 3, live refresh, and unsaved nurse-field preservation.
- Read-only check of the local database: 8 existing incidents and 3 cards; no card/assessed-incident display mismatches. No local patient records were edited during verification.
