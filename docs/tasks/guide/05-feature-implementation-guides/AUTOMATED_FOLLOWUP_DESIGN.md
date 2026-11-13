# Automated Follow-Up System Design
## Smart Scheduling & Role-Based Patient Lists

---

## 🎯 GOAL

**When patient receives Day 0 dose:**
1. System automatically calculates next doses (Day 3, 7, 28, etc.)
2. System creates scheduled appointments
3. On scheduled date, patient **automatically appears in Nurse's queue**
4. Patient walks in → Reception checks them in → Goes directly to nurse

**No manual "Add to Queue" needed!**

---

## 📅 VACCINATION SCHEDULE AUTO-CALCULATION

### Standard WHO Protocol (Essen Regimen):
```
Day 0  → Initial dose (today)
Day 3  → Initial dose + 3 days
Day 7  → Initial dose + 7 days
Day 28 → Initial dose + 28 days
Day 90 → Booster 1 (optional)
Day 365 → Booster 2 (optional)
```

### Implementation:

#### When Nurse Saves Form 3 (Day 0):
```javascript
1. Calculate follow-up dates:
   - Day 3: 2026-08-05
   - Day 7: 2026-08-09
   - Day 28: 2026-08-30
   - Booster 1: 2026-11-01
   - Booster 2: 2027-08-02

2. Create appointments table entries:
   - appointment_id: auto
   - patient_id: 123
   - appointment_date: 2026-08-05
   - appointment_time: 08:00 (clinic opening)
   - appointment_type: "follow_up_vaccination"
   - dose_number: 3
   - status: "scheduled"
   - created_by: nurse_id

3. Send SMS/notification (optional):
   "Your next rabies vaccination (Day 3) is scheduled for Aug 5, 2026 at Tagoloan RHU"
```

---

## 🔔 SCHEDULED APPOINTMENTS → AUTO-QUEUE

### Daily Auto-Queue Process (Runs at clinic opening time)

**Automated Task:** Every day at 7:00 AM (or when system starts)

```sql
-- Find today's scheduled follow-up appointments
SELECT * FROM appointments 
WHERE appointment_date = CURRENT_DATE
  AND appointment_type = 'follow_up_vaccination'
  AND status = 'scheduled'

-- For each appointment, create queue entry:
INSERT INTO queues (
  patient_id,
  appointment_id,
  visit_type,
  priority,
  status,
  checked_in_at
) VALUES (
  appointment.patient_id,
  appointment.appointment_id,
  'follow_up',
  'normal',
  'waiting',
  CURRENT_TIMESTAMP
)
```

**Result:** 
- Patients with appointments today **automatically appear in queue**
- No manual check-in needed!
- Reception staff can see "Scheduled Appointments" list

---

## 📋 ROLE-BASED PATIENT LISTS

### Why Add Patient Lists per Role?

**YES, highly recommended!** Each role sees different information:

---

### 1️⃣ **REGISTRATION STAFF** - Patient List

**Purpose:** Track all registered patients, check history

**Page:** `/patients` (already exists)

**Columns:**
- Patient Number
- Name
- Age
- Gender
- Contact
- Last Visit Date
- Next Appointment (NEW!)
- Registration Date
- Actions: View Details, Check In, Edit

**Features:**
- ✅ Search by name, patient #, contact
- ✅ Filter by: New patients, Active treatment, Completed
- ✅ Quick check-in button
- ✅ Shows "Next Appointment: Day 3 (Aug 5)" badge
- ✅ Click patient → View full history

---

### 2️⃣ **DOCTOR/TRIAGE** - Patient List

**Purpose:** View patients seen, track consultations

**Page:** `/doctor/patients` (NEW)

**Columns:**
- Patient Number
- Name
- Last Consultation Date
- Chief Complaint
- Diagnosis
- Status (New/Follow-up/Completed)
- Actions: View Consultation History, Re-consult

**Features:**
- ✅ Filter: Today's consultations, This week, All
- ✅ Search patients
- ✅ Click patient → View all Form 2 records
- ✅ Can create new consultation (Form 2)

**Queue Integration:**
- Shows patients "Waiting for doctor" (status: waiting)
- Quick access to patient history before consultation

---

### 3️⃣ **NURSE/TREATMENT** - Patient List

**Purpose:** Track vaccination schedules, upcoming follow-ups

**Page:** `/nurse/patients` (NEW)

**Columns:**
- Patient Number
- Name
- Last Dose (Day 0, Day 3, etc.)
- Last Dose Date
- **Next Dose Due** (Important!)
- Next Appointment Date
- Status (On Schedule / Overdue / Completed)
- Actions: View Treatment Card, Give Dose

**Features:**
- ✅ **"Due Today" tab** - Patients scheduled for today
- ✅ **"Upcoming" tab** - Next 7 days
- ✅ **"Overdue" tab** - Missed appointments (red flag!)
- ✅ Search patients
- ✅ Click patient → View full vaccination record (Form 3)
- ✅ Click "Give Dose" → Opens Form 3, updates next dose

**Queue Integration:**
- Shows "Waiting for treatment" (status: in_consultation or follow_up)
- Quick access to vaccination history

---

### 4️⃣ **ADMIN** - Patient List

**Purpose:** Complete overview, data management

**Page:** `/admin/patients` (NEW)

**Columns:**
- All fields from other roles
- Assigned Doctor
- Assigned Nurse
- Total Visits
- Last Activity
- Account Status
- Actions: Full Edit, Delete, Assign Staff

**Features:**
- ✅ Export to Excel/PDF
- ✅ Bulk actions
- ✅ Advanced filters
- ✅ Analytics dashboard
- ✅ Audit log

---

## 🏗️ DATABASE STRUCTURE

### New Table: `appointments`
```sql
CREATE TABLE appointments (
  appointment_id INT PRIMARY KEY AUTO_INCREMENT,
  clinic_id INT NOT NULL,
  patient_id INT NOT NULL,
  bite_id INT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_type ENUM('follow_up_vaccination', 'consultation', 'checkup') NOT NULL,
  dose_number INT NULL COMMENT 'For follow-up vaccinations: 3, 7, 28, 90, 365',
  status ENUM('scheduled', 'confirmed', 'completed', 'missed', 'cancelled') DEFAULT 'scheduled',
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (bite_id) REFERENCES bite_incidents(bite_id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_appointment_date (appointment_date),
  INDEX idx_status (status),
  INDEX idx_patient (patient_id, appointment_date)
);
```

### Enhanced `queues` table (already exists):
- Add `appointment_id` column (already there!)
- Link queue entry to scheduled appointment

---

## 🔄 UPDATED WORKFLOW

### New Patient (Day 0):
```
1. Registration → Form 1 → Auto-queue
2. Queue (waiting) → Doctor → Form 2 → Status: in_consultation
3. Queue (in_consultation) → Nurse → Form 3 (Day 0)
4. **AUTOMATION TRIGGERS:**
   a. Calculate next doses (Day 3, 7, 28, etc.)
   b. Create appointment records
   c. Update patient status: "Active treatment"
   d. (Optional) Send SMS reminders
5. Status: completed
```

### Follow-up Patient (Day 3):
```
1. System auto-queue at 7:00 AM (if appointment today)
2. Patient walks in → Reception checks them in (confirms presence)
3. Patient sees queue number: #5
4. Nurse's Patient List shows: "Due Today (1)" badge
5. Nurse opens queue → Patient appears with "Follow-up" badge
6. Nurse clicks Form 3 → Pre-filled with history
7. Nurse fills Day 3 row → Save
8. Appointment status → "completed"
9. Patient removed from queue
```

### If Patient Doesn't Show Up:
```
1. End of day (8:00 PM), system checks appointments
2. Status "scheduled" but not completed → Change to "missed"
3. Nurse's Patient List shows in "Overdue" tab (red)
4. Next day, nurse can manually add to queue when patient arrives
```

---

## 📱 ADDITIONAL FEATURES

### 1. SMS Reminders (Optional)
**When:** 1 day before appointment
**Message:** 
```
REMINDER: Your rabies vaccination (Day 3) is scheduled 
tomorrow, Aug 5, 2026 at Tagoloan RHU. Please arrive 
on time. Reply CONFIRM to confirm.
```

### 2. Patient Portal (Future)
- Patients can view their appointment schedule
- See vaccination progress (Day 0 ✅, Day 3 ⏱️, Day 7 📅)
- Receive notifications

### 3. Overdue Alerts
- Dashboard widget: "5 patients overdue for follow-up"
- Nurse can call patients to reschedule

### 4. Bulk Scheduling
- Admin can reschedule all appointments (e.g., clinic holiday)
- Move all Aug 5 appointments to Aug 6

---

## 🎨 UI MOCKUPS

### Nurse's Patient List Page

```
┌────────────────────────────────────────────────────────────────┐
│  TREATMENT PATIENT LIST                                        │
├────────────────────────────────────────────────────────────────┤
│  [Due Today: 12]  [Upcoming: 45]  [Overdue: 3]  [All: 234]    │
├────────────────────────────────────────────────────────────────┤
│  🔍 Search patients...                    📅 Date: Aug 2, 2026 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📌 DUE TODAY (12 patients)                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ #P-00123  DELA CRUZ, Juan M.         Age: 35  M         │ │
│  │ Last: Day 0 (Jul 30)  →  Next: Day 3 (TODAY!)          │ │
│  │ Status: ⏱️ Waiting in Queue (#5)                        │ │
│  │ [View Record]  [Give Dose]  [Call Patient]              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ #P-00089  SANTOS, Maria L.           Age: 28  F         │ │
│  │ Last: Day 3 (Aug 1)  →  Next: Day 7 (Aug 6)            │ │
│  │ Status: ✅ Completed (Early check-in for Day 7)         │ │
│  │ [View Record]                                            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  🔴 OVERDUE (3 patients)                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ #P-00045  REYES, Pedro S.             Age: 42  M         │ │
│  │ Last: Day 0 (Jul 28)  →  Missed: Day 3 (Jul 31)        │ │
│  │ Status: ⚠️ 2 days overdue - NEEDS FOLLOW-UP             │ │
│  │ [View Record]  [Add to Queue]  [Call Patient]           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🚀 IMPLEMENTATION STEPS

### Phase 1: Appointments System (High Priority)
1. Create `appointments` migration
2. Create `Appointment` model
3. Create `AppointmentController`
4. Update Form 3 backend to create appointments after Day 0
5. Test appointment creation

### Phase 2: Auto-Queue (High Priority)
1. Create scheduled task/command to auto-queue appointments
2. Run daily at clinic opening time (7:00 AM)
3. Or trigger when staff opens system
4. Test auto-queue functionality

### Phase 3: Role-Based Patient Lists (Medium Priority)
1. Create Nurse Patient List page
2. Create Doctor Patient List page
3. Add "Due Today", "Upcoming", "Overdue" tabs
4. Add search and filters
5. Link to Form 3 (Give Dose button)

### Phase 4: Reminders (Low Priority)
1. SMS integration (Semaphore, Twilio, etc.)
2. Send 1-day-before reminders
3. Track delivery status

---

## ✅ BENEFITS

### For Patients:
- ✅ No need to remember appointment dates
- ✅ Automatic reminders
- ✅ See their schedule
- ✅ Faster check-in (already in queue)

### For Nurses:
- ✅ See who's due today at a glance
- ✅ No manual queue management
- ✅ Track overdue patients
- ✅ Quick access to treatment history

### For Clinic:
- ✅ Better patient compliance (fewer missed doses)
- ✅ Organized workflow
- ✅ Data for reporting (on-time rates, completion rates)
- ✅ Professional image

---

## 📊 ANSWER TO YOUR QUESTIONS

### Q1: "Should patients go directly to nurse for follow-up?"
**A: YES!** With automated appointments:
- Day 3, 7, 28 patients auto-appear in queue
- Already marked as "follow_up" visit type
- Nurse sees them immediately in their patient list
- No doctor needed (unless new complaint)

### Q2: "Should I add patient lists for each role?"
**A: ABSOLUTELY YES!** Here's why:

| Role | Needs Patient List? | Why? |
|------|---------------------|------|
| **Registration** | YES | Check-in, view history, next appointments |
| **Doctor** | YES | View consultation history, diagnoses |
| **Nurse** | **ESSENTIAL!** | Track doses, see due dates, manage follow-ups |
| **Admin** | YES | Complete oversight, data management |

**Most Important:** **Nurse's Patient List** with "Due Today" tab

---

## 🎯 RECOMMENDATION

**Implement in this order:**

1. ✅ **Phase 1: Appointments System** (CRITICAL)
   - Auto-calculate next doses
   - Create appointment records
   - Show next appointment in patient info

2. ✅ **Phase 2: Auto-Queue** (HIGH)
   - Scheduled patients auto-appear in queue
   - No manual add needed
   - True FIFO for walk-ins + scheduled

3. ✅ **Phase 3: Nurse Patient List** (HIGH)
   - "Due Today" tab
   - "Overdue" tracking
   - Quick access to Form 3

4. ⏰ **Phase 4: Doctor/Admin Lists** (MEDIUM)
   - Can wait, less critical
   - Implement when time permits

5. ⏰ **Phase 5: SMS Reminders** (NICE TO HAVE)
   - Future enhancement
   - Improves compliance

---

**Shall I start implementing Phase 1 (Appointments System)?**

This will automatically calculate and schedule follow-up doses when Form 3 is saved!
