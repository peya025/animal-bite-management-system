# 🎨 Queue Forms - Visual Guide

**Purpose**: Visual representation of the queue workflow implementation  
**Date**: August 1, 2026

---

## 📊 Queue Table Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            PATIENT QUEUE DASHBOARD                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  QUEUE  │  QUEUE  │         │  APPT  │  VISIT   │ PRIORITY │ STATUS  │  WAIT  │ CLINICAL │ QUEUE   │
│   ID    │    #    │ PATIENT │   ID   │   TYPE   │          │         │  TIME  │  FORMS   │ ACTIONS │
│─────────┼─────────┼─────────┼────────┼──────────┼──────────┼─────────┼────────┼──────────┼─────────│
│  #123   │   1     │ Juan DC │  #456  │ New Case │  Urgent  │ Waiting │ 15 min │  [Edit]  │ [Call]  │
│         │         │ 45y·M   │        │          │    🔴    │   🟡    │   ⏰   │   🟢     │  📞     │
│─────────┼─────────┼─────────┼────────┼──────────┼──────────┼─────────┼────────┼──────────┼─────────│
│  #124   │   2     │ Maria S │  #457  │Follow-up │  Normal  │ In Con. │ 32 min │  [Edit]  │[Complete]
│         │         │ 32y·F   │        │          │          │   🟠    │   ⏰   │   🔵     │   ✅    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                                                   ↑          ↑
                                                                   │          │
                                                         CLINICAL FORMS  QUEUE ACTIONS
                                                         (Edit Forms)   (Call/Complete)
```

---

## 🎯 Role-Based Button Visibility

### 👨‍⚕️ Doctor View (Triage Role)
```
┌──────────────────────────────────────────────┐
│ PATIENT QUEUE - Doctor View                  │
├──────────────────────────────────────────────┤
│                                              │
│  Patient Name    │  CLINICAL FORMS           │
│──────────────────┼───────────────────────────│
│  Juan Dela Cruz  │  [ 📋 Edit ]              │
│  45y · Male      │    Form 2                 │
│                  │    🟢 Green Button        │
│──────────────────┼───────────────────────────│
│  Maria Santos    │  [ 📋 Edit ]              │
│  32y · Female    │    Form 2                 │
│                  │    🟢 Green Button        │
└──────────────────────────────────────────────┘

Tooltip: "Edit Form 2 (Individual Treatment)"
```

### 👩‍⚕️ Nurse View (Treatment Role)
```
┌──────────────────────────────────────────────┐
│ PATIENT QUEUE - Nurse View                   │
├──────────────────────────────────────────────┤
│                                              │
│  Patient Name    │  CLINICAL FORMS           │
│──────────────────┼───────────────────────────│
│  Juan Dela Cruz  │  [ 💉 Edit ]              │
│  45y · Male      │    Form 3                 │
│                  │    🔵 Blue Button         │
│──────────────────┼───────────────────────────│
│  Maria Santos    │  [ 💉 Edit ]              │
│  32y · Female    │    Form 3                 │
│                  │    🔵 Blue Button         │
└──────────────────────────────────────────────┘

Tooltip: "Edit Form 3 (Vaccination Record)"
```

### 👔 Admin View
```
┌──────────────────────────────────────────────┐
│ PATIENT QUEUE - Admin View                   │
├──────────────────────────────────────────────┤
│                                              │
│  Patient Name    │  CLINICAL FORMS           │
│──────────────────┼───────────────────────────│
│  Juan Dela Cruz  │  [ 📋 Edit ] [ 💉 Edit ]  │
│  45y · Male      │   Form 2      Form 3      │
│                  │  🟢 Green    🔵 Blue      │
│──────────────────┼───────────────────────────│
│  Maria Santos    │  [ 📋 Edit ] [ 💉 Edit ]  │
│  32y · Female    │   Form 2      Form 3      │
│                  │  🟢 Green    🔵 Blue      │
└──────────────────────────────────────────────┘

Admin sees BOTH buttons!
```

### 📝 Registration Staff View
```
┌──────────────────────────────────────────────┐
│ PATIENT QUEUE - Registration View            │
├──────────────────────────────────────────────┤
│                                              │
│  Patient Name    │  CLINICAL FORMS           │
│──────────────────┼───────────────────────────│
│  Juan Dela Cruz  │        —                  │
│  45y · Male      │  (No buttons)             │
│                  │                           │
│──────────────────┼───────────────────────────│
│  Maria Santos    │        —                  │
│  32y · Female    │  (No buttons)             │
│                  │                           │
└──────────────────────────────────────────────┘

Registration staff focus on patient intake, 
not clinical forms!
```

---

## 📋 Form 2 Modal Layout (Doctor)

```
┌───────────────────────────────────────────────────────────────┐
│  Form 2: Individual Treatment Record               [×]        │
│  ═══════════════════════════════════════════════════════════  │
│                                                 🟢 GREEN THEME │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ℹ️  Patient: Juan Dela Cruz · Queue #1                      │
│                                                               │
│  ┌─ SECTION 1: Patient & Registration Information ─────────┐ │
│  │                                                          │ │
│  │  Date: [2026-08-01]    Registry No: [P-2024-001]       │ │
│  │  Hospital No: [_______]  Referred by: [__________]     │ │
│  │  PhilHealth PIN: [____________]                         │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ SECTION 2: Exposure Details ────────────────────────────┐ │
│  │                                                          │ │
│  │  Exposure Category *                                     │ │
│  │    ○ Category I    ○ Category II    ○ Category III      │ │
│  │                                                          │ │
│  │  Date of Exposure: [__________]   Treatment: [________] │ │
│  │  Place of Exposure: [_______________________________]   │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ SECTION 3: Exposure Details (Detailed) ─────────────────┐ │
│  │                                                          │ │
│  │  1. Mode of Animal Exposure *                           │ │
│  │     ☐ Nibbling/Licking of uncovered skin               │ │
│  │     ☐ Nibbling/Licking of wounded/broken skin          │ │
│  │     ☐ Scratch / Abrasion                                │ │
│  │     ☐ Transdermal Bite                                  │ │
│  │     ☐ Handling / Ingestion of raw infected meat         │ │
│  │                                                          │ │
│  │  2. Body Part Affected *                                 │ │
│  │     ○ Head and/or neck                                   │ │
│  │     ○ Other parts of the body                            │ │
│  │     ○ N/A if Ingestion mode                              │ │
│  │                                                          │ │
│  │  3. Type of Animal *                                     │ │
│  │     ○ Dog                                                 │ │
│  │     ○ Others: [__________________]                       │ │
│  │                                                          │ │
│  │  4. Past History of Animal Bite *                        │ │
│  │     ○ Yes    ○ No                                        │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                     [ Cancel ]  [ Save Form 2 ]│
│                                                    🟢 Green    │
└───────────────────────────────────────────────────────────────┘
```

---

## 💉 Form 3 Modal Layout (Nurse)

```
┌────────────────────────────────────────────────────────────────┐
│  Form 3: Vaccination Record                          [×]       │
│  ══════════════════════════════════════════════════════════    │
│                                                  🔵 BLUE THEME  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ℹ️  Patient: Juan Dela Cruz · Queue #1                       │
│                                                                │
│  ┌─ VACCINATION RECORD ──────────────────────────────────────┐ │
│  │                                                           │ │
│  │  Period     │ Route      │  Date       │ Given by │ Sign │ │
│  │─────────────┼────────────┼─────────────┼──────────┼──────│ │
│  │  Day 0      │ ○ID  ○IM  │ [________]  │ [_____]  │ [__] │ │
│  │  Day 3      │ ○ID  ○IM  │ [________]  │ [_____]  │ [__] │ │
│  │  Day 7      │ ○ID  ○IM  │ [________]  │ [_____]  │ [__] │ │
│  │  Day 28     │ ○ID  ○IM  │ [________]  │ [_____]  │ [__] │ │
│  │  Booster 1  │ ○ID  ○IM  │ [________]  │ [_____]  │ [__] │ │
│  │  Booster 2  │ ○ID  ○IM  │ [________]  │ [_____]  │ [__] │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
│  ℹ️  ID = Intradermal, IM = Intramuscular                     │
│      Fill only doses that have been administered              │
│                                                                │
│  ┌─ ADDITIONAL MEDICATIONS ───────────────────────────────────┐ │
│  │                                                           │ │
│  │  ☐ ERIG (Equine Rabies Immunoglobulin)                   │ │
│  │  ☐ TT (Tetanus Toxoid)                                    │ │
│  │  ☐ ATS (Anti-Tetanus Serum)                               │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─ DIAGNOSIS ────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  ICD 10 Code: [____________]                              │ │
│  │  (e.g., W54.0 for dog bite)                               │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                      [ Cancel ]  [ Save Form 3 ]│
│                                                     🔵 Blue     │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Patient Journey (Visual)

```
START: New Patient Arrives
         │
         ▼
┌────────────────────────┐
│  📝 REGISTRATION       │
│  Form 1                │
│  Registration Staff    │
│  • Patient demographics│
│  • Contact info        │
│  • Programs            │
└────────┬───────────────┘
         │
         │ Added to queue
         ▼
┌────────────────────────┐
│  🏥 PATIENT QUEUE      │
│  Status: Waiting       │
│  Queue #: 1            │
└────┬───────────┬───────┘
     │           │
     │           │ Registration sees: No clinical buttons
     │           │ Doctor sees: 🟢 Green Edit button
     │           │ Nurse sees: 🔵 Blue Edit button
     │           │
     │           ▼
     │    ┌──────────────────────┐
     │    │  👨‍⚕️ DOCTOR          │
     │    │  Clicks GREEN button  │
     │    │  📋 Form 2 Opens     │
     │    └──────┬───────────────┘
     │           │
     │           │ Doctor fills:
     │           │ • Exposure category (I/II/III)
     │           │ • Bite details
     │           │ • Animal type
     │           │ • Body part
     │           │
     │           ▼
     │    ┌──────────────────────┐
     │    │  💾 SAVES FORM 2     │
     │    │  ✅ Toast: Success   │
     │    │  🔄 Queue Refreshes  │
     │    └──────────────────────┘
     │
     ▼
┌────────────────────────┐
│  🏥 PATIENT QUEUE      │
│  Status: Ready for     │
│         Treatment      │
└────┬───────────────────┘
     │
     │ Nurse sees: 🔵 Blue Edit button
     │
     ▼
┌────────────────────────┐
│  👩‍⚕️ NURSE            │
│  Clicks BLUE button    │
│  💉 Form 3 Opens       │
└────┬───────────────────┘
     │
     │ Nurse fills:
     │ • Day 0 vaccine (route, date)
     │ • Given by name
     │ • Additional meds (ERIG, TT)
     │ • ICD 10 code
     │
     ▼
┌────────────────────────┐
│  💾 SAVES FORM 3       │
│  ✅ Toast: Success     │
│  🔄 Queue Refreshes    │
│  📅 Next appt: Day 3   │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  ✅ COMPLETED          │
│  Status: Day 0 Done    │
│  Follow-up: Day 3      │
└────────────────────────┘

FOLLOW-UP VISITS:
Patient returns Day 3, 7, 28
  → Nurse opens Form 3 again
  → Updates vaccination table
  → Saves
  → Next appointment scheduled
```

---

## 🎨 Color Legend

```
┌─────────────────────────────────────────────────────────┐
│  COLOR CODING GUIDE                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🟢 GREEN = Doctor / Triage / Form 2                   │
│     • Background: #f0fdf4                               │
│     • Text: #15803d                                     │
│     • Used for: Individual Treatment Record             │
│                                                         │
│  🔵 BLUE = Nurse / Treatment / Form 3                  │
│     • Background: #eff6ff                               │
│     • Text: #1e40af                                     │
│     • Used for: Vaccination Record                      │
│                                                         │
│  🟡 YELLOW = Waiting Status                            │
│     • Indicates patient waiting for service             │
│                                                         │
│  🟠 ORANGE = In Consultation                           │
│     • Indicates active treatment                        │
│                                                         │
│  🔴 RED = Urgent/Emergency Priority                    │
│     • High-priority patients                            │
│                                                         │
│  ⚪ GRAY = Completed/Cancelled                         │
│     • No longer active in queue                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 Responsive Layout

### Desktop View (Wide Screen)
```
┌───────────────────────────────────────────────────────────────┐
│  Queue│Queue│Patient │Appt│Visit  │Priority│Status│Wait│Forms│Actions│
│   ID  │  #  │  Name  │ ID │ Type  │        │      │Time│     │       │
│───────┼─────┼────────┼────┼───────┼────────┼──────┼────┼─────┼───────│
│  #123 │  1  │ Juan   │#456│ New   │ Urgent │Wait  │15m │[Edit]│[Call]│
└───────────────────────────────────────────────────────────────┘
              All columns visible, comfortable spacing
```

### Tablet View (Medium Screen)
```
┌─────────────────────────────────────────────────┐
│ Queue #│Patient    │Status  │Wait │Forms│Actions│
│────────┼───────────┼────────┼─────┼─────┼───────│
│   1    │ Juan      │Waiting │ 15m │[Edit]│[Call]│
└─────────────────────────────────────────────────┘
         Less critical columns hidden
```

### Mobile View (Small Screen)
```
┌──────────────────────────────┐
│  #1  │  Juan Dela Cruz       │
│      │  Waiting · 15 min     │
│      │  [Edit] [Call]        │
└──────────────────────────────┘
     Stacked layout, 
     essential info only
```

---

## 🎯 Button State Visualization

### Active Patient (Waiting/In Consultation)
```
┌─────────────────────────┐
│  👨‍⚕️ Doctor sees:        │
│  ┌──────────────────┐   │
│  │ 📋 Edit          │   │ ← Enabled, clickable
│  │ Form 2           │   │   Green color
│  └──────────────────┘   │   Shows tooltip on hover
└─────────────────────────┘
```

### Completed Patient
```
┌─────────────────────────┐
│  👨‍⚕️ Doctor sees:        │
│       —                 │ ← No button, dash symbol
│   (completed)           │   Gray text
└─────────────────────────┘
```

### Wrong Role
```
┌─────────────────────────┐
│  📝 Registration sees:   │
│       —                 │ ← No button
│   (no access)           │   Doesn't need clinical forms
└─────────────────────────┘
```

---

## 🔍 Modal Interaction States

### 1. Modal Closed (Initial State)
```
Queue Dashboard
No modal visible ✅
User can see queue table
```

### 2. User Clicks Edit Button
```
Button clicked
↓
Modal opens with smooth animation
↓
Form loads with patient data pre-filled
↓
Background dims (overlay)
↓
User can now fill form
```

### 3. User Fills Form
```
Form active
All fields accessible ✅
Validation (frontend) active
Can type, select, check options
```

### 4. User Clicks Save
```
Save button clicked
↓
Loading spinner appears on button
Button disabled
↓
Success toast appears (green)
↓
Modal closes
↓
Queue table refreshes
↓
Back to queue dashboard
```

### 5. User Clicks Cancel
```
Cancel button clicked
↓
Modal closes immediately (no save)
↓
No toast notification
↓
Queue table unchanged
↓
Back to queue dashboard
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        DATA FLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Login                                                 │
│      │                                                      │
│      ├─ localStorage.getItem('userData')                   │
│      └─ Extract: user.role                                 │
│                                                             │
│  Queue Dashboard Load                                       │
│      │                                                      │
│      ├─ API: GET /api/queue                                │
│      ├─ Returns: Array of queue entries                    │
│      └─ State: setQueue(data)                              │
│                                                             │
│  Render Table                                               │
│      │                                                      │
│      ├─ For each queue entry                               │
│      ├─ Render QueueActions component                      │
│      │   ├─ Props: entry, userRole                         │
│      │   └─ Conditional button render                      │
│      │                                                      │
│      └─ If doctor: Show green button                       │
│          If nurse: Show blue button                         │
│          If admin: Show both                                │
│          If registration: Show nothing                      │
│                                                             │
│  User Clicks Edit Button                                    │
│      │                                                      │
│      ├─ Form 2: setForm2Target(entry)                      │
│      │   └─ Opens IndividualTreatmentForm modal            │
│      │                                                      │
│      └─ Form 3: setForm3Target(entry)                      │
│          └─ Opens VaccinationRecordForm modal              │
│                                                             │
│  Modal Opens                                                │
│      │                                                      │
│      ├─ Pre-fill patient data from entry prop              │
│      ├─ Initialize form state                              │
│      └─ Render form sections                               │
│                                                             │
│  User Fills & Saves                                         │
│      │                                                      │
│      ├─ TODO: API call to save data                        │
│      ├─ Show success toast                                 │
│      ├─ Close modal (setForm2Target(null))                 │
│      └─ Refresh queue (loadData())                         │
│                                                             │
│  Queue Refreshes                                            │
│      │                                                      │
│      └─ API: GET /api/queue (again)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Visual Checklist

Use this to verify implementation:

### Queue Table
- [ ] "CLINICAL FORMS" column exists
- [ ] "QUEUE ACTIONS" column exists
- [ ] Buttons aligned properly
- [ ] Icons visible
- [ ] Colors correct (green/blue)

### Button Visibility
- [ ] Doctor sees green button only
- [ ] Nurse sees blue button only
- [ ] Admin sees both buttons
- [ ] Registration sees no clinical buttons
- [ ] Completed patients show dash

### Form 2 (Doctor)
- [ ] Green title bar
- [ ] 3 sections visible
- [ ] All fields present
- [ ] Patient alert at top
- [ ] Save button green
- [ ] Cancel button gray

### Form 3 (Nurse)
- [ ] Blue title bar
- [ ] Vaccination table (6 rows)
- [ ] Additional meds checkboxes
- [ ] ICD 10 code field
- [ ] Info alert present
- [ ] Save button blue

### Interactions
- [ ] Buttons clickable
- [ ] Modals open smoothly
- [ ] Forms can be filled
- [ ] Save shows toast
- [ ] Cancel closes modal
- [ ] Queue refreshes after save

---

**Visual Guide Complete** ✅  
Use this document to understand the UI layout and flow!

🎨 **Happy Designing!**
