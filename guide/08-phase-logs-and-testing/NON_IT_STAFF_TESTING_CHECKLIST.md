# 🏥 Clinic Staff Testing Checklist (Easy Step-by-Step Guide)
## Animal Bite Treatment Center (ABTC / RHU)

> **Who this guide is for**: Clinic Administrators, Registration Clerks, Doctors, Nurses, and Testers.  
> **Technical knowledge needed**: None! Just follow the steps on your screen.  
> **System Location**: `http://localhost:5173` (on your browser)

---

## 🔑 Step 0: Who to Log In As (Login Credentials)

You will test the clinic from the viewpoint of 4 different staff roles. When a step tells you to "Log in as...", use these emails:

| Staff Role | Email to type | Password | What this role does |
| :--- | :--- | :--- | :--- |
| **Clinic Admin** | `admin@clinic.com` | `password123` | Sets up clinic opening days and manages users. |
| **Registration Clerk** | `registration@clinic.com` | `password123` | Welcomes walk-in patients and encodes basic details (Form 1). |
| **Doctor (Triage)** | `triage@clinic.com` | `password123` | Examines the bite wound, grades the risk, and prescribes shots (Form 2). |
| **Nurse (Treatment)** | `treatment@clinic.com` | `password123` | Injects the rabies vaccine, records the batch, and manages follow-ups (Form 3). |

---

## 📋 Desk-by-Desk Testing Flow (Follow in Order)

```
[ 1. ADMIN SETUP ] ──> [ 2. REGISTRATION ] ──> [ 3. DOCTOR TRIAGE ] ──> [ 4. NURSE TREATMENT ] ──> [ 5. FOLLOW-UP VISIT ]
```

---

## 🏢 STAGE 1: Clinic Admin (Schedule & Vaccine Setup)

**Goal**: Make sure the clinic knows which days it is open and that vaccines are in stock.

- [ ] **Step 1.1: Log In as Admin**
  - Go to `http://localhost:5173/login`.
  - Type `admin@clinic.com` and password `password123`. Click **Sign In**.
  - *Success*: You land on the main Admin Dashboard.

- [ ] **Step 1.2: Check Operating Days**
  - In the left menu, click **Clinic Setup** -> **Operating Schedule** (or go to `/setup/schedule`).
  - Look at the days of the week:
    - Tuesday to Saturday should be marked as **Open**.
    - Sunday and Monday should be marked as **Closed**.
  - *Why this matters*: When a patient gets a shot, the system must **never** schedule their next visit on a Sunday or Monday.

- [ ] **Step 1.3: Check Vaccine Stock**
  - In the left menu, click **Inventory**.
  - Make sure you see at least one rabies vaccine brand (such as **Speeda** or **Verorab**) with available stock.
  - *Success*: Stock status shows green or has available vials.

- [ ] **Log Out**: Click your profile at the top right and click **Sign Out**.

---

## 📝 STAGE 2: Registration Desk (Patient Arrival & Form 1)

**Goal**: Encode a new walk-in bite victim and give them a queue number.

- [ ] **Step 2.1: Log In as Registration Staff**
  - Go to `http://localhost:5173/login`.
  - Type `registration@clinic.com` and password `password123`. Click **Sign In**.

- [ ] **Step 2.2: Add a New Patient**
  - Click **Patients** in the left menu.
  - Click the green **"+ Add Patient"** button in the top right corner.
  - Fill out the form with sample information:
    - **First Name**: `Juan`
    - **Last Name**: `Dela Cruz`
    - **Sex**: `Male`
    - **Date of Birth**: Choose any past date (e.g., `1995-05-15`). Notice that Age automatically calculates!
    - **Mobile Number**: `09171234567` (Must be exactly 11 digits).
    - **Emergency Contact**: Name: `Maria Dela Cruz`, Phone: `09181234567`.
    - **Address**: Select Municipality: `Tagoloan`, Barangay: `Poblacion`, Purok: `Zone 2`.
    - **Queue Category**: Choose `Regular` (or choose `Senior Citizen`, `Pregnant`, or `PWD` to test the priority badge).
    - **Priority Level**: Choose `Normal` (or `Urgent` if bleeding heavily).
  - Click the green **"Save Patient Record"** button at the bottom.

- [ ] **Step 2.3: Check the Queue Ticket**
  - *What you should see*: A green pop-up saying *"Patient enrolled successfully"*.
  - Juan Dela Cruz appears at the top of the Patients list with a unique ID (like `P-2026-0001`).
  - In the left menu, click **Queue Dashboard** (`/queue`).
  - *Success*: You should see Juan Dela Cruz on the screen with a Ticket Number (e.g. `#1`), Type: **New Case**, and Status: **Waiting**. A waiting timer is ticking.

- [ ] **Log Out**: Click your profile and click **Sign Out**.

---

## 🩺 STAGE 3: Doctor Triage Desk (Examine Wound & Prescribe Form 2)

**Goal**: The doctor examines the patient, grades the bite, prescribes medicines, and automatically passes the patient to the nurse.

- [ ] **Step 3.1: Log In as Doctor**
  - Log in using `triage@clinic.com` / `password123`.
  - Go to **Queue Dashboard** (`/queue`).

- [ ] **Step 3.2: Open Patient Details (In-Place Window)**
  - Look for `Juan Dela Cruz` in the queue list.
  - Click the green **"View"** button on his row.
  - *What should happen*: A neat pop-up window opens **right on top of the queue screen** (you do NOT get kicked to a separate page!).
  - *Look at the top of the pop-up*: It shows Juan's name, age, ticket number, and priority badge.

- [ ] **Step 3.3: Verify Tabs**
  - **Tab 1 (Form 1 Demographics)**: Shows Juan's personal details in read-only format.
  - **Tab 3 (Form 3 Nurse Treatment)**: Look here first! You should see a yellow padlock message:  
    `🔒 Awaiting Doctor Triage (Form 2 Required) — Exposure grading required before Day 0 can be administered.`  
    *(This prevents the nurse from giving shots before the doctor sees the patient!)*

- [ ] **Step 3.4: Fill Out Tab 2 (Form 2 Doctor Triage)**
  - Click on **Tab 2 (Form 2 Doctor Triage)**.
  - Enter Patient Weight: `65` kg.
  - Complaint: Type *"Dog bite on right forearm 2 hours ago"*.
  - Animal Type: Choose `Dog`.
  - Animal Status: Choose `Alive / Under Observation`.
  - Bite Type: Choose `Bite`.
  - Exposure Category: Choose **`Category III`** (Severe bite).
  - Was wound washed?: Choose `Yes` (Washed with soap and water).
  - Tetanus Toxoid: Check `Given`.
  - Rabies Regimen: Choose `Intradermal (ID) - Option A`.
  - ERIG (Anti-Rabies Serum): Check `Indicated / Prescribed` (Notice it calculates units based on 65 kg).
  - Click **"Save Consultation" / "Save Record"**.

- [ ] **Step 3.5: Verify Automated Handoff (The Magic!)**
  - *What you should see*: Green toast message: *"Consultation record saved successfully. Patient referred to Treatment."*
  - Look at the Queue Board:
    - Juan Dela Cruz's ticket automatically changed from `New Case` -> **`Vaccination`**!
    - Status is reset to **`Waiting`** (Ready for the nurse to call him).
    - Note says: *"Doctor completed Form 2 — referred to Treatment."*
  - *Important*: The doctor **did not have to click any manual buttons to transfer the patient**—it happened automatically!

- [ ] **Log Out**: Sign Out.

---

## 💉 STAGE 4: Nurse Treatment Desk (Day 0 Shot & Option A Calendar)

**Goal**: The nurse injects the first rabies shot (Day 0), deducts the vaccine bottle from inventory, finishes today's queue ticket, and automatically schedules the future return dates.

- [ ] **Step 4.1: Log In as Nurse**
  - Log in using `treatment@clinic.com` / `password123`.
  - Go to **Queue Dashboard** (`/queue`).

- [ ] **Step 4.2: Open Patient Record**
  - Juan Dela Cruz is now in the **Treatment Queue** with Type: **Vaccination**.
  - Click the green **"View"** button.
  - The in-place window opens.

- [ ] **Step 4.3: Verify Protection & Unlocking**
  - Click **Tab 2 (Doctor Triage)**: Notice all the doctor's entries are now **locked** so nobody can tamper with the doctor's clinical findings.
  - Click **Tab 3 (Nurse Treatment)**: The lock banner is gone!
  - Look at the table:
    - **Dose 0 (Day 0)** has a bright green badge: `🟢 Ready to Administer`.
    - Scheduled Date is filled with **Today's Date**.
    - Given By is already pre-filled with your name!

- [ ] **Step 4.4: Record Day 0 Shot**
  - **Vaccine Brand**: Select `Speeda` (or whatever brand is in stock).
  - **Batch Number**: Pick a batch from the dropdown.
  - **Route**: `ID (Intradermal)`.
  - **Injection Site**: Choose `Left Deltoid` (or Right Deltoid).
  - If doctor prescribed ERIG: Check `Administered` in the ERIG section.
  - Click **"Save Vaccination Record"**.

- [ ] **Step 4.5: Check What Automatically Happened**
  - *1. In the Form*: Dose 0 (Day 0) immediately turns into `✅ Administered` and gets **permanently locked** (cannot be edited or deleted).
  - *2. In the Queue Board*: Juan Dela Cruz's ticket is automatically marked **`Completed`** and disappears from the active waiting screen into the "Completed Today" list.
  - *3. In the Inventory*: 1 vial of vaccine was subtracted from stock.
  - *4. In the Calendar*: Days 3, 7, and 28 are automatically scheduled!

- [ ] **Step 4.6: Check the Return Dates (Weekend Rule)**
  - Go to **Vaccination Schedule** in the left menu (`/vaccinations/schedule`).
  - Find Juan Dela Cruz's card.
  - Look at his 4 scheduled dates:
    - **Day 0**: Completed (Green dot)
    - **Day 3**: Scheduled for 3 days from now.
      - **CRITICAL CHECK**: If Day 3 lands on a Sunday or Monday, does it show an amber tag saying `⚠️ Shifted +1d / +2d — clinic closed on weekend` and move the date to Tuesday?  
        *(If YES -> Option A schedule resolution passed!)*
    - **Day 7**: Scheduled for 7 days from Day 0.
    - **Day 28**: Scheduled for 28 days from Day 0.

- [ ] **Log Out**: Sign Out.

---

## 🔄 STAGE 5: Routine Follow-Up Visit (Day 3 Return)

**Goal**: When the patient returns for Day 3, they check in directly with the nurse (NOT at the front desk), and past shots cannot be overwritten.

- [ ] **Step 5.1: Patient Arrives at Nurse Station**
  - Log in as Nurse: `treatment@clinic.com` / `password123`.
  - In the left menu, click **Nurse Desk** (`/nurse/patients`).
  - Click the **"Due Today"** tab (or **"All"** tab).
  - Find `Juan Dela Cruz`.

- [ ] **Step 5.2: Nurse Check-In (Never Front Desk!)**
  - Click the **"Check In"** button on Juan's row.
  - Confirm the check-in.
  - *What you should see*: Juan receives a ticket for the Treatment desk directly. He completely skips the registration clerk and doctor triage!

- [ ] **Step 5.3: Administer Day 3**
  - Click **"Record Dose"** (or find Juan on `/queue` and click "View").
  - Notice the **Hybrid Lock**:
    - **Day 0 row**: Greyed out, locked, non-editable.
    - **Day 3 row**: Bright green badge: `🟢 Ready to Administer`.
    - **Future rows (Day 7, Day 28)**: Display `Pending` (no false red errors!).
    - **Brand**: System automatically selects the same brand used on Day 0 (`Speeda`).
  - Select the Batch Number, enter Site (`Right Deltoid`), and click **"Save Vaccination Record"**.
  - *Success*: Day 3 is saved, queue ticket completes, and Day 7 becomes the next active upcoming target.

---

## 🌟 STAGE 6: Special Situations to Test

### 6.1 Priority Patients (Seniors, Pregnant, PWD)
- When adding a patient at Registration, set Category to `Senior Citizen` or `Pregnant` or `PWD`.
- *Check on Queue Board*: The ticket shows a colored priority badge and ranks higher in the waiting list than regular patients.

### 6.2 Patient Doesn't Hear Name (Second Chance Queue)
- On `/queue`, on any waiting ticket, click the **Purple UserBlock Icon** ("No Response").
- *Check*: The patient moves into the **"Second Chance Queue"** box with a 10-minute timer.
- Click **"Recall"** to call them again.
- Click **"Mark Absent"** if they left the building.

### 6.3 Booster Case (Patient bit again years later)
- If a patient who finished shots years ago gets bitten again:
- In Form 2, the doctor checks **"Prior Rabies Immunization History Verified"** and selects **2-Dose Booster**.
- *Check*:
  - The ERIG checkbox becomes disabled/greyed out with a notice: `🚫 Contraindicated: Patient already has antibodies.`
  - In Form 3, the system only creates **Day 0 and Day 3**. Days 7 and 28 are omitted.
  - Once Day 3 is given, the system immediately marks the episode as **"Regimen Completed"**.

### 6.4 Patient Got Day 0 at Another Hospital (External Dose)
- Open Form 3. On Day 0, check **"Transferred-In (External Clinic)"**.
- Enter the hospital name (e.g., `Provincial Hospital`).
- *Check*:
  - The status displays a neat grey/blue **`🏥 External Clinic`** badge.
  - It does **NOT** show a red `Missing Stock Info` error.
  - Saving the form does not complain about missing inventory stock.

---

## 🛡️ STAGE 7: Safety Rules & What Should NEVER Happen (Red Flags)

As a tester, make sure the system prevents these dangerous mistakes:

| Mistake We Must Prevent | How to Verify It Is Blocked | Result |
| :--- | :--- | :--- |
| **Tampering with Doctor Diagnosis** | Open Form 2 after Day 0 is injected. All boxes should be frozen/read-only. | `[ ] PASS` |
| **Overwriting Past Injection** | Open Form 3. Try to change Day 0 brand, date, or batch. It must be locked. | `[ ] PASS` |
| **Booking on Closed Weekend** | Check appointments on `/vaccinations/schedule`. No patient should ever have an appointment on Sunday or Monday. | `[ ] PASS` |
| **Giving ERIG to Booster Patient** | Choose 2-Dose Booster in Form 2. ERIG box must be disabled. | `[ ] PASS` |
| **Non-Admin Changing Legal Name** | Log in as Nurse or Clerk. Open patient edit. Name and Birthday must be locked with padlocks. | `[ ] PASS` |
| **Navigating Away from Queue** | Click "View" on Queue Dashboard. Must open as a pop-up window, NOT take you to another URL. | `[ ] PASS` |

---

## ✍️ Quick Tester Sign-Off Sheet

Fill this out after running your test session:

- **Tester Name**: ___________________________
- **Date Tested**: ___________________________
- **Browser Used**: Chrome / Edge / Firefox
- **Overall Result**: `[ ] ALL PASSED` / `[ ] ISSUES FOUND`

### Quick Check Marks:
1. `[ ]` Registration created patient and auto-generated ticket.
2. `[ ]` Doctor triage saved Form 2 and auto-referred to Treatment Desk.
3. `[ ]` Nurse administered Day 0 and auto-completed queue ticket.
4. `[ ]` Option A dates generated without landing on closed clinic days.
5. `[ ]` Follow-up patient checked in directly at Nurse Desk.
6. `[ ]` Day 0 past dose was locked and could not be edited.
7. `[ ]` In-place pop-up modal worked smoothly on Queue Dashboard.

*Notes / Any weird behavior seen*:
____________________________________________________________________
____________________________________________________________________