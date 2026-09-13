# 📌 Project Tasks & Roadmap — Part 4 (Clinical Workflow, Inventory & Analytics)

> **System**: Animal Bite Management System (ABTC / RHU)  
> **Modules**: Triage Queue, Doctor Consultation (Form 2), Vaccine Inventory, Vaccination Schedule, Reports & Analytics, Mobile Booster Experience, Admin Module Configuration, Patient Check-In, HCI Form Layouts  
> **Standards Compliance**: DOH National Rabies Prevention and Control Program (NRPCP), Clinical Triage Protocols, FIFO/FEFO Vaccine Standards, HCI Form & Validation UX Guidelines  
> **Date**: September 2026  
> **Status**: In Audit & Remediation  

---

## 🧭 Execution Roadmap Overview

```
Phase 1: Urgent Clinical & Doctor Consultation Workflow
  ├── 1. Triage Queue Visuals (Active Patient & RIG/GI Highlight)
  ├── 2. Multiple Doctor Support & Priority Sorting (Emergency Severe Bites on top)
  └── 3. Doctor Triage Form Customizations (Free-text body parts, Animal type Dog/Cat/Others, Disable med autofill)

Phase 2: Vaccine & Supplies Inventory Overhaul
  ├── 4. Add Stock Batch: Standardized Source of Supply / Supplier Dropdown (DOH, PHO, LGU)
  ├── 5. Inventory Table & Cards: Merged Count per Vaccine Type with Collapsible Batch Breakdown
  ├── 6. Advanced Inventory Filtering (Batch No., Status, Source/Supplier)
  └── 7. Jargon Simplification: Clear Vial Definitions & Human-Friendly Terminology

Phase 3: Vaccination Schedule & Re-Bite Episode Management
  ├── 8. Clean 3-Dose Primary Post-Exposure View (Hide unneeded booster boxes)
  ├── 9. Re-Exposure / Re-Bite Episode Handling (Full history logging)
  └── 10. Unified Schedule Filter & Patient Search Bar

Phase 4: Reports, Analytics & Corporate Print Review
  ├── 11. Summary Dashboard: Bite Category Filtering & 6 Metric Overview Cards
  ├── 12. Bite Cases Module: Top-Right Search, Category Filter, Animal Type Filter, Status Filter
  ├── 13. Patients Module: Top-Right Search & Month/Year Registration Date Filter
  ├── 14. Comprehensive Batch Inventory & Wastage Report (Used, Unused, Expired, Beyond-Use)
  └── 15. Formal Corporate / DOH Print Layout (Strictly mirroring active table filters)

Phase 5: Mobile Application & Booster Flow (Secondary Enhancements)
  ├── 16. Digital Vaccination Card: Conditionally Hide Boosters
  ├── 17. Direct Booster Guidance & Educational Landing Page
  └── 18. Dedicated Booster Appointment Request Flow & Web Queue Sync

Phase 6: Discovered Frontend Security, RBAC & Admin Module Hardening (NEW)
  ├── 19. Admin Side Module Configuration (Step-by-Step Enablement & Field Rules)
  └── 20. 10 Discovered Frontend Loopholes & System Hardening (RBAC, Priority Sorting Fix, Debounce, etc.)

Phase 7: Backend API Exception, Check-In & Dose Lock Remediation (NEW)
  ├── 21. Fix Patient Check-In 500 Internal Server Error (AppointmentController missing methods)
  └── 22. Form 3 Dose Sequence & Prerequisite Lock (Lock Day 7 until Day 3 is administered)

Phase 8: Human-Computer Interaction (HCI) Form Layout & Validation UX Refactoring (NEW)
  ├── 23. Core HCI Principles & Form UX Guidelines (Blur-first validation, live recovery, balanced 2-column pairing)
  └── 24. HCI Form & Validation Refactoring across Clinical Forms (Form 2, Form 3, Inventory Dialog, User Create)
```

---

## 🔥 Tier 1: Urgent Clinical & Doctor Consultation Workflow (Phase 1)
*These tasks directly affect daily clinic operations, triage speed, doctor consultation forms, and immediate patient safety.*

### 1. Triage Queue – Visual Indicators & Real-Time Status
- [x] **1.1 Highlight Active Patient in Queue Table**
  - Add prominent row styling (soft emerald `#ecfdf5` background, vibrant left border) for patients currently in consultation (`status: 'serving'`).
  - Add active consultation indicator badge: `● IN CONSULTATION`.
- [x] **1.2 Distinct Visual Highlight for Gamma Globulin / RIG (GI) Injections**
  - Detect if the patient has a Category III bite or is prescribed RIG / Gamma Globulin.
  - Add a high-visibility badge or row tag: `💉 RIG / GI CANDIDATE` or `⚠️ CATEGORY III - RIG` using Hugeicons (`InjectionIcon`).
- [ ] **1.3 Priority-Based Queue Ordering (Emergency & Priority on Top)**
  - Ensure the waiting queue sorts strictly by priority:
    $$\text{Emergency (Severe Bite)} \longrightarrow \text{Priority (Senior, PWD, Pregnant)} \longrightarrow \text{Appointments} \longrightarrow \text{Regular}$$
  - Within each priority band, order by FIFO (ticket arrival time).
- [ ] **1.4 Multiple Doctor Support & Call-Next Concurrency Guard**
  - Track and display which doctor / room is currently serving each patient (`handled_by`).
  - Update TV Queue Display (`QueueDisplayPage`) to show room/doctor stations (e.g., *Room 1: Dr. Santos → #012*, *Room 2: Dr. Cruz → #014*).

### 2. Triage Queue – Doctor View & Patient History
- [x] **2.1 Hide "Form 2 Consultation Type" Selection in Doctor Triage View**
  - Streamline doctor intake: remove or hide the redundant Form 2 consultation type selector in the doctor triage interface.
- [x] **2.2 Fast Patient History Lookup for Returning Consultations**
  - Add a dedicated patient name/ID search bar in the consultation workspace.
  - Instantly load past bite incidents, previous vaccine doses, tetanus prophylaxis, and adverse reaction logs for returning patients.

### 3. Doctor Form 2 – Form Field Customizations
- [x] **3.1 Disable Automatic Pre-filling of Medication Treatment Fields**
  - Turn off medication autofill so doctors manually write or select verified prescriptions per clinical evaluation.
- [x] **3.2 Free-Text Body Parts Selection**
  - Replace rigid checkboxes/dropdowns with a clean, flexible free-text input allowing precise anatomical notes (e.g., *"Right distal index finger volar aspect"*).
- [x] **3.3 Animal Type Dropdown with "Others" Free-Text Input**
  - Set default dropdown options to: **Dog** and **Cat**.
  - Add an **"Others"** option.
  - When **"Others"** is selected, reveal a clean free-text input directly underneath (e.g., *Monkey, Bat, Pig, Stray Rat*).

---

## 📦 Tier 2: Vaccine & Supplies Inventory Management (Phase 2)
*Ensures compliance with DOH/LGU audit standards, removes card clutter, and simplifies terminology.*

### 4. Add Stock Batch – Source of Supply & Supplier Standard
- [ ] **4.1 Standardized Source of Supply Dropdown**
  - Replace free-text `received_from` with an official dropdown:
    1. `DOH Central Supply (National Rabies Prevention Program)`
    2. `PHO - Provincial Health Office`
    3. `CHO / MHO - City/Municipal Health Office`
    4. `LGU Local Procurement`
    5. `Hospital Pharmacy / Direct Purchase`
    6. `Donation / NGO`
    7. `Other (Specify)` $\rightarrow$ reveals custom input.
- [ ] **4.2 Listed Supplier Catalog**
  - Provide auto-suggested or selectable supplier list to maintain consistent naming for DOH audit compliance.

### 5. Vaccine Inventory – Cards & Merged Stock Views
- [ ] **5.1 Vaccine Vial Cards: Top Vial Count with Dropdown Information**
  - Re-structure vial cards in `StockLevelIndicator`:
    - **Front Card Face (Compact):** Big vial count number (e.g. `24 Vials` $+$ `1/3 open`), vaccine name, and stock status badge (`Sufficient`, `Low`, `Expired`).
    - **Expandable Dropdown / Accordion (`▾ View Details`):** Reveals batch numbers, expiration dates, patient capacity calculation, open vial discard timers, and supplier sources.
- [ ] **5.2 Merged Count for Identical Vaccine Types Across Multiple Batches**
  - Group identical vaccines (e.g., all *Verorab* batches) under one consolidated total count.
  - Inside the card dropdown/table, distinctly itemize individual batches with their respective lot numbers, suppliers, and expiry dates.

### 6. Vaccine & Supplies Inventory – Advanced Filtering
- [ ] **6.1 Batch Number Filter**
  - Filter inventory table rows by specific batch / lot number.
- [ ] **6.2 Stock Status Filter**
  - Filter by `Available / Active`, `Low Stock (≤10)`, `Expiring Soon (≤30 Days)`, `Expired`, and `Out of Stock / Depleted`.
- [ ] **6.3 Source / "Referred By" Filter**
  - Filter inventory items by source program (e.g., *DOH National Supply*, *LGU Purchased*, *Donation*).

### 7. Inventory Terminology & Clarity (Non-IT Friendly)
- [ ] **7.1 Short, Clear Explanation for "Vial"**
  - Add tooltip & UI helper note:
    > *"1 Vial = 1 glass bottle of vaccine. In animal bite clinics, 1 vial can vaccinate multiple patients (e.g., 1 vial = up to 3 patients for intradermal rabies shots)."*
- [ ] **7.2 Replace Technical Jargon with Plain Terms**
  - `regimen_units_per_patient` $\rightarrow$ **Vials needed per patient treatment**
  - `current_quantity` $\rightarrow$ **Available Sealed Vials**
  - `doses_per_vial` $\rightarrow$ **Patients per Vial**
  - `open_vial_hours` $\rightarrow$ **Hours valid once opened**
  - `discard_pending / beyond-use` $\rightarrow$ **Opened vial expired / dispose**

---

## 🗓️ Tier 3: Vaccination Schedule & Re-Bite Management (Phase 3)
*Streamlines nurse injection scheduling and handles multi-episode bite cases.*

### 8. Vaccination Schedule & Re-Exposure
- [ ] **8.1 Clean Primary Schedule View (Hide Default Booster Boxes)**
  - Default post-exposure prophylaxis view shows strictly the 3 primary doses: **Day 0, Day 3, and Day 7**.
  - Remove/hide booster boxes from primary intake to eliminate visual clutter and avoid nurse confusion.
- [ ] **8.2 Re-Exposure / Re-Bite Handling with Full Episode History**
  - Allow adding a new bite incident episode if a previously completed patient gets bitten again.
  - Automatically route previously vaccinated patients to the 2-dose Booster regimen (**Day 0 and Day 3**) per DOH guidelines while preserving past episode logs.
- [ ] **8.3 Consolidated Schedule Filters & Search Bar**
  - Add patient name search bar.
  - Consolidate individual dose filter tabs into **1 single clean dropdown** (*All Doses*, *Day 0*, *Day 3*, *Day 7*, *Booster 1*, *Booster 2*).

---

## 📊 Tier 4: Reports, Analytics & Corporate Print Review (Phase 4)
*Clinical governance, executive metrics, and audit-ready document export.*

### 9. Reports & Analytics – Summary Dashboard
- [x] **9.1 Bite Category Filtering on Dashboard**
  - Add multi-category filter dropdown: `All Categories`, `Category I`, `Category II`, `Category III`.
- [x] **9.2 Metric Overview Cards (6 Key Counters)**
  - [x] **Total Patients** (Unique patient records)
  - [x] **Total Bite Cases** (All registered bite incidents)
  - [x] **New Patients** (First-time clinic registrations in selected period)
  - [x] **New Cases** (Incidents reported in selected period)
  - [x] **Completed Cases** (Patients who finished full vaccination regimen)
  - [x] **On-going Cases** (Patients currently undergoing active vaccination)

### 10. Reports & Analytics – Bite Cases Module
- [x] **10.1 Top-Right Patient Search Bar**
  - Align patient search bar to the top-right header for quick incident lookup.
- [x] **10.2 Category Filter Dropdown**
  - Filter bite records by Category I, II, III.
- [x] **10.3 Animal Type Filter Dropdown**
  - Filter by `Dog`, `Cat`, `Others (Free-text input)`.
- [x] **10.4 Case Status Filter**
  - Filter by `Completed`, `On-going`, `Cancelled`.

### 11. Reports & Analytics – Patients Module
- [x] **11.1 Top-Right Patient Search Bar**
  - Search patients by full name, ID, or contact number.
- [x] **11.2 Registration Date Filter (Month & Year)**
  - Add Month (January–December) and Year dropdown selectors to filter patient intake cohorts.

### 12. Inventory Utilization & Wastage Reports
- [x] **12.1 Comprehensive Batch Utilization Table**
  - Show: **Batch No.**, **Supplier/Source**, **Received Quantity**, **Quantity Used**, **Remaining Sealed Vials**, **Opened Vial Status** (e.g. 2/3 left), **Beyond-Use / Discarded Vials**, and **Expiry Status**.
- [x] **12.2 Report Filtering Controls**
  - Filter by Supplier, Vaccine Type, Expiry Condition, and Date Range.

### 13. Print Review – Corporate & DOH Formal Layout
- [ ] **13.1 Strict Filter Mirroring ("Musunod dapat ang filtering in the print")**
  - The printed document must strictly print the filtered dataset active on the screen (date range, category, animal type, status).
- [ ] **13.2 Formal Corporate / Government DOH Styling & Sign-off Blocks**
  - Official clinic letterhead, republic header, generation timestamp, and active filter criteria banner.
  - Structured borders, alternating row tints, summary totals row.
  - Sign-off blocks:
    - *Prepared by: [Clinic Nurse / Inventory Officer]*
    - *Noted & Approved by: [Medical Officer / Doctor in Charge]*

---

## 📱 Tier 5: Mobile Application & Booster Flow (Phase 5)
*Mobile patient experience and asynchronous online booking.*

### 14. Mobile Digital Vaccination Card
- [ ] **14.1 Conditionally Hide Booster Boxes**
  - If a patient has only received primary post-exposure vaccination (Days 0, 3, 7), hide booster fields on the digital card to avoid patient anxiety or confusion.
  - Show booster cards only if the patient has an active re-exposure / booster protocol.

### 15. Mobile Booster Guidance & Landing Page
- [ ] **15.1 Direct Booster Guidance for Re-Bitten Patients**
  - Provide a clear banner/action: *"Bitten again after completing previous vaccine? Click here for Booster Guidance."*
- [ ] **15.2 Step-by-Step Educational Landing Screen**
  - Explain the DOH re-exposure protocol (why only 2 doses are needed, importance of immediate wound washing, consultation timeframe).

### 16. Separate Booster Appointment Flow & Web Sync
- [ ] **16.1 Dedicated Mobile Booster Appointment Form**
  - Distinct appointment request flow separated from initial bite registration: selects previous bite record, verifies prior vaccination date, and requests Booster Day 0 & Day 3 dates.
- [ ] **16.2 Real-Time Sync with Web Appointment Queue**
  - Automatically tag incoming requests as `visit_type: 'booster'` in the clinic web triage queue for nurse/doctor verification.

---

## 🛡️ Tier 6: Discovered Frontend Security, RBAC & Admin Module Hardening (Phase 6 — NEW)
*Remediates codebase loopholes, enforces strict route RBAC, and details step-by-step admin module configuration.*

### 19. Admin Side Module Configuration (Step-by-Step Enablement & Field Rules)
> **Goal**: Configure module section toggles and field rules in the Admin workspace (`ModuleConfigPage.tsx`) to enable smooth clinical intake.

- [ ] **19.1 Step 1 — Admin Module Configuration Access**
  - Log in with an `admin` or `developer` account.
  - In the left sidebar navigation, expand **Clinic Setup** and click **Module Configuration** (`/setup/modules`).
- [ ] **19.2 Step 2 — Enable Core Clinical Sections**
  - Toggle all 7 core clinic sections to `ENABLED`:
    - `Patient Registration` (`patient_registration_enabled = true`)
    - `Address Information` (`address_section_enabled = true`)
    - `Socioeconomic Information` (`socioeconomic_section_enabled = true`)
    - `Government Programs` (`gov_programs_section_enabled = true`)
    - `Bite Incident Intake` (`bite_intake_section_enabled = true`)
    - `Triage & Assessment` (`triage_section_enabled = true`)
    - `Treatment & Vaccination` (`treatment_section_enabled = true`)
- [ ] **19.3 Step 3 — Set Required Clinical Field Rules**
  - Under **Triage & Assessment**:
    - Set `exposure_category` (WHO Category I, II, III) $\rightarrow$ `REQUIRED`
    - Set `bite_site` (Anatomical location) $\rightarrow$ `REQUIRED`
    - Set `animal_observation_status` $\rightarrow$ `REQUIRED`
  - Under **Treatment & Vaccination**:
    - Set `protocol_type` (Standard, Accelerated, Booster) $\rightarrow$ `REQUIRED`
    - Set `route` (Intradermal ID / Intramuscular IM) $\rightarrow$ `REQUIRED`
    - Set `vaccine_brand` & `batch_no` $\rightarrow$ `REQUIRED`
- [ ] **19.4 Step 4 — Save & Verify Configuration**
  - Click **"Save Module Configuration"** at top-right.
  - Verify API PUT request to `/api/clinic-config` succeeds and toast reads *"Clinic module configuration saved successfully"*.
- [ ] **19.5 Step 5 — Staff Station Assignment**
  - Navigate to **Staff Assignments** (`/setup/staff-assignments`).
  - Assign physicians to **Triage / Consultation Station**.
  - Assign clinic nurses to **Treatment / Vaccination Station**.
- [ ] **19.6 Step 6 — Dynamic Form Runtime Binding**
  - Connect `GeneralTreatmentForm.tsx` (Doctor Form 2) and `VaccinationRecordForm.tsx` (Form 3) to `useClinicModuleConfig()` hook to dynamically enforce configured field rules.

### 20. Itemized 10 Discovered Frontend Loopholes & System Hardening
> **Goal**: Step-by-step remediation of all 10 frontend loopholes identified during system audit.

- [ ] **20.1 Loophole 1: Missing Route-Level RBAC Protection (`App.tsx`)**
  - **Defect**: `ProtectedRoute` checks only `authToken` in `localStorage` without verifying `user.role`. Low-privilege users can manually type `/developer/*`, `/users/*`, `/setup/*` in URL.
  - **Fix**: Implement `RoleProtectedRoute` component with `allowedRoles` array prop, redirecting unauthorized roles to `/dashboard`.
- [ ] **20.2 Loophole 2: Severe Emergency Priority Sorting Inversion (`QueueDashboardPage.tsx`)**
  - **Defect**: `sortQueueForDisplay` evaluates `priorityCategoryRank` (Senior/PWD/Pregnant) **before** `priorityLevelRank` (Emergency = 0). Emergency severe head/neck bite patients are placed **below** normal priority seniors.
  - **Fix**: Update `sortQueueForDisplay` to evaluate `priorityLevelRank(a) - priorityLevelRank(b)` FIRST so Emergency patients take top precedence.
- [ ] **20.3 Loophole 3: Multi-Doctor Parallel Room Ticket Collision (`QueueDashboardPage.tsx`)**
  - **Defect**: Clicking "Call Next" sends a generic call request without station/room binding or optimistic locking. Parallel doctors call and serve the same ticket.
  - **Fix**: Include `room_id`/`station_id` in call payload, optimistically lock ticket in local state, and handle 409 Conflict API errors with doctor station toast notifications.
- [ ] **20.4 Loophole 4: Action Button Double-Submit & Multi-Click Vulnerability**
  - **Defect**: Form submit buttons lack debouncing and remain active during pending API calls, causing duplicate patient records, double stock deductions, or duplicate queue tickets.
  - **Fix**: Add `isSubmitting` state guard, disable submit buttons on click, and apply 500ms debounce throttling on queue action buttons.
- [ ] **20.5 Loophole 5: Client LocalStorage State Tampering for Admin Controls (`InventoryTable.tsx`)**
  - **Defect**: Admin buttons (`Delete Batch`, `Adjust Stock`) rely purely on client `user?.role === 'admin'`. Overwriting `localStorage` `userData` reveals all admin buttons.
  - **Fix**: Enforce server-side authorization check on submit and handle 403 Forbidden responses by resetting client state safely.
- [ ] **20.6 Loophole 6: Unsanitized Open-Vial Discard Timer Bounds (`AddEditInventoryDialog.tsx`)**
  - **Defect**: Form allows arbitrary open vial hours (e.g. 168 hours) without enforcing WHO/DOH cold-chain limits (max 8h for reconstituted vaccines, max 48h for RIG).
  - **Fix**: Enforce input bounds `min={1}` and `max={48}` with cold-chain preset tooltips.
- [ ] **20.7 Loophole 7: Search Input Regex Special Character Crash**
  - **Defect**: Search fields with regex special characters (`(`, `[`, `*`, `\`, `?`) crash client JS rendering when parsed with `new RegExp(search)`.
  - **Fix**: Escape regex special characters with `search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` and use `String.prototype.includes()`.
- [ ] **20.8 Loophole 8: Unhandled API Failure & Infinite Spinner Deadlocks**
  - **Defect**: API 500 errors or network dropouts trap tables in perpetual `loading: true` state without error banners or retry actions.
  - **Fix**: Ensure `finally { setLoading(false); }` runs on all data hooks and render error fallback banners with "Tap to Retry" buttons.
- [ ] **20.9 Loophole 9: Print Filter Desynchronization & Missing DOH Sign-Off Blocks (`ReportsDashboardPage.tsx`)**
  - **Defect**: Clicking "Print" outputs static/unfiltered data rather than mirroring active UI filters, and lacks formal government sign-off signature blocks (*Prepared by Nurse*, *Approved by Doctor*).
  - **Fix**: Pass active `filteredItems` to print window, adding clinic letterhead, generated timestamp, filter criteria banner, and formal sign-off signature blocks.
- [ ] **20.10 Loophole 10: Mobile Application Mock Mode Release Build Leak (`mobile/.env`)**
  - **Defect**: Flutter app contains mock mode flags (`MOCK_MODE=true`) that bypass real backend JWT login if left enabled in release builds.
  - **Fix**: Add build assertion in Flutter `main.dart` raising an error if `MOCK_MODE=true` is set in `--release` build mode.

---

## 🚨 Tier 7: Backend API Exception, Check-In & Dose Lock Remediation (Phase 7 — NEW)
*Fixes 500 Internal Server Errors on check-in routes and enforces strict chronological PEP dose sequence locking.*

### 21. Fix Patient Check-In 500 Internal Server Error (`AppointmentController.php`)
> **Problem**: Invoking `POST /api/appointments/patient/5/check-in` or `POST /api/appointments/patient/7/check-in` returns HTTP 500 Internal Server Error because `checkIn($id)` and `checkInByPatient($patientId)` methods are missing in `AppointmentController.php` despite being defined in `routes/api.php`.

- [ ] **21.1 Implement `checkIn($id)` in `AppointmentController.php`**
  - Find appointment by ID. Verify clinic ownership.
  - Create new `patient_queues` record for today (`status: 'waiting'`, `visit_type: 'vaccination'`).
  - Update appointment status to `checked_in`.
  - Return `200 OK` JSON response.
- [ ] **21.2 Implement `checkInByPatient($patientId)` in `AppointmentController.php`**
  - Find active appointment for patient ID today.
  - Invoke check-in workflow or issue walk-in queue ticket for today.
- [ ] **21.3 Non-500 Defensive Exception Handling**
  - Catch invalid patient/appointment IDs and return clean `404 Not Found` JSON.
  - Prevent duplicate check-in tickets today by returning `422 Unprocessable Entity` if patient is already waiting in active queue.

### 22. Form 3 Chronological Dose Sequence & Prerequisite Lock (`VaccinationRecordForm.tsx`)
> **Problem**: Nurses can record future doses out of chronological order (e.g. attempting to edit/record Day 7 when Day 3 has not yet been administered), violating DOH clinical safety protocols.

- [ ] **22.1 Prerequisite Dose Lock in Frontend UI (`VaccinationRecordForm.tsx`)**
  - Disable input fields, batch selectors, and action buttons for future doses (e.g. Day 7) if the preceding mandatory dose (Day 3) is not yet administered/completed.
  - Display UI warning tooltip on locked rows: *"Prerequisite dose (Day 3) must be administered before Day 7 can be recorded."*
- [ ] **22.2 Backend Dose Sequence Validation (`VaccinationRecordController.php`)**
  - Add backend validation rule in `store` & `update` preventing out-of-order dose administration.
  - Return `422 Unprocessable Entity` (`"Prerequisite dose [Day X] missing"`) if an out-of-sequence dose payload is submitted.

---

## 🎨 Tier 8: Human-Computer Interaction (HCI) Form Layout & Validation UX Refactoring (Phase 8 — NEW)
*Refactors clinical forms to follow HCI visual scanning paths, graceful validation lifecycles (blur-triggered validation, live error recovery), balanced uniform 2-column pairings for compact layout, and strict preservation of all existing field contracts.*

### 23. Core HCI Principles & Form UX Guidelines
> **Core Principle**: *"People read forms top to bottom. A single column keeps label $\rightarrow$ field $\rightarrow$ helper $\rightarrow$ action in one path, so eyes never zigzag across the page."*

- [ ] **23.1 Graceful Validation Lifecycle (No Premature Keystroke Errors)**
  - Do NOT trigger live error messages while the user is typing in a field for the first time ("Keystroke validation shouts before the user finishes").
  - Trigger initial inline validation on field `blur` (when focus leaves the field) to catch missing/invalid fields early.
  - Once an error is visible, clear/update the error on live input (`onChange`) as the user fixes the value (error recovery mode).
  - Full form submit retains complete validation safety net for all required fields.
- [ ] **23.2 Balanced Uniform Layout (Prevent Overly Long Forms)**
  - Do NOT make forms excessively long or scroll-heavy.
  - Use single-column vertical stacks for sequential workflow sections.
  - For closely paired/tight fields (e.g. `First Name` + `Last Name`, `City` + `Province`, `Protocol` + `Route`), use clean, uniform 2-column grid pairs (`xs={6}`) to keep forms compact and easy to scan without cluttering.
- [ ] **23.3 Strict Preservation of Existing Fields, Labels & Options**
  - **Do NOT change, delete, or rename any existing field keys, labels, helper text, or options** during UI refactoring.
- [ ] **23.4 Primary Action Button In-Line Placement**
  - Place primary form submission buttons directly in line with the vertical reading path (left-aligned or full-width at the bottom of the form stack), avoiding floating or right-disconnected buttons.

### 24. HCI Form & Validation Refactoring across Clinical Forms
- [ ] **24.1 Doctor Assessment (Form 2) Refactoring (`GeneralTreatmentForm.tsx`)**
  - Apply blur-first validation, live error recovery, and uniform 2-column field pairing while preserving all existing clinical fields/labels.
- [ ] **24.2 Nurse Vaccination Card (Form 3) Refactoring (`VaccinationRecordForm.tsx`)**
  - Implement blur validation on dose rows and balanced uniform 2-column layout for dose route/brand selectors.
- [ ] **24.3 Add/Edit Vaccine Inventory Dialog Refactoring (`AddEditInventoryDialog.tsx`)**
  - Refactor modal layout into compact uniform 2-column pairs (`xs={6}`) with blur validation and live error recovery.
- [ ] **24.4 User Creation & Account Setup Refactoring (`UserCreatePage.tsx`, `SetupWizardPage.tsx`)**
  - Apply graceful validation lifecycles and uniform 2-column field pairing.

---

## 🔑 Tier 9: Identity Federation & Google OAuth Single Sign-On (Phase 9 — NEW)
*Implements Google API / OAuth login, user authentication, secure token exchange, auto-linking of user credentials, and admin-side module configuration.*

### 25. Identity Federation & Google OAuth Login
> **Assigned Development**: Identity Federation & Login  
> **Main Tasks**: Implement Google API/OAuth login, user authentication, and secure access for system users.

- [ ] **25.1 Admin Side Module Configuration (Step-by-Step Setup)**
  - **Step 1: Google Cloud Console Setup**
    - Navigate to Google Cloud Console $\rightarrow$ APIs & Services $\rightarrow$ Credentials.
    - Create OAuth 2.0 Client ID (Web Application).
    - Configure Authorized JavaScript origins (e.g. `http://localhost:5173`, `https://your-clinic-domain.com`).
    - Configure Authorized redirect URIs (e.g. `http://localhost:8000/api/auth/google/callback`, `http://localhost:5173/auth/google/callback`).
    - Obtain `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
  - **Step 2: Admin System Settings Configuration Page (`AdminOAuthSettingsPage.tsx`)**
    - In Admin Dashboard $\rightarrow$ System Settings $\rightarrow$ Identity & Authentication tab:
      - Add field for **Google Client ID** (stored in system settings database/env).
      - Add field for **Google Client Secret** (stored encrypted).
      - Add toggle: **Enable Google Single Sign-On (SSO)**.
      - Add dropdown/checkbox group: **Allowed Google SSO Roles** (`Patient`, `Nurse`, `Doctor`, `Staff`, `Admin`).
      - Add domain filter setting: **Restrict to Domain** (optional domain white-labeling, e.g. `@doh.gov.ph` or `@clinic.com`).
  - **Step 3: Backend API Configuration & Integration (`config/services.php`, `AuthController.php`)**
    - Configure `config/services.php` for Laravel Socialite / Google API client.
    - Implement `GET /api/auth/google/redirect` to generate Google Auth URL.
    - Implement `POST /api/auth/google/callback` to verify Google ID token / authorization code.
    - Implement automatic account matching by email address:
      - If email exists in `users` table: link `google_id`, set `email_verified_at`, generate Sanctum API bearer token, return user session.
      - If email does not exist: auto-provision new Patient account (or return registration request if domain restricted).
- [ ] **25.2 Frontend Google OAuth Integration (`LoginPage.tsx`, `GoogleSignInButton.tsx`)**
  - Render "Sign in with Google" button on web login (`LoginPage.tsx`) and mobile login screens.
  - Implement pop-up or redirect OAuth flow using `@react-oauth/google` or Google Identity Services SDK.
  - Store issued API token securely in HTTP-only cookies / encrypted local storage upon login success.
- [ ] **25.3 Mobile App Identity Federation (`mobile/lib/screens/login_screen.dart`)**
  - Integrate `google_sign_in` Flutter package.
  - Obtain Google ID Token from mobile device and transmit to backend `/api/auth/google/callback`.

---

## 🛡️ Tier 10: Security Policies, Standards, Procedures & DOH Guidelines (Phase 10 — NEW)
*Implements enterprise access policies across all roles, password security standards, patient record protection, and standard operating procedures for registration, treatment, and data handling.*

### 26. Security Policies (Role-Based Authorization Policies)
> **Assigned Development**: Security Policies  
> **Main Tasks**: Implement access policies for Admin, Doctor, Nurse, Staff, and Patient.

- [ ] **26.1 Enterprise Role-Based Access Control (RBAC) Matrix**
  - **Admin**: Full access to System Settings, User Management, Audit Logs, Inventory Setup, Master Analytics.
  - **Doctor**: Read/Write Patient Treatment Form 2 (Diagnosis, Category III Assessment, PEP Prescription, Rabies Risk Assessment), View Medical History, Queue Management.
  - **Nurse**: Read/Write Patient Form 3 (PEP Vaccine Dose Administration, Route/Site Selection, Batch Tracking, Open Vial Timer), Queue Call/Skip.
  - **Staff/Receptionist**: Patient Registration (Form 1), Check-In, Queue Ticket Generation, Appointment Scheduling.
  - **Patient**: View personal appointment schedule, view own vaccination card summary, view clinic announcements.
- [ ] **26.2 Backend Laravel Authorization Policies (`app/Policies/`)**
  - Implement `PatientPolicy`, `TreatmentRecordPolicy`, `VaccinationRecordPolicy`, `InventoryPolicy`, and `QueuePolicy`.
  - Attach middleware `can:authorize` to all sensitive API endpoints in `routes/api.php`.

### 27. Security Standards & Data Protection
> **Assigned Development**: Security Standards  
> **Main Tasks**: Implement password requirements, authentication standards, and protection of patient records.

- [ ] **27.1 Password Standards & Authentication Hardening**
  - Enforce password complexity policy: Minimum 12 characters, requiring uppercase, lowercase, numeric, and special character (`Password::min(12)->mixedCase()->numbers()->symbols()`).
  - Implement rate-limiting / brute-force protection: Max 5 failed login attempts per minute per IP (`ThrottleRequests`).
  - Enforce automatic session timeout after 15 minutes of inactivity on clinical workstations.
- [ ] **27.2 Patient Records Data Protection & Encryption**
  - Encrypt Personally Identifiable Information (PII) and Sensitive Personal Info (SPI) at rest (PhilHealth ID, Contact Number, Address, Clinical Assessment Notes) using AES-256 (`Crypt::encrypt`).
  - Enforce SSL/TLS encryption for all HTTP communications in transit (`FORCE_HTTPS=true`).
  - Implement immutable Audit Logging (`audit_logs` table) recording user ID, action, model, IP address, and timestamp for all patient record views, updates, and exports.

### 28. Standard Operating Procedures (SOP) & Clinical Guidelines
> **Assigned Development**: Procedures & Guidelines  
> **Main Tasks**: Develop procedures and guidelines for registration, treatment records, account usage, and secure handling of patient information.

- [ ] **28.1 Patient Registration Procedure Guidelines**
  - Embed inline operational guidance in Form 1: Standardized intake procedures for bite incidence reporting, PhilHealth validation, and emergency triage prioritization.
- [ ] **28.2 Clinical Treatment Records Handling Guidelines**
  - Document & enforce DOH National Rabies Prevention and Control Program (NRPCP) protocols within Form 2 (Doctor Assessment) and Form 3 (Nurse Vaccination).
  - Guidelines for Day 0, Day 3, Day 7, Day 14, Day 28 PEP schedule compliance and RIG (Rabies Immunoglobulin) weight-based dosage calculations.
- [ ] **28.3 Account Usage & Secure Data Handling Guidelines**
  - Admin SOP for user account lifecycle management (onboarding, role assignment, prompt deactivation upon staff offboarding).
  - Data privacy guidelines complying with Republic Act 10173 (Data Privacy Act of 2012) for handling patient rabies surveillance records and report generation.

