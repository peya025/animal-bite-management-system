@echo off
echo ================================
echo  Restarting Laravel with Cache
echo ================================
echo.

echo Step 1: Clearing config cache...
php artisan config:clear
echo.

echo Step 2: Clearing route cache...
php artisan route:clear
echo.

echo Step 3: Clearing view cache...
php artisan view:clear
echo.

echo Step 4: Clearing application cache...
php artisan cache:clear
echo.

echo Step 5: Optimizing...
php artisan optimize:clear
echo.

echo ================================
echo  Cache Configuration Updated!
echo ================================
echo.
echo IMPORTANT: If you're running "php artisan serve",
echo you need to STOP it (Ctrl+C) and restart it:
echo.
echo   php artisan serve
echo.
echo This ensures the new caching code is loaded.
echo.

pause
