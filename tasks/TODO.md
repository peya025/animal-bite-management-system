# 📌 Project Tasks & Roadmap

---

## 🎯 Priority Tasks for Tomorrow

### 1. 👥 [Admin Patient Profiles & Pre-Registration Management](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/admin_patient_profiles_management.md)
* **Location**: Admin Web Portal $\rightarrow$ **User Management** $\rightarrow$ **Patient Accounts**.
* **Key Features**:
  - Interactive profile inspection modal for each mobile user and all linked dependents (`self`, `child`, `spouse`, `parent`, `other`).
  - Pre-registered demographic inspection (DOB, PhilHealth, complete address, emergency contacts).
  - Quick-launch **"Start Bite Intake"** / **"Verify & Link to Master Record"** action for walk-ins with pre-filled demographics.
  - Active PEP course and historical vaccination summary badges per dependent.

### 2. 🔄 [Case Continuity & Re-Exposure Booster Protocol with Mitigations](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/case-continuity-and-reexposure-protocol-with-mitigations.md)
* **Location**: Doctor Triage Desk, Treatment Desk & Master Patient Record.
* **Key Features**:
  - DOH/WHO re-exposure decision matrix ($<3$ months vs $\ge 3$ months post-PEP).
  - Day 0 & Day 3 Booster Regimen (no RIG required for previously fully immunized patients).
  - Incident continuity linking: multiple bite incidents under a single master patient profile without data fragmentation.
  - Clinical risk mitigations (detecting incomplete past regimens, immunocompromised status, and inverted dose chronologies).

### 3. 🗺️ [Patient PEP Journey Tracking, Flexible Navigation & Multi-Channel Missed Recall](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/patient_pep_journey_tracking_and_multi_channel_missed_recall.md)
* **Location**: Treatment Desk, Registration Desk & Patient Mobile Portal.
* **Key Features**:
  - Visual PEP Stepper Matrix (`Day 0` $\rightarrow$ `Day 3` $\rightarrow$ `Day 7` $\rightarrow$ `Day 28`) showing completed, due today, scheduled, and missed doses.
  - Clean separation and dedicated filters for **Walk-In Queue**, **Online Scheduled Appointments**, and **Overdue / Missed Injections**.
  - Dynamic schedule flexibility respecting admin operating hours and holiday drift.
  - 1-Click Multi-Channel Recall Action (SMS, Email, Push Notification) with customizable clinic templates.

---

## 📱 Mobile App (Patient Portal) — Completed
- [x] Multi-language support (English, Tagalog, Bisaya) with instant reactive switching & persistence.
- [x] Fixed Material & Cupertino fallbacks for regional dialects (RefreshIndicator, DatePicker).
- [x] Calendar View color guide & status indicators (Completed, Scheduled, Missed, Today).
- [x] Non-displacing top pill toast notifications (AppToast).
- [x] Patient Profile Archiving / Dependent Soft-Delete with active appointment checks & history preservation.
- [x] Bite Care Guide enlarged artwork and haircuts correction.
- [x] Dynamic operating schedule integration (`/schedule-summary` & closed-day calendar disabling).
- [x] Dynamic clinic working hours in time slot picker.
- [x] [**GuidelinesSection / _GuideCard UI Audit & Improvement Plan**](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/guide-cards-ui-audit.md)
- [x] [**Mobile Validation & Defensive Architecture Audit**](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/mobile_validation_and_defensive_architecture.md)

---

## 🖥️ Admin & Clinical Web Portal — Completed
- [x] Clinic Operating Schedule Matrix & 1-Click Existing Appointment Recalculation.
- [x] Developer / Admin Appointment Bug Catcher & Real-Time Health Diagnostics (`/developer/appointment-diagnostics`).
- [x] Registration Desk station gating (Initial Day 0 Triage routing vs Direct Treatment for follow-ups).
- [x] Treatment Desk Form 2 Doctor Assessment gatekeeper.
- [x] Single-day queue token refresh and midnight auto-expiry of stale tickets.
- [x] Today's Queue set as default primary tab on Registration Desk.
- [x] Complete ABTC Clinical Workflow Specification at [`workflow/abtc_patient_lifecycle_and_station_routing_workflow.md`](file:///c:/xampp/htdocs/abc/animal-bite-management-system/workflow/abtc_patient_lifecycle_and_station_routing_workflow.md).

---
*Updated on 2026-08-29 for Animal Bite Management System.*
