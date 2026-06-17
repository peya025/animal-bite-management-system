# 🚀 Complete Setup Guide - Animal Bite Management System

**Last Updated:** June 18, 2026

This guide walks you through setting up the complete Animal Bite Management System from scratch.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Mobile Setup (Optional)](#mobile-setup-optional)
5. [First Run](#first-run)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

Before starting, install these tools:

| Software | Version | Download Link | Purpose |
|----------|---------|---------------|---------|
| PHP | 8.2+ | [php.net](https://www.php.net/downloads) | Backend runtime |
| Composer | Latest | [getcomposer.org](https://getcomposer.org/) | PHP package manager |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) | Frontend build tools |
| XAMPP | Latest | [apachefriends.org](https://www.apachefriends.org/) | Development server |
| Flutter | 3.12.1+ | [docs.flutter.dev](https://docs.flutter.dev/get-started/install) | Mobile development |

### Verify Installation

Open terminal/command prompt and run:

```bash
php --version
composer --version
node --version
npm --version
flutter doctor  # Optional, for mobile development
```

All commands should return version information without errors.

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\backend
```

### Step 2: Install PHP Dependencies

```bash
composer install
```

This may take 2-5 minutes depending on your internet connection.

### Step 3: Configure Environment

```bash
# Copy environment template
copy .env.example .env

# Generate application key
php artisan key:generate
```

### Step 4: Setup Database

**Option A: SQLite (Recommended for beginners)**

```bash
# Create database file
type nul > database\database.sqlite
```

Then edit `.env` file and set:
```env
DB_CONNECTION=sqlite
DB_DATABASE=C:\xampp\htdocs\abc\animal-bite-management-system\backend\database\database.sqlite
```

**Option B: MySQL (For production)**

1. Open phpMyAdmin: http://localhost/phpmyadmin
2. Create new database: `animal_bite_db`
3. Edit `.env` file:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=animal_bite_db
DB_USERNAME=root
DB_PASSWORD=
```

### Step 5: Run Database Migrations

```bash
php artisan migrate
```

You should see output like:
```
  2026_06_17_143749_create_clinics_table ........... 10ms DONE
  2026_06_17_143801_add_clinic_fields_to_users_table ... 5ms DONE
  ...
```

### Step 6: Seed Test Data

```bash
php artisan db:seed --class=DefaultClinicSeeder
```

This creates:
- 1 default clinic
- 4 test user accounts

### Step 7: Start Backend Server

```bash
php artisan serve
```

Keep this terminal window open!

✅ **Backend running at:** http://localhost:8000

Test it: http://localhost:8000/api/test

---

## Frontend Setup

### Step 1: Open New Terminal

**Important:** Don't close the backend terminal! Open a NEW terminal window.

### Step 2: Navigate to Frontend Directory

```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\frontend
```

### Step 3: Install Dependencies

```bash
npm install
```

This may take 3-10 minutes.

### Step 4: Configure API Endpoint (Optional)

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

### Step 5: Start Frontend Server

```bash
npm run dev
```

Keep this terminal window open!

✅ **Frontend running at:** http://localhost:5173

---

## Mobile Setup (Optional)

### Step 1: Open New Terminal

Open a THIRD terminal window.

### Step 2: Navigate to Mobile Directory

```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\mobile
```

### Step 3: Install Dependencies

```bash
flutter pub get
```

### Step 4: Configure API (Important!)

Create `lib/config/api_config.dart`:

```dart
class ApiConfig {
  // For Android emulator
  static const String baseUrl = 'http://10.0.2.2:8000/api';
  
  // For iOS simulator (uncomment if using iOS)
  // static const String baseUrl = 'http://localhost:8000/api';
  
  // For physical device (replace with your computer's IP)
  // static const String baseUrl = 'http://192.168.1.100:8000/api';
}
```

### Step 5: Check Devices

```bash
flutter devices
```

You should see at least one device listed.

### Step 6: Run App

```bash
flutter run
```

Select device when prompted.

✅ **Mobile app running on selected device**

---

## First Run

### 1. Access the Web Application

Open browser: **http://localhost:5173**

### 2. Login with Test Account

Use one of these accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@clinic.com | password123 | Admin |
| registration@clinic.com | password123 | Registration Staff |
| triage@clinic.com | password123 | Triage/Doctor Staff |
| treatment@clinic.com | password123 | Treatment Staff |

### 3. Complete Clinic Setup Wizard

On first login as admin, you'll see the clinic setup wizard:

1. **Clinic Information**
   - Enter clinic name
   - Enter address
   - Enter contact details

2. **Review Settings**
   - Verify information

3. **Complete Setup**
   - Click "Complete Setup"

✅ **System is now ready to use!**

---

## Verification

### Backend API Test

```bash
# Test API connectivity
curl http://localhost:8000/api/test

# Test login
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@clinic.com\",\"password\":\"password123\"}"
```

### Frontend Test

1. Open http://localhost:5173
2. Should see login page
3. Login with test account
4. Should redirect to dashboard

### Mobile Test

1. App should load on device/emulator
2. Login with test account
3. Should see dashboard

---

## Troubleshooting

### Backend Issues

**Problem: "php artisan command not found"**
- Make sure PHP is in your system PATH
- Or use full path: `C:\xampp\php\php.exe artisan serve`

**Problem: "composer: command not found"**
- Install Composer: https://getcomposer.org/
- Restart terminal after installation

**Problem: "Port 8000 already in use"**
```bash
php artisan serve --port=8001
```
Then update frontend API URL to match.

**Problem: Database errors**
```bash
# Reset database
php artisan migrate:fresh --seed
```

**Problem: Permission errors**
- Make sure `storage/` and `bootstrap/cache/` folders are writable

### Frontend Issues

**Problem: "npm: command not found"**
- Install Node.js: https://nodejs.org/
- Restart terminal after installation

**Problem: Dependencies won't install**
```bash
# Clean install
rmdir /s /q node_modules
del package-lock.json
npm install
```

**Problem: API connection errors**
- Check backend is running: http://localhost:8000/api/test
- Check CORS settings in `backend/config/cors.php`

### Mobile Issues

**Problem: "flutter: command not found"**
- Install Flutter SDK: https://docs.flutter.dev/get-started/install
- Add Flutter to PATH
- Restart terminal

**Problem: No devices found**
```bash
# For Android - Start emulator from Android Studio
# Or connect physical device with USB debugging

# Check devices
flutter devices
```

**Problem: Can't connect to API**
- Android emulator: Use `http://10.0.2.2:8000/api`
- iOS simulator: Use `http://localhost:8000/api`
- Physical device: Use your computer's IP: `http://192.168.1.100:8000/api`

### General Issues

**Problem: "Fresh start needed"**
```bash
# Backend
cd backend
php artisan migrate:fresh --seed

# Frontend
cd frontend
rmdir /s /q node_modules
npm install

# Mobile
cd mobile
flutter clean
flutter pub get
```

---

## Quick Command Reference

### Daily Development Workflow

```bash
# Terminal 1 - Backend
cd backend
php artisan serve

# Terminal 2 - Frontend  
cd frontend
npm run dev

# Terminal 3 - Mobile (optional)
cd mobile
flutter run
```

### Useful Commands

```bash
# Backend
php artisan route:list          # View all routes
php artisan tinker              # Interactive shell
php artisan migrate:fresh --seed # Reset database

# Frontend
npm run build                   # Build for production
npm run lint                    # Check code quality

# Mobile
flutter devices                 # List devices
flutter clean                   # Clean build
flutter doctor                  # Check setup
```

---

## Next Steps

After successful setup:

1. **Read Documentation:**
   - [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Feature overview
   - [API_REFERENCE.md](API_REFERENCE.md) - API endpoints
   - [PHASE4_TESTING.md](PHASE4_TESTING.md) - Testing workflows

2. **Test Core Workflows:**
   - Register a patient (registration staff)
   - Create a bite case (triage staff)
   - Record vaccination (treatment staff)
   - Check queue management

3. **Customize:**
   - Update clinic information
   - Add more staff users
   - Configure settings

4. **Development:**
   - Review code structure
   - Make modifications
   - Add new features

---

## Support

If you encounter issues not covered here:

1. Check the main [README.md](README.md)
2. Review [TROUBLESHOOTING](#troubleshooting) section
3. Check Laravel logs: `backend/storage/logs/laravel.log`
4. Enable debug mode: Set `APP_DEBUG=true` in `backend/.env`

---

**🎉 Congratulations! Your Animal Bite Management System is now running!**

Access the system at: http://localhost:5173
