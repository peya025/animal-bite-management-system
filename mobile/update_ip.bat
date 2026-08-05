@echo off
echo ===============================================
echo   Animal Bite Center - Mobile IP Updater
echo ===============================================
echo.
echo Your current IP addresses:
echo.
ipconfig | findstr /i "IPv4"
echo.
echo ===============================================
echo.
echo Edit the .env file and update API_BASE_URL
echo with your current IP address, then save.
echo.
echo Press any key to open .env file in notepad...
pause > nul
notepad .env
echo.
echo Done! Now hot restart your Flutter app (press R in terminal)
echo.
pause
