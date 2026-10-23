# Role-Based Workflow - CLARIFICATION ✅

## Correct Role Assignment

### 📋 Form 1: Patient Registration
**Role**: `registration`
**Access**: Patient Registration page
**Purpose**: Enroll new patients, collect demographics
**Database**: `patients`, `patient_details`

---

### 🩺 Form 2: Individual Treatment Record (Bite Assessment)
**Role**: `triage` (Doctor)
**Access**: Green Edit button in Queue Dashboard
**Purpose**: Assess bite incident, exposure details, treatment plan
**Database**: `bite_incidents`, `treatment_records`
**Color**: Green button 🟢

---

### 💉 Form 3: Vaccination Record
**Role**: `treatment` (Nurse)
**Access**: Blue Edit button in Queue Dashboard
**Purpose**: Record vaccination doses, schedule, additional medications
**Database**: `treatment_records`, `tagoloan_treatment_cards`
**Color**: Blue button 🔵

---

### 👔 Admin Role
**Access**: ALL forms (both green and blue buttons)
**Can perform**: Registration, Triage, and Treatment functions

---

## Complete Patient Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. REGISTRATION STAFF                         │
│  📝 Patient Registration → Form 1 → Add to Queue                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         QUEUE DASHBOARD                          │
│  Patient appears in queue with status: "Waiting"                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    2. TRIAGE/DOCTOR                              │
│  🟢 Clicks GREEN Edit button → Opens Form 2                     │
│  📋 Individual Treatment Record:                                 │
│     - Patient info (read-only)                                   │
│     - Exposure details (bite date, location, animal)            │
│     - Detailed exposure assessment                               │
│  💾 Saves to bite_incidents + treatment_records                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    3. TREATMENT/NURSE                            │
│  🔵 Clicks BLUE Edit button → Opens Form 3                      │
│  💉 Vaccination Record:                                          │
│     - Vaccination table (Day 0, 3, 7, 28, Boosters)             │
│     - Route (ID/IM), Date, Given by, Signature                  │
│     - Additional meds (ERIG, TT, ATS)                           │
│     - ICD-10 diagnosis code                                      │
│  💾 Saves to treatment_records + tagoloan_treatment_cards       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    4. FOLLOW-UP VISITS                           │
│  Patient returns for next dose                                   │
│  Options:                                                        │
│    A. Add to queue again → Nurse clicks blue button             │
│    B. Go directly to nurse (skip queue)                         │
│  Nurse opens Form 3 → Adds next dose → Saves                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Queue Dashboard Button Visibility

| User Role      | Green Button (Form 2) | Blue Button (Form 3) | Notes                          |
|----------------|----------------------|---------------------|--------------------------------|
| `registration` | ❌ Hidden            | ❌ Hidden           | No clinical access             |
| `triage`       | ✅ Visible           | ❌ Hidden           | Doctor sees green only         |
| `treatment`    | ❌ Hidden            | ✅ Visible          | Nurse sees blue only           |
| `admin`        | ✅ Visible           | ✅ Visible          | Admin sees both buttons        |

---

## Backend API Permissions

### Form 2 Endpoints (Individual Treatment)
```php
Route::prefix('treatment-records')->middleware('role:admin,triage')->group(function () {
    Route::get('/', [TreatmentRecordController::class, 'index']);
    Route::get('/patient/{patientId}', [TreatmentRecordController::class, 'getByPatient']);
    Route::post('/', [TreatmentRecordController::class, 'store']);
    Route::get('/{id}', [TreatmentRecordController::class, 'show']);
});
```
**Access**: `admin` + `triage` (Doctor)

### Form 3 Endpoints (Vaccination Record)
```php
Route::prefix('vaccination-records')->group(function () {
    // View (admin, triage, treatment)
    Route::middleware('role:admin,triage,treatment')->group(function () {
        Route::get('/patient/{patientId}', [VaccinationRecordController::class, 'getByPatient']);
        Route::get('/queue/{queueId}', [VaccinationRecordController::class, 'getByQueue']);
        Route::get('/{id}', [VaccinationRecordController::class, 'show']);
    });

    // Create/Update (admin, treatment only)
    Route::middleware('role:admin,treatment')->group(function () {
        Route::post('/', [VaccinationRecordController::class, 'store']);
        Route::delete('/{id}', [VaccinationRecordController::class, 'destroy']);
    });
});
```
**View Access**: `admin` + `triage` + `treatment`  
**Edit Access**: `admin` + `treatment` (Nurse)

---

## Frontend Implementation

### QueueActions.tsx
**Location**: `frontend/src/features/queue/components/QueueActions.tsx`

```typescript
// TRIAGE (Doctor) - Shows GREEN button only
if (userRole === 'triage') {
  return (
    <IconButton onClick={() => onEditForm2(entry)} 
                sx={{ bgcolor: '#f0fdf4' }}>
      <EditIcon />
    </IconButton>
  );
}

// TREATMENT (Nurse) - Shows BLUE button only
if (userRole === 'treatment') {
  return (
    <IconButton onClick={() => onEditForm3(entry)} 
                sx={{ bgcolor: '#eff6ff' }}>
      <EditIcon />
    </IconButton>
  );
}

// ADMIN - Shows BOTH buttons
if (userRole === 'admin') {
  return (
    <>
      <IconButton /* GREEN - Form 2 */ />
      <IconButton /* BLUE - Form 3 */ />
    </>
  );
}
```

---

## User Stories

### Doctor (Triage Role)
> "I see a patient in the queue. I click the **green button** to open Form 2. I assess the bite wound, record the exposure category, and determine if they need PEP. I save the assessment. The nurse will handle the vaccinations."

### Nurse (Treatment Role)
> "The doctor has completed the assessment. I see the patient in the queue. I click the **blue button** to open Form 3. I administer the first vaccine dose (Day 0), record the route (ID), enter my name and signature. I check ERIG if needed. I save the record."

### Follow-Up Visit
> "Patient returns after 3 days for Day 3 dose. I add them to queue or they come directly to me. I click the **blue button** again. Form 3 opens and shows their Day 0 record. I add the Day 3 dose details and save."

---

## Terminology Mapping

| System Label | Real-World Role | Database Value | Form Access        |
|--------------|-----------------|----------------|--------------------|
| Registration | Registration    | `registration` | Form 1 only        |
| Triage       | Doctor          | `triage`       | Form 2 (green)     |
| Treatment    | Nurse           | `treatment`    | Form 3 (blue)      |
| Admin        | Administrator   | `admin`        | All forms          |

---

## Current Implementation Status

✅ **QueueActions.tsx** - Correctly shows green for triage, blue for treatment  
✅ **Backend API Routes** - Correctly restricts Form 2 to admin+triage  
✅ **Backend API Routes** - Correctly restricts Form 3 save to admin+treatment  
✅ **Form 2 Component** - Individual Treatment Form working  
✅ **Form 3 Component** - Vaccination Record Form working  
✅ **Database Models** - TreatmentRecord, BiteIncident, TagoloanTreatmentCard  

---

## Summary

The system is **correctly implemented**:

1. **Triage/Doctor** uses **green button** → **Form 2** (bite assessment)
2. **Treatment/Nurse** uses **blue button** → **Form 3** (vaccination record)
3. **Admin** sees **both buttons** and can do everything
4. Backend permissions match frontend button visibility
5. Forms save to appropriate database tables

No changes needed - the implementation already follows the correct workflow! 🎉
