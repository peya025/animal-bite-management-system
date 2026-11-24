# Next Steps, Audit & Follow-Up Plan (11/23/2026)

**Date:** 2026-11-23  
**Branch:** `deployment`  
**Related Plan:** [bite_cases_summary_alerts_cleanup_and_automation_plan.md](../bite_cases_summary_alerts_cleanup_and_automation_plan.md)

---

## 1. Audit Summary of Work Completed (Phases 1–4)

All four phases of the Bite Cases Summary Alerts, Cleanup, Follow-Up Supply Forecast, and Automation Plan are implemented and verified:

| Phase | Highlights | Verification |
| :--- | :--- | :--- |
| **Phase 1: Cleanup & Alert Engine** | Deleted 5 dead files; removed legacy `((Cat3×1.5 + Cat2)/Total) >= 65%` & CSOT 35/35/20/10 scores; built `ClinicalRiskAlertService` (`bcs-clinical-alerts-v1`) with normalized 7-day cluster/surge detection, unknown-location & provisional-date safeguards; fixed KPI baseline mismatch; scheduled `clinic:sync-alerts` at `07:30` Asia/Manila. | Passed |
| **Phase 2: Actionable UI & Mobile Bridge** | Added `ClinicalRiskAlertsStrip.tsx` on `/bite-cases` with 1-click triage & **Publish Advisory to Mobile** modal; added RIG safety chips & URL filter sync; fixed direct guardian/unlinked SMS recall in `EpisodeFollowupService`; added `target_barangay` migration & **"NEAR YOUR BARANGAY"** badge in mobile `AnnouncementCarousel`; added cached zero-PII `GET /api/public/community-bite-overview` + mobile `Community Bite Watch` card. | Passed (`flutter analyze` clean, `8/8` mobile widget tests) |
| **Phase 3: Follow-Up Vial Forecast** | Upgraded `SupplyPlanningService` (`bcs-phase8-supply-v2`) with per-day open-vial `ceil(doses / doses_per_vial)`, same-day Form 1/Form 2 waiting-room D0 queue, operating-day walk-in rate, brand splits + `"Unspecified / Any Active ARV"` pool, FIFO expiry cutoffs, and RIG readiness; added `GET /api/inventory/supply-forecast`, `/inventory?tab=forecast` responsive forecast table, and `/bite-cases` 7-day vial alert; wired `appointments:auto-recall` to log idempotent `Automated Recall` entries in `patient_followup_logs`. | Passed (`cold=24 queries <= 25`, `warm=0`) |
| **Phase 4: Global Pill, Triggers, 14-Day Tracking & Printouts** | Added docked **Top-Header Clinical Alert Pill** (`ClinicalAlertHeaderPill.tsx` in `DashboardLayout.tsx`) backed by cached `GET /api/cases/clinical-alerts/summary`, role filtering, 1-hour collapse/auto-wake, and event-driven Form 2 / Form 3 / Inventory / Animal Observation triggers; added `animal_observation_date` & `animal_last_checked_at` migration + `PATCH /api/cases/{id}/animal-observation` + `Day X/14` badges & inline logger; added zero-PII **Barangay / MAO Advisory Memo** & 1-page **Daily Shift Turnover Slip** printouts; rewrote `docs/BITE_CASES_SUMMARY_EXPLANATION.md`. | `36 passed` (577 assertions), `tsc -b && vite build` passed (0 errors) |

---

## 2. Immediate Priority Checklist

### A. Live Role Smoke Test (Web + Mobile)
- [ ] **Admin:**
  - Verify **Top-Header Clinical Alert Pill** appears on `/dashboard` or `/queue` when critical alerts exist, hides on `/bite-cases`, and collapses/wakes cleanly.
  - Open `/bite-cases`: verify `ClinicalRiskAlertsStrip`, **Publish Advisory to Mobile** modal, **Barangay / MAO Memo** printout, and **Export → Print Daily Shift Turnover Slip**.
  - Open `/inventory?tab=forecast`: verify 7/14/30-day open-vial forecast table, brand pool, and FIFO expiring-unused watch.
- [ ] **Doctor (`triage`):**
  - Verify header pill shows only doctor-relevant alerts (RIG Pending, Animal Died/Sick, Unassessed >48h, Day-14 Due).
  - Open an Episode Inspection Modal in `/bite-cases` and test logging a **14-Day Animal Observation** status (`healthy` / `sick` / `died`).
- [ ] **Nurse (`treatment`):**
  - Verify header pill shows nurse-relevant alerts (RIG Pending, Overdue PEP ≥3d, 7-Day Vial Shortfall, Animal Died/Sick, Day-14 Due).
  - Verify automated recall logs (`Automated Recall`) appear in `/bite-cases` Treatment tab Overdue Recall table.
- [ ] **Registration:**
  - Confirm clinical/high-risk bell alerts and the Top-Header Clinical Alert Pill remain hidden.
- [ ] **Mobile (`MenuView`):**
  - Confirm **Community Bite Watch** card renders below Quick Actions with vaccine readiness badge and 1-tap booking CTA.
  - Confirm urgent barangay announcements highlight with **NEAR YOUR BARANGAY** when the logged-in patient's barangay matches `target_barangay`.

### B. Commit Milestone Changes
- [ ] Review `git status` and commit Phase 1–4 changes on `deployment` before starting new features.

---

## 3. Recommended Quick Win: Align Main Dashboard Risk Chart

- [ ] Update `frontend/src/features/dashboard/pages/SimpleDashboardPage.tsx` (or equivalent main dashboard barangay widget) to replace legacy hardcoded static thresholds (`>= 18` / `>= 8`) with the shared backend 7-day `surge_level` (`cluster` / `surge`) or plain volume ranking.
  - **Benefit:** Ensures Dashboard, Bite Map, Bite Cases Summary, Notification Bell, and Mobile all use one consistent definition of elevated barangay activity.

---

## 4. Production / Clinic Server Rollout Checklist

- [ ] Run database migrations on staging/production:
  ```bash
  php artisan migrate --force
  ```
  - `2026_11_22_120000_add_target_barangay_to_announcements_table`
  - `2026_11_23_000100_add_animal_observation_tracking_to_bite_incidents_table`
- [ ] Verify Laravel Scheduler cron entry (`* * * * * php artisan schedule:run`) is active so daily jobs run automatically:
  - `clinic:sync-alerts` (`07:30` Asia/Manila)
  - `appointments:auto-recall` (`08:00` Asia/Manila)
  - `messaging:dispatch` (every minute)
- [ ] Verify Queue Worker (`php artisan queue:work`) and Laravel Reverb WebSocket server are running for real-time toasts and FCM push delivery.
- [ ] Rebuild and deploy frontend (`npm run build`) and mobile release build.

---

## 5. Optional Governance Feature: Snapshots & Action Register in `/reports`

> **Decision Needed:** Implement only if clinic leadership (Admin/MHO) or thesis/panel defense requires frozen historical report audit trails and in-app MRCC meeting action tracking. Skip if standard DOH exports + Barangay/MAO Memo PDF are sufficient.

### What It Provides
1. **Report Snapshots:** Saves a frozen, timestamped copy of the Bite Cases Summary for a period (`draft` → `finalized`) so back-encoded charts later do not overwrite official meeting numbers.
2. **Action Register:** Tracks Municipal Rabies Control Committee (MRCC) follow-up items (`observed_pattern`, `proposed_action`, `owner_name`, `due_date`, `status: open | in_progress | completed | deferred`), which already feed Slide 6 of Presentation Mode (`BiteCasesPresentationDialog.tsx`).

### Implementation Tasks (If Approved)
- [ ] Add a dedicated **Snapshots & Action Register** sub-tab inside `frontend/src/features/reports/` (`AdminReportsPage.tsx`) using existing backend endpoints:
  - `GET/POST /api/reports/bite-summary/snapshots` & finalize endpoint
  - `GET/POST/PATCH /api/reports/bite-summary/actions`
- [ ] Restrict snapshot finalization and action register editing to `admin` / `developer` roles.
- [ ] Verify Slide 6 of `BiteCasesPresentationDialog.tsx` cleanly displays newly created actions from `/reports`.
