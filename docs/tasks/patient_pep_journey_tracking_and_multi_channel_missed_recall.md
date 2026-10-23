# 💉 Technical Plan: Patient PEP Journey Tracking, Flexible Schedule Navigation & Multi-Channel Missed Dose Recall

> **Target Area**: Full-Stack System (`backend/`, `frontend/`, `mobile/`)  
> **Status**: Ready for Implementation  
> **Category**: Post-Exposure Prophylaxis (PEP) Timeline Visualization, Walk-In vs Online Channel Separation, Dynamic Operating Schedule Flexibility, Missed / No-Show Patient Recall Engine (SMS / Email / In-App)  
> **Date**: August 2026  

---

## 🧭 1. Executive Summary & Clinical Context

Rabies Post-Exposure Prophylaxis (PEP) is a **time-critical, multi-dose vaccination regimen** (typically Day 0, Day 3, Day 7, Day 28, and Booster doses). If a patient misses a scheduled dose or delays attendance beyond the incubation safety window, they are at imminent risk of viral breakthrough and death.

### Key Problems Addressed:
1. **Patient & Staff Schedule Confusion**: Listing individual appointments in disjointed rows makes it difficult for nurses and patients to understand their full PEP timeline (which doses are completed, which dose is due next, and how many remain).
2. **Channel Ambiguity (Walk-in vs Online Booking)**: Clinical staff need immediate clarity on whether an appointment originated from a mobile online booking or a direct walk-in consultation to streamline triage and queue handling.
3. **Flexible Clinic Operating Schedule Compliance**: Rural Health Units (RHUs) and Animal Bite Treatment Centers (ABTCs) dynamically change their operating schedules (e.g., standard Mon–Fri, session-based Mon & Thu only, or emergency holiday closures). Any next-dose navigation or missed-dose rescheduling **must dynamically adapt to the clinic's latest operating pattern** so patients are never booked or recalled on closed days.
4. **Missed / No-Show Defaulters & Lack of Automated Recall**: When patients fail to show up for their scheduled vaccination, there is currently no segregated view or 1-click multi-channel mechanism to alert them via **SMS**, **Email**, and **In-App Mobile Notifications** with urgent instructions to return to the clinic.

---

## 🏛️ 2. Database Schema & Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │               clinics Table                  │
                               │  • schedule_drift_policy (ENUM)              │
                               │  • weekly operating days & holiday exceptions│
                               └──────────────────────┬───────────────────────┘
                                                      │ 1
                                                      │
                                                      ▼ N
                               ┌──────────────────────────────────────────────┐
                               │             appointments Table               │
                               │  • dose_number (INT: 0, 3, 7, 28, 90, 365)   │
                               │  • ideal_date (DATE)                         │
                               │  • scheduled_date (DATE)                     │
                               │  • booking_channel (walk_in | online_mobile) │
                               │  • status (scheduled|completed|missed|...)   │
                               │  • missed_at (TIMESTAMP NULL)                │
                               │  • reminder_sent_count (INT DEFAULT 0)       │
                               │  • last_reminded_at (TIMESTAMP NULL)         │
                               └──────────────────────┬───────────────────────┘
                                                      │ 1
                                                      │
                                                      ▼ N
                               ┌──────────────────────────────────────────────┐
                               │        appointment_reminders Table           │
                               │  • id (BIGINT PRIMARY KEY)                   │
                               │  • appointment_id (BIGINT FOREIGN KEY)       │
                               │  • patient_id (BIGINT FOREIGN KEY)           │
                               │  • channel (ENUM: sms, email, in_app)        │
                               │  • recipient (VARCHAR: phone/email/user_id)  │
                               │  • message (TEXT)                            │
                               │  • status (ENUM: sent, failed, pending)      │
                               │  • sent_by_user_id (BIGINT NULL)             │
                               │  • created_at (TIMESTAMP)                    │
                               └──────────────────────────────────────────────┘
```

### Table 1: Schema Updates to `appointments`
```sql
ALTER TABLE `appointments`
  ADD COLUMN `booking_channel` ENUM('walk_in', 'online_mobile') NOT NULL DEFAULT 'walk_in' AFTER `appointment_type`,
  ADD COLUMN `missed_at` TIMESTAMP NULL DEFAULT NULL AFTER `status`,
  ADD COLUMN `reminder_sent_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `missed_at`,
  ADD COLUMN `last_reminded_at` TIMESTAMP NULL DEFAULT NULL AFTER `reminder_sent_count`;
```

### Table 2: New Table `appointment_reminders` (Audit & Delivery Log)
```sql
CREATE TABLE `appointment_reminders` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `clinic_id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `appointment_id` BIGINT UNSIGNED NOT NULL,
  `patient_id` BIGINT UNSIGNED NOT NULL,
  `channel` ENUM('sms', 'email', 'in_app') NOT NULL,
  `recipient` VARCHAR(255) NOT NULL COMMENT 'Target phone number, email address, or account ID',
  `subject` VARCHAR(255) NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'sent',
  `error_details` VARCHAR(500) NULL,
  `sent_by_user_id` BIGINT UNSIGNED NULL COMMENT 'Staff user ID who triggered recall or NULL for auto-cron',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`) ON DELETE CASCADE,
  FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE,
  INDEX `idx_reminder_appt` (`appointment_id`),
  INDEX `idx_reminder_patient` (`patient_id`),
  INDEX `idx_reminder_channel` (`channel`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🎨 3. UI/UX & HCI Architecture (Web & Mobile)

### A. Web Staff Portal: `/vaccinations` (Vaccination & Regimen Center)

To prevent visual clutter, the vaccination screen is divided into **4 distinct, dedicated tabs**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 💉 Post-Exposure Prophylaxis (PEP) & Vaccination Management Center                                                     │
├──────────────────────┬────────────────────────────┬─────────────────────────────┬──────────────────────────────────────┤
│ 📅 Active Schedules  │ 📊 PEP Dose Progression    │ 🚶 Walk-in vs 📱 Online     │ ⚠️ Missed / No-Show Recall Station   │
│    & Due Today (12)  │    Patient Journey Matrix  │    Channel Breakdown        │    & Multi-Channel Alerts (3)        │
└──────────────────────┴────────────────────────────┴─────────────────────────────┴──────────────────────────────────────┘
```

#### Tab 1: 📅 Active Schedules & Due Today
- Shows patients scheduled for today or upcoming open clinic days.
- One-click check-in and direct action to open **Form 3 (Vaccination Record Modal)**.

#### Tab 2: 📊 Patient PEP Regimen Journey Matrix (Patient-Centric Stepper)
Instead of disjointed appointment rows, each active case is rendered as a clean **Dose Progression Stepper Card**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 👤 Hazel Nandong (Female, 28) · Case #BC-2026-0002 · Dog Bite Category III · Regimen: 2-1-1 Zagreb                     │
│ Channel: 📱 Online Mobile Booking · Primary Contact: +63 917 123 4567                                                 │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                        │
│   🟢 Day 0             🟢 Day 3             🔵 Day 7              ⚪ Day 28             ⚪ Booster 1                    │
│   Completed            Completed            Due Today             Scheduled             Scheduled                      │
│   Aug 23, 2026         Aug 26, 2026         Sep 1, 2026 (+1d)     Sep 22, 2026 (+1d)    Nov 24, 2026                   │
│   [Vial #B204-A]       [Vial #B204-B]       [Ready for Dose]      [Clinic Open]         [Clinic Open]                  │
│                                                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Overall Compliance: 50% (2 of 4 Primary Doses Administered)          [ 💉 Record Day 7 Dose (Form 3) ] [ 🖨️ Form 2 ]   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Tab 3: 🚶 Walk-in vs 📱 Online Channel Distribution
- Dedicated filters allowing staff to view and balance walk-in queue slots vs mobile confirmed appointments.

#### Tab 4: ⚠️ Missed / No-Show Recall Station (With Multi-Channel Alert Engine)
- Dedicated table listing all patients who missed their scheduled vaccination date.
- **Urgency Tags**:
  - `⚠️ Overdue (1–3 Days)` — High recovery probability.
  - `🚨 Critical Defaulter (>4 Days)` — Immunological incubation danger.
- **Action Toolbar**:
  - 🔔 **"Send Multi-Channel Recall Alert"** (Opens modal with channel checkboxes: `[✓] SMS` `[✓] Email` `[✓] In-App`).
  - ⚡ **"Batch Alert All Overdue Patients"** (Sends urgent recall to all selected patients in 1 click).
  - 🔄 **"Reschedule to Next Open Clinic Day"** (Uses dynamic schedule engine to pick a valid open day).

---

### B. Multi-Channel Recall Alert Modal (Staff UI)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔔 Send Urgent Missed Dose Recall Notification                                                     │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Patient: Hazel Nandong · Case #BC-2026-0002                                                        │
│ Missed Dose: Day 7 Anti-Rabies Vaccine (Due: Aug 31, 2026 · 2 Days Overdue)                        │
│ Next Clinic Open Day: Tuesday, Sep 1, 2026 (08:00 AM – 05:00 PM)                                   │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Select Notification Channels:                                                                      │
│                                                                                                    │
│ [✓] 📱 SMS Message (+63 917 123 4567)                                                              │
│     Message Preview:                                                                               │
│     "[Tagoloan ABTC] URGENT: Your Day 7 rabies vaccine was missed on Aug 31. Please visit the     │
│      clinic immediately on our next open day (Tue, Sep 1) to maintain rabies protection."          │
│                                                                                                    │
│ [✓] 📧 Email Notification (hazel@example.com)                                                      │
│     Subject: URGENT: Missed Rabies Vaccination Schedule - Tagoloan Animal Bite Center              │
│                                                                                                    │
│ [✓] 🔔 Mobile App Push / In-App Notification (Linked Account: Hazel Nandong)                       │
│     "⚠️ URGENT: Day 7 dose is overdue. Tap here to view open clinic hours or reschedule."          │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Cancel ]                                                    [ 🚀 Send Recall Notification(s) ]   │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### C. Mobile App Experience (Patient View)

1. **Home Screen & Calendar Alert Banner**:
   - If a patient has a missed dose, a high-priority amber/red alert card is pinned:
     > *"⚠️ Your Day 7 rabies dose scheduled for Aug 31 was missed. Animal bite rabies protection requires timely doses. Our clinic is open on Tue, Sep 1. [Tap to Reschedule or View Directions]"*
2. **Flexible Rescheduling Date Selector**:
   - When tapping **"Reschedule"**, the calendar selector automatically disables all closed days (e.g. Sundays, closed Mondays, holidays) based on the admin's latest schedule settings.

---

## ⚙️ 4. Backend Service Architecture

### 1. `AppointmentProgressionService.php`
Aggregates and formats patient multi-dose PEP journeys:
- **`getPatientPepJourney(int $patientId)`**:
  - Compiles Day 0, Day 3, Day 7, Day 28, and Booster doses.
  - Matches each dose against `treatment_records` (Administered) and `appointments` (Scheduled / Missed / Overdue).
  - Determines current active step, compliance percentage, and channel origin (`walk_in` vs `online_mobile`).
- **`getClinicProgressionMatrix(int $clinicId, array $filters)`**:
  - Returns paginated list of all active patients with their multi-dose stepper status.

### 2. `AppointmentReminderService.php` (Multi-Channel Dispatcher)
- **`sendMissedScheduleAlert(int $appointmentId, array $channels, ?int $sentByUserId)`**:
  - **SMS Dispatch**: Formats concise, urgent SMS reminder and routes via SMS Gateway API.
  - **Email Dispatch**: Compiles and sends `MissedDoseAlertMail` with medical instructions and clinic operating hours.
  - **In-App Dispatch**: Creates notification record linked to `patient_accounts` and invalidates notification cache.
  - Logs execution in `appointment_reminders` and increments `reminder_sent_count` on `appointments`.
- **`sendBatchMissedAlerts(array $appointmentIds, array $channels, ?int $sentByUserId)`**:
  - Batch executes recall dispatches and returns detailed success/failure delivery metrics.

### 3. `FlexibleRescheduleService.php`
- Integrates with `ClinicScheduleService`:
  - When rescheduling a missed dose, calculates the earliest valid operating day that is open according to the weekly pattern and calendar exceptions.
  - Automatically shifts subsequent dependent doses (e.g., if Day 3 is delayed by +2 days, recalculates Day 7 and Day 28).

---

## 🔌 5. Backend REST API Endpoints

### Progression & Stepper Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/vaccinations/regimen-progression` | Staff / Admin | Get patient-grouped PEP dose progression matrix with filters (Channel, Status, Search). |
| `GET` | `/api/patients/{id}/pep-journey` | Staff / Patient | Get single patient 5-dose timeline stepper details. |

### Missed Schedules & Recall Alert Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/appointments/missed-no-shows` | Staff / Admin | List all overdue / missed appointments with reminder history and contact info. |
| `POST` | `/api/appointments/{id}/send-missed-alert` | Staff / Admin | Dispatch targeted SMS, Email, and In-App recall alerts for a single missed appointment. |
| `POST` | `/api/appointments/send-batch-missed-alerts` | Staff / Admin | Batch dispatch recall notifications to multiple selected overdue patients. |
| `POST` | `/api/appointments/{id}/reschedule-missed` | Staff / Patient | Reschedule a missed dose to a valid open clinic date with dynamic schedule validation. |
| `GET` | `/api/appointments/{id}/reminder-history` | Staff / Admin | View delivery audit logs for previous alerts sent for this appointment. |

---

## 📅 6. Step-by-Step Implementation Roadmap

### Step 1: Database Migrations & Eloquent Models
- [ ] Create migration adding `booking_channel`, `missed_at`, `reminder_sent_count`, `last_reminded_at` to `appointments`.
- [ ] Create migration for `appointment_reminders` audit log table.
- [ ] Update `Appointment.php` model with casts, relationships (`reminders()`), and helper scopes (`scopeMissed()`, `scopeWalkIn()`, `scopeOnline()`).
- [ ] Create `AppointmentReminder.php` model.

### Step 2: Backend Core Services
- [ ] Create `backend/app/Services/AppointmentProgressionService.php` (Timeline aggregation, compliance calculation, dose status resolution).
- [ ] Create `backend/app/Services/AppointmentReminderService.php` (SMS, Email, In-App multi-channel dispatching with audit logging).
- [ ] Create `backend/app/Mail/MissedDoseAlertMail.php` (Formatted medical reminder email).

### Step 3: Backend Controller & API Routes
- [ ] Create `backend/app/Http/Controllers/AppointmentRecallController.php` implementing progression, missed list, single alert, batch alerts, and rescheduling endpoints.
- [ ] Register routes in `backend/routes/api.php` under staff/admin auth middleware.

### Step 4: Web UI — PEP Regimen Stepper & Missed Recall Station
- [ ] Create `frontend/src/features/vaccinations/components/PatientPepStepperCard.tsx` (Visual 5-step stepper component with badges and Form 3 trigger).
- [ ] Create `frontend/src/features/vaccinations/components/MissedAppointmentRecallStation.tsx` (Missed table, urgency chips, single & batch recall actions).
- [ ] Create `frontend/src/features/vaccinations/components/SendRecallNotificationModal.tsx` (Channel selection modal with live previews).
- [ ] Update `frontend/src/features/vaccinations/pages/VaccinationManagementPage.tsx` or `/nurse/patients` with the clean 4-tab layout.

### Step 5: Mobile App Urgent Alert & Flexible Rebooking Integration
- [ ] Update mobile home view with urgent overdue dose banner.
- [ ] Integrate flexible date selector into mobile rebooking flow ensuring non-operating days and holiday closures are unselectable.

### Step 6: End-to-End Verification & Testing
- [ ] Verify progression stepper correctly displays completed doses from Form 3 and upcoming doses from appointments.
- [ ] Test sending SMS, Email, and In-App alerts for missed schedules.
- [ ] Test dynamic schedule rescheduling when admin closes specific weekdays or adds holidays.

---

## 🛡️ 7. Clinical Safety & Defensive Rules

1. **Anti-Spam Rate Limiting**: The system prevents staff from sending more than 2 recall alerts per patient within a 24-hour window unless overridden by an admin.
2. **Dynamic Operating Validation**: Rebooking an appointment always passes through `ClinicScheduleService::isDateOpen()`. If an admin closes Mondays, the rebooking engine strictly blocks Monday selection and suggests the next open day.
3. **Audit Trail Accountability**: Every SMS, Email, and In-App alert sent records the exact timestamp, recipient, message body, and the staff member who authorized the recall.
