# Phase 4 Testing Guide - Complete Workflow

## ✅ Phase 4 Complete!

### What We Built:
1. ✅ `PatientController` - Full CRUD + search
2. ✅ `BiteCaseController` - Bite case management + WHO protocol
3. ✅ `VaccinationController` - Schedule management + administration
4. ✅ `QueueController` - Daily queue management
5. ✅ Complete API routes with role-based access
6. ✅ Auto-number generation working
7. ✅ WHO protocol automation

---

## 🧪 Complete Workflow Testing

### Setup: Login and Get Token

```bash
# Login as Admin
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinic.com","password":"password123"}'
```

**Save the token!** Use it in all subsequent requests as:
```
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 1️⃣ Patient Management

### Register New Patient

```bash
curl -X POST http://localhost:8000/api/patients \
  -H "Authorization: Bearer 8|WO7TL8NXfAALM4EbtbRNxLBYxfAnUx8Gf8uoy1Vo6933f17d" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Dela Cruz",
    "gender": "male",
    "age": 35,
    "date_of_birth": "1989-01-15",
    "address": "123 Main St, Manila",
    "contact_number": "09171234567",
    "emergency_contact_name": "Maria Dela Cruz",
    "emergency_contact_number": "09187654321"
  }'
```

**Expected Response:**
```json
{
  "message": "Patient registered successfully",
  "patient": {
    "patient_id": 1,
    "patient_number": "P-2024-0001",  // Auto-generated!
    "name": "Juan Dela Cruz",
    ...
  }
}
```

### List All Patients

```bash
curl -X GET http://localhost:8000/api/patients \
  -H "Authorization: Bearer 8|WO7TL8NXfAALM4EbtbRNxLBYxfAnUx8Gf8uoy1Vo6933f17d"
```

### Search Patients

```bash
curl -X GET "http://localhost:8000/api/patients?search=Juan" \
  -H "Authorization: Bearer 8|WO7TL8NXfAALM4EbtbRNxLBYxfAnUx8Gf8uoy1Vo6933f17d"
```

### Get Patient Details

```bash
curl -X GET http://localhost:8000/api/patients/1 \
  -H "Authorization: Bearer 8|WO7TL8NXfAALM4EbtbRNxLBYxfAnUx8Gf8uoy1Vo6933f17d"
```

---

## 2️⃣ Queue Management

### Add Patient to Queue

```bash
curl -X POST http://localhost:8000/api/queue \
  -H "Authorization: Bearer 8|WO7TL8NXfAALM4EbtbRNxLBYxfAnUx8Gf8uoy1Vo6933f17d" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "visit_type": "new_case",
    "priority": "normal",
    "check_in_notes": "First visit for dog bite"
  }'
```

**Expected Response:**
```json
{
  "message": "Patient added to queue successfully",
  "queue": {
    "id": 1,
    "queue_number": 1,  // Auto-generated! Resets daily
    "queue_date": "2024-06-17",
    "status": "waiting"
  }
}
```

### View Today's Queue

```bash
curl -X GET http://localhost:8000/api/queue \
  -H "Authorization: Bearer 8|WO7TL8NXfAALM4EbtbRNxLBYxfAnUx8Gf8uoy1Vo6933f17d"
```

### Get Next Patient (Triage Staff)

```bash
curl -X GET http://localhost:8000/api/queue/next \
  -H "Authorization: Bearer 8|WO7TL8NXfAALM4EbtbRNxLBYxfAnUx8Gf8uoy1Vo6933f17d"
```

### Call Patient from Queue (Triage)

```bash
curl -X POST http://localhost:8000/api/queue/1/call \
  -H "Authorization: Bearer 8|WO7TL8NXfAALM4EbtbRNxLBYxfAnUx8Gf8uoy1Vo6933f17d"
```

**Status changes:** `waiting` → `in_consultation`

---

## 3️⃣ Bite Case Management

### Create Bite Case (Auto-generates Vaccination Schedule!)

```bash
curl -X POST http://localhost:8000/api/cases \
  -H "Authorization: Bearer 8|WO7TL8NXfAALM4EbtbRNxLBYxfAnUx8Gf8uoy1Vo6933f17d" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

**Expected Response:**
```json
{
  "message": "Bite case created successfully",
  "incident": {
    "bite_id": 1,
    "case_number": "BC-2024-0001",  // Auto-generated!
    "who_category": "Category II",
    "vaccination_schedules": [
      {"dose_number": 0, "scheduled_date": "2024-06-17"},  // Day 0
      {"dose_number": 1, "scheduled_date": "2024-06-20"},  // Day 3
      {"dose_number": 2, "scheduled_date": "2024-06-24"},  // Day 7
      {"dose_number": 3, "scheduled_date": "2024-07-01"},  // Day 14
      {"dose_number": 4, "scheduled_date": "2024-07-15"}   // Day 28
    ]
  },
  "who_category": "Category II",
  "vaccination_required": true
}
```

**🎉 Magic!** The system automatically:
- Generates case number (BC-2024-0001)
- Determines WHO category
- Creates 5-dose vaccination schedule
- Calculates dates based on WHO protocol

### List All Bite Cases

```bash
curl -X GET http://localhost:8000/api/cases \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Case Details

```bash
curl -X GET http://localhost:8000/api/cases/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter Cases by Status

```bash
curl -X GET "http://localhost:8000/api/cases?status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Complete Consultation (Triage)

```bash
curl -X POST http://localhost:8000/api/queue/1/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consultation_notes": "Bite case created, vaccination scheduled"}'
```

---

## 4️⃣ Vaccination Management

### View Today's Vaccinations (Treatment Staff)

```bash
curl -X GET http://localhost:8000/api/vaccinations/today \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View All Schedules for a Patient

```bash
curl -X GET http://localhost:8000/api/patients/1/vaccinations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Upcoming Vaccinations (Next 7 Days)

```bash
curl -X GET http://localhost:8000/api/vaccinations/upcoming \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Record Vaccination Administration (Treatment Staff)

```bash
curl -X POST http://localhost:8000/api/vaccinations/1/administer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vaccine_brand": "Verorab",
    "vaccine_batch_number": "VAC-2024-001",
    "vaccine_expiry_date": "2025-12-31",
    "injection_site": "left_deltoid",
    "dosage_ml": 0.5,
    "adverse_reaction": "None observed",
    "administration_notes": "Patient tolerated well"
  }'
```

**Expected Response:**
```json
{
  "message": "Vaccination recorded successfully",
  "schedule": {
    "status": "completed",
    "administered_at": "2024-06-17T10:30:00Z",
    "administered_by": 4  // Treatment staff user_id
  }
}
```

### Mark Vaccination as Missed

```bash
curl -X POST http://localhost:8000/api/vaccinations/2/missed \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Patient did not show up"}'
```

### Reschedule Vaccination

```bash
curl -X POST http://localhost:8000/api/vaccinations/2/reschedule \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_date": "2024-06-25",
    "reason": "Patient requested different date"
  }'
```

---

## 5️⃣ Statistics & Reports

### Bite Case Statistics

```bash
curl -X GET http://localhost:8000/api/cases/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "total_cases": 10,
  "active_cases": 7,
  "completed_cases": 3,
  "by_severity": {
    "minor": 2,
    "moderate": 5,
    "severe": 3
  },
  "by_animal_type": {
    "dog": 8,
    "cat": 2
  }
}
```

### Vaccination Statistics

```bash
curl -X GET http://localhost:8000/api/vaccinations/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Queue Statistics

```bash
curl -X GET http://localhost:8000/api/queue/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Complete Workflow Example

### Scenario: New Dog Bite Patient

```bash
# Step 1: Registration Staff - Register Patient
curl -X POST http://localhost:8000/api/patients \
  -H "Authorization: Bearer REGISTRATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","gender":"male","age":30,...}'

# Step 2: Registration Staff - Add to Queue
curl -X POST http://localhost:8000/api/queue \
  -H "Authorization: Bearer REGISTRATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,"visit_type":"new_case"}'

# Step 3: Triage Staff - Get Next Patient
curl -X GET http://localhost:8000/api/queue/next \
  -H "Authorization: Bearer TRIAGE_TOKEN"

# Step 4: Triage Staff - Call Patient
curl -X POST http://localhost:8000/api/queue/1/call \
  -H "Authorization: Bearer TRIAGE_TOKEN"

# Step 5: Triage Staff - Create Bite Case
curl -X POST http://localhost:8000/api/cases \
  -H "Authorization: Bearer TRIAGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,"bite_date":"2024-06-17",...}'
# 🎉 Vaccination schedule auto-created!

# Step 6: Triage Staff - Complete Consultation
curl -X POST http://localhost:8000/api/queue/1/complete \
  -H "Authorization: Bearer TRIAGE_TOKEN"

# Step 7: Treatment Staff (Later) - View Today's Vaccinations
curl -X GET http://localhost:8000/api/vaccinations/today \
  -H "Authorization: Bearer TREATMENT_TOKEN"

# Step 8: Treatment Staff - Record Vaccination
curl -X POST http://localhost:8000/api/vaccinations/1/administer \
  -H "Authorization: Bearer TREATMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vaccine_brand":"Verorab","vaccine_batch_number":"VAC-001",...}'
```

---

## 🔐 Role-Based Access Testing

### Test Registration Staff Can't Create Bite Cases

```bash
# Login as registration staff
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"registration@clinic.com","password":"password123"}'

# Try to create bite case (should fail)
curl -X POST http://localhost:8000/api/cases \
  -H "Authorization: Bearer REGISTRATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,...}'
```

**Expected: 403 Forbidden**
```json
{
  "message": "Unauthorized. This action requires admin or triage role."
}
```

### Test Treatment Staff Can't Create Patients

```bash
curl -X POST http://localhost:8000/api/patients \
  -H "Authorization: Bearer TREATMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test",...}'
```

**Expected: 403 Forbidden**

---

## 🎯 Feature Highlights

### 1. Auto-Generated Numbers ✅
- **Patient Number**: P-2024-0001, P-2024-0002...
- **Case Number**: BC-2024-0001, BC-2024-0002...
- **Queue Number**: 1, 2, 3... (resets daily)

### 2. WHO Protocol Automation ✅
- Auto-detects exposure category (I, II, III)
- Auto-generates 5-dose schedule
- Calculates dates: Day 0, 3, 7, 14, 28

### 3. Complete Workflow ✅
- Registration → Queue → Triage → Case Creation → Vaccination Schedule → Administration

### 4. Role-Based Security ✅
- Admin: Everything
- Registration: Patients + Queue
- Triage: Queue + Cases + Scheduling
- Treatment: Vaccination Administration

---

## ✅ Phase 4 Complete Checklist

- [x] PatientController with search & pagination
- [x] BiteCaseController with WHO automation
- [x] VaccinationController with administration
- [x] QueueController with daily management
- [x] Role-based API routes
- [x] Auto-number generation working
- [x] WHO protocol integration
- [x] Complete workflow tested

---

## 🚀 What's Next?

**Phase 5 Options:**

1. **Frontend Development** (React + TypeScript)
   - Login page
   - Dashboards for each role
   - Patient registration form
   - Queue display
   - Vaccination recording UI

2. **Advanced Features**
   - Vaccine inventory management
   - Notification system
   - Reporting & analytics
   - Export to PDF/Excel

3. **Mobile App** (Flutter)
   - Same workflow on mobile
   - Sync with backend API

Which would you like to proceed with?
