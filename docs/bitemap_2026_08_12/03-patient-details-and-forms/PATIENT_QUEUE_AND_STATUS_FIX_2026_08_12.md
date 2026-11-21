# Patient Queue Carry-Over & Patient List Status Integration

**Date**: August 12, 2026  
**Status**: Implemented & Verified ✅  

---

## 🎯 Problems Resolved

1. **Queue Carry-Over (Uncompleted Queue Entries)**:
   - **Problem**: When a patient was added to the queue on Day 1 and remained in `waiting` or `in_consultation` status at the end of the day, they disappeared from the queue on Day 2 because the backend filtered strictly by `queue_date = today`.
   - **Solution**: Updated `QueueController.php` (`index()` and `waiting()` methods) to automatically include active/uncompleted queue entries from past dates (`queue_date < today` AND `status IN ('waiting', 'in_consultation')`).
   - **UI Indicator**: Added a visual **`Carried Over (Date)`** badge in `QueueDashboardPage.tsx` so staff immediately identify pending patients from a previous shift/day.

2. **Role-Based Patient Lists (`/doctor/patients` & `/nurse/patients`)**:
   - **Problem**: Doctor and Nurse patient lists required existing completed `treatmentRecords` or `appointments`, excluding queued patients who had not yet finished Form 2 or Form 3.
   - **Solution**: Updated `AppointmentController.php` (`doctorPatients()` and `nursePatients()`):
     - **Doctor Patients (`/doctor/patients`)**: The `today` tab combines completed consultations today **PLUS** active queued patients currently waiting/in consultation. The `all` tab lists all registered clinic patients.
     - **Nurse Patients (`/nurse/patients`)**: The `due_today` tab combines scheduled appointments today **PLUS** active queued vaccination patients. The `all` tab lists all registered clinic patients.

3. **Master Patient Registry (`/patients`)**:
   - **Problem**: `PatientListPage.tsx` used a hardcoded raw `fetch('http://localhost:8000/api/patients')` and did not display live queue/treatment statuses.
   - **Solution**: Refactored `PatientListPage.tsx` to use the unified `api` service client and updated `PatientController@index` to eager-load queue/treatment relations. Added dynamic live status badges:
     - 🟢 **In Queue (Waiting)**
     - 🔵 **In Consultation**
     - 🟢 **Dose X Done**
     - ⚪ **Registered**

4. **Automated Vaccination Follow-Up Flow**:
   - **Day 0 Dose Saved**: When Form 3 (Vaccination Record) is saved, `VaccinationRecordController.php` automatically calculates working days & holidays and creates future appointments for Day 3, Day 7, Day 28, Booster 1 (90d), Booster 2 (365d).
   - **Follow-up Arrival**: When the patient returns on their scheduled date, registration adds them to the queue with `visit_type = 'vaccination'`. They show up in the Queue Dashboard and Nurse's "Due Today" list.
   - **Completion**: When the nurse saves Form 3, the queue entry, appointment, and dose record are marked **Completed**, and the next dose automatically becomes active.

---

## 📁 Files Modified

1. **`backend/app/Http/Controllers/QueueController.php`**
   - Expanded queue queries to fetch past uncompleted entries.
   - Added `is_carry_over` flag.

2. **`backend/app/Http/Controllers/AppointmentController.php`**
   - Updated `doctorPatients()` & `nursePatients()` queries to merge active queue entries into today's tabs and display all clinic patients.

3. **`backend/app/Http/Controllers/PatientController.php`**
   - Eager-loaded `queues`, `latestTreatmentRecord`, and `upcomingAppointment` in `index()`.

4. **`frontend/src/features/queue/pages/QueueDashboardPage.tsx`**
   - Added "Carried Over (Date)" badge for past pending entries.

5. **`frontend/src/features/patients/pages/PatientListPage.tsx`**
   - Switched from raw `fetch` to `api.get('/patients')`.
   - Added live status rendering (`In Queue`, `In Consult`, `Dose Done`, etc.).

6. **`frontend/src/features/patients/pages/DoctorPatientListPage.tsx`**
   - Updated status column to render active queue badges.

7. **`frontend/src/features/patients/pages/NursePatientListPage.tsx`**
   - Updated status column to render active queue badges.

---

## 🧪 How to Test

1. **Queue Carry-Over**:
   - Add a patient to queue today.
   - Leave status as `waiting`.
   - In database or system time, change `queue_date` to yesterday (`2026-08-11`).
   - Refresh `/queue`: Patient remains visible with a yellow **`Carried Over (Aug 11)`** badge!

2. **Doctor & Nurse Patient Lists**:
   - Add a newly registered patient to the queue.
   - Open `/doctor/patients`: Patient appears under **"Today's Consultations"** with status **`In Queue (Waiting)`**.
   - Open `/nurse/patients`: Patient appears under **"Due Today"** with status **`In Queue (Waiting)`**.

3. **Master Patient Registry**:
   - Open `/patients`: Patient appears with status **`In Queue (Waiting)`**.
