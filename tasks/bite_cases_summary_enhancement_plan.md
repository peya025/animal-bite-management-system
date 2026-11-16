# Comprehensive Enhancement Plan: Bite Cases Summary & Clinical Operations Dashboard

**Document Version:** 1.0.0  
**Status:** Approved / Ready for Implementation  
**Target Module:** Bite Cases Summary (`/bite-cases`) & Clinical Reporting Engine  
**System Usability Scale (SUS) Target:** ≥ 85 (Grade A / Excellent)  
**Applicable Regulations:** DOH National Rabies Prevention and Control Program (NRPCP) Guidelines  

---

## 1. Executive Summary

### 1.1 Context & Problem Statement
The **Bite Cases Summary** dashboard serves as the operational nerve center for the Tagoloan Animal Bite Treatment Center (ABTC). Following an initial audit and layout cleanup, the dashboard was streamlined from a cluttered, redundant interface into a focused, three-stage clinical workflow tool:
* **Form 1:** Patient Registration & Exposure Intake
* **Form 2:** Medical Officer Assessment & Category Classification
* **Form 3:** Nurse Administration & Vaccine/RIG Inoculation

To further elevate the dashboard from a purely observational tool to a **high-efficiency clinical action hub**, this comprehensive plan outlines six high-impact enhancements. These enhancements directly reduce clinician workload, eliminate patient dropouts between Day 0 and Day 7, accelerate outbreak containment in Tagoloan barangays, and maintain strict alignment with DOH rabies eradication standards.

### 1.2 Core Architectural Principle: Operational vs. Administrative Separation
* **Bite Cases Summary (`/bite-cases`):** Dedicated exclusively to **daily patient flow and clinical triage**. Answers immediate operational questions: *Who is waiting for the doctor? Who missed their Day 7 shot today? Which barangay has an active stray pack this week?*
* **Reports & Analytics (`/reports`):** Dedicated strictly to **administrative, archival, and regulatory compliance**. Handles official DOH Quarterly/Annual packs, provincial health consolidations, and vaccine stock logistics.

---

## 2. Baseline Architecture & Current State

```
+----------------------------------------------------------------------------------------------------+
|                                    BITE CASES SUMMARY DASHBOARD                                    |
+----------------------------------------------------------------------------------------------------+
|  [Filter Bar: Date Range (This Month, All Dates) | Barangay Filter | Search Episode / Patient]     |
+----------------------------------------------------------------------------------------------------+
|  [KPI 1: Recorded Exposures]  [KPI 2: Category III]  [KPI 3: PEP Started]  [KPI 4: PEP Completion] |
+----------------------------------------------------------------------------------------------------+
|  [Tab 1: Overview]         |  [Tab 2: Treatment & Follow-up]  |  [Tab 3: Episode Drill-Down]       |
|  - Key Findings Alerts     |  - Vaccine Dose Matrix (0-28)    |  - Paginated Episodes (25/page)   |
|  - 3-Form Progression Bar  |  - Overdue / Missed Dose Flags   |  - Full 3-Form Inspection Dialog   |
|  - Place of Incident List  |  - Adherence Rates               |  - Export CSV Filtered Registry    |
|  - Exposure & Demographics |                                  |                                    |
+----------------------------------------------------------------------------------------------------+
```

### Current Strengths:
1. **Headline Stability:** Total caseload KPIs remain anchored to the reporting cohort period regardless of secondary search/barangay filters.
2. **Geographic Integrity:** Legitimate Tagoloan barangays are accurately ranked by volume and severity, while unrecorded intake locations are cleanly quarantined as `Place not recorded` rather than falsely crowned as hotspots.
3. **Infinite Scalability:** 25-row pagination in the drill-down prevents UI freezing as multi-year caseloads expand.

---

## 3. High-Value Clinical Enhancements

```
+---------------------------------------------------------------------------------------+
|                                ENHANCEMENT ROADMAP                                    |
+---------------------------------------------------------------------------------------+
|  Phase 1: Instant Clinical Triage (Click-to-Filter Action Badges)                     |
|  Phase 2: Lost-to-Follow-up Prevention (One-Click Contact & SMS Dispatch)             |
|  Phase 3: High-Risk Life Safety (Category III RIG Urgency Flagging)                   |
|  Phase 4: DOH Compliance & Public Health (14-Day Biting Animal Observation)           |
|  Phase 5: Early Outbreak Detection (Barangay Rolling 7-Day Surge Alerts)              |
|  Phase 6: Shift Continuity (1-Page End-of-Shift / Daily Turnover Slip)                |
+---------------------------------------------------------------------------------------+
```

---

### Enhancement 1: 1-Click Triage Action Badges (Key Findings Navigation)

#### 1. Objective
Eliminate manual filter selection by allowing doctors and triage nurses to click directly on any alert card in the **Key Findings** section to immediately filter the **Episode Drill-Down** table.

#### 2. Clinical Workflow & Interaction
* When the user clicks **"1 episode awaiting doctor's assessment"**:
  1. The UI switches automatically to the **Episode Drill-Down** tab.
  2. The filter is set to `stage: "form1_pending_form2"`.
  3. The table displays only patients currently seated in the waiting area awaiting physical wound examination.
* When the user clicks **"2 have no nurse administration recorded"**:
  1. The UI switches to the **Episode Drill-Down** tab.
  2. The filter is set to `stage: "form2_pending_form3"`.
  3. Displays patients who have a doctor's prescription but have not yet been logged in Station 1 for their Day 0 vaccine/RIG injection.
* When the user clicks **"7 overdue episodes requiring follow-up"**:
  1. The UI switches to the **Treatment & Follow-up** tab.
  2. Automatically activates the `status: "overdue"` sub-filter.

#### 3. Technical Implementation
* **Frontend:** In `BiteCasesOverviewTab.tsx`, update the `<AlertCard>` wrapper to accept an `onNavigateFilter(targetTab, filterParams)` callback.
* **State Management:** In `BiteCaseRiskDashboard.tsx`, maintain `activeFilters` state and sync with URL search params (`?tab=cases&stage=form1_pending_form2`) for bookmarkability and back-button support.

---

### Enhancement 2: Patient Retention & SMS Dispatch for Overdue Doses

#### 1. Objective
Directly combat patient dropout between Day 0, Day 3, and Day 7. In Philippine ABTC settings, patient compliance plummets after acute pain subsides, leaving patients susceptible to delayed rabies onset.

#### 2. Feature Specifications
* In the **Treatment & Follow-up** tab:
  * For any patient whose scheduled dose is $\ge 1$ day past due, render an interactive action menu in the row:
    * **Direct Call / Copy Number:** Copies verified guardian/patient mobile number to clipboard with one click.
    * **SMS Reminder Trigger:** Sends a standardized, DOH-compliant SMS reminder:
      > *"ABCare Tagoloan Reminder: Maayong adlaw [Patient Name]. Schedule nimo karon para sa imong follow-up anti-rabies shot (Day [X]) sa Tagoloan ABTC. Palihug bisita taliwala sa 8:00 AM - 4:00 PM para sa imong kaluwasan. Salamat!"*
    * **Log Contact Attempt:** Records timestamp and nurse ID (e.g., *"Called - Patient promised to visit tomorrow 9am"*).

#### 3. Technical Implementation
* **Backend:** Add endpoint `POST /api/v1/clinical/episodes/{id}/send-reminder` invoking the integrated SMS provider / notification queue.
* **Database:** Store outreach attempts in `patient_followup_logs` table (`id`, `episode_id`, `contact_type`, `status`, `notes`, `created_by`, `timestamps`).

---

### Enhancement 3: Category III RIG Urgency Indicator & Safety Net

#### 1. Objective
Ensure that every Category III bite patient (transdermal bites, scratches with blood, bites near the central nervous system or head/neck) receives Rabies Immunoglobulin (RIG) within the critical clinical window ($< 48$ hours from initial presentation).

#### 2. Clinical Rules & Visual Hierarchy
* Category III exposures without recorded RIG administration are tagged with a high-priority warning badge:
  * 🔴 **RIG PENDING (High Risk):** Patient assessed as Category III $\le 48$ hours ago, 0 IU RIG recorded in Form 3.
  * 🟡 **RIG DEFERRED / REFERRED:** Patient referred to Northern Mindanao Medical Center (NMMC) or private hospital for ERIG/HRIG skin testing/infusion due to local stock shortage.
  * 🟢 **RIG COMPLETED:** Infiltration completed around wound site and intramuscularly.
* The Overview headline metric displays an interactive warning tooltip explaining:
  * Total Category III cases vs. Verified RIG administered.
  * Reasons for unadministered cases (e.g., stock shortage, patient refusal, external referral).

---

### Enhancement 4: 14-Day Biting Animal Health Observation Tracking

#### 1. Objective
Implement standard DOH / WHO protocol tracking for biting dogs and cats. If the biting animal remains alive, healthy, and symptom-free 14 days after the bite, rabies transmission is effectively ruled out for that exposure.

#### 2. Feature Specifications
* Add an **Animal Health Status** tracker linked to Form 1 & Form 2:
  * 🟢 **Alive & Healthy (Day X/14):** Active countdown from exposure date.
  * 🔴 **Died / Rabid / Sacrificed:** Critical alert triggering mandatory full 4-dose Essen or 2-1-1 Zagreb completion + RIG if not yet administered.
  * ⚪ **Stray / Unknown / Lost:** Classified as high-risk unknown source.
* **Clinical Decision Support:**
  * When Day 14 is reached with "Alive & Healthy" confirmed by the patient, the system provides a recommendation prompt:
    > *"Biting animal confirmed alive and healthy on Day 14. DOH Protocol allows discontinuing further post-exposure doses if previously Category II/III with healthy domestic pet."*

#### 3. Technical Implementation
* **Backend:** Enhance `bite_episodes` table with `animal_observation_status` (`alive`, `died`, `lost`, `euthanized`), `animal_observation_date`, and `animal_last_checked_at`.
* **Frontend:** Display a compact 14-day timeline chip in the Episode Drill-Down and Inspection modal.

---

### Enhancement 5: Barangay Geospatial Surge & Early Outbreak Detection

#### 1. Objective
Provide real-time public health intelligence to the Municipal Health Officer (MHO) and Municipal Agriculture Office by flagging geographic bite clusters before they escalate into human or canine rabies outbreaks.

#### 2. Surge Detection Algorithm
* For each barangay in Tagoloan (Bal-ason, Poblacion, Casinglot, etc.):
  $$\text{Surge Ratio} = \frac{\text{Cases in Last 7 Days}}{\text{Average Weekly Cases in Previous 30 Days}}$$
* **Thresholds:**
  * $\text{Surge Ratio} \ge 2.0$ with $\ge 2$ cases: **Active Outbreak Warning 🔺**
  * $\ge 3$ cases within 7 days in a single purok/barangay: **Cluster Alert 🚨**
* **Actionable Output:**
  * A 1-click button on the Barangay Card: **"Export Barangay Notification"**.
  * Generates an official 1-page PDF memorandum addressed to the Barangay Captain and Municipal Agriculturist listing the recent bites, biting animal descriptions, and recommended canine vaccination / impounding drives.

---

### Enhancement 6: 1-Page "End-of-Shift / Daily Turnover" Print Slip

#### 1. Objective
Replace manual nurse endorsement logbooks with a clean, 1-click printable summary for shift handovers (morning to afternoon shift, or end-of-day closing).

#### 2. Report Contents (Compact 1-Page A4 / Thermal Format)
* **Clinic Header:** Tagoloan Animal Bite Treatment Center (Date & Shift Timestamp).
* **Duty Staff:** Attending Physician & Duty Nurse names.
* **Volume Catered Today:**
  * New Patient Registrations (Form 1)
  * Doctor Consultations Completed (Form 2)
  * Total Injections Administered (Form 3)
* **High-Risk Alerts:**
  * New Category III cases registered today
  * Unadministered RIG list needing endorsement
* **Vaccine Vial Consumption:**
  * Rabipur / Verorab vials opened & doses extracted (waste tracking)
  * Equirab / KamRAB vials used
* **Expected Follow-ups Tomorrow:**
  * List of patient names and contact numbers scheduled for Day 3, Day 7, or Day 14/28.

---

## 4. Usability & SUS Compliance Guidelines

To achieve and maintain a **System Usability Scale (SUS) score $\ge 85$**, all UI elements must satisfy the following strict design standards:

1. **Zero Decorative Emojis:** Use clean, professional SVG outline icons (MUI Icons). No informal emojis.
2. **Predictable Color Semantics:**
   * 🔴 **Red (`#dc2626` / `#ef4444`):** Strictly reserved for high risk (Category III, overdue dose $> 3$ days, animal died/rabid).
   * 🟡 **Amber (`#d97706` / `#f59e0b`):** Warning / pending action (awaiting doctor assessment, due today, unrecorded field).
   * 🟢 **Green (`#059669` / `#10b981`):** Positive / completed state (PEP started, schedule completed, animal healthy).
   * 🔵 **Teal / Slate (`#0f766e` / `#64748b`):** Structural clinical navigation and neutral information.
3. **Cognitive Load Minimization:**
   * Card heights must remain uniform.
   * Tooltips must explain clinical acronyms (PEP, RIG, TCV, mature cohort) on hover for junior nurses or newly assigned staff.
4. **Touch & Desktop Responsiveness:** All tables and action buttons must accommodate desktop widescreen monitors as well as tablet screens used at clinic triage desks.

---

## 5. Phased Implementation Roadmap

| Phase | Milestone | Scope | Deliverables |
| :---: | :--- | :--- | :--- |
| **Phase 1** | **Interactive Triage Navigation** | Frontend linking of Key Findings cards to Drill-Down filters. | 1-click filtering from Overview alerts directly into active case lists. |
| **Phase 2** | **Lost-to-Follow-up Prevention** | Overdue contact drawer, phone number copy, and automated SMS reminder trigger. | Enhanced Treatment & Follow-up table with patient contact shortcuts. |
| **Phase 3** | **RIG & Animal Observation Safety** | Category III RIG urgency badges and 14-day biting animal observation tracker. | Clinical safety net indicators across Overview, Drill-Down, and Inspection modals. |
| **Phase 4** | **Outbreak Intelligence & Shift Turnover** | Barangay 7-day surge algorithms and 1-page printable daily turnover slip. | Outbreak alert badges on Barangay cards and 1-click printable nurse handover sheet. |

---

## 6. Verification & Quality Assurance Strategy

1. **Unit & Feature Testing:**
   * Run `php artisan test tests/Feature/Reports/Phase4SummaryAndReconciliationTest.php` to guarantee zero data reconciliation regressions across Form 1, 2, and 3.
   * Run `npm run build` (`tsc -b && vite build`) to enforce strict TypeScript type safety on all new filter interfaces.
2. **Data Integrity Audit:**
   * Verify that filtering by any sub-status never corrupts the total baseline denominator.
   * Ensure `Place not recorded` cases remain fully auditable and never disappear during search operations.
3. **End-User Acceptance:**
   * Review workflow with attending physicians and clinic nurses at Tagoloan ABTC.
   * Conduct SUS questionnaire evaluation post-deployment targeting $\ge 85$ score.
