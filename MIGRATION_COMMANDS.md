# Migration Commands - Quick Reference

## Fresh Installation (Recommended for Development)

```bash
# Navigate to backend
cd backend

# Drop all tables and run fresh migrations
php artisan migrate:fresh

# Seed default clinic and users
php artisan db:seed --class=DefaultClinicSeeder

# Verify migrations
php artisan migrate:status
```

---

## Check Current Migration Status

```bash
cd backend
php artisan migrate:status
```

You should see:

```
✓ 2026_06_17_160000_create_patients_table
✓ 2026_06_17_160001_create_bite_incidents_table
✓ 2026_06_19_100000_create_bite_locations_table
✓ 2026_06_19_100001_create_appointments_table
✓ 2026_06_19_100002_create_queues_table
✓ 2026_06_19_100003_create_notifications_table
✓ 2026_06_19_100004_create_treatment_records_table
✓ 2026_06_19_100005_create_vaccine_inventory_table
✓ 2026_06_19_100006_create_inventory_transactions_table
```

**Note:** Old tables `vaccination_schedules` and `patient_queue` should NOT appear.

---

## Rollback (if needed)

```bash
cd backend

# Rollback last batch of migrations
php artisan migrate:rollback

# Rollback specific number of migrations
php artisan migrate:rollback --step=7

# Reset all migrations
php artisan migrate:reset
```

---

## Database Inspection

```bash
cd backend

# Connect to MySQL
mysql -u root -p

# Show databases
SHOW DATABASES;

# Use your database
USE animal_bite_db;

# Show all tables
SHOW TABLES;

# Describe specific table structure
DESC queues;
DESC treatment_records;
DESC bite_locations;
DESC appointments;
DESC notifications;
DESC vaccine_inventory;
DESC inventory_transactions;
```

---

## Verify Data After Migration

```bash
cd backend
php artisan tinker
```

Then run these PHP commands in tinker:

```php
// Check if models are accessible
App\Models\Queue::count();
App\Models\TreatmentRecord::count();
App\Models\BiteLocation::count();
App\Models\Appointment::count();
App\Models\Notification::count();
App\Models\VaccineInventory::count();
App\Models\InventoryTransaction::count();

// Check relationships
$patient = App\Models\Patient::first();
$patient->queues; // Should work
$patient->treatmentRecords; // Should work
$patient->appointments; // Should work

// Check bite incident location
$bite = App\Models\BiteIncident::first();
$bite->location; // Should work
$bite->treatmentRecords; // Should work

// Exit tinker
exit;
```

---

## Troubleshooting

### Error: "Table already exists"

```bash
cd backend

# Drop specific table
php artisan db:wipe

# Or manually in MySQL
mysql -u root -p
DROP TABLE IF EXISTS patient_queue;
DROP TABLE IF EXISTS vaccination_schedules;

# Then re-run migrations
php artisan migrate
```

### Error: "Foreign key constraint fails"

This means tables have dependencies. Solution:

```bash
# Drop all tables in correct order
php artisan migrate:fresh
```

### Error: "Class 'VaccinationSchedule' not found"

This is expected! The old model was deleted. Update your controllers:

- Change `VaccinationSchedule` to `TreatmentRecord`
- Change `PatientQueue` to `Queue`

---

## Production Deployment Checklist

Before running migrations in production:

- [ ] Backup database
- [ ] Test migrations in staging environment first
- [ ] Update all controllers that use old models
- [ ] Update API routes
- [ ] Test all endpoints
- [ ] Update frontend components
- [ ] Monitor error logs after deployment

---

*Quick Reference: June 19, 2026*
