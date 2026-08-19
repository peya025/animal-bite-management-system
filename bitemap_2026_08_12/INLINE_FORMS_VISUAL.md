# Patient Detail Page - Visual Layout

## Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Queue · Patient detail                        [Breadcrumb]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Avatar]  John Doe Smith                    Wait time          │
│            Follow-up  High Priority           12m 34s    [⋯]    │
│            25y · Male · Queue #3 · ⚫ In Consultation           │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Form 1 [Registration]  │  Form 2 [Doctor]  │  Form 3 [Nurse]   │
│  ════════════════════                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ⚠️ You are viewing this form in read-only mode.                │
│     Only Registration staff can edit this section.              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PATIENT INFORMATION — FORM 1                             │   │
│  │ Managed by Registration staff                            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  Full Name         John Doe Smith                        │   │
│  │  Age               25 years old                          │   │
│  │  Gender            male                                  │   │
│  │  Contact Number    09123456789                           │   │
│  │  Queue Date        2026-08-10                            │   │
│  │  Check-in Notes    First visit                           │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Tab 1: Form 1 (Registration)

**For Registration Staff:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Form 1 [Registration]  │  Form 2 [Doctor]  │  Form 3 [Nurse]   │
│  ════════════════════                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ You can edit this form (your assigned role)                 │
│                                                                   │
│  [Patient basic information displayed in cards - editable]      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**For Other Staff (Doctor/Nurse):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Form 1 [Registration 🔒]  │  Form 2 [Doctor]  │  Form 3 [Nurse] │
│  ═══════════════════════                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ⚠️ You are viewing this form in read-only mode.                │
│     Only Registration staff can edit this section.              │
│                                                                   │
│  [Patient information - view only, grayed out]                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Tab 2: Form 2 (Doctor/Triage)

**For Doctor Staff:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Form 1 [Registration]  │  Form 2 [Doctor]  │  Form 3 [Nurse]   │
│                           ══════════════                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PATIENT & REGISTRATION INFORMATION                              │
│  ─────────────────────────────────────────                       │
│  Last Name        [Smith             ]  Suffix  [    ]           │
│  First Name       [John              ]  Age     [25  ]           │
│  Middle Name      [Doe               ]  Address [... ]           │
│                                                                   │
│  FOR CHU / RHU PERSONNEL ONLY                                    │
│  ─────────────────────────────────                               │
│  Mode: ○ Walk-in  ● Visited  ○ Referral                         │
│  Date: [2026-08-10]  Time: [14:30]                              │
│  BP: [120/80]  Temp: [36.5°C]  Height: [170cm]  Weight: [70kg] │
│                                                                   │
│  NATURE OF VISIT                                                 │
│  ● New Consultation  ○ New Admission  ○ Follow-up               │
│                                                                   │
│  TYPE OF CONSULTATION                                            │
│  ☑ General        ☐ Prenatal      ☐ Dental Care                │
│  ☐ Child Care     ☑ Injury        ☐ Family Planning            │
│                                                                   │
│  CLINICAL NOTES                                                  │
│  Chief Complaints: [Patient reports pain in...              ]   │
│  Diagnosis:        [Superficial wound, dog bite...          ]   │
│  Medication:       [Clean wound, prescribe antibiotics...   ]   │
│                                                                   │
│                                         [✓ Save Record]          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**For Non-Doctor Staff:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Form 1 [Registration]  │  Form 2 [Doctor 🔒]  │  Form 3 [Nurse] │
│                           ════════════════                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ⚠️ You are viewing this form in read-only mode.                │
│     Only Doctor staff can edit this section.                    │
│                                                                   │
│  [All form fields shown but disabled, no save button]           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Tab 3: Form 3 (Treatment Nurse)

**For Nurse Staff:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Form 1 [Registration]  │  Form 2 [Doctor]  │  Form 3 [Nurse]   │
│                                                ═══════════       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PATIENT & REGISTRATION INFORMATION                              │
│  ─────────────────────────────────────────                       │
│  Date: [2026-08-10]          Registry No: [ABC-2026-001]        │
│  Hospital No: [H-12345]      Referred by: [Dr. Santos  ]        │
│  PhilHealth PIN: [12-345678901-2]  ● Member  ○ Dependent       │
│                                                                   │
│  Patient Name: [Smith, John Doe          ]  (read-only)         │
│  Age: [25]  DOB: [2001-03-15]  Address: [123 Main St...]        │
│                                                                   │
│  Sex: ● Male  ○ Female     Exposure Category: ○ I  ○ II  ● III │
│  Date of Exposure: [2026-08-09]                                 │
│  Date Treatment Started: [2026-08-10]                           │
│  Place of Exposure: [Barangay Hall backyard          ]          │
│                                                                   │
│  EXPOSURE DETAILS                                                │
│  ─────────────────                                               │
│  Mode of Animal Exposure:                                        │
│  ☐ Nibbling/Licking uncovered skin                              │
│  ☐ Nibbling/Licking wounded skin                                │
│  ☐ Scratch / Abrasion                                           │
│  ☑ Transdermal Bite                                             │
│  ☐ Handling / Ingestion                                         │
│                                                                   │
│  VACCINATION RECORD                                              │
│  ─────────────────────                                           │
│  ┌─────────┬──────┬────────────┬──────────┬───────────┐        │
│  │ Period  │Route │ Date       │ Given by │ Signature │        │
│  ├─────────┼──────┼────────────┼──────────┼───────────┤        │
│  │ Day 0   │● IM  │2026-08-10 │ RN Cruz │ [______] │        │
│  │ Day 3   │● IM  │2026-08-13 │          │          │        │
│  │ Day 7   │○ ID  │2026-08-17 │          │          │        │
│  │ Day 28  │      │            │          │          │        │
│  └─────────┴──────┴────────────┴──────────┴───────────┘        │
│                                                                   │
│  Additional Meds: ☑ ERIG  ☑ TT  ☐ ATS                          │
│  ICD 10 Code: [W54.0        ]                                   │
│                                                                   │
│                                         [✓ Save Record]          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Visual Elements

### Tab States

**Active Tab (User's Role):**
```
┌─────────────────────────┐
│  Form 2 [Doctor ✏️]     │  ← Green underline, bold text
└─────────────────────────┘
     ════════════
```

**Inactive Tab (Not User's Role):**
```
┌─────────────────────────┐
│  Form 1 [Registration 🔒] │  ← Gray text, lock icon
└─────────────────────────┘
```

**Admin/Developer (All Editable):**
```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│  Form 1 [Registration ✏️] │  Form 2 [Doctor ✏️]     │  Form 3 [Nurse ✏️]      │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### Read-Only Banner

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ You are viewing this form in read-only mode.                │
│     Only Doctor staff can edit this section.                    │
└─────────────────────────────────────────────────────────────────┘
   ↑ Yellow background (#fffbeb), orange icon and border
```

### Form Field States

**Editable (User's Form):**
```
Label: [Active input field               ]  ← White background
```

**Read-Only (Other's Form):**
```
Label: [Grayed out value                 ]  ← Gray background (#f9fafb)
```

### Save Button

**Editable Mode:**
```
[✓ Save Record]  ← Green button, bottom-right
```

**Read-Only Mode:**
```
(No save button shown)
```

## Navigation Flow

```
User clicks "View Patient" in Queue Table
              ↓
    Opens Patient Detail Page
              ↓
    ┌─────────────────────┐
    │ Based on user role: │
    └─────────────────────┘
              ↓
    ┌─────────┬─────────┬─────────┐
    │Registration│ Doctor │  Nurse  │
    └─────────┴─────────┴─────────┘
         ↓          ↓          ↓
    Opens     Opens     Opens
    Form 1    Form 2    Form 3
    (tab 1)   (tab 2)   (tab 3)
         ↓          ↓          ↓
    Can edit  Can edit  Can edit
    their     their     their
    form      form      form
         ↓          ↓          ↓
    Can view  Can view  Can view
    other     other     other
    forms     forms     forms
    (read-    (read-    (read-
     only)     only)     only)
```

## Comparison: Before vs After

### BEFORE (Modal Popups) ❌

```
┌─────────────────────────────────────┐
│  Patient Card                       │
│  [Clinical Forms ▼]                 │
│    • Form 1: Registration          │  Click
│    • Form 2: Doctor Consultation   │  ───→  ┌──────────────────┐
│    • Form 3: Treatment Record      │         │ Modal Overlay    │
└─────────────────────────────────────┘         │ blocks everything│
                                                 │ [Form content]   │
                                                 │ [Close] [Save]   │
                                                 └──────────────────┘
```

### AFTER (Inline Tabs) ✅

```
┌─────────────────────────────────────────────────────────────────┐
│  Patient Card (always visible at top)                           │
├─────────────────────────────────────────────────────────────────┤
│  Form 1  │  Form 2  │  Form 3  │  ← Click to switch              │
│  ════                                                            │
├─────────────────────────────────────────────────────────────────┤
│  Form content displayed inline here                             │
│  No overlay, no modal, smooth tab switching                     │
│  Patient info always visible above                              │
│                                               [Save Record]      │
└─────────────────────────────────────────────────────────────────┘
```

---

**Design Goal:** Clean, integrated, role-based workflow with full transparency ✅
