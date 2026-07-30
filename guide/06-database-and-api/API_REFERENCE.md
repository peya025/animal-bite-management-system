# API Reference - Animal Bite Management System

## 📡 Base URL

```
http://localhost:8000/api
```

For production: `https://your-clinic-domain.com/api`

---

## 🔐 Authentication

All protected endpoints require Bearer token authentication.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

---

## 📚 Complete API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/login` | Public | Login user |
| POST | `/logout` | Auth | Logout user |
| GET | `/me` | Auth | Get current user info |
| GET | `/test` | Public | Test API status |

---

### Clinic Setup

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/setup/status` | Admin | Check setup status |
| PUT | `/setup/clinic` | Admin | Update clinic info |
| POST | `/setup/complete` | Admin | Complete setup |

---

### User Management

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users` | Admin | List all users |
| POST | `/users` | Admin | Create new user |
| GET | `/users/{id}` | Admin | Get user details |
| PUT | `/users/{id}` | Admin | Update user |
| DELETE | `/users/{id}` | Admin | Delete user |

---

### Staff Invitations

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/invitations` | Admin | Send invitation |
| GET | `/invitations` | Admin | List invitations |
| POST | `/invitations/{id}/cancel` | Admin | Cancel invitation |
| GET | `/invitations/{token}/validate` | Public | Validate token |
| POST | `/invitations/{token}/accept` | Public | Accept invitation |

---

### Patient Management

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/patients` | All | List patients (with search) |
| POST | `/patients` | Admin, Registration | Register new patient |
| GET | `/patients/{id}` | All | Get patient details |
| PUT | `/patients/{id}` | Admin, Registration | Update patient |
| DELETE | `/patients/{id}` | Admin | Delete patient |
| GET | `/patients/{id}/cases` | All | Get patient's bite cases |
| GET | `/patients/{id}/vaccinations` | All | Get patient's vaccinations |

**Query Parameters for GET `/patients`:**
- `search` - Search by name, patient number, or contact
- `gender` - Filter by gender (male/female)
- `sort_by` - Sort field (default: created_at)
- `sort_order` - asc or desc (default: desc)
- `per_page` - Items per page (default: 15)

---

### Bite Case Management

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/cases` | All | List all bite cases |
| POST | `/cases` | Admin, Triage | Create bite case + auto-schedule |
| GET | `/cases/{id}` | All | Get case details |
| PUT | `/cases/{id}` | Admin, Triage | Update case |
| DELETE | `/cases/{id}` | Admin | Delete case |
| GET | `/cases/{id}/vaccinations` | All | Get case vaccinations |
| GET | `/cases/statistics` | All | Get bite case statistics |

**Query Parameters for GET `/cases`:**
- `status` - Filter by status (active/completed/referred/abandoned)
- `from_date` - Filter from bite date
- `to_date` - Filter to bite date
- `search` - Search by case number or patient name

---

### Vaccination Management

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/vaccinations` | All | List all schedules |
| GET | `/vaccinations/today` | All | Today's vaccinations |
| GET | `/vaccinations/upcoming` | All | Upcoming vaccinations |
| GET | `/vaccinations/overdue` | All | Overdue vaccinations |
| GET | `/vaccinations/statistics` | All | Vaccination statistics |
| GET | `/vaccinations/{id}` | All | Get schedule details |
| POST | `/vaccinations/{id}/administer` | Admin, Treatment | Record administration |
| PUT | `/vaccinations/{id}` | Admin, Triage | Update schedule |
| POST | `/vaccinations/{id}/missed` | Admin, Treatment | Mark as missed |
| POST | `/vaccinations/{id}/reschedule` | Admin, Triage | Reschedule dose |

**Query Parameters for GET `/vaccinations`:**
- `status` - Filter by status (scheduled/completed/missed/rescheduled)
- `from_date` - Filter from date
- `to_date` - Filter to date
- `patient_id` - Filter by patient

**Query Parameters for GET `/vaccinations/upcoming`:**
- `days` - Number of days ahead (default: 7)

---

### Queue Management

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/queue` | Admin, Registration, Triage | Today's queue |
| GET | `/queue/waiting` | Admin, Registration, Triage | Waiting patients only |
| GET | `/queue/next` | Admin, Registration, Triage | Next patient in queue |
| GET | `/queue/statistics` | Admin, Registration, Triage | Queue statistics |
| POST | `/queue` | Admin, Registration | Add patient to queue |
| GET | `/queue/{id}` | Admin, Registration, Triage | Get queue entry |
| POST | `/queue/{id}/call` | Admin, Triage | Call patient |
| POST | `/queue/{id}/complete` | Admin, Triage | Complete consultation |
| POST | `/queue/{id}/cancel` | Admin, Registration | Cancel queue entry |
| PUT | `/queue/{id}/priority` | Admin, Registration, Triage | Update priority |

**Query Parameters for GET `/queue`:**
- `date` - Queue date (default: today)

**Query Parameters for GET `/queue/statistics`:**
- `date` - Statistics date (default: today)

---

## 📋 Request/Response Examples

### Login

**Request:**
```json
POST /api/login
{
  "email": "admin@clinic.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@clinic.com",
    "role": "admin",
    "clinic": {
      "id": 1,
      "name": "Animal Bite Center"
    }
  },
  "token": "1|xxxxx",
  "token_type": "Bearer"
}
```

---

### Register Patient

**Request:**
```json
POST /api/patients
{
  "name": "Juan Dela Cruz",
  "gender": "male",
  "age": 35,
  "date_of_birth": "1989-01-15",
  "address": "123 Main St, Manila",
  "contact_number": "09171234567",
  "emergency_contact_name": "Maria Dela Cruz",
  "emergency_contact_number": "09187654321"
}
```

**Response:**
```json
{
  "message": "Patient registered successfully",
  "patient": {
    "patient_id": 1,
    "patient_number": "P-2024-0001",
    "name": "Juan Dela Cruz",
    "gender": "male",
    "age": 35,
    ...
  }
}
```

---

### Create Bite Case

**Request:**
```json
POST /api/cases
{
  "patient_id": 1,
  "bite_date": "2024-06-17",
  "bite_place": "Right hand",
  "site_washed": true,
  "exposure_type": "bite",
  "severity": "moderate",
  "animal_type": "dog",
  "animal_status": "stray",
  "animal_captured": false,
  "wound_description": "Puncture wound on palm"
}
```

**Response:**
```json
{
  "message": "Bite case created successfully",
  "incident": {
    "bite_id": 1,
    "case_number": "BC-2024-0001",
    "patient": {...},
    "vaccination_schedules": [
      {"dose_number": 0, "scheduled_date": "2024-06-17"},
      {"dose_number": 1, "scheduled_date": "2024-06-20"},
      {"dose_number": 2, "scheduled_date": "2024-06-24"},
      {"dose_number": 3, "scheduled_date": "2024-07-01"},
      {"dose_number": 4, "scheduled_date": "2024-07-15"}
    ]
  },
  "who_category": "Category II",
  "vaccination_required": true
}
```

---

### Record Vaccination

**Request:**
```json
POST /api/vaccinations/1/administer
{
  "vaccine_brand": "Verorab",
  "vaccine_batch_number": "VAC-2024-001",
  "vaccine_expiry_date": "2025-12-31",
  "injection_site": "left_deltoid",
  "dosage_ml": 0.5,
  "adverse_reaction": "None",
  "administration_notes": "Patient tolerated well"
}
```

**Response:**
```json
{
  "message": "Vaccination recorded successfully",
  "schedule": {
    "id": 1,
    "status": "completed",
    "administered_at": "2024-06-17T10:30:00Z",
    "administered_by": 4,
    "vaccine_brand": "Verorab",
    "vaccine_batch_number": "VAC-2024-001",
    ...
  }
}
```

---

## 🔒 Role-Based Access Control

| Role | Can Do |
|------|--------|
| **Admin** | Everything |
| **Registration** | Register patients, manage queue, view data |
| **Triage** | Manage queue, create bite cases, schedule vaccinations, view data |
| **Treatment** | Record vaccination administration, mark as missed, view data |

---

## ❌ Error Responses

### 401 Unauthenticated
```json
{
  "message": "Unauthenticated"
}
```

### 403 Unauthorized
```json
{
  "message": "Unauthorized. This action requires admin role."
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "name": ["The name field is required."],
    "email": ["The email has already been taken."]
  }
}
```

### 500 Server Error
```json
{
  "message": "Server Error",
  "error": "Error details..."
}
```

---

## 📊 Pagination Response Format

```json
{
  "current_page": 1,
  "data": [...],
  "first_page_url": "http://localhost:8000/api/patients?page=1",
  "from": 1,
  "last_page": 3,
  "last_page_url": "http://localhost:8000/api/patients?page=3",
  "next_page_url": "http://localhost:8000/api/patients?page=2",
  "path": "http://localhost:8000/api/patients",
  "per_page": 15,
  "prev_page_url": null,
  "to": 15,
  "total": 45
}
```

---

## 🎯 Quick Reference

### Patient Number Format
```
P-YYYY-####
Example: P-2024-0001
```

### Case Number Format
```
BC-YYYY-####
Example: BC-2024-0001
```

### Queue Number Format
```
Daily: 1, 2, 3, 4...
Resets every day per clinic
```

### WHO Vaccination Schedule
```
Dose 0: Day 0 (bite date)
Dose 1: Day 3
Dose 2: Day 7
Dose 3: Day 14
Dose 4: Day 28
```

---

For more details, see:
- **PHASE4_TESTING.md** - Complete testing guide
- **WHO_PROTOCOL_IMPLEMENTATION.md** - WHO compliance details
- **SANCTUM_CORS_SETUP.md** - Authentication setup
