@echo off
setlocal

set "ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

if not exist "%ADB_PATH%" (
    set "ADB_PATH=adb"
)

echo ===================================================
echo   Animal Bite Center - 1-Click USB Debug Starter
echo ===================================================
echo.

echo [1/3] Checking connected phone...
"%ADB_PATH%" devices
echo.

echo [2/3] Linking phone port 8000 to computer port 8000...
"%ADB_PATH%" reverse tcp:8000 tcp:8000
echo.

echo [3/3] Verifying active USB bridge...
"%ADB_PATH%" reverse --list
echo.

echo ===================================================
echo SUCCESS: USB Bridge is ready!
echo You can now run or hot-restart (R): flutter run
echo ===================================================
echo.
pause
