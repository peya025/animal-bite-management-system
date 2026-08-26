# 📌 Project Tasks & Roadmap

### 📱 Mobile App (Patient Portal)
- [x] Multi-language support (English, Tagalog, Bisaya) with instant reactive switching & persistence.
- [x] Fixed Material & Cupertino fallbacks for regional dialects (RefreshIndicator, DatePicker).
- [x] Calendar View color guide & status indicators (Completed, Scheduled, Missed, Today).
- [x] Non-displacing top pill toast notifications (AppToast).
- [x] Patient Profile Archiving / Dependent Soft-Delete with active appointment checks & history preservation.
- [x] Bite Care Guide enlarged artwork and haircuts correction.
- [x] [**GuidelinesSection / _GuideCard UI Audit & Improvement Plan**](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/guide-cards-ui-audit.md)
  - Accessibility (Font sizes >= 11pt/12sp, WCAG AA 4.5:1 contrast, Semantics labels, textScaler).
  - Localization & string length validation (Tagalog, Cebuano).
  - Design system cleanup (8px grid spacing, AppColors consolidation).
  - Resilience & Offline fail-safe verification.
- [x] [**Mobile Validation & Defensive Architecture Audit**](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/mobile_validation_and_defensive_architecture.md)
  - Input Validation (Philippine mobile regex `^(09|+639)`, birthdate not future, bite date not future, PhilHealth 12-digit rule).
  - Guard Clauses (Double-tap submission throttling, auth guards, positive entity ID checks).
  - Assertions (Constructor date & enum boundary invariants).
  - Immutability (`@immutable` data models, `copyWith`, `List.unmodifiable`).
  - Exception Handling (Structured HTTP 401/422/500 mapping, auto-scroll on form error).
  - Fail-Safe Defaults (Safe enum deserialization, default profile selection).

### 🖥️ Admin Web Portal (Clinic & Doctor Dashboard)
- [x] [**Display & Management of Pre-Registered Patient Profiles in User Management**](file:///c:/xampp/htdocs/abc/animal-bite-management-system/tasks/admin_patient_profiles_management.md)
  - Located under **User Management $\rightarrow$ Patient Accounts**.
  - Interactive profile inspection modal for each mobile user and all linked dependents (Self, Child, Spouse).
  - Shows pre-registered demographic data (DOB, PhilHealth, address) and active treatment status.
  - "Start Bite Intake" quick-launch action for walk-in patients with pre-filled demographics.
- [ ] Multi-language support on Public Patient Kiosk / Web Intake forms.
- [ ] SMS / Push notification webhook triggers for vaccine reminders (Day 3, 7, 28).

---
*Updated on 2026-08-25 for Animal Bite Management System.*
