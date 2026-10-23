# 🏥 ABTC Clinical Patient Lifecycle & Station Routing Workflow Specification

> **System**: Animal Bite Management System (ABTC / RHU)  
> **Target Desks**: Registration Desk, Doctor / Triage Desk, Treatment / Nurse Desk, Admin Bug Catcher  
> **Standards Compliance**: DOH National Rabies Prevention and Control Program (NRPCP) & WHO Rabies PEP Protocols  
> **Date**: August 2026  

---

## 🧭 1. Executive Workflow Philosophy

An Animal Bite Treatment Center (ABTC) handles two fundamentally different patient populations:
1. **Initial Day 0 Exposure Victims (New Cases)**: Require formal medical history intake, wound assessment, exposure category grading (Category I/II/III), and PEP regimen prescription by a physician before any biologicals can be administered.
2. **Routine Follow-Up Patients (Day 3, Day 7, Day 28, Boosters)**: Have already established clinical diagnosis and treatment plans. They attend strictly for routine vaccine injections and do **not** require physician re-assessment unless complications occur.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PATIENT ARRIVAL AT ABTC                                          │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                                   ┌────────────────┴────────────────┐
                                   ▼                                 ▼
                     [ NEW BITE EXPOSURE / DAY 0 ]       [ FOLLOW-UP DOSE (DAY 3, 7, 28) ]
                                   │                                 │
                                   ▼                                 ▼
                         [ REGISTRATION DESK ]             [ DIRECT TO TREATMENT ]
                      • Register / Identity Check         • Skip Registration Check-in
                      • Check In to DOCTOR TRIAGE         • Arrive at Nurse Treatment Desk
                                   │                                 │
                                   ▼                                 ▼
                       [ DOCTOR / TRIAGE DESK ]             [ NURSE TREATMENT DESK ]
                      • Wound Exam & Risk Grading         • Check-in at Treatment Desk
                      • Fill Form 2 (Treatment Card)      • FIFO Batch Allocation
                      • Prescribe PEP & Follow-ups        • Record Dose (Form 3)
                                   │                                 │
                                   ▼                                 ▼
                        [ UNLOCKS TREATMENT ]            [ AUTO-SCHEDULE NEXT DOSE ]
                      • Patient proceeds to Nurse         • Dynamic Operating Calendar
                      • Nurse administers Day 0           • Shift if Clinic is Closed
```

---

## 👥 2. Treatment Desk Staffing Models (Solo Nurse vs Dual Staff)

The system is designed to support both small rural health units (RHUs) with a single nurse and high-volume city ABTC centers with multi-person vaccination stations:

### 🅰️ Model A: Solo Nurse Operation (1 Nurse Desk)
* **Setup**: 1 Nurse on duty in the Treatment room.
* **How it works**:
  - The nurse keeps the **`/nurse/patients`** desk open on the computer/tablet.
  - When the patient enters the room, the nurse clicks **`[ Record Dose (Form 3) ]`** directly.
  - Submitting Form 3 **automatically completes check-in and logs the administered dose in a single 30-second step** (eliminating double clicks and saving time).

### 🅱️ Model B: Dual Staff / High-Volume Operation (2 Staff Stations)
* **Setup**: 1 Intake Assistant / Triage Nurse + 1 Vaccinator Nurse.
* **How it works**:
  - **Staff 1 (Intake / Check-In)**: Greets arriving follow-up patients at the doorway, scans their Mobile QR Card or searches patient number, and clicks **`[ Check In ]`**. This assigns the patient their official **FIFO arrival queue ticket**.
  - **Staff 2 (Vaccinator Nurse)**: Calls the next queue number, administers the vaccine, decrements the opened vial batch (FIFO), and submits **Form 3**.

---

## 🏛️ 3. Station-by-Station Responsibilities & UI Gating

### 🏢 Station 1: Registration Desk (`/patients`)

The Registration Desk is the **entry point for initial intake and master patient registry**.

#### A. Patient Types Handled:
1. **Brand New Walk-In Patients**: Arriving immediately after an animal bite.
2. **Online Pre-Booked Initial Consultations**: Mobile patients arriving for their Day 0 consultation.
3. **Unassessed Walk-Ins**: Patients registered previously who did not proceed to doctor triage.

#### B. Button & Action Gating Rules:
| Patient State | Status Badge | Available Actions | Target Routing |
|---|---|---|---|
| **New Walk-In (Today)** | `New Case (Ready for Triage)` | **`[ Check In to Triage ]`** | Queues to **Doctor Triage** (`visit_type = 'new_case'`) |
| **Registered Earlier (No Triage)** | `⚠️ Registered (Awaiting Triage)` | **`[ Check In to Triage ]`** | Queues to **Doctor Triage** (`visit_type = 'new_case'`) |
| **Missed Consultation Booking** | `⚠️ Missed Schedule (Nd ago)` | **`[ Check In to Triage ]`** | Queues to **Doctor Triage** (`visit_type = 'new_case'`) |
| **Follow-Up (Day 3, 7, 28, Booster)** | `Direct to Treatment` | *No Check-In Button* | Directs patient to **Treatment Desk** |

> 🚫 **Critical Rule**: The Registration Desk **never** checks in follow-up vaccination patients. Rendering check-in buttons for follow-ups at registration creates double queue confusion and clinical bottlenecks.

---

### 🩺 Station 2: Doctor / Triage Desk (`/doctor` & `/queue`)

The Doctor Desk is the **clinical assessment and exposure grading gatekeeper**.

#### A. Responsibilities:
1. Conduct physical wound inspection, assess anatomical location, bleeding, and animal status.
2. Determine Exposure Classification (**Category I, II, or III**).
3. Fill and submit **Form 2 (Individual Treatment Record / Bite Incident)**.
4. Prescribe PEP regimen (e.g., 2-1-1 Zagreb or 2-site ID regimen) and determine if Rabies Immunoglobulin (RIG) / Anti-Tetanus is required.

#### B. System State Transition:
- When the doctor clicks **"Complete Consultation / Save Assessment"**:
  - `queues.status` transitions from `'in_consultation'` $\rightarrow$ `'completed'`.
  - `bite_incidents` record is formally created in database.
  - **Clinical Gatekeeper Trigger**: The patient is now **unlocked** in the Nurse Treatment Desk.

---

### 💉 Station 3: Treatment / Nurse Desk (`/nurse/patients` & `/vaccinations`)

The Treatment Desk is responsible for **biological administration, inventory batch decrementing, and schedule tracking**.

#### A. Initial Visit (Day 0) Gatekeeper Rule:
- If a patient has **0 previous doses** and **0 Form 2 / Bite Incident records**:
  - The patient is considered **Awaiting Doctor Triage**.
  - **`[ Record Dose (Form 3) ]`** button is **disabled/locked**.
  - Status Badge: **`⏳ Awaiting Triage (Form 2)`**.
  - Tooltip: *"Patient must complete Doctor Assessment & Form 2 before initial Dose 1 can be recorded."*

#### B. Follow-Up Doses (Day 3, Day 7, Day 28, Boosters):
- Since Form 2 and Dose 0 were already established on Day 0:
  - Patient bypasses Doctor Triage completely.
  - Nurse has immediate active **`[ Check In ]`** and **`[ Record Dose (Form 3) ]`** buttons.
  - Administering the dose updates `treatment_records`, auto-completes the corresponding appointment, and computes the next dose date against the **Clinic's Operating Schedule**.

---

## ⚡ 4. Daily Queue Refresh & True FIFO Sequencing

### A. Daily Queue Ticket Expiration
- Queue numbers are strictly **single-day tokens** (`queue_date = today`).
- At midnight (00:00), any unserved ticket from yesterday automatically expires as `cancelled / no-show`.
- When the clinic opens at 8:00 AM, the queue starts fresh from **Queue #1**.

### B. "Expected Today" vs "Active Queue" (No Ghost Queuing)
To avoid calling empty seats and maintain strict FIFO fairness:
1. **Scheduled Patients**: Appear in the **"Expected Today"** counter and list, but are **NOT** inserted into the active calling queue until they physically arrive.
2. **Physical Arrival Check-In**:
   - The exact moment a patient arrives and is checked in (via Nurse desk or QR scan), they receive the **next available FIFO queue number**.
   - This prevents patients sitting at home from blocking patients who are already waiting in the clinic.

---

## ⚠️ 5. Overdue, Missed Schedule & Catch-Up Protocol

```
                                  APPOINTMENT DATE PASSES
                                             │
                                             ▼
                             [ AUTO-EXPIRE DAILY QUEUE ]
                             • Status transitions to 'cancelled'
                             • Patient is removed from today's active waiting
                                             │
                                             ▼
                             [ FLAG AS MISSED / OVERDUE ]
                             • Overdue badge: "Missed Schedule (Aug 24 · 4d ago)"
                             • Appears in Registration & Missed Recall Station
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [ PATIENT RETURNS TODAY ]                  [ PATIENT DOES NOT RETURN ]
            • Registration staff clicks                 • Staff opens Recall Station
              [ Check In to Triage ] (Day 0)            • Dispatches 1-Click Multi-Channel Alert:
              OR Nurse clicks                             - 📱 SMS Urgent Reminder
              [ Record Dose ] (Follow-up)                 - 📧 Email Medical Warning
            • Generates fresh queue ticket                - 🔔 Mobile App Push Notification
            • Auto-shifts subsequent doses
```

### A. Catch-Up Dose Administration & Regimen Date Recalculation:
When an overdue patient arrives (e.g. Day 3 was scheduled for Monday, but patient arrives on Friday):
1. Nurse clicks **`[ Check In Today ]`** $\rightarrow$ issues today's FIFO queue ticket.
2. When the catch-up dose is administered in Form 3:
   - The actual date of administration is recorded.
   - In accordance with DOH/WHO minimum immunological spacing rules, the system **automatically shifts subsequent doses (Day 7, Day 28)** forward from the actual administration date, ensuring the patient receives proper rabies antibody protection!

### B. Multi-Channel Missed Recall Alerts:
For patients who have not returned:
- Registration & Nurse staff can dispatch **1-Click Multi-Channel Recall Alerts**:
  - **SMS**: Urgent reminder sent to patient's registered mobile phone.
  - **Email**: Notification with clinical risk explanation.
  - **Mobile App**: Push notification with quick reschedule action.

---

## 🐛 6. Admin Bug Catcher & Integrity Diagnostics

Located at `/developer/appointment-diagnostics`, the automated health auditor runs continuous integrity checks across all 3 stations:

| Rule Code | Monitored Desk | Severity | Violation Condition | Automated Remediation |
|---|---|---|---|---|
| `UNASSESSED_WALKIN_PATIENT` | Registration Desk | ⚠️ Warning | Walk-in registered $>1$ day ago with 0 Doctor Form 2 assessments. | Flag for staff follow-up or triage queueing upon return. |
| `TREATMENT_WITHOUT_DOCTOR_TRIAGE` | Treatment Desk | 🚨 Critical | Dose recorded in Form 3 without any doctor bite incident assessment on file. | Block save & require doctor intake link. |
| `CLOSED_OPERATING_DAY_VIOLATION` | Schedule Engine | 🚨 Critical | Follow-up appointment scheduled on closed weekday or holiday exception. | 1-Click auto-shift to next open clinic day. |
| `DOSE_SEQUENCE_CHRONOLOGY_INVERSION` | Clinical Engine | 🚨 Critical | Follow-up dose (e.g. Day 7) dated earlier than previous dose (e.g. Day 3). | Recalculate chronological timeline. |
| `ADMINISTERED_DOSE_APPOINTMENT_NOT_COMPLETED` | Treatment Desk | ⚠️ Warning | Dose given in Form 3 but appointment table remains in `scheduled` status. | 1-Click auto-sync status to `completed`. |

---

## 📊 7. Summary Matrix of Station Behaviors

```
┌────────────────────────┬───────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│ Patient Category       │ Registration Desk (/patients) │ Doctor Desk (/doctor)         │ Nurse Desk (/nurse/patients)  │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ New Walk-In (Day 0)    │ [ Check In to Triage ]        │ Active in Consultation Queue  │ Locked (Awaiting Triage)      │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Online Booking (Day 0) │ [ Check In to Triage ]        │ Active in Consultation Queue  │ Locked (Awaiting Triage)      │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Registered (No Triage) │ [ Check In to Triage ]        │ Becomes active upon check-in  │ Locked (Awaiting Triage)      │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Follow-Up (Day 3)      │ Badge: "Direct to Treatment"  │ Bypassed (Not in Queue)       │ [ Record Dose (Form 3) ]      │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Follow-Up (Day 7)      │ Badge: "Direct to Treatment"  │ Bypassed (Not in Queue)       │ [ Record Dose (Form 3) ]      │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Follow-Up (Day 28)     │ Badge: "Direct to Treatment"  │ Bypassed (Not in Queue)       │ [ Record Dose (Form 3) ]      │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Overdue / Catch-up     │ Badge: "Direct to Treatment"  │ Bypassed (Not in Queue)       │ [ Check In Today ] & Record   │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Booster Doses          │ Badge: "Direct to Treatment"  │ Bypassed (Not in Queue)       │ [ Record Dose (Form 3) ]      │
└────────────────────────┴───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```
