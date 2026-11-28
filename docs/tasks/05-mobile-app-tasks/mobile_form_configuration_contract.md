# Mobile Form Configuration (Phase 1)

`GET /api/mobile/form-configuration` requires a patient-account Sanctum token. It is read-only and does not replace `GET /api/mobile/bite-intake-schema` (the latter publishes intake options and prohibited clinical fields).

Supply exactly one of these contexts:

| Query | Use | Clinic source |
|---|---|---|
| `clinic_id` | New patient profile | Explicitly selected existing clinic, consistent with the current mobile location/profile setup flow. |
| `patient_id` | Existing linked profile or new booking | Clinic on the account-linked patient. |
| `appointment_id` | Existing appointment accessible to the account | Clinic on the appointment booked by the account or belonging to an account-linked patient. |

`clinic_id` may accompany `patient_id` or `appointment_id` only if it matches. `patient_id` and `appointment_id` cannot be supplied together. Missing new-profile context returns 422. Unowned patient or appointment returns 404. This endpoint currently follows the existing mobile location behavior of accepting an explicit existing clinic ID for a new profile; authorization of a restricted clinic list is a separate deployment decision if a clinic directory is introduced.

Example response shape (abbreviated):

```json
{
  "schema_version": 1,
  "revision": 2,
  "clinic_id": 1,
  "profile": {
    "sections": {"address_section_enabled": true},
    "field_rules": {"blood_type": "optional"}
  },
  "intake": {
    "sections": {"bite_intake_section_enabled": true},
    "field_rules": {"bite_date": "required"},
    "payload_aliases": {"bite_date": "date_of_exposure"}
  }
}
```

The full response includes all existing configurable patient profile and patient-reported intake keys. It excludes fee, triage, treatment, and admin edit/history settings. `schema_version` tracks the configuration contract; `revision` tracks clinic updates. Neither is the version of the separate bite intake vocabulary contract.

Flutter clients can call `FormConfigurationRepository.forNewProfile`, `.forPatient`, or `.forAppointment`. Phase 1 added transport and typed parsing. A configuration response does not itself change the visible mobile controls; Phases 3–4 connect the screens to these rules.

Phase 2 now enforces applicable rules in the backend mobile create and update requests. Required profile fields return ordinary field errors; a consultation with an incomplete selected profile returns `profile.<field>` errors. A disabled intake section leaves a linked empty intake for registration check-in. Staff check-in uses a marked provisional incident date when the patient did not supply an exposure date. The Flutter profile and intake screens do not yet read this configuration; Phases 3–4 must update their field display, step validation, and submission payloads before a configured clinic can offer a consistent mobile experience.
