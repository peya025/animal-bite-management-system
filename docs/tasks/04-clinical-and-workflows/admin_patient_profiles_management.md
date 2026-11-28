# 📋 Admin Task: Display & Management of Pre-Registered Patient Profiles in User Management

> **Target Area**: Admin Web Portal (`frontend/src/features/users/` & `backend/app/Http/Controllers/UserController.php`)  
> **Status**: Completed  
> **Category**: User Management & Clinic Walk-in Intake Workflow  

---

## 🎯 1. Overview & Purpose

In the mobile app, users create mobile accounts and register patient profiles for themselves and their dependents (children, spouse, relatives) even **before** booking an online appointment.

Pre-registered mobile accounts and their linked patient profiles are managed inside **User Management $\rightarrow$ Patient Accounts** tab on the Admin Web Portal. This ensures that the primary clinical Patient Directory remains dedicated to active clinical treatment cases and daily queues, while User Management allows clinic admins to inspect all registered mobile users, their linked dependents, and initiate walk-in bite intake when needed.

---

## 💡 2. Why This is Essential for Clinic Operations

1. **Fast-Track Walk-In Patients from Mobile Accounts**:
   - When a pre-registered mobile user arrives at the clinic without a pre-booked appointment, clinic staff can open **User Management $\rightarrow$ Patient Accounts**, click **"Profiles"**, inspect the pre-registered details (Form 1 demographics, PhilHealth ID, Purok/Barangay address), and click **"Start Bite Intake"**.
2. **Preventing Duplicate Patient Records**:
   - Staff can review linked patient profiles before enrolling new records, ensuring account integrity.
3. **Household & Family Linking**:
   - Staff can inspect all family members linked to a parent's mobile account in one place.
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
