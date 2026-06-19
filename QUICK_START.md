# 🚀 QUICK START - New Schema Deployment

## ⚡ 3-Step Deployment

### 1️⃣ Run Migrations (2 minutes)

```bash
cd backend
php artisan migrate:fresh
php artisan db:seed --class=DefaultClinicSeeder
```

### 2️⃣ Update Code (10 minutes)

**QueueController.php:**
```php
// Change this:
use App\Models\PatientQueue;
$queue = PatientQueue::create([...]);

// To this:
use App\Models\Queue;
$queue = Queue::create([
    'queue_id' => 'Q-' . Str::uuid(),
    ...
]);
```

**VaccinationController.php:**
```php
// Change this:
use App\Models\VaccinationSchedule;
$schedule = VaccinationSchedule::create([...]);

// To this:
use App\Models\TreatmentRecord;
$schedule = TreatmentRecord::create([
    'treatment_id' => 'TR-' . Str::uuid(),
    ...
]);
```

### 3️⃣ Test (5 minutes)

```bash
# Test database
php artisan tinker
>>> App\Models\Queue::count();
>>> App\Models\TreatmentRecord::count();
>>> exit

# Start server
php artisan serve

# Test login
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinic.com","password":"password123"}'
```

---

## 📋 Cheat Sheet

### Old → New Mapping

| Old | New |
|-----|-----|
| `PatientQueue` | `Queue` |
| `VaccinationSchedule` | `TreatmentRecord` |
| `patient_queue` table | `queues` table |
| `vaccination_schedules` table | `treatment_records` table |
| `bite_incident_id` | `bite_id` |
| `queueEntries()` | `queues()` |
| `vaccinationSchedules()` | `treatmentRecords()` |

### New Tables & Models

| Table | Model | Purpose |
|-------|-------|---------|
| `bite_locations` | `BiteLocation` | GPS tracking |
| `appointments` | `Appointment` | Scheduling |
| `notifications` | `Notification` | Patient alerts |
| `vaccine_inventory` | `VaccineInventory` | Stock management |
| `inventory_transactions` | `InventoryTransaction` | Audit trail |

---

## 🆘 Troubleshooting

### "Table already exists"
```bash
php artisan db:wipe
php artisan migrate
```

### "Class not found: VaccinationSchedule"
✅ Expected! Update controllers to use `TreatmentRecord`

### "Class not found: PatientQueue"
✅ Expected! Update controllers to use `Queue`

### Check migration status
```bash
php artisan migrate:status
```

---

## 📚 Full Documentation

- `✅_SCHEMA_MERGE_COMPLETE.md` - Overview
- `CONTROLLER_UPDATE_GUIDE.md` - Detailed code changes
- `MIGRATION_COMMANDS.md` - All commands
- `SCHEMA_MERGE_GUIDE.md` - Complete guide

---

**Ready to go! 🚀**
