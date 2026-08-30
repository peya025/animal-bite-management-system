@echo off
:: ============================================================================
:: PURPOSE:
:: This script links your physical phone to your computer via USB cable.
:: It lets the mobile app talk directly to your Laravel backend (port 8000)
:: without needing WiFi or changing IP addresses.
::
:: STEP-BY-STEP HOW TO USE:
:: 1. Plug your phone into your computer using a USB cable.
:: 2. Make sure "USB Debugging" is turned ON in your phone's Developer Options.
:: 3. Double-click this file (run_usb_debug.bat).
:: 4. Start your Laravel backend in terminal: php artisan serve
:: 5. Run your mobile app: flutter run
:: ============================================================================

echo ===================================================
echo   Animal Bite Center - 1-Click USB Debug Starter
echo ===================================================
echo.
echo Purpose: Connects your phone app to the Laravel backend via USB.
echo.

echo [Step 1/3] Checking connected phone...
adb devices
echo.

echo [Step 2/3] Linking phone port 8000 to computer port 8000...
adb reverse tcp:8000 tcp:8000
echo.

echo [Step 3/3] Verifying active USB bridge...
adb reverse --list
echo.

echo ===================================================
echo SUCCESS: USB Bridge is ready!
echo You can now run: flutter run
echo ===================================================
echo.
pause
