# UI Test Guide: Cycle 13 – Mobile Appointment Booking, Listing & Cancellation

## Objective
Verify the end-to-end functionality of mobile patient appointment viewing, slot validation, booking with intake records, and patient self-cancellation following the refactoring of `MobileAppointmentController.php`.

---

## Target Endpoints Verified
- `GET /api/mobile/appointments` (Paginated list of upcoming and past appointments for linked patients)
- `GET /api/mobile/appointments/{id}` (Detailed view of a single appointment including intake, treatment, and clinic metadata)
- `POST /api/mobile/appointments` (Book appointment with slot validation, duplicate prevention, and bite intake record creation)
- `POST /api/mobile/appointments/{id}/cancel` (Self-cancellation of pending/confirmed appointment with cancellation reason)

---

## Prerequisites
1. Local development backend running (`http://127.0.0.1:8000`).
2. Logged in mobile patient account with at least one linked patient profile (e.g., self or dependent).
3. Active clinic schedule configured with available time slots.

---

## Step-by-Step Test Procedure

### 1. View Appointment List
1. Open the mobile application and navigate to the **Appointments** tab.
2. The app requests `GET /api/mobile/appointments?per_page=15`.
3. **Expected Result:**
   - Returns HTTP 200 OK with paginated list under `data`.
   - Each appointment entry includes `appointment_id`, `patient_id`, `patient_name`, `scheduled_date`, `scheduled_time`, `status` (`pending`, `confirmed`, `completed`, `cancelled`), and clinic details.
   - Separate views/tabs for "Upcoming" and "Past" appointments correctly sort and display appointments.

---

### 2. View Appointment Details
1. Tap on an appointment card in the list.
2. The app requests `GET /api/mobile/appointments/{id}`.
3. **Expected Result:**
   - Returns HTTP 200 OK with full appointment object.
   - Includes linked patient details, clinic operating hours and address, assigned doctor/staff, bite intake details (if attached), and status history.
   - Status badge displays matching color scheme (e.g. orange for pending, green for confirmed).

---

### 3. Book a New Appointment
1. Tap the **Book Appointment** / **+** button.
2. Select the patient (self or child/dependent), preferred date, time slot, appointment type (e.g., `'initial_dose'`), and bite intake details (animal type, bite site, exposure date).
3. Tap **Confirm Booking**.
4. The app sends `POST /api/mobile/appointments` with payload:
   ```json
   {
     "patient_id": 1,
     "scheduled_date": "2026-10-30",
     "scheduled_time": "09:00:00",
     "appointment_type": "initial_dose",
     "intake": {
       "animal_type": "dog",
       "exposure_type": "transdermal_bite",
       "exposure_date": "2026-10-22",
       "bite_site": "Right Leg"
     }
   }
   ```
5. **Expected Result:**
   - Returns HTTP 201 Created with `{ "status": "success", "message": "Appointment booked successfully.", "data": { ... } }`.
   - The newly created appointment appears in the user's Upcoming Appointments tab.
   - An associated bite intake record is created in the database.

---

### 4. Cancel an Appointment
1. From an upcoming appointment's detail view, tap **Cancel Appointment**.
2. A confirmation modal prompts for a cancellation reason.
3. Enter "Schedule conflict" and tap **Confirm Cancellation**.
4. The app sends `POST /api/mobile/appointments/{id}/cancel` with `{ "cancellation_reason": "Schedule conflict" }`.
5. **Expected Result:**
   - Returns HTTP 200 OK with `{ "status": "success", "message": "Appointment cancelled successfully." }`.
   - The appointment status updates to `cancelled` and is moved to the past/history view.
   - The reserved slot becomes available for other patients.

---

### 5. Access Control & Cross-Account Isolation
1. Attempt to fetch or cancel an appointment belonging to another patient account:
   - `GET /api/mobile/appointments/{other_id}` -> Returns HTTP 403 Forbidden or 404 Not Found.
   - `POST /api/mobile/appointments/{other_id}/cancel` -> Returns HTTP 403 Forbidden.
2. Attempt to call mobile appointment endpoints using a staff user token:
   - Returns HTTP 403 Forbidden (*"Patient account authentication is required."*).

---

## Verification Summary
- **Zero regressions:** Response contracts, validation error formats, and HTTP status codes strictly preserved.
- **Automated coverage:** `backend/tests/Feature/Mobile/MobileAppointmentCharacterizationTest.php` and `MobilePatientWorkflowTest.php` passing 18/18 tests.
- **Full Suite pass:** 215 total characterization tests passing (1200 assertions) across Person 1 and Person 4.
- **Frontend compatibility:** Full build passes with 0 TypeScript errors.
- **Mobile compatibility:** `flutter analyze` passes with 0 errors.
