# Setup Troubleshooting Guide

This guide addresses common issues developers face when setting up the Animal Bite Management System for the first time.

---

## 🚨 Common Setup Issues & Solutions

### Issue 1: Migration Fails with "SQLSTATE[HY000]: General error: 1 no such table"

**Symptoms:**
```bash
php artisan migrate
SQLSTATE[HY000]: General error: 1 no such table: clinics
```

**Cause:** Database file doesn't exist or migrations ran out of order.

**Solution:**
```bash
# For SQLite - Ensure database file exists
cd backend
type nul > database\database.sqlite

# Or for PowerShell
New-Item -Path database\database.sqlite -ItemType File -Force

# Then run migrations fresh
php artisan migrate:fresh
```

---

### Issue 2: Seeder Fails with Foreign Key Constraint

**Symptoms:**
```bash
php artisan db:seed --class=DefaultClinicSeeder
SQLSTATE[23000]: Integrity constraint violation
```

**Cause:** Users table requires clinic_id foreign key, but clinics table wasn't created properly.

**Solution:**
```bash
# This issue has been FIXED in the consolidated migration.
# The migration now creates clinics BEFORE users in the correct order.

# If you still encounter this, reset everything:
php artisan migrate:fresh --seed

# This runs migrations AND seeds in correct order
```

**📖 For detailed migration information, see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)**

---

### Issue 3: "No application encryption key has been specified"

**Symptoms:**
```bash
RuntimeException: No application encryption key has been specified.
```

**Cause:** Missing APP_KEY in .env file.

**Solution:**
```bash
cd backend
copy .env.example .env
php artisan key:generate
```

---

### Issue 4: Database Path Issues on Windows

**Symptoms:**
```bash
SQLSTATE[HY000] [14] unable to open database file
```

**Cause:** Incorrect path format or file doesn't exist.

**Solution:**

1. **Check your .env file:**
```env
# Use forward slashes even on Windows
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

2. **Create the file manually:**
```bash
# Using CMD
cd backend
type nul > database\database.sqlite

# Using PowerShell
New-Item -Path database\database.sqlite -ItemType File -Force

# Using Git Bash
touch database/database.sqlite
```

3. **Use absolute path (if relative doesn't work):**
```env
DB_CONNECTION=sqlite
DB_DATABASE=C:/xampp/htdocs/abc/animal-bite-management-system/backend/database/database.sqlite
```

---

### Issue 5: "Class 'DefaultClinicSeeder' not found"

**Symptoms:**
```bash
Target class [DefaultClinicSeeder] does not exist.
```

**Cause:** Composer autoload files aren't generated.

**Solution:**
```bash
cd backend
composer dump-autoload
php artisan db:seed --class=DefaultClinicSeeder
```

---

### Issue 6: CORS Errors in Frontend

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Cause:** Backend not configured for frontend URL.

**Solution:**

1. **Update backend/.env:**
```env
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
```

2. **Restart Laravel server:**
```bash
cd backend
php artisan config:clear
php artisan serve
```

---

### Issue 7: Frontend Can't Connect to Backend

**Symptoms:**
```
Network Error or Failed to fetch
```

**Cause:** Backend not running or wrong API URL.

**Solution:**

1. **Ensure backend is running:**
```bash
cd backend
php artisan serve
# Should show: Server running on [http://127.0.0.1:8000]
```

2. **Check frontend/.env:**
```env
VITE_API_URL=http://localhost:8000
```

3. **Restart frontend dev server:**
```bash
cd frontend
npm run dev
```

---

### Issue 8: Migrations Partially Complete

**Symptoms:**
```
Some migrations ran, but others failed
```

**Solution:**

**Option A: Fresh Start (Recommended for Development)**
```bash
cd backend
php artisan migrate:fresh --seed
```
⚠️ **Warning:** This deletes ALL data!

**Option B: Rollback Failed Migrations**
```bash
cd backend

# Check migration status
php artisan migrate:status

# Rollback last batch
php artisan migrate:rollback

# Then migrate again
php artisan migrate
```

**Option C: Manual Fix (Advanced)**
If specific tables are missing:
```bash
php artisan tinker

# Check what tables exist
>>> DB::select("SELECT name FROM sqlite_master WHERE type='table'");

# If clinics or users are missing, you need fresh migration
>>> exit

php artisan migrate:fresh --seed
```

**📖 For detailed migration dependency information, see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)**

---

### Issue 9: "Cannot modify header information" Error

**Symptoms:**
```php
Warning: Cannot modify header information - headers already sent
```

**Cause:** BOM characters or whitespace in PHP files.

**Solution:**
```bash
cd backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

If problem persists, check for spaces/newlines before `<?php` tags.

---

### Issue 10: Port Already in Use

**Symptoms:**
```bash
php artisan serve
[Errno 48] Address already in use
```

**Solution:**

**Find and kill the process:**
```bash
# Windows CMD
netstat -ano | findstr :8000
taskkill /PID [process_id] /F

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force

# Or use different port
php artisan serve --port=8001
```

---

## 🔄 Complete Fresh Setup Procedure

If everything is broken, follow this step-by-step reset:

### 1. Clean Backend
```bash
cd backend

# Delete existing database
del database\database.sqlite

# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Recreate .env
del .env
copy .env.example .env
php artisan key:generate
```

### 2. Recreate Database
```bash
# Create new database file
type nul > database\database.sqlite

# Or PowerShell
New-Item -Path database\database.sqlite -ItemType File -Force
```

### 3. Run Migrations and Seeds
```bash
# This will:
# 1. Drop all tables
# 2. Run all migrations
# 3. Seed default data
php artisan migrate:fresh --seed
```

### 4. Verify Setup
```bash
# Check if tables exist
php artisan tinker
>>> DB::table('users')->count();
# Should return 4 (admin + 3 staff)
>>> exit

# Start server
php artisan serve
```

### 5. Setup Frontend
```bash
cd frontend

# Create .env if doesn't exist
echo VITE_API_URL=http://localhost:8000 > .env

# Clear node_modules if having issues
rmdir /s /q node_modules
del package-lock.json

# Reinstall
npm install

# Start dev server
npm run dev
```

---

## 🔍 Verification Checklist

After setup, verify everything works:

### Backend Checklist
- [ ] `php artisan serve` runs without errors
- [ ] Visit http://localhost:8000 shows Laravel page
- [ ] Database file exists: `backend/database/database.sqlite`
- [ ] `.env` file exists with APP_KEY
- [ ] Migrations completed: `php artisan migrate:status` shows all green
- [ ] Default accounts exist: Check via Tinker or login

### Frontend Checklist
- [ ] `npm run dev` runs without errors  
- [ ] Visit http://localhost:5173 shows login page
- [ ] `.env` file exists with VITE_API_URL
- [ ] Can see network requests in browser DevTools
- [ ] No CORS errors in console

### Integration Checklist
- [ ] Can login with admin@clinic.com / password123
- [ ] Dashboard loads successfully
- [ ] Can navigate between pages
- [ ] API calls return data (check Network tab)

---

## 📞 Still Having Issues?

### Debug Mode

Enable detailed error messages:

**backend/.env:**
```env
APP_ENV=local
APP_DEBUG=true
LOG_LEVEL=debug
```

**Check logs:**
```bash
# Laravel logs
cd backend
type storage\logs\laravel.log

# Or use tail (if available)
Get-Content storage\logs\laravel.log -Wait
```

### Database Inspection

**Using Tinker:**
```bash
cd backend
php artisan tinker

# Check tables
>>> DB::table('clinics')->get();
>>> DB::table('users')->get();
>>> DB::table('vaccine_inventory')->count();

>>> exit
```

**Using SQLite Browser:**
1. Download DB Browser for SQLite: https://sqlitebrowser.org/
2. Open `backend/database/database.sqlite`
3. Inspect tables and data

---

## 🎯 Prevention Tips

### For New Developers

1. **Always run commands in order:**
   - `composer install` BEFORE `php artisan key:generate`
   - `key:generate` BEFORE `php artisan migrate`
   - `migrate` BEFORE `db:seed`

2. **Never skip .env setup:**
   ```bash
   copy .env.example .env
   php artisan key:generate
   ```

3. **Use migrate:fresh --seed for clean start:**
   ```bash
   php artisan migrate:fresh --seed
   ```
   (Instead of running migrate and seed separately)

4. **Clear caches when config changes:**
   ```bash
   php artisan config:clear
   ```

5. **Check both backend AND frontend are running:**
   - Backend: http://localhost:8000
   - Frontend: http://localhost:5173

---

## 🆘 Emergency Reset Script

Save this as `reset.bat` in backend folder:

```batch
@echo off
echo === Resetting Animal Bite Management System ===
echo.

echo [1/7] Clearing caches...
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo [2/7] Removing old database...
if exist database\database.sqlite del database\database.sqlite

echo [3/7] Creating .env file...
if exist .env del .env
copy .env.example .env

echo [4/7] Generating application key...
php artisan key:generate

echo [5/7] Creating fresh database...
type nul > database\database.sqlite

echo [6/7] Running migrations and seeds...
php artisan migrate:fresh --seed

echo [7/7] Done!
echo.
echo === Setup Complete ===
echo.
echo You can now run: php artisan serve
echo.
pause
```

**Usage:**
```bash
cd backend
reset.bat
```

---

## 📚 Related Documentation

- [README.md](README.md) - Main setup guide
- [API_REFERENCE.md](API_REFERENCE.md) - API endpoints
- [SANCTUM_CORS_SETUP.md](SANCTUM_CORS_SETUP.md) - Authentication issues
- [PHASE4_TESTING.md](PHASE4_TESTING.md) - Testing workflows
