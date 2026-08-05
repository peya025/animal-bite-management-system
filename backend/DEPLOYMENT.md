# Deployment Instructions

## Fresh Installation (Client/Production)

For a clean installation where the Setup Wizard should appear:

### Option 1: Using Environment Variable (Recommended)

```bash
cd backend

# Edit .env file and set:
SEED_DEFAULT_CLINIC=false

# Then run:
php artisan migrate:fresh --seed
```

### Option 2: Skip Seeding

```bash
cd backend
php artisan migrate:fresh
# Do NOT use --seed flag
```

This will:
1. Drop all tables
2. Run all migrations
3. Leave database empty (no clinic created)
4. Setup Wizard will appear automatically on first visit

## Development Setup

### Quick Toggle Between Modes

Edit your `.env` file:

```env
# For testing with sample data (login with test accounts)
SEED_DEFAULT_CLINIC=true

# For testing setup wizard
SEED_DEFAULT_CLINIC=false
```

Then run:
```bash
php artisan migrate:fresh --seed
```

### Development with Sample Data

```bash
cd backend

# Ensure .env has:
# SEED_DEFAULT_CLINIC=true

php artisan migrate:fresh --seed
```

This creates sample clinic and test users (see credentials below).

### Test Setup Wizard

```bash
cd backend

# Option 1: Change .env
# SEED_DEFAULT_CLINIC=false
# Then: php artisan migrate:fresh --seed

# Option 2: Don't seed
php artisan migrate:fresh
```

Visit the site and you'll be redirected to Setup Wizard.

### Default Development Credentials

When seeders are enabled, the following accounts are created:

**Developer Account:**
- Email: `developer@clinic.com`
- Password: `password123`
- Role: Developer (full access)

**Admin Account:**
- Email: `admin@clinic.com`
- Password: `password123`
- Role: Administrator

**Registration Staff:**
- Email: `registration@clinic.com`
- Password: `password123`
- Role: Registration

**Triage/Doctor:**
- Email: `triage@clinic.com`
- Password: `password123`
- Role: Triage

**Treatment/Nurse:**
- Email: `treatment@clinic.com`
- Password: `password123`
- Role: Treatment

## Setup Wizard Flow

The Setup Wizard (`/setup`) appears when:
- `Clinic::count() === 0` (no clinics in database)

The Setup Wizard is skipped when:
- `Clinic::count() > 0` (at least one clinic exists)

## Environment Configuration

Ensure your `.env` file has:

```env
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=animalbitecenter
DB_USERNAME=root
DB_PASSWORD=
```

## Frontend Configuration

The frontend automatically detects if setup is needed:

1. On Landing Page load, calls `/api/setup/check-needed`
2. If `needs_setup === true`, redirects to Setup Wizard
3. If `needs_setup === false`, shows normal Landing Page

Frontend runs on:
- Development: `http://localhost:5173` or `http://localhost:5174`
- Proxies API calls to `http://localhost:8000`

## Troubleshooting

### Setup Wizard Not Appearing

1. Check if clinic exists:
   ```bash
   php artisan tinker --execute="echo \App\Models\Clinic::count();"
   ```

2. If count > 0, delete all clinics:
   ```bash
   php artisan tinker --execute="\App\Models\Clinic::query()->delete();"
   ```

3. Refresh browser

### API Calls Failing

- Ensure backend is running: `php artisan serve`
- Ensure frontend is running: `npm run dev` (in frontend directory)
- Check vite.config.ts has proxy configured
- Check browser console for errors

## Migration Order

All migrations now run in correct order with proper foreign key handling:

1. Base tables (users, clinics, patients, etc.)
2. Appointments table
3. Foreign key additions (separate migrations)

This prevents foreign key constraint errors on fresh installs.
