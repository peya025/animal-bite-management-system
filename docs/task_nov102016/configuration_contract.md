# Animal Bite Management System — Module Configuration Contract

**Document Version:** 1.0.0  
**Effective Date:** 11 November 2026  
**Owner:** Person 1 (Backend Implementer & Configuration Contract Owner)  
**Stakeholders:** Person 2 (Frontend Admin Editor), Person 3 (Form Integration), Person 4 (Station Workflow)  
**Status:** Approved & Implemented  

---

## 1. Overview & Architecture

This document defines the authoritative, clinic-scoped, versioned contract for the **Clinic Module Configuration API**. All frontend components (Admin Editor, Form Composers, Queue Handlers) and backend services MUST adhere to this contract.

### Core Architectural Guarantees
1. **Strict Clinic Scoping:** Configuration is strictly scoped to the authenticated user's clinic (`$request->user()->clinic_id`). There is NO implicit fallback to `Clinic::first()`. Users without an associated clinic receive a controlled HTTP 422 denial. Extraneous `clinic_id` in request payloads is ignored.
2. **Optimistic Locking / Concurrency Control:** Every update request MUST supply the expected `revision` counter. If the supplied revision does not match the stored revision, the update is rejected with **HTTP 409 Conflict**, preventing concurrent overwrites.
3. **Atomic Persistence & Change Auditing:** Configuration changes and audit log entries are committed within a single database transaction. No-op requests (identical values) do not increment the revision or create empty audit logs. Failed or conflicting requests never produce successful change logs.
4. **Controlled Input Validation:** All booleans are strictly validated (`boolean`, non-null). Null boolean values produce field-specific **HTTP 422** errors rather than HTTP 500 server crashes. Unknown stations, sections, or field rules are rejected with actionable 422 errors.
5. **Idempotent Normalization & Non-destructive Defaults:** Initial clinic setup (`ClinicSetupService`) and reseeding (`DefaultClinicConfigSeeder`) use centralized canonical defaults and never overwrite existing clinic customizations.

---

## 2. API Endpoints

Both primary paths and backwards-compatibility aliases are supported:

| Action | Primary Route | Rollout Compatibility Route | Access Level | Description |
|---|---|---|---|---|
| **GET** | `/api/clinic-module-config` | `/api/setup/module-config` | Authenticated staff | Returns normalized configuration for user's clinic. Returns `can_edit: true` for admins, `false` for staff/developers. |
| **PUT** | `/api/clinic-module-config` | `/api/setup/module-config` | Admin only | Atomically updates configuration if `revision` matches. Increments revision and logs audit diff. |
| **GET** | `/api/clinic-module-config/history` | `/api/setup/module-config/history` | Admin only | Returns audit log history of configuration updates for the clinic. |

**Required Request Headers:**
```http
Authorization: Bearer <sanctum_token>
Accept: application/json
Content-Type: application/json
```

---

## 3. Authoritative Catalog of Keys & Rules

### 3.1 Station Capabilities (3 Keys)
Station flags indicate whether specific workstations/modules are enabled for the clinic.

| Key | Storage Column | Type | Default | Configurable | Description |
|---|---|---|---|---|---|
| `triage_module_enabled` | `triage_module_enabled` | `boolean` | `true` | Yes | Triage station queue & assessment |
| `registration_module_enabled` | `registration_module_enabled` | `boolean` | `true` | Yes | Patient registration & intake |
| `treatment_module_enabled` | `treatment_module_enabled` | `boolean` | `true` | Yes | Vaccination & treatment station |

### 3.2 Canonical Section Flags (7 Keys)
Controls visibility of major form sections across the application.

| Key | Storage Column | Type | Default | Configurable | Notes |
|---|---|---|---|---|---|
| `patient_registration_enabled` | `patient_registration_enabled` | `boolean` | `true` | Yes | Patient identity form block |
| `address_section_enabled` | `address_section_enabled` | `boolean` | `true` | Yes | Purok, Barangay, Municipality |
| `socioeconomic_section_enabled` | `socioeconomic_section_enabled` | `boolean` | `true` | Yes | Education, employment, family |
| `gov_programs_section_enabled` | `gov_programs_section_enabled` | `boolean` | `true` | Yes | PhilHealth, 4Ps, DSWD NHTS |
| `bite_intake_section_enabled` | `bite_intake_section_enabled` | `boolean` | `true` | Yes | Incident date, place, washing |
| `triage_section_enabled` | `triage_section_enabled` | `boolean` | `true` | Yes | Clinical assessment & category |
| `treatment_section_enabled` | `treatment_section_enabled` | `boolean` | `true` | Yes | Vaccine brand, route, dosage |

### 3.3 Canonical Field Rules (41 Keys)
Each field rule must be one of: `'required'`, `'optional'`, or `'hidden'`.

| Category | Field Rule Key | Default | Allowed Values | Locked? |
|---|---|---|---|---|
| **Registration** | `blood_type` | `optional` | `required,optional,hidden` | No (RF1) |
| | `mother_maiden_name` | `optional` | `required,optional,hidden` | No |
| | `civil_status` | `optional` | `required,optional,hidden` | No |
| | `spouse_name` | `optional` | `required,optional,hidden` | No (CF1 - Married condition) |
| **Address** | `address_municipality` | `required` | `required,optional,hidden` | No |
| | `address_barangay` | `required` | `required,optional,hidden` | No |
| | `address_purok` | `optional` | `required,optional,hidden` | No |
| | `province` | `required` | `required,optional,hidden` | No |
| **Socioeconomic**| `educational_attainment` | `optional` | `required,optional,hidden` | No |
| | `employment_status` | `optional` | `required,optional,hidden` | No |
| | `family_member` | `optional` | `required,optional,hidden` | No |
| **Gov Programs** | `philhealth_member` | `optional` | `required,optional,hidden` | No |
| | `philhealth_status` | `optional` | `required,optional,hidden` | No |
| | `philhealth_no` | `optional` | `required,optional,hidden` | No |
| | `philhealth_category` | `optional` | `required,optional,hidden` | No |
| | `fourps_member` | `optional` | `required,optional,hidden` | No |
| | `dswd_nhts` | `optional` | `required,optional,hidden` | No |
| **Bite Incident** | `bite_date` | `required` | `required,optional,hidden` | No |
| | `bite_place` | `required` | `required,optional,hidden` | No |
| | `site_washed` | `required` | `required,optional,hidden` | No |
| | `exposure_type` | `required` | `required,optional,hidden` | No |
| | `animal_type` | `required` | `required,optional,hidden` | No |
| | `animal_status` | `required` | `required,optional,hidden` | No |
| | `animal_captured` | `optional` | `required,optional,hidden` | No |
| | `wound_location` | `required` | `required,optional,hidden` | No |
| | `patient_description`| `optional` | `required,optional,hidden` | No |
| **Triage** | `exposure_category` | `required` | `required` | **YES (LF1 - Locked clinical invariant)** |
| | `bite_site` | `required` | `required,optional,hidden` | No |
| | `animal_observation_status` | `optional` | `required,optional,hidden` | No |
| | `treatment_given` | `optional` | `required,optional,hidden` | No (RF2) |
| **Treatment** | `protocol_type` | `required` | `required,optional,hidden` | No |
| | `route` | `optional` | `required,optional,hidden` | No (RF3) |
| | `injection_site` | `optional` | `required,optional,hidden` | No |
| | `dosage_ml` | `optional` | `required,optional,hidden` | No |
| | `vaccine_brand` | `optional` | `required,optional,hidden` | No |
| | `vaccine_generic` | `optional` | `required,optional,hidden` | No |
| | `batch_no` | `optional` | `required,optional,hidden` | No |
| | `tt_status` | `optional` | `required,optional,hidden` | No |
| | `medication_given` | `optional` | `required,optional,hidden` | No |
| | `adverse_reaction` | `optional` | `required,optional,hidden` | No |
| | `cost_recovery` | `optional` | `required,optional,hidden` | No |

### 3.4 Legacy Alias Normalization
During data migration and legacy imports, historical keys map as follows:
- `bite_location` &rarr; `wound_location` (and mirrors to `bite_site` if uncustomized)
- `wound_washing` &rarr; `site_washed`
- `philhealth_info` &rarr; `philhealth_status`
- `fourps_info` &rarr; `fourps_member`

---

## 4. Request & Response Schemas

### 4.1 GET Response Schema (`200 OK`)
```json
{
  "schema_version": 1,
  "revision": 2,
  "clinic_id": 1,
  "can_edit": true,
  "triage_module_enabled": true,
  "registration_module_enabled": true,
  "treatment_module_enabled": true,
  "patient_registration_enabled": true,
  "address_section_enabled": true,
  "socioeconomic_section_enabled": true,
  "gov_programs_section_enabled": true,
  "bite_intake_section_enabled": true,
  "triage_section_enabled": true,
  "treatment_section_enabled": true,
  "field_rules": {
    "blood_type": "required",
    "mother_maiden_name": "optional",
    "civil_status": "optional",
    "spouse_name": "hidden",
    "address_municipality": "required",
    "address_barangay": "required",
    "address_purok": "optional",
    "province": "required",
    "educational_attainment": "optional",
    "employment_status": "optional",
    "family_member": "optional",
    "philhealth_member": "optional",
    "philhealth_status": "optional",
    "philhealth_no": "optional",
    "philhealth_category": "optional",
    "fourps_member": "optional",
    "dswd_nhts": "optional",
    "bite_date": "required",
    "bite_place": "required",
    "site_washed": "required",
    "exposure_type": "required",
    "animal_type": "required",
    "animal_status": "required",
    "animal_captured": "optional",
    "wound_location": "required",
    "patient_description": "optional",
    "exposure_category": "required",
    "bite_site": "required",
    "animal_observation_status": "optional",
    "treatment_given": "optional",
    "protocol_type": "required",
    "route": "optional",
    "injection_site": "optional",
    "dosage_ml": "optional",
    "vaccine_brand": "optional",
    "vaccine_generic": "optional",
    "batch_no": "optional",
    "tt_status": "optional",
    "medication_given": "optional",
    "adverse_reaction": "optional",
    "cost_recovery": "optional"
  },
  "created_at": "2026-11-11T12:00:00.000000Z",
  "updated_at": "2026-11-11T12:30:00.000000Z"
}
```

### 4.2 PUT Request Schema
```json
{
  "revision": 2,
  "triage_module_enabled": true,
  "registration_module_enabled": true,
  "treatment_module_enabled": true,
  "patient_registration_enabled": true,
  "address_section_enabled": true,
  "socioeconomic_section_enabled": false,
  "gov_programs_section_enabled": true,
  "bite_intake_section_enabled": true,
  "triage_section_enabled": true,
  "treatment_section_enabled": true,
  "field_rules": {
    "blood_type": "required",
    "mother_maiden_name": "optional",
    "civil_status": "optional",
    "spouse_name": "hidden",
    "address_municipality": "required",
    "address_barangay": "required",
    "address_purok": "optional",
    "province": "required",
    "educational_attainment": "optional",
    "employment_status": "optional",
    "family_member": "optional",
    "philhealth_member": "optional",
    "philhealth_status": "optional",
    "philhealth_no": "optional",
    "philhealth_category": "optional",
    "fourps_member": "optional",
    "dswd_nhts": "optional",
    "bite_date": "required",
    "bite_place": "required",
    "site_washed": "required",
    "exposure_type": "required",
    "animal_type": "required",
    "animal_status": "required",
    "animal_captured": "optional",
    "wound_location": "required",
    "patient_description": "optional",
    "exposure_category": "required",
    "bite_site": "required",
    "animal_observation_status": "optional",
    "treatment_given": "optional",
    "protocol_type": "required",
    "route": "optional",
    "injection_site": "optional",
    "dosage_ml": "optional",
    "vaccine_brand": "optional",
    "vaccine_generic": "optional",
    "batch_no": "optional",
    "tt_status": "optional",
    "medication_given": "optional",
    "adverse_reaction": "optional",
    "cost_recovery": "optional"
  }
}
```

### 4.3 PUT Success Response (`200 OK`)
```json
{
  "message": "Module configuration updated successfully",
  "config": {
    "schema_version": 1,
    "revision": 3,
    "clinic_id": 1,
    "can_edit": true,
    "triage_module_enabled": true,
    "registration_module_enabled": true,
    "treatment_module_enabled": true,
    "patient_registration_enabled": true,
    "address_section_enabled": true,
    "socioeconomic_section_enabled": false,
    "gov_programs_section_enabled": true,
    "bite_intake_section_enabled": true,
    "triage_section_enabled": true,
    "treatment_section_enabled": true,
    "field_rules": { "...41 keys..." },
    "created_at": "2026-11-11T12:00:00.000000Z",
    "updated_at": "2026-11-11T12:35:00.000000Z"
  }
}
```

### 4.4 Stale Revision Conflict Response (`409 Conflict`)
Triggered when the submitted `revision` is older or does not match current server state:
```json
{
  "message": "Configuration conflict. The configuration has been modified by another user.",
  "current_revision": 3,
  "supplied_revision": 2,
  "config": {
    "schema_version": 1,
    "revision": 3,
    "clinic_id": 1,
    "can_edit": true,
    "...": "current server configuration"
  }
}
```

### 4.5 Validation Error Responses (`422 Unprocessable Entity`)

#### A. Missing Clinic Context
```json
{
  "message": "User is not associated with any clinic.",
  "errors": {
    "clinic_id": ["Authenticated user has no associated clinic context."]
  }
}
```

#### B. Null Boolean Value (e.g. `socioeconomic_section_enabled: null`)
```json
{
  "message": "The socioeconomic section enabled field must be true or false.",
  "errors": {
    "socioeconomic_section_enabled": [
      "The socioeconomic section enabled field must be true or false."
    ]
  }
}
```

#### C. Unsupported Key Submitted
```json
{
  "message": "The key 'unknown_station' is not a supported configuration key.",
  "errors": {
    "unknown_station": [
      "The key 'unknown_station' is not a supported configuration key."
    ]
  }
}
```

#### D. Forbidden Rule on Locked LF1 (`exposure_category: optional`)
```json
{
  "message": "The 'exposure_category' field is an essential clinical safeguard and must be 'required'.",
  "errors": {
    "field_rules.exposure_category": [
      "The 'exposure_category' field is an essential clinical safeguard and must be 'required'."
    ]
  }
}
```

---

## 5. History / Audit Log Endpoint

`GET /api/clinic-module-config/history`

### History Response (`200 OK`)
```json
[
  {
    "id": 142,
    "user": {
      "id": 1,
      "name": "Dr. Juan Dela Cruz",
      "email": "admin@tagoloan.gov.ph",
      "role": "admin"
    },
    "action": "clinic_module_config.updated",
    "description": "Clinic module configuration updated (revision 2 -> 3)",
    "old_values": {
      "socioeconomic_section_enabled": true,
      "field_rules": {
        "blood_type": "optional"
      }
    },
    "new_values": {
      "socioeconomic_section_enabled": false,
      "field_rules": {
        "blood_type": "required"
      }
    },
    "ip_address": "192.168.1.45",
    "created_at": "2026-11-11T12:35:00.000000Z"
  }
]
```

---

## 6. Handoff Notes for Team Members

### For Person 2 (Frontend Admin Editor)
1. **Response unbundling:** `GET` returns the configuration object directly at root (`response.data`). `PUT` returns `{ message: string, config: ClinicModuleConfig }` at `response.data.config`.
2. **Editor Dirty State:** Compare both stations, the 7 canonical section flags, and all 41 field rules against the baseline. Section-only edits enable Save and Reset.
3. **Handling 409 Conflicts:** When a PUT returns 409, present a conflict banner showing `supplied_revision` vs `current_revision`, retain the user's uncommitted draft, and offer a "Compare & Reconcile" option.
4. **Developer Read-Only:** The `can_edit` boolean in GET responses is `false` for non-admin staff and developers. Disable the Save button and show a "Read Only" badge.

### For Person 3 (Live Form Integration)
1. **Rule Invariants:** Locked field `exposure_category` is permanently `'required'`. Do not allow clinical forms to bypass this requirement.
2. **Conditional Fields:** `spouse_name` rule is only active when `civil_status === 'married'`.
3. **Historical Data Safety:** When a field rule is set to `'hidden'`, the form MUST omit the control from the edit view without sending `null` to overwrite existing historical data on update.

### For Person 4 (Station Workflow & Policy)
1. **Station Switches:** All 3 station switches (`triage_module_enabled`, `registration_module_enabled`, `treatment_module_enabled`) are persisted and validated non-null booleans.
2. **Disabling Transitions:** Use the effective configuration from `ClinicModuleConfigService::getOrCreateConfigForClinic($clinicId)` to verify station availability before routing or queuing patients.
