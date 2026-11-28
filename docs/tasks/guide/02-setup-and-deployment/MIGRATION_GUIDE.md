# Database Migration Guide

This document explains the database migration structure, dependencies, and proper execution order for the Animal Bite Management System.

---

## 🔄 Migration Execution Order

Migrations run in **filename alphabetical order**. Laravel uses timestamp prefixes to control execution sequence.

### Current Migration Order (✅ Fixed)

```
1. 0001_01_01_000000_create_users_table.php
   └─> Creates: clinics, users, password_reset_tokens, sessions
   
2. 0001_01_01_000001_create_cache_table.php
   └─> Creates: cache, cache_locks
   
3. 0001_01_01_000002_create_jobs_table.php
   └─> Creates: jobs, job_batches, failed_jobs
   
4. 2026_06_17_134558_create_personal_access_tokens_table.php
   └─> Creates: personal_access_tokens (Sanctum auth)
   
5. 2026_06_17_153200_create_staff_invitations_table.php
   └─> Creates: staff_invitations
   └─> Requires: clinics, users
   
6. 2026_06_17_160000_create_patients_table.php
   └─> Creates: patients
   └─> Requires: clinics, users
   
7. 2026_06_17_160001_create_bite_incidents_table.php
   └─> Creates: bite_incidents
   └─> Requires: clinics, patients, users
   
8. 2026_06_19_100000_create_bite_locations_table.php
   └─> Creates: bite_locations
   └─> Requires: bite_incidents
   
9. 2026_06_19_100001_create_appointments_table.php
   └─> Creates: appointments
   └─> Requires: patients, users
   
10. 2026_06_19_100002_create_queues_table.php
    └─> Creates: queues
    └─> Requires: clinics, patients, appointments, bite_incidents, users
    
11. 2026_06_19_100003_create_notifications_table.php
    └─> Creates: notifications
    └─> Requires: patients, appointments
    
12. 2026_06_19_100004_create_vaccine_inventory_table.php
    └─> Creates: vaccine_inventory
    └─> Requires: clinics
    
13. 2026_06_19_100005_create_treatment_records_table.php
    └─> Creates: treatment_records
    └─> Requires: clinics, patients, bite_incidents, appointments, vaccine_inventory, users
    
14. 2026_06_19_100006_create_inventory_transactions_table.php
    └─> Creates: inventory_transactions
    └─> Requires: vaccine_inventory, users

15. 2026_06_22_000000_add_missing_fields_to_clinics_table.php
    └─> Alters: clinics (adds working_hours, working_days)
    └─> Requires: clinics
```

---

## 🔗 Foreign Key Dependency Tree

```
clinics (root table - no dependencies)
├── users (depends on clinics)
│   ├── staff_invitations (depends on clinics + users)
│   ├── patients (depends on clinics + users)
│   │   ├── bite_incidents (depends on clinics + patients + users)
│   │   │   ├── bite_locations (depends on bite_incidents)
│   │   │   └── queues (depends on multiple tables)
│   │   ├── appointments (depends on patients + users)
│   │   │   ├── queues (depends on multiple tables)
│   │   │   └── notifications (depends on patients + appointments)
│   │   └── treatment_records (depends on multiple tables)
│   └── vaccine_inventory (depends on clinics)
│       ├── inventory_transactions (depends on vaccine_inventory + users)
│       └── treatment_records (depends on multiple tables)
```

---

## ✅ What Was Fixed

### Problem: Circular Dependency Issue

**Before (❌ BROKEN):**
```
1. 0001_01_01_000000_create_users_table.php
   - Created users WITHOUT clinic_id
   
2. 2026_06_17_143749_create_clinics_table.php
   - Created clinics table
   
3. 2026_06_17_143801_add_clinic_fields_to_users_table.php
   - TRIED to add clinic_id foreign key to users
   - ❌ FAILS if clinics table doesn't exist yet
   - ❌ Causes migration order dependency issues
```

**After (✅ FIXED):**
```
1. 0001_01_01_000000_create_users_table.php
   - Creates clinics table FIRST
   - Creates users table WITH clinic_id from the start
   - ✅ No separate migrations needed
   - ✅ Guaranteed correct order
   - ✅ Atomic operation
```

### Changes Made:

1. **Consolidated Migrations**
   - Merged `create_clinics_table.php` into `create_users_table.php`
   - Deleted redundant `add_clinic_fields_to_users_table.php`
   - Clinics now created BEFORE users in same migration

2. **Added All User Fields Initially**
   - `clinic_id` with foreign key constraint
   - `role` enum
   - `is_active` boolean
   - `phone` string
   - `last_login_at` timestamp

3. **Proper Drop Order**
   - Sessions dropped first
   - Password reset tokens dropped second
   - Users dropped third
   - Clinics dropped last
   - Ensures foreign keys are respected

---

## 🚀 Running Migrations

### Fresh Installation (Recommended)

```bash
cd backend

# Create database
type nul > database\database.sqlite

# Run all migrations
php artisan migrate:fresh

# Or run migrations AND seed data
php artisan migrate:fresh --seed
```

### Existing Installation

```bash
cd backend

# Check migration status
php artisan migrate:status

# Run pending migrations
php artisan migrate

# Rollback last batch
php artisan migrate:rollback

# Rollback specific steps
php artisan migrate:rollback --step=2
```

---

## 🔍 Verifying Migration Success

### Check Table Creation

```bash
php artisan tinker

# List all tables
>>> DB::select("SELECT name FROM sqlite_master WHERE type='table'");

# Check specific table structure
>>> DB::select("PRAGMA table_info(users)");
>>> DB::select("PRAGMA table_info(clinics)");

# Check foreign keys
>>> DB::select("PRAGMA foreign_key_list(users)");

>>> exit
```

### Verify Foreign Keys

```bash
php artisan tinker

# Check users have clinic_id
>>> Schema::hasColumn('users', 'clinic_id');
// Should return: true

# Check foreign key exists
>>> DB::select("PRAGMA foreign_key_list(users)");
// Should show clinic_id -> clinics(id)

>>> exit
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "SQLSTATE[HY000]: General error: 1 table clinics already exists"

**Cause:** Trying to run migrations when old structure exists.

**Solution:**
```bash
cd backend
php artisan migrate:fresh --seed
```

### Issue 2: "SQLSTATE[23000]: Integrity constraint violation"

**Cause:** Foreign key reference to non-existent table or record.

**Solution:**
```bash
# Fresh start
php artisan migrate:fresh

# Or check migration order
php artisan migrate:status
```

### Issue 3: Migrations table is out of sync

**Cause:** Manual database changes or interrupted migrations.

**Solution:**
```bash
# Reset migrations table
php artisan migrate:reset

# Run all migrations again
php artisan migrate

# Or fresh start with seed
php artisan migrate:fresh --seed
```

### Issue 4: "Base table or view already exists: 1050 Table 'users' already exists"

**Cause:** Migration ran partially or manually created tables exist.

**Solution:**
```bash
# Option 1: Fresh migration (deletes data)
php artisan migrate:fresh

# Option 2: Check what exists
php artisan migrate:status

# Option 3: Manual database inspection
php artisan tinker
>>> DB::select("SELECT name FROM sqlite_master WHERE type='table'");
>>> exit
```

---

## 📋 Migration Checklist

Before running migrations, ensure:

- [ ] `.env` file exists with database configuration
- [ ] Database file/connection is accessible
- [ ] `APP_KEY` is generated
- [ ] No existing tables conflict with migration names
- [ ] Composer dependencies are installed
- [ ] Laravel can connect to database

After running migrations, verify:

- [ ] All migrations show "Ran" status: `php artisan migrate:status`
- [ ] Clinics table exists with correct columns
- [ ] Users table has `clinic_id` foreign key
- [ ] All foreign keys are properly constrained
- [ ] No error messages in output
- [ ] Can seed default data: `php artisan db:seed`

---

## 🔧 Migration Best Practices

### 1. Always Use Transactions
Migrations are wrapped in database transactions automatically. If one fails, all changes rollback.

### 2. Use Descriptive Names
```php
// Good
2026_06_17_160000_create_patients_table.php

// Bad
2026_06_17_160000_migration.php
```

### 3. One Migration Per Table (Generally)
- Create table in one migration
- Alter table in separate migration
- Exception: Related tables can be created together (clinics + users)

### 4. Use Foreign Key Constraints
```php
// Always specify table and column explicitly
$table->foreignId('clinic_id')
    ->constrained('clinics', 'id')
    ->cascadeOnDelete();
```

### 5. Add Indexes for Performance
```php
$table->index('email');
$table->index('status');
$table->index(['clinic_id', 'patient_id']); // Composite index
```

### 6. Use Proper Column Types
```php
$table->enum('status', ['active', 'inactive']); // Limited options
$table->string('email')->unique(); // Enforce uniqueness
$table->text('notes')->nullable(); // Allow NULL
$table->timestamp('created_at')->useCurrent(); // Auto timestamp
```

---

## 🎯 Testing Migrations

### Test Fresh Migration

```bash
# 1. Delete database
cd backend
del database\database.sqlite

# 2. Create new database
type nul > database\database.sqlite

# 3. Run migrations
php artisan migrate:fresh --seed

# 4. Verify
php artisan tinker
>>> DB::table('users')->count();
// Should return 4 (admin + 3 staff)
>>> exit

# 5. Check foreign keys work
php artisan tinker
>>> $user = App\Models\User::first();
>>> $user->clinic;
// Should return clinic object
>>> exit
```

### Test Rollback

```bash
# Rollback last batch
php artisan migrate:rollback

# Check status
php artisan migrate:status

# Migrate again
php artisan migrate
```

---

## 📝 Creating New Migrations

### Generate Migration

```bash
# Create new table
php artisan make:migration create_table_name_table

# Alter existing table
php artisan make:migration add_column_to_table_name

# Example
php artisan make:migration create_medical_records_table
```

### Migration Template

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('table_name', function (Blueprint $table) {
            $table->id();
            
            // Foreign keys
            $table->foreignId('clinic_id')
                ->constrained('clinics', 'id')
                ->cascadeOnDelete();
            
            // Regular columns
            $table->string('column_name');
            $table->text('description')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index('column_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('table_name');
    }
};
```

---

## 🆘 Emergency Reset

If migrations are completely broken:

```bash
cd backend

# 1. Backup data (if needed)
# ...

# 2. Delete database
del database\database.sqlite

# 3. Create fresh database
type nul > database\database.sqlite

# 4. Clear all Laravel caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# 5. Fresh migration with seed
php artisan migrate:fresh --seed

# 6. Verify
php verify-setup.php
```

---

## 📚 Additional Resources

- [Laravel Migration Documentation](https://laravel.com/docs/11.x/migrations)
- [Database Schema Blueprint](https://laravel.com/docs/11.x/migrations#columns)
- [Foreign Key Constraints](https://laravel.com/docs/11.x/migrations#foreign-key-constraints)
- [SETUP_TROUBLESHOOTING.md](SETUP_TROUBLESHOOTING.md) - Setup issues
- [API_REFERENCE.md](API_REFERENCE.md) - Database schema overview
