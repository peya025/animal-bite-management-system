# Animal Bite Management System - Backend API

Laravel 12 REST API for managing animal bite cases and vaccination workflows.

## 🏗️ Tech Stack

- **Framework**: Laravel 12
- **PHP Version**: 8.2+
- **Database**: SQLite (default) / MySQL
- **Authentication**: Laravel Sanctum (token-based API auth)
- **API Style**: RESTful JSON API

## ⚡ Quick Start

```bash
# Navigate to backend directory
cd c:\xampp\htdocs\abc\animal-bite-management-system\backend

# Install dependencies
composer install

# Setup environment
copy .env.example .env
php artisan key:generate

# Setup database (SQLite)
type nul > database\database.sqlite

# Run migrations and seed test data
php artisan migrate
php artisan db:seed --class=DefaultClinicSeeder

# Start server
php artisan serve
```

Server runs at: **http://localhost:8000**

## 🔐 Test Accounts

After seeding, you can use these accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@clinic.com | password123 | Admin |
| registration@clinic.com | password123 | Registration Staff |
| triage@clinic.com | password123 | Triage/Doctor Staff |
| treatment@clinic.com | password123 | Treatment Staff |

## 📁 Project Structure

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/              # API Controllers
│   │   │   ├── AuthController.php
│   │   │   ├── ClinicSetupController.php
│   │   │   ├── UserController.php
│   │   │   ├── StaffInvitationController.php
│   │   │   ├── PatientController.php
│   │   │   ├── BiteCaseController.php
│   │   │   ├── VaccinationController.php
│   │   │   └── QueueController.php
│   │   └── Middleware/
│   │       └── CheckRole.php         # Role-based access control
│   ├── Models/                       # Eloquent Models
│   │   ├── User.php
│   │   ├── Clinic.php
│   │   ├── Patient.php
│   │   ├── BiteIncident.php
│   │   ├── VaccinationSchedule.php
│   │   ├── PatientQueue.php
│   │   └── StaffInvitation.php
│   └── Providers/
├── database/
│   ├── migrations/                   # Database schema
│   └── seeders/
│       └── DefaultClinicSeeder.php   # Test data
├── routes/
│   └── api.php                       # API routes
├── config/                           # Configuration files
├── .env                              # Environment config (not in git)
└── composer.json                     # PHP dependencies
```

## 🗄️ Database Setup

### Option 1: SQLite (Recommended for Development)

1. **Create database file:**
   ```bash
   type nul > database\database.sqlite
   ```

2. **Configure `.env`:**
   ```env
   DB_CONNECTION=sqlite
   DB_DATABASE=C:\xampp\htdocs\abc\animal-bite-management-system\backend\database\database.sqlite
   ```

3. **Run migrations:**
   ```bash
   php artisan migrate
   ```

### Option 2: MySQL (Production)

1. **Create database in phpMyAdmin or MySQL CLI:**
   ```sql
   CREATE DATABASE animal_bite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Configure `.env`:**
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
   ```

### Seeding Test Data

```bash
php artisan db:seed --class=DefaultClinicSeeder
```

This creates:
- 1 default clinic
- 4 test users (admin, registration, triage, treatment)

## 📡 API Endpoints

Base URL: `http://localhost:8000/api`

### Authentication
```
POST   /api/register          - Register new user
POST   /api/login             - Login (returns bearer token)
POST   /api/logout            - Logout (requires auth)
GET    /api/me                - Get authenticated user
GET    /api/test              - Test API connectivity
```

### Clinic Setup
```
GET    /api/clinic/status              - Check setup status
POST   /api/clinic/complete-setup      - Complete setup
PUT    /api/clinic                     - Update clinic (admin only)
```

### User Management
```
GET    /api/users              - List users (admin)
POST   /api/users              - Create user (admin)
GET    /api/users/{id}         - Get user (admin)
PUT    /api/users/{id}         - Update user (admin)
DELETE /api/users/{id}         - Delete user (admin)
```

### Staff Invitations
```
POST   /api/invitations            - Send invitation (admin)
GET    /api/invitations            - List invitations (admin)
GET    /api/invitations/validate   - Validate token
POST   /api/invitations/accept     - Accept invitation
DELETE /api/invitations/{id}       - Cancel invitation (admin)
```

### Patients
```
GET    /api/patients           - List patients
POST   /api/patients           - Create patient (registration)
GET    /api/patients/{id}      - Get patient
PUT    /api/patients/{id}      - Update patient
DELETE /api/patients/{id}      - Delete patient (admin)
GET    /api/patients/search    - Search patients
```

### Bite Cases
```
GET    /api/bite-cases         - List cases
POST   /api/bite-cases         - Create case (triage)
GET    /api/bite-cases/{id}    - Get case
PUT    /api/bite-cases/{id}    - Update case (triage)
DELETE /api/bite-cases/{id}    - Delete case (admin)
GET    /api/bite-cases/stats   - Get statistics
```

### Vaccinations
```
GET    /api/vaccinations/today              - Today's schedule
GET    /api/vaccinations/upcoming           - Upcoming vaccines
GET    /api/vaccinations/overdue            - Overdue vaccines
POST   /api/vaccinations/{id}/administer    - Record administration (treatment)
PUT    /api/vaccinations/{id}/reschedule    - Reschedule dose
```

### Queue Management
```
GET    /api/queue                 - Today's queue
POST   /api/queue                 - Add to queue (registration)
PUT    /api/queue/{id}/call       - Call patient
PUT    /api/queue/{id}/complete   - Mark complete (treatment)
PUT    /api/queue/{id}/priority   - Update priority (admin)
DELETE /api/queue/{id}            - Remove from queue (admin)
```

**For complete API documentation with request/response examples, see [../API_REFERENCE.md](../API_REFERENCE.md)**

## 🔐 Authentication (Laravel Sanctum)

This API uses **Laravel Sanctum** for token-based authentication.

### Login Flow

1. **Login** → Get bearer token
   ```bash
   POST /api/login
   {
     "email": "admin@clinic.com",
     "password": "password123"
   }
   ```

2. **Response** contains token:
   ```json
   {
     "token": "1|abcd1234...",
     "user": { ... }
   }
   ```

3. **Use token** in all subsequent requests:
   ```
   Authorization: Bearer 1|abcd1234...
   ```

### Testing with cURL

```bash
# Login
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinic.com","password":"password123"}'

# Use token in protected endpoint
curl http://localhost:8000/api/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### CORS Configuration

CORS is configured in `config/cors.php` to allow frontend access:

```php
'allowed_origins' => ['http://localhost:5173'], // React dev server
```

Update this for production URLs.

## 🧪 Testing

### Run PHPUnit Tests

```bash
php artisan test
```

### Manual Testing

Use the test accounts to verify functionality through frontend or API client (Postman, Insomnia).

## 🔧 Useful Commands

### Development

```bash
# Start development server
php artisan serve

# Start on custom port
php artisan serve --port=8001

# Interactive Laravel shell
php artisan tinker

# View all routes
php artisan route:list

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Database

```bash
# Run migrations
php artisan migrate

# Fresh migration (drops all tables)
php artisan migrate:fresh

# Fresh migration + seed data
php artisan migrate:fresh --seed

# Run specific seeder
php artisan db:seed --class=DefaultClinicSeeder

# Rollback last migration
php artisan migrate:rollback
```

### Creating New Components

```bash
# Create controller
php artisan make:controller ExampleController

# Create model with migration
php artisan make:model Example -m

# Create migration
php artisan make:migration create_examples_table

# Create seeder
php artisan make:seeder ExampleSeeder

# Create middleware
php artisan make:middleware ExampleMiddleware
```

### Production

```bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize autoloader
composer install --optimize-autoloader --no-dev
```

## 🐛 Troubleshooting

### "Class not found" errors
```bash
composer dump-autoload
```

### Database connection errors
- Check `.env` configuration
- Verify database exists
- Check credentials

### Permission errors
```bash
chmod -R 775 storage bootstrap/cache
```

### Port already in use
```bash
php artisan serve --port=8001
```

### Clear all caches
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
composer dump-autoload
```

### Reset database
```bash
php artisan migrate:fresh --seed
```
⚠️ Warning: This deletes all data!

## 📚 Additional Documentation

- [../API_REFERENCE.md](../API_REFERENCE.md) - Complete API documentation
- [../SANCTUM_CORS_SETUP.md](../SANCTUM_CORS_SETUP.md) - Auth setup guide
- [../PHASE4_TESTING.md](../PHASE4_TESTING.md) - Testing workflows
- [../WHO_PROTOCOL_IMPLEMENTATION.md](../WHO_PROTOCOL_IMPLEMENTATION.md) - WHO compliance

## 📖 Laravel Resources

- [Laravel Documentation](https://laravel.com/docs)
- [Laravel Sanctum](https://laravel.com/docs/sanctum)
- [Eloquent ORM](https://laravel.com/docs/eloquent)
- [Database Migrations](https://laravel.com/docs/migrations)

## 🛡️ Security

- Never commit `.env` file
- Use environment variables for sensitive data
- Keep dependencies updated: `composer update`
- Use HTTPS in production
- Validate all input data
- Implement rate limiting on API endpoints

## 📞 Support

For backend-specific issues:
- Check Laravel logs: `storage/logs/laravel.log`
- Enable debug mode in `.env`: `APP_DEBUG=true`
- Check database queries in tinker
- Review API responses for error details
