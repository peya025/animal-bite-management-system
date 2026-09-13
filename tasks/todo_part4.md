# 📌 Project Tasks & Roadmap — Part 4 (Clinical Workflow, Inventory & Analytics)

> **System**: Animal Bite Management System (ABTC / RHU)  
> **Modules**: Triage Queue, Doctor Consultation (Form 2), Vaccine Inventory, Vaccination Schedule, Reports & Analytics, Mobile Booster Experience, Admin Module Configuration, Patient Check-In, HCI Form Layouts, Identity Federation (Google OAuth SSO), Security Policies & DOH Protocols  
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

Phase 9: Identity Federation & Google OAuth Single Sign-On (Phase 9 — NEW)
  ├── 25. Google Cloud Console Setup & Admin Module SSO Configuration
  ├── 26. Web Staff Google OAuth Integration (Strict Existing Account Verification & Clinic Isolation)
  └── 27. Mobile Patient Google Identity Federation & Account Linking (PatientAccount & Invitations)

Phase 10: Security Policies, Standards, Procedures & DOH Guidelines (Phase 10 — NEW)
  ├── 28. Enterprise RBAC Policy Matrix (Aligned with DB Roles & Dual-Stream Flow)
  ├── 29. Multi-Tenant Clinic Data Isolation Policies & RA 10173 Protection
  └── 30. Standard Operating Procedures (SOP) & DOH NRPCP 2026 Clinical Protocols
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
- [x] **14.1 Conditionally Hide Booster Boxes**
  - If a patient has only received primary post-exposure vaccination (Days 0, 3, 7), hide booster fields on the digital card to avoid patient anxiety or confusion.
  - Show booster cards only if the patient has an active re-exposure / booster protocol.

### 15. Mobile Booster Guidance & Landing Page
- [x] **15.1 Direct Booster Guidance for Re-Bitten Patients**
  - Provide a clear banner/action: *"Bitten again after completing previous vaccine? Click here for Booster Guidance."*
- [x] **15.2 Step-by-Step Educational Landing Screen**
  - Explain the DOH re-exposure protocol (why only 2 doses are needed, importance of immediate wound washing, consultation timeframe).

### 16. Separate Booster Appointment Flow & Web Sync
- [x] **16.1 Dedicated Mobile Booster Appointment Form**
  - Distinct appointment request flow separated from initial bite registration: selects previous bite record, verifies prior vaccination date, and requests Booster Day 0 & Day 3 dates.
- [x] **16.2 Real-Time Sync with Web Appointment Queue**
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
*Implements dual-portal Google OAuth authentication, separating Web Clinical Staff authentication from Mobile Patient authentication, with strict clinic multi-tenancy, staff verification, and admin module configuration.*

### 25. Google Cloud Console Setup & Admin Module SSO Configuration
> **Assigned Development**: Identity Federation & Admin Configuration  
> **Main Tasks**: Set up Google Cloud Platform OAuth 2.0 credentials and integrate SSO configuration toggles into Clinic Module Configuration.

- [ ] **25.1 Google Cloud Platform (GCP) OAuth 2.0 Credentials Setup**
  - In Google Cloud Console $\rightarrow$ APIs & Services $\rightarrow$ Credentials:
    - Create OAuth 2.0 Client ID for **Web Application** (Web Clinical Portal) and **Android / iOS** (Mobile Patient App).
    - Configure Authorized JavaScript Origins: `http://localhost:5173`, `http://127.0.0.1:5173`, and production clinical domain.
    - Configure Authorized Redirect URIs: `http://localhost:8000/api/auth/google/callback`, `http://localhost:5173/login`, and mobile deep-link schemes.
    - Configure environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `backend/.env`.
- [ ] **25.2 Clinic Admin Module Configuration Integration (`ModuleConfigPage.tsx` & `clinic_module_configs`)**
  - In Admin Navigation $\rightarrow$ **Clinic Setup** $\rightarrow$ **Module Configuration** (`/setup/modules`):
    - Add **Authentication & Single Sign-On** section card in `ModuleConfigPage.tsx`.
    - Add toggle: **Enable Google Sign-In for Clinic Staff** (`google_sso_enabled` stored in `clinic_module_configs`).
    - Add setting: **Allowed Staff SSO Roles** checkboxes mapped to real DB roles:
      - `admin` (Clinic Administrator)
      - `registration` (Registration / Front Desk)
      - `triage` (Triage / Attending Doctor)
      - `treatment` (Treatment Nurse)
    - Add optional setting: **Restrict to Official Health Domain** (e.g. `@doh.gov.ph`, `@rhu.gov.ph`, or local clinic domain).
    - Save configuration via `PUT /api/setup/module-config` with instant toast feedback.

### 26. Web Staff Google OAuth Integration (`AuthController.php` & `LoginPage.tsx`)
> **Assigned Development**: Web Staff Identity Federation  
> **Main Tasks**: Implement secure Google token verification for clinic staff with strict account matching, clinic isolation, and unauthorized access rejection.

- [ ] **26.1 Backend Web Staff OAuth Handler (`POST /api/auth/google` in `AuthController.php`)**
  - Receive Google ID Token (`credential`) from frontend Web Login.
  - Verify token integrity and signature using `google/apiclient` or Socialite:
    - Extract verified `email`, `name`, `sub` (Google ID), and `picture`.
  - **Strict Account Matching & Access Guard (Prevents unauthorized public access to clinical records)**:
    - Look up staff account in `users` table where `email = $googleEmail`.
    - **Case 1 (Existing Staff)**:
      - Verify `is_active === true` (reject inactive accounts with `403 Forbidden: Account deactivated`).
      - Verify user is assigned to an active clinic (`clinic_id` is present and clinic exists).
      - If `google_id` is null, automatically link `google_id` and set `email_verified_at = now()`.
      - Issue Sanctum API token (`auth_token`), update `last_login_at`, record login in `audit_logs`.
      - Return authenticated `User` object (with `clinic` relationship) and bearer token.
    - **Case 2 (Pending Staff Invitation)**:
      - If user does not exist in `users`, check `staff_invitations` table for active invitation matching `$googleEmail`.
      - If valid invitation exists: auto-provision `User` with assigned `clinic_id` and `role`, mark invitation accepted, link `google_id`.
    - **Case 3 (Unauthorized External Account)**:
      - If no matching staff record or active invitation exists: **STRICTLY REJECT** with HTTP 403:
        `"Unauthorized: No clinical staff account is registered under this Google email. Contact your clinic administrator."`
      - **CRITICAL**: Do NOT auto-provision random public Google users into the clinical `users` table.
- [ ] **26.2 Frontend Web Login Screen Integration (`LoginPage.tsx`)**
  - Add official "Sign in with Google" button on the staff login screen (`LoginPage.tsx`).
  - Integrate Google Identity Services (GIS) Web SDK (`@react-oauth/google`).
  - On Google response: send ID token payload to `POST /api/auth/google`.
  - On success: store `authToken` and `userData` in `localStorage`, log audit entry, and navigate to the staff member's role-assigned dashboard:
    - `treatment` $\rightarrow$ `/nurse/patients`
    - `triage` $\rightarrow$ `/doctor/patients`
    - `registration` $\rightarrow$ `/patients`
    - `admin` $\rightarrow$ `/dashboard`
  - On 403 failure: display clear security alert banner explaining that access is restricted to verified clinic personnel.

### 27. Mobile Patient Google Identity Federation & Account Linking
> **Assigned Development**: Mobile Patient Identity Federation  
> **Main Tasks**: Implement Google Sign-In for patients on mobile app with automatic account creation and verified patient record linking.

- [ ] **27.1 Backend Mobile Patient OAuth Handler (`POST /api/mobile/auth/google` in `PatientAccountAuthController.php`)**
  - Verify Google ID Token from mobile client.
  - Query `patient_accounts` table by `email`:
    - If account exists: update `last_login_at`, link `google_id`.
    - If account does not exist: auto-provision new `PatientAccount` (`name`, `email`, `email_verified_at = now()`, `is_active = true`).
  - **Automatic Patient Record Linking**:
    - Check `patient_invitations` table for any pending invitations sent to this email by clinic staff.
    - If invitation found: link the `PatientAccount` to the verified clinical `Patient` record in `patient_account_patient` pivot table.
  - Issue Sanctum token with `mobile` scope (`createToken('mobile')->plainTextToken`).
  - Return `account` profile with loaded `patients` relationship.
- [ ] **27.2 Mobile Flutter App Integration (`mobile/lib/screens/login_screen.dart`)**
  - Add "Sign in with Google" button using `google_sign_in` Flutter package.
  - Obtain Google ID Token from device and post to `/api/mobile/auth/google`.
  - Store mobile auth token securely in Flutter Keychain / EncryptedSharedPreferences.

---

## 🛡️ Tier 10: Security Policies, Standards, Procedures & DOH Guidelines (Phase 10 — NEW)
*Implements enterprise access policies across all system database roles, dual-stream clinical workflow rules (separating Doctor consultation from Nurse follow-up), multi-tenant clinic boundary isolation, encryption standards, and DOH NRPCP 2026 clinical protocols.*

### 28. Enterprise Role-Based Access Control (RBAC) & Dual-Stream Clinical Workflow
> **Assigned Development**: Security Policies & Clinical Workflow  
> **Main Tasks**: Enforce strict role-based permissions aligned with database enums, multi-doctor queue stations, and the two distinct patient streams.

- [ ] **28.1 Database-Aligned Role Permission Matrix**
  - Permissions must strictly match the database enum `role: ['developer', 'admin', 'registration', 'triage', 'treatment']` in `users` and `patient_accounts`:
    - **`developer` (System Developer / Superadmin)**:
      - Full access to `/developer/*` (Database Explorer, Landing Page Settings, Appointment Diagnostics).
    - **`admin` (Clinic Administrator)**:
      - Full access to Clinic Setup (`/setup/*`), Operating Schedule (`/setup/schedule`), Module Config (`/setup/modules`), Staff Assignments (`/setup/staff-assignments`), User Management (`/users`), Audit Logs (`/staff-activity`), Vaccine Batch & Inventory Setup (`/inventory`), Reports & Analytics (`/reports`).
    - **`registration` (Front Desk / Receptionist)**:
      - Patient Registration (Form 1 demographics, PhilHealth ID, 4Ps status).
      - Walk-In Queue Ticket Generation for New Bite Consultations (`POST /queue`).
      - Patient Portal Invitation dispatch & account verification.
    - **`triage` (Attending Doctor / Triage Physician)**:
      - Doctor Patient Workspace (`/doctor/patients`).
      - Medical Assessment (Form 2 - WHO Category I/II/III diagnosis, anatomical bite site evaluation, animal observation status, Rabies Risk Assessment).
      - Treatment Plan Formulation (PEP schedule prescription, RIG weight-based order, tetanus prophylaxis, antibiotics).
      - Doctor Queue Call / Serve / Complete station handling.
    - **`treatment` (Treatment Nurse)**:
      - Nurse Patient Workspace (`/nurse/patients`).
      - Follow-Up Appointment Check-In (`POST /appointments/patient/{id}/check-in`).
      - Vaccination Administration (Form 3 - Route [Intradermal ID 2-site / Intramuscular IM], anatomical injection site, vaccine brand & lot/batch selection, open vial expiration tracking).
      - Stock deduction & beyond-use vial discard.
    - **`patient_accounts` (Mobile App / Patient Portal User)**:
      - View personal digital vaccination card, view scheduled follow-up & booster dates, view clinic operating schedule and vaccine availability.
- [ ] **28.2 Strict Dual-Stream Patient Flow Rules (Doctor Consultation Queue vs Nurse Follow-Up Stream)**
  - Enforce separation between initial consultations and follow-up returnees:
    - **Stream A — Initial Consultations & New Bites (Day 0)**:
      - Registration desk enters Form 1 $\rightarrow$ generates ticket in Doctor Queue (`queues`).
      - Patient waits for Doctor call (`triage`).
      - Doctor conducts medical evaluation and prescribes treatment plan in Form 2.
      - Upon Doctor completion, patient proceeds to Nurse (`treatment`) for initial Day 0 dose.
    - **Stream B — Returning Follow-Up Doses (Day 3, Day 7, Day 14, Day 28)**:
      - Returnees bypass the Doctor consultation queue entirely!
      - Returnees report directly to the Treatment Nurse desk (`/nurse/patients`).
      - Nurse clicks **"Check In"** $\rightarrow$ calls `POST /api/appointments/patient/{id}/check-in` (flips appointment status to `confirmed`; does **NOT** generate a ticket in doctor queue).
      - Status updates to **"Checked In / Ready for Dose"** and unlocks **"Record Dose (Form 3)"** button.
      - Nurse records vaccination and decrements stock.
- [ ] **28.3 Frontend Route RBAC Protection (`RoleProtectedRoute` in `App.tsx`)**
  - Replace naive `isAuthenticated()` with `RoleProtectedRoute` evaluating `user.role`:
    - Restrict `/users/*`, `/setup/*`, `/staff-activity` to `admin` and `developer`.
    - Restrict `/doctor/patients` to `triage`, `admin`, `developer`.
    - Restrict `/nurse/patients`, `/vaccinations/*` to `treatment`, `admin`, `developer`.
    - Restrict `/developer/*` strictly to `developer`.
  - Redirect unauthorized role attempts to `/dashboard` with an informative access denied notification.

### 29. Multi-Tenant Clinic Boundary Isolation Policies & Data Protection
> **Assigned Development**: Security Standards & Isolation  
> **Main Tasks**: Implement Laravel multi-tenant authorization policies to guarantee zero cross-clinic data leakage, encrypt sensitive health data, and record immutable audit logs.

- [ ] **29.1 Laravel Multi-Tenant Authorization Policies (`app/Policies/`)**
  - Create authorization policies in `backend/app/Policies/`:
    - `PatientPolicy`: Verifies `$user->clinic_id === $patient->clinic_id`.
    - `TreatmentRecordPolicy`: Verifies `$user->clinic_id === $record->clinic_id`.
    - `VaccinationRecordPolicy`: Verifies `$user->clinic_id === $record->clinic_id`.
    - `VaccineInventoryPolicy`: Verifies `$user->clinic_id === $inventory->clinic_id`.
    - `QueuePolicy`: Verifies `$user->clinic_id === $queue->clinic_id`.
  - Register policies in `AuthServiceProvider` / `AppServiceProvider`.
  - Prevent cross-clinic ID enumeration (e.g. user from Clinic 1 attempting to view `/api/patients/99` belonging to Clinic 2 returns `403 Forbidden`).
- [ ] **29.2 Sensitive Data Encryption & Compliance with RA 10173 (Data Privacy Act of 2012)**
  - Encrypt sensitive demographic and clinical fields at rest using AES-256 (`Crypt::encrypt` or Eloquent `$casts = ['encrypted']`):
    - `philhealth_no`, `contact_number`, `street_address`, and detailed doctor consultation clinical notes.
  - Implement comprehensive, tamper-evident Audit Logging in `audit_logs` table:
    - Log every patient record access, print action (`/print/*`), export action, and clinical data modification with `user_id`, `clinic_id`, `action`, `model_type`, `model_id`, `ip_address`, and `user_agent`.
  - Enforce automatic session timeout after 15 minutes of idle time on clinical workstations to prevent unauthorized viewing.
  - Enforce HTTPS across all clinical API communications.

### 30. Standard Operating Procedures (SOP) & DOH NRPCP 2026 Clinical Protocols
> **Assigned Development**: Procedures & Guidelines  
> **Main Tasks**: Document and enforce clinical SOPs adhering to the DOH National Rabies Prevention and Control Program (NRPCP) and account lifecycle management.

- [ ] **30.1 Patient Registration & Triage Intake SOP (Form 1 & Front Desk)**
  - Standardized intake procedure for all bite victims:
    - Immediate verification of bite incident date, exposure category, biting animal status, and prior rabies immunization history.
    - Identification of severe Category III emergency exposures (head/neck/face bites, deep multiple puncture wounds, wild animal bites) for immediate priority triage over routine cases.
    - Verification of PhilHealth eligibility and 4Ps beneficiary status for billing exemption.
- [ ] **30.2 DOH NRPCP Clinical Treatment & Vaccination Protocols (Form 2 & Form 3)**
  - **WHO Category Assessment & RIG Protocols (Doctor Form 2)**:
    - Category I: Touching/feeding animals, licks on intact skin $\rightarrow$ No PEP required.
    - Category II: Nibbling uncovered skin, minor scratches without bleeding $\rightarrow$ Immediate vaccine PEP required.
    - Category III: Transdermal bites, scratches with bleeding, licks on broken skin, exposure to bats $\rightarrow$ Immediate vaccine PEP $+$ Rabies Immunoglobulin (RIG).
    - Weight-based RIG dosage: Equine Rabies Immunoglobulin (ERIG) 40 IU/kg or Human Rabies Immunoglobulin (HRIG) 20 IU/kg, infiltrated into and around wound sites.
  - **Vaccination Regimen Adherence (Nurse Form 3)**:
    - **Intradermal (ID) 2-site regimen**: 0.1 mL per site administered at 2 sites (deltoid) on **Day 0, Day 3, and Day 7**.
    - **Intramuscular (IM) Essen regimen**: Full vial dose on **Day 0, Day 3, Day 7, Day 14, and Day 28**.
    - **Booster Regimen (Re-Exposure)**: 1-site ID or IM on **Day 0 and Day 3** for patients with documented completed prior PEP.
  - **Chronological Prerequisite Dose Sequence Locking**:
    - Day 7 administration locked until Day 3 is verified as administered.
    - Day 3 administration locked until Day 0 is verified as administered.
  - **Cold-Chain & Open-Vial Management**:
    - Reconstituted lyophilized rabies vaccine vials must be discarded after 8 hours (WHO/DOH cold chain standard).
    - Opened liquid Rabies Immunoglobulin (RIG) vials must be discarded after 48 hours.
- [ ] **30.3 Account Lifecycle Management & Audit Compliance SOP**
  - Strict clinic policy for staff onboarding: user creation requires verified email, phone number, clinic association, and role assignment.
  - Immediate deactivation (`is_active = false`) upon staff resignation, transfer, or offboarding to instantly revoke all active Sanctum tokens.
  - Annual data privacy compliance audit reviewing access logs and patient record exports.


