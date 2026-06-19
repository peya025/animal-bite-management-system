# New Database Schema Implementation

## Overview
This document outlines the new database tables added to expand the Animal Bite Management System based on the provided schema diagrams.

## New Tables Created

### 1. **BITE_LOCATION**
Stores geographic information about bite incident locations.

**Purpose:** Track where bite incidents occur for epidemiological analysis and geographical reporting.

**Fields:**
- `location_id` (PK, string)
- `bite_id` (FK → bite_incidents)
- `bite_address` (string) - Full address of incident
- `latitude` (float) - GPS coordinate
- `longitude` (float) - GPS coordinate  
- `barangay` (string) - Local government unit
- `municipality` (string) - City/Municipality

**Relationships:**
- Belongs to: BiteIncident

---

### 2. **APPOINTMENT**
Formal appointment scheduling system for patients.

**Purpose:** Schedule patient visits for new cases, follow-ups, and vaccination doses.

**Fields:**
- `appointment_id` (PK, string)
- `patient_id` (FK → patients)
- `staff_id` (FK → users)
- `scheduled_date` (datetime)
- `status` (string) - scheduled, completed, cancelled, no_show
- `queue_number` (int)

**Relationships:**
- Belongs to: Patient, Staff/User
- Has one: Queue
- Has many: Notifications, TreatmentRecords

---

### 3. **QUEUE**
Enhanced queue management system.

**Purpose:** Manage patient queuing for walk-ins and appointments.

**Fields:**
- `queue_id` (PK, string)
- `patient_id` (FK → patients)
- `appointment_id` (FK → appointments, nullable)
- `queue_number` (int)
- `status` (string) - waiting, called, in_service, completed, cancelled

**Relationships:**
- Belongs to: Patient, Appointment

**Note:** This complements the existing `patient_queue` table. Consider migration strategy.

---

### 4. **NOTIFICATION**
Patient notification tracking system.

**Purpose:** Track SMS, email, and push notifications sent to patients for appointment reminders and follow-ups.

**Fields:**
- `notification_id` (PK, string)
- `patient_id` (FK → patients)
- `appointment_id` (FK → appointments, nullable)
- `type` (string) - sms, email, push
- `status` (string) - pending, sent, failed, read
- `send_time` (datetime)

**Relationships:**
- Belongs to: Patient, Appointment

---

### 5. **TREATMENT_RECORD**
Detailed treatment documentation separate from vaccination schedules.

**Purpose:** Comprehensive treatment records including vaccine administration, medications, and treatment outcomes.

**Fields:**
- `treatment_id` (PK, string)
- `patient_id` (FK → patients)
- `bite_id` (FK → bite_incidents, nullable)
- `appointment_id` (FK → appointments, nullable)
- `inventory_id` (FK → vaccine_inventory, nullable)
- `dose_number` (int)
- `treatment_date` (datetime)
- `route` (string) - IM, SC, ID
- `vaccine_brand` (string)
- `vaccine_generic` (string)
- `batch_no` (string)
- `expiration_date` (datetime)
- `cost_recovery` (string)
- `signature` (string)
- `remarks` (text)
- `outcome` (string)
- `tt_status` (string) - Tetanus toxoid status
- `medication_given` (text)
- `status` (string) - completed, cancelled, pending

**Relationships:**
- Belongs to: Patient, BiteIncident, Appointment, VaccineInventory

---

### 6. **VACCINE_INVENTORY**
Vaccine stock management.

**Purpose:** Track vaccine stock levels, batch numbers, and expiration dates for inventory management.

**Fields:**
- `inventory_id` (PK, string)
- `clinic_id` (FK → clinics)
- `vaccine_type` (string) - Anti-rabies, Tetanus, etc.
- `batch_number` (string)
- `current_quantity` (int)
- `expiration_date` (datetime)
- `status` (string) - active, expired, depleted

**Relationships:**
- Belongs to: Clinic
- Has many: InventoryTransactions, TreatmentRecords

---

### 7. **INVENTORY_TRANSACTION**
Vaccine inventory transaction log.

**Purpose:** Track all vaccine inventory movements (received, used, adjusted, expired, disposed).

**Fields:**
- `transaction_id` (PK, string)
- `inventory_id` (FK → vaccine_inventory)
- `staff_id` (FK → users)
- `transaction_type` (string) - received, used, adjusted, expired, disposed
- `quantity` (int)
- `transaction_date` (datetime)
- `reference_id` (string) - Links to treatment_id or purchase order
- `remarks` (text)

**Relationships:**
- Belongs to: VaccineInventory, Staff/User

---

## Migration Files Created

All migration files are timestamped `2026_06_19_100000` to `2026_06_19_100006`:

1. `2026_06_19_100000_create_bite_locations_table.php`
2. `2026_06_19_100001_create_appointments_table.php`
3. `2026_06_19_100002_create_queues_table.php`
4. `2026_06_19_100003_create_notifications_table.php`
5. `2026_06_19_100004_create_treatment_records_table.php`
6. `2026_06_19_100005_create_vaccine_inventory_table.php`
7. `2026_06_19_100006_create_inventory_transactions_table.php`

## Eloquent Models Created

All models created in `backend/app/Models/`:

1. `BiteLocation.php`
2. `Appointment.php`
3. `Queue.php`
4. `Notification.php`
5. `TreatmentRecord.php`
6. `VaccineInventory.php`
7. `InventoryTransaction.php`

## Running Migrations

To apply the new schema to your database:

```bash
cd backend
php artisan migrate
```

This will create all 7 new tables with proper indexes and foreign key constraints.

## Rollback

To rollback these migrations:

```bash
cd backend
php artisan migrate:rollback --step=7
```

---

## Integration Notes

### Existing vs New Tables

**Queue Management:**
- **Existing:** `patient_queue` table (already implemented)
- **New:** `queues` table (from schema diagram)
- **Action needed:** Determine if you want to migrate data or keep both systems

**Treatment Tracking:**
- **Existing:** `vaccination_schedules` table (WHO protocol focused)
- **New:** `treatment_records` table (comprehensive treatment documentation)
- **Recommendation:** Keep both - use `vaccination_schedules` for scheduling and `treatment_records` for actual treatment documentation

### Next Steps

1. ✅ Create migration files (DONE)
2. ✅ Create Eloquent models (DONE)
3. ⏳ Update existing models with new relationships
4. ⏳ Run migrations on database
5. ⏳ Create controllers for new modules:
   - AppointmentController
   - NotificationController  
   - TreatmentRecordController
   - VaccineInventoryController
   - InventoryTransactionController
6. ⏳ Create API routes for new endpoints
7. ⏳ Create frontend components for new features
8. ⏳ Update seeder with sample data for new tables

---

## Benefits of New Schema

1. **Better Inventory Management:** Track vaccine stock levels and prevent shortages
2. **Comprehensive Treatment Records:** Document all treatment details beyond just vaccinations
3. **Patient Communication:** Automated notification system for appointments and follow-ups
4. **Geographic Analysis:** Map bite incidents by location for epidemiological insights
5. **Formal Appointments:** Schedule and manage patient visits more professionally
6. **Audit Trail:** Complete transaction history for vaccine usage and inventory

---

*Generated: June 19, 2026*
