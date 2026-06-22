#!/usr/bin/env pwsh
# ============================================================
# Quick Setup Script for Animal Bite Management System
# This script automates the backend setup process
# Usage: .\quick-setup.ps1
# ============================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Animal Bite Management System - Quick Setup            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "artisan")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/9] Installing Composer dependencies..." -ForegroundColor Yellow
& composer install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Composer install failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/9] Creating .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "⚠️  .env already exists, skipping..." -ForegroundColor Yellow
} else {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env created" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/9] Generating application key..." -ForegroundColor Yellow
& php artisan key:generate

Write-Host ""
Write-Host "[4/9] Clearing all caches..." -ForegroundColor Yellow
& php artisan config:clear
& php artisan cache:clear
& php artisan route:clear
& php artisan view:clear

Write-Host ""
Write-Host "[5/9] Creating database directory..." -ForegroundColor Yellow
if (-not (Test-Path "database")) {
    New-Item -ItemType Directory -Path "database" | Out-Null
}

Write-Host ""
Write-Host "[6/9] Creating SQLite database file..." -ForegroundColor Yellow
if (Test-Path "database\database.sqlite") {
    $delete = Read-Host "⚠️  Database file exists. Delete it? (Y/N)"
    if ($delete -eq "Y" -or $delete -eq "y") {
        Remove-Item "database\database.sqlite"
        New-Item -ItemType File -Path "database\database.sqlite" -Force | Out-Null
        Write-Host "✅ New database created" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Keeping existing database" -ForegroundColor Yellow
    }
} else {
    New-Item -ItemType File -Path "database\database.sqlite" -Force | Out-Null
    Write-Host "✅ Database created" -ForegroundColor Green
}

Write-Host ""
Write-Host "[7/9] Running migrations..." -ForegroundColor Yellow
& php artisan migrate:fresh
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migrations failed!" -ForegroundColor Red
    Write-Host "💡 Try: php artisan migrate:fresh --force" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[8/9] Seeding default data..." -ForegroundColor Yellow
& php artisan db:seed --class=DefaultClinicSeeder
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Seeding failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[9/9] Verifying setup..." -ForegroundColor Yellow
& php verify-setup.php
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  Setup verification found some issues." -ForegroundColor Yellow
    Write-Host "📖 Check SETUP_TROUBLESHOOTING.md for solutions." -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Default Login Credentials:" -ForegroundColor Cyan
Write-Host "   Email: admin@clinic.com"
Write-Host "   Password: password123"
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start backend:  php artisan serve"
Write-Host "   2. Setup frontend: cd ../frontend && npm install"
Write-Host "   3. Start frontend: npm run dev"
Write-Host "   4. Visit: http://localhost:5173"
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Cyan
Write-Host "   - README.md - Setup guide"
Write-Host "   - SETUP_TROUBLESHOOTING.md - Common issues"
Write-Host "   - API_REFERENCE.md - API endpoints"
Write-Host ""

Read-Host "Press Enter to exit"
