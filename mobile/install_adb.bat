@echo off
echo =========================================
echo   Installing ADB (Android Debug Bridge)
echo =========================================
echo.
echo ADB is required for USB debugging.
echo.
echo Choose installation method:
echo.
echo [1] Download manually (Recommended)
echo [2] Install via Chocolatey (if installed)
echo [3] Cancel
echo.
choice /C 123 /N /M "Enter your choice (1, 2, or 3): "

if errorlevel 3 goto :cancel
if errorlevel 2 goto :choco
if errorlevel 1 goto :manual

:manual
echo.
echo Manual Installation Steps:
echo.
echo 1. Download Android SDK Platform Tools from:
echo    https://developer.android.com/tools/releases/platform-tools
echo.
echo 2. Extract the ZIP file to: C:\platform-tools
echo.
echo 3. Add to Windows PATH:
echo    a. Search "Environment Variables" in Windows
echo    b. Click "Environment Variables" button
echo    c. Under "System Variables", find "Path"
echo    d. Click "Edit"
echo    e. Click "New"
echo    f. Add: C:\platform-tools
echo    g. Click OK on all dialogs
echo.
echo 4. Restart Command Prompt/PowerShell
echo.
echo 5. Test by running: adb version
echo.
echo Opening download page in your browser...
start https://developer.android.com/tools/releases/platform-tools
echo.
goto :end

:choco
echo.
echo Installing ADB via Chocolatey...
choco install adb -y
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ ADB installed successfully!
    echo.
    echo Please restart your Command Prompt/PowerShell
    echo Then run: adb version
) else (
    echo.
    echo ❌ Chocolatey installation failed.
    echo.
    echo Chocolatey might not be installed.
    echo Install Chocolatey from: https://chocolatey.org/install
    echo.
    echo Or use manual installation (Option 1)
)
goto :end

:cancel
echo.
echo Installation cancelled.
goto :end

:end
echo.
pause
