@echo off
echo =========================================
echo   USB Setup for Android Studio
echo =========================================
echo.

REM Try to find ADB from Android Studio
set "ADB="
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
    echo ✅ Found Android Studio ADB
    echo.
) else if exist "%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
    set "ADB=%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe"
    echo ✅ Found Android Studio ADB
    echo.
) else (
    REM Try system PATH
    where adb >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set "ADB=adb"
        echo ✅ Found ADB in system PATH
        echo.
    ) else (
        echo ❌ ADB not found!
        echo.
        echo Please make sure Android Studio is installed.
        echo ADB should be at:
        echo   %LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
        echo.
        echo Or run this from Android Studio's Terminal tab.
        pause
        exit /b 1
    )
)

echo [1/3] Checking device connection...
"%ADB%" devices
echo.

echo [2/3] Setting up port forwarding...
"%ADB%" reverse tcp:8000 tcp:8000
echo.

if %ERRORLEVEL% EQU 0 (
    echo ✅ Port forwarding setup successful!
    echo.
    echo [3/3] Configuration:
    echo    App connects to: http://10.0.2.2:8000/api/mobile
    echo    Backend runs at: http://localhost:8000
    echo.
    echo Next steps:
    echo    1. Make sure backend is running:
    echo       cd backend
    echo       php artisan serve
    echo.
    echo    2. In Android Studio:
    echo       - Click Run button (▶️)
    echo       - Or press Shift + F10
    echo.
    echo ✅ Ready to develop!
) else (
    echo ❌ Port forwarding failed!
    echo.
    echo Troubleshooting:
    echo  1. Is your phone connected via USB?
    echo  2. Is USB Debugging enabled?
    echo  3. Did you allow USB Debugging on your phone?
    echo  4. Is your device showing in Android Studio device dropdown?
)
echo.
pause
