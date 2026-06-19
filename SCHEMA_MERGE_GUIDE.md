# Database Schema Merge - Complete Guide

## Overview
This document explains the database schema consolidation that merged old and new tables into a unified, comprehensive system.

---

## What Was Merged

### ✅ DELETED OLD TABLES

1. **`patient_queue`** table (migration deleted)
   - **Merged into:** `queues` table
   - **Reason:** Duplicate functionality

2. **`vaccination_schedules`** table (migration deleted)
   - **Merged into:** `treatment_records` table
   - **Reason:** Treatment records now handle both scheduling AND administration

### ✅ DELETED OLD MODELS

1. **`PatientQueue.php`** model (deleted)
   - **Replaced by:** `Queue.php` model

2. **`VaccinationSchedule.php`** model (deleted)
   - **Replaced by:** `TreatmentRecord.php` model

---

## New Unified Schema

### 1. **QUEUES TABLE** (Merged from patient_queue)

**Purpose:** Unified queue management for all patient visits (walk-ins, appointments, vaccinations, follow-ups)

**Key Features:**
- Handles both walk-ins and appointments
- Tracks queue workflow: check-in → call → consultation → completion
- Links to bite incidents for context
- Daily auto-generated queue numbers
- Visit type tracking (new_case, follow_up, vaccination, observation)
- Priority levels (normal, urgent, emergency)
- Staff assignment tracking

**Fields Added from Old patient_queue:**
- `clinic_id` (FK)
- `bite_id` (FK) 
- `queue_date`
- `visit_type`
- `priority`
- `checked_in_at`, `called_at`, `completed_at`
- `checked_in_by`, `handled_by`
- `check_in_notes`, `consultation_notes`

**Relationships:**
- Belongs to: Clinic, Patient, Appointment, BiteIncident
- Belongs to: User (checked_in_by, handled_by)

---

### 2. **TREATMENT_RECORDS TABLE** (Merged from vaccination_schedules)

**Purpose:** Comprehensive treatment documentation that handles BOTH scheduling AND actual treatment records

**Dual Functionality:**
1. **Scheduling:** When `status = 'scheduled'`, acts as vaccination schedule
2. **Documentation:** When `status = 'completed'`, acts as treatment record

**Key Features:**
- WHO protocol compliance (protocol_type, dose_number)
- Scheduled vs actual dates
- Complete vaccine administration details
- Inventory tracking
- Financial records (cost_recovery)
- Legal documentation (signature)
- Adverse reactions tracking
- Additional medications (TT status, other meds)

**Fields Added from Old vaccination_schedules:**
- `clinic_id` (FK)
- `protocol_type` (standard, accelerated, modified)
- `scheduled_date` (when dose is planned)
- `injection_site`
- `dosage_ml`
- `administered_by` (FK → users)
- `administered_at` (timestamp)
- `adverse_reaction`
- `administration_notes`
- `scheduled_by` (FK → users)
- Status values: `scheduled`, `completed`, `missed`, `rescheduled`, `cancelled`

**Relationships:**
- Belongs to: Clinic, Patient, BiteIncident, Appointment, VaccineInventory
- Belongs to: User (administered_by, scheduled_by)

---

### 3. **BITE_LOCATIONS TABLE** (New)

**Purpose:** Geographic tracking of bite incident locations for epidemiological analysis

**Fields:**
- `location_id` (PK, string)
- `bite_id` (FK → bite_incidents)
- `bite_address` (full address)
- `latitude`, `longitude` (GPS coordinates)
- `barangay` (local government unit)
- `municipality` (city/municipality)

**Relationships:**
- Belongs to: BiteIncident

---

### 4. **APPOINTMENTS TABLE** (New)

**Purpose:** Formal appointment scheduling system

**Fields:**
- `appointment_id` (PK, string)
- `patient_id` (FK)
- `staff_id` (FK)
- `scheduled_date` (datetime)
- `status` (scheduled, completed, cancelled, no_show)
- `queue_number` (links to queue on appointment day)

**Relationships:**
- Belongs to: Patient, Staff/User
- Has one: Queue
- Has many: Notifications, TreatmentRecords

---

### 5. **NOTIFICATIONS TABLE** (New)

**Purpose:** Patient notification tracking (SMS, email, push)

**Fields:**
- `notification_id` (PK, string)
- `patient_id` (FK)
- `appointment_id` (FK, nullable)
- `type` (sms, email, push)
- `status` (pending, sent, failed, read)
- `send_time` (datetime)

**Relationships:**
- Belongs to: Patient, Appointment

---

### 6. **VACCINE_INVENTORY TABLE** (New)

**Purpose:** Vaccine stock management

**Fields:**
- `inventory_id` (PK, string)
- `clinic_id` (FK)
- `vaccine_type` (Anti-rabies, Tetanus, etc.)
- `batch_number`
- `current_quantity` (int)
- `expiration_date` (datetime)
- `status` (active, expired, depleted)

**Relationships:**
- Belongs to: Clinic
- Has many: InventoryTransactions, TreatmentRecords

---

### 7. **INVENTORY_TRANSACTIONS TABLE** (New)

**Purpose:** Audit trail for vaccine inventory movements

**Fields:**
- `transaction_id` (PK, string)
- `inventory_id` (FK)
- `staff_id` (FK)
- `transaction_type` (received, used, adjusted, expired, disposed)
- `quantity` (int)
- `transaction_date` (datetime)
- `reference_id` (links to treatment_id or PO)
- `remarks` (text)

**Relationships:**
- Belongs to: VaccineInventory, Staff/User

---

## Migration Order

The migrations will run in this order:

1. ✅ `2026_06_17_160000_create_patients_table.php` (existing)
2. ✅ `2026_06_17_160001_create_bite_incidents_table.php` (existing)
3. ✅ **DELETED:** `2026_06_17_160002_create_vaccination_schedules_table.php`
4. ✅ **DELETED:** `2026_06_17_160003_create_patient_queue_table.php`
5. 🆕 `2026_06_19_100000_create_bite_locations_table.php`
6. 🆕 `2026_06_19_100001_create_appointments_table.php`
7. 🆕 `2026_06_19_100002_create_queues_table.php` (replaces patient_queue)
8. 🆕 `2026_06_19_100003_create_notifications_table.php`
9. 🆕 `2026_06_19_100004_create_treatment_records_table.php` (replaces vaccination_schedules)
10. 🆕 `2026_06_19_100005_create_vaccine_inventory_table.php`
11. 🆕 `2026_06_19_100006_create_inventory_transactions_table.php`

---

## Running Migrations

### Fresh Installation (Recommended)

If you haven't deployed to production yet, do a **fresh migration**:

```bash
cd backend

# Drop all tables and re-migrate
php artisan migrate:fresh

# Run seeder
php artisan db:seed --class=DefaultClinicSeeder
```

### Existing Database (Production)

If you already have data in old tables:

```bash
cd backend

# Step 1: Backup your database first!
# Step 2: Drop old tables manually
php artisan db:wipe

# Step 3: Run fresh migrations
php artisan migrate

# Step 4: Seed default data
php artisan db:seed
```

---

## Controllers to Update

The following controllers reference old models and need updates:

### ✅ Update Required:

1. **`QueueController.php`**
   - Change: `PatientQueue` → `Queue`
   - Add: Support for `visit_type`, `priority`, workflow timestamps

2. **`VaccinationController.php`**
   - Change: `VaccinationSchedule` → `TreatmentRecord`
   - Add: Support for dual scheduling/treatment functionality
   - Filter: `where('protocol_type', '!=', null)` to distinguish vaccinations from other treatments

3. **`BiteCaseController.php`**
   - Add: Support for `BiteLocation` relationship
   - Update: Use `treatmentRecords()` instead of `vaccinationSchedules()`

4. **`PatientController.php`**
   - Update: Use `treatmentRecords()` instead of `vaccinationSchedules()`
   - Add: Support for `appointments()`, `queues()`, `notifications()`

---

## API Routes to Update

Update `backend/routes/api.php`:

```php
// Old (remove these)
Route::prefix('vaccinations')->group(function () { ... });
Route::prefix('queue')->group(function () { ... });

// New (add these)
Route::prefix('treatments')->group(function () { ... }); // Replaces vaccinations
Route::prefix('queues')->group(function () { ... }); // Replaces queue
Route::prefix('appointments')->group(function () { ... }); // New
Route::prefix('notifications')->group(function () { ... }); // New
Route::prefix('inventory')->group(function () { ... }); // New
```

---

## Benefits of Merged Schema

### 1. **Simplified Queue Management**
- Single `queues` table handles all visit types
- No confusion between walk-ins and appointments
- Better workflow tracking

### 2. **Unified Treatment Documentation**
- `treatment_records` handles both scheduling AND documentation
- No data duplication
- Complete treatment history in one place

### 3. **Better Inventory Control**
- Track vaccine stock levels
- Prevent shortages
- Complete audit trail

### 4. **Geographic Insights**
- Map bite incidents by location
- Identify hotspots
- Better resource allocation

### 5. **Professional Scheduling**
- Formal appointment system
- Automated notifications
- Reduced no-shows

---

## Testing Checklist

After migration, test these features:

- [ ] Patient registration
- [ ] Bite case creation (with location)
- [ ] Appointment scheduling
- [ ] Queue check-in (walk-in and appointment)
- [ ] Treatment record creation (scheduled)
- [ ] Treatment administration (complete scheduled treatment)
- [ ] Vaccine inventory management
- [ ] Inventory transactions logging
- [ ] Notification sending

---

## Next Steps

1. ✅ Run migrations
2. ⏳ Update controllers
3. ⏳ Update API routes
4. ⏳ Create new controllers for:
   - AppointmentController
   - NotificationController
   - InventoryController
5. ⏳ Update frontend components
6. ⏳ Create seeder with sample data

---

*Last Updated: June 19, 2026*
