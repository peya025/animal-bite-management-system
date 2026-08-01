# Add to Queue Feature - COMPLETE ✅

## Problem Fixed

**Issue**: Patients registered through Form 1 (Patient Registration) were NOT automatically added to the queue. There was no way to add existing patients to the queue for the day's consultations.

**Solution**: Created an "Add to Queue" modal accessible from the Queue Dashboard.

---

## New Feature: Add to Queue Modal

### Location
**Queue Dashboard** → "Add to Queue" button (top right, green button)

### Features
1. **Patient Selection** - Searchable autocomplete dropdown
   - Search by patient number or name
   - Shows patient details (DOB, gender)
   - Loads all registered patients

2. **Visit Type** - Required field
   - New Case (First Visit)
   - Follow-up Visit
   - Vaccination Only
   - Observation

3. **Priority** - Required field
   - Normal (default)
   - Urgent
   - Emergency

4. **Check-in Notes** - Optional textarea
   - Any special notes or observations

### Queue Number Assignment
- **Automatic**: System generates next queue number for today (1, 2, 3, ...)
- **First Come First Serve**: Queue numbers are sequential based on check-in time
- **Priority Override**: Emergency and urgent patients can be called first by staff

---

## Complete Workflow

### 1. Register New Patient (Registration Staff)
```
Patient Registration Page
  ↓
Fill Form 1 (Patient Enrollment)
  ↓
Save Patient → Patient is now in system
  ↓
Navigate to Queue Dashboard
```

### 2. Add Patient to Queue (Registration Staff / Admin)
```
Queue Dashboard
  ↓
Click "Add to Queue" button (top right)
  ↓
Select patient from dropdown
  ↓
Choose visit type (new_case, follow_up, etc.)
  ↓
Set priority (normal, urgent, emergency)
  ↓
Add notes (optional)
  ↓
Click "Add to Queue"
  ↓
Patient appears in queue with queue number
```

### 3. Doctor Assessment (Triage)
```
Queue Dashboard → Patient in "Waiting" status
  ↓
Click green Edit button (Form 2)
  ↓
Individual Treatment Form opens
  ↓
Assess bite, record exposure details
  ↓
Save Form 2 → Bite incident recorded
```

### 4. Nurse Vaccination (Treatment)
```
Queue Dashboard → Patient still in queue
  ↓
Click blue Edit button (Form 3)
  ↓
Vaccination Record Form opens
  ↓
Record vaccine doses, additional meds
  ↓
Save Form 3 → Vaccination recorded
  ↓
Mark consultation complete
```

---

## Files Created/Modified

### New Files
1. **`frontend/src/features/queue/components/AddToQueueModal.tsx`** (new)
   - Modal component for adding patients to queue
   - Patient autocomplete search
   - Visit type and priority selection
   - Check-in notes

### Modified Files
1. **`frontend/src/features/queue/pages/QueueDashboardPage.tsx`**
   - Added "Add to Queue" button in header
   - Added `addToQueueOpen` state
   - Integrated AddToQueueModal component
   - Added success toast on queue add

---

## API Endpoint

### POST /api/queue
**Access**: admin, registration

**Request Body**:
```json
{
  "patient_id": 1,
  "visit_type": "new_case",
  "priority": "normal",
  "check_in_notes": "Patient reports dog bite on left hand"
}
```

**Response**:
```json
{
  "message": "Patient added to queue successfully",
  "queue": {
    "queue_id": 15,
    "queue_number": 5,
    "patient_id": 1,
    "queue_date": "2026-08-02",
    "visit_type": "new_case",
    "priority": "normal",
    "status": "waiting",
    "checked_in_at": "2026-08-02 09:30:00",
    "patient": {
      "patient_id": 1,
      "name": "Juan Dela Cruz",
      "age": 35,
      "gender": "male"
    }
  },
  "queue_number": 5
}
```

---

## Queue Number Logic

### How Queue Numbers Work

1. **Daily Reset**: Queue numbers reset every day (1, 2, 3, ...)
2. **Sequential**: Each patient gets next available number
3. **Example**:
   - 8:00 AM - Patient A → Queue #1
   - 8:15 AM - Patient B → Queue #2
   - 8:30 AM - Patient C → Queue #3
   - 9:00 AM - Patient D → Queue #4

### Priority Handling

Priority affects **calling order**, not queue number:
- Emergency patients can be called first (staff clicks Call button)
- Urgent patients called before normal
- Normal patients called in sequential order

**Example**:
```
Queue #1 - Normal    (waiting)
Queue #2 - Emergency (called first!)
Queue #3 - Normal    (waiting)
Queue #4 - Urgent    (called second)
```

Staff can manually call any patient using the "Call" button in actions column.

---

## User Interface

### Add to Queue Button
**Location**: Queue Dashboard header (top right)
**Appearance**: Green button with plus icon
**Text**: "Add to Queue"
**Access**: Registration staff and Admin

### Modal Layout
```
┌────────────────────────────────────────────┐
│  Add Patient to Queue                      │
├────────────────────────────────────────────┤
│                                            │
│  [Select Patient ▼] (Autocomplete)        │
│  Search by patient number or name         │
│                                            │
│  [Visit Type ▼]                            │
│  • New Case (First Visit)                 │
│  • Follow-up Visit                        │
│  • Vaccination Only                       │
│  • Observation                            │
│                                            │
│  [Priority ▼]                              │
│  • Normal                                 │
│  • Urgent                                 │
│  • Emergency                              │
│                                            │
│  [Check-in Notes]                          │
│  ┌────────────────────────────────────┐   │
│  │                                    │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ℹ Patient: P2026-001 - Juan Dela Cruz   │
│    Visit: new case · Priority: normal     │
│                                            │
├────────────────────────────────────────────┤
│           [Cancel]  [Add to Queue]         │
└────────────────────────────────────────────┘
```

---

## Testing Steps

### 1. Add Patient to Queue
1. Login as registration staff or admin
2. Navigate to Queue Dashboard
3. Click "Add to Queue" button
4. Select a patient from dropdown
5. Choose visit type: "New Case"
6. Set priority: "Normal"
7. Add notes: "First time patient, dog bite"
8. Click "Add to Queue"
9. ✅ Modal closes
10. ✅ Success toast appears
11. ✅ Patient appears in queue table
12. ✅ Queue number assigned automatically

### 2. Verify Queue Entry
1. Check queue table for new entry
2. Verify queue number is sequential
3. Verify status is "Waiting"
4. Verify patient name displays correctly
5. Verify visit type and priority show correctly
6. Verify green/blue action buttons appear (role-based)

### 3. Multiple Patients (First Come First Serve)
1. Add Patient A → Gets Queue #1
2. Add Patient B → Gets Queue #2
3. Add Patient C → Gets Queue #3
4. Verify queue numbers are sequential
5. Verify "Waiting" status for all

### 4. Priority Handling
1. Add normal priority patient
2. Add emergency priority patient
3. Staff can manually call emergency first
4. Or use "Next Patient" which respects priority

---

## Common Scenarios

### Scenario 1: New Patient Visit
```
Registration: Add new patient (Form 1)
             ↓
          Add to Queue (visit_type: new_case)
             ↓
Doctor:   Open Form 2, assess bite
             ↓
Nurse:    Open Form 3, administer vaccine
```

### Scenario 2: Follow-up Visit
```
Registration: Patient returns for Day 3 dose
             ↓
          Add to Queue (visit_type: follow_up)
             ↓
Nurse:    Open Form 3, add Day 3 dose
```

### Scenario 3: Emergency Case
```
Registration: Dog bite with severe bleeding
             ↓
          Add to Queue (priority: emergency)
             ↓
Doctor:   Call patient immediately (skip queue)
             ↓
          Assess and treat urgently
```

---

## Role Permissions

| Role         | Add to Queue | View Queue | Call Patient | Forms Access    |
|--------------|--------------|------------|--------------|-----------------|
| Registration | ✅           | ✅         | ❌           | None            |
| Triage       | ❌           | ✅         | ✅           | Form 2 (green)  |
| Treatment    | ❌           | ✅         | ❌           | Form 3 (blue)   |
| Admin        | ✅           | ✅         | ✅           | Form 2 & 3      |

---

## Database Structure

### Queue Entry Fields
```sql
queues
├── queue_id (PK)
├── clinic_id (FK)
├── patient_id (FK)
├── queue_number (1, 2, 3...)
├── queue_date (today's date)
├── visit_type (new_case, follow_up, vaccination, observation)
├── priority (normal, urgent, emergency)
├── status (waiting, in_consultation, completed, cancelled)
├── checked_in_at (timestamp when added to queue)
├── checked_in_by (FK to users - registration staff)
├── check_in_notes (optional notes)
└── timestamps (created_at, updated_at)
```

---

## Troubleshooting

### Issue: Patient not appearing in queue
**Causes**:
1. Wrong date - Queue filters by today's date
2. Backend error - Check Laravel logs
3. Frontend error - Check browser console
4. Queue not refreshing - Click refresh button

**Solution**:
1. Check backend server is running
2. Check browser console for errors
3. Click refresh button in queue dashboard
4. Verify patient was added (check database)

### Issue: Queue number not sequential
**Cause**: Multiple clinics or date filtering

**Solution**: Queue numbers are per clinic, per day. Check `clinic_id` and `queue_date` filters.

### Issue: "Add to Queue" button not visible
**Cause**: User role doesn't have permission

**Solution**: Only registration staff and admin can add to queue. Check user role in localStorage.

---

## Summary

✅ **"Add to Queue" feature is complete!**

Now the complete workflow works:
1. Registration adds patient → Patient in system
2. Registration adds to queue → Patient in queue
3. Doctor opens Form 2 (green) → Bite assessment
4. Nurse opens Form 3 (blue) → Vaccination record
5. Queue operates **first come first serve** with priority override

The missing piece has been added! 🎉
