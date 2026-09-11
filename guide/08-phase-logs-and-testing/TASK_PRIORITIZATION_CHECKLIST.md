# 🚀 Master Clinical & System Development Checklist

A consolidated, tiered action plan combining clinical workflow optimizations, doctor consultation customizations, vaccine inventory management, reporting analytics, and mobile booster flows.

---

## 🧭 Execution Roadmap Overview

```
Phase 1: Urgent Clinical & Doctor Consultation Workflow
  ├── Triage Queue Visuals (Active Patient & RIG/GI Highlight)
  ├── Multiple Doctor Support & Priority Sorting (Emergency/Senior/PWD on top)
  ├── Doctor Triage Form Customizations (Free-text body parts, Animal type Dog/Cat/Others, Disable med autofill)
  └── Patient History Lookup & Hide Form 2 Consultation Type Selection

Phase 2: Vaccine & Supplies Inventory Overhaul
  ├── Add Stock Batch: Standardized Source of Supply / Supplier Dropdown (DOH, PHO, LGU)
  ├── Inventory Table & Cards: Merged Count per Vaccine Type with Collapsible Batch Breakdown
  ├── Advanced Inventory Filtering (Batch No., Status, Source/Supplier)
  └── Jargon Simplification: Clear Vial Definitions & Human-Friendly Terminology

Phase 3: Vaccination Schedule & Re-Bite Episode Management
  ├── Clean 3-Dose Primary Post-Exposure View (Hide unneeded booster boxes)
  ├── Re-Exposure / Re-Bite Episode Handling (Full history logging)
  └── Unified Schedule Filter & Patient Search Bar

Phase 4: Reports, Analytics & Corporate Print Review
  ├── Summary Dashboard: Bite Category Filtering & 6 Metric Overview Cards
  ├── Bite Cases Module: Top-Right Search, Category Filter, Animal Type Filter, Status Filter
  ├── Patients Module: Top-Right Search & Month/Year Registration Date Filter
  ├── Comprehensive Batch Inventory & Wastage Report (Used, Unused, Expired, Beyond-Use)
  └── Formal Corporate / DOH Print Layout (Strictly mirroring active table filters)

Phase 5: Mobile Application & Booster Flow (Secondary Enhancements)
  ├── Digital Vaccination Card: Conditionally Hide Boosters
  ├── Direct Booster Guidance & Educational Landing Page
  └── Dedicated Booster Appointment Request Flow & Web Queue Sync
```

---

## 🔥 Tier 1: Urgent Clinical & Doctor Consultation Workflow (Phase 1)

### 1. Triage Queue – Visual Indicators & Real-Time Status
- [ ] **1.1 Highlight Active Patient in Queue Table**
  - Add prominent row styling (soft emerald `#ecfdf5` background, vibrant left border) for patients currently in consultation (`status: 'serving'`).
  - Add active consultation indicator badge: `● IN CONSULTATION`.
- [ ] **1.2 Distinct Visual Highlight for Gamma Globulin / RIG (GI) Injections**
  - Detect if the patient has a Category III bite or is prescribed RIG / Gamma Globulin.
  - Add a high-visibility badge or row tag: `💉 RIG / GI CANDIDATE` or `⚠️ CATEGORY III - RIG`.
- [ ] **1.3 Priority-Based Queue Ordering (Emergency & Priority on Top)**
  - Ensure the waiting queue sorts strictly by priority:
    $$\text{Emergency (Severe Bite)} \longrightarrow \text{Priority (Senior, PWD, Pregnant)} \longrightarrow \text{Appointments} \longrightarrow \text{Regular}$$
  - Within each priority band, order by FIFO (ticket arrival time).
- [ ] **1.4 Multiple Doctor Support**
  - Track and display which doctor / room is currently serving each patient (`handled_by`).
  - Prevent doctor collisions when clicking **"Call Next"** by locking and auto-selecting the next unassigned eligible ticket.
  - Update TV Queue Display (`QueueDisplayPage`) to show room/doctor stations (e.g., *Room 1: Dr. Santos → #012*, *Room 2: Dr. Cruz → #014*).

### 2. Triage Queue – Doctor View & Patient History
- [ ] **2.1 Hide "Form 2 Consultation Type" Selection in Doctor Triage View**
  - Streamline doctor intake: remove or hide the redundant Form 2 consultation type selector in the doctor triage interface.
- [ ] **2.2 Fast Patient History Lookup for Returning Consultations**
  - Add a dedicated patient name/ID search bar in the consultation workspace.
  - Instantly load past bite incidents, previous vaccine doses, tetanus prophylaxis, and adverse reaction logs for returning patients.

### 3. Doctor Form 2 – Form Field Customizations
- [ ] **3.1 Disable Automatic Pre-filling of Medication Treatment Fields**
  - Turn off medication autofill so doctors manually write or select verified prescriptions per clinical evaluation.
- [ ] **3.2 Free-Text Body Parts Selection**
  - Replace rigid checkboxes/dropdowns with a clean, flexible free-text input allowing precise anatomical notes (e.g., *"Right distal index finger volar aspect"*).
- [ ] **3.3 Animal Type Dropdown with "Others" Free-Text Input**
  - Set default dropdown options to: **Dog** and **Cat**.
  - Add an **"Others"** option.
  - When **"Others"** is selected, reveal a clean free-text input directly underneath (e.g., *Monkey, Bat, Pig, Stray Rat*).

---

## 📦 Tier 2: Vaccine & Supplies Inventory Management (Phase 2)

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

### 9. Reports & Analytics – Summary Dashboard
- [ ] **9.1 Bite Category Filtering on Dashboard**
  - Add multi-category filter dropdown: `All Categories`, `Category I`, `Category II`, `Category III`.
- [ ] **9.2 Metric Overview Cards (6 Key Counters)**
  - [ ] **Total Patients** (Unique patient records)
  - [ ] **Total Bite Cases** (All registered bite incidents)
  - [ ] **New Patients** (First-time clinic registrations in selected period)
  - [ ] **New Cases** (Incidents reported in selected period)
  - [ ] **Completed Cases** (Patients who finished full vaccination regimen)
  - [ ] **On-going Cases** (Patients currently undergoing active vaccination)

### 10. Reports & Analytics – Bite Cases Module
- [ ] **10.1 Top-Right Patient Search Bar**
  - Align patient search bar to the top-right header for quick incident lookup.
- [ ] **10.2 Category Filter Dropdown**
  - Filter bite records by Category I, II, III.
- [ ] **10.3 Animal Type Filter Dropdown**
  - Filter by `Dog`, `Cat`, `Others (Free-text input)`.
- [ ] **10.4 Case Status Filter**
  - Filter by `Completed`, `On-going`, `Cancelled`.

### 11. Reports & Analytics – Patients Module
- [ ] **11.1 Top-Right Patient Search Bar**
  - Search patients by full name, ID, or contact number.
- [ ] **11.2 Registration Date Filter (Month & Year)**
  - Add Month (January–December) and Year dropdown selectors to filter patient intake cohorts.

### 12. Inventory Utilization & Wastage Reports
- [ ] **12.1 Comprehensive Batch Utilization Table**
  - Show: **Batch No.**, **Supplier/Source**, **Received Quantity**, **Quantity Used**, **Remaining Sealed Vials**, **Opened Vial Status** (e.g. 2/3 left), **Beyond-Use / Discarded Vials**, and **Expiry Status**.
- [ ] **12.2 Report Filtering Controls**
  - Filter by Supplier, Vaccine Type, Expiry Condition, and Date Range.

### 13. Print Review – Corporate & DOH Formal Layout
- [ ] **13.1 Strict Filter Mirroring ("Musunod dapat ang filtering in the print")**
  - The printed document must strictly print the filtered dataset active on the screen.
- [ ] **13.2 Formal Corporate / Government DOH Styling**
  - Official clinic letterhead, republic header, generation timestamp, and active filter criteria banner.
  - Structured borders, alternating row tints, summary totals row.
  - Sign-off blocks:
    - *Prepared by: [Clinic Nurse / Inventory Officer]*
    - *Noted & Approved by: [Medical Officer / Doctor in Charge]*

---

## 📱 Tier 5: Mobile Application & Booster Flow (Phase 5)

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
