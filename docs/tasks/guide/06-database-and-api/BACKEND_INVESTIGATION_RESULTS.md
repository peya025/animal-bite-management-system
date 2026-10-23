# Backend Investigation Results - Patient Registration

**Investigation Date**: January 27, 2026  
**Purpose**: Determine where web Form 1 data is stored and ensure mobile-backend compatibility

---

## 🔍 Key Findings

### Finding 1: Web Form 1 Data is NOT Fully Stored! 🚨

**The web `AddPatientModal.tsx` collects 27+ fields, but the backend ONLY accepts and stores 12 fields.**

### What the Web Collects (27+ fields):
```typescript
Form 1 - Patient Enrolment:
✅ Basic Info (8 fields)
✅ Address - Misamis Oriental (4 fields) 
✅ Contact Info (3 fields)
✅ Socioeconomic (3 fields)
✅ Government Programs (7 fields)
```

### What the Backend Actually Stores (12 fields):
```php
// backend/app/Http/Controllers/PatientController.php
'first_name'              ✅ Required
'middle_name'             ✅ Nullable
'last_name'               ✅ Required
'suffix'                  ✅ Nullable
'gender'                  ✅ Required
'age'                     ✅ Nullable
'date_of_birth'           ✅ Nullable
'address'                 ✅ Nullable (single text field)
'contact_number'          ✅ Nullable
'emergency_contact_name'  ✅ Nullable
'emergency_contact_number'✅ Nullable
'clinic_id'               ✅ Auto-set from user
```

### What the Web SENDS but Backend IGNORES:
```typescript
❌ blood_type
❌ mother_maiden_name
❌ civil_status
❌ spouse_name
❌ address_municipality (PSGC)
❌ address_barangay (PSGC)
❌ address_purok
❌ province
❌ educational_attainment
❌ employment_status
❌ family_member
❌ philhealth_member
❌ philhealth_status
❌ philhealth_no
❌ philhealth_category
❌ fourps_member
❌ dswd_nhts
❌ treatment_record (entire Form 2 object!)
```

**These fields are collected on the frontend but SILENTLY DISCARDED by the backend!**

---

## 📊 Database Schema Analysis

### Patients Table Structure

```sql
CREATE TABLE patients (
    patient_id BIGINT PRIMARY KEY,
    clinic_id BIGINT NOT NULL,
    
    -- Auto-generated
    patient_number VARCHAR(50) UNIQUE,  -- P-2024-0001
    card_token UUID UNIQUE,
    
    -- Personal Information
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255) NULL,
    last_name VARCHAR(255) NOT NULL,
    suffix VARCHAR(50) NULL,
    gender ENUM('male', 'female') NOT NULL,
    age INT NULL,
    date_of_birth DATE NULL,
    address VARCHAR(255) NULL,  -- Single text field!
    contact_number VARCHAR(50) NULL,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255) NULL,
    emergency_contact_number VARCHAR(50) NULL,
    
    -- Registration Tracking
    registered_by BIGINT NULL,
    registration_source ENUM('staff', 'mobile') DEFAULT 'staff',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULL,  -- Soft deletes
    
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX (patient_number),
    INDEX (clinic_id, last_name, first_name),
    INDEX (clinic_id, patient_number)
);
```

**Total Columns**: 17 fields (3 auto-generated, 14 user-provided)

---

## 🔄 Mobile vs Web Backend Comparison

### Mobile API Endpoint: `/api/mobile/patients`

**Controller**: `backend/app/Http/Controllers/Mobile/PatientProfileController.php`

**Accepts**:
```php
✅ clinic_id
✅ relationship (mobile-specific: self/child/dependent)
✅ first_name
✅ middle_name
✅ last_name
✅ suffix
✅ gender
✅ date_of_birth
✅ address
✅ contact_number
✅ emergency_contact_name
✅ emergency_contact_number
```

**12 fields** (same as web!)

---

### Web API Endpoint: `/api/patients`

**Controller**: `backend/app/Http/Controllers/PatientController.php`

**Accepts**:
```php
✅ first_name
✅ middle_name
✅ last_name
✅ suffix
✅ gender
✅ age (mobile doesn't have this)
✅ date_of_birth
✅ address
✅ contact_number
✅ emergency_contact_name
✅ emergency_contact_number
// clinic_id auto-set from authenticated user
```

**12 fields** (almost identical to mobile!)

---

## 💡 Critical Insights

### 1. Mobile and Web APIs Are ALREADY ALIGNED! ✅

**Good News:**
- Both endpoints accept the same core 12 fields
- Both store data in the same `patients` table
- Both have emergency contact support

**Minor Difference:**
- Web has `age` field (mobile doesn't)
- Mobile has `relationship` pivot field (web doesn't)
- Mobile sets `registration_source = 'mobile'`
- Web sets `registration_source = 'staff'`

### 2. Web Form 1 Extended Data is LOST! 🔥

**The Problem:**
- Web frontend collects 27+ fields in Form 1
- Backend only stores 12 fields
- **15 fields are collected but never saved!**

**Data Loss:**
```typescript
// Web sends this:
POST /api/patients
{
  first_name: "Juan",
  blood_type: "O+",           // ❌ LOST
  philhealth_no: "12-345",    // ❌ LOST
  fourps_member: "yes",       // ❌ LOST
  treatment_record: {...}     // ❌ LOST
}

// Backend only saves:
{
  first_name: "Juan"
  // Other 15 fields discarded silently
}
```

### 3. No Separate Tables for Extended Data

**Tables Checked:**
- ❌ No `patient_details` table
- ❌ No `patient_socioeconomic` table
- ❌ No `patient_health_info` table
- ❌ No JSON columns in `patients` table

**Conclusion**: Extended Form 1 data has **never been implemented in the backend**.

---

## 🎯 Implications

### For Web Application

**Current State:**
- ✅ Frontend works (collects data)
- ❌ Backend doesn't save extended data
- ❌ Users fill out long form for nothing
- ❌ Data is lost on submission

**Impact:**
- Government program data (PhilHealth, 4Ps) not tracked
- Socioeconomic reporting incomplete
- Blood type not saved (medical risk!)
- Address PSGC codes not validated/stored

### For Mobile Application

**Current State:**
- ✅ Mobile collects 8 basic fields
- ✅ Backend saves all 8 fields
- ✅ Emergency contacts already supported!
- ✅ No data loss

**Opportunity:**
- Can add emergency contacts to mobile UI TODAY
- Can design proper extended data storage
- Can implement Form 1 properly for BOTH platforms

---

## ✅ Recommendations

### Immediate Actions (Low Risk)

#### 1. Add Emergency Contacts to Mobile (TODAY)
```dart
// backend/app/Http/Controllers/Mobile/PatientProfileController.php
// Already accepts these fields! ✅

'emergency_contact_name' => nullable
'emergency_contact_number' => nullable
```

**Action**: Just add UI fields to mobile app
**Risk**: ZERO - backend already supports it
**Benefit**: Immediate safety improvement

#### 2. Fix Web Form 1 Data Loss (URGENT)
```typescript
// frontend/src/features/patients/components/AddPatientModal.tsx
// Currently sends 27 fields, backend saves 12

Options:
A) Remove unused fields from web form (simplify UX)
B) Add backend support for all 27 fields (proper implementation)
```

**Action**: Decide what data is actually needed
**Risk**: Medium - affects existing web workflow
**Benefit**: Fixes data loss, improves data quality

---

### Long-term Solution (Proper Implementation)

#### Option A: Extend Patients Table (Simple)

**Add columns for critical fields:**
```sql
ALTER TABLE patients ADD COLUMN blood_type VARCHAR(10) NULL;
ALTER TABLE patients ADD COLUMN mother_maiden_name VARCHAR(255) NULL;
ALTER TABLE patients ADD COLUMN civil_status VARCHAR(50) NULL;
ALTER TABLE patients ADD COLUMN spouse_name VARCHAR(255) NULL;
```

**Pros:**
- ✅ Simple implementation
- ✅ Easy to query
- ✅ Keeps data together

**Cons:**
- ❌ Makes table wider
- ❌ Many nullable columns
- ❌ Harder to extend later

---

#### Option B: Create patient_details Table (Better)

**Separate optional data:**
```sql
CREATE TABLE patient_details (
    id BIGINT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    
    -- Health Information
    blood_type VARCHAR(10) NULL,
    mother_maiden_name VARCHAR(255) NULL,
    civil_status VARCHAR(50) NULL,
    spouse_name VARCHAR(255) NULL,
    
    -- Address Breakdown
    address_municipality VARCHAR(255) NULL,
    address_barangay VARCHAR(255) NULL,
    address_purok VARCHAR(255) NULL,
    province VARCHAR(100) NULL,
    
    -- Socioeconomic
    educational_attainment VARCHAR(50) NULL,
    employment_status VARCHAR(50) NULL,
    family_member VARCHAR(50) NULL,
    
    -- Government Programs
    philhealth_member ENUM('yes', 'no') NULL,
    philhealth_status ENUM('member', 'dependent') NULL,
    philhealth_no VARCHAR(50) NULL,
    philhealth_category VARCHAR(50) NULL,
    fourps_member ENUM('yes', 'no') NULL,
    dswd_nhts ENUM('yes', 'no') NULL,
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    UNIQUE KEY (patient_id)
);
```

**Pros:**
- ✅ Clean separation of concerns
- ✅ Core patient data remains focused
- ✅ Easy to extend
- ✅ Optional data doesn't clutter main table

**Cons:**
- ❌ Requires JOIN for full patient view
- ❌ More complex queries
- ❌ Two tables to maintain

---

#### Option C: JSON Column (Quick but Limited)

**Add single JSON column:**
```sql
ALTER TABLE patients ADD COLUMN additional_data JSON NULL;
```

**Store extended data:**
```json
{
  "blood_type": "O+",
  "philhealth": {
    "member": "yes",
    "number": "12-345",
    "category": "fe_private"
  },
  "socioeconomic": {
    "education": "college",
    "employment": "employed"
  }
}
```

**Pros:**
- ✅ Quick to implement
- ✅ Flexible schema
- ✅ No migration for new fields

**Cons:**
- ❌ Hard to query/filter
- ❌ No validation
- ❌ Poor for reporting
- ❌ Not recommended for structured data

---

## 🚀 Proposed Action Plan

### Phase 1: Quick Wins (This Week)

**Day 1: Add Emergency Contacts to Mobile** ✅
- Update `profile_setup_view.dart`
- Add 2 fields to UI
- Test with backend
- Deploy

**Day 2-3: Audit Web Form 1**
- Review what data is actually needed
- Consult with stakeholders
- Decide: simplify form OR implement backend?

### Phase 2: Backend Implementation (Next Week)

**If implementing extended data:**

**Day 1: Design**
- Choose storage approach (recommend Option B: separate table)
- Design API contract
- Plan migration strategy

**Day 2-3: Backend**
- Create `patient_details` table migration
- Update PatientController validation
- Create PatientDetails model
- Add relationship to Patient model

**Day 4: Web Integration**
- Update web patient API calls
- Ensure Form 1 saves all data
- Test data persistence

**Day 5: Mobile Parity**
- Decide which fields mobile needs
- Design multi-step wizard (if doing full Form 1)
- Or: keep mobile simple, allow completion later

### Phase 3: Testing & Deployment (Week 3)

**Testing:**
- Backend unit tests
- Web Form 1 end-to-end test
- Mobile registration test
- Data integrity verification

**Deployment:**
- Deploy backend with migration
- Deploy web with updated API calls
- Deploy mobile with emergency contacts
- Monitor for issues

---

## 📋 Decision Matrix

| Scenario | Recommendation | Timeline |
|----------|----------------|----------|
| **Need emergency contacts NOW** | Add to mobile UI (backend supports it!) | TODAY |
| **Web data loss acceptable** | Keep current setup, simplify web form | 1 day |
| **Need Form 1 data** | Implement Option B (separate table) | 1 week |
| **Quick prototype** | Use JSON column (Option C) | 2 days |
| **Production-ready** | Implement Option B + gradual mobile rollout | 2-3 weeks |

---

## ⚠️ Risks & Mitigations

### Risk 1: Breaking Existing Web Registrations
**Mitigation**: 
- Make all new fields optional
- Test with existing web workflow
- Provide default values

### Risk 2: Mobile-Web Data Inconsistency
**Mitigation**:
- Design storage to support both platforms
- Allow partial data entry
- Show "complete profile" prompts

### Risk 3: User Confusion on Web
**Mitigation**:
- If data not saved, remove fields from form
- If implementing storage, add clear labels
- Show progress indicator

---

## 📊 Summary

### Current Reality ✅
- Mobile API: 12 fields accepted ✅
- Web API: 12 fields accepted ✅  
- Database: 12 fields stored ✅
- **Mobile and web are ALIGNED!**

### Current Problem ❌
- Web Form 1: 27+ fields collected
- Backend: Only 12 fields saved
- **15 fields silently discarded!**

### Immediate Solution ✅
1. Add emergency contacts to mobile (TODAY - safe!)
2. Audit web form (remove unused fields OR implement backend)

### Long-term Solution 💡
- Implement `patient_details` table (Option B)
- Update both web and mobile to use it
- Provide data completeness indicators
- Allow progressive profile completion

---

**RECOMMENDATION: Add emergency contacts to mobile TODAY (zero risk!), then decide on extended data storage approach based on actual business needs.** 🎯
