

# Animal Bite Management System

A clinic management system for managing animal bite cases, patient records, vaccination schedules, and treatment workflows.

## Tech Stack

* Backend: Laravel 12 (PHP 8.2+)
* Frontend: React 19 + TypeScript + Vite
* Database: SQLite (default) or MySQL
* Mobile: Flutter 3.12.1+ (optional)

---

# Prerequisites

Before setting up the project, install the following:

### Required

* PHP 8.2 or higher
* Composer
* Node.js 18 or higher
* npm
* Git
* XAMPP (recommended)

### Optional (Mobile Development)

* Flutter SDK 3.12.1+
* Android Studio
* Android SDK

### Verify Installation

```bash
php --version
composer --version
node --version
npm --version
flutter doctor
```

Ensure all required tools are installed successfully before proceeding.

---

# Project Structure

```text
animal-bite-management-system/
├── backend/      # Laravel API
├── frontend/     # React + TypeScript application
├── mobile/       # Flutter application
└── README.md
```

---

# Backend Setup (Laravel)

## Step 1: Navigate to Backend Directory

```bash
cd backend
```

## Step 2: Install Dependencies

```bash
composer install
```

This installs all Laravel and PHP dependencies.

---

## Step 3: Create Environment File

```bash
copy .env.example .env
```

---

## Step 4: Generate Application Key

```bash
php artisan key:generate
```

---

## Step 5: Configure Database

### Option A: SQLite (Recommended for Development)

Create the database file:

```bash
type nul > database\database.sqlite
```

Update `.env`:

```env
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

### Option B: MySQL

Create a database named:

```sql
CREATE DATABASE animal_bite_db;
```

Update `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=animal_bite_db
DB_USERNAME=root
DB_PASSWORD=
```

---

## Step 6: Run Database Migrations

```bash
php artisan migrate
```

This creates all required database tables.

---

## Step 7: Seed Initial Data

```bash
php artisan db:seed --class=DefaultClinicSeeder
```

This creates:

* Default clinic
* Admin account
* Registration account
* Triage account
* Treatment account

---

## Step 8: Start Laravel Server

```bash
php artisan serve
```

Backend API will be available at:

```text
http://localhost:8000
```

---

# Frontend Setup (React + TypeScript)

Open a new terminal.

## Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

---

## Step 2: Install Dependencies

```bash
npm install
```

---

## Step 3: Configure API URL

Create or edit:

```text
frontend/.env
```

Add:

```env
VITE_API_URL=http://localhost:8000
```

---

## Step 4: Start Development Server

```bash
npm run dev
```

Frontend will be available at:

```text
http://localhost:5173
```

---

# Mobile Setup (Optional)

## Step 1: Navigate to Mobile Directory

```bash
cd mobile
```

---

## Step 2: Install Dependencies

```bash
flutter pub get
```

---

## Step 3: Configure API Endpoint

Create or edit:

```text
lib/config/api_config.dart
```

For Android Emulator:

```dart
class ApiConfig {
  static const String baseUrl = 'http://10.0.2.2:8000/api';
}
```

For Physical Device:

```dart
class ApiConfig {
  static const String baseUrl = 'http://YOUR_IP_ADDRESS:8000/api';
}
```

Replace `YOUR_IP_ADDRESS` with your computer's local IP address.

---

## Step 4: Check Available Devices

```bash
flutter devices
```

---

## Step 5: Run Application

```bash
flutter run
```

---

# Default Login Credentials

After seeding the database, use the following account:

### Administrator

```text
Email: admin@clinic.com
Password: password123
```
You can check out the seeders file for the credentials.
---

# Running the Project

For daily development, run both backend and frontend.

### Terminal 1 - Backend

```bash
cd backend
php artisan serve
```

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

### Terminal 3 - Mobile (Optional)

```bash
cd mobile
flutter run
```

---

# Database Reset

To reset the database and recreate all tables:

```bash
php artisan migrate:fresh --seed
```

Warning:

* Deletes all existing data
* Re-runs migrations
* Recreates default accounts

---

# Common Commands

### Backend

```bash
composer install
php artisan serve
php artisan migrate
php artisan migrate:fresh --seed
php artisan db:seed --class=DefaultClinicSeeder
php artisan route:list
```

### Frontend

```bash
npm install
npm run dev
npm run build
```

### Mobile

```bash
flutter pub get
flutter run
flutter devices
flutter doctor
```

---

# Troubleshooting

### Backend Not Starting

```bash
composer install
php artisan key:generate
php artisan migrate
```

### Frontend Cannot Connect to API

Verify:

```env
VITE_API_URL=http://localhost:8000
```

and ensure Laravel is running:

```bash
php artisan serve
```

### Fresh Project Setup

If starting from scratch:

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

Then:

```bash
cd frontend
npm install
npm run dev
```

The application should now be accessible at:

Frontend:
`http://localhost:5173`

Backend API:
`http://localhost:8000`


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