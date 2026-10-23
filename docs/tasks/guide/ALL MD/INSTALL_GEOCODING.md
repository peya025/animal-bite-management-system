# Quick Install: Geocoding System ⚡

## 5-Minute Installation Guide

### Step 1: Run Migration (30 seconds)
```bash
cd backend
php artisan migrate
```

**Expected Output**:
```
Migrating: 2026_08_12_100000_create_barangay_coordinates_table
Migrated:  2026_08_12_100000_create_barangay_coordinates_table (45.67ms)
```

---

### Step 2: Seed Barangay Data (15 seconds)
```bash
php artisan db:seed --class=BarangayCoordinatesSeeder
```

**Expected Output**:
```
Seeding: BarangayCoordinatesSeeder
Seeded:  BarangayCoordinatesSeeder (234.56ms)
```

---

### Step 3: Clear Cache (5 seconds)
```bash
php artisan cache:clear
php artisan config:clear
```

**Expected Output**:
```
Application cache cleared!
Configuration cache cleared!
```

---

### Step 4: Test (Optional - 2 minutes)
```bash
php artisan tinker
```

```php
// Test the geocoding service
$service = new App\Services\GeocodingService();

// Test 1: Cached barangay (should be fast)
$coords = $service->getCoordinates('Baluarte', 'Tagoloan');
print_r($coords);
// Should show: latitude => 8.5408, source => 'cached'

// Test 2: New barangay (will call Nominatim API)
$coords = $service->getCoordinates('Consolacion', 'Cagayan de Oro');
print_r($coords);
// Should show: coordinates and source => 'nominatim' or 'municipality_center'

exit
```

---

### Step 5: Test Bite Map (2 minutes)
1. Open browser: `http://localhost:8000`
2. Login to system
3. Navigate to **Bite Map** page
4. Check that markers appear at **real locations in Misamis Oriental**
5. Click a marker to verify coordinates

**Before**: All markers in Manila  
**After**: Markers in Tagoloan, CDO, Opol, etc. ✅

---

## 🎉 Done!

Your bite map now uses **real coordinates** instead of random ones!

### What Changed:
- ✅ 50+ barangays pre-seeded with real coordinates
- ✅ Nominatim API as fallback for other locations
- ✅ Municipality centers as final fallback
- ✅ Auto-caching for performance

### What to Expect:
- **First load**: May take 1-2 seconds per new location (Nominatim API call)
- **Second+ load**: Instant (<10ms) - coordinates cached
- **Offline**: Still works using cached + municipality centers

---

## 🐛 Troubleshooting

### Migration Error
```
Error: Table 'barangay_coordinates' already exists
```
**Solution**: Table already created, skip to Step 2

### Seeder Error
```
Error: Duplicate entry
```
**Solution**: Data already seeded, skip to Step 3

### Nominatim Timeout
```
Warning: Nominatim geocoding error
```
**Solution**: Normal, will use municipality center fallback

### Map Still Shows Random Coords
**Solution**: Clear browser cache (Ctrl+Shift+R) and refresh

---

## 📊 Verify Installation

### Check Database
```bash
mysql -u root -p
```

```sql
USE your_database_name;

-- Should return 50+ rows
SELECT COUNT(*) FROM barangay_coordinates;

-- Check Tagoloan barangays
SELECT barangay, municipality, latitude, longitude, source 
FROM barangay_coordinates 
WHERE municipality = 'Tagoloan';
```

### Check API Endpoint
```bash
# Get your auth token first
curl -X GET http://localhost:8000/api/cases/map-data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return cases with **real lat/lng values** (not random).

---

## 🎓 Usage

### In Your Code
```php
use App\Services\GeocodingService;

$geocoding = new GeocodingService();

// Get coordinates
$coords = $geocoding->getCoordinates('Baluarte', 'Tagoloan');

// Result:
[
  'latitude' => 8.5408,
  'longitude' => 124.7461,
  'source' => 'cached', // or 'nominatim' or 'municipality_center'
  'cached' => true
]
```

### Batch Geocoding
```php
$locations = [
  ['barangay' => 'Baluarte', 'municipality' => 'Tagoloan'],
  ['barangay' => 'Poblacion', 'municipality' => 'Opol'],
  ['barangay' => 'Carmen', 'municipality' => 'Cagayan de Oro'],
];

$results = $geocoding->batchGeocode($locations);
// Automatically handles rate limiting (1 req/sec for Nominatim)
```

---

## ✅ Success Indicators

You'll know it's working when:
1. ✅ Migration completes without errors
2. ✅ Seeder creates 50+ records
3. ✅ Bite map markers appear in Misamis Oriental (not Manila)
4. ✅ Clicking markers shows correct barangay/municipality
5. ✅ Subsequent page loads are fast (<1 second)

---

**Total Time**: ~5 minutes  
**Complexity**: Low  
**Risk**: None (non-destructive migration)  
**Rollback**: Just drop `barangay_coordinates` table if needed

---

**Need Help?** Check `GEOCODING_IMPLEMENTATION_COMPLETE.md` for detailed documentation.
