# Form 2 - General Treatment Form (UPDATED) ✅

## What Changed

**Form 2** has been completely **redesigned** from an animal bite-specific form to a **general clinic consultation form** that can handle ANY type of visit.

### Old Form 2 (Animal Bite Specific) ❌
- Individual Treatment Record (Tagoloan Treatment Card)
- Fields: Exposure category, bite date, animal type, body parts affected
- Purpose: Only for animal bite cases

### New Form 2 (General Consultation) ✅
- Individual Treatment (General Consultation)
- Fields: Chief complaints, diagnosis, vital signs, medication, consultation type
- Purpose: **ANY type of clinic visit** (General, Prenatal, Dental, Child Care, Injury, etc.)

---

## Form 2 Structure (Based on Your Screenshots)

### Section I: Patient Information (Read-Only)
Pre-filled from queue entry:
- Last Name, First Name, Middle Name, Suffix
- Age
- Residential Address (Misamis Oriental)

### Section II: CHU/RHU Personnel Only
- **Mode of Transaction**:
  - ○ Walk-in
  - ○ Visited
  - ○ Referral
- **For Referral Only**:
  - Referred From (text)
  - Referred To (text)

### Section III: Consultation Details
- Date of Consultation (date picker)
- Consultation Time (AM/PM - time picker)
- **Vital Signs**:
  - Blood Pressure (e.g., 120/80)
  - Temperature (°C)
  - Height (cm)
  - Weight (kg)

### Provider Details
- Name of Attending Provider
- Referred by

### Nature of Visit (Required)
- ○ New Consultation/Case
- ○ New Admission
- ○ Follow-up visit

### Type of Consultation / Purpose of Visit (Required - at least one)
Checkboxes:
- ☐ General
- ☐ Family Planning
- ☐ Prenatal
- ☐ Postpartum
- ☐ Dental Care
- ☐ Tuberculosis
- ☐ Child Care
- ☐ Child Immunization
- ☐ Child Nutrition
- ☐ Sick Children
- ☐ **Injury** (includes animal bites, firecracker, accidents, etc.)
- ☐ Firecracker Injury
- ☐ Adult Immunization

### Clinical Notes
- **Chief Complaints** (Required) - Textarea
- **Diagnosis** - Textarea
- **Medication / Treatment** - Textarea
- **Name of Health Care Provider** - Text input
- **Laboratory Findings / Impression** - Textarea
- **Performed Laboratory Test** - Text input

---

## Styling

### Matches AddPatientModal Design ✅
- Clean, modern layout with proper spacing
- Section headers in **green (#10b981)** with uppercase styling
- Read-only fields have gray background (#f9fafb)
- Proper grid layouts for organized fields
- Form footer with Cancel and "Save Patient Record" buttons
- Error messages in red at bottom left
- Professional typography and padding

### Form Modal Component
Uses the same `FormModal` component as AddPatientModal:
- Title: "Individual Treatment"
- Subtitle: "Form 2 — General Consultation"
- Max width: 950px
- Consistent button styling

---

## Frontend Implementation

### File Created
**Location**: `frontend/src/features/consultations/components/GeneralTreatmentForm.tsx`

**Features**:
- ✅ Pre-fills patient info from queue entry (read-only)
- ✅ Loads existing treatment record if available
- ✅ Validates required fields (Nature of Visit, Consultation Types, Chief Complaints)
- ✅ Conditional referral fields (only shows if "Referral" selected)
- ✅ Clean styled form matching AddPatientModal design
- ✅ Saves to backend via API

### Updated Files
**Location**: `frontend/src/features/queue/pages/QueueDashboardPage.tsx`

Changed import from:
```typescript
import IndividualTreatmentForm from '../../bite-cases/components/IndividualTreatmentForm';
```

To:
```typescript
import GeneralTreatmentForm from '../../consultations/components/GeneralTreatmentForm';
```

And updated render:
```typescript
<GeneralTreatmentForm
  open={!!form2Target}
  entry={form2Target}
  onClose={() => setForm2Target(null)}
  onSave={handleForm2Save}
/>
```

---

## Backend Requirements (To Be Implemented)

The backend needs to be updated to handle the new general treatment form data structure.

### Database Changes Needed

#### treatment_records Table (Update/Add Columns)
```sql
ALTER TABLE treatment_records
  ADD COLUMN mode_of_transaction ENUM('walk-in', 'visited', 'referral') DEFAULT 'walk-in',
  ADD COLUMN referred_from VARCHAR(255) NULL,
  ADD COLUMN referred_to VARCHAR(255) NULL,
  ADD COLUMN consultation_date DATE NULL,
  ADD COLUMN consultation_time TIME NULL,
  ADD COLUMN blood_pressure VARCHAR(20) NULL,
  ADD COLUMN temperature VARCHAR(10) NULL,
  ADD COLUMN height VARCHAR(10) NULL,
  ADD COLUMN weight VARCHAR(10) NULL,
  ADD COLUMN nature_of_visit ENUM('new_consultation', 'new_admission', 'follow_up') NULL,
  ADD COLUMN consultation_types JSON NULL,
  ADD COLUMN chief_complaints TEXT NULL,
  ADD COLUMN diagnosis TEXT NULL,
  ADD COLUMN medication_treatment TEXT NULL,
  ADD COLUMN provider_name VARCHAR(255) NULL,
  ADD COLUMN laboratory_findings TEXT NULL,
  ADD COLUMN performed_lab_test VARCHAR(255) NULL,
  ADD COLUMN attending_provider VARCHAR(255) NULL,
  ADD COLUMN referred_by VARCHAR(255) NULL;
```

### TreatmentRecordController Update

**POST /api/treatment-records** should accept:
```php
$request->validate([
    'patient_id' => 'required|exists:patients,patient_id',
    'queue_id' => 'nullable|exists:queues,queue_id',
    'consultation_date' => 'required|date',
    'consultation_time' => 'required',
    'mode_of_transaction' => 'nullable|in:walk-in,visited,referral',
    'referred_from' => 'nullable|string',
    'referred_to' => 'nullable|string',
    'blood_pressure' => 'nullable|string',
    'temperature' => 'nullable|string',
    'height' => 'nullable|string',
    'weight' => 'nullable|string',
    'nature_of_visit' => 'required|in:new_consultation,new_admission,follow_up',
    'consultation_types' => 'required|array',
    'consultation_types.*' => 'in:general,prenatal,dental_care,child_care,child_nutrition,injury,adult_immunization,family_planning,postpartum,tuberculosis,child_immunization,sick_children,firecracker_injury',
    'chief_complaints' => 'required|string',
    'diagnosis' => 'nullable|string',
    'medication_treatment' => 'nullable|string',
    'laboratory_findings' => 'nullable|string',
    'performed_lab_test' => 'nullable|string',
    'provider_name' => 'nullable|string',
    'attending_provider' => 'nullable|string',
    'referred_by' => 'nullable|string',
]);
```

---

## Usage Flow

### Doctor/Triage Workflow

1. **View Queue Dashboard**
2. **See green "Form 2" button** in CLINICAL FORMS column
3. **Click "Form 2"** on waiting patient
4. **Modal opens** with:
   - Patient info pre-filled (read-only)
   - Today's date and current time
   - Empty form fields ready to fill
5. **Fill consultation details**:
   - Select mode of transaction
   - Enter vital signs (BP, temp, height, weight)
   - Select nature of visit
   - Check applicable consultation types (at least one)
   - Enter chief complaints (required)
   - Enter diagnosis, medications, lab findings
   - Enter provider name
6. **Click "Save Patient Record"**
7. **Form closes**, queue refreshes
8. **Data saved** to database

### Follow-Up Visit Workflow

1. Patient returns for follow-up
2. Registration adds to queue (or nurse direct)
3. Doctor clicks "Form 2" on queue entry
4. **Form loads previous consultation data**
5. Doctor selects "Follow-up visit"
6. Updates chief complaints, diagnosis, treatment
7. Saves - creates new treatment record entry

---

## Validation Rules

### Required Fields
- ✅ Nature of Visit (radio button - must select one)
- ✅ Type of Consultation (checkboxes - must check at least one)
- ✅ Chief Complaints (textarea - cannot be empty)

### Conditional Fields
- **Referral fields** only appear when "Referral" mode selected
  - Referred From
  - Referred To

### Optional Fields
- All vital signs (BP, temp, height, weight)
- Diagnosis
- Medication/Treatment
- Lab findings
- Provider names
- Date/time (pre-filled but editable)

---

## File Structure

```
frontend/src/features/
├── consultations/
│   └── components/
│       └── GeneralTreatmentForm.tsx  ← NEW (replaces IndividualTreatmentForm)
├── queue/
│   ├── components/
│   │   ├── QueueActions.tsx
│   │   └── AddToQueueModal.tsx
│   └── pages/
│       └── QueueDashboardPage.tsx  ← UPDATED (imports GeneralTreatmentForm)
└── vaccinations/
    └── components/
        └── VaccinationRecordForm.tsx  (Form 3)
```

### Old Files (Can be deleted or archived)
- `frontend/src/features/bite-cases/components/IndividualTreatmentForm.tsx` ❌ Old animal bite form

---

## Testing Checklist

### Frontend Testing

- [ ] Restart frontend dev server
- [ ] Login as triage/doctor
- [ ] Go to Queue Dashboard
- [ ] Click green "Form 2" button on a queue entry
- [ ] Verify modal opens with new general treatment form
- [ ] Verify patient info is pre-filled (read-only)
- [ ] Verify all sections render correctly
- [ ] Test mode of transaction radio buttons
- [ ] Test referral fields show/hide
- [ ] Test nature of visit selection
- [ ] Test consultation type checkboxes (can select multiple)
- [ ] Test all text inputs and textareas
- [ ] Test validation (try submitting empty form)
- [ ] Fill valid data and click "Save Patient Record"
- [ ] Check browser console for API call

### Backend Testing (After Migration)

- [ ] Run database migration to add new columns
- [ ] Update TreatmentRecordController store() method
- [ ] Test POST /api/treatment-records with new payload
- [ ] Verify data saves correctly to database
- [ ] Test loading existing records (GET endpoint)
- [ ] Verify form pre-fills with existing data on reopen

---

## Database Query Example

### Save Treatment Record
```sql
INSERT INTO treatment_records (
    patient_id, queue_id, clinic_id,
    consultation_date, consultation_time,
    mode_of_transaction, referred_from, referred_to,
    blood_pressure, temperature, height, weight,
    nature_of_visit, consultation_types,
    chief_complaints, diagnosis, medication_treatment,
    laboratory_findings, performed_lab_test,
    provider_name, attending_provider, referred_by,
    created_at, updated_at
) VALUES (
    1, 5, 1,
    '2026-08-02', '10:30:00',
    'walk-in', NULL, NULL,
    '120/80', '36.5', '170', '70',
    'new_consultation', '["general", "injury"]',
    'Dog bite on left hand, pain and swelling',
    'Animal bite, Category II exposure',
    'Wound cleaning, TT vaccine, Antirabies vaccine Day 0',
    'Normal', NULL,
    'Dr. Juan Dela Cruz', 'Dr. Juan Dela Cruz', NULL,
    NOW(), NOW()
);
```

### Load Existing Record
```sql
SELECT * FROM treatment_records
WHERE patient_id = 1
  AND clinic_id = 1
ORDER BY consultation_date DESC, consultation_time DESC
LIMIT 1;
```

---

## Key Differences from Old Form

| Feature | Old Form (Animal Bite) | New Form (General) |
|---------|----------------------|-------------------|
| Purpose | Animal bite cases only | Any clinic visit |
| Fields | Exposure category, animal type, bite location | Chief complaints, diagnosis, vital signs |
| Consultation Types | N/A | 13 types (General, Prenatal, Dental, Injury, etc.) |
| Vital Signs | ❌ Not included | ✅ BP, Temp, Height, Weight |
| Mode of Transaction | ❌ Not included | ✅ Walk-in, Visited, Referral |
| Lab Findings | ❌ Basic only | ✅ Detailed findings + tests performed |
| Nature of Visit | ❌ Not included | ✅ New/Admission/Follow-up |
| Styling | MUI Dialog | FormModal (matches AddPatientModal) |

---

## Animal Bite Cases

**Question**: What about animal bite cases?

**Answer**: They are handled through the **"Injury"** consultation type checkbox in the new form:

1. Doctor selects **Nature of Visit**: "New Consultation"
2. Checks **"Injury"** in consultation types
3. In **Chief Complaints**, describes: "Dog bite on left hand"
4. In **Diagnosis**, enters: "Animal bite, Category II exposure"
5. In **Medication/Treatment**, documents: "Wound cleaning, Antirabies vaccine Day 0"
6. Nurse then opens **Form 3** to record vaccination schedule

This allows the system to handle **all injury types** (animal bites, falls, cuts, burns, etc.) in one unified form.

---

## Summary

✅ **Form 2 is now a general consultation form**
✅ **Styled like AddPatientModal** (clean, professional)
✅ **Handles ANY type of clinic visit** (not just animal bites)
✅ **13 consultation types** including Injury for animal bites
✅ **Comprehensive clinical notes** section
✅ **Vital signs tracking**
✅ **Referral system** built-in
✅ **Follow-up visit support**

**Next Steps**:
1. ✅ Frontend form created
2. 🔲 Backend migration (add new columns)
3. 🔲 Update TreatmentRecordController
4. 🔲 Test complete workflow
5. 🔲 Train staff on new form structure
