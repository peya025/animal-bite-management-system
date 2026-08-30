# 📌 Project Tasks & Roadmap

---

## 🎯 Priority Tasks for Tomorrow

### 1. ✅ [Admin Patient Profiles & Pre-Registration Management](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/admin_patient_profiles_management.md) — *COMPLETED*
* **Location**: Admin Web Portal $\rightarrow$ **User Management** $\rightarrow$ **Patient Accounts** & **Patient Directory** (`/patients`).
* **Delivered Features**:
  - Interactive profile inspection modal for mobile accounts and all linked dependents (`self`, `child`, `spouse`, `parent`, `other`) with Hugeicons and emergency contacts.
  - Fixed `patient_id` navigation bug so profiles and bite intakes link directly to master records without 404s.
  - In-place `<PatientDetailsModal>` popup inspection directly from User Management.
  - Added dedicated **`Pre-Registered (Mobile)`** tab filter on Patient Directory (`/patients`).
  - 1-Click **"Start Bite Intake"** action fast-tracking pre-registered mobile walk-ins directly into clinical triage.

### 2. ✅ [Case Continuity & Re-Exposure Booster Protocol with Mitigations](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/case-continuity-and-reexposure-protocol-with-mitigations.md) — *COMPLETED*
* **Location**: Doctor Triage Desk, Treatment Desk (Form 3), Master Patient Record (`<PatientDetailsModal>`) & Transfer Operations.
* **Delivered Features**:
  - **Multi-Episode Incident Continuity**: Returning patients keep all past bite incidents under a single master profile (`episode_number`, `episode_type`, history switcher).
  - **Automated Immunization History Detection**: Server evaluates previous completed PEP series with confidence scoring (`system_record` vs `external_certificate_reviewed` vs `patient_self_report_unverified`).
  - **DOH/WHO 2-Dose Booster Regimen**: Day 0 and Day 3 follow-up only (omitting Days 7 & 28; RIG safely withheld with clinical reason audit).
  - **Historical Administered Dose Immutability**: Existing administered treatment records are strictly locked against retroactive modification or cascade date overwrites.
  - **Cross-Clinic Continuity (Incoming Transfers)**: Support recording external doses (`is_external: true`, zero inventory stock deduction, remaining doses auto-scheduled).
  - **Cross-Clinic Continuity (Outgoing Transfers)**: 1-Click DOH Referral & Transfer Certificate Modal (`<DohTransferSlipModal>`) with auto-cancellation of pending local appointments.

### 3. ✅ [Patient PEP Journey Tracking, Flexible Navigation & Multi-Channel Missed Recall](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/patient_pep_journey_tracking_and_multi_channel_missed_recall.md) — *COMPLETED*
* **Location**: Treatment Desk (`/vaccinations`), Registration Desk & Patient Mobile Portal.
* **Delivered Features**:
  - Visual PEP Stepper Matrix (`Day 0` $\rightarrow$ `Day 3` $\rightarrow$ `Day 7` $\rightarrow$ `Day 28`) showing completed, due today, scheduled, and missed doses.
  - Clean separation and dedicated tabs for **PEP Stepper Matrix**, **Today's Injections**, **Online Bookings**, and **Missed / Defaulter Recall**.
  - 1-Click Multi-Channel Recall Engine (SMS, Email, In-App Push Notifications) with customizable clinic templates and audit logs in `appointment_reminders`.
  - Batch recall action: `Recall All Missed (N)`.

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
