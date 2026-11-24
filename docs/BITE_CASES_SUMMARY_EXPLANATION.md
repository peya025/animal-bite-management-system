# Bite Cases Summary — Clinical Risk Alerts, Surveillance & Supply Guide

**Rule Versions:** `ClinicalRiskAlertService` (`bcs-clinical-alerts-v1`) · `SupplyPlanningService` (`bcs-phase8-supply-v2`)  
**Updated:** 2026-11-23  
**Scope:** `/bite-cases` (Operational Triage), Top-Header Clinical Alert Pill, `/inventory?tab=forecast`, `/reports`, and Mobile Home Page (`Community Bite Watch`).

---

## 1. Purpose & Architectural Separation

The **Bite Cases Summary** (`/bite-cases`) is the clinic's **daily operational nerve center**. It replaces opaque composite risk formulas (the retired CSOT 35/35/20/10 index and the legacy `((Cat3×1.5 + Cat2)/Total) >= 65%` single-case ratio) with **evidence-based DOH NRPCP clinical safety rules**:

- **`/bite-cases` (Operational Triage):** Real-time patient-safety alerts (RIG Pending, Overdue PEP Follow-Ups, Dead/Sick Biting Animals, 7-Day Barangay Surges, 7-Day Vial Readiness, 14-Day Animal Observation Tracking, and Daily Shift Turnover Slip).
- **`/inventory?tab=forecast` (Cold-Chain Supply Planner):** Per-day open-vial (`ceil`) follow-up vial projections, same-day waiting-room D0 demand, brand pools, and FIFO batch expiry cutoffs.
- **`/reports` (Administrative & Regulatory):** Official DOH Monthly, Quarterly Cohort, Exposure Registry, and A4 Committee Meeting Packs.

---

## 2. Clinical Risk Alert Rules (Zero Alert Fatigue)

Every alert must be **actionable today**, provide a **1-click triage path**, and **auto-resolve** once fixed:

| Alert | Severity | Trigger Rule | Resolution Path |
| :--- | :--- | :--- | :--- |
| **1. RIG Pending (Category III / Indicated)** | Red (Critical) | Finalized Category III with active PEP or clinician-ordered RIG and **0 verified ERIG/HRIG records** (urgent badge when `≤ 48h` elapsed). | Auto-clears when Form 3 records RIG administration or external referral. |
| **2. Overdue PEP Follow-Ups** | Red (`≥ 3d`) / Amber (`1–2d`) | Scheduled/required follow-up dose `≥ 1 day` past due as of cutoff. | Auto-clears on Form 3 dose recording, reschedule, or discontinuation. Includes unified `Automated Recall` + nurse SMS/call logs. |
| **3. Biting Animal Died / Sick** | Red (`died`) / Amber (`sick`) | Active episode with `animal_observation_status = died` or `sick`. | Auto-clears when full PEP + RIG is completed or episode is closed/transferred. |
| **4. 7-Day Follow-Up Vial Shortfall** | Red (`shortfall`) / Amber (`tight` / `expiring`) | Usable unexpired ARV vials `<` next 7 days of per-day open-vial demand (committed follow-ups + waiting-room D0 + operating-day walk-ins), or usable RIG `<` pending Category III cases. | Auto-clears immediately on stock replenishment / adjustment. |
| **5. 7-Day Barangay Cluster / Surge** | Red (`cluster`) / Amber (`surge`) | **Cluster:** `≥ 3` verified exposures OR `≥ 2` finalized Cat III in the same normalized barangay within 7 days. **Surge:** `≥ 2` verified exposures in 7d AND `≥ 2.0×` prior 30-day weekly average. | Auto-clears when the 7-day rolling window drops below threshold. |
| **6. Workflow & Data Completeness** | Amber (Warning) | Form 1 unassessed `> 48h`, finalized Form 2 missing WHO Category I–III, or `≥ 20%` (`≥ 3`) recent exposures missing place of incident. | Auto-clears when charts are finalized or locations are encoded. |

---

## 3. Global Visibility Without Clutter (Top-Header Pill & Live Toasts)

- **Top-Header Clinical Alert Pill** (`ClinicalAlertHeaderPill.tsx` in `DashboardLayout`):
  - Appears on every page **except** `/bite-cases` (where the full `ClinicalRiskAlertsStrip` is already mounted) and hides completely when there are zero relevant alerts.
  - Strictly **role-filtered** (Doctor: RIG Pending, Animal Died/Sick, Unassessed >48h, Day-14 Due; Nurse: RIG Pending, Overdue ≥3d, 7d Vial Shortfall, Animal Died/Sick, Day-14 Due; Admin: 7d Vial Shortfall, Barangay Clusters, RIG Pending; Registration: hidden).
  - Supports **1-hour collapse/snooze** into a quiet indicator dot that **automatically re-expands** if a new critical alert arrives.
- **Event-Driven Real-Time Safety Triggers + Morning Readiness Sync:**
  - Form 2 saves, Form 3 administrations, animal observation updates, and inventory stock changes immediately run targeted safety syncs and broadcast critical alerts (`rig_pending`, `animal_risk`, `vial_shortfall_7d`) over Laravel Reverb/Echo for non-blocking live toasts.
  - `php artisan clinic:sync-alerts` runs daily at **07:30 AM Asia/Manila** before clinic opening, and `appointments:auto-recall` runs at **08:00 AM** while writing idempotent `Automated Recall` entries into `patient_followup_logs`.

---

## 4. Unknown, Unassessed & Incomplete Case Safeguards

- **Place of Incident = `Unknown` / `Place not recorded`:** Strictly **excluded** from barangay cluster/surge detection and mobile advisories; **never** falls back to the patient's home address. Instead surfaces a quiet staff-only Data Completeness warning when missing locations exceed threshold.
- **Provisional / Unknown Exposure Date:** Strictly excluded from 7-day rolling surge windows and exposure-date cohorts.
- **Unassessed Category (`Form 1 Only`):** Never auto-assigned to Category I/II/III. Included transparently in 7-day total barangay volume (excluded from Cat III-only cluster rules), escalated if waiting `> 48h`, and included in today's same-day D0 vial readiness estimate.
- **Unknown Vaccine Brand on Scheduled Follow-Ups:** Retained in an **"Unspecified / Any Active ARV"** pool so total daily vial counts never undercount demand.

---

## 5. Follow-Up-Driven Supply & Open-Vial Math (`SupplyPlanningService`)

Because reconstituted intradermal (ID) rabies vaccine vials must be discarded within **6–8 hours** (cannot carry half a vial to the next clinic day), vial demand is computed **per clinic day**:

```text
For each clinic day d in [Today .. Today + Horizon]:
  Total_Expected_Doses(d) = Committed_Followups(d) + Expected_Walkin_D0(d)
  Vials_Needed(d)         = sum_by_brand( ceil(Brand_Doses(d) / Brand_Doses_Per_Vial) )
                            + ceil( max(0, Unspecified_And_Walkin(d) - Open_Vial_Spare(d)) / Effective_Doses_Per_Vial )
```

- **Same-Day Waiting Queue (Day 0):** Incorporates 100% of active Form 2 prescribed-unstarted patients plus today's Form 1 unassessed registrations weighted by the 30-day historical PEP initiation rate.
- **FIFO Batch Expiry Cutoffs:** Deducts daily vials from unexpired batches in FIFO order (`expiration_date ASC`); any batch whose `expiration_date < d` is excluded starting on day `d` and flagged under **FIFO Expiring-Before-Use Batches**.
- **RIG Readiness:** Compares usable unexpired RIG stock against immediate pending Category III / RIG-indicated episodes plus 7-day projected Category III presentations.

---

## 6. 14-Day Biting Animal Observation Tracking

- **Owned / Domestic Pets:** Tracks `Day X/14 Observing`, flags **Day-14 Observation Check Due** during Days 14–21 if condition is still unknown, and displays a **DOH Day-14 Clinical Note** for attending physician discontinuation review **only** when verified healthy at Day 14+.
- **Stray / Wild / Unobservable Animals:** Explicitly tagged **`Stray / Unobservable — Full PEP Required`** (never prompts early discontinuation).
- Staff can log `Healthy`, `Sick`, `Died`, or `Unknown` directly from the Episode Inspection Modal (`PATCH /api/cases/{id}/animal-observation`), recording `animal_observation_date` and `animal_last_checked_at`.

---

## 7. Public-Health Communication & Operational Printouts

1. **Web-to-Mobile Advisory Bridge (Human-in-the-Loop):** Surging barangay cards include a 1-click **Publish Advisory to Mobile** modal (pre-filled Cebuano/English guidance, `is_urgent: true`, `target_barangay`, 7-day auto-expiry, FCM push). The mobile home page (`MenuView`) pairs this with a cached, zero-PII **Community Bite Watch** card (`GET /api/public/community-bite-overview`) enforcing `<5` small-cell suppression.
2. **1-Click Barangay / MAO Advisory Memo (`GET /api/print/reports/barangay-advisory-memo`):** Aggregate-only A4 memorandum addressed to the Punong Barangay and Municipal Agriculture Office with RA 10173 privacy notice and facility-based surveillance disclaimer.
3. **1-Page Daily Shift Turnover Slip (`GET /api/print/reports/daily-turnover`):** Internal handover sheet summarizing today's Form 1/2/3 volumes, unadministered RIG & dead/sick animal endorsement lists, vials opened vs discarded today, and tomorrow's scheduled follow-ups + ARV vials to prepare.
