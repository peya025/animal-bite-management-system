@echo off
echo ================================
echo  Cache Performance Monitor
echo ================================
echo.

echo Total Cached Items:
mysql -u root abms -e "SELECT COUNT(*) as total_cached_items FROM cache;"
echo.

echo Cache by Endpoint:
mysql -u root abms -e "SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(\`key\`, ':', 2), ':', -1) as endpoint, COUNT(*) as items FROM cache GROUP BY endpoint;"
echo.

echo Cache Storage Size:
mysql -u root abms -e "SELECT COUNT(*) as entries, ROUND(SUM(LENGTH(value))/1024/1024, 2) as size_mb FROM cache;"
echo.

echo Recent Cache Entries:
mysql -u root abms -e "SELECT \`key\`, FROM_UNIXTIME(expiration) as expires_at FROM cache ORDER BY expiration DESC LIMIT 5;"
echo.

echo ================================
echo  Cache Commands:
echo ================================
echo - Clear cache:      php artisan cache:clear
echo - Clear config:     php artisan config:clear
echo - Recheck status:   check_cache.bat
echo.

pause
