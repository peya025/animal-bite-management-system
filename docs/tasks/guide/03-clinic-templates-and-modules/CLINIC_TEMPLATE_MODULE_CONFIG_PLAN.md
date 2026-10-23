# Clinic Module & Form Field Configurator + Staff Duty Assignment Matrix Plan

## 📌 Executive Summary
This document outlines the design and technical architecture for the **Clinic Module & Form Field Configurator** and **Staff Duty Assignment Matrix**. It provides clinic administrators with predefined template controls to enable/disable modules (such as Triage), set form field rules (Required, Optional, Hidden/Disabled), and assign staff members to specific operational modules.

---

## 🎯 Objectives & Academic Scope Alignment

### Alignment with Scope & Limitation Document:
> *"To support limited adaptability, the system provides predefined templates and approved configurable settings, allowing clinics to enable or disable selected modules and set approved form fields as visible, required, or optional."*

1. **Predefined Template Customization**:
   - Allows independent clinics (like Tagoloan RHU) to configure module visibility and form field rules without altering core database schemas or code logic.
2. **Role & Module Assignment**:
   - Enables administrators to assign nurses, doctors, and registration staff to specific active modules to ensure focused clinic operations.

---

## 🛠️ Feature Specifications

### 1. Form & Module Template Configurator
- **Master Triage Step Toggle**:
  - `[ENABLE / DISABLE]` **Triage Module Step**.
  - *If Enabled*: Patient queue flow is **Registration → Triage → Treatment → Completed**.
  - *If Disabled*: Patient queue flow is **Registration → Treatment → Completed** (bypassing triage for simplified clinics).
- **Intake & Triage Form Field Controls**:
  - **Bite Location / Site**: `[Required | Optional | Disabled/Hidden]`
  - **Exposure Category (Cat I, II, III)**: `[Required | Optional | Disabled/Hidden]`
  - **Animal Rabies Status (Alive/Dead/Lost)**: `[Required | Optional | Disabled/Hidden]`
  - **PhilHealth & 4Ps Details**: `[Required | Optional | Disabled/Hidden]`
  - **Wound Washing History**: `[Required | Optional | Disabled/Hidden]`

### 2. Staff Duty & Module Assignment Matrix
- **Module Assignment Dropdown per User**:
  - Assign staff members or nurses to designated clinic operational areas:
    - 🟢 **Registration Desk**
    - 🔵 **Triage & Consultation**
    - 🟡 **Treatment & Vaccination**
    - 🟣 **Vaccine Stock Inventory**
    - ⚪ **All Modules (Full Access)**
- **User Role Scope**:
  - Clarifies staff duties during active clinic sessions while preserving Admin oversight.

---

## 🏗️ Technical Architecture & Database Schema

### Database Migrations

#### `clinic_module_configs` Table
```sql
CREATE TABLE clinic_module_configs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    clinic_id BIGINT UNSIGNED NOT NULL,
    triage_module_enabled BOOLEAN DEFAULT TRUE,
    field_rules JSON NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);
```

#### `users` Table Update
```sql
ALTER TABLE users 
ADD COLUMN assigned_module ENUM('all', 'registration', 'triage', 'treatment', 'inventory') DEFAULT 'all' AFTER role;
```

---

## 💻 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/setup/module-config` | Fetch current clinic module toggles & field rules | `Sanctum (All Staff)` |
| `PUT` | `/api/setup/module-config` | Update clinic module toggles & form field rules | `Admin / Developer` |
| `GET` | `/api/users` | List staff members with `assigned_module` | `Admin` |
| `PUT` | `/api/users/{id}` | Update staff member `assigned_module` | `Admin` |

---

## 🎨 User Interface (Frontend Components)

- **Component**: `ClinicTemplateConfigPage.tsx`
- **Location**: `frontend/src/features/developer/pages/ClinicTemplateConfigPage.tsx`
- **Access Route**: `/developer/clinic-templates` (and Admin Settings)

---

## 🧪 Verification & Testing Strategy

1. **Automated Verification**:
   - `php artisan test` — Verifies module configuration endpoints and JSON field rule persistence.
   - `npm run build` — Validates React TypeScript code without compilation errors.
2. **Manual Verification**:
   - Toggle Triage OFF and verify Queue status transitions directly from Registration to Treatment.
   - Set a field (e.g., PhilHealth MDR) to Disabled and verify it hides cleanly on patient intake forms.
