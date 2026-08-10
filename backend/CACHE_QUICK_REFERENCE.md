# Cache Quick Reference

## Setup (One-Time)

```bash
cd backend
php artisan migrate
```

## Common Commands

### Clear All Cache
```bash
php artisan cache:clear
```

### Clear Config Cache
```bash
php artisan config:clear
```

### View Cache Status
```sql
-- In MySQL
SELECT COUNT(*) as cached_items FROM cache;
```

## Cache Keys Reference

All cache keys follow this pattern for user isolation:

| Endpoint | Cache Key Format |
|----------|-----------------|
| Appointments | `mobile:appointments:account:{account_id}` |
| Notifications | `mobile:notifications:account:{account_id}:page:{page}` |
| Patients | `mobile:patients:account:{account_id}` |
| Vaccination Card | `mobile:vaccination-card:patient:{patient_id}:account:{account_id}` |
| Account Info | `mobile:account:me:{account_id}` |

## Cache Duration (TTL)

| Data Type | Duration | Reason |
|-----------|----------|--------|
| Notifications | 2 min | Changes frequently |
| Appointments | 5 min | Updates moderately |
| Vaccination Cards | 5 min | Updates moderately |
| Account Info | 5 min | Rarely changes |
| Patient Profiles | 10 min | Rarely changes |

## Automatic Invalidation

Cache clears automatically on these actions:

- ✅ Create appointment → clears appointments + notifications
- ✅ Cancel appointment → clears appointments + notifications
- ✅ Add patient → clears patient list
- ✅ Update account → clears account info
- ✅ Mark notification read → clears notification pages

## Troubleshooting

### Problem: App shows old data

**Solution:**
```bash
cd backend
php artisan cache:clear
```

### Problem: Cache not working

**Check:**
```bash
# 1. Verify cache tables exist
mysql -u root abms -e "SHOW TABLES LIKE 'cache%';"

# 2. Check .env config
cat .env | grep CACHE_STORE

# 3. Clear everything
php artisan config:clear
php artisan cache:clear
```

### Problem: Cache table too large

**Solution:**
```sql
-- Delete expired cache entries
DELETE FROM cache WHERE expiration < UNIX_TIMESTAMP();
```

## Monitoring

### Cache Statistics
```sql
-- Total cached items and size
SELECT 
    COUNT(*) as entries,
    ROUND(SUM(LENGTH(value))/1024/1024, 2) as size_mb
FROM cache;

-- Cache by endpoint
SELECT 
    SUBSTRING_INDEX(SUBSTRING_INDEX(`key`, ':', 2), ':', -1) as endpoint,
    COUNT(*) as items
FROM cache
GROUP BY endpoint;

-- Expiration times
SELECT 
    `key`,
    FROM_UNIXTIME(expiration) as expires_at
FROM cache
ORDER BY expiration DESC
LIMIT 10;
```

## Performance Tips

1. **Development**: Clear cache often
   ```bash
   php artisan cache:clear
   ```

2. **Production**: Let cache work automatically
   - Only clear if users report stale data
   - Cache invalidates automatically on changes

3. **Testing**: Verify cache working
   - First API call: slow (cache miss)
   - Second API call: fast (cache hit)

## Environment Variables

```env
# Backend .env
CACHE_STORE=database
```

## Cache Flow Diagram

```
USER ACTION              CACHE                   DATABASE
    │                      │                         │
    ├─── Read Request ────>│                         │
    │                      │                         │
    │                   [Exists?]                    │
    │                      │                         │
    │                    [YES]                       │
    │<─── Return Data ────┤                         │
    │                      │                         │
    │                    [NO]                        │
    │                      ├──── Query ─────────────>│
    │                      │<──── Data ──────────────┤
    │                      │                         │
    │                   [Store]                      │
    │<─── Return Data ────┤                         │
    │                      │                         │
    ├─── Write Action ───>│                         │
    │                   [Clear]                      │
    │                      ├──── Update ────────────>│
    │<─── Success ─────────┤                         │
```

## Summary

- ✅ Cache speeds up reads by 70-90%
- ✅ Automatically clears on writes
- ✅ User-specific keys prevent data leaks
- ✅ Time-based expiration ensures freshness
- ✅ Database driver = no extra setup needed

**Remember**: Cache makes reads fast, invalidation keeps data fresh!
