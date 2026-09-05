# 📚 Project Documentation Index
## Animal Bite Management & Monitoring System (ABTC / RHU)

Welcome to the central documentation repository for the Animal Bite Management System.

---

## 📑 Core Documentation Directories & Files

### 1. 🧪 Testing Guides & Operational Checklists
- **[Clinic Staff Testing Checklist (.docx for Google Docs)](./CLINIC_STAFF_TESTING_CHECKLIST.docx)**:
  - Ready-to-upload Microsoft Word / Google Docs document with formatted tables, checkboxes, and colored headers.
- **[Clinic Staff Testing Checklist (HTML 1-Click Copy)](./CLINIC_STAFF_TESTING_CHECKLIST.html)**:
  - Interactive browser page with a "Copy All to Clipboard" button to paste directly into Google Docs with full formatting.
- **[Clinic Staff Testing Checklist (Markdown)](./CLINIC_STAFF_TESTING_CHECKLIST.md)**:
  - Plain-language testing checklist for doctors, nurses, registration clerks, and non-technical QA testers.
  - Step-by-step instructions for: Admin Setup, Registration (Form 1), Doctor Triage (Form 2), Nurse Treatment (Form 3), Follow-ups, and Safety Guardrails.
- **[Comprehensive 2026 UI Testing Manual](../guide/08-phase-logs-and-testing/UI_TESTING_GUIDE_2026.md)**:
  - Technical QA test matrix (`TC-01` through `TC-14`), test accounts matrix, flowcharts, API triggers, and standardized bug reporting templates.

### 2. 📋 Technical Specifications & Architecture
- **[Digital Vaccination Card Specifications](./DIGITAL_VACCINATION_CARD_SPECS.md)**:
  - Technical design, verification workflows, offline caching logic, multi-patient family profile selection, and QR code verification payload.
- **[Project Roadmap & Tasks Part 2](../tasks/TODO_PART_2.md)**:
  - Active feature implementation status, critical clinical guardrails, PEP Option A scheduling requirements, and inventory safety.
- **[System Architecture & Phase Logs](../guide/README.md)**:
  - Architectural blueprints, clinic templates, mobile app integration, database schemas, and migration logs.

---

## 🔑 Default Test Accounts Quick Reference

| Role | Email | Password | Primary Module |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@clinic.com` | `password123` | Clinic Operating Schedule, System Settings, Staff Management |
| **Registration** | `registration@clinic.com` | `password123` | Patient Enrolment (Form 1), Walk-In Queue Generation |
| **Doctor (Triage)** | `triage@clinic.com` | `password123` | Queue Calling, Clinical Assessment & Bite Grading (Form 2) |
| **Nurse (Treatment)** | `treatment@clinic.com` | `password123` | Vaccination Records (Form 3), Follow-up Check-ins, Inventory |

---

*Last Updated: September 2026*