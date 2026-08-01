# Queue Management Guide
## How Queue Status Works & Who Controls It

---

## 📊 CURRENT QUEUE SYSTEM

### Queue Dashboard Location
**URL:** `/queue`  
**Access:** All staff roles (admin, triage, treatment, registration)  
**Purpose:** Central hub for managing patient flow

---

## 🔄 AUTOMATIC STATUS CHANGES

### 1. Patient Registration → Auto-Queue
**Trigger:** When Form 1 (Patient Enrolment) is saved  
**Status:** `waiting`  
**Who:** System (automatic)  
**Where:** Backend automatically creates queue entry

### 2. Doctor Saves Form 2 → In Consultation
**Trigger:** When Form 2 (General Consultation) is saved  
**Status:** `in_consultation`  
**Who:** System (automatic)  
**Where:** Backend updates queue status in TreatmentRecordController

### 3. Nurse Saves Form 3 → Completed
**Trigger:** When Form 3 (Animal Bite Treatment) is saved  
**Status:** `completed`  
**Who:** System (automatic)  
**Where:** Backend updates queue status in VaccinationRecordController

---

## 🎯 MANUAL QUEUE ACTIONS

### Available in Queue Dashboard (Queue Actions Column)

#### 1. Call Patient Button (📞 Phone Icon)
**Visible When:** Status = `waiting`  
**Who Can Click:** Any staff viewing queue  
**Action:** Changes status from `waiting` → `in_consultation`  
**Purpose:** Mark that patient has been called to see doctor

#### 2. Complete Consultation Button (✓ Green Checkmark)
**Visible When:** Status = `in_consultation`  
**Who Can Click:** Any staff viewing queue  
**Action:** Opens "Complete Consultation" dialog  
**Dialog Fields:**
- Patient info (read-only)
- Consultation Notes (optional text area)
- "Mark Complete" button

**What It Does:**
- Changes status to `completed`
- Optionally adds completion notes
- Removes patient from active queue

#### 3. Cancel Button (✕ Red X)
**Visible When:** Status = `waiting` OR `in_consultation`  
**Who Can Click:** Any staff viewing queue  
**Action:** Changes status to `cancelled`  
**Purpose:** Remove patient who didn't show up or left

---

## 📋 QUEUE STATUS FLOW

### New Patient Flow (Ideal Automatic Path)
```
1. Registration saves Form 1
   ↓ (auto)
   Status: waiting

2. Doctor clicks "Form 2" button → fills form → saves
   ↓ (auto)
   Status: in_consultation

3. Nurse clicks "Form 3" button → fills form → saves
   ↓ (auto)
   Status: completed
```

### Manual Override Options

#### If doctor wants to call patient first:
```
1. Status: waiting
2. Staff clicks "Call Patient" button
   ↓ (manual)
   Status: in_consultation
3. Doctor then clicks "Form 2", fills and saves
   ↓ (Form 2 keeps status as in_consultation)
4. Nurse clicks "Form 3", fills and saves
   ↓ (auto)
   Status: completed
```

#### If treatment is done without forms:
```
1. Status: in_consultation
2. Staff clicks "Complete Consultation" button
3. Enters optional notes
4. Clicks "Mark Complete"
   ↓ (manual)
   Status: completed
```

---

## 🔍 WHERE QUEUE IS DISPLAYED

### Primary Location: Queue Dashboard (`/queue`)

**Table Columns:**
1. Queue ID (internal #)
2. Queue Number (1, 2, 3... - visible to patients)
3. Patient (name, age, gender, case #)
4. Appointment ID (if linked)
5. Visit Type (new_case, follow_up, scheduled, emergency)
6. Priority (normal, urgent, emergency)
7. **Status** (waiting, in_consultation, completed, cancelled, no_show)
8. Wait Time (how long patient has been waiting)
9. **Clinical Forms** (green "Form 2" button, blue "Form 3" button)
10. **Queue Actions** (Call, Complete, Cancel buttons)

**Additional UI Elements:**
- **Next Patient Banner** (top of page) - Shows who's next in line
- **Statistics Cards** - Total in queue, waiting, in consultation, completed today
- **Progress Bar** - Visual indicator of queue completion rate
- **Filter Bar** - Search by name/number, filter by status
- **Add to Queue Button** - Manually add existing patients

---

## 🎬 WHO MARKS AS COMPLETED?

### Option A: Automatic (Recommended - Current System)
**When Nurse saves Form 3**, status automatically changes to `completed`

**Pros:**
- ✅ No extra clicks needed
- ✅ Status matches actual completion
- ✅ Consistent workflow
- ✅ Less room for human error

**Cons:**
- ❌ If nurse forgets to save Form 3, patient stays "in_consultation"

### Option B: Manual Complete Button
**After treatment, staff clicks "Complete Consultation" button**

**Pros:**
- ✅ Explicit control over status
- ✅ Can complete without filling Form 3 (edge cases)
- ✅ Can add completion notes

**Cons:**
- ❌ Extra step (more clicks)
- ❌ Staff might forget to click
- ❌ Status can be marked complete even if Form 3 not filled

### Option C: Hybrid (Current Implementation ✅)
**Both automatic AND manual options available**

- Form 3 save → auto-completes
- Manual "Complete" button → available as backup/override
- Staff can choose based on situation

---

## 🛠️ QUEUE EDITING CAPABILITIES

### What CAN Be Edited:

#### 1. Via Queue Actions
- ❌ **Cannot edit queue entry details directly in table**
- ✅ **Can change status** (via Call, Complete, Cancel buttons)
- ✅ **Can add notes** (via Complete dialog)

#### 2. Via Form Modals
- ✅ **Form 2 (green button)** - Edit/view consultation details
- ✅ **Form 3 (blue button)** - Edit/view treatment details
- Forms can be reopened and re-saved (updates existing record)

#### 3. Via Add to Queue Modal
- ✅ Set visit type (new_case, follow_up, scheduled, emergency)
- ✅ Set priority (normal, urgent, emergency)
- ✅ Add check-in notes

### What CANNOT Be Edited:
- ❌ Queue number (sequential, system-assigned)
- ❌ Queue ID (immutable)
- ❌ Checked-in time (timestamp of queue creation)
- ❌ Patient assignment (cannot transfer queue entry to different patient)

### To "Edit" a Queue Entry:
1. **Cancel the existing entry** (click Cancel button)
2. **Add patient to queue again** (click "Add to Queue" button)
3. New entry created with new queue number

---

## 📍 CURRENT STATUS VISIBILITY

### Queue Dashboard Table
- **Status Column** shows current status with color-coded badges:
  - 🟡 Waiting (yellow)
  - 🔵 In Consultation (blue)
  - 🟢 Completed (green)
  - 🔴 Cancelled (red)
  - ⚪ No Show (gray)

### Status Filter
- Dropdown above table
- Filter by: All, Waiting, In Consultation, Completed, Cancelled, No Show
- Updates table in real-time

### Statistics Cards
- **Total in Queue**: All active entries today
- **Waiting**: Count of patients with "waiting" status
- **In Consultation**: Count of patients with "in_consultation" status
- **Completed Today**: Count of patients with "completed" status

---

## 🔔 RECOMMENDATIONS

### For Your Clinic Workflow:

#### 1. **Keep Hybrid Approach (Current)**
- Form saves auto-update status ✅
- Manual Complete button available as backup ✅
- Best of both worlds

#### 2. **Staff Training**
- Teach staff: "Form 3 save automatically marks complete"
- Manual "Complete" button is for edge cases:
  - Patient treated without filling full Form 3
  - Emergency situations
  - Administrative corrections

#### 3. **Queue Monitoring**
- Assign one staff member to monitor Queue Dashboard
- They can see who's stuck "in_consultation" too long
- Can manually complete or follow up with nurse

#### 4. **Daily Queue Reset**
- At end of day, filter by "in_consultation"
- Check if any patients need to be completed or rescheduled
- Start fresh queue next day

---

## 🚦 QUEUE ACTION PERMISSIONS

### Current System (All Staff Can):
- ✅ View queue dashboard
- ✅ Call patients
- ✅ Mark as complete
- ✅ Cancel queue entries
- ✅ Add to queue

### Role-Specific (Form Access):
- **Form 2 (green button):** Doctor/Triage only (`admin`, `triage` roles)
- **Form 3 (blue button):** Nurse/Treatment only (`admin`, `treatment` roles)

### Recommendation:
**Keep queue actions accessible to all staff**
- Receptionist can call next patient
- Nurse can mark complete after Form 3
- Doctor can manually complete if needed
- Admin has full control

**Why:** Flexibility for different clinic sizes and workflows

---

## 📝 SUMMARY: WHO DOES WHAT

| Action | Who | When | How |
|--------|-----|------|-----|
| **Add to Queue** | Registration Staff | Patient walks in | Auto (Form 1) or Manual (Add button) |
| **Call Patient** | Any Staff | Patient ready to see doctor | Click 📞 Call button |
| **Fill Form 2** | Doctor/Triage | During consultation | Click green "Form 2" button |
| **Fill Form 3** | Nurse | During treatment | Click blue "Form 3" button |
| **Mark Complete** | Nurse (or any staff) | After treatment | Auto (Form 3 save) OR Manual (✓ button) |
| **View Queue** | All Staff | Anytime | Open Queue Dashboard |
| **Monitor Progress** | Reception/Admin | Throughout day | Watch Statistics Cards |
| **Cancel Entry** | Any Staff | Patient no-show | Click ✕ Cancel button |

---

## 🎯 ANSWER TO YOUR QUESTIONS

### Q: "Who will mark as completed?"
**A:** Two ways:
1. **Automatic:** Nurse saves Form 3 → status becomes `completed`
2. **Manual:** Any staff clicks green ✓ "Complete Consultation" button

**Recommended:** Let Form 3 save handle it automatically (less work, more reliable)

### Q: "Where will the queue be displayed?"
**A:** Queue Dashboard page (`/queue`)
- Accessible from main navigation
- Shows table with all queue entries
- Real-time statistics
- Filter and search capabilities
- All management buttons in same view

### Q: "Can be edited?"
**A:** 
- ❌ Cannot edit queue entry details directly in table
- ✅ Can change status (Call, Complete, Cancel buttons)
- ✅ Can reopen Form 2/Form 3 to edit clinical data
- ✅ Can add completion notes via Complete dialog
- To "change" queue entry: Cancel old → Add new

---

**Last Updated:** 2026-08-02  
**System:** Queue Management v1.0  
**Auto-Complete:** Enabled on Form 3 save
