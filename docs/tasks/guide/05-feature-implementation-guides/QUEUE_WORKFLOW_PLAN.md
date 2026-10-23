# Patient Queue Workflow Implementation Plan

**Date**: July 31, 2026  
**Status**: Navigation Updated - Workflow Design Needed  
**Priority**: HIGH (Core workflow feature)

---

## ✅ What We Just Fixed

Updated `App.tsx` to give **treatment staff (nurses)** access to Patient Queue:

```typescript
// BEFORE:
{ label: 'Patient Queue', roles: ['registration', 'triage', 'admin'] }

// AFTER:
{ label: 'Patient Queue', roles: ['registration', 'triage', 'treatment', 'admin'] }
```

Now all staff can see the queue! ✅

---

## 🔄 Your Planned Workflow

### Patient Journey Through Queue:

```
┌─────────────────────────────────────────────────────────────┐
│  1. REGISTRATION                                             │
│  📝 Registration Staff                                       │
│  ├─ Registers patient (Form 1)                              │
│  └─ Adds to queue → Status: "Waiting for Triage"            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. TRIAGE / ASSESSMENT                                      │
│  👨‍⚕️ Doctor (triage role)                                    │
│  ├─ Views patient in queue                                   │
│  ├─ Clicks "Edit" action button                             │
│  ├─ Opens FORM 2 (Individual Treatment Record)              │
│  ├─ Records:                                                 │
│  │  • Bite incident details                                 │
│  │  • Exposure category (I, II, III)                        │
│  │  • Initial assessment                                    │
│  └─ Saves → Status: "Waiting for Treatment"                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. TREATMENT / VACCINATION                                  │
│  👩‍⚕️ Nurse (treatment role)                                  │
│  ├─ Views patient in queue                                   │
│  ├─ Clicks "Edit" action button                             │
│  ├─ Opens FORM 3 (Vaccination Schedule)                     │
│  ├─ Records:                                                 │
│  │  • Vaccine administered                                  │
│  │  • Dose number, batch number                             │
│  │  • Next appointment date                                 │
│  └─ Saves → Status: "Completed" or "Scheduled for Follow-up"│
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 What Needs to Be Built

### 1. Queue Dashboard Updates

**File**: `frontend/src/features/queue/pages/QueueDashboardPage.tsx`

**Current State**: Unknown (needs inspection)

**Required Features**:

#### A. Queue Table with Columns:
- Queue Number
- Patient Name
- Patient Number
- Registration Time
- Current Status
- Priority (Normal / Urgent / Emergency)
- **Actions Column** ← NEW!

#### B. Status Values:
```typescript
type QueueStatus = 
  | 'waiting_triage'      // Waiting for doctor
  | 'in_triage'           // Doctor is assessing
  | 'waiting_treatment'   // Waiting for nurse
  | 'in_treatment'        // Nurse is treating
  | 'completed'           // Done
  | 'cancelled';          // Patient left
```

#### C. Actions Column (Role-Based):

**For Registration Staff**:
- ✏️ Edit patient details
- ❌ Cancel/Remove from queue

**For Doctor (triage)**:
- 📋 **Edit Form 2** ← Opens Individual Treatment form
- 👁️ View patient details

**For Nurse (treatment)**:
- 💉 **Edit Form 3** ← Opens Vaccination Schedule form
- 👁️ View patient details

**For Admin**:
- All actions above

---

### 2. Smart Action Button Logic

**File**: `frontend/src/features/queue/components/QueueActions.tsx` (NEW)

```typescript
function QueueActions({ patient, status, userRole }) {
  // Determine which button to show based on:
  // 1. User's role
  // 2. Patient's current status
  
  if (userRole === 'triage') {
    if (status === 'waiting_triage') {
      return <button onClick={() => openForm2(patient)}>Start Triage</button>
    }
    if (status === 'in_triage') {
      return <button onClick={() => openForm2(patient)}>Continue Triage</button>
    }
    return <button disabled>Waiting for treatment</button>
  }
  
  if (userRole === 'treatment') {
    if (status === 'waiting_treatment') {
      return <button onClick={() => openForm3(patient)}>Start Treatment</button>
    }
    if (status === 'in_treatment') {
      return <button onClick={() => openForm3(patient)}>Continue Treatment</button>
    }
    return <button disabled>Not ready for treatment</button>
  }
  
  // Registration can always edit patient info
  if (userRole === 'registration') {
    return <button onClick={() => openForm1(patient)}>Edit Patient</button>
  }
}
```

---

### 3. Form Modal Integration

**Required Modals**:

#### A. Form 2 Modal (for Doctor)
**File**: `frontend/src/features/bite-cases/components/IndividualTreatmentForm.tsx`

**Opens when**: Doctor clicks "Edit" in queue  
**Pre-filled with**: Patient info from Form 1  
**Fields**:
- Mode of transaction (walk-in / referral)
- Date and time of consultation
- Vital signs (BP, temp, height, weight)
- Chief complaints
- Diagnosis
- Bite incident details
- Exposure category
- Treatment given

**On Save**:
- Updates treatment record
- Updates queue status to "waiting_treatment"
- Closes modal
- Refreshes queue

---

#### B. Form 3 Modal (for Nurse)
**File**: `frontend/src/features/vaccinations/components/VaccinationScheduleForm.tsx`

**Opens when**: Nurse clicks "Edit" in queue  
**Pre-filled with**: Patient info + Form 2 data  
**Fields**:
- Protocol type (PEP / PrEP)
- Vaccine brand and generic name
- Dose number (Day 0, Day 3, Day 7, etc.)
- Route (IM / ID)
- Injection site
- Batch number
- Dosage (ml)
- TT status
- Next appointment date
- Adverse reaction notes
- Cost recovery

**On Save**:
- Creates/updates vaccination record
- Creates future appointment if needed
- Updates queue status to "completed" or "scheduled_followup"
- Closes modal
- Refreshes queue

---

### 4. Queue Status Flow Management

**File**: `frontend/src/features/queue/hooks/useQueueFlow.ts` (NEW)

```typescript
export function useQueueFlow() {
  const updateQueueStatus = async (queueId, action, userRole) => {
    let newStatus;
    
    switch (action) {
      case 'start_triage':
        newStatus = 'in_triage';
        break;
      case 'complete_triage':
        newStatus = 'waiting_treatment';
        break;
      case 'start_treatment':
        newStatus = 'in_treatment';
        break;
      case 'complete_treatment':
        newStatus = 'completed';
        break;
      case 'cancel':
        newStatus = 'cancelled';
        break;
    }
    
    await queueApi.updateStatus(queueId, newStatus);
  };
  
  return { updateQueueStatus };
}
```

---

## 🎯 Implementation Priority

### Phase 1: Queue Table Enhancement (HIGH)
1. Add Status column to queue table
2. Add Actions column
3. Show different actions based on user role
4. Test with all roles

### Phase 2: Form Integration (HIGH)
1. Create Form 2 modal (Individual Treatment)
2. Create Form 3 modal (Vaccination Schedule)
3. Connect to queue actions
4. Pre-fill forms with patient data

### Phase 3: Status Flow (MEDIUM)
1. Implement status transitions
2. Auto-refresh queue when status changes
3. Add notifications
4. Prevent conflicts (2 doctors can't edit same patient)

### Phase 4: Polish (LOW)
1. Add color coding for status
2. Add time tracking (how long in each stage)
3. Add queue statistics
4. Add sound/visual alerts

---

## 📊 Queue Table Design

### Proposed Table:

| # | Patient | Status | Priority | Registered | Actions |
|---|---------|--------|----------|------------|---------|
| 1 | Juan Dela Cruz (P-2024-001) | 🟡 Waiting Triage | Normal | 10:30 AM | **[📋 Start Triage]** (if doctor) |
| 2 | Maria Santos (P-2024-002) | 🟢 In Triage | Urgent | 10:45 AM | **[📋 Continue]** (if doctor) |
| 3 | Pedro Garcia (P-2024-003) | 🔵 Waiting Treatment | Normal | 11:00 AM | **[💉 Start Treatment]** (if nurse) |
| 4 | Ana Lopez (P-2024-004) | 🟣 In Treatment | Normal | 11:15 AM | **[💉 Continue]** (if nurse) |

### Status Colors:
- 🟡 **Waiting Triage** - Yellow (waiting for doctor)
- 🟢 **In Triage** - Green (doctor is working)
- 🔵 **Waiting Treatment** - Blue (waiting for nurse)
- 🟣 **In Treatment** - Purple (nurse is working)
- ✅ **Completed** - Gray (done)
- ❌ **Cancelled** - Red (patient left)

---

## 🔧 Backend Requirements

### Database Updates Needed:

#### 1. Queue Table:
```sql
ALTER TABLE queues ADD COLUMN status VARCHAR(50) DEFAULT 'waiting_triage';
ALTER TABLE queues ADD COLUMN started_at TIMESTAMP NULL;
ALTER TABLE queues ADD COLUMN completed_at TIMESTAMP NULL;
```

#### 2. Treatment Records Table:
Already exists, just need to link to queue:
```sql
ALTER TABLE treatment_records ADD COLUMN queue_id BIGINT UNSIGNED NULL;
ALTER TABLE treatment_records ADD FOREIGN KEY (queue_id) REFERENCES queues(id);
```

#### 3. Vaccination Schedules Table:
Already exists, just need to link to queue:
```sql
ALTER TABLE vaccination_schedules ADD COLUMN queue_id BIGINT UNSIGNED NULL;
ALTER TABLE vaccination_schedules ADD FOREIGN KEY (queue_id) REFERENCES queues(id);
```

---

## ✅ Next Steps

### Immediate (Today/Tomorrow):
1. ✅ **DONE**: Add treatment staff to queue menu access
2. 📋 Inspect current QueueDashboardPage
3. 📋 Design queue actions component
4. 📋 Create Form 2 and Form 3 modals

### This Week:
1. Implement queue status flow
2. Connect forms to queue
3. Test complete workflow
4. Train staff on new system

### Later:
1. Add advanced features (notifications, analytics)
2. Optimize performance
3. Add mobile queue view

---

## 💡 Key Design Decisions

### Decision 1: One Queue, Multiple Stages
✅ **Chosen**: Single queue with status progression  
❌ **Rejected**: Separate queues for triage/treatment

**Reason**: Simpler for staff, easier to track patient journey

---

### Decision 2: Role-Based Actions
✅ **Chosen**: Show different buttons based on user role  
❌ **Rejected**: Show all buttons, disable based on role

**Reason**: Cleaner UI, less confusion

---

### Decision 3: Modal Forms vs Separate Pages
✅ **Chosen**: Modal forms (stay on queue page)  
❌ **Rejected**: Navigate to separate form pages

**Reason**: Faster workflow, keep queue visible

---

## 🎉 Benefits of This Workflow

1. ✅ **Clear patient flow** - Everyone knows where patient is
2. ✅ **No lost patients** - All tracked in queue
3. ✅ **Efficient** - Staff sees only their tasks
4. ✅ **Flexible** - Easy to add more stages later
5. ✅ **Audit trail** - Track time in each stage

---

**Status**: Plan Complete  
**Next Action**: Inspect current queue implementation  
**Timeline**: Can be built in 2-3 days  
**Priority**: HIGH (core workflow feature)

Would you like me to start building the queue actions component now?
