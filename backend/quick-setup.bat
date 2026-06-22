@echo off
REM ============================================================
REM Quick Setup Script for Animal Bite Management System
REM This script automates the backend setup process
REM ============================================================

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  Animal Bite Management System - Quick Setup            ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Check if we're in the backend directory
if not exist "artisan" (
    echo ❌ Error: Please run this script from the backend directory
    echo.
    pause
    exit /b 1
)

echo [1/9] Installing Composer dependencies...
call composer install
if errorlevel 1 (
    echo ❌ Composer install failed!
    pause
    exit /b 1
)

echo.
echo [2/9] Creating .env file...
if exist ".env" (
    echo ⚠️  .env already exists, skipping...
) else (
    copy .env.example .env
    echo ✅ .env created
)

echo.
echo [3/9] Generating application key...
call php artisan key:generate

echo.
echo [4/9] Clearing all caches...
call php artisan config:clear
call php artisan cache:clear
call php artisan route:clear
call php artisan view:clear

echo.
echo [5/9] Creating database directory...
if not exist "database" mkdir database

echo.
echo [6/9] Creating SQLite database file...
if exist "database\database.sqlite" (
    echo ⚠️  Database file exists. Delete it? (Y/N)
    set /p delete=
    if /i "%delete%"=="Y" (
        del database\database.sqlite
        type nul > database\database.sqlite
        echo ✅ New database created
    ) else (
        echo ⚠️  Keeping existing database
    )
) else (
    type nul > database\database.sqlite
    echo ✅ Database created
)

echo.
echo [7/9] Running migrations...
call php artisan migrate:fresh
if errorlevel 1 (
    echo ❌ Migrations failed!
    echo 💡 Try: php artisan migrate:fresh --force
    pause
    exit /b 1
)

echo.
echo [8/9] Seeding default data...
call php artisan db:seed --class=DefaultClinicSeeder
if errorlevel 1 (
    echo ❌ Seeding failed!
    pause
    exit /b 1
)

echo.
echo [9/9] Verifying setup...
call php verify-setup.php
if errorlevel 1 (
    echo.
    echo ⚠️  Setup verification found some issues.
    echo 📖 Check SETUP_TROUBLESHOOTING.md for solutions.
    echo.
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════════════════════════
echo 🎉 Setup Complete!
echo ═══════════════════════════════════════════════════════════
echo.
echo 📋 Default Login Credentials:
echo    Email: admin@clinic.com
echo    Password: password123
echo.
echo 🚀 Next Steps:
echo    1. Start backend:  php artisan serve
echo    2. Setup frontend: cd ..\frontend ^&^& npm install
echo    3. Start frontend: npm run dev
echo    4. Visit: http://localhost:5173
echo.
echo 📖 Documentation:
echo    - README.md - Setup guide
echo    - SETUP_TROUBLESHOOTING.md - Common issues
echo    - API_REFERENCE.md - API endpoints
echo.

pause
