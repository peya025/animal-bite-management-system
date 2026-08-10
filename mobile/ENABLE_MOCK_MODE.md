# 🎭 Enable Mock Mode - Quick Guide

## Current Problem

Your APK is trying to connect to the backend at `10.0.2.2:8000` but you want to demo the UI without the backend.

## Solution: Use Mock Data

Mock mode uses fake data built into the app - no backend, no internet, no setup!

---

## Quick Steps (2 Minutes)

### Step 1: Confirm .env is Set

File: `mobile/.env`

```env
USE_MOCK_DATA=true
```

✅ **Already done!**

### Step 2: Update Code to Use API Factory

**Option A: Global Find & Replace (Fastest)**

In Android Studio or VS Code:

1. Press **Ctrl + Shift + F** (Find in Files)
2. Search for: `import '../services/mobile_api.dart';`
3. Replace with: `import '../services/api.dart';`
4. Search for: `MobileApi.instance`
5. Replace with: `api`

**Option B: Manual Update (Example)**

Before:
```dart
import '../services/mobile_api.dart';

// In code:
final result = await MobileApi.instance.login(
  email: email,
  password: password,
  remember: remember,
);
```

After:
```dart
import '../services/api.dart';

// In code:
final result = await api.login(
  email: email,
  password: password,
  remember: remember,
);
```

### Step 3: Rebuild APK

```bash
cd mobile
flutter clean
flutter build apk --debug
```

### Step 4: Reinstall APK

Transfer new APK to phone and install!

---

## Alternative: Keep It Simple

If you don't want to change code, here's the **easiest approach**:

### Just Build for Development (Not APK)

Instead of building APK, run the app from Android Studio:

1. **Enable mock mode** in `.env`:
   ```env
   USE_MOCK_DATA=true
   ```

2. **Connect phone via USB**

3. **Run from Android Studio**:
   - Click Run button ▶️
   - Or press Shift + F10

4. **The app will use mock data!**

No code changes needed - the app will check `.env` at startup!

---

## Demo Credentials (Mock Mode)

When mock mode is enabled, use **ANY** email/password:

**Examples:**
- Email: `demo@test.com`, Password: `password`
- Email: `admin@test.com`, Password: `123456`
- Email: `anything@anything.com`, Password: `anything`

All will work! 🎉

---

## Mock Data Available

✅ **Sample Account:**
- Juan Dela Cruz
- juan@example.com

✅ **Sample Patients:**
- Juan (Adult Male)
- Maria (Child Female)

✅ **Sample Appointments:**
- Day 3 vaccination (upcoming)
- Day 7 follow-up (scheduled)
- Day 0 vaccination (completed)

✅ **Sample Notifications:**
- Appointment reminders
- Confirmations
- Completion notices

---

## Verification

### Check if Mock Mode is Active

When app starts, check console/logcat for:
```
🎭 Running in MOCK MODE - No backend needed
```

If you see:
```
🔌 Running in REAL MODE - Backend required
```

Then `.env` has `USE_MOCK_DATA=false`

---

## Troubleshooting

### Still Trying to Connect to Backend?

**Problem:** Code still uses `MobileApi.instance` directly

**Solution:** Update imports to use `api` factory:

1. Find all files importing `mobile_api.dart`
2. Change to import `api.dart`
3. Change `MobileApi.instance` to `api`
4. Rebuild

### "Server timeout" Error

**Problem:** App is in real mode, not mock mode

**Solution:** 

1. Check `.env`: `USE_MOCK_DATA=true`
2. Rebuild app
3. Reinstall

### Mock Data Not Showing

**Problem:** Imports not updated

**Solution:**

```bash
# In project root
grep -r "mobile_api.dart" lib/

# Update all files to use api.dart instead
```

---

## Quick Test Without Rebuilding

Want to test mock mode without rebuilding APK?

### Use Flutter Run:

```bash
cd mobile

# Make sure mock mode enabled
# USE_MOCK_DATA=true in .env

# Connect phone via USB
adb devices

# Run app
flutter run

# App will use mock data!
```

---

## Summary

| Method | Backend Needed | Code Changes | Build Time |
|--------|----------------|--------------|------------|
| **Mock APK** | ❌ No | ✅ Update imports | 3-5 min |
| **Flutter Run** | ❌ No | ❌ None | Instant |
| **Real APK** | ✅ Yes | ❌ None | 3-5 min |

---

## Recommended: Use Flutter Run for Demo

**Easiest approach for demo:**

1. Set `.env`: `USE_MOCK_DATA=true`
2. Connect phone via USB
3. Run: `flutter run`
4. Demo the app!

**No APK building, no code changes, instant updates!**

---

## For Client Demo (APK)

If you need standalone APK:

1. Update imports (`mobile_api.dart` → `api.dart`)
2. Update calls (`MobileApi.instance` → `api`)
3. Build: `flutter build apk --debug`
4. Install APK
5. Works offline anywhere!

---

**Which approach do you prefer?** Choose based on your needs! 🚀
