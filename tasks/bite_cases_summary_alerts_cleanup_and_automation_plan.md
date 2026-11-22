# Bite Cases Summary: Clinical Risk Alerts, Cleanup & Automation Plan

**Document Version:** 1.0.0  
**Created:** 2026-11-22  
**Related Plan:** [bite_cases_summary_enhancement_plan.md](./bite_cases_summary_enhancement_plan.md)  
**Target Modules:** Bite Cases Summary (`/bite-cases`), Notification Bell (`NotificationService`), Inventory Supply Planning (`SupplyPlanningService`), Reports (`/reports`)  

---

## 1. Purpose & Architectural Direction

The **Bite Cases Summary** module has evolved through several iterations (CSOT risk scoring → DOH 3-form reconciliation → conference snapshots/planning → UI simplification). As a result, the codebase currently has **four conflicting "risk" definitions**, **dead/orphaned planning components**, **noisy false-positive area alerts**, and **real clinical risks hidden inside collapsed accordions**.

To make Bite Cases Summary genuinely useful for daily clinic operations and sustainable for the future of the clinic, this plan defines:
1. **What to remove and clean up** (dead code, conflicting formulas, wasted queries).
2. **A decisive alert strategy** — solving alert fatigue by separating **life-safety clinical alerts** from **noise**.
3. **Follow-up-driven vaccine & RIG supply projections** — calculating expected vials directly from scheduled follow-up appointments and open-vial rules.
4. **Practical clinic automations** that reduce manual checking for nurses, doctors, and admins.

### Core Separation Rule
* **`/bite-cases` (Operational Nerve Center):** Fast, daily clinical triage and real-time risk alerts. Answers: *Who needs RIG right now? Who missed their follow-up shot? Which biting animal died? Do we have enough vials for this week's scheduled follow-ups? Is a barangay surging this week?*
* **`/reports` (Administrative & Regulatory):** Official DOH Monthly/Quarterly/Cohort submissions, immutable **Snapshots**, **Action Register**, **30-Day Reorder Simulator**, and **2-Page A4 Committee Meeting Packs**.

---

## 2. Solving the Alert Dilemma: What Alerts Should Exist?

When deciding what to alert on, every alert must pass **The 3-Question Clinic Alert Test**:
1. **Actionable today?** Does a nurse, doctor, or admin need to *do something* because of this alert?
2. **One-click resolution path?** Can staff click the alert and land directly on the exact patient(s), batch, or barangay?
3. **Auto-resolves when fixed?** Does the alert disappear automatically once the dose, RIG, assessment, or restock is recorded?

> **Key Principle:** Never fire noisy alerts for static percentages or single cases. Reserve **Red (Critical)** strictly for rabies mortality risks (missing RIG, dead/sick biting animal, severely overdue PEP, depleted stock) and **Amber (Warning)** for operational bottlenecks and emerging clusters.

### 2.1 Recommended Alert Architecture (Keep, Redesign, Remove)

| Alert Type | Decision | Severity | Trigger Rule | Where It Appears | Auto-Resolves When |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **1. Cat III / RIG Pending** | **ADD (Critical)** | 🔴 Red | Category III or clinician-ordered RIG with **0 verified RIG recorded**; urgent badge if `≤ 48 hrs` from consultation/exposure | Top of `/bite-cases` + Bell (for Doctor/Nurse) + Drill-down chip | Form 3 RIG administered or documented external referral/refusal |
| **2. Overdue PEP Follow-Ups** | **KEEP & ELEVATE** | 🔴 Red (`≥3d`) / 🟡 Amber (`1–2d`) | Scheduled/required dose `≥ 1 day` past due as of today | Top of `/bite-cases` (links to Treatment Recall table) + Bell | Dose administered, rescheduled, or course discontinued/transferred |
| **3. Biting Animal Died / Sick** | **ADD (Critical)** | 🔴 Red | `animal_observation_status` = `died` or `sick` (especially with incomplete PEP or missing RIG) | Top of `/bite-cases` + Episode Drill-Down chip + Bell (Doctor/Nurse) | Full PEP + RIG verified or clinical review acknowledged |
| **4. Follow-Up Vial Shortfall & Stockout** | **UPGRADE** | 🔴 Red (`<7d` or shortfall) / 🟡 Amber (`<14d` or expiring `≤30d`) | Usable unexpired ARV/RIG vials `<` **committed next-7-day follow-up vials + walk-in buffer** | Top of `/bite-cases` (compact banner) + Inventory + Bell (Admin/Nurse) | New stock received / batch replenished |
| **5. Workflow Bottlenecks (Form 1→2→3)** | **KEEP (Triage Strip)** | 🟡 Amber | Form 1 Awaiting Assessment (`>0`), Form 2 Prescribed PEP with No Admin (`>0`), or Unresolved Review `>30 days` | Top of `/bite-cases` + Progression cards (NOT bell spam) | Doctor finalizes Form 2 / Nurse records Form 3 |
| **6. Barangay 7-Day Surge / Cluster** | **REDESIGN** | 🟡 Amber (Surge) / 🔴 Red (Cluster) | **Cluster:** `≥ 3` verified cases in 7 days in same normalized barangay (or `≥ 2` Cat III in 7d). **Surge:** 7d cases `≥ 2.0×` prior 30d weekly avg AND `≥ 2` cases | `/bite-cases` Barangay card badge + Bell (Admin/MHO only) + Bite Map | 7-day rolling window drops below threshold |
| **Old `((Cat3*1.5 + Cat2)/Total)*100 >= 65%`** | **REMOVE** | ❌ Delete | Fires High Risk (`100%–150%`) on a **single Cat II or Cat III bite** and groups by raw `bite_place` | Currently in `NotificationService` & `BiteCaseService` | **Eliminate completely** |
| **Legacy CSOT 4-Factor Score (35/35/20/10)** | **REMOVE** | ❌ Delete | Opaque composite index (`computePriorityBreakdown`), unused in active UI | Dead `ExplainabilityModal` & `BiteCasesPlanningTab` | **Eliminate completely** |
| **Dashboard Hardcoded `>=18 / >=8` Risk** | **REPLACE** | ❌ Replace | Arbitrary static counts in `SimpleDashboardPage.tsx` | Main Dashboard chart | Replace with shared backend Cluster/Surge status or simple volume ranking |
| **Static #1 Barangay "Hotspot" Tag** | **REFINE** | ⚠️ Narrow | Currently tags rank #1 as "Hotspot" even if it has only 1 case | `BiteCasesOverviewTab.tsx` | Only show `Surge` / `Cluster` badge when actual threshold is met (or label rank #1 simply as `Highest volume`) |

### 2.2 Where Each Alert Should Live (Anti-Fatigue Rule)
* **In-Page Clinical Alert Strip (Top of `/bite-cases` Overview):** Shows live counters for the 5 operational risks (RIG Pending, Overdue PEP, Animal Died/Sick, Awaiting Assessment/Admin, 7-Day Vial Shortfall / Barangay Cluster). **Zero clutter when zero:** if a risk count is `0`, collapse it into a quiet "All clear" summary rather than showing empty red boxes.
* **Notification Bell (Push/Broadcast):** Strictly reserve bell notifications for **real-time or daily events that require immediate awareness** (New RIG Pending > 4h, Animal Reported Died, Overdue Dose, Stock Shortfall / Low Stock / Expiry, Barangay 7-Day Cluster). Do **not** spam the bell with routine Form 1 waiting counts (those belong in Queue & Overview).
* **Role Filtering on Alerts:**
  * **Triage / Doctor:** RIG Pending, Animal Died/Sick, Form 1 Awaiting Assessment.
  * **Treatment Nurse:** Overdue PEP Follow-Ups, RIG Pending, Prescribed Not Started, Today's/7-Day Vial Readiness.
  * **Admin / MHO:** Stockout/Expiry, Barangay 7-Day Cluster/Surge, Overdue Backlog Summary, >30-Day Stale Reviews.
  * **Registration:** No clinical/inventory bell alerts; sees basic overview metrics only.

---

### 2.3 Handling Unknown, Unassessed & Incomplete Cases (Critical Edge-Case Rules)

Incomplete or unknown records are normal in a busy ABTC (e.g., walk-ins registered in Form 1 waiting for the doctor, patients unsure where they were bitten, or stray animals with unknown condition). Alerts, mobile advisories, and supply projections **must handle them explicitly** so they never trigger fake alerts *and* never silently hide real risk:

| Incomplete / Unknown State | Clinical Risk Alerts (`/bite-cases` & Bell) | 7-Day Barangay Surge & Mobile Home Page | Supply / Vial Projections |
| :--- | :--- | :--- | :--- |
| **Place of Incident = `Place not recorded` / `Unknown`** | **Never fire a High-Risk Area alert for `Unknown`.** Instead, if `≥ 20%` of recent 7–30d cases (or `≥ 3` cases) lack a location, show a quiet amber **Data Completeness notice** on `/bite-cases` (*"X recent cases have no place recorded — surge detection may undercount affected barangays"* with 1-click `[Review records]`). | **Strictly excluded** from barangay surge/cluster detection and **never displayed** on the mobile home page. **Do not** silently fall back to patient's home address for surge detection (a resident bitten outside their barangay should not falsely flag their home barangay). | Unaffected (vial demand is clinic-wide, not barangay-dependent). |
| **Unassessed Category (`Form 1 Only / Not Yet Assessed`)** | **Do not auto-assign Cat I/II/III.** Escalate by age: **Today** = normal waiting queue (`Awaiting assessment`); **> 24–48h old** = 🟡/🔴 **Stale Unassessed Triage Alert** (could be a Cat III needing RIG inside the 48h window!); **> 30d** = Admin chart cleanup backlog. | **Include verified Form 1 episodes** (with known `bite_date` + known normalized barangay) in **total 7-day volume** surge checks so outbreaks aren't delayed by charting lag — label transparently (*"5 cases in 7d: 3 Cat III, 2 awaiting assessment"*). **Exclude** unassessed cases from the Cat III-only cluster trigger (`≥ 2 Cat III`). Never leak unassessed counts to mobile. | **Include today's Form 1 waiting patients** (plus Form 2 prescribed not started) in **today's immediate D0 vial demand** (e.g., conservatively 100% of Form 2 prescribed + historical PEP-initiation rate on Form 1 queue) so waiting-room surges are reflected in live vial readiness. |
| **Assessed, Category Missing** (Form 2 finalized, no Cat I–III) | Flag as 🟡 **Doctor Documentation Gap** (1-click filter to `severity=assessed_category_missing`) because missing category breaks DOH Monthly/Cohort reporting and masks potential RIG indication. | Counted in total 7-day volume if location & date are known; excluded from Cat III trigger. | Included in Form 2 prescribed count if a treatment plan exists. |
| **Provisional / Unknown Exposure Date** (`bite_date_is_provisional = true` or `null`) | Keep visible as a small amber pill (`X provisional date`) with 1-click drill-down so triage verifies the true exposure date. | **Strictly excluded** from 7-day rolling surge/cluster windows and exposure-date cohort rates (cannot tell if exposure happened yesterday or months ago). | Unaffected if follow-up appointments are scheduled. |
| **Animal Condition / Ownership = `Unknown` or `Not recorded`** | Do **not** spam red alerts for every `unknown` animal. Reserve 🔴 **Red** for `died` / `sick`. For **owned/domestic** pets still `unknown` at Day 14, show a 🟡 **Day-14 Observation Check** prompt. For **stray/unobservable**, tag clearly (*"Stray — full PEP required, do not discontinue early"*). | Never shown as a mobile alarm. | Unaffected (full PEP schedule already drives scheduled follow-up vials). |
| **Scheduled Follow-Up With Unknown Vaccine Brand** | No alert needed. | Not applicable. | Never drop from vial count — place in an **"Unspecified / Any Active ARV"** pool so total daily ARV vials remain accurate. |

---

## 3. Codebase Cleanup Plan (What to Remove & Fix)

### 3.1 Files to Delete
| File | Why It Is Unnecessary |
| :--- | :--- |
| `frontend/src/features/bite-cases/pages/BiteCaseRiskDashboard.backup.tsx` | ~3,300-line obsolete backup file committed to the repo; never imported. |
| `frontend/src/features/reports/services/biteSummaryService.ts` | Unused frontend API wrapper; never imported anywhere in `frontend/src`. |

### 3.2 Dead / Orphaned Code to Clean Up
1. **Resolve Orphaned `BiteCasesPlanningTab.tsx` (1,170 lines):**
   * Currently imported in `BiteCaseRiskDashboard.tsx` (line 51) and **never rendered**.
   * **Action:** Move Snapshots (`BCS-06.1`), Action Register (`BCS-06.3`), and the 30-Day Supply Reorder Simulator into `/reports` (`AdminReportsPage.tsx` under a dedicated **Planning & Snapshots** or **DOH / Program Review** sub-tab), OR delete it if not needed by the clinic.
   * Remove the dead state, handlers, and mount-time API calls from `BiteCaseRiskDashboard.tsx`:
     * Stop calling `GET /reports/bite-summary/snapshots` and `GET /reports/bite-summary/actions` on every `/bite-cases` page load (unless Presentation Mode / Meeting Pack is opened).
     * Remove unused `handleSaveSnapshot`, `handleFinalizeSnapshot`, `handleCreateAction`, `handleUpdateActionStatus`, `sortedLocations`, `optionalColumns`, `toggleOptionalColumn`, `handleSort`, and `exportLocationsToCsv` import.
     * Remove `ExplainabilityModal` (currently unreachable except via `?location=` URL param) and `computePriorityBreakdown` / `priorityConfig` from `biteCasesSummary.types.ts`.
   * Fix `BiteCasesPresentationDialog.tsx` (line 623) which still tells users to *"Add action items in the 'Planning & Actions' tab"* — either update the link to `/reports` or remove the dead reference.
2. **Remove Unused `risk_score` / `risk_level` / `risk_alerts` Legacy Payloads:**
   * Remove `((cat3 * 1.5) + cat2) / total * 100` from `BiteCaseService.php` (lines 575–576) and `NotificationService.php` (lines 556–560).
   * Replace `risk_alerts` in `BiteCaseService.php` (lines 1125–1128) with the structured **Clinical Risk Alerts** payload (RIG pending, overdue, dead/sick animals, 7-day barangay surge/clusters, 7-day vial readiness).
   * Update `biteCaseUtils.ts` (`exportLocationsToCsv` & `DEFAULT_VISIBLE_COLUMNS`) to drop the broken `Risk Score` / `Risk Level` columns.
3. **Deduplicate Backend Reporting Calls:**
   * `BiteCaseService::getLocationRiskSummary()` currently runs full `SupplyPlanningService::computePlanningProjections()` + prior-period queries on **every keystroke/filter change** with **zero caching**.
   * **Action:** Separate lightweight **Operational Triage Summary + Clinical Alerts** (cached 30–60s, invalidated on bite/treatment/inventory write) from heavy **Committee Meeting Pack** calculations (`ReportingMetricService` + `MeetingReportService`).
4. **Update Outdated Documentation:**
   * Retire or rewrite `docs/BITE_CASES_SUMMARY_EXPLANATION.md` (currently documents the obsolete CSOT 35/35/20/10 formula) so thesis/panel/DOH documentation matches the actual evidence-based clinical alerts and 7-day surge detection.

### 3.3 Concrete Bugs to Fix During Cleanup
1. **Headline KPI Filter Mismatch (`BiteCaseRiskDashboard.tsx:1068-1101`):**
   * Card 2 (`Category III Exposures`) reads `doh?.categories.III` (filtered) divided by `finalizedCount` (unfiltered baseline `activeDoh`), and Card 4 reads `doh?.completion_and_outcomes.immature_courses` (filtered) while the rest of Card 4 uses `activeDoh`.
   * **Fix:** Consistently use `activeDoh` for all 4 headline KPI cards (or show an explicit "Filtered view" indicator on all 4 consistently).
2. **Ignored `overdueEpisodesCount` Prop (`BiteCasesOverviewTab.tsx:43, 438-452`):**
   * Passed from `BiteCaseRiskDashboard.tsx` but never destructured or displayed on Overview.
   * **Fix:** Wire it directly into the top **Clinical Risk Alerts** strip with 1-click navigation to the Treatment tab's Overdue Recall list.
3. **Synchronous Alert Sync on Every Bell Fetch (`NotificationService.php:694`):**
   * Every time any staff member opens the notification bell, `getNotificationsForUser()` synchronously runs `syncActiveAlerts()` across inventory, expiry, overdue appointments, and bite incidents.
   * **Fix:** Move `syncActiveAlerts()` into a scheduled Artisan command (`clinic:sync-alerts`) + targeted event hooks (or throttle with a 5-minute cache lock per clinic) so the notification bell is instant and never blocks requests.
4. **SMS Recall Fallback Limitation (`EpisodeFollowupService.php:176-204`):**
   * Currently only dispatches carrier SMS if an overdue `Appointment` record exists **and** the recipient matches `patient->contact_number`. Sending to a guardian's emergency number or an episode without a linked appointment silently degrades to `logged_only`.
   * **Fix:** Allow direct SMS gateway dispatch for verified guardian numbers and overdue episodes even when no `Appointment` row exists, while still logging to `patient_followup_logs`.
5. **URL Filter State Persistence (`BiteCaseRiskDashboard.tsx`):**
   * Currently `useSearchParams` is read-only. Syncing `?tab=cases&status=rig_pending` to URL params enables bookmarking, browser back-button support, and deep-linking directly from Notification Bell alerts.

---

## 4. Supply Projections Tied to Follow-Up Schedules (Inventory & Vials)

### 4.1 What Is Currently Implemented vs. What Is Missing
`SupplyPlanningService.php` already queries upcoming appointments (`scheduled_doses_next_7d`, `14d`, `30d`) and unexpired `VaccineInventory` batches — **but it has 4 major clinical gaps:**
1. **Ignores scheduled follow-ups in the vial calculation:** Lines 129–137 fetch `dosesScheduled7d/14d/30d`, then lines 146–171 calculate required vials **only from past daily run-rate**, completely ignoring the committed follow-up calendar!
2. **Ignores per-day open-vial discard math (critical for ID regimen):**
   * Rabies vaccines used via intradermal (ID) sharing must be discarded within **6–8 hours of reconstitution** (end of clinic day). You cannot carry half a vial from Monday to Tuesday.
   * Computing `ceil(total_30d_doses / doses_per_vial)` **underestimates vials needed**. You must calculate `ceil(doses_on_day_d / doses_per_vial)` **per clinic day**!
   * *Example (2 doses/vial):* Monday = 5 follow-ups (`ceil(5/2) = 3 vials`), Tuesday = 1 follow-up (`ceil(1/2) = 1 vial`), Wednesday = 4 follow-ups (`ceil(4/2) = 2 vials`) → **6 vials needed** (not `10/2 = 5`), with **2 leftover doses** that would be wasted unless filled by walk-in Day 0 patients.
3. **Hardcodes `1.0` and `2.0` doses/vial:** `VaccineInventory` already has a `doses_per_vial` column (e.g., 1.0 mL vials like Rabipur/Speeda yield 4–5 ID visits at 0.2 mL/visit, while 0.5 mL Verorab yields 2 ID visits). The service ignores this column and ignores brand-level stock splits.
4. **Ignores RIG demand & batch expiry cutoff:** It reports total `usable_rig_vials` without comparing against currently **pending Category III `rig_unverified` patients** + recent Cat III arrival rate, and it treats a batch expiring in 4 days as if it can cover Day 14 appointments.

### 4.2 Upgraded Follow-Up Vial Projection Engine (Recommended Design)

Create/upgrade `SupplyPlanningService::buildFollowupVialSchedule(int $clinicId, int $horizonDays = 14)` to calculate **real operational vial demand** per day:

```text
For each upcoming clinic day d in [Today .. Today + 14 days]:
  1. Committed Follow-Up Doses (Day d):
     - Count scheduled/rescheduled Appointments on date d (Days 3, 7, 14, 28)
     - Optionally split by prescribed vaccine brand (from TreatmentPlan / D0 TreatmentRecord)
  2. Expected New Walk-In D0 Doses (Day d):
     - Historical average daily D0 starts over the last 30 operating days (only on clinic open days!)
  3. Total Expected Doses (Day d) = Committed_Followups(d) + Expected_New_D0(d)
  4. Expected Vials Needed (Day d):
     - Committed Only (Minimum Floor):  ceil(Committed_Followups(d) / doses_per_vial)
     - Realistic Total (With Walk-Ins): ceil(Total_Expected_Doses(d) / doses_per_vial)
     - Expected Open-Vial Leftover Doses (Wastage Risk):
       (Vials_Needed(d) * doses_per_vial) - Total_Expected_Doses(d)
  5. Expiry-Aware FIFO Stock Simulation:
     - Deduct each day's vials from active VaccineInventory batches in FIFO order (earliest expiration_date >= d).
     - Any batch whose expiration_date < d is automatically excluded for day d+.
     - Record the exact "Stockout Date" (first day usable stock drops below committed follow-ups) and "Expiring Unused Vials" (vials expiring before projected consumption).
```

#### RIG Readiness Projection (Alongside ARV)
* **Immediate RIG Demand:** Count of active Category III / RIG-indicated episodes with `rig_administration_unverified = true`.
* **Projected 7-Day RIG Demand:** Recent 30-day average weekly Category III presentations × average vials per patient (configurable default, e.g., `1–2 vials/patient` or weight-based clinic average).
* **Alert Rule:** Fire 🔴 **RIG Stock Risk** if `usable_rig_vials <= immediate_pending_rig_cases` or `< 7-day projected RIG demand`.

### 4.3 Where Follow-Up Vial Projections Should Be Shown
1. **In `/bite-cases` (Operational Alert Only — Compact):**
   * Show a **7-Day Follow-Up Vial Readiness** alert card *only when attention is needed* (or as a concise status pill in the Treatment & Follow-up tab):
     * *"Next 7 days: 24 scheduled follow-ups (~14 ARV vials needed + walk-in buffer). Current usable stock: 18 vials — **Reorder recommended** (covers ~9 days)."*
     * Clicking opens the full **Inventory Supply Forecast** view.
2. **In `/inventory` (Full Daily Vial Schedule & FIFO Planner):**
   * Add a **"Follow-Up Demand & Vial Forecast"** panel showing a **7-day / 14-day table**:
     * `Date` | `Scheduled Follow-ups (D3/D7/D28)` | `Est. Walk-in D0` | `Est. Vials Needed (ID / IM)` | `Projected Stock After Day` | `Status (OK / Tight / Shortfall)`
   * Highlight **High-Wastage Days** (e.g., *"Tuesday has only 1 scheduled follow-up — 1 vial opened with 3 unused doses; consider grouping follow-ups on Mon/Wed/Fri or scheduling recall patients on Tuesday"*).
   * Highlight **Expiring-Before-Use Batches** (batches expiring within 30 days whose quantity exceeds projected demand before expiry).
3. **In `/reports` (30-Day Reorder & LGU Procurement Pack):**
   * Keep the 30-day + configurable buffer (7/14/21/30d) reorder table for Municipal Health Officer (MHO) procurement requests.

---

## 5. High-Value Automations for the Clinic

Your backend already has a working Laravel Scheduler (`backend/routes/console.php`), FCM/Reverb broadcasting (`StaffNotificationBroadcast`), SMS/Email dispatch (`messaging:dispatch`), and automated missed-dose recall (`appointments:auto-recall`). Building on this existing foundation gives maximum clinical benefit with minimal new infrastructure:

### Automation 1: 7:30 AM Morning Clinic Readiness Sync (`clinic:sync-daily-alerts`)
Runs daily at **7:30 AM Asia/Manila** (before clinic opening at 8:00 AM) via `routes/console.php`:
* **Follow-Up Vial Check:** Calculates today's & next-7-day expected ARV/RIG vials from scheduled appointments. If usable stock won't cover the next 7 days (or today's schedule), sends a single consolidated **Morning Stock Readiness Alert** to Admin & Treatment Nurse.
* **RIG Safety Net Check:** Scans Category III / RIG-indicated episodes from the last 72 hours with no recorded RIG administration → raises/escalates 🔴 **RIG Pending Alert** to Doctor & Nurse.
* **Barangay 7-Day Surge/Cluster Check:** Runs normalized 7-day rolling cluster/surge detection → sends at most **1 alert per barangay per 7-day window** to Admin/MHO (replacing the noisy monthly `>=65%` alerts).
* **Stale Chart Auto-Flag:** Flags Form 1 or Form 2 episodes untouched for `>7 days` / `>30 days` in the summary metrics (without spamming individual bell alerts).
* **Auto-Resolution Sweep:** Marks resolved any previously active alert whose condition is now cleared (RIG recorded, overdue dose completed, stock replenished, cluster subsided).

### Automation 2: Unified Automated Recall ↔ Bite Cases Follow-Up Logs (8:00 AM)
Your `appointments:auto-recall` command already runs daily at **8:00 AM**.
* **Improvement:** Whenever `appointments:auto-recall` sends an automated SMS/email/push reminder for a missed dose, automatically write a corresponding entry to `patient_followup_logs` (with `contact_type = 'sms'`, `created_by_name = 'Automated Recall'`).
* **Clinic Benefit:** When nurses open the **Overdue Follow-up Recall Table** in `/bite-cases`, they immediately see *"Auto-SMS sent today 8:00 AM"* instead of calling or double-texting the same patient twice. Escalate only patients who remain overdue **≥ 3 days after automated SMS** for manual phone call.

### Automation 3: Event-Driven Real-Time Safety Triggers (Zero Polling Delay)
Trigger lightweight alert checks immediately on clinical write events:
* **Form 2 Saved with Category III / RIG Ordered:** Immediately adds patient to the `RIG Pending` queue/alert; auto-clears the second Form 3 records RIG administration.
* **Animal Observation Updated to `died` or `sick`:** Immediately broadcasts a 🔴 **High-Risk Animal Alert** to Doctor/Nurse so they verify full PEP + RIG completion.
* **Inventory Stock Deducted (Form 3 Administration):** Re-evaluates whether remaining ARV/RIG stock just dropped below the **Next 7 Days Committed Follow-Up Vials** threshold; fires immediate stock warning if crossed.

### Automation 4: Day-14 Animal Observation Check Prompt
* Automatically identify active episodes where `bite_date` is **14–21 days ago** and `animal_observation_status` is still `unknown` or `not_recorded` (for owned/domestic dogs & cats).
* Surface a **Day-14 Observation Due** chip on the Episode Drill-Down / Patient Profile so the nurse asks the patient on their Day 7 / Day 14 visit and logs the animal's status.
* When marked `healthy` at Day 14+, display the DOH clinical decision support note for attending physician review.

### Automation 5: 1-Click End-of-Shift / Daily Turnover Slip (Enhancement 6)
* Add a **Print Daily Turnover Slip** button directly in `/bite-cases` (1-page A4):
  * Today's Form 1 registrations, Form 2 doctor assessments, Form 3 vaccine/RIG injections.
  * Unadministered RIG list & Dead/Sick animal cases requiring shift endorsement.
  * Vials opened today vs. doses extracted vs. open-vial wastage.
  * **Tomorrow's Expected Follow-Ups** (patient count, dose breakdown D3/D7/D28, and **expected vials to prepare in the morning**).

### Automation 6: Web-to-Mobile High-Risk Area Advisory & Mobile Home Page Overview
Connects clinic surveillance directly to patients on the Flutter mobile app (`mobile/lib/views/menu_view.dart`) **without causing public panic or violating RA 10173 (Data Privacy Act)**:

#### A. Staff-Side Automated Alert ("What to do?")
When the 7-day rolling detector flags a barangay **Surge / Cluster**, the alert appears in `/bite-cases` (top Clinical Risk Alerts Strip + Barangay card) and in the Admin/MHO Notification Bell with **3 built-in 1-click actions**:
1. **View Cases / Bite Map:** Opens Episode Drill-Down filtered to that barangay (or jumps to `/bite-map`).
2. **Publish Advisory to Mobile (Human-in-the-Loop):** Opens a pre-filled **Urgent Clinic Announcement** form (`AnnouncementController`, `is_urgent: true`, auto-expires in 7 days) with safe Cebuano/English public guidance (e.g., *"Elevated animal bite reports in Brgy. [Name] this week. Keep pets leashed, avoid stray animals, wash bites immediately for 15 minutes with soap and water, and visit Tagoloan ABTC."*). One click publishes it to the mobile home page's existing `AnnouncementCarousel` and triggers existing **FCM push notifications**.
3. **Export Barangay / MAO Memo (PDF):** Generates a 1-page memorandum for the Barangay Captain and Municipal Agriculture Office (MAO) to trigger canine vaccination / stray impounding.

> **Why Human-in-the-Loop?** Never auto-push raw "High Risk" alerts directly to patients. A single encoding mistake could trigger false panic; letting an Admin/MHO review and click **Publish Advisory** keeps detection 100% automated while keeping public communication safe and accountable.

#### B. Mobile Home Page (`MenuView`) Integration
1. **Urgent Barangay Advisories (Top Hero — Existing `AnnouncementCarousel`):**
   * Reuses `GET /api/public/announcements` + FCM push notifications already built in `AnnouncementController.php`.
   * Optional enhancement: add nullable `target_barangay` to `announcements` so if a logged-in patient lives in that barangay, the mobile home screen highlights it with a *"Near your barangay"* badge.
2. **Automated "Community Bite Watch" Card (Compact, Below `QuickActionsSection`):**
   * Powered by a new cached, aggregate-only endpoint: `GET /api/public/community-bite-overview` (no patient identifiers, enforces `<5` small-cell suppression).
   * Displays calm, helpful public-health information:
     * **Areas with Elevated Bite Reports (Last 7–30d):** Only lists normalized barangays crossing the real cluster threshold (using calm wording like *"Higher bite reports in Brgy. X — stay cautious around stray animals"*; or *"No unusual bite spikes reported this week"* when clear).
     * **Clinic Vaccine Readiness Badge:** Links with existing `/api/public/vaccine-availability` so residents know vaccines are available.
     * **1-Tap "What to do if bitten" Action:** Links to first-aid guidelines and instant online booking (`BiteIntakeView`).
   * **Strict Privacy & Safety Guardrails:** Never show small counts (`<5`), exact puroks/addresses, patient details, or claim *"Rabies Outbreak Confirmed"* (clinic data tracks bite exposures, not lab-confirmed rabies).

---

## 6. Phased Implementation Roadmap

### Phase 1: Cleanup & Fix Broken Alerts (Completed — Verified 2026-11-22)
* [x] Delete `BiteCaseRiskDashboard.backup.tsx` and unused `biteSummaryService.ts` (plus unused `biteSummary.types.ts`, orphaned `BiteCasesPlanningTab.tsx`, and unused `AccessibleComponents.tsx`).
* [x] Fix KPI card baseline vs. filtered mismatch (`activeDoh` vs `doh`) in `BiteCaseRiskDashboard.tsx`.
* [x] Remove dead `BiteCasesPlanningTab` mount-time API calls & dead state from `BiteCaseRiskDashboard.tsx` (lazy-load Action Register only when Presentation Mode opens; fixed dead Slide 6 reference).
* [x] Delete legacy `((cat3 * 1.5) + cat2) / total * 100` formula and `computePriorityBreakdown` / `ExplainabilityModal`.
* [x] Build a single shared `ClinicalRiskAlertService` (backend) implementing:
  * RIG Pending (`<48h` urgent vs overdue),
  * Overdue PEP (`1–2d` vs `≥3d`),
  * Animal Died / Sick,
  * Normalized 7-Day Barangay Surge/Cluster detection (strictly excluding `Place not recorded` / `Unknown` locations and provisional exposure dates, while transparently including verified Form 1 episodes with known date + barangay in total 7-day volume),
  * Stale Unassessed (`>48h`) + `Assessed, Category Missing` + Unknown Location completeness safeguards,
  * Workflow pending counts (`awaiting_assessment`, `no_administration_recorded`, `>30d` stale).
* [x] Update `NotificationService::syncHighRiskAreaAlerts()` to use `ClinicalRiskAlertService`, hide `high_risk` alerts from `registration` role, throttle bell-fetch syncs to 5-min locks, and schedule `clinic:sync-alerts` at 07:30 AM Manila Time.

### Phase 2: Actionable Clinical Risk Alerts UI on `/bite-cases` & Mobile Advisory Bridge (Completed — Verified 2026-11-22)
* [x] Add a clean, zero-clutter **Clinical Risk Alerts Strip** (`ClinicalRiskAlertsStrip.tsx`) at the top of `BiteCasesOverviewTab.tsx` (1-click triage into Episode Drill-Down or Treatment Overdue Recall, plus quiet Data Completeness warning when recent unknown-location/unassessed gaps exceed threshold).
* [x] Add `status=rig_pending`, `status=unassessed_over_48h`, and `animal_condition=died|sick` quick filters in `BiteCaseService` / `BiteCaseRiskDashboard.tsx` and sync active `tab` + filters to URL search params.
* [x] Add Category III RIG status badges (`RIG PENDING (≤48h)`, `RIG REFERRED`, `RIG: ERIG/HRIG`) in Episode Drill-Down and Inspection Modal.
* [x] Fix `EpisodeFollowupService::sendReminder()` so verified guardian numbers and unlinked episodes can still dispatch real SMS via `SmsManager`.
* [x] Add **1-Click "Publish Advisory to Mobile"** button on surging barangay alerts in `/bite-cases` (pre-fills `AnnouncementController` with safe Cebuano/English guidance, `is_urgent: true`, 7-day expiry, and `target_barangay` for *"NEAR YOUR BARANGAY"* highlighting in mobile `AnnouncementCarousel` + FCM push).
* [x] Add cached, aggregate-only `GET /api/public/community-bite-overview` endpoint (enforcing `<5` suppression and excluding `Unknown` locations/provisional dates) and render the compact **Community Bite Watch** card on `mobile/lib/views/menu_view.dart` (below `QuickActionsSection`, paired with vaccine availability and 1-tap booking CTA).

### Phase 3: Follow-Up-Driven Vial Projections & Inventory Integration (Completed — Verified 2026-11-22)
* [x] Upgrade `SupplyPlanningService` with per-day `ceil(doses / doses_per_vial)` follow-up vial scheduling (7d & 14d), same-day Form 1/Form 2 waiting-room D0 demand + walk-in buffer, brand breakdown (with `Unspecified` fallback pool), expiry-aware FIFO coverage, and RIG pending demand check.
* [x] Add the compact **7-Day Vial Readiness** alert card to `/bite-cases` (only prominent when tight/shortfall) and the full **Daily Follow-Up Vial Forecast Table** to `/inventory`.
* [x] Wire `appointments:auto-recall` to log automated outreach in `patient_followup_logs` so nurses see full recall history in `/bite-cases`.

### Phase 4: Automations, Top-Header Alert Pill, 14-Day Animal Tracking & Daily Shift Turnover (Completed — Verified 2026-11-23)
* [x] Schedule `clinic:sync-alerts` at 7:30 AM Manila Time in `backend/routes/console.php` + event-driven triggers on Form 2/Form 3/Animal Observation/Inventory updates (`rig_pending`, `animal_risk`, `vial_shortfall_7d`) and auto-resolution sweeps.
* [x] Add docked **Top-Header Clinical Alert Pill** (`ClinicalAlertHeaderPill.tsx` in `DashboardLayout.tsx`) powered by cached `GET /api/cases/clinical-alerts/summary` with role filtering, 1-hour collapse/snooze (auto-wakes on new critical alert), and live Echo/Reverb toast integration.
* [x] Add `animal_observation_date` & `animal_last_checked_at` tracking + `PATCH /api/cases/{id}/animal-observation` + `Day X/14` chip and inline logger (owned/domestic only for Day-14 discontinuation prompt; stray/unknown clearly tagged full-PEP required).
* [x] Add 1-click **Barangay / MAO Surveillance Advisory Memo** (`GET /api/print/reports/barangay-advisory-memo`, zero PII + `<5` suppression + RA 10173 notice) on surging barangays.
* [x] Add 1-page **Daily Shift Turnover Print Slip** (`GET /api/print/reports/daily-turnover`, including tomorrow's expected follow-up patients & ARV vials to prepare).
* [x] Rewrite `docs/BITE_CASES_SUMMARY_EXPLANATION.md` to accurately document the finalized clinical alert rules, unknown-case safeguards, global header pill, mobile advisory flow, and supply math.

---

## 7. Verification Strategy

After each phase, verify zero regressions with:
1. **Backend Feature Tests:**
   * `php artisan test tests/Feature/Reports/Phase4SummaryAndReconciliationTest.php`
   * `php artisan test tests/Feature/Clinical/OverdueFollowupOutreachTest.php`
   * `php artisan test tests/Feature/NotificationBellTest.php` (update high-risk area tests to validate normalized 7-day cluster/surge thresholds, verify `Unknown`/blank `bite_place` and provisional dates never trigger surge alerts, and verify single Cat II/III cases don't false-fire)
   * `php artisan test tests/Feature/Reports/Phase8AdvancedPlanningAndSupplyScenariosTest.php` (add tests for per-day `ceil()` follow-up vial projection, same-day unassessed waiting-room buffer, and expiry-aware FIFO stockout dates)
   * Add feature test for `GET /api/public/community-bite-overview` (verifies zero PII, `<5` suppression, exclusion of `Unknown` barangays and provisional dates).
2. **Frontend & Mobile Build Checks:**
   * `npm run build` (`tsc -b && vite build`) in `frontend/`
   * `flutter test` in `mobile/` (verify `MenuView` renders `AnnouncementCarousel` + `Community Bite Watch` cleanly in both active-caution and all-clear states).
3. **Clinic Workflow Smoke Check:**
   * Verify 1 single Cat II/III bite in a barangay does **not** trigger a false High-Risk Area alert.
   * Verify 5 cases with blank/`Unknown` `bite_place` never create an `"Unknown"` surge alert or appear on mobile, and instead trigger the staff-only Data Completeness warning.
   * Verify an unassessed Form 1 patient waiting `>48h` surfaces as a triage warning without polluting Category I/II/III denominators.
   * Verify recording RIG in Form 3 immediately clears the `RIG Pending` alert.
   * Verify clicking **Publish Advisory to Mobile** on a surging barangay posts an urgent announcement visible in mobile `MenuView` and sends FCM push.
   * Verify a scheduled follow-up spike next week immediately updates the **Expected Vials Needed** and triggers a shortfall warning if stock is insufficient.
