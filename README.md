# Animal Bite Management System

A comprehensive web application for managing animal bite incidents, built with Laravel (backend) and React + TypeScript (frontend).

## Tech Stack

- **Backend**: Laravel 12 (PHP 8.2+)
- **Frontend**: React 19 with TypeScript + Vite
- **Database**: SQLite (default) / MySQL
- **Mobile**: Flutter (see `mobile/README.md`)

## Prerequisites

- **PHP** 8.2 or higher
- **Composer** (PHP package manager)
- **Node.js** 18+ and npm
- **XAMPP** (or any web server with PHP support)

## Project Structure

```
animal-bite-management-system/
├── backend/          # Laravel API backend
├── frontend/         # React with TypeScript frontend
├── mobile/           # Flutter mobile app
└── README.md         # This file
```

## Setup Instructions

### 1. Backend Setup (Laravel)

Navigate to the backend directory:
```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\backend
```

Install PHP dependencies:
```bash
composer install
```

Copy environment file:
```bash
copy .env.example .env
```

Generate application key:
```bash
php artisan key:generate
```

Configure database in `.env`:
- Default uses SQLite (no configuration needed)
- For MySQL, update these values:
  ```
  DB_CONNECTION=mysql
  DB_HOST=127.0.0.1
  DB_PORT=3306
  DB_DATABASE=animal_bite_db
  DB_USERNAME=root
  DB_PASSWORD=
  ```

Run migrations:
```bash
php artisan migrate
```

Start the Laravel development server:
```bash
php artisan serve
```

Backend will run at: `http://localhost:8000`

### 2. Frontend Setup (React with TypeScript + Vite)

Open a new terminal and navigate to the frontend directory:
```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\frontend
```

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Frontend will run at: `http://localhost:5173`

## Running the Application

### Development Mode

**Option 1: Manual (Two Terminals)**

Terminal 1 - Backend:
```bash
cd backend
php artisan serve
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

**Option 2: Using Composer Script (Backend Only)**
```bash
cd backend
composer dev
```
This runs Laravel server, queue, logs, and Vite simultaneously.

### Production Build

Build frontend for production:
```bash
cd frontend
npm run build
```

Optimize backend:
```bash
cd backend
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Available Scripts

### Backend (Laravel)
```bash
composer install          # Install dependencies
php artisan migrate       # Run database migrations
php artisan db:seed       # Seed database (if seeders exist)
php artisan test          # Run tests
php artisan tinker        # Interactive REPL
```

### Frontend (React)
```bash
npm install              # Install dependencies
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
```

## API Endpoints

The Laravel backend API runs on `http://localhost:8000/api`

(Add your specific endpoints here as you develop them)

## Environment Variables

### Backend (.env)
- `APP_URL`: Application URL (default: http://localhost)
- `DB_CONNECTION`: Database driver (sqlite/mysql)
- `APP_DEBUG`: Debug mode (true for development)

### Frontend
Configure API base URL in your React app to point to Laravel backend.

## Troubleshooting

**Backend Issues:**

- Missing dependencies: `composer install`
- Database errors: Check `.env` configuration and run `php artisan migrate:fresh`
- Permission errors: Ensure `storage/` and `bootstrap/cache/` are writable
- Port already in use: Use `php artisan serve --port=8001`

**Frontend Issues:**

- Dependencies not installing: Delete `node_modules` and run `npm install`
- Build errors: `npm run build` to check for TypeScript errors
- Port conflicts: Vite will automatically use next available port

## Database

The default configuration uses SQLite for simplicity. The database file will be created at `backend/database/database.sqlite`.

To switch to MySQL:
1. Update `.env` file with MySQL credentials
2. Create the database in phpMyAdmin or MySQL CLI
3. Run migrations: `php artisan migrate`

## Testing

Run backend tests:
```bash
cd backend
php artisan test
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Your License Here]

## Additional Documentation

- Frontend setup: `frontend/README.md`
- Mobile app setup: `mobile/README.md`
- Design system: `DESIGN_SYSTEM.md`
- Login pages: `LOGIN_PAGES_README.md`