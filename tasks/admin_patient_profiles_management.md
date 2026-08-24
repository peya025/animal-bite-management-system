# 📋 Admin Task: Display & Management of Pre-Registered Patient Profiles

> **Target Area**: Admin Web Portal (rontend/src/features/patients/ & ackend/)  
> **Status**: Planned / Future Task  
> **Category**: Patient Registry & Clinic Triage Workflow  

---

## 🎯 1. Overview & Purpose

In the mobile app, users can register patient profiles for themselves and their dependents (children, spouse, relatives) even **before** booking an online appointment.

This task outlines the implementation on the **Admin Web Portal** so clinic staff (doctors, nurses, and triage officers) can view, search, and manage all pre-registered patient profiles—even if they haven't booked an appointment yet.

---

## 💡 2. Why This is Essential for Clinic Operations

1. **Fast-Track Walk-In Patients**:
   - Many animal bite victims panic and walk directly into the Animal Bite Treatment Center (ABTC) without booking an online slot.
   - When the patient arrives, clinic staff can search their name or phone number and find their **Form 1 details, PhilHealth ID, 4Ps status, and Purok/Barangay address** already filled out.
   - Staff click ** Start Bite Intake / Queue** without needing to manually re-enter demographic data.
2. **Preventing Duplicate Patient Records**:
   - Staff won't create a redundant second paper/digital record for a patient who already created a profile on mobile.
3. **Household & Family Linking**:
   - Staff can view linked dependents under a parent's mobile account for faster pediatric verification.
4. **Verification & Audit Compliance**:
   - Staff can verify patient identity documents (PhilHealth card, 4Ps ID) and update patient status from pending to erified.

---

## 📊 3. Patient Status Breakdown in Admin

| Status / Tag | Meaning | Available Actions |
|---|---|---|
| 📱 **Pre-Registered (Mobile)** | Profile created on mobile app; no active bite incident booked yet. | • Start New Bite Intake<br>• Verify Profile / IDs<br>• Edit Demographic Details |
| 🟢 **In Treatment (Active Case)** | Has an ongoing animal bite case with scheduled vaccine doses (Day 0, 3, 7, 28). | • View Vaccination Card<br>• Administer Next Dose<br>• Record Adverse Reactions |
| 🏁 **Completed** | Finished the prescribed rabies PEP regimen. | • View Certificate / Export History<br>• Re-open for new bite incident |
| 📦 **Archived** | Dependent deactivated or unlinked on mobile. | • Read-only medical history archive<br>• Restore profile if needed |

---

## 🖥️ 4. Recommended Admin UI & Workflow

### A. Patient Master Directory Table
Add filter tabs at the top of the Patient Directory:
`	ext
┌──────────────────────────────────────────────────────────────────────────────────┐
│  PATIENT DIRECTORY                                                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [All Patients]   [🟢 Active Cases]   [📅 Scheduled Today]   [📱 Pre-Registered] │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Name               Contact        Barangay       Status          Action         │
│  ──────────────────────────────────────────────────────────────────────────────  │
│  Juan Dela Cruz     09171234567    Poblacion      🟢 In Treatment  [View Case]   │
│  Maria Dela Cruz    09171234567    Poblacion      📱 Pre-Enrolled [Start Intake] │
└──────────────────────────────────────────────────────────────────────────────────┘
`

### B. Start Bite Intake Action for Walk-Ins
When a pre-registered patient walks in:
1. Staff clicks **Start Bite Intake** on the patient's row.
2. The Intake Form (Form 3 / Incident Details) opens with the patient's demographic information **already pre-filled**.
3. Staff only enters incident-specific details:
   - Date & Time of Bite
   - Animal Type (Dog, Cat, etc.) & Status (Owned, Stray)
   - Wound Location & Category (Category I, II, III)
   - Tetanus & Rabies Vaccine Prescription
4. Submitting the intake automatically creates the active bite case and assigns a queue number!

---

## 🗄️ 5. Technical Requirements

### Backend (ackend/)
- [ ] Ensure GET /api/patients endpoint returns all registered patients with their linked account metadata:
  `json
  {
    id: 42,
    name: Maria Dela Cruz,
    relationship: child,
    is_active: true,
    has_active_case: false,
    source: mobile_app,
    account: {
      id: 5,
      parent_name: Juan Dela Cruz,
      phone: 09171234567
    }
  }
  `
- [ ] Endpoint POST /api/cases or POST /api/intake accepting an existing patient_id to start treatment without re-creating the patient record.

### Frontend (rontend/src/features/patients/)
- [ ] Add Pre-Registered filter tab on the Patient List view.
- [ ] Add 📱 Mobile Registered badge in patient rows.
- [ ] Add quick-action button: **Start Bite Intake** for pre-registered patients.
- [ ] Show household parent/guardian info on dependent patient cards.

---

## ✅ Checklist for Future Implementation

- [ ] **Phase 1: Backend Alignment**
  - Verify patient queries include mobile-registered patients without appointments.
  - Ensure is_active soft-delete flag is respected in clinic queries.
- [ ] **Phase 2: Admin UI Filters**
  - Add Pre-Registered tab to PatientListView.vue / PatientsTable.tsx.
  - Add source badge (Mobile vs Walk-in Desk).
- [ ] **Phase 3: Walk-in Quick Intake Flow**
  - Connect Start Intake button to pre-fill Form 1 details into the incident intake dialog.
- [ ] **Phase 4: Testing & Verification**
  - Register a dependent on mobile app -> Verify profile appears instantly in Admin -> Perform walk-in intake -> Check vaccination card updates on mobile.
