@echo off
echo ================================
echo  Diagnosing Slow Loading Issue
echo ================================
echo.

echo Check 1: Cache Configuration
echo ------------------------------
findstr "CACHE_STORE" .env
echo.

echo Check 2: Cache Tables Exist
echo ------------------------------
C:\xampp\mysql\bin\mysql.exe -u root animalbitecenter -e "SHOW TABLES LIKE 'cache%%';"
echo.

echo Check 3: Current Cache Entries
echo ------------------------------
C:\xampp\mysql\bin\mysql.exe -u root animalbitecenter -e "SELECT COUNT(*) as total_caches FROM cache;"
echo.

echo Check 4: Web Patient Caches
echo ------------------------------
C:\xampp\mysql\bin\mysql.exe -u root animalbitecenter -e "SELECT COUNT(*) as patient_caches FROM cache WHERE \`key\` LIKE 'web:patients%%';"
echo.

echo Check 5: Recent Cache Keys
echo ------------------------------
C:\xampp\mysql\bin\mysql.exe -u root animalbitecenter -e "SELECT \`key\`, FROM_UNIXTIME(expiration) as expires_at FROM cache ORDER BY expiration DESC LIMIT 5;"
echo.

echo ================================
echo  Diagnosis Complete
echo ================================
echo.
echo What the numbers mean:
echo - Total caches: Should be 10+ if caching is working
echo - Patient caches: Should be 1+ after visiting patient page
echo - Recent keys: Should show web:patients:* entries
echo.
echo If all numbers are 0, caching is NOT active yet!
echo.
echo FIX: Run restart_with_cache.bat and restart Laravel
echo.

pause
