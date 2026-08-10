@echo off
echo ====================================
echo  Testing API Response Time
echo ====================================
echo.

echo Manually test from browser:
echo.
echo 1. Open web admin and login
echo 2. Press F12 to open Developer Tools
echo 3. Go to Network tab
echo 4. Navigate to Patient page
echo 5. Look at timing for /api/patients request
echo.
echo Expected: 50-200ms (first request)
echo Expected: 20-100ms (second request - cached)
echo.
echo If seeing 2000ms+, the problem is:
echo - Multiple API calls being made
echo - Laravel middleware slow
echo - Network/XAMPP issue
echo.

pause

echo.
echo Testing if server is responsive:
echo.

curl -w "\nTime: %%{time_total}s\n" http://localhost:8000/api/test 2^>nul

echo.
echo If this shows 0.0X seconds (less than 0.1), server is fast.
echo If this shows 2-6 seconds, server itself is slow!
echo.

pause
