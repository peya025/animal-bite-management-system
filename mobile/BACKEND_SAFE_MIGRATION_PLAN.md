# Backend-Safe Migration Plan for Mobile Patient Registration

## 🚨 Critical Finding: Backend Discrepancy

### Current Mobile API Accepts (Limited Fields)
The mobile endpoint (`/api/mobile/patients`) currently validates **only these fields**:

```php
'clinic_id' => required
'relationship' => required (self/child/dependent)
'first_name' => required
'middle_name' => nullable
'last_name' => required
'suffix' => nullable
'gender' => required (male/female)
'date_of_birth' => nullable
'address' => nullable
'contact_number' => nullable
'emergency_contact_name' => nullable      // ✅ Already supported!
'emergency_contact_number' => nullable    // ✅ Already supported!
```

**Total: 12 fields** (10 basic + 2 emergency contact)

### Web Form 1 Uses (Full Fields)
The web `AddPatientModal` sends **27+ fields** including:
- Blood type
- Mother's maiden name
- Civil status
- Spouse name
- Complete address breakdown (municipality, barangay, purok)
- Educational attainment
- Employment status
- Family member position
- PhilHealth member info (4 fields)
- 4Ps member
- DSWD NHTS
- Treatment record data

### Database Patient Model Supports (Minimal)
The `Patient` model fillable fields:

```php
'clinic_id'
'patient_number'          // Auto-generated
'card_token'              // Auto-generated
'first_name'
'middle_name'
'last_name'
'suffix'
'gender'
'age'                     // Calculated field
'date_of_birth'
'address'                 // Single text field
'contact_number'
'emergency_contact_name'
'emergency_contact_number'
'registered_by'
'registration_source'     // Set to 'mobile'
'registration_date'       // Auto-set
```

**Total: 13 storable fields in patients table**

---

## 🔥 THE PROBLEM

### Web Form 1 Data Is NOT in `patients` Table!

The web form's additional fields (blood type, PhilHealth, socioeconomic, etc.) are **either**:
1. ❌ **Not stored at all** (likely!)
2. ❌ **Stored in a separate table** we haven't found
3. ❌ **Stored in a JSON field** in patients table

Let me check if there's additional storage:

---

## Investigation Needed

### Check 1: Are there additional patient-related tables?

Looking at migrations for:
- `patient_details` table?
- `patient_socioeconomic` table?
- `patient_health_info` table?
- JSON column in `patients` table?

### Check 2: Does the web actually SAVE Form 1 data?

The web `AddPatientModal.tsx` sends all that data, but does the backend API (`/api/patients`) accept and store it?

---

## 🛡️ SAFE Migration Strategy

### Phase 1: Audit Current Backend (DO THIS FIRST!)

**Step 1: Check web patient API endpoint**
```bash
# Find the web patient controller
backend/app/Http/Controllers/PatientController.php
```

**Step 2: Check database schema**
```bash
# Check for additional tables
backend/database/migrations/*patients*
```

**Step 3: Compare mobile vs web endpoints**
- Mobile: `POST /api/mobile/patients` (limited validation)
- Web: `POST /api/patients` (full Form 1?)

### Phase 2: Understand Data Storage

**Scenario A: Web Form 1 data is NOT stored**
- ✅ **Good news**: We're not breaking anything
- ✅ **Action**: We can add fields gradually to both mobile and backend
- ✅ **Migration**: No data migration needed

**Scenario B: Web Form 1 data IS stored elsewhere**
- ⚠️ **Concern**: Mobile creates incomplete records
- ⚠️ **Action**: Need to understand storage structure
- ⚠️ **Migration**: Must match web's data model

### Phase 3: Safe Implementation Approach

#### Option 1: Extend Mobile API Gradually (SAFEST)

**Step-by-step field additions:**

**Iteration 1: Emergency contacts (ALREADY SUPPORTED!)**
```dart
// Mobile already supports these fields!
'emergency_contact_name' => nullable
'emergency_contact_number' => nullable
```
✅ **No backend changes needed**
✅ **Just add to mobile UI**

**Iteration 2: Add backend validation for new fields**
```php
// backend/app/Http/Controllers/Mobile/PatientProfileController.php

public function store(Request $request) {
    $validated = $request->validate([
        // Existing fields...
        
        // NEW FIELDS (Phase 1)
        'blood_type' => ['nullable', 'string', 'max:10'],
        'mother_maiden_name' => ['nullable', 'string', 'max:255'],
        'civil_status' => ['nullable', 'in:single,married,widowed,separated,annulled,cohabitation'],
        'spouse_name' => ['nullable', 'string', 'max:255'],
        
        // Address breakdown (if we add these fields to DB)
        'address_municipality' => ['nullable', 'string', 'max:255'],
        'address_barangay' => ['nullable', 'string', 'max:255'],
        'address_purok' => ['nullable', 'string', 'max:255'],
    ]);
}
```

**Iteration 3: Create migration for new fields**
```php
// backend/database/migrations/2026_01_27_add_form1_fields_to_patients.php

Schema::table('patients', function (Blueprint $table) {
    $table->string('blood_type', 10)->nullable()->after('date_of_birth');
    $table->string('mother_maiden_name')->nullable()->after('blood_type');
    $table->string('civil_status', 50)->nullable()->after('mother_maiden_name');
    $table->string('spouse_name')->nullable()->after('civil_status');
    
    // Address breakdown
    $table->string('address_municipality')->nullable()->after('address');
    $table->string('address_barangay')->nullable()->after('address_municipality');
    $table->string('address_purok')->nullable()->after('address_barangay');
    $table->string('province', 100)->nullable()->after('address_purok');
});
```

**Iteration 4: Update Patient model fillable**
```php
// backend/app/Models/Patient.php

protected $fillable = [
    // ... existing fields
    'blood_type',
    'mother_maiden_name',
    'civil_status',
    'spouse_name',
    'address_municipality',
    'address_barangay',
    'address_purok',
    'province',
];
```

#### Option 2: Separate Table for Extended Data (BETTER FOR COMPLEX DATA)

**Create `patient_details` table:**
```php
Schema::create('patient_details', function (Blueprint $table) {
    $table->id();
    $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
    
    // Socioeconomic
    $table->string('educational_attainment', 50)->nullable();
    $table->string('employment_status', 50)->nullable();
    $table->string('family_member', 50)->nullable();
    
    // Government Programs
    $table->enum('philhealth_member', ['yes', 'no'])->nullable();
    $table->enum('philhealth_status', ['member', 'dependent'])->nullable();
    $table->string('philhealth_no', 50)->nullable();
    $table->string('philhealth_category', 50)->nullable();
    $table->enum('fourps_member', ['yes', 'no'])->nullable();
    $table->enum('dswd_nhts', ['yes', 'no'])->nullable();
    
    $table->timestamps();
});
```

**Relationship in Patient model:**
```php
public function details()
{
    return $this->hasOne(PatientDetails::class, 'patient_id', 'patient_id');
}
```

---

## 🎯 Recommended Safe Approach

### Phase 1: Add Emergency Contacts to Mobile UI (TODAY - No Backend Changes!)

**What to do:**
1. ✅ Update `profile_setup_view.dart` to add 2 fields:
   - Emergency Contact Name
   - Emergency Contact Phone
2. ✅ These fields **already work** with backend!
3. ✅ Zero risk - no backend changes needed

**Code change (mobile only):**
```dart
// Add after contact_number field
_field('Emergency Contact Name', _emergencyContactName),
_field('Emergency Contact Phone', _emergencyContactPhone, phone: true),

// In createPatient call:
'emergency_contact_name': _optional(_emergencyContactName),
'emergency_contact_number': _optional(_emergencyContactPhone),
```

**Impact:** ✅ Immediate safety improvement, zero risk

---

### Phase 2: Investigate Web Backend (BEFORE any other changes)

**Tasks:**
1. Check `PatientController.php` (web endpoint)
2. Review database schema for additional tables
3. Compare what web stores vs what mobile stores
4. Document findings

**Questions to answer:**
- Does web Form 1 actually save all 27 fields?
- Where does it save them?
- Is there a `patient_details` or similar table?
- Are we using JSON columns?

---

### Phase 3: Design Backend Extension (After Investigation)

**Based on findings, choose:**

**Option A: Extend patients table**
- If web doesn't store extra fields either
- Simple, keeps data together
- Add nullable columns for new fields

**Option B: Create patient_details table**
- If data is complex and optional
- Better for government program info
- Cleaner separation of concerns

**Option C: Use JSON column**
- Quick solution
- Less type safety
- Good for rarely-queried data

---

### Phase 4: Implement Gradually

**Sprint 1 (Week 1): Critical Fields**
- Blood type
- Emergency contacts (already done!)
- Civil status

**Sprint 2 (Week 2): Address System**
- PSGC integration
- Municipality, Barangay, Purok
- Backend support for address breakdown

**Sprint 3 (Week 3): Socioeconomic**
- Educational attainment
- Employment status
- Family member position

**Sprint 4 (Week 4): Government Programs**
- PhilHealth information
- 4Ps member
- DSWD NHTS

---

## Testing Strategy (CRITICAL!)

### Test Each Phase Separately

**Phase 1 Tests:**
```bash
# Mobile creates patient with emergency contacts
POST /api/mobile/patients
{
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "emergency_contact_name": "Maria Dela Cruz",
  "emergency_contact_number": "09123456789"
}

# Verify in database
SELECT emergency_contact_name, emergency_contact_number 
FROM patients 
WHERE patient_id = ?
```

**Regression Tests:**
```bash
# Ensure old mobile registrations still work
POST /api/mobile/patients
{
  "first_name": "Juan",
  "last_name": "Dela Cruz"
  // No new fields
}

# Must succeed without errors
```

**Web Compatibility Tests:**
```bash
# Ensure web registration still works
POST /api/patients
{
  // Full Form 1 data
}

# Verify no conflicts with mobile data
```

---

## Rollback Plan

### If Something Breaks

**Mobile-side rollback:**
```bash
# Revert to previous mobile app version
git checkout <previous-commit>
flutter build apk
# Deploy previous version
```

**Backend-side rollback:**
```bash
# Rollback migration
php artisan migrate:rollback --step=1

# Revert controller changes
git checkout <previous-commit> app/Http/Controllers/Mobile/PatientProfileController.php
```

**Data integrity check:**
```sql
-- Check for orphaned data
SELECT * FROM patients 
WHERE emergency_contact_name IS NOT NULL 
  AND registration_source = 'mobile';
  
-- Verify no corruption
SELECT COUNT(*) FROM patients 
WHERE first_name IS NULL 
  OR last_name IS NULL;
```

---

## Risk Assessment

### Low Risk ✅
- Adding emergency contact fields to mobile UI (backend already supports)
- Adding validation for new optional fields
- Creating separate `patient_details` table

### Medium Risk ⚠️
- Modifying existing `patients` table columns
- Changing validation rules on mobile endpoint
- PSGC API integration (external dependency)

### High Risk 🔴
- Removing any existing fields
- Making optional fields required
- Changing data types of existing fields
- Modifying web patient API (might affect existing web users)

---

## Communication Plan

### Before Starting

**Team meeting to:**
1. Review investigation findings
2. Agree on storage approach (patients table vs separate table)
3. Set sprint timeline
4. Assign testing responsibilities

### During Implementation

**Daily standups:**
- Report backend changes made
- Confirm mobile-backend compatibility
- Escalate any migration issues

**Code review checklist:**
- [ ] Backward compatible with existing mobile registrations
- [ ] Web patient API not affected
- [ ] Migration is reversible
- [ ] Tests cover new fields
- [ ] Documentation updated

### After Deployment

**Monitor:**
- Mobile registration error rates
- Web registration error rates
- Database query performance
- User complaints/support tickets

---

## Decision Tree

```
┌─────────────────────────────────────┐
│ Start: Need Form 1 in Mobile        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Check: Does web store Form 1 data?  │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌─────────┐    ┌─────────┐
│   YES   │    │   NO    │
└────┬────┘    └────┬────┘
     │              │
     ▼              ▼
┌─────────────┐  ┌──────────────┐
│ Where is it │  │ Add fields   │
│ stored?     │  │ to backend   │
└─────┬───────┘  │ + mobile     │
      │          └──────────────┘
      ▼                  ▲
┌──────────────┐         │
│ Patients     │─────────┘
│ table?       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Separate     │
│ table?       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ JSON column? │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Match that   │
│ approach in  │
│ mobile       │
└──────────────┘
```

---

## Next Immediate Steps

### Step 1: Investigation (30 minutes)

```bash
# Check web patient controller
cat backend/app/Http/Controllers/PatientController.php

# Check for additional tables
ls backend/database/migrations/ | grep patient

# Check Patient model
cat backend/app/Models/Patient.php | grep -A 50 'fillable'
```

### Step 2: Document Findings (15 minutes)

Create `BACKEND_INVESTIGATION_RESULTS.md` with:
- What fields web actually stores
- Where they're stored
- Current mobile vs web discrepancies

### Step 3: Make Go/No-Go Decision (Team meeting)

**If investigation shows:**
- Web doesn't store Form 1 data → **GO** (add to both)
- Web stores in patients table → **GO** (match schema)
- Web stores in separate table → **GO** (create mobile version)
- Web stores in complex way → **PAUSE** (redesign needed)

### Step 4: Start with Emergency Contacts (1 hour)

**Safest first step - backend already supports it!**

---

## Summary

### ✅ DO THIS IMMEDIATELY
1. **Add emergency contact fields** to mobile UI (safe, backend supports it!)
2. **Investigate web backend** to understand Form 1 storage
3. **Test mobile API** with current fields to ensure nothing breaks

### ⚠️ DO THIS CAREFULLY
1. **Extend backend validation** only after investigation
2. **Add new database fields** with proper migration and rollback
3. **Test thoroughly** at each step
4. **Monitor production** after deployment

### 🔴 DON'T DO THIS
1. **Don't modify existing fields** (breaks existing registrations)
2. **Don't make optional fields required** (breaks backward compat)
3. **Don't change web API** without full regression testing
4. **Don't deploy without rollback plan**

---

**RECOMMENDATION: Start with emergency contacts (safe!), then investigate before proceeding.** 🛡️
