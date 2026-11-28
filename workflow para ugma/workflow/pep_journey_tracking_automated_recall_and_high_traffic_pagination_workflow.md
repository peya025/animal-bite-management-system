# 💉 ABTC Workflow Specification: PEP Journey Tracking, Automated Multi-Channel Recall & High-Traffic Pagination

> **Target Area**: Treatment Desk (`/vaccinations`), Background Task Scheduler, Patient Mobile Portal  
> **Status**: Completed & Production Ready  
> **Date**: August 2026  
> **Author / Maintainer**: ABTC Engineering & Clinical Team  

---

## 🧭 1. Executive Summary & Clinical Philosophy

Rabies Post-Exposure Prophylaxis (PEP) is a time-critical, multi-dose immunological regimen:
$$\text{Day 0 (Initial)} \longrightarrow \text{Day 3} \longrightarrow \text{Day 7} \longrightarrow \text{Day 28} \quad (\pm\text{ Day 90 Booster})$$

When a patient delays or misses a scheduled dose beyond the incubation safety threshold, they face an imminent risk of rabies viral breakthrough. This workflow specification outlines the end-to-end architecture built to track patient PEP adherence, separate patient intake channels, automatically recall defaulters without manual staff effort, scale seamlessly for high-traffic clinics ($50+$ to $500+$ patients daily), and ensure that all scheduled appointments automatically respect the clinic's operating days and hours.

---

## 🗺️ 2. Core Clinical Features & Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │          CLINICAL TREATMENT DESK             │
                       │             (/vaccinations)                  │
                       └──────────────────────┬───────────────────────┘
                                              │
      ┌───────────────────────┬───────────────┴───────────────┬───────────────────────┐
      ▼                       ▼                               ▼                       ▼
┌───────────────┐     ┌───────────────┐               ┌───────────────┐       ┌───────────────┐
│ PEP Stepper   │     │ Today's Due   │               │ Online Mobile │       │ Missed Recall │
│ Master Matrix │     │ Injections    │               │ Bookings      │       │ Defaulters    │
│ (All Patients)│     │ (Due Today)   │               │ (Pre-booked)  │       │ (Overdue >1d) │
└───────────────┘     └───────────────┘               └───────────────┘       └───────┬───────┘
                                                                                      │
                                                              ┌───────────────────────┴───────────────────────┐
                                                              ▼                                               ▼
                                                    [ 1-Click Manual Recall ]                       [ Daily 8:00 AM Cron ]
                                                    (Staff on-demand alert)                         (Automated Background)
                                                              │                                               │
                                                              └───────────────────────┬───────────────────────┘
                                                                                      │
                                                                                      ▼
                                                                        ┌───────────────────────────┐
                                                                        │  MULTI-CHANNEL DISPATCH   │
                                                                        │  • 📱 SMS to Phone (09...) │
                                                                        │  • 🔔 In-App Push Alert   │
                                                                        │  • 📧 Email Advisory      │
                                                                        └───────────────────────────┘
```

---

## 📋 3. Segregated Workflow Tabs

| Tab Name | Target Audience | Clinical Purpose |
|---|---|---|
| 🗺️ **`PEP Journey Stepper`** | All active PEP patients | Provides a master 4-step visual roadmap showing completed doses (with vaccine brand and administration dates), upcoming scheduled dates, and current stage. |
| 📅 **`Today's Injections`** | Patients due today | Focused queue for staff administering injections during today's clinic hours. |
| 📱 **`Online Bookings`** | Mobile portal users | Segregated view of patients who scheduled their appointment via the mobile app. |
| ⚠️ **`Missed / Defaulter Recall`** | Overdue patients ($>1$ day late) | The clinical "Defaulter List" equipped with individual `Send Recall` and `Recall All Missed (N)` triggers. |

---

## 🕒 4. Operating Hours & Date Drift Resolution Rules (Sequential Cascade)

> [!IMPORTANT]
> **Core Principle**: Vaccine schedules are strictly constrained by the operating days and hours of the clinic. When an ideal dose date falls on a closed day, the schedule is automatically moved forward to the next open clinic day, and all subsequent follow-up doses cascade forward to maintain the mandatory clinical interval.

```
       Ideal Dose 1 (Day 0)  ────────> Administered Wed, Aug 26
               │
               ▼ (+3 days)
       Ideal Dose 2 (Day 3)  ────────> Aug 29 (Saturday CLOSED)
               │                       • Closed Sat, Sun, Mon
               ▼ (+3d drift)
       Resolved Dose 2       ────────> Tuesday, Sep 1 (OPEN)
               │
               ▼ (+4 to 7 days minimum interval cascade)
       Resolved Dose 3 (Day 7) ──────> Tuesday, Sep 8 (OPEN)  [NOT Sep 2!]
               │
               ▼ (+21 days minimum interval cascade)
       Resolved Dose 4 (Day 28) ─────> Tuesday, Sep 29 (OPEN)
```

### A. Mandatory Clinical Minimum Intervals Enforced:
1. **Day 0 $\rightarrow$ Day 3**: Minimum 3 days
2. **Day 3 $\rightarrow$ Day 7**: **Minimum 4 to 7 days** (Prevents unsafe 1-day gaps when Day 3 is shifted)
3. **Day 7 $\rightarrow$ Day 28**: **Minimum 14 to 21 days**
4. **Day 28 $\rightarrow$ Booster 1 (90)**: **Minimum 62 to 90 days**
5. **Booster 1 $\rightarrow$ Booster 2 (365)**: **Minimum 275 to 365 days**

### B. Audit Trail & Explanation Reason
Every shifted appointment stores:
- `ideal_date`: The theoretical unshifted clinical calendar target.
- `schedule_drift_days`: Exact number of days shifted (e.g. `+3`).
- `schedule_adjustment_reason`: Human-readable explanation shown on the patient's digital card and mobile calendar:  
  *`"Saturday non-operating schedule (Moved +3d to Tue, Sep 1, 2026)"`*

---

## 🤖 5. Automated Background Recall Engine

### A. Daily Cron Execution (`routes/console.php`)
```php
// Daily Automated Rabies PEP Reminders & Missed Dose Recalls at 8:00 AM
Schedule::command('appointments:auto-recall')->dailyAt('08:00');
```

### B. Smart Dispatch Logic (`AppointmentReminderService.php`)
1. **Advance 1-Day Reminders (Due Tomorrow)**:
   - Identifies appointments scheduled for tomorrow (`scheduled_date = tomorrow`).
   - Automatically dispatches friendly notice:  
     > *"ABTC REMINDER: Juan Dela Cruz, your Rabies Dose 2 is scheduled for TOMORROW, Sep 1 at Tagoloan ABTC. Hotline: 09123456789"*
2. **Urgent Defaulter Recalls (Past 1 to 14 Days Overdue)**:
   - Identifies appointments that were missed and not marked as administered.
   - Automatically dispatches urgent medical warning:  
     > *"URGENT REMINDER: Juan Dela Cruz, you missed your scheduled Rabies Vaccination on Aug 28. Rabies is 100% fatal without complete PEP. Please return to Tagoloan ABTC immediately for your catch-up dose."*
3. **Anti-Spam Safeguards**:
   - The engine automatically checks `last_reminded_at` and enforces a strict **20-hour anti-spam cool-off window** to prevent multiple alerts on the same calendar day.

---

## 🚀 6. High-Traffic Anti-Overload Architecture

When handling **50+ to 500+ daily patients**, the following mechanisms prevent browser lag, DOM bloat, and server strain:

1. **Server-Side Chunked Pagination (`TablePager`)**:
   - Patients are delivered in paginated slices (default **10 records per page**, selectable up to **25** or **50**).
   - Only the active page is rendered in the DOM, keeping network payloads under $20\text{ KB}$.
2. **300ms Debounced Search**:
   - Keystrokes in the search bar are buffered for 300ms before sending query parameters to the backend, ensuring zero typing lag.
3. **Query-Level Tab Isolation**:
   - Switching tabs queries the backend specifically for that subset (`status=due_today`, `status=overdue_missed`, or `channel=online`) and resets page state to Page 1.

---

## 🎨 7. UI Design System & Hugeicons Standard

- **100% Vector Icons (Emoji-Free)**:
  - All text emojis have been replaced with standard vector icons from `@hugeicons/core-free-icons` (`Medicine01Icon`, `Calendar03Icon`, `SmartPhone01Icon`, `AlertCircleIcon`, `FlashIcon`, `Megaphone01Icon`, `MailSend01Icon`, `UserMultiple02Icon`, etc.).
- **ABTC Emerald Theme Consistency**:
  - Matched color tokens (`#047857`, `#f0fdf4`, `#bbf7d0`, `#e2e8f0`) to maintain brand consistency across Registration, Doctor Triage, and Nurse Treatment desks.

---

## 📝 8. Release & Commit Summary

```text
feat(vaccinations): implement PEP journey stepper matrix, automated missed recall & high-traffic pagination

- Add visual 4-stage PEP dose stepper matrix (Day 0 -> Day 3 -> Day 7 -> Day 28) with live progress tracking
- Implement sequential cascade interval scheduling ensuring vaccine appointments shift to open clinic operating days while maintaining mandatory WHO minimum gaps
- Implement multi-channel recall engine (SMS, Email, and In-App Push) with audit logging in appointment_reminders table
- Add automated daily background scheduler (php artisan appointments:auto-recall) running at 8:00 AM for advance reminders and missed recalls
- Add dedicated navigation tabs: PEP Stepper Matrix, Today's Injections, Online Bookings, and Missed / Defaulter Recall
- Implement server-side chunked pagination (TablePager: 10, 25, 50 rows) and 300ms debounced search to prevent page overload on 50+ daily cases
- Overhaul UI design with @hugeicons/core-free-icons (100% emoji-free) and standard ABTC Emerald theme consistency
- Upgrade Mobile Clinic Information hub with live Open/Closed badge and interactive 7-day schedule modal
```
