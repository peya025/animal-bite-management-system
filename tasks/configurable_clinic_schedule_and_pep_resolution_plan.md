# 📅 Implementation Plan: Configurable Clinic Operating Schedule & PEP Date Resolution Engine

This document details the architectural plan for supporting clinics with non-daily operating days (e.g., open only Mondays and Thursdays), special holiday/exception schedules, algorithmic PEP appointment date resolution, urgent Day-0 exposure policies, and transparent UI representations across web and mobile.

---

## 🧭 Executive Summary & Clinical Context

In many rural health units (RHUs) and specialized animal bite treatment centers (ABTCs):
1. **Non-Daily Schedules**: Clinics may only operate on specific weekdays (e.g., Mondays and Thursdays).
2. **Clinical Drift & Rounding Rules**: When an ideal rabies PEP dose date (e.g., Day 3 or Day 7) lands on a closed day or public holiday, the dose date must be resolved against open clinic days.
3. **Medical Transparency**: The system must preserve the **`ideal_date`** (the exact medical protocol calendar date) alongside the **`scheduled_date`** (the actual clinic-open date) so clinicians and patients understand the schedule drift.
4. **Urgent Day-0 Emergency Handling**: Day 0 (first exposure dose) is an emergency and must **never** be silently postponed to the next open day without an explicit clinic urgent access policy (either 24/7 ER walk-in or referral to an alternate facility).

---

## 🏛️ System Architecture & Data Models

### 1. Database Schema Additions

#### A. `clinic_schedules` Table (Recurring Weekly Pattern)
Stores the default operating hours for each day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday):

| Column | Type | Description |
|---|---|---|
| `id` | `BIGINT UNSIGNED PK` | Primary key |
| `clinic_id` | `BIGINT UNSIGNED FK` | Scoped clinic |
| `day_of_week` | `TINYINT` | `0` (Sun) to `6` (Sat) |
| `is_open` | `BOOLEAN` | `true` if clinic operates on this day |
| `open_time` | `TIME NULL` | e.g. `08:00:00` |
| `close_time` | `TIME NULL` | e.g. `17:00:00` |
| `slot_interval_minutes` | `INT DEFAULT 30` | Slot duration for appointments |
| `max_patients_per_slot` | `INT DEFAULT 10` | Slot capacity |
| `created_at` / `updated_at`| `TIMESTAMP` | Audit timestamps |

*Unique constraint*: `UNIQUE(clinic_id, day_of_week)`

---

#### B. `clinic_schedule_exceptions` Table (Holidays & Special Overrides)
Overrides the weekly pattern for specific calendar dates:

| Column | Type | Description |
|---|---|---|
| `id` | `BIGINT UNSIGNED PK` | Primary key |
| `clinic_id` | `BIGINT UNSIGNED FK` | Scoped clinic |
| `exception_date` | `DATE` | Specific date (e.g. `2026-12-25`) |
| `is_open` | `BOOLEAN` | `false` (Special Closure/Holiday) or `true` (Special Extra Open Day) |
| `open_time` | `TIME NULL` | Custom open time for this date |
| `close_time` | `TIME NULL` | Custom close time for this date |
| `reason` | `VARCHAR(255)` | e.g. "Christmas Day", "Staff Training", "Saturday Special Clinic" |
| `created_by` | `BIGINT UNSIGNED FK NULL` | Staff user ID |
| `created_at` / `updated_at`| `TIMESTAMP` | Audit timestamps |

*Unique constraint*: `UNIQUE(clinic_id, exception_date)`

---

#### C. `clinics` Table Additions (Policies & Drift Configuration)
Adds clinic-wide scheduling drift and urgent exposure policies:

```sql
ALTER TABLE `clinics`
  ADD COLUMN `schedule_drift_policy` ENUM('forward_only', 'nearest', 'backward_within_N_days') NOT NULL DEFAULT 'forward_only',
  ADD COLUMN `backward_max_days` INT NOT NULL DEFAULT 1,
  ADD COLUMN `urgent_access_policy` ENUM('walk_ins_accepted_outside_hours', 'refer_to_alternate_facility') NOT NULL DEFAULT 'walk_ins_accepted_outside_hours',
  ADD COLUMN `urgent_referral_facility_name` VARCHAR(255) NULL,
  ADD COLUMN `urgent_referral_facility_address` VARCHAR(255) NULL,
  ADD COLUMN `urgent_referral_facility_contact` VARCHAR(255) NULL,
  ADD COLUMN `urgent_referral_instructions` TEXT NULL;
```

---

#### D. `appointments` Table Additions (`ideal_date` & Drift Tracking)
```sql
ALTER TABLE `appointments`
  ADD COLUMN `ideal_date` DATE NULL AFTER `scheduled_date`,
  ADD COLUMN `schedule_drift_days` INT NOT NULL DEFAULT 0 AFTER `ideal_date`,
  ADD COLUMN `schedule_adjustment_reason` VARCHAR(255) NULL AFTER `schedule_drift_days`;
```

---

## 🧮 2. Date Computation & Resolution Engine

We will build a dedicated backend service: **`ClinicScheduleService.php`** (`app/Services/ClinicScheduleService.php`).

```
                              ┌────────────────────────────────────────┐
                              │ Input: Clinic ID, Ideal Date, Dose No. │
                              └───────────────────┬────────────────────┘
                                                  │
                                   Is Date an Exception in DB?
                                                  │
                            ┌─────────────────────┴─────────────────────┐
                            │ YES                                       │ NO
                            ▼                                           ▼
              Check Exception `is_open`                    Check Weekly `clinic_schedules`
                            │                                           │
                            └─────────────────────┬─────────────────────┘
                                                  │
                                            Is Date Open?
                                                  │
                            ┌─────────────────────┴─────────────────────┐
                            │ YES                                       │ NO
                            ▼                                           ▼
                 `scheduled_date = date`                     Apply Clinic Drift Policy:
                  `drift_days = 0`                           • `forward_only`: Next open day
                                                             • `nearest`: Closest open day
                                                             • `backward_within_N_days`: Up to N days early
                                                                        │
                                                                        ▼
                                                             Resolved Scheduled Date +
                                                             Drift Reason Generated
```

### Key Invariant Checks:
1. `isDateOpen(clinicId, date)`: Checks `clinic_schedule_exceptions` first; if no exception exists, checks `clinic_schedules` for that `day_of_week`.
2. Resolution algorithm iterates through prospective dates according to the configured policy:
   * **`forward_only`** (Standard PEP recommendation for D0/D3): Moves forward to the next open day (+1, +2, +3 days).
   * **`nearest`**: Searches adjacent days (+1, -1, +2, -2).
   * **`backward_within_N_days`**: Allows up to $N$ days early if open, otherwise moves forward.
3. Automatically computes:
   * `drift_days = scheduled_date.diffInDays(ideal_date)`
   * `adjustment_reason = "Clinic closed on Sunday (Moved +1d to Mon, Aug 31)"`

---

## 🚨 3. Urgent / Day-0 Exposure Access Handling

### Rule:
* Day 0 (Initial Bite Consultation / Post-Exposure Prophylaxis) cannot be silently postponed.
* If a patient attempts to book Day 0 on a date when the clinic is closed:
  * If **`walk_ins_accepted_outside_hours`**:
    * Display prominent UI badge:
      `⚠️ Clinic Regular Counter Closed Today: 24/7 Emergency Walk-ins accepted at Triage Desk / ER.`
  * If **`refer_to_alternate_facility`**:
    * Display immediate referral directive:
      `🚨 Clinic Closed Today: For immediate Day 0 rabies prophylaxis, please proceed to [Alternate Facility Name], [Address] • Contact: [Phone].`
    * Provide a direct link to map / call alternate facility.

---

## 🖥️ 4. Admin Settings Screen (`ClinicOperatingSchedulePage.tsx`)

A full-featured settings interface accessible under **Clinic Setup $\rightarrow$ Operating Schedule**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CLINIC OPERATING SCHEDULE & PEP RESOLUTION SETTINGS                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ 📅 Weekly Operating Hours ]   [ 🏖️ Schedule Exceptions & Holidays ]   [ ⚙️ Drift & Emergency ] │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ RECURRING WEEKLY SCHEDULE:                                                                       │
│                                                                                                  │
│ [x] Monday      08:00 AM – 05:00 PM    [ Edit Hours ]    🟢 Open                                 │
│ [ ] Tuesday     Closed                 [ Open Day   ]    ⚪ Closed                               │
│ [ ] Wednesday   Closed                 [ Open Day   ]    ⚪ Closed                               │
│ [x] Thursday    08:00 AM – 05:00 PM    [ Edit Hours ]    🟢 Open                                 │
│ [ ] Friday      Closed                 [ Open Day   ]    ⚪ Closed                               │
│ [ ] Saturday    Closed                 [ Open Day   ]    ⚪ Closed                               │
│ [ ] Sunday      Closed                 [ Open Day   ]    ⚪ Closed                               │
│                                                                                                  │
│ ──────────────────────────────────────────────────────────────────────────────────────────────── │
│ [ 💾 Save Weekly Schedule ]                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📱 5. UI Transparency & Multi-Platform Integration

### A. Web Form 3 & Nurse Treatment List:
* When `scheduled_date !== ideal_date`:
  * Display clear visual cue:
    `Scheduled: Aug 31, 2026 (Ideal: Aug 30 • Clinic closed on Sunday)`.

### B. Mobile App (`date_selector.dart` & `booking_view.dart`):
* `date_selector.dart` dynamically queries the clinic schedule endpoint (`/api/mobile/clinics/{id}/schedule`) and disables closed days in `TableCalendar` (`enabledDayPredicate`).
* If a closed day is tapped, a non-intrusive tooltip explains: `"Clinic closed on Tuesdays"`.
* When viewing Digital Vaccination Passport, display:
  `Day 3 Dose: Aug 31, 2026 (Ideal: Aug 30 • Sunday adjustment)`.

---

## 🛠️ Proposed File Changes

### Backend:
- `[NEW]` [`backend/database/migrations/2026_08_27_000001_create_clinic_schedules_table.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/database/migrations/2026_08_27_000001_create_clinic_schedules_table.php)
- `[NEW]` [`backend/database/migrations/2026_08_27_000002_create_clinic_schedule_exceptions_table.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/database/migrations/2026_08_27_000002_create_clinic_schedule_exceptions_table.php)
- `[NEW]` [`backend/database/migrations/2026_08_27_000003_add_schedule_and_drift_policies_to_clinics_table.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/database/migrations/2026_08_27_000003_add_schedule_and_drift_policies_to_clinics_table.php)
- `[NEW]` [`backend/database/migrations/2026_08_27_000004_add_ideal_date_and_drift_to_appointments_table.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/database/migrations/2026_08_27_000004_add_ideal_date_and_drift_to_appointments_table.php)
- `[NEW]` [`backend/app/Models/ClinicSchedule.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/app/Models/ClinicSchedule.php)
- `[NEW]` [`backend/app/Models/ClinicScheduleException.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/app/Models/ClinicScheduleException.php)
- `[NEW]` [`backend/app/Services/ClinicScheduleService.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/app/Services/ClinicScheduleService.php)
- `[NEW]` [`backend/app/Http/Controllers/ClinicScheduleController.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/app/Http/Controllers/ClinicScheduleController.php)
- `[MODIFY]` [`backend/app/Http/Controllers/VaccinationRecordController.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/app/Http/Controllers/VaccinationRecordController.php)
- `[MODIFY]` [`backend/app/Http/Controllers/Mobile/MobileAppointmentController.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/app/Http/Controllers/Mobile/MobileAppointmentController.php)
- `[MODIFY]` [`backend/routes/api.php`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/backend/routes/api.php)

### Frontend Web:
- `[NEW]` [`frontend/src/features/clinic-setup/pages/ClinicOperatingSchedulePage.tsx`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/frontend/src/features/clinic-setup/pages/ClinicOperatingSchedulePage.tsx)
- `[MODIFY]` [`frontend/src/features/vaccinations/components/VaccinationRecordForm.tsx`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/frontend/src/features/vaccinations/components/VaccinationRecordForm.tsx)
- `[MODIFY]` [`frontend/src/features/patients/pages/NursePatientListPage.tsx`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/frontend/src/features/patients/pages/NursePatientListPage.tsx)
- `[MODIFY]` [`frontend/src/shared/config/navigationConfig.ts`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/frontend/src/shared/config/navigationConfig.ts)
- `[MODIFY]` [`frontend/src/App.tsx`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/frontend/src/App.tsx)

### Mobile App:
- `[MODIFY]` [`mobile/lib/widgets/booking/date_selector.dart`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/mobile/lib/widgets/booking/date_selector.dart)
- `[MODIFY]` [`mobile/lib/views/booking_view.dart`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/mobile/lib/views/booking_view.dart)
- `[MODIFY]` [`mobile/lib/widgets/vaccination/digital_vaccination_card.dart`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/mobile/lib/widgets/vaccination/digital_vaccination_card.dart)

---

## 🧪 Verification Plan

### Automated Tests:
- Run Laravel migration tests: `php artisan migrate --pretend`
- Execute schedule resolution unit tests verifying:
  1. Mon/Thu only clinic resolves Day 3 and Day 7 correctly.
  2. Holiday exceptions override weekly pattern.
  3. `ideal_date` vs `scheduled_date` computed with correct drift days.
  4. Day 0 emergency referral notice returned on closed days.
- TypeScript build check: `npx tsc --noEmit`
- Flutter analysis: `flutter analyze`

### Manual Verification:
1. Log in as Clinic Admin and navigate to `/setup/schedule`.
2. Configure a clinic to be open **only Mondays and Thursdays**.
3. Add an exception date (e.g. Next Monday is a Holiday).
4. Record a Day 0 vaccination on Thursday and verify that Day 3 is auto-scheduled to the next open clinic day with ideal date tracked.
5. In Mobile App, attempt to book an appointment and verify non-operating days are disabled with informative tooltips.
