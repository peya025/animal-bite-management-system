# Contributor Setup Guide

## For New Contributors Cloning the Repository

This guide ensures you can set up the project correctly after pulling from the repository.

---

## Prerequisites

Make sure you have installed:
- **PHP 8.2+**
- **Composer**
- **MySQL 8.0+**
- **Node.js 18+** and **npm**
- **XAMPP** (or any PHP/MySQL environment)

---

## 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd animal-bite-management-system

# Install backend dependencies
cd backend
composer install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 2. Configure Backend Environment

```bash
cd backend

# Copy environment file
copy .env.example .env

# Generate application key
php artisan key:generate
```

---

## 3. Configure Database

Edit `backend/.env` file:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=animalbitecenter
DB_USERNAME=root
DB_PASSWORD=
```

Create the database:

```sql
-- In MySQL or phpMyAdmin
CREATE DATABASE animalbitecenter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 4. Run Migrations

```bash
cd backend

# Run all migrations (creates all 16 tables)
php artisan migrate:fresh

# Seed default clinic and users
php artisan db:seed --class=DefaultClinicSeeder
```

Expected output:
```
✅ Default clinic and users created successfully!

📋 Login Credentials:

👤 Admin:
   Email: admin@clinic.com
   Password: password123

👤 Registration Staff:
   Email: registration@clinic.com
   Password: password123

👤 Triage Doctor:
   Email: triage@clinic.com
   Password: password123

👤 Treatment Nurse:
   Email: treatment@clinic.com
   Password: password123
```

---

## 5. Verify Migrations

```bash
php artisan migrate:status
```

You should see all migrations marked as `[1] Ran`:

```
✓ 0001_01_01_000000_create_users_table
✓ 0001_01_01_000001_create_cache_table
✓ 0001_01_01_000002_create_jobs_table
✓ 2026_06_17_134558_create_personal_access_tokens_table
✓ 2026_06_17_143749_create_clinics_table
✓ 2026_06_17_143801_add_clinic_fields_to_users_table
✓ 2026_06_17_153200_create_staff_invitations_table
✓ 2026_06_17_160000_create_patients_table
✓ 2026_06_17_160001_create_bite_incidents_table
✓ 2026_06_19_100000_create_bite_locations_table
✓ 2026_06_19_100001_create_appointments_table
✓ 2026_06_19_100002_create_queues_table
✓ 2026_06_19_100003_create_notifications_table
✓ 2026_06_19_100004_create_vaccine_inventory_table
✓ 2026_06_19_100005_create_treatment_records_table
✓ 2026_06_19_100006_create_inventory_transactions_table
```

---

## 6. Start Development Servers

### Backend (Terminal 1):
```bash
cd backend
php artisan serve
```
Server runs at: http://localhost:8000

### Frontend (Terminal 2):
```bash
cd frontend
npm run dev
```
Frontend runs at: http://localhost:5173

---

## 7. Test the Application

1. **Open browser:** http://localhost:5173
2. **You should see:** Landing page
3. **Click:** "Staff Sign In"
4. **Login with:** `admin@clinic.com` / `password123`
5. **Complete setup wizard** (first-time only)
6. **Access dashboard**

---

## Common Issues & Solutions

### Issue 1: "Table already exists"

**Solution:** Drop and recreate database
```bash
php artisan db:wipe
php artisan migrate
php artisan db:seed --class=DefaultClinicSeeder
```

### Issue 2: "Foreign key constraint error"

**Cause:** Migrations ran in wrong order (should not happen with current setup)

**Solution:** Run fresh migration
```bash
php artisan migrate:fresh
```

The migrations are numbered sequentially:
- `2026_06_19_100000` → `100001` → `100002` → etc.

Laravel runs them in alphabetical order, so the sequence is correct.

### Issue 3: "Connection refused" when testing API

**Solution:** Make sure backend server is running
```bash
cd backend
php artisan serve
```

### Issue 4: Frontend can't connect to backend

**Solution:** Check `frontend/src/services/api.ts` has correct backend URL:
```typescript
const API_BASE_URL = 'http://localhost:8000/api';
```

### Issue 5: "CORS error" in browser console

**Solution:** Backend CORS is already configured in `backend/bootstrap/app.php`

If still having issues, check `backend/config/cors.php`:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:5173'],
```

---

## Database Schema Overview

After successful migration, you'll have these tables:

### Core Tables (9):
1. `clinics` - Clinic information
2. `users` - Staff accounts (admin, registration, triage, treatment)
3. `patients` - Patient records
4. `bite_incidents` - Bite case documentation
5. `bite_locations` - Geographic tracking
6. `appointments` - Appointment scheduling
7. `queues` - Queue management
8. `treatment_records` - Treatment/vaccination records
9. `notifications` - Patient notifications

### Inventory Tables (2):
10. `vaccine_inventory` - Vaccine stock
11. `inventory_transactions` - Inventory audit trail

### Support Tables (5):
12. `staff_invitations` - Staff invitation system
13. `personal_access_tokens` - API authentication tokens
14. `cache` - Application cache
15. `jobs` - Queue jobs
16. `failed_jobs` - Failed job tracking

---

## Development Workflow

### Making Database Changes

1. **Create migration:**
   ```bash
   php artisan make:migration add_field_to_table
   ```

2. **Edit migration file** in `backend/database/migrations/`

3. **Run migration:**
   ```bash
   php artisan migrate
   ```

4. **Rollback if needed:**
   ```bash
   php artisan migrate:rollback
   ```

### Testing Your Changes

1. **Backend API testing:**
   ```bash
   # Use Postman, Insomnia, or curl
   curl http://localhost:8000/api/test
   ```

2. **Frontend testing:**
   - Open http://localhost:5173
   - Check browser console for errors
   - Test user flows

3. **Database inspection:**
   ```bash
   php artisan tinker
   >>> App\Models\Patient::count();
   >>> exit
   ```

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit
git add .
git commit -m "Add: your feature description"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub/GitLab
```

---

## Need Help?

1. Check existing documentation:
   - `✅_SCHEMA_MERGE_COMPLETE.md` - Database schema overview
   - `CONTROLLER_UPDATE_SIMPLIFIED.md` - Controller guide
   - `MIGRATION_COMMANDS.md` - Migration commands

2. Check Laravel logs:
   ```bash
   tail -f backend/storage/logs/laravel.log
   ```

3. Check browser console for frontend errors

4. Contact team lead or create an issue

---

## Important Notes

⚠️ **DO NOT:**
- Modify migration files that have already been run in production
- Push `.env` file to repository (it's in `.gitignore`)
- Commit `node_modules/` or `vendor/` folders

✅ **DO:**
- Run `php artisan migrate:fresh` in development to test migrations
- Keep `.env.example` updated with new environment variables
- Write clear commit messages
- Test before pushing

---

*Last Updated: June 19, 2026*
*For questions, contact the development team*
