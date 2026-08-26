 📅 Technical Plan: Configurable Clinic Operating Schedule & PEP Date Resolution Engine

> **Target Area**: Full-Stack System (`backend/`, `frontend/`, `mobile/`)  
> **Status**: Ready for Implementation  
> **Category**: Clinic Operating Schedule, Schedule Exceptions, Clinical Drift Rules, Urgent Day-0 Policy, and Multi-Platform UI Transparency  

---

## 🧭 1. Executive Summary & Clinical Context

In the Philippines and many global health systems, rural health units (RHUs) and specialized Animal Bite Treatment Centers (ABTCs) often operate on **non-daily schedules** (e.g., open only on Mondays and Thursdays for routine vaccination sessions).

### Key Clinical Challenges Addressed:
1. **Clinical Drift in PEP Regimens**: A standard rabies Post-Exposure Prophylaxis (PEP) regimen mandates doses on **Day 0, Day 3, Day 7, and Day 28**. When an ideal calendar date falls on a closed day or public holiday, the appointment must resolve to an open clinic day based on approved clinical rounding policies.
2. **Medical-Legal Transparency**: The system must store and display **both** the **`ideal_date`** (the exact medical protocol calendar date) and the **`scheduled_date`** (the resolved open clinic date), logging the drift reason (e.g., `+1 day due to Sunday closure`).
3. **Emergency Day-0 Protection**: Initial bite exposure treatment (Day 0) is a medical emergency. It must **never** be silently postponed like routine follow-up doses. If a patient attempts to book Day 0 on a closed day, the system enforces an explicit **Urgent Access Policy** (24/7 ER walk-in or referral to an alternate open ABTC).
4. **Zero-Deploy Schedule Updates**: Administrators must be able to adjust weekly operating days, hours, and calendar exceptions through a dedicated settings UI without requiring code deployments.

---

## 🏛️ 2. Database Schema & Data Models

```
                               ┌──────────────────────────────────────────────┐
                               │               clinics Table                  │
                               │  • schedule_drift_policy (ENUM)              │
                               │  • backward_max_days (INT DEFAULT 1)         │
                               │  • urgent_access_policy (ENUM)               │
                               │  • urgent_referral_facility_name (VARCHAR)   │
                               │  • urgent_referral_facility_contact (VARCHAR)│
                               └──────────────────────┬───────────────────────┘
                                                      │ 1
                                    ┌─────────────────┴─────────────────┐
                                    │ 1:N                               │ 1:N
                                    ▼                                   ▼
        ┌─────────────────────────────────────────┐ ┌─────────────────────────────────────────┐
        │         clinic_schedules Table          │ │      clinic_schedule_exceptions Table   │
        │  • day_of_week (0=Sun, 1=Mon... 6=Sat)  │ │  • exception_date (DATE)                │
        │  • is_open (BOOLEAN)                    │ │  • is_open (BOOLEAN: Holiday vs Extra)  │
        │  • open_time (TIME), close_time (TIME)  │ │  • open_time (TIME), close_time (TIME)  │
        │  • slot_interval_minutes (INT)          │ │  • reason (VARCHAR: "Holiday / Storm")  │
        │  • max_patients_per_slot (INT)          │ └─────────────────────────────────────────┘
        └─────────────────────────────────────────┘
```

### Table 1: `clinic_schedules` (Recurring Weekly Pattern)
```sql
CREATE TABLE `clinic_schedules` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `clinic_id` BIGINT UNSIGNED NOT NULL,
  `day_of_week` TINYINT NOT NULL COMMENT '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday',
  `is_open` BOOLEAN NOT NULL DEFAULT TRUE,
  `open_time` TIME NULL DEFAULT '08:00:00',
  `close_time` TIME NULL DEFAULT '17:00:00',
  `slot_interval_minutes` INT NOT NULL DEFAULT 30,
  `max_patients_per_slot` INT NOT NULL DEFAULT 10,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY `clinic_day_unique` (`clinic_id`, `day_of_week`),
  FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table 2: `clinic_schedule_exceptions` (Holidays & Special Overrides)
```sql
CREATE TABLE `clinic_schedule_exceptions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `clinic_id` BIGINT UNSIGNED NOT NULL,
  `exception_date` DATE NOT NULL,
  `is_open` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'false = Special Closure/Holiday, true = Special Extra Open Day',
  `open_time` TIME NULL,
  `close_time` TIME NULL,
  `reason` VARCHAR(255) NOT NULL COMMENT 'e.g. Christmas Day, Typhoon Signal #3, Saturday Special Clinic',
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY `clinic_exception_date_unique` (`clinic_id`, `exception_date`),
  FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table 3: `clinics` Table Additions
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

### Table 4: `appointments` Table Additions
```sql
ALTER TABLE `appointments`
  ADD COLUMN `ideal_date` DATE NULL AFTER `scheduled_date`,
  ADD COLUMN `schedule_drift_days` INT NOT NULL DEFAULT 0 AFTER `ideal_date`,
  ADD COLUMN `schedule_adjustment_reason` VARCHAR(255) NULL AFTER `schedule_drift_days`;
```

---

## 🧮 3. Date Computation & Resolution Engine

### Backend Service: `ClinicScheduleService.php`
Located at `backend/app/Services/ClinicScheduleService.php`.

```php
namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicSchedule;
use App\Models\ClinicScheduleException;
use Carbon\Carbon;

class ClinicScheduleService
{
    /**
     * Resolve the nearest open clinic appointment date for a given dose
     * 
     * @param int $clinicId
     * @param Carbon $idealDate
     * @param int $doseNumber (0, 3, 7, 28, 90, 365)
     * @return array{
     *   scheduled_date: Carbon,
     *   ideal_date: Carbon,
     *   drift_days: int,
     *   adjustment_reason: string|null,
     *   is_open: bool
     * }
     */
    public function resolveScheduleDate(int $clinicId, Carbon $idealDate, int $doseNumber = 3): array
    {
        $clinic = Clinic::findOrFail($clinicId);
        $policy = $clinic->schedule_drift_policy ?? 'forward_only';
        $maxBackwardDays = $clinic->backward_max_days ?? 1;

        // 1. If ideal date is already open, zero drift
        if ($this->isDateOpen($clinicId, $idealDate)) {
            return [
                'scheduled_date' => $idealDate->copy(),
                'ideal_date' => $idealDate->copy(),
                'drift_days' => 0,
                'adjustment_reason' => null,
                'is_open' => true,
            ];
        }

        // 2. Resolve based on configured drift policy
        $resolvedDate = null;
        $reason = $this->getClosureReason($clinicId, $idealDate);

        switch ($policy) {
            case 'nearest':
                $resolvedDate = $this->findNearestOpenDate($clinicId, $idealDate);
                break;

            case 'backward_within_N_days':
                // Check up to N days early, otherwise move forward
                $resolvedDate = $this->findBackwardWithinNDays($clinicId, $idealDate, $maxBackwardDays);
                break;

            case 'forward_only':
            default:
                $resolvedDate = $this->findNextOpenDate($clinicId, $idealDate);
                break;
        }

        $driftDays = $idealDate->diffInDays($resolvedDate, false);
        $driftText = $driftDays > 0 ? "+{$driftDays}d" : "{$driftDays}d";
        $adjustmentReason = "{$reason} (Moved {$driftText} to " . $resolvedDate->format('D, M j') . ")";

        return [
            'scheduled_date' => $resolvedDate,
            'ideal_date' => $idealDate->copy(),
            'drift_days' => $driftDays,
            'adjustment_reason' => $adjustmentReason,
            'is_open' => true,
        ];
    }

    /**
     * Check if a specific date is open (Exceptions override weekly schedule)
     */
    public function isDateOpen(int $clinicId, Carbon $date): bool
    {
        $dateStr = $date->toDateString();

        // 1. Check Exceptions first (Priority 1)
        $exception = ClinicScheduleException::where('clinic_id', $clinicId)
            ->where('exception_date', $dateStr)
            ->first();

        if ($exception !== null) {
            return (bool) $exception->is_open;
        }

        // 2. Check Recurring Weekly Schedule (Priority 2)
        $schedule = ClinicSchedule::where('clinic_id', $clinicId)
            ->where('day_of_week', $date->dayOfWeek)
            ->first();

        if ($schedule !== null) {
            return (bool) $schedule->is_open;
        }

        // Fallback default: Open Mon-Fri, Closed Sat-Sun
        return !in_array($date->dayOfWeek, [0, 6]);
    }

    public function findNextOpenDate(int $clinicId, Carbon $date, int $maxDays = 30): Carbon
    {
        $current = $date->copy()->addDay();
        for ($i = 0; $i < $maxDays; $i++) {
            if ($this->isDateOpen($clinicId, $current)) {
                return $current;
            }
            $current->addDay();
        }
        return $date->copy()->addDay(); // Safe fallback
    }

    public function findNearestOpenDate(int $clinicId, Carbon $date, int $maxDays = 7): Carbon
    {
        for ($offset = 1; $offset <= $maxDays; $offset++) {
            $forward = $date->copy()->addDays($offset);
            if ($this->isDateOpen($clinicId, $forward)) return $forward;

            $backward = $date->copy()->subDays($offset);
            if ($this->isDateOpen($clinicId, $backward)) return $backward;
        }
        return $this->findNextOpenDate($clinicId, $date);
    }

    public function findBackwardWithinNDays(int $clinicId, Carbon $date, int $maxN): Carbon
    {
        for ($offset = 1; $offset <= $maxN; $offset++) {
            $backward = $date->copy()->subDays($offset);
            if ($this->isDateOpen($clinicId, $backward)) return $backward;
        }
        return $this->findNextOpenDate($clinicId, $date);
    }

    public function getClosureReason(int $clinicId, Carbon $date): string
    {
        $exception = ClinicScheduleException::where('clinic_id', $clinicId)
            ->where('exception_date', $date->toDateString())
            ->first();

        if ($exception && !$exception->is_open) {
            return "Clinic closed: {$exception->reason}";
        }

        return "Clinic closed on " . $date->format('l') . "s";
    }
}
```

---

## 🚨 4. Urgent / Day-0 Exposure Policy Engine

### Clinical Distinction: Day 0 vs Routine Doses
* **Routine Follow-ups (D3, D7, D28)**: Clinical tolerance permits shifting by $\pm 1$ or $+2$ days when the clinic is closed.
* **Emergency Day 0 (Initial Bite Consultation)**: Rabies virus incubation begins at the bite site immediately. A patient with a fresh Category III bite **cannot wait 3 days** for the clinic to open.

### Behavior Matrix:
```
                                 Patient Selects Closed Day
                                              │
                              Is Appointment Type = "Day 0" /
                              "Initial Bite Consultation"?
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │ YES (Emergency)                               │ NO (Routine D3/D7/D28)
                      ▼                                               ▼
     Check `urgent_access_policy`:                       Apply Drift Policy & Schedule
                      │                                  for nearest open day
       ┌──────────────┴──────────────┐
       │                             │
       ▼                             ▼
 [ Walk-ins Accepted 24/7 ]    [ Refer to Alternate Facility ]
 • Display ER / Triage Alert   • Display Referral Card:
   "Regular booking closed,      "Proceed immediately to
    proceed directly to ER        Cagayan de Oro City ABTC
    Triage for Day 0 PEP."        (Address, Phone, Map Link)"
```

---

## 🖥️ 5. Admin Settings Screen (`ClinicOperatingSchedulePage.tsx`)

Located under **Clinic Setup $\rightarrow$ Operating Schedule & Exceptions** (`/setup/schedule`).

### UI Layout & Tabs:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CLINIC OPERATING SCHEDULE & PEP RESOLUTION SETTINGS                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ 📅 1. Weekly Operating Hours ]   [ 🏖️ 2. Holidays & Exceptions ]   [ ⚙️ 3. Policies & Urgent ]   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ TAB 1: RECURRING WEEKLY SCHEDULE                                                                 │
│                                                                                                  │
│  Day          Status     Open Time   Close Time   Slot Size   Capacity                           │
│  ─────────────────────────────────────────────────────────────────────                           │
│  Monday       [x] Open   [08:00 AM]  [05:00 PM]   [30 mins]   [10]                               │
│  Tuesday      [ ] Closed ──          ──           ──          ──                                 │
│  Wednesday    [ ] Closed ──          ──           ──          ──                                 │
│  Thursday     [x] Open   [08:00 AM]  [05:00 PM]   [30 mins]   [10]                               │
│  Friday       [ ] Closed ──          ──           ──          ──                                 │
│  Saturday     [ ] Closed ──          ──           ──          ──                                 │
│  Sunday       [ ] Closed ──          ──           ──          ──                                 │
│                                                                                                  │
│  [ 💾 Save Weekly Schedule ]                                                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ TAB 2: SCHEDULE EXCEPTIONS & HOLIDAYS                                                            │
│                                                                                                  │
│  [ + Add Holiday / Special Date Override ]                                                       │
│                                                                                                  │
│  Date           Type            Reason                     Hours             Actions             │
│  ─────────────────────────────────────────────────────────────────────────────────────────────   │
│  Dec 25, 2026   🔴 Closed       Christmas Day              All Day           [ Edit ] [ Delete ] │
│  Aug 31, 2026   🔴 Closed       National Heroes Day        All Day           [ Edit ] [ Delete ] │
│  Sep 05, 2026   🟢 Extra Open   Saturday Special Session   08:00 AM–12:00 PM [ Edit ] [ Delete ] │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ TAB 3: REGIMEN DRIFT & EMERGENCY POLICIES                                                        │
│                                                                                                  │
│  PEP Schedule Drift Policy:                                                                      │
│  (●) Forward Only (Next Open Day) [Recommended for Rabies PEP]                                   │
│  ( ) Nearest Open Day (Forward or Backward)                                                      │
│  ( ) Backward within [ 1 ] Day(s), then Forward                                                  │
│                                                                                                  │
│  Urgent Day-0 Exposure Policy (When clinic is closed):                                           │
│  (●) Emergency Walk-ins Accepted 24/7 (via ER Triage Counter)                                    │
│  ( ) Refer to Alternate Emergency ABTC Facility                                                  │
│      Facility Name:    [ Northern Mindanao Medical Center ABTC                        ]          │
│      Address:          [ Capitol Compound, Cagayan de Oro City                         ]          │
│      Emergency Phone:  [ (088) 856-4147                                               ]          │
│                                                                                                  │
│  [ 💾 Save Policy Configuration ]                                                                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📱 6. Multi-Platform UI Transparency

### 1. Web Form 3 & Nurse Treatment Table
* When `scheduled_date !== ideal_date`:
  * Form 3 renders an informative chip:
    `Scheduled: Aug 31, 2026 (Ideal: Aug 30 • Sunday Closed)`
  * Nurse Patient list displays:
    `Day 3 (Dose 1) • Aug 31, 2026`  
    `ℹ️ Ideal: Aug 30 • Sunday adjustment`

### 2. Mobile App Booking (`date_selector.dart` & `booking_view.dart`)
* `TableCalendar` fetches open days & exception dates via `/api/mobile/clinics/{id}/schedule`.
* `enabledDayPredicate` disables closed dates and greys them out.
* If user taps a closed day, an informative tooltip shows: `"Clinic operates on Mondays & Thursdays"`.
* If booking Day 0 on a closed date, the app renders the **Urgent Emergency Banner**:
  `🚨 Clinic closed today: For immediate Day 0 rabies PEP, proceed to ER Triage or call (088) 856-4147.`

### 3. Mobile Digital Vaccination Passport
* Each dose card renders the true protocol alignment:
  `Day 3 Dose: Aug 31, 2026 (Ideal: Aug 30 • Sunday adjustment)`

---

## 📂 7. Complete File Inventory & Impact Matrix

| Component | File Path | Action | Description |
|---|---|---|---|
| **Database Migration** | `backend/database/migrations/2026_08_27_000001_create_clinic_schedules_table.php` | `NEW` | Weekly recurring schedule schema |
| **Database Migration** | `backend/database/migrations/2026_08_27_000002_create_clinic_schedule_exceptions_table.php` | `NEW` | Holiday & override schema |
| **Database Migration** | `backend/database/migrations/2026_08_27_000003_add_schedule_and_drift_policies_to_clinics_table.php` | `NEW` | Drift & urgent access policies |
| **Database Migration** | `backend/database/migrations/2026_08_27_000004_add_ideal_date_and_drift_to_appointments_table.php` | `NEW` | `ideal_date` & `schedule_drift_days` |
| **Eloquent Model** | `backend/app/Models/ClinicSchedule.php` | `NEW` | Model with day_of_week casting |
| **Eloquent Model** | `backend/app/Models/ClinicScheduleException.php` | `NEW` | Model with date casting |
| **Core Service** | `backend/app/Services/ClinicScheduleService.php` | `NEW` | PEP date resolution engine |
| **API Controller** | `backend/app/Http/Controllers/ClinicScheduleController.php` | `NEW` | CRUD endpoints for admin schedule |
| **API Controller** | `backend/app/Http/Controllers/VaccinationRecordController.php` | `MODIFY` | Integrate `ClinicScheduleService` |
| **API Controller** | `backend/app/Http/Controllers/Mobile/MobileAppointmentController.php` | `MODIFY` | Enforce schedule & Day-0 checks |
| **Routes** | `backend/routes/api.php` | `MODIFY` | Register schedule API endpoints |
| **Admin View** | `frontend/src/features/clinic-setup/pages/ClinicOperatingSchedulePage.tsx` | `NEW` | Full admin operating schedule UI |
| **Web Form 3** | `frontend/src/features/vaccinations/components/VaccinationRecordForm.tsx` | `MODIFY` | Display ideal vs scheduled chip |
| **Nurse Table** | `frontend/src/features/patients/pages/NursePatientListPage.tsx` | `MODIFY` | Render drift explanation tooltip |
| **Navigation** | `frontend/src/shared/config/navigationConfig.ts` | `MODIFY` | Add Operating Schedule sidebar link |
| **App Router** | `frontend/src/App.tsx` | `MODIFY` | Register `/setup/schedule` route |
| **Mobile Widget** | `mobile/lib/widgets/booking/date_selector.dart` | `MODIFY` | Dynamically disable closed days |
| **Mobile View** | `mobile/lib/views/booking_view.dart` | `MODIFY` | Render Day-0 urgent advisory banner |
| **Mobile Card** | `mobile/lib/widgets/vaccination/digital_vaccination_card.dart` | `MODIFY` | Display ideal vs scheduled date note |

---

## 🚀 8. Phased Implementation Plan

### Phase 1: Database Migrations & Models
1. Run migrations for `clinic_schedules`, `clinic_schedule_exceptions`, and column additions to `clinics` and `appointments`.
2. Create Eloquent models `ClinicSchedule` and `ClinicScheduleException` with relationships in `Clinic.php`.
3. Seed default schedule (Mon–Fri 8am–5pm) for all existing clinics.

### Phase 2: Core Resolution Engine & Backend API
1. Implement `ClinicScheduleService.php` with resolution algorithm, exception checks, and drift calculations.
2. Build `ClinicScheduleController.php` supporting GET/PUT schedule, GET/POST/DELETE exceptions, and GET available dates.
3. Update `VaccinationRecordController.php` to use `ClinicScheduleService` and store `ideal_date` and `schedule_drift_days`.
4. Update `MobileAppointmentController.php` to validate open dates and handle Day-0 urgent policies.

### Phase 3: Admin Operating Schedule UI
1. Build `ClinicOperatingSchedulePage.tsx` with Material-UI / Tailwind styling and Hugeicons.
2. Connect weekly schedule grid, exceptions manager modal, and policy toggles to the API.
3. Add `/setup/schedule` link in sidebar navigation under Clinic Setup.

### Phase 4: Web & Mobile Transparency Integration
1. Update `VaccinationRecordForm.tsx` and `NursePatientListPage.tsx` to render ideal date vs scheduled date chips.
2. Update mobile `date_selector.dart` to fetch schedule and disable closed dates.
3. Update mobile `booking_view.dart` with the Day-0 urgent referral banner.
4. Update `digital_vaccination_card.dart` to show drift notes.

---

## 🧪 9. Verification & Acceptance Criteria

- [ ] Clinic admin can configure a clinic to be open only on specific days (e.g. Mon & Thu).
- [ ] Recording Day 0 on Thursday in a Mon/Thu clinic resolves Day 3 to Monday (+1 day drift) with `ideal_date` (Sunday) preserved.
- [ ] Adding a holiday exception overrides the weekly pattern and shifts appointments accordingly.
- [ ] Day 0 bookings on closed days trigger the configured urgent walk-in or referral advisory.
- [ ] All web and mobile views display schedule adjustments with clear reasons.
- [ ] Automated tests pass: `npx tsc --noEmit` (0 errors) and `flutter analyze` (0 issues).

---

## 🛡️ 10. Implementation Risks, System Impacts & Non-Breaking Safeguards

To prevent regressions, broken states, or service interruptions during rollout, the table below outlines every affected subsystem, the associated failure mode, and the exact architectural safeguard implemented:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ RISK AREA / SUBSYSTEM       │ POTENTIAL BREAKAGE                     │ NON-BREAKING SAFEGUARD         │
├─────────────────────────────┼────────────────────────────────────────┼────────────────────────────────┤
│ 1. Existing Appointments in │ NullPointerException when rendering    │ • Make ideal_date NULLABLE     │
│    Database                 │ table columns that expect ideal_date   │ • Auto-backfill migration:     │
│                             │                                        │   ideal_date = COALESCE(sched) │
│                             │                                        │ • Frontend fallback:           │
│                             │                                        │   appt.ideal_date || appt.date │
├─────────────────────────────┼────────────────────────────────────────┼────────────────────────────────┤
│ 2. Unconfigured Clinics     │ ClinicSchedule table is empty on fresh │ • Auto-seed Mon-Fri rows       │
│    (0 schedule rows in DB)  │ install, causing all days to resolve   │   during migration             │
│                             │ as closed / unavailable                │ • Service hardcoded fallback:  │
│                             │                                        │   default to Mon-Fri if empty  │
├─────────────────────────────┼────────────────────────────────────────┼────────────────────────────────┤
│ 3. Form 3 Transaction       │ If date calculation throws an exception│ • Wrap appointment creation    │
│    Rollback Risk            │ (e.g., infinite date search), Day 0    │   in try-catch with fallback;  │
│                             │ treatment record submission fails      │   never roll back Day 0 save   │
├─────────────────────────────┼────────────────────────────────────────┼────────────────────────────────┤
│ 4. Queue Check-In Matching  │ QueueController matches appointments   │ • Keep scheduled_date and      │
│    on Today's Date          │ for today's queue ticket; misaligned   │   appointment_date in sync     │
│                             │ dates could orphan appointments        │   with resolved open date      │
├─────────────────────────────┼────────────────────────────────────────┼────────────────────────────────┤
│ 5. Nurse Status Queries     │ nursePatients() filters tabs by date;  │ • Date queries strictly match  │
│    (Due Today, Overdue)     │ patients on non-operating days might   │   scheduled_date; resolved     │
│                             │ falsely trigger overdue states         │   dates prevent false overdue  │
├─────────────────────────────┼────────────────────────────────────────┼────────────────────────────────┤
│ 6. Mobile App API Backward  │ Older mobile app versions lack the new │ • Keep all existing JSON keys  │
│    Compatibility            │ fields (ideal_date, drift_days)        │ • Append new fields as         │
│                             │                                        │   non-breaking optional keys   │
├─────────────────────────────┼────────────────────────────────────────┼────────────────────────────────┤
│ 7. Infinite Date Search on  │ Clinic marked closed 7 days a week;    │ • Max search bound of 30 days; │
│    All-Closed Clinic        │ while-loop runs indefinitely           │   throws clear ValidationEx    │
│                             │                                        │   before entering loop         │
└─────────────────────────────┴────────────────────────────────────────┴────────────────────────────────┘
```

---

### 🔍 Detailed Subsystem Impact Analysis & Mitigation Code

#### A. Database Migration Safety & Backfill Strategy
When adding `ideal_date` and `schedule_drift_days` to `appointments`, existing records must not be corrupted or left invalid:
```php
// In migration up():
Schema::table('appointments', function (Blueprint $table) {
    if (!Schema::hasColumn('appointments', 'ideal_date')) {
        $table->date('ideal_date')->nullable()->after('scheduled_date');
    }
    if (!Schema::hasColumn('appointments', 'schedule_drift_days')) {
        $table->integer('schedule_drift_days')->default(0)->after('ideal_date');
    }
    if (!Schema::hasColumn('appointments', 'schedule_adjustment_reason')) {
        $table->string('schedule_adjustment_reason', 255)->nullable()->after('schedule_drift_days');
    }
});

// Auto-backfill existing appointments to guarantee 100% data integrity:
DB::statement("
    UPDATE `appointments` 
    SET `ideal_date` = COALESCE(`scheduled_date`, `appointment_date`)
    WHERE `ideal_date` IS NULL
");
```

#### B. Clinic Seeder & Cold-Start Guard
When a new clinic registers or existing clinics are upgraded, they must have standard operating hours pre-seeded:
```php
// Auto-seed Mon-Fri 8:00 AM - 5:00 PM for all clinics lacking schedule rows:
foreach (Clinic::all() as $clinic) {
    if ($clinic->schedules()->count() === 0) {
        for ($day = 0; $day <= 6; $day++) {
            $isOpen = in_array($day, [1, 2, 3, 4, 5]); // Mon-Fri open, Sat-Sun closed
            ClinicSchedule::create([
                'clinic_id' => $clinic->id,
                'day_of_week' => $day,
                'is_open' => $isOpen,
                'open_time' => $isOpen ? '08:00:00' : null,
                'close_time' => $isOpen ? '17:00:00' : null,
                'slot_interval_minutes' => 30,
                'max_patients_per_slot' => 10,
            ]);
        }
    }
}
```

#### C. Safe Fallback in `ClinicScheduleService`
To guarantee the system **never crashes** even if the database is under maintenance or unseeded:
```php
public function isDateOpen(int $clinicId, Carbon $date): bool
{
    try {
        $dateStr = $date->toDateString();

        // Priority 1: Exception table check
        $exception = ClinicScheduleException::where('clinic_id', $clinicId)
            ->where('exception_date', $dateStr)
            ->first();

        if ($exception !== null) {
            return (bool) $exception->is_open;
        }

        // Priority 2: Weekly schedule check
        $schedule = ClinicSchedule::where('clinic_id', $clinicId)
            ->where('day_of_week', $date->dayOfWeek)
            ->first();

        if ($schedule !== null) {
            return (bool) $schedule->is_open;
        }
    } catch (\Throwable $e) {
        \Log::warning("ClinicScheduleService error on clinic {$clinicId}: " . $e->getMessage());
    }

    // Default Fail-Safe: Mon-Fri open, Sat-Sun closed
    return !in_array($date->dayOfWeek, [0, 6]);
}
```

#### D. Form 3 Vaccine Administration Isolation Guard
In `VaccinationRecordController.php`, Day 0 saving and inventory deduction are mission-critical. If auto-scheduling encounters an edge case, the Day 0 record must still succeed:
```php
try {
    $this->createFollowUpAppointments($request, $clinicId, $patientId, $biteId, $userId);
} catch (\Throwable $e) {
    \Log::error("Follow-up appointment auto-generation failed for Patient #{$patientId}: " . $e->getMessage());
    // Non-fatal: Log alert for clinic staff without failing the Form 3 dose recording
}
```

