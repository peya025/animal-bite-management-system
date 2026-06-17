# Animal Bite Management System

A comprehensive clinic management system for animal bite vaccination workflow, built with Laravel (backend), React + TypeScript (frontend), and Flutter (mobile).

## Tech Stack

- **Backend**: Laravel 12 (PHP 8.2+)
- **Frontend**: React 19 with TypeScript + Vite
- **Database**: SQLite (default) / MySQL
- **Mobile**: Flutter 3.12.1+

## Prerequisites

Before setting up this project, ensure you have:

- **PHP** 8.2 or higher ([Download](https://www.php.net/downloads))
- **Composer** (PHP package manager) ([Install](https://getcomposer.org/))
- **Node.js** 18+ and npm ([Download](https://nodejs.org/))
- **XAMPP** (recommended) or any web server with PHP support ([Download](https://www.apachefriends.org/))
- **Flutter SDK** 3.12.1+ (for mobile app) ([Install](https://docs.flutter.dev/get-started/install))

### Verify Prerequisites

Check if all required tools are installed:

```bash
# Check PHP version
php --version

# Check Composer
composer --version

# Check Node.js and npm
node --version
npm --version

# Check Flutter (for mobile development)
flutter doctor
```

## System Overview

**Independent Clinic Management System** for animal bite vaccination workflow.

### Core Features
1. ✅ **Authentication** - Sanctum-based login/logout
2. ✅ **Clinic Setup** - First-time configuration wizard  
3. ✅ **Users + Roles** - 4 roles (admin, registration, triage, treatment)
4. ✅ **Frontend Dashboard** - Role-specific dashboards with real-time stats
5. ✅ **Patients** - Registration and management (backend ready)
6. ✅ **Bite Cases** - Animal bite case tracking (backend ready)
7. ✅ **Vaccination** - Scheduling and administration recording (backend ready)
8. ✅ **Queue** - Daily patient queue management (backend ready)
9. ✅ **Invitations** - Email invitation system (backend ready)

### Implementation Status
- **Backend API**: 100% Complete (50+ endpoints)
- **Frontend**: 40% Complete (Login + Dashboards done)
- **Mobile**: 0% Complete (Ready to start)

### User Roles
1. **Admin** - Full system configuration and management
2. **Registration Staff** - Patient registration and queue management
3. **Triage/Doctor Staff** - Medical assessment and case creation
4. **Treatment Recording Staff** - Vaccination administration and tracking

📖 **See [FINAL_IMPLEMENTATION.md](FINAL_IMPLEMENTATION.md) for complete implementation guide**

## Tech Stack

This project uses **Laravel Sanctum** for API authentication and **CORS** configuration for frontend-backend communication.

### Quick Setup (Already Done)
- ✅ Sanctum installed and configured
- ✅ CORS configured for localhost:5173
- ✅ Authentication endpoints created
- ✅ Personal access tokens table migrated

### API Endpoints
```
POST /api/register    - Register new user
POST /api/login       - Login and get token
POST /api/logout      - Logout (requires Bearer token)
GET  /api/me          - Get authenticated user info
```

### Frontend Integration
To use authentication in your React app:
1. Install axios: `npm install axios`
2. Configure axios with Bearer token
3. See detailed guide: `SANCTUM_CORS_SETUP.md`

### Testing Authentication
```bash
# Register
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"password123","password_confirmation":"password123"}'

# Login
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

For complete implementation guide, see **[SANCTUM_CORS_SETUP.md](SANCTUM_CORS_SETUP.md)**

## 🗂️ Project Structure

```
animal-bite-management-system/
├── backend/                          # Laravel API backend
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/         # API controllers
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── ClinicSetupController.php
│   │   │   │   ├── UserController.php
│   │   │   │   ├── StaffInvitationController.php
│   │   │   │   ├── PatientController.php
│   │   │   │   ├── BiteCaseController.php
│   │   │   │   ├── VaccinationController.php
│   │   │   │   └── QueueController.php
│   │   │   └── Middleware/
│   │   │       └── CheckRole.php    # Role-based access control
│   │   ├── Models/                  # Eloquent models
│   │   │   ├── User.php
│   │   │   ├── Clinic.php
│   │   │   ├── Patient.php
│   │   │   ├── BiteIncident.php
│   │   │   ├── VaccinationSchedule.php
│   │   │   ├── PatientQueue.php
│   │   │   └── StaffInvitation.php
│   │   └── Providers/
│   ├── database/
│   │   ├── migrations/              # Database schema migrations
│   │   └── seeders/
│   │       └── DefaultClinicSeeder.php  # Test data seeder
│   ├── routes/
│   │   └── api.php                  # API route definitions
│   ├── .env.example                 # Environment template
│   └── composer.json                # PHP dependencies
│
├── frontend/                         # React + TypeScript frontend
│   ├── src/
│   │   ├── components/              # React components
│   │   ├── pages/                   # Page components
│   │   ├── services/                # API service layer
│   │   ├── utils/                   # Utility functions
│   │   └── App.tsx                  # Main app component
│   ├── .env                         # Frontend environment
│   ├── package.json                 # npm dependencies
│   └── vite.config.ts               # Vite configuration
│
├── mobile/                           # Flutter mobile app
│   ├── lib/
│   │   └── main.dart                # App entry point
│   ├── android/                     # Android-specific
│   ├── ios/                         # iOS-specific
│   └── pubspec.yaml                 # Flutter dependencies
│
├── README.md                         # This file
├── API_REFERENCE.md                  # Complete API documentation
├── FINAL_IMPLEMENTATION.md           # Implementation guide
├── PHASE4_TESTING.md                 # Testing workflows
└── WHO_PROTOCOL_IMPLEMENTATION.md    # WHO compliance details
```

## 🚀 Quick Start Guide

### Step 1: Backend Setup (Laravel API)

1. **Navigate to backend directory:**
   ```bash
   cd c:\xampp\htdocs\abc\animal-bite-management-system\backend
   ```

2. **Install PHP dependencies:**
   ```bash
   composer install
   ```

3. **Copy environment configuration:**
   ```bash
   copy .env.example .env
   ```

4. **Generate application key:**
   ```bash
   php artisan key:generate
   ```

5. **Configure database in `.env` file:**
   
   **Option A: SQLite (Recommended for Development)**
   ```env
   DB_CONNECTION=sqlite
   DB_DATABASE=C:\xampp\htdocs\abc\animal-bite-management-system\backend\database\database.sqlite
   ```
   
   Then create the database file:
   ```bash
   type nul > database\database.sqlite
   ```

   **Option B: MySQL (Production)**
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=animal_bite_db
   DB_USERNAME=root
   DB_PASSWORD=
   ```
   
   Then create the database in phpMyAdmin or MySQL CLI.

6. **Run database migrations:**
   ```bash
   php artisan migrate
   ```

7. **Seed test data (IMPORTANT for first login):**
   ```bash
   php artisan db:seed --class=DefaultClinicSeeder
   ```
   
   This creates:
   - 1 default clinic
   - 4 test users (admin, registration, triage, treatment)

8. **Start the Laravel development server:**
   ```bash
   php artisan serve
   ```
   
   ✅ Backend API running at: **http://localhost:8000**

---

### Step 2: Frontend Setup (React + TypeScript)

1. **Open a NEW terminal** and navigate to frontend directory:
   ```bash
   cd c:\xampp\htdocs\abc\animal-bite-management-system\frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint (if needed):**
   
   Create or edit `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   ✅ Frontend running at: **http://localhost:5173**

---

### Step 3: Mobile App Setup (Flutter) - OPTIONAL

1. **Navigate to mobile directory:**
   ```bash
   cd c:\xampp\htdocs\abc\animal-bite-management-system\mobile
   ```

2. **Install Flutter dependencies:**
   ```bash
   flutter pub get
   ```

3. **Check connected devices:**
   ```bash
   flutter devices
   ```

4. **Run the app:**
   ```bash
   flutter run
   ```
   
   For detailed mobile setup, see **[mobile/README.md](mobile/README.md)**

---

## 🔐 First Login

After completing setup, access the web application:

1. Open browser: **http://localhost:5173** (Landing Page)
2. Click **"Sign In"** or **"Access Platform"**
3. Login with default admin account:
   ```
   Email: admin@clinic.com
   Password: password123
   ```

4. Complete the **clinic setup wizard** on first admin login
5. Start using the system!

### Test Accounts (seeded by DefaultClinicSeeder)

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Admin | admin@clinic.com | password123 | Full system access |
| Registration | registration@clinic.com | password123 | Patient registration, queue |
| Triage | triage@clinic.com | password123 | Medical assessment, cases |
| Treatment | treatment@clinic.com | password123 | Vaccination recording |

## 🖥️ Running the Application

### Development Mode (Daily Use)

You need **TWO terminals** running simultaneously:

**Terminal 1 - Backend API:**
```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\backend
php artisan serve
```
Keep this running. Backend API: http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\frontend
npm run dev
```
Keep this running. Frontend: http://localhost:5173

### Mobile Development (Optional)

**Terminal 3 - Mobile App:**
```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\mobile
flutter run
```

---

## 📦 Production Build

### Build Frontend for Production

```bash
cd frontend
npm run build
```

The production-ready files will be in `frontend/dist/`

### Optimize Backend for Production

```bash
cd backend

# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize autoloader
composer install --optimize-autoloader --no-dev
```

### Build Mobile Apps

**Android APK:**
```bash
cd mobile
flutter build apk --release
```
APK location: `mobile/build/app/outputs/flutter-apk/app-release.apk`

**Android App Bundle (Play Store):**
```bash
flutter build appbundle --release
```

**iOS (macOS only):**
```bash
flutter build ios --release
```

## Available Scripts

### Backend (Laravel)

```bash
# Dependency management
composer install          # Install PHP dependencies
composer update          # Update dependencies
composer dump-autoload   # Regenerate autoloader

# Database
php artisan migrate              # Run migrations
php artisan migrate:fresh        # Drop all tables and re-run migrations
php artisan migrate:fresh --seed # Fresh migration + seed data
php artisan db:seed              # Run all seeders
php artisan db:seed --class=DefaultClinicSeeder  # Run specific seeder

# Development
php artisan serve                # Start dev server (port 8000)
php artisan serve --port=8001    # Start on custom port
php artisan tinker               # Interactive REPL
php artisan route:list           # List all routes
php artisan config:clear         # Clear config cache
php artisan cache:clear          # Clear application cache

# Production optimization
php artisan config:cache         # Cache configuration
php artisan route:cache          # Cache routes
php artisan view:cache           # Cache views
php artisan optimize             # Optimize framework
```

### Frontend (React + Vite)

```bash
# Dependency management
npm install              # Install dependencies
npm update              # Update dependencies

# Development
npm run dev             # Start dev server (port 5173)
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run ESLint

# Clean start
rmdir /s /q node_modules && del package-lock.json && npm install
```

### Mobile (Flutter)

```bash
# Dependency management
flutter pub get          # Install dependencies
flutter pub upgrade      # Upgrade dependencies
flutter clean           # Clean build files

# Development
flutter run             # Run app on connected device
flutter run -d android  # Run on Android
flutter run -d chrome   # Run on Chrome (web)
flutter devices         # List available devices

# Build
flutter build apk --release        # Build Android APK
flutter build appbundle --release  # Build Android App Bundle
flutter build ios --release        # Build iOS (macOS only)

# Troubleshooting
flutter doctor          # Check installation
flutter pub cache repair  # Repair package cache
```

## 📚 API Documentation

The Laravel backend API runs on `http://localhost:8000/api`

### Authentication Endpoints
```
POST /api/register    - Register new user
POST /api/login       - Login and get token
POST /api/logout      - Logout (requires auth)
GET  /api/me          - Get authenticated user
GET  /api/test        - Test API connectivity
```

### Clinic Setup
```
GET  /api/clinic/status              - Check setup status
POST /api/clinic/complete-setup      - Complete setup wizard
PUT  /api/clinic                     - Update clinic info (admin)
```

### User Management
```
GET    /api/users           - List users (admin)
POST   /api/users           - Create user (admin)
GET    /api/users/{id}      - Get user details (admin)
PUT    /api/users/{id}      - Update user (admin)
DELETE /api/users/{id}      - Delete user (admin)
```

### Staff Invitations
```
POST   /api/invitations            - Send invitation (admin)
GET    /api/invitations            - List invitations (admin)
GET    /api/invitations/validate   - Validate token
POST   /api/invitations/accept     - Accept invitation
DELETE /api/invitations/{id}       - Cancel invitation (admin)
```

### Patient Management
```
GET    /api/patients              - List patients
POST   /api/patients              - Register patient (registration)
GET    /api/patients/{id}         - Get patient details
PUT    /api/patients/{id}         - Update patient
DELETE /api/patients/{id}         - Delete patient (admin)
GET    /api/patients/search       - Search patients
```

### Bite Case Management
```
GET    /api/bite-cases            - List cases
POST   /api/bite-cases            - Create case (triage)
GET    /api/bite-cases/{id}       - Get case details
PUT    /api/bite-cases/{id}       - Update case (triage)
DELETE /api/bite-cases/{id}       - Delete case (admin)
GET    /api/bite-cases/stats      - Get statistics
```

### Vaccination Management
```
GET    /api/vaccinations/today             - Today's schedule
GET    /api/vaccinations/upcoming          - Upcoming vaccines
GET    /api/vaccinations/overdue           - Overdue vaccines
POST   /api/vaccinations/{id}/administer   - Record administration (treatment)
PUT    /api/vaccinations/{id}/reschedule   - Reschedule dose
```

### Queue Management
```
GET    /api/queue                    - Today's queue
POST   /api/queue                    - Add to queue (registration)
PUT    /api/queue/{id}/call          - Call patient (registration)
PUT    /api/queue/{id}/complete      - Mark complete (treatment)
PUT    /api/queue/{id}/priority      - Update priority (admin)
DELETE /api/queue/{id}               - Remove from queue (admin)
```

**📖 For complete API reference with request/response examples, see [API_REFERENCE.md](API_REFERENCE.md)**

## Environment Variables

### Backend (.env)
- `APP_URL`: Application URL (default: http://localhost)
- `DB_CONNECTION`: Database driver (sqlite/mysql)
- `APP_DEBUG`: Debug mode (true for development)

### Frontend
Configure API base URL in your React app to point to Laravel backend.

## 🔧 Troubleshooting

### Backend Issues

**Problem: "Class not found" or autoloader errors**
```bash
cd backend
composer dump-autoload
```

**Problem: Database connection errors**
- Check `.env` file configuration
- Verify database exists (SQLite file or MySQL database)
- Reset database: `php artisan migrate:fresh --seed`

**Problem: Permission errors (storage/bootstrap/cache)**
```bash
cd backend
# On Windows with Git Bash
chmod -R 775 storage bootstrap/cache

# Or manually set folder permissions in Windows Explorer
```

**Problem: Port 8000 already in use**
```bash
php artisan serve --port=8001
```
Then update frontend API URL to match.

**Problem: Missing .env file**
```bash
copy .env.example .env
php artisan key:generate
```

---

### Frontend Issues

**Problem: Dependencies not installing**
```bash
cd frontend
rmdir /s /q node_modules
del package-lock.json
npm install
```

**Problem: API connection errors**
- Check backend is running: http://localhost:8000/api/test
- Verify CORS settings in `backend/config/cors.php`
- Check `VITE_API_URL` in frontend `.env`

**Problem: TypeScript/build errors**
```bash
npm run build
```
Check console for specific errors.

**Problem: Port 5173 already in use**
Vite will automatically try the next available port (5174, 5175, etc.)

---

### Mobile Issues

**Problem: Flutter dependencies not installing**
```bash
cd mobile
flutter clean
flutter pub get
```

**Problem: Device not detected**
- Enable USB debugging on Android device
- Check connection: `flutter devices`
- Restart ADB: `adb kill-server && adb start-server`

**Problem: Build errors**
```bash
flutter clean
flutter pub cache repair
flutter pub get
```

---

### Common Issues

**Problem: "No seeded users" / Can't login**
```bash
cd backend
php artisan db:seed --class=DefaultClinicSeeder
```

**Problem: Fresh start needed**
```bash
cd backend
php artisan migrate:fresh --seed
```
⚠️ Warning: This deletes all data!

**Problem: XAMPP conflicts**
- Ensure Apache/MySQL in XAMPP are running (if using MySQL)
- Check port conflicts (80, 443, 3306)
- Use `php artisan serve` instead of XAMPP's Apache

## 🗄️ Database

### Default Configuration (SQLite)

The project uses **SQLite** by default for simplicity. The database file is located at:
```
backend/database/database.sqlite
```

**To create the SQLite database file:**
```bash
cd backend
type nul > database\database.sqlite
php artisan migrate
php artisan db:seed --class=DefaultClinicSeeder
```

### Switching to MySQL

1. **Create database in phpMyAdmin or MySQL CLI:**
   ```sql
   CREATE DATABASE animal_bite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Update `backend/.env`:**
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=animal_bite_db
   DB_USERNAME=root
   DB_PASSWORD=
   ```

3. **Run migrations:**
   ```bash
   php artisan migrate
   php artisan db:seed --class=DefaultClinicSeeder
   ```

### Database Schema

The system includes 8 core tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles |
| `clinics` | Clinic information |
| `staff_invitations` | Email invitation tokens |
| `patients` | Patient registry |
| `bite_incidents` | Animal bite case records |
| `vaccination_schedules` | WHO protocol vaccination schedules |
| `patient_queue` | Daily queue management |
| `personal_access_tokens` | API authentication tokens (Sanctum) |

**For detailed schema, see [MVP_ARCHITECTURE.md](MVP_ARCHITECTURE.md)**

### Resetting Database

To start fresh with clean data:

```bash
cd backend

# Warning: This deletes all data!
php artisan migrate:fresh --seed
```

## 🧪 Testing

### Backend Testing

Run Laravel tests:
```bash
cd backend
php artisan test
```

### Manual API Testing

Use the provided test accounts to verify functionality:

```bash
# Test login
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@clinic.com\",\"password\":\"password123\"}"

# Test API status
curl http://localhost:8000/api/test
```

**For complete workflow testing guide, see [PHASE4_TESTING.md](PHASE4_TESTING.md)**

### Test Workflow

1. **Login as admin** → Complete clinic setup wizard
2. **Login as registration** → Register new patient
3. **Login as triage** → Create bite case (auto-generates vaccination schedule)
4. **Login as treatment** → Record vaccination administration
5. **Check queue** → View and manage daily patient queue

---

## 🔐 Security

### Environment Variables

**Never commit these files:**
- `backend/.env` (contains database credentials, app key)
- `frontend/.env` (contains API URLs)

### API Authentication

The system uses **Laravel Sanctum** for API token authentication:

1. User logs in → receives bearer token
2. Frontend stores token securely
3. All API requests include token in `Authorization` header
4. Token expires on logout

**For detailed setup, see [SANCTUM_CORS_SETUP.md](SANCTUM_CORS_SETUP.md)**

### Role-Based Access Control

The system implements 4 user roles with specific permissions:

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, clinic setup |
| **Registration** | Patient registration, queue management |
| **Triage** | Medical assessment, bite case creation |
| **Treatment** | Vaccination recording, queue completion |

Access control is enforced via `CheckRole` middleware on API routes.

## 📖 Additional Documentation

### ⭐ Getting Started (Read These First)
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference card for all features
- **[FINAL_IMPLEMENTATION.md](FINAL_IMPLEMENTATION.md)** - Complete implementation guide
- **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Step-by-step checklist

### 🔐 Authentication & Security
- **[SANCTUM_CORS_SETUP.md](SANCTUM_CORS_SETUP.md)** - API authentication setup
- **[TEST_AUTH.md](TEST_AUTH.md)** - Authentication testing guide

### 🏗️ Architecture & Design
- **[SYSTEM_MAP.md](SYSTEM_MAP.md)** - Visual system architecture and data flows
- **[MVP_ARCHITECTURE.md](MVP_ARCHITECTURE.md)** - Database design and workflows  
- **[MVP_SUMMARY.md](MVP_SUMMARY.md)** - Quick overview and phased approach
- **[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)** - Full system design (future features)

### 🧪 Testing & Development
- **[PHASE4_TESTING.md](PHASE4_TESTING.md)** - Complete workflow testing guide
- **[API_REFERENCE.md](API_REFERENCE.md)** - Full API documentation with examples
- **[WHO_PROTOCOL_IMPLEMENTATION.md](WHO_PROTOCOL_IMPLEMENTATION.md)** - WHO compliance details
- **[PHASE2_TESTING.md](PHASE2_TESTING.md)** - User management testing
- **[PHASE3_COMPLETE.md](PHASE3_COMPLETE.md)** - Database schema documentation

### 📱 Component-Specific
- **[frontend/README.md](frontend/README.md)** - Frontend setup instructions
- **[mobile/README.md](mobile/README.md)** - Mobile app setup instructions

---

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Test thoroughly (manual + automated tests)
4. Submit a pull request with description

### Coding Standards

- **Laravel**: Follow PSR-12 coding standards
- **React**: Use TypeScript strict mode
- **Flutter**: Follow Dart style guide
- Write descriptive commit messages
- Document new features and API endpoints

---

## � License

[Your License Here]

---

## 💡 Tips for Development

### Daily Development Workflow

1. Start backend: `cd backend && php artisan serve`
2. Start frontend: `cd frontend && npm run dev`
3. Make changes
4. Test in browser
5. Commit changes

### Database Changes

When you modify database schema:
```bash
# Create new migration
php artisan make:migration description_of_change

# Edit the migration file
# Then run:
php artisan migrate
```

### Adding New Features

1. **Backend**: Create controller, model, migration, routes
2. **Frontend**: Create components, services, pages
3. **Update API_REFERENCE.md** with new endpoints
4. **Test thoroughly** with all user roles

### Common Commands

```bash
# Clear all caches (when things break)
cd backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Reset database (fresh start)
php artisan migrate:fresh --seed

# Check routes
php artisan route:list

# Interactive Laravel shell
php artisan tinker
```

---

## 📞 Support

For issues, questions, or contributions:
- Check documentation files first
- Review PHASE4_TESTING.md for workflow guides
- Check API_REFERENCE.md for endpoint details
- See TROUBLESHOOTING section above for common issues