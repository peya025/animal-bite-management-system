# Railway APK Build Guide - Fix "Unable to Reach Server" Issue

## Problem
Your APK can't reach the Railway server because it was built with a local development URL hardcoded into it.

## Root Cause
The `.env` file was pointing to `http://192.168.1.25:8000/api/mobile` (your local server) instead of your Railway production URL.

---

## Solution: Step-by-Step Fix

### Step 1: Update `.env` File with Railway URL

1. Open `mobile/.env`
2. Replace the `API_BASE_URL` with your actual Railway backend URL:

```env
# Production Railway Backend
API_BASE_URL=https://your-actual-railway-url.up.railway.app/api/mobile
CLINIC_ID=1
```

**Example with real Railway URL:**
```env
API_BASE_URL=https://animal-bite-backend-production.up.railway.app/api/mobile
```

### Step 2: Verify Railway Backend is Working

Before building the APK, test your Railway backend:

1. Open your browser
2. Go to: `https://your-railway-url.up.railway.app/api/mobile/health` (or any test endpoint)
3. You should see a response (not an error)

### Step 3: Clean Previous Build

```bash
cd mobile
flutter clean
flutter pub get
```

### Step 4: Build Release APK

```bash
flutter build apk --release
```

Or for split APKs (smaller file size):
```bash
flutter build apk --split-per-abi --release
```

### Step 5: Find Your APK

The APK will be at:
- `mobile/build/app/outputs/flutter-apk/app-release.apk`

Or if split:
- `mobile/build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk`
- `mobile/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`
- `mobile/build/app/outputs/flutter-apk/app-x86_64-release.apk`

### Step 6: Install and Test

1. Transfer the APK to your Android device
2. Install it
3. Open the app
4. Try logging in or accessing any feature that connects to the backend

---

## Common Issues and Solutions

### Issue 1: Still Getting "Unable to Reach Server"

**Check:**
- ✅ Did you rebuild the APK after changing `.env`?
- ✅ Is your Railway backend URL correct?
- ✅ Is your Railway backend actually running? (Check Railway dashboard)
- ✅ Is HTTPS being used? (Railway requires `https://` not `http://`)

**Solution:**
```bash
# Delete old build completely
rm -rf mobile/build

# Rebuild
flutter clean
flutter build apk --release
```

### Issue 2: SSL/Certificate Errors

If you get SSL certificate errors, your backend might not be configured for HTTPS properly.

**Check Railway Backend:**
- Railway automatically provides HTTPS
- Make sure you're using the Railway-provided domain (`.up.railway.app`)
- Don't use custom domains unless SSL is properly configured

### Issue 3: CORS Errors

If the API connection fails due to CORS:

**Check Backend CORS Configuration:**
In your Laravel backend `config/cors.php`:
```php
'allowed_origins' => ['*'], // For testing, be more restrictive in production
```

### Issue 4: API Route Not Found (404)

**Check your API URL structure:**
- Railway backend: `https://your-app.up.railway.app`
- API endpoint: `/api/mobile`
- Full URL: `https://your-app.up.railway.app/api/mobile`

Make sure your backend is listening on `/api/mobile` routes.

---

## Best Practices

### For Production Builds:
1. Always update `.env` to production URL before building
2. Test the Railway backend endpoint in a browser first
3. Build with `--release` flag
4. Test the APK on a real device (not emulator)

### For Development Builds:
1. Comment out the production URL
2. Uncomment local development URL
3. Use `flutter run` for hot reload (don't build APK)

---

## Environment File Template

Create two separate env files for clarity:

**`.env` (for development):**
```env
USE_MOCK_DATA=false
API_BASE_URL=http://192.168.1.25:8000/api/mobile
CLINIC_ID=1
```

**`.env.production` (for release builds):**
```env
USE_MOCK_DATA=false
API_BASE_URL=https://your-railway-backend.up.railway.app/api/mobile
CLINIC_ID=1
```

Then copy the appropriate one before building:
```bash
# For production build
cp .env.production .env
flutter build apk --release

# For development
cp .env.development .env
flutter run
```

---

## Verification Checklist

Before distributing your APK:

- [ ] `.env` file has Railway production URL
- [ ] Railway backend is running and accessible
- [ ] `flutter clean` was executed
- [ ] APK was built with `--release` flag
- [ ] APK was tested on a real Android device
- [ ] Login works
- [ ] Data fetching works
- [ ] All API calls succeed

---

## Quick Fix Command Sequence

```bash
# Navigate to mobile directory
cd mobile

# Update .env file (manually set Railway URL)
# API_BASE_URL=https://your-railway-url.up.railway.app/api/mobile

# Clean and rebuild
flutter clean
flutter pub get
flutter build apk --release

# APK location
# mobile/build/app/outputs/flutter-apk/app-release.apk
```

---

## Need Help?

1. Check Railway logs for backend errors
2. Check Android logcat for mobile app errors: `adb logcat`
3. Verify network connectivity on the device
4. Test the API endpoint in a browser or Postman first
