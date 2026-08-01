# ✅ Correct Forms Arrangement

**Date**: July 31, 2026  
**Status**: Navigation Fixed  
**Purpose**: Clear separation of forms by role

---

## 📋 The Three Forms

### Form 1: Patient Registration
**Title**: Patient Enrolment Form  
**Access**: Registration Staff ONLY (+ Admin)  
**Purpose**: Register new patients in the system  
**Used Once**: When patient first visits clinic

**Fields**:
- Patient demographics (name, DOB, address, sex)
- Contact information
- Blood type, civil status
- Socioeconomic info
- PhilHealth, 4Ps membership
- Emergency contacts

**Navigation Menu**: "Patient Registration (Form 1)"

---

### Form 2: Individual Treatment Record
**Title**: TAGOLOAN ANIMAL BITE TREATMENT CENTER — Official Form  
**Access**: Doctor/Triage ONLY (+ Admin)  
**Purpose**: Record bite incident and initial assessment  
**Used**: During triage/doctor consultation

**Fields** (from your screenshot):
- Patient & Registration Information (pre-filled from Form 1)
- Date, Registry No., Hospital No.
- PhilHealth PIN
- **Exposure Category** (I, II, III) ← Doctor determines this
- Date of Exposure
- Date Treatment Started
- Place of Exposure
- **Exposure Details**:
  - Mode of Animal Exposure (nibbling, scratch, bite, etc.)
  - Body Part Affected
  - Type of Animal
  - Past History of animal bite

**Navigation Menu**: "Individual Treatment (Form 2)"

**Note**: This is the TRIAGE/ASSESSMENT form, not the vaccination form!

---

### Form 3: Vaccination Record
**Title**: Vaccination Schedule (continuation of treatment card)  
**Access**: Nurse/Treatment ONLY (+ Admin)  
**Purpose**: Record vaccination doses and follow-ups  
**Used**: Multiple times (Day 0, 3, 7, 28, boosters)

**Fields**:
- **Vaccination Record Table**:
  | Period | Route (ID/IM) | Date | Given by | Signature |
  |--------|---------------|------|----------|-----------|
  | Day 0 | | | | |
  | Day 3 | | | | |
  | Day 7 | | | | |
  | Day 28 | | | | |
  | Booster 1 | | | | |
  | Booster 2 | | | | |

- Additional Medications:
  - ERIG (Equine Rabies Immunoglobulin)
  - TT (Tetanus Toxoid)
  - ATS (Anti-Tetanus Serum)
  
- ICD 10 Code

**Navigation Menu**: "Vaccination Record (Form 3)"

---

## 🔄 Patient Journey Through Forms

```
STEP 1: Registration
┌────────────────────────────────────┐
│  👤 Registration Staff             │
│  📝 Form 1: Patient Registration   │
│                                    │
│  Records:                          │
│  • Demographics                    │
│  • Contact info                    │
│  • Government programs             │
│                                    │
│  Action: Adds patient to queue     │
└────────────────────────────────────┘
              ↓
STEP 2: Triage/Assessment
┌────────────────────────────────────┐
│  👨‍⚕️ Doctor (triage role)          │
│  📋 Form 2: Individual Treatment   │
│                                    │
│  Records:                          │
│  • Bite incident details           │
│  • Exposure category (I/II/III)    │
│  • Animal type & behavior          │
│  • Body part affected              │
│  • Initial assessment              │
│                                    │
│  Action: Updates queue status      │
└────────────────────────────────────┘
              ↓
STEP 3: Treatment/Vaccination
┌────────────────────────────────────┐
│  👩‍⚕️ Nurse (treatment role)        │
│  💉 Form 3: Vaccination Record     │
│                                    │
│  Records:                          │
│  • Vaccine given (Day 0)           │
│  • Route (ID or IM)                │
│  • Batch number                    │
│  • Additional meds (ERIG, TT)      │
│  • Next appointment (Day 3)        │
│                                    │
│  Action: Schedules follow-up       │
└────────────────────────────────────┘
              ↓
STEP 4: Follow-up Visits (Day 3, 7, 28)
┌────────────────────────────────────┐
│  👩‍⚕️ Nurse (direct access)         │
│  💉 Form 3: Update vaccination     │
│                                    │
│  Patient comes directly to nurse   │
│  (no queue, no doctor needed)      │
│                                    │
│  Updates:                          │
│  • Day 3 vaccine given ✓           │
│  • Next appointment (Day 7)        │
│                                    │
│  Repeat for Day 7, Day 28, etc.    │
└────────────────────────────────────┘
```

---

## 📊 Navigation Menu - Corrected

### 📝 Registration Staff Sees:
- ✅ Dashboard
- ✅ **Patient Registration (Form 1)**
- ✅ Patient Queue
- ✅ **Bite Cases (Summary)** ← Can view incidents
- ✅ Reports & Analytics

**Cannot See**:
- ❌ Individual Treatment (Form 2) - Doctor only
- ❌ Vaccination Record (Form 3) - Nurse only
- ❌ Vaccine Inventory - Nurse only

---

### 👨‍⚕️ Doctor (triage role) Sees:
- ✅ Dashboard
- ✅ Patient Queue
- ✅ **Bite Cases (Summary)** ← Can view incidents
- ✅ **Individual Treatment (Form 2)** ← Can create/edit
- ✅ Reports & Analytics

**Cannot See**:
- ❌ Patient Registration (Form 1) - Registration only
- ❌ Vaccination Record (Form 3) - Nurse only
- ❌ Vaccine Inventory - Nurse only

---

### 👩‍⚕️ Nurse (treatment role) Sees:
- ✅ Dashboard
- ✅ Patient Queue
- ✅ **Bite Cases (Summary)** ← Can view incidents
- ✅ **Vaccination Record (Form 3)** ← Can create/edit
- ✅ Vaccine Inventory
- ✅ Reports & Analytics

**Cannot See**:
- ❌ Patient Registration (Form 1) - Registration only
- ❌ Individual Treatment (Form 2) - Doctor only

---

### 👔 Admin Sees:
- ✅ **Everything** - Full access to all forms and features

---

## 🗂️ Bite Cases Dashboard

**Purpose**: Summary/Warning Dashboard  
**Access**: ALL STAFF (registration, triage, treatment, admin)  
**Function**: **VIEW ONLY** - Not for data entry

### What It Shows:
- Map/list of recent bite incidents by location
- Summary statistics:
  - Total cases this month
  - Cases by exposure category (I, II, III)
  - Cases by animal type (dog, cat, etc.)
  - Cases by barangay/location
- Warning alerts for high-risk areas
- Trend analysis

### What It Does NOT Do:
- ❌ Not for creating new bite cases (that's in Form 2)
- ❌ Not for editing cases (done in respective forms)
- ❌ Just a dashboard for awareness

**Navigation Menu**: "Bite Cases (Summary)"

---

## 🎯 Key Changes Made

### Before (Incorrect):
```typescript
// Bite Incident Intake - only triage could see
{ label: 'Bite Incident Intake', roles: ['triage', 'admin'] }

// Form 2 - both treatment and triage could edit
{ label: 'Individual Treatment (Form 2)', roles: ['treatment', 'triage', 'admin'] }
```

### After (Correct): ✅
```typescript
// Bite Cases - everyone can see summary
{ label: 'Bite Cases (Summary)', roles: ['registration', 'triage', 'treatment', 'admin'] }

// Form 2 - ONLY triage can edit
{ label: 'Individual Treatment (Form 2)', roles: ['triage', 'admin'] }

// Form 3 - ONLY treatment can edit
{ label: 'Vaccination Record (Form 3)', roles: ['treatment', 'admin'] }
```

---

## 🔐 Access Control Summary

| Form/Feature | Registration | Triage (Doctor) | Treatment (Nurse) | Admin |
|--------------|--------------|-----------------|-------------------|-------|
| Form 1 (Patient Registration) | ✅ Edit | ❌ No Access | ❌ No Access | ✅ Edit |
| Form 2 (Individual Treatment) | ❌ No Access | ✅ Edit | ❌ No Access | ✅ Edit |
| Form 3 (Vaccination Record) | ❌ No Access | ❌ No Access | ✅ Edit | ✅ Edit |
| Patient Queue | ✅ View/Manage | ✅ View | ✅ View | ✅ Full |
| Bite Cases (Summary) | ✅ View | ✅ View | ✅ View | ✅ View |
| Vaccine Inventory | ❌ No Access | ❌ No Access | ✅ Manage | ✅ Full |

---

## 💡 Why This Arrangement?

### Separation of Duties ✅
- **Registration**: Focus on patient intake, no clinical decisions
- **Doctor**: Focus on medical assessment, diagnosis
- **Nurse**: Focus on treatment execution, vaccination

### Prevents Errors ✅
- Registration can't accidentally alter clinical data
- Doctor can't modify vaccination records
- Nurse can't change assessment/diagnosis

### Workflow Efficiency ✅
- Each role sees only what they need
- Less confusion, cleaner menus
- Faster navigation

### Compliance ✅
- Clear audit trail (who did what)
- Proper authorization
- Meets DOH/RHU requirements

---

## 🚀 Next Steps

### 1. Test Navigation (HIGH)
- Log in as each role
- Verify menu items match table above
- Ensure access restrictions work

### 2. Build/Update Forms (HIGH)
- **Form 2**: Ensure it matches your screenshot structure
- **Form 3**: Build vaccination record table
- **Bite Cases**: Create summary dashboard

### 3. Queue Integration (MEDIUM)
- Add "Edit Form 2" button for doctor in queue
- Add "Edit Form 3" button for nurse in queue
- Status updates when forms saved

### 4. Follow-up Workflow (MEDIUM)
- Direct patient access to nurse
- Skip queue for follow-ups
- Update Form 3 vaccination table

---

## ✅ Verification Checklist

**Navigation**:
- [ ] Registration staff sees Form 1 only
- [ ] Doctor sees Form 2 only (not Form 3)
- [ ] Nurse sees Form 3 only (not Form 2)
- [ ] All staff see Bite Cases (Summary)
- [ ] All staff see Patient Queue
- [ ] Admin sees everything

**Forms**:
- [ ] Form 1 accessible by registration
- [ ] Form 2 accessible by triage
- [ ] Form 3 accessible by treatment
- [ ] Forms cannot be edited by unauthorized roles

**Workflow**:
- [ ] Registration → Form 1 → Queue
- [ ] Doctor → Queue → Form 2
- [ ] Nurse → Queue → Form 3
- [ ] Follow-up → Direct to nurse → Form 3

---

**Document Status**: Complete  
**Navigation Fixed**: ✅ Yes  
**Forms Clarified**: ✅ Yes  
**Ready for**: Implementation and testing

---

## 📝 Summary

**Form 1** = Registration Staff (patient intake)  
**Form 2** = Doctor (bite assessment) ← This is your screenshot!  
**Form 3** = Nurse (vaccination record)

**Bite Cases** = Everyone can view (summary dashboard)  
**Patient Queue** = Everyone can see (but edit different forms)

**Follow-ups** = Patient goes directly to nurse (no queue)

✅ **Navigation menu now matches this arrangement!**
