@echo off
echo =========================================
echo   USB Debugging Setup for Flutter
echo =========================================
echo.

echo [1/4] Checking ADB connection...
adb devices
echo.

echo [2/4] Setting up port forwarding...
adb reverse tcp:8000 tcp:8000
echo.

if %ERRORLEVEL% EQU 0 (
    echo ✅ Port forwarding setup successful!
    echo.
    echo [3/4] Your configuration:
    echo    Phone connects to: http://10.0.2.2:8000/api/mobile
    echo    Computer backend:  http://localhost:8000
    echo.
    echo [4/4] Next steps:
    echo    1. Make sure Laravel backend is running:
    echo       cd backend
    echo       php artisan serve
    echo.
    echo    2. Run your Flutter app:
    echo       cd mobile
    echo       flutter run
    echo.
    echo ✅ Ready to develop!
) else (
    echo ❌ Port forwarding failed!
    echo.
    echo Troubleshooting:
    echo  1. Is your phone connected via USB?
    echo  2. Is USB Debugging enabled?
    echo  3. Did you allow USB Debugging on your phone?
    echo.
    echo Run "adb devices" to check connection
)
echo.
pause
