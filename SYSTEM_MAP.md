# System Map - Visual Overview

## 🗺️ Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ANIMAL BITE MANAGEMENT SYSTEM                │
│                    Single-Clinic-Per-Installation                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                    http://localhost:5173                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Login      │  │    Setup     │  │  Dashboard   │         │
│  │   Page       │──│    Wizard    │──│   (Role-     │         │
│  │              │  │  (Admin)     │  │    Based)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ADMIN DASHBOARD                              │  │
│  │  • Clinic Settings                                        │  │
│  │  • User Management                                        │  │
│  │  • Send Invitations                                       │  │
│  │  • View All Data                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          REGISTRATION STAFF DASHBOARD                     │  │
│  │  • Register Patients                                      │  │
│  │  • Search Patients                                        │  │
│  │  • Add to Queue                                           │  │
│  │  • Print Queue Tickets                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           TRIAGE/DOCTOR DASHBOARD                         │  │
│  │  • View Queue                                             │  │
│  │  • Call Next Patient                                      │  │
│  │  • Create Bite Cases                                      │  │
│  │  • Schedule Vaccinations                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        TREATMENT RECORDING DASHBOARD                      │  │
│  │  • View Today's Vaccinations                              │  │
│  │  • Record Administration                                  │  │
│  │  • Enter Batch Numbers                                    │  │
│  │  • Mark Doses Complete                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Axios HTTP Requests
                              │ Bearer Token Auth
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (Laravel)                          │
│                    http://localhost:8000                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   API ROUTES                              │  │
│  │                                                            │  │
│  │  PUBLIC:                                                   │  │
│  │    POST /api/login                                        │  │
│  │    POST /api/invitations/{token}/accept                   │  │
│  │                                                            │  │
│  │  PROTECTED (auth:sanctum):                                │  │
│  │    POST /api/logout                                       │  │
│  │    GET  /api/me                                           │  │
│  │                                                            │  │
│  │  ADMIN ONLY:                                              │  │
│  │    POST /api/setup/complete                               │  │
│  │    GET  /api/users                                        │  │
│  │    POST /api/invitations                                  │  │
│  │                                                            │  │
│  │  REGISTRATION + ADMIN:                                    │  │
│  │    POST /api/patients                                     │  │
│  │    POST /api/queue                                        │  │
│  │                                                            │  │
│  │  TRIAGE + ADMIN:                                          │  │
│  │    POST /api/cases                                        │  │
│  │    POST /api/vaccinations                                 │  │
│  │                                                            │  │
│  │  TREATMENT + ADMIN:                                       │  │
│  │    GET  /api/vaccinations/today                           │  │
│  │    PUT  /api/vaccinations/{id}                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   CONTROLLERS                             │  │
│  │                                                            │  │
│  │  • AuthController                                         │  │
│  │  • ClinicSetupController                                  │  │
│  │  • UserController                                         │  │
│  │  • StaffInvitationController                              │  │
│  │  • PatientController                                      │  │
│  │  • BiteCaseController                                     │  │
│  │  • VaccinationController                                  │  │
│  │  • QueueController                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      MODELS                               │  │
│  │                                                            │  │
│  │  • Clinic                                                 │  │
│  │  • User                                                   │  │
│  │  • StaffInvitation                                        │  │
│  │  • Patient                                                │  │
│  │  • BiteCase                                               │  │
│  │  • VaccinationSchedule                                    │  │
│  │  • PatientQueue                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Eloquent ORM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (MySQL)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                │
│  │   clinics   │  (Single clinic per installation)             │
│  └──────┬──────┘                                                │
│         │ 1                                                     │
│         │                                                       │
│         │ *                                                     │
│  ┌──────┴──────┐         ┌─────────────────┐                  │
│  │    users    │────*────│ staff_invitations│                  │
│  └──────┬──────┘         └─────────────────┘                  │
│         │                                                       │
│         │ registered_by                                         │
│         │                                                       │
│         │ *                                                     │
│  ┌──────┴──────┐                                                │
│  │  patients   │  (P-2024-0001)                                │
│  └──────┬──────┘                                                │
│         │ 1                                                     │
│         │                                                       │
│         │ *                                                     │
│  ┌──────┴──────────┐                                            │
│  │   bite_cases    │  (BC-2024-0001)                           │
│  └──────┬──────────┘                                            │
│         │ 1                                                     │
│         │                                                       │
│         │ *                                                     │
│  ┌──────┴─────────────────┐                                     │
│  │ vaccination_schedules  │  (5 doses per case)                │
│  └────────────────────────┘                                     │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │  patient_queue  │  (Daily queue)                            │
│  └─────────────────┘                                            │
│                                                                  │
│  ┌──────────────────────┐                                       │
│  │ personal_access_tokens│ (Sanctum)                           │
│  └──────────────────────┘                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### 1. Authentication Flow

```
┌──────────────┐
│   User       │
│  (Browser)   │
└──────┬───────┘
       │ 1. POST /api/login
       │    {email, password}
       ▼
┌──────────────────┐
│  AuthController  │
│                  │
│  • Validate      │
│  • Check active  │
│  • Create token  │
└──────┬───────────┘
       │ 2. Save token
       ▼
┌──────────────────┐
│ personal_access_ │
│     tokens       │
└──────┬───────────┘
       │ 3. Return token
       ▼
┌──────────────────┐
│   Frontend       │
│  Store in        │
│  localStorage    │
└──────────────────┘
```

### 2. Patient Registration Flow

```
Registration Staff
       │
       │ 1. Fill form
       ▼
┌──────────────────┐
│ POST /api/patients│
│                   │
│ {first_name,      │
│  last_name,       │
│  phone, etc}      │
└─────────┬─────────┘
          │
          │ 2. Auto-generate
          ▼
┌─────────────────────┐
│ Patient::boot()     │
│ generateNumber()    │
│ → P-2024-0001      │
└─────────┬───────────┘
          │
          │ 3. Save to DB
          ▼
┌─────────────────────┐
│   patients table    │
└─────────────────────┘
```

### 3. Queue to Treatment Flow

```
┌─────────────────┐
│ Registration    │ 1. Add to queue
│ Staff           │───────────────────┐
└─────────────────┘                   │
                                      ▼
                            ┌─────────────────┐
                            │ patient_queue   │
                            │ status: waiting │
                            └────────┬────────┘
                                     │
                                     │ 2. View queue
                            ┌────────┴────────┐
                            │ Triage Staff    │
                            │ Call patient    │
                            └────────┬────────┘
                                     │
                                     │ 3. Create case
                            ┌────────┴────────┐
                            │  bite_cases     │
                            │ BC-2024-0001    │
                            └────────┬────────┘
                                     │
                                     │ 4. Schedule vaccinations
                            ┌────────┴──────────────────┐
                            │ vaccination_schedules     │
                            │ Dose 1: Day 0 (today)     │
                            │ Dose 2: Day 3             │
                            │ Dose 3: Day 7             │
                            │ Dose 4: Day 14            │
                            │ Dose 5: Day 28            │
                            └────────┬──────────────────┘
                                     │
                                     │ 5. View today's schedule
                            ┌────────┴────────┐
                            │ Treatment Staff │
                            │ Record admin    │
                            └────────┬────────┘
                                     │
                                     │ 6. Mark completed
                            ┌────────┴────────────┐
                            │ vaccination_schedules│
                            │ status: completed   │
                            │ batch_number: xxx   │
                            └─────────────────────┘
```

### 4. Staff Invitation Flow

```
┌─────────────┐
│   Admin     │ 1. POST /api/invitations
└──────┬──────┘    {email, role}
       │
       ▼
┌──────────────────────┐
│ StaffInvitation      │ 2. Generate token
│ • Generate 64-char   │    Expire: +7 days
│ • Save to DB         │
└──────┬───────────────┘
       │
       │ 3. Send email
       ▼
┌──────────────────────┐
│  Email System        │
│  (SMTP/Mailtrap)     │
└──────┬───────────────┘
       │
       │ 4. Email with link
       ▼
┌──────────────────────┐
│   Staff Member       │
│   Clicks link        │
└──────┬───────────────┘
       │
       │ 5. GET /invitations/{token}
       ▼
┌──────────────────────┐
│  Validate Token      │
│  • Not expired?      │
│  • Status pending?   │
└──────┬───────────────┘
       │
       │ 6. POST /invitations/{token}/accept
       │    {name, password}
       ▼
┌──────────────────────┐
│  Create User         │
│  • Save to users     │
│  • Link clinic_id    │
│  • Mark invitation   │
│    accepted          │
└──────┬───────────────┘
       │
       │ 7. Auto-login
       ▼
┌──────────────────────┐
│   Dashboard          │
│   (Role-based)       │
└──────────────────────┘
```

---

## 🎯 Component Interaction Map

```
                    ┌─────────────────────┐
                    │   React Frontend    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼─────────┐  ┌──▼───────┐  ┌────▼─────┐
    │   Auth Context    │  │  Axios   │  │  Router  │
    │   • user          │  │  Client  │  │  • Routes│
    │   • clinic        │  │  • API   │  │  • Guard │
    │   • isAdmin       │  │  • Token │  │          │
    └───────────────────┘  └──────────┘  └──────────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   API Endpoints     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼─────────┐  ┌──▼──────────┐  ┌─▼────────┐
    │   Middleware      │  │ Controllers  │  │  Models  │
    │   • Sanctum       │  │ • Auth       │  │ • User   │
    │   • Role Check    │  │ • Patient    │  │ • Patient│
    │   • Setup Check   │  │ • Case       │  │ • Case   │
    └───────────────────┘  └──────────────┘  └──────────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   MySQL Database    │
                    └─────────────────────┘
```

---

## 🔐 Security Layers

```
┌───────────────────────────────────────────────────┐
│              REQUEST FLOW                         │
└───────────────────────────────────────────────────┘

1. Frontend Request
   └─→ Include: Authorization: Bearer {token}

2. Laravel Middleware Stack
   ├─→ Sanctum Middleware
   │   ├─→ Validate token
   │   ├─→ Load user
   │   └─→ Check expiration
   │
   ├─→ Check User Status
   │   └─→ is_active = true?
   │
   ├─→ Check Clinic Setup
   │   └─→ is_setup_complete?
   │
   └─→ Check Role Permission
       └─→ Has required role?

3. Controller
   └─→ Business logic
       └─→ Database query (clinic_id scoped)

4. Response
   └─→ JSON data
```

---

## 📊 Database Relationships

```
clinics (1)
    │
    ├──→ users (*)
    │       │
    │       ├──→ staff_invitations (*) [invited_by]
    │       ├──→ patients (*) [registered_by]
    │       ├──→ bite_cases (*) [created_by]
    │       ├──→ vaccination_schedules (*) [administered_by]
    │       └──→ patient_queue (*) [checked_in_by, handled_by]
    │
    ├──→ patients (*)
    │       │
    │       ├──→ bite_cases (*)
    │       │       │
    │       │       └──→ vaccination_schedules (*)
    │       │
    │       └──→ patient_queue (*)
    │
    └──→ staff_invitations (*)
```

---

This system map provides a visual overview of the entire architecture, helping developers understand how components interact and data flows through the system.
