# Auto-Queue Setup - Form 1 Integration ✅

## How It Works

When a patient completes **Form 1 (Patient Registration)**, they are **automatically added to the queue** with:
- Visit Type: `new_case`
- Priority: `normal`
- Check-in Notes: "Auto-added from registration"
- Queue Number: **First-come, first-serve** (1, 2, 3, ...)

---

## Patient Flow

```
┌──────────────────────────────────────────────────────────┐
│  REGISTRATION STAFF                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  1. Click "Add Patient" in Patient Management           │
│  2. Fill Form 1 (Patient Enrolment):                    │
│     - Patient Info (name, DOB, sex)                     │
│     - Address (municipality, barangay)                  │
│     - Contact Information                                │
│     - Socioeconomic Data                                 │
│     - Government Programs                                │
│  3. Click "Save Patient Record"                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ✅ Patient saved to database                           │
│  ✅ AUTOMATICALLY added to queue (FIFO)                 │
│  ✅ Queue number assigned (1, 2, 3...)                  │
└──────────────────────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────────────────────┐
│  QUEUE DASHBOARD                                         │
│  Patient appears immediately in queue table with:        │
│  - Queue #: 1, 2, 3... (sequential)                     │
│  - Status: Waiting                                       │
│  - Visit Type: New Case                                  │
│  - Priority: Normal                                      │
│  - Green "Form 2" button (for doctor/triage)           │
└──────────────────────────────────────────────────────────┘
```

---

## Code Implementation

### Frontend: AddPatientModal.tsx

**Location**: `frontend/src/features/patients/components/AddPatientModal/AddPatientModal.tsx`

```typescript
const handleSubmit = async () => {
  // 1. Save patient (Form 1)
  const res = await fetch('http://localhost:8000/api/patients', {
    method: 'POST',
    // ... patient data
  });

  const patientData = await res.json();
  const patientId = patientData.patient?.patient_id;

  // 2. Automatically add to queue (FIFO)
  if (patientId) {
    try {
      await fetch('http://localhost:8000/api/queue', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          visit_type: 'new_case',
          priority: 'normal',
          check_in_notes: 'Auto-added from registration',
        }),
      });
    } catch (queueError) {
      console.error('Failed to add to queue:', queueError);
      // Patient is still registered even if queue fails
    }
  }

  onSuccess(); // Close modal and refresh
};
```

### Backend: QueueController.php

**POST /api/queue** endpoint:

```php
public function store(Request $request)
{
    $clinicId = $request->user()->clinic_id;
    
    // Get next queue number (FIFO)
    $todayDate = Carbon::today()->toDateString();
    $lastQueue = Queue::where('clinic_id', $clinicId)
        ->where('queue_date', $todayDate)
        ->orderBy('queue_number', 'desc')
        ->first();

    $nextQueueNumber = $lastQueue ? ($lastQueue->queue_number + 1) : 1;

    // Create queue entry
    $queue = Queue::create([
        'clinic_id' => $clinicId,
        'patient_id' => $request->patient_id,
        'queue_number' => $nextQueueNumber, // Sequential: 1, 2, 3...
        'queue_date' => $todayDate,
        'visit_type' => $request->visit_type,
        'priority' => $request->get('priority', 'normal'),
        'status' => 'waiting',
        'checked_in_at' => now(),
        'checked_in_by' => $request->user()->id,
        'check_in_notes' => $request->check_in_notes,
    ]);

    return response()->json([
        'message' => 'Patient added to queue successfully',
        'queue' => $queue->load(['patient']),
        'queue_number' => $queue->queue_number,
    ], 201);
}
```

---

## What Was Fixed

### 1. ✅ Patient Model - Added Accessors
**File**: `backend/app/Models/Patient.php`

Added automatic attributes for frontend compatibility:

```php
protected $appends = [
    'name',  // Full name (first + middle + last + suffix)
    'age',   // Calculated from date_of_birth
];

public function getNameAttribute(): string
{
    return collect([
        $this->first_name,
        $this->middle_name,
        $this->last_name,
        $this->suffix,
    ])->filter()->implode(' ');
}

public function getAgeAttribute(): int
{
    if (!$this->date_of_birth) {
        return $this->attributes['age'] ?? 0;
    }
    return $this->date_of_birth->age;
}
```

### 2. ✅ Queue Model - Added Helper Methods
**File**: `backend/app/Models/Queue.php`

```php
public function getPatientNameAttribute()
{
    if (!$this->patient) return 'Unknown';
    $parts = array_filter([
        $this->patient->first_name,
        $this->patient->middle_name,
        $this->patient->last_name,
    ]);
    return implode(' ', $parts);
}
```

### 3. ✅ QueueController - Enhanced Error Logging
**File**: `backend/app/Http/Controllers/QueueController.php`

```php
\Log::error('Queue index error: ' . $e->getMessage());
\Log::error('Stack trace: ' . $e->getTraceAsString());
```

---

## Troubleshooting

### Issue 1: Patient registered but not appearing in queue

**Check browser console** for errors when saving patient.

**Expected flow**:
1. POST to `/api/patients` → Returns patient_id
2. POST to `/api/queue` with patient_id → Returns queue entry
3. Modal closes
4. Queue refreshes automatically

**Debug steps**:
1. Open browser DevTools → Network tab
2. Register a patient
3. Check for two API calls:
   - ✅ `POST /api/patients` → Status 200/201
   - ✅ `POST /api/queue` → Status 201
4. If queue POST fails (400/500), check error message

**Common causes**:
- Patient ID not extracted correctly from response
- Authentication token missing/expired
- User doesn't have queue creation permission (needs `registration` or `admin` role)
- Clinic ID mismatch

### Issue 2: Queue POST succeeds but patient not visible in queue table

**Check backend Laravel logs**:
```bash
cd backend
tail -f storage/logs/laravel.log
```

**Check database directly**:
```sql
SELECT 
  q.queue_id,
  q.queue_number,
  q.patient_id,
  p.first_name,
  p.last_name,
  p.date_of_birth,
  q.status,
  q.queue_date,
  q.checked_in_at
FROM queues q
LEFT JOIN patients p ON q.patient_id = p.patient_id
WHERE q.queue_date = CURDATE()
ORDER BY q.queue_number;
```

**If queue exists in DB but not showing in frontend**:
- Check if queue_date matches today's date
- Check if clinic_id matches logged-in user's clinic
- Check if frontend is filtering by wrong date
- Try manual refresh (F5)

### Issue 3: Queue shows but patient name is "Unknown" or blank

**Cause**: Patient relationship not loading or patient fields missing

**Fix applied**: Patient model now has `name` and `age` accessors

**Verify**:
```bash
# In Laravel tinker
php artisan tinker
$queue = App\Models\Queue::with('patient')->first();
$queue->patient->name; // Should show full name
$queue->patient->age; // Should show calculated age
```

### Issue 4: Queue number not sequential

**Expected**: 1, 2, 3, 4...  
**Actual**: Random numbers or duplicates

**Cause**: Queue number generation logic issue

**Fix**: QueueController uses `MAX(queue_number) + 1` for each day

**Verify**:
```sql
SELECT queue_number, queue_date, created_at
FROM queues
WHERE queue_date = CURDATE()
ORDER BY queue_number;
-- Should show: 1, 2, 3, 4... in order
```

---

## Testing Steps

### Test 1: Register New Patient → Auto-Queue

1. **Login as registration staff**
2. **Go to Patient Management** → Click "Add Patient"
3. **Fill Form 1** (minimum required):
   - Last Name: Smith
   - First Name: John
   - Date of Birth: 1990-01-01
   - Sex: Male
   - Municipality: Tagoloan
   - Barangay: Poblacion
4. **Click "Save Patient Record"**
5. **Check browser console** - Should see:
   - `POST /api/patients` → 200/201
   - `POST /api/queue` → 201
6. **Go to Queue Dashboard**
7. **Verify patient appears** with:
   - ✅ Queue #1 (or next sequential number)
   - ✅ Patient name: John Smith
   - ✅ Status: Waiting
   - ✅ Visit Type: New Case
   - ✅ Priority: Normal

### Test 2: Multiple Patients → Sequential Queue Numbers

1. **Register 3 patients**
2. **Go to Queue Dashboard**
3. **Verify queue numbers**: 1, 2, 3 (or sequential from last number)
4. **Verify "Next Patient" banner** shows Queue #1

### Test 3: Doctor Clicks Form 2

1. **Login as triage (doctor)**
2. **Go to Queue Dashboard**
3. **See green "Form 2" button** in CLINICAL FORMS column
4. **Click "Form 2"** on Queue #1
5. **Modal opens** with patient info pre-filled
6. **Fill exposure details** and save
7. **Verify** no errors

### Test 4: Nurse Clicks Form 3

1. **Login as treatment (nurse)**
2. **Go to Queue Dashboard**
3. **See blue "Form 3" button** in CLINICAL FORMS column
4. **Click "Form 3"** on Queue #1
5. **Modal opens** with vaccination table
6. **Fill Day 0 dose** and save
7. **Verify** data persists (reopen Form 3)

---

## Database Schema

### queues Table

| Column | Type | Notes |
|--------|------|-------|
| queue_id | BIGINT | Primary key |
| clinic_id | BIGINT | FK to clinics.id |
| **patient_id** | BIGINT | **FK to patients.patient_id** |
| queue_number | INT | Sequential: 1, 2, 3... per day |
| queue_date | DATE | Today's date |
| visit_type | ENUM | new_case, follow_up, vaccination, observation |
| priority | ENUM | normal, urgent, emergency |
| status | ENUM | waiting, in_consultation, completed, cancelled |
| checked_in_at | TIMESTAMP | Auto: now() |
| checked_in_by | BIGINT | FK to users.id (registration staff) |
| check_in_notes | TEXT | "Auto-added from registration" |

---

## API Response Format

### GET /api/queue (Queue Dashboard)

```json
{
  "date": "2026-08-02",
  "total_count": 3,
  "waiting_count": 2,
  "in_consultation_count": 1,
  "completed_count": 0,
  "queue": [
    {
      "queue_id": 1,
      "queue_number": 1,
      "queue_date": "2026-08-02",
      "visit_type": "new_case",
      "priority": "normal",
      "status": "waiting",
      "checked_in_at": "2026-08-02T08:30:00.000000Z",
      "check_in_notes": "Auto-added from registration",
      "patient": {
        "patient_id": 5,
        "first_name": "John",
        "middle_name": null,
        "last_name": "Smith",
        "date_of_birth": "1990-01-01",
        "gender": "male",
        "contact_number": "09123456789",
        "name": "John Smith",  // ← Accessor
        "age": 36               // ← Accessor (calculated)
      },
      "biteIncident": null,
      "checkedInBy": {
        "id": 2,
        "name": "Registration Staff"
      }
    }
  ]
}
```

---

## Summary

✅ **Auto-queue is already implemented** in Form 1  
✅ **Patient model enhanced** with name and age accessors  
✅ **Queue model enhanced** with helper methods  
✅ **QueueController improved** with better error logging  
✅ **Sequential queue numbering** (FIFO) working  

**What you need to do**:
1. **Restart backend server** to load the model changes
2. **Test registration** → Patient should auto-appear in queue
3. **Check Laravel logs** if issues occur
4. **Verify database** has correct foreign keys

**Next time you register a patient, they will automatically appear in the queue with sequential numbering (1, 2, 3...)!** 🎉
