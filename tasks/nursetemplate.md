# Dual-Nurse Workstation & Role-Based Queue System Specification

**Date**: September 14, 2026  
**Status**: Ready for Implementation (Saved for Tomorrow)  
**Location**: `tasks/nursetemplate.md`  

---

## 1. Executive Summary & Operational Context

In the animal bite treatment center, patient intake and ongoing vaccination follow-ups serve two completely different operational rhythms:

1. **Intake / New Patients (Nurse 1)**:
   - Requires comprehensive triage (Form 2), bite classification (Category I, II, III), animal history assessment, wound cleaning verification, tetanus toxoid assessment, and Day 0 initial dose administration.
   - Highly time-intensive per patient (~10–15 minutes).
2. **Follow-ups & Boosters (Nurse 2)**:
   - Returning patients already have established medical records.
   - Requires identity confirmation, adverse reaction screening, rapid administration of Day 3, Day 7, or Booster doses, and setting the next schedule.
   - Rapid turnaround (~2–3 minutes per patient).

### Scalability Scenarios Supported

- **Two-Nurse Clinic (Default Target)**:
  - **Nurse 1 (`intake_nurse`)**: Logs into Workstation 1 $\rightarrow$ Defaults to the **New Patient / Triage Queue** (`/queue`).
  - **Nurse 2 (`follow_up_nurse`)**: Logs into Workstation 2 $\rightarrow$ Defaults to the **Follow-up & Booster Patient List** (`/nurse/patients?tab=due_today`).
- **Solo-Nurse Clinic (1 staff member handles everything)**:
  - A single nurse account is assigned both roles/modules.
  - A workstation mode switcher in the navigation bar allows switching between `[Intake Queue]`, `[Follow-Up Queue]`, and `[Unified Combined View]`.
  - Full auditability is preserved under the nurse's individual identity.
- **Multi-Nurse Clinic (3–5+ nurses)**:
  - Administrators assign specific stations or duty modules dynamically based on daily shift rosters.

---

## 2. Identity Verification & User Validation

A common clinic concern is: *"How does the system ensure Nurse 1 and Nurse 2 are really the ones operating their stations, and prevent identity confusion or falsification?"*

```
                     ┌───────────────────────────────┐
                     │     Individual Staff Login    │
                     │   (Nurse A vs. Nurse B Creds) │
                     └───────────────┬───────────────┘
                                     │
                     ┌───────────────▼───────────────┐
                     │   Laravel Sanctum Auth Token  │
                     │  (Encrypted in Session Storage│
                     └───────────────┬───────────────┘
                                     │
       ┌─────────────────────────────┴─────────────────────────────┐
       ▼                                                           ▼
┌───────────────────────────────┐           ┌───────────────────────────────┐
│     Nurse 1 (Workstation 1)   │           │     Nurse 2 (Workstation 2)   │
│ • Token bound to User ID #1   │           │ • Token bound to User ID #2   │
│ • Assigned: intake_nurse      │           │ • Assigned: follow_up_nurse   │
│ • Handles: Day 0 / Intake     │           │ • Handles: Follow-ups/Boosters│
└───────────────┬───────────────┘           └───────────────┬───────────────┘
                │                                           │
                └─────────────────────┬─────────────────────┘
                                      │
                     ┌────────────────▼───────────────┐
                     │ Server-Side Identity Stamping │
                     │ • auth('sanctum')->user()->id  │
                     │ • administered_by = $userId   │
                     │ • performed_by = $userId      │
                     │ • Nurse Signature & Name Stamp│
                     └────────────────────────────────┘
```

### 2.1 Technical Identity Guarantees
1. **Isolated Session Tokens (Laravel Sanctum)**:
   - Each nurse logs in with their own distinct account credentials.
   - The server generates an encrypted, single-user Bearer token tied strictly to that database user ID (`users.id`).
   - Browser sessions (cookies/local storage) are completely isolated across workstations.
2. **Server-Side Identity Stamping (Zero Client Spoofing)**:
   - The frontend never submits an unverified user ID in request bodies.
   - All backend controllers resolve the logged-in user via `auth('sanctum')->user()->id`.
   - In `VaccinationRecordController.php`:
     ```php
     $userId = auth()->id();
     $nurseName = auth()->user()->name;

     $record = TreatmentRecord::create([
         // ...
         'administered_by' => $userId,
         'remarks'         => "Given by: {$nurseName} | " . (auth()->user()->clinic->name ?? 'ABTC'),
         'signature'       => auth()->user()->signature_path ?? $request->signature,
     ]);
     ```
3. **Official Medical Document Fingerprint**:
   - The nurse's full legal name and digital signature are permanently embedded into:
     - The DOH Tagoloan Treatment Card (`TagoloanTreatmentCardModal.tsx`).
     - The Printable Medical Record and Vaccination Certificate.
     - Historical dose breakdown logs.

---

## 3. Monitoring & Audit Logging Architecture

Supervisors and Clinic Administrators can track, filter, and inspect all staff actions in real time.

### 3.1 Staff Activity Monitor UI (`/staff-activity`)
Located in **Clinic Setup → Staff Activity** (`StaffActivityPage.tsx`), backed by `AuditLogController.php`:

- **Real-Time Audit Stream**:
  - **Staff Actor**: Name, email, role badge (`Nurse`, `Admin`, `Staff`).
  - **Action Badges**: `LOGIN`, `LOGOUT`, `CREATED` (green), `UPDATED` (blue), `DELETED` (red), `VIEWED` (gray).
  - **Event Description**: E.g., `"POST /api/vaccination-records"`, `"Day 3 administered for Patient #5"`.
  - **Network & Device Fingerprint**: IP address, user agent, exact timestamp.
- **Filtering & Search Tools**:
  - Filter specifically by **Nurse 1** or **Nurse 2** to review shift productivity.
  - Filter by date range or specific actions (e.g., only vaccination creations or logins).
  - Full-text search across descriptions and IP addresses.
- **Operational KPI Cards**:
  - **Actions Today**: Total actions executed across the clinic.
  - **Logins Today**: Number of active staff sessions.
  - **Most Active Staff**: Identifies the top clinical contributor for the day.
  - **After-Hours Actions Banner**: Automatically alerts if any clinical actions occurred outside 8:00 AM – 5:00 PM operating hours.

### 3.2 Queue Movement Audit Trail (`queue_history` table)
Every single transition of a patient in the clinic is logged via `QueueHistory.php`:
- `queue_id`: The patient's queue ticket.
- `action`: `called`, `serving`, `completed`, `no_response`, `transferred`.
- `performed_by`: The exact User ID of the nurse who took action.
- `occurred_at`: Precise timestamp.

### 3.3 Automatic Request Auditing (`AuditMiddleware.php`)
Every HTTP mutation (`POST`, `PUT`, `PATCH`, `DELETE`) is captured automatically by the global audit middleware into the `audit_logs` database table with response status codes and request payloads.

---

## 4. Security Measures & Safeguards

| Security Feature | Implementation Mechanism | Clinical Benefit |
| :--- | :--- | :--- |
| **Workstation Concurrency Lock (HTTP 409)** | Database optimistic locking and queue status check (`QueueController::callTicket`, `serveTicket`). | Prevents Nurse 1 and Nurse 2 from calling, serving, or opening the same patient simultaneously. |
| **Double-Dose Prevention** | Unique composite index on `(patient_id, dose_number, bite_incident_id)` and backend pre-check in `VaccinationRecordController`. | A nurse cannot accidentally double-inject or record two Day 3 doses on the same patient visit. |
| **Data Immutability on Medical Logs** | Once recorded, `administered_by` is immutable in `treatment_records`. Edits to notes create an `updated` audit log with `old_values` vs `new_values`. | Preserves clinical and legal integrity. Historical records cannot be rewritten to shift blame. |
| **Role-Based Access Control (RBAC)** | Frontend `ProtectedRoute` combined with Laravel Sanctum route middleware and `assigned_module` guards. | Ensures staff only access features permitted for their role and duty station. |
| **Session Invalidation on Logout** | `AuthController::logout` invokes `$request->user()->currentAccessToken()->delete()`. | Prevents workstation token reuse or session hijacking when shifts change. |
| **Clinic Operating Hours & Clinical Spacing Enforcement** | `ClinicScheduleService.php` forward-shifts closed days and maintains minimum interval spacing. | Appointments cannot be booked on closed days, and minimum clinical recovery spacing between doses is strictly preserved. |

---

## 5. Technical Implementation Plan (For Tomorrow)

### Phase 1: Staff Roles & Station Configuration
1. **Database Migration**:
   - Add `workstation_mode` / `assigned_modules` column to `users` table:
     - `intake_nurse`: Focuses on triage, new patient queue, Day 0.
     - `follow_up_nurse`: Focuses on returning patients, Day 3, Day 7, Boosters.
     - `all_nursing`: Has access to both stations with toggle switcher.
2. **User Profile & Admin Management**:
   - In Staff Management (`/staff`), allow Clinic Admins to select duty assignment for each nurse.

### Phase 2: Queue & Patient List Segregation
1. **Nurse 1 Workstation (`/queue`)**:
   - Filter queue tickets to display **New Patient / Initial Consultation (Day 0)**.
   - Quick action to open Triage Form and Initial Vaccination Record.
2. **Nurse 2 Workstation (`/nurse/patients`)**:
   - Default tab set to `due_today` (patients with scheduled appointments today for Day 3, Day 7, Booster 1, Booster 2).
   - "Administer Next Dose" modal pre-loads the next due dose without requiring the nurse to fill out initial bite incident history.
3. **Solo-Nurse Workstation Switcher**:
   - For users with `all_nursing` permission, add a compact station selector in the top navbar:
     ```
     [ Station: Intake (Day 0) ▾ ]  <-->  [ Station: Follow-ups & Boosters ▾ ]
     ```
   - Automatically adjusts default view while recording the nurse's actual name on every action.

### Phase 3: Anti-Collision Concurrency Guard
1. **API Guard**:
   - When a nurse clicks "Call Patient" or "Serve":
     - If `queue.status === 'serving'` by another user ID, return HTTP 409 Conflict:
       ```json
       {
         "error": "conflict",
         "message": "Patient is currently being attended by Nurse [Name] at Station [Station]."
       }
       ```
2. **Frontend UI Handling**:
   - Display a non-blocking amber toast notification and refresh queue status automatically.

---

## 6. Verification & Test Plan

1. **Identity & Audit Logging Test**:
   - Log in as Nurse 1 $\rightarrow$ Administer Day 0 for Patient A.
   - Log in as Nurse 2 $\rightarrow$ Administer Day 3 for Patient A.
   - Verify `treatment_records`:
     - Record for Day 0 has `administered_by = Nurse 1 ID`.
     - Record for Day 3 has `administered_by = Nurse 2 ID`.
   - Verify `/staff-activity`:
     - Nurse 1's action shows under Nurse 1's filter.
     - Nurse 2's action shows under Nurse 2's filter.
2. **Concurrency Conflict Test**:
   - Simulate simultaneous access to Patient B's ticket from two browser sessions.
   - Verify the second attempt receives HTTP 409 and does not overwrite or corrupt the record.
3. **Clinical Rules Integrity Test**:
   - Verify that primary doses remain strictly Day 0, Day 3, Day 7.
   - Verify that booster doses remain strictly Booster 1, Booster 2.
   - Verify that operating hours forward-shifting (+days on closed days) operates normally.
