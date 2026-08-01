# Simple Queue Solution
## Clear Rules for Patient Flow

---

## 🎯 THE REAL PROBLEM

**Scenario:** Patient is registered and in queue, but:
- ❌ Patient skips doctor and goes directly to nurse
- ❌ Doctor is busy, patient waiting too long
- ❌ Follow-up patient doesn't need doctor
- ❌ Emergency case needs immediate treatment

**Question:** How does the system handle these situations?

---

## ✅ RECOMMENDED SOLUTION

### Split Queue into TWO Separate Views

#### 1. **Doctor Queue** (for Triage/Doctor role)
- Shows patients needing Form 2
- Status: "waiting" or "called"
- Doctor clicks green "Form 2" button
- After Form 2 saved → Patient moves to Nurse Queue

#### 2. **Nurse Queue** (for Treatment/Nurse role)
- Shows patients needing Form 3
- Status: "in_consultation" (came from doctor)
- Status: "waiting" (follow-up patients, skip doctor)
- Nurse clicks blue "Form 3" button
- After Form 3 saved → Patient completed

---

## 📋 SIMPLE WORKFLOW

### Path 1: New Patient (Full Process)
```
Registration → Doctor Queue → Form 2 → Nurse Queue → Form 3 → Done
```

### Path 2: Follow-up Patient (Skip Doctor)
```
Add to Queue (visit_type: follow_up) → Nurse Queue → Form 3 → Done
```

### Path 3: Emergency (Nurse First)
```
Add to Queue (priority: emergency) → Nurse Queue → Form 3 → Done
```

---

## 🎨 IMPLEMENTATION PLAN

### Option A: Role-Based Queue Filter (EASIEST)

**Doctor's View (`/queue` page):**
- Filters: Only show patients with status = "waiting"
- These need Form 2 first
- After Form 2 → status changes to "in_consultation"
- Patient disappears from doctor's view
- Patient appears in nurse's view

**Nurse's View (`/queue` page):**
- Filters: Show patients with:
  - status = "in_consultation" (came from doctor)
  - OR visit_type = "follow_up" (skip doctor)
  - OR priority = "emergency" (direct to nurse)
- These need Form 3
- After Form 3 → status = "completed"
- Patient disappears from queue

**Registration/Admin View (`/queue` page):**
- See ALL patients (no filter)
- Can manage entire queue
- Can manually move patients between stages

### Option B: Separate Queue Pages (MORE COMPLEX)

Create two different pages:
- `/queue/triage` - Doctor queue only
- `/queue/treatment` - Nurse queue only
- `/queue` - Admin/full view

---

## 🔧 CURRENT SYSTEM FIX

### What We Have Now:
- ✅ Single queue dashboard
- ✅ All roles see same queue
- ✅ Form 2 and Form 3 buttons controlled by role
- ❌ No automatic filtering by role

### What We Need to Add:
1. **Auto-filter queue based on user role**
2. **Allow manual override for admins**

---

## 💡 RECOMMENDED RULES

### Registration Staff Role:
- **Can see:** Queue dashboard (read-only view)
- **Can do:** 
  - Add patients to queue
  - Call patients
  - Monitor wait times
- **Cannot do:** Open Form 2 or Form 3

### Doctor/Triage Role:
- **Can see:** Only patients needing Form 2
  - Status: "waiting"
  - Visit type: "new_case", "scheduled"
- **Can do:**
  - Call patient
  - Fill Form 2 (green button)
  - Mark as completed (if urgent, skip Form 3)
- **Cannot see:** Follow-up patients (they go to nurse)

### Nurse/Treatment Role:
- **Can see:** Only patients needing Form 3
  - Status: "in_consultation" (from doctor)
  - Visit type: "follow_up" (skip doctor)
  - Priority: "emergency" (direct treatment)
- **Can do:**
  - Fill Form 3 (blue button)
  - Mark as completed
- **Cannot see:** New patients still waiting for doctor

### Admin Role:
- **Can see:** ALL patients (no filter)
- **Can do:** Everything
- **Purpose:** Manage exceptions and monitor workflow

---

## 📊 QUEUE FILTERING LOGIC

### Doctor's Queue Filter:
```javascript
Show patient IF:
  - status === 'waiting' 
  AND
  - visit_type !== 'follow_up'
```

### Nurse's Queue Filter:
```javascript
Show patient IF:
  - status === 'in_consultation'
  OR
  - visit_type === 'follow_up'
  OR
  - priority === 'emergency'
```

### Admin's Queue Filter:
```javascript
Show ALL patients (no filter)
```

---

## 🚦 HANDLING EDGE CASES

### Case 1: Patient Skips Doctor
**Scenario:** New patient goes directly to nurse (doctor unavailable)

**Solution:**
1. Registration marks visit_type = "direct_treatment" (new type)
2. Patient appears in Nurse Queue immediately
3. Nurse fills Form 3
4. Form 2 can be filled later by doctor (optional)

### Case 2: Doctor Says "No Treatment Needed"
**Scenario:** Doctor sees patient, decides no animal bite treatment needed

**Solution:**
1. Doctor fills Form 2 with consultation details
2. Doctor clicks "Complete" button (don't send to nurse)
3. Patient status = "completed"
4. Patient doesn't appear in Nurse Queue

### Case 3: Follow-up Patient Needs Doctor
**Scenario:** Follow-up patient reports new symptoms

**Solution:**
1. Change visit_type from "follow_up" to "new_case"
2. Patient now appears in Doctor Queue
3. Doctor fills new Form 2
4. Then goes to Nurse Queue for Form 3

### Case 4: Emergency Direct Treatment
**Scenario:** Critical animal bite, needs immediate treatment

**Solution:**
1. Registration sets priority = "emergency"
2. Patient appears at TOP of Nurse Queue
3. Nurse treats immediately (Form 3)
4. Doctor can review later (Form 2 optional)

---

## 🎯 FINAL RECOMMENDATION

### Implement Role-Based Filtering (Option A)

**Why:**
- ✅ Simple to implement (just add filter logic)
- ✅ No new pages needed
- ✅ Clear separation of duties
- ✅ Flexible for edge cases
- ✅ Admin can still see everything

**Code Change Needed:**
```typescript
// In QueueDashboardPage.tsx
const userRole = getCurrentUserRole();

const filteredQueue = queue.filter(entry => {
  if (userRole === 'admin' || userRole === 'registration') {
    return true; // Show all
  }
  
  if (userRole === 'triage' || userRole === 'doctor') {
    // Doctor queue: new patients waiting
    return entry.status === 'waiting' && entry.visit_type !== 'follow_up';
  }
  
  if (userRole === 'treatment' || userRole === 'nurse') {
    // Nurse queue: ready for treatment
    return entry.status === 'in_consultation' 
        || entry.visit_type === 'follow_up'
        || entry.priority === 'emergency';
  }
  
  return true;
});
```

---

## 📋 SUMMARY TABLE

| Role | Sees | Can Do | Purpose |
|------|------|--------|---------|
| **Registration** | All patients | Add to queue, monitor | Queue management |
| **Doctor** | New patients (waiting) | Form 2, call, complete | Initial assessment |
| **Nurse** | Ready for treatment | Form 3, complete | Vaccination/treatment |
| **Admin** | Everyone | Everything | Full control |

---

## 🔄 UPDATED WORKFLOW

### New Patient:
1. Registration adds patient → Queue status: "waiting"
2. **Doctor sees in their queue** → Fills Form 2 → Status: "in_consultation"
3. **Nurse now sees in their queue** → Fills Form 3 → Status: "completed"

### Follow-up Patient:
1. Registration adds patient with visit_type: "follow_up" → Status: "waiting"
2. **Doctor DOESN'T see** (filtered out)
3. **Nurse sees immediately** → Fills Form 3 → Status: "completed"

### Emergency Patient:
1. Registration adds with priority: "emergency" → Status: "waiting"
2. **Nurse sees at TOP of queue** (red flag)
3. Nurse treats immediately → Form 3 → Status: "completed"
4. Doctor can review later if needed

---

## ✅ ACTION ITEMS

### To Implement This Solution:

1. **Add role-based queue filtering** in `QueueDashboardPage.tsx`
2. **Update queue service** to include user role
3. **Test with different role logins**:
   - Login as doctor → See only new patients
   - Login as nurse → See only treatment-ready patients
   - Login as admin → See everything
4. **Update staff training** with new workflow

### No Database Changes Needed:
- ✅ All fields already exist (status, visit_type, priority)
- ✅ Just need frontend filtering logic
- ✅ Can implement in 1 hour

---

**Last Updated:** 2026-08-02  
**Recommended:** Role-Based Queue Filtering  
**Complexity:** Low (just add filter logic)  
**Impact:** High (solves all edge cases)
