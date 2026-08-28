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

## 🏛️ 2. Station-by-Station Responsibilities & UI Gating

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

## ⚠️ 3. Overdue & Missed Schedule Protocol

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
```

### Daily Queue Ticket Expiration:
- Queue numbers are strictly **single-day tokens**.
- If a patient is queued on Monday but never called or never showed up, the ticket **auto-expires at midnight**.
- When the patient walks in on a subsequent day, staff issues a **fresh queue number for today** instead of retaining stale 4-day-old queue tickets.

---

## 🐛 4. Admin Bug Catcher & Integrity Diagnostics

Located at `/developer/appointment-diagnostics`, the automated health auditor runs continuous integrity checks across all 3 stations:

| Rule Code | Monitored Desk | Severity | Violation Condition | Automated Remediation |
|---|---|---|---|---|
| `UNASSESSED_WALKIN_PATIENT` | Registration Desk | ⚠️ Warning | Walk-in registered $>1$ day ago with 0 Doctor Form 2 assessments. | Flag for staff follow-up or triage queueing upon return. |
| `TREATMENT_WITHOUT_DOCTOR_TRIAGE` | Treatment Desk | 🚨 Critical | Dose recorded in Form 3 without any doctor bite incident assessment on file. | Block save & require doctor intake link. |
| `CLOSED_OPERATING_DAY_VIOLATION` | Schedule Engine | 🚨 Critical | Follow-up appointment scheduled on closed weekday or holiday exception. | 1-Click auto-shift to next open clinic day. |
| `DOSE_SEQUENCE_CHRONOLOGY_INVERSION` | Clinical Engine | 🚨 Critical | Follow-up dose (e.g. Day 7) dated earlier than previous dose (e.g. Day 3). | Recalculate chronological timeline. |
| `ADMINISTERED_DOSE_APPOINTMENT_NOT_COMPLETED` | Treatment Desk | ⚠️ Warning | Dose given in Form 3 but appointment table remains in `scheduled` status. | 1-Click auto-sync status to `completed`. |

---

## 📊 5. Summary Matrix of Station Behaviors

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
│ Booster Doses          │ Badge: "Direct to Treatment"  │ Bypassed (Not in Queue)       │ [ Record Dose (Form 3) ]      │
└────────────────────────┴───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```
