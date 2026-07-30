# Phase 5: Form Integration with Module Configuration

**Date**: July 31, 2026  
**Status**: In Progress  
**Goal**: Integrate clinic module configuration with actual forms so they respect field rules

---

## 🎯 Objective

Make the registration, triage, and treatment forms dynamically adapt based on the clinic's module configuration. Fields should:
- **Hide** when rule = "hidden"
- **Be optional** when rule = "optional"  
- **Be required** when rule = "required"

---

## 📋 Current State Analysis

### Existing Forms:
1. **AddPatientModal** (`frontend/src/features/patients/components/AddPatientModal/AddPatientModal.tsx`)
   - Has Form 1 (Patient Enrolment) - Registration fields
   - Has Form 2 (Individual Treatment) - Treatment fields
   - Currently: **All fields are static** (not using module config)
   
### Module Config Fields (from Phase 3):
We configured 42 fields across 7 sections:
1. Patient Registration (4 fields)
2. Address Information (4 fields)
3. Socioeconomic (3 fields)
4. Government Programs (6 fields)
5. Bite Incident Intake (9 fields)
6. Triage & Assessment (4 fields)
7. Treatment & Vaccination (11 fields)

### Missing Forms:
- **Bite Incident Intake Form** - Needs to be created
- **Triage Assessment Form** - Needs integration with module config
- **Vaccination Treatment Form** - Needs integration with module config

---

## ✅ Implementation Tasks

### Task 1: Create `useClinicModuleConfig` Hook ✅
**File**: `frontend/src/hooks/useClinicModuleConfig.ts`

**Purpose**: Fetch and cache clinic module configuration

```typescript
export function useClinicModuleConfig() {
  const [config, setConfig] = useState<ClinicModuleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch module config on mount
  // Cache result
  // Return: { config, loading, isFieldVisible, isFieldRequired }
}
```

**Helper Functions**:
- `isFieldVisible(fieldName)` - Returns false if hidden
- `isFieldRequired(fieldName)` - Returns true if required

---

### Task 2: Update AddPatientModal to Use Module Config ✅
**File**: `frontend/src/features/patients/components/AddPatientModal/AddPatientModal.tsx`

**Changes**:
1. Import `useClinicModuleConfig` hook
2. Call hook at component top
3. Wrap each field with visibility check
4. Update required prop based on config

**Example**:
```typescript
const { config, isFieldVisible, isFieldRequired } = useClinicModuleConfig();

// Before:
<Field label="Blood Type">
  <select...>
</Field>

// After:
{isFieldVisible('blood_type') && (
  <Field label="Blood Type" required={isFieldRequired('blood_type')}>
    <select...>
  </Field>
)}
```

**Fields to Update (Form 1)**:
- blood_type
- mother_maiden_name
- civil_status
- spouse_name
- address_municipality
- address_barangay
- address_purok
- province (always Misamis Oriental)
- educational_attainment
- employment_status
- family_member
- philhealth_member
- philhealth_status
- philhealth_no
- philhealth_category
- fourps_member
- dswd_nhts

---

### Task 3: Create Bite Incident Intake Form ✅
**File**: `frontend/src/features/bite-cases/components/BiteIncidentIntakeForm.tsx`

**Purpose**: Form for recording bite incident details

**Fields (respecting module config)**:
- bite_date (date of bite)
- bite_place (location where bite occurred)
- site_washed (yes/no - was wound washed?)
- exposure_type (bite, scratch, lick)
- animal_type (dog, cat, etc.)
- animal_status (alive/dead, owned/stray)
- animal_captured (yes/no)
- wound_location (body part)
- patient_description (narrative)

**Integration**:
- Add to existing bite case pages
- Use `useClinicModuleConfig` hook
- Conditionally render fields
- Validate required fields

---

### Task 4: Create Triage Assessment Form ✅
**File**: `frontend/src/features/bite-cases/components/TriageAssessmentForm.tsx`

**Purpose**: Form for triage nurse/doctor to assess bite severity

**Fields (respecting module config)**:
- exposure_category (Category I, II, III)
- bite_site (body location)
- animal_observation_status (alive healthy, alive sick, dead, unknown)
- treatment_given (immediate treatment description)

**Integration**:
- Add to bite case detail page
- Show only if triage module enabled
- Use module config for field rules

---

### Task 5: Update Vaccination Treatment Form ✅
**File**: `frontend/src/features/vaccinations/components/VaccinationRecordForm.tsx`

**Purpose**: Form for recording vaccine administration

**Fields (respecting module config)**:
- protocol_type (PEP, PrEP)
- route (IM, ID)
- injection_site (deltoid, etc.)
- dosage_ml
- vaccine_brand
- vaccine_generic
- batch_no
- tt_status (tetanus toxoid status)
- medication_given
- adverse_reaction
- cost_recovery

---

### Task 6: Backend Validation Updates
**Files**: 
- `backend/app/Http/Controllers/PatientController.php`
- `backend/app/Http/Controllers/BiteIncidentIntakeController.php`

**Changes**:
- Fetch clinic's module config
- Apply dynamic validation rules
- Skip validation for hidden fields
- Make optional fields nullable

---

### Task 7: Queue Flow Integration
**File**: `frontend/src/features/queue/hooks/useQueueFlow.ts`

**Changes**:
- Check if triage module is enabled
- Skip triage step if disabled
- Flow: Registration → Treatment (skip Triage)
- Flow: Registration → Triage → Treatment (when enabled)

---

## 🧪 Testing Plan

### Test Scenario 1: Hidden Fields Don't Show
1. Admin sets `blood_type` to "hidden"
2. Registration staff creates new patient
3. Verify blood_type field doesn't appear in form
4. Verify form submits without blood_type

### Test Scenario 2: Optional Fields Allow Empty
1. Admin sets `mother_maiden_name` to "optional"
2. Registration staff creates new patient without mother's name
3. Verify form accepts submission
4. Verify no validation error

### Test Scenario 3: Required Fields Enforce Input
1. Admin sets `bite_location` to "required"
2. Triage staff tries to save without bite location
3. Verify validation error appears
4. Verify form won't submit until filled

### Test Scenario 4: Triage Module Disabled
1. Admin disables triage module
2. Registration creates new bite case
3. Verify queue skips triage
4. Verify patient goes directly to treatment

### Test Scenario 5: Multi-Field Configuration
1. Admin sets:
   - philhealth_info = hidden
   - fourps_info = optional
   - wound_location = required
2. Test all three rules work correctly in same form

---

## 📊 Field Mapping

### Form 1 (Patient Enrolment) → Database
| Form Field | Database Column | Config Field |
|------------|-----------------|--------------|
| Blood Type | blood_type | blood_type |
| Mother's Maiden Name | mother_maiden_name | mother_maiden_name |
| Civil Status | civil_status | civil_status |
| Spouse Name | spouse_name | spouse_name |
| Municipality | address_municipality | address_municipality |
| Barangay | address_barangay | address_barangay |
| Purok | address_purok | address_purok |
| Province | province | province |
| Educational Attainment | educational_attainment | educational_attainment |
| Employment Status | employment_status | employment_status |
| Family Member | family_member | family_member |
| PhilHealth Member | philhealth_member | philhealth_member |
| PhilHealth Status | philhealth_status | philhealth_status |
| PhilHealth No | philhealth_no | philhealth_no |
| PhilHealth Category | philhealth_category | philhealth_category |
| 4Ps Member | fourps_member | fourps_member |
| DSWD NHTS | dswd_nhts | dswd_nhts |

### Bite Incident Intake → Database
| Form Field | Database Column | Config Field |
|------------|-----------------|--------------|
| Bite Date | bite_date | bite_date |
| Bite Place | bite_place | bite_place |
| Site Washed | site_washed | site_washed |
| Exposure Type | exposure_type | exposure_type |
| Animal Type | animal_type | animal_type |
| Animal Status | animal_status | animal_status |
| Animal Captured | animal_captured | animal_captured |
| Wound Location | wound_location | wound_location |
| Patient Description | patient_description | patient_description |

### Triage Assessment → Database
| Form Field | Database Column | Config Field |
|------------|-----------------|--------------|
| Exposure Category | exposure_category | exposure_category |
| Bite Site | bite_site | bite_site |
| Animal Observation | animal_observation_status | animal_observation_status |
| Treatment Given | treatment_given | treatment_given |

### Vaccination Treatment → Database
| Form Field | Database Column | Config Field |
|------------|-----------------|--------------|
| Protocol Type | protocol_type | protocol_type |
| Route | route | route |
| Injection Site | injection_site | injection_site |
| Dosage (ml) | dosage_ml | dosage_ml |
| Vaccine Brand | vaccine_brand | vaccine_brand |
| Vaccine Generic | vaccine_generic | vaccine_generic |
| Batch No | batch_no | batch_no |
| TT Status | tt_status | tt_status |
| Medication Given | medication_given | medication_given |
| Adverse Reaction | adverse_reaction | adverse_reaction |
| Cost Recovery | cost_recovery | cost_recovery |

---

## 🚀 Implementation Order

**Priority 1 (Critical)**: ✅ COMPLETED
1. Create `useClinicModuleConfig` hook
2. Update AddPatientModal with Form 1 fields

**Priority 2 (High)**:
3. Create Bite Incident Intake Form
4. Create Triage Assessment Form
5. Update Vaccination Treatment Form

**Priority 3 (Medium)**:
6. Backend validation updates
7. Queue flow integration

**Priority 4 (Nice to Have)**:
8. Form field help text
9. Validation error messages
10. Field dependencies (e.g., if PhilHealth=yes, show PhilHealth fields)

---

## 📝 Progress Tracker

- [ ] Task 1: useClinicModuleConfig hook
- [ ] Task 2: Update AddPatientModal
- [ ] Task 3: Bite Incident Intake Form
- [ ] Task 4: Triage Assessment Form
- [ ] Task 5: Vaccination Treatment Form
- [ ] Task 6: Backend validation
- [ ] Task 7: Queue flow integration
- [ ] Testing: All 5 test scenarios pass
- [ ] Documentation: User guide updated

---

## 🎯 Success Criteria

Phase 5 is complete when:
- ✅ All forms respect module configuration
- ✅ Hidden fields don't appear
- ✅ Optional fields allow empty values
- ✅ Required fields enforce input
- ✅ Triage module toggle affects queue flow
- ✅ All validation works correctly
- ✅ No regression in existing functionality
- ✅ User documentation complete

---

**Plan Created**: July 31, 2026  
**Status**: Ready to implement  
**Next Step**: Start with Task 1 - Create useClinicModuleConfig hook
