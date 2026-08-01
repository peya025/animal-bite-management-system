# Clinic Workflow Guide
## Animal Bite Management System - Patient Flow

---

## 🔄 WORKFLOW OVERVIEW

### New Patients (First Visit)
```
Registration → Queue → Doctor/Triage (Form 2) → Nurse Treatment (Form 3) → Complete
```

### Follow-up Patients (Return Visits)
```
Walk-in → Add to Queue (Manual) → Nurse Treatment (Form 3) → Complete
(Skip Doctor - Go Directly to Nurse)
```

---

## 📋 DETAILED WORKFLOW

### STEP 1: PATIENT REGISTRATION (Form 1)
**Role:** Registration Staff  
**Location:** Patients page → "Add Patient" button

#### Process:
1. Patient arrives at clinic (NEW patient)
2. Registration staff clicks "Add Patient" button
3. Fills out **Form 1 — Patient Enrolment**:
   - Personal information (name, DOB, sex, etc.)
   - Address details (municipality, barangay)
   - Contact information
   - Socioeconomic information
   - Government programs (PhilHealth, 4Ps, etc.)
4. Clicks "Save Patient Record"

#### What Happens Automatically:
- ✅ Patient saved to database
- ✅ Patient **automatically added to queue** with queue number
- ✅ Patient status: "waiting"
- ✅ Visit type: "new_case"
- ✅ Priority: "normal"

#### Result:
- Patient appears in Queue Dashboard
- Patient receives queue number (e.g., #1, #2, #3...)
- Patient waits to be called by doctor/triage

---

### STEP 2: DOCTOR/TRIAGE CONSULTATION (Form 2)
**Role:** Doctor / Triage Staff  
**Location:** Queue Dashboard → Green "Form 2" button

#### Process:
1. Doctor/Triage staff opens Queue Dashboard
2. Sees patient waiting in queue (status: "waiting")
3. Clicks patient's **green "Form 2" button**
4. **Form 2 — General Consultation** modal opens
5. Fills out consultation form:
   - **Patient Info** (pre-filled, read-only)
   - **Mode of Transaction** (walk-in, visited, referral)
   - **Consultation Date & Time**
   - **Vital Signs** (BP, temp, height, weight)
   - **Nature of Visit** (new consultation, new admission, follow-up) - REQUIRED
   - **Type of Consultation** (13 types: General, Prenatal, Dental, Child Care, **Injury**, etc.) - REQUIRED
   - **Clinical Notes** (chief complaints, diagnosis, medication, lab findings)
   - **Provider Details** (attending provider, referred by)
6. Clicks "Save Patient Record"

#### What Happens:
- ✅ Consultation record saved to database
- ✅ Queue status changes to: **"in_consultation"**
- ✅ Patient ready for nurse treatment

#### Result:
- Patient's blue "Form 3" button becomes available
- Nurse can now see patient is ready for treatment

---

### STEP 3: NURSE TREATMENT (Form 3)
**Role:** Nurse / Treatment Staff  
**Location:** Queue Dashboard → Blue "Form 3" button

#### Process:
1. Nurse opens Queue Dashboard
2. Sees patient with status "in_consultation"
3. Clicks patient's **blue "Form 3" button**
4. **Form 3 — Animal Bite Treatment Record** modal opens
5. Fills out treatment form:
   
   **Section 1: Patient & Registration Information**
   - Date, Registry No., Hospital No., Referred by
   - PhilHealth PIN (Member/Dependent)
   - Patient details (pre-filled, read-only)
   - **Exposure Category** (I, II, III) - REQUIRED
   - **Date of Exposure** - REQUIRED
   - Date Treatment Started
   - Place of Exposure
   
   **Section 2: Exposure Details**
   - Mode of Animal Exposure (checkboxes)
   - Body Part Affected (checkboxes)
   - Type of Animal (Dog/Others)
   - Past history of animal bite (Yes/No)
   - Was PEP Immunization completed? (Yes/No)
   
   **Section 3: Vaccination Record Table**
   - Day 0, Day 3, Day 7, Day 28, Booster 1, Booster 2
   - For each: Route (ID/IM), Date, Given by, Signature
   
   **Section 4: Additional Medications & ICD Code**
   - ERIG, TT, ATS (checkboxes)
   - ICD 10 Code

6. Clicks "Save Record"

#### What Happens:
- ✅ Treatment record saved to database
- ✅ Vaccination schedule created
- ✅ Queue status changes to: **"completed"**
- ✅ Patient removed from active queue

#### Result:
- Patient treatment complete
- Patient can leave or proceed to pharmacy/billing
- If follow-up needed, patient will return for next dose

---

## 🔁 FOLLOW-UP PATIENT WORKFLOW

### When Patient Returns for Follow-up (e.g., Day 3, Day 7, Day 28)

#### IMPORTANT: Follow-up patients **SKIP the doctor** and go **DIRECTLY to nurse**

#### Process:
1. **Patient walks into clinic** (returning for dose)
2. **Registration staff recognizes patient** (or searches system)
3. Staff clicks **green "Add to Queue"** button in Queue Dashboard
4. **"Add Patient to Queue" modal opens**:
   - Staff searches patient by name
   - Selects patient from dropdown
   - Sets **Visit Type: "follow_up"**
   - Sets **Priority: "normal"** (or "urgent" if needed)
   - Adds check-in notes: "Follow-up - Day 3 dose" (optional)
5. Clicks "Add to Queue"

#### What Happens:
- ✅ Patient added to queue with follow-up status
- ✅ Patient receives next queue number
- ✅ **Nurse sees patient in queue** (status: "waiting")

#### Nurse Treatment for Follow-up:
1. Nurse clicks patient's **blue "Form 3" button**
2. Form 3 opens with **existing data pre-filled**:
   - Patient info already there
   - Exposure details already filled
   - Previous doses already recorded
3. Nurse **fills in the next dose row**:
   - Example: If Day 3, fill the "Day 3" row
   - Route: ID or IM
   - Date: Today's date
   - Given by: Nurse name
   - Signature
4. Clicks "Save Record"

#### Result:
- ✅ Vaccination record updated
- ✅ Patient receives dose
- ✅ Queue status: "completed"
- ✅ Patient scheduled for next follow-up (if needed)

---

## 📊 QUEUE STATUSES

| Status | Color | Meaning |
|--------|-------|---------|
| **waiting** | Yellow | Patient in queue, not called yet |
| **in_consultation** | Blue | Doctor finished Form 2, ready for nurse |
| **completed** | Green | Treatment finished, patient can leave |
| **no_show** | Gray | Patient didn't show up |
| **cancelled** | Red | Appointment cancelled |

---

## 🎯 KEY POINTS

### ✅ DO's:
- **New patients** → Register → Auto-queue → Doctor → Nurse
- **Follow-up patients** → Manual add to queue → Nurse only (skip doctor)
- Use "Add to Queue" button for returning patients
- Check patient history before adding to queue
- Update vaccination table progressively (row by row per visit)

### ❌ DON'Ts:
- Don't register the same patient twice
- Don't skip Form 2 for new patients (doctor must assess first)
- Don't send follow-up patients to doctor (unless new complaint)
- Don't bulk-add old patients to queue (only add active visitors)

---

## 🔧 SYSTEM FEATURES

### Auto-Queue on Registration
- **Enabled:** Yes
- **When:** Patient successfully registered via Form 1
- **Default values:**
  - Visit type: "new_case"
  - Priority: "normal"
  - Status: "waiting"
  - Notes: "Auto-added from registration"

### Queue Management
- **First-Come First-Serve (FIFO):** Queue numbers 1, 2, 3...
- **Sequential numbering:** Each new patient gets next number
- **Daily reset:** Queue clears each day (or manually)
- **Manual control:** Staff can add/remove patients as needed

### Form Access Control
- **Form 1 (Registration):** Registration Staff
- **Form 2 (Consultation):** Doctor / Triage Staff
- **Form 3 (Treatment):** Nurse / Treatment Staff
- Role-based buttons show only for authorized staff

---

## 🚨 TROUBLESHOOTING

### Patient not appearing in queue after registration?
- Check backend server is running: `php artisan serve --host=0.0.0.0 --port=8000`
- Refresh queue page
- Check browser console for errors
- Verify patient was saved successfully

### Old patients not in queue?
- **This is correct!** Only active patients should be in queue
- Use "Add to Queue" button to manually add returning patients
- Don't bulk-add historical patients

### Follow-up patient going to doctor?
- Staff should **manually add to queue** with visit type "follow_up"
- Nurse should check Form 3 directly
- Doctor not needed unless patient has new complaint

### Form 2 or Form 3 button not showing?
- Check user role (admin, triage, treatment, registration)
- Green "Form 2" button: Doctor/Triage only
- Blue "Form 3" button: Nurse/Treatment only
- Button appears based on queue status

---

## 📞 WORKFLOW SUMMARY

### New Patient Journey:
```
1. Walk-in → Registration desk
2. Fill Form 1 (Patient Enrolment)
3. Auto-added to queue → Receive queue number
4. Wait for doctor call
5. Doctor consultation → Form 2 (General Consultation)
6. Proceed to treatment area
7. Nurse treatment → Form 3 (Animal Bite Record)
8. Receive first dose (Day 0)
9. Schedule follow-ups (Day 3, 7, 28, etc.)
10. Complete & go home
```

### Follow-up Patient Journey:
```
1. Walk-in for scheduled dose
2. Report to registration
3. Staff manually adds to queue
4. Receive queue number
5. Wait for nurse call
6. Nurse treatment → Form 3 (update next dose)
7. Receive dose
8. Schedule next follow-up (if needed)
9. Complete & go home
```

---

**Last Updated:** 2026-08-02  
**System Version:** v1.0  
**Queue System:** Active & Auto-Queue Enabled
