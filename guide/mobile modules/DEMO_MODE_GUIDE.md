# 📱 Demo/Mock Mode Guide

Use mock data to test the UI without needing the backend running. Perfect for:
- ✅ UI/UX demos
- ✅ Testing navigation
- ✅ Showing to clients
- ✅ Development without backend
- ✅ Installing on phone for presentations

## Quick Toggle

Edit `.env` file:

### Demo Mode (No Backend Needed)
```env
USE_MOCK_DATA=true
```

### Real Mode (With Backend)
```env
USE_MOCK_DATA=false
```

Then **hot restart** the app (press `R` in terminal or click 🔄 in Android Studio)

## Method 1: Using Mock Mode (Easiest for Demo)

### Step 1: Enable Mock Mode

Edit `mobile/.env`:
```env
USE_MOCK_DATA=true
API_BASE_URL=http://10.0.2.2:8000/api/mobile
CLINIC_ID=1
```

### Step 2: Update Main Entry Point

Edit `mobile/lib/main.dart` to use mock API:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'app/app.dart';
import 'services/mock_mobile_api.dart'; // Changed from mobile_api.dart

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load environment variables
  await dotenv.load(fileName: ".env");
  
  // Initialize mock API
  await MockMobileApi.instance.initialize();
  
  runApp(const AnimalCareApp());
}
```

### Step 3: Update API Usage in App

Wherever you use `MobileApi.instance`, change to `MockMobileApi.instance`.

**Example in login screen:**
```dart
// Before:
import '../services/mobile_api.dart';
final api = MobileApi.instance;

// After:
import '../services/mock_mobile_api.dart';
final api = MockMobileApi.instance;
```

### Step 4: Run the App

```bash
flutter run
```

No backend needed! The app uses fake data.

### Sample Mock Data Available:

✅ **Sample Account:**
- Name: Juan Dela Cruz
- Email: juan@example.com
- Phone: 09123456789

✅ **Sample Patients:**
- Juan Dela Cruz (Adult)
- Maria Dela Cruz (Child)

✅ **Sample Appointments:**
- Upcoming vaccination (Day 3)
- Scheduled follow-up (Day 7)
- Completed vaccination (Day 0)

✅ **Sample Notifications:**
- Appointment reminders
- Confirmation messages
- Completion notices

### Demo Login Credentials:

You can use ANY email/password combination in mock mode:
- Email: `demo@test.com`
- Password: `password`

Or:
- Email: `juan@example.com`
- Password: `anything`

It will always succeed!

---

## Method 2: Build APK for Demo

Build an APK to install on any phone without USB cable.

### Step 1: Enable Mock Mode

Edit `mobile/.env`:
```env
USE_MOCK_DATA=true
```

### Step 2: Build APK

```bash
cd mobile
flutter build apk --release
```

### Step 3: Install APK

**Output location:**
```
mobile/build/app/outputs/flutter-apk/app-release.apk
```

**Transfer to phone:**
- USB cable
- Email
- Google Drive
- WhatsApp
- Bluetooth

**Install:**
- Open APK on phone
- Tap "Install"
- Allow "Install Unknown Apps" if prompted

Now you have a fully working demo app on your phone! 📱

---

## Switching Back to Real Backend

### Step 1: Disable Mock Mode

Edit `mobile/.env`:
```env
USE_MOCK_DATA=false
API_BASE_URL=http://10.0.2.2:8000/api/mobile
```

### Step 2: Revert Main Entry Point

Edit `mobile/lib/main.dart`:

```dart
import 'services/mobile_api.dart'; // Changed back

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  await MobileApi.instance.initialize(); // Changed back
  runApp(const AnimalCareApp());
}
```

### Step 3: Revert API Usage

Change all `MockMobileApi.instance` back to `MobileApi.instance`.

### Step 4: Start Backend

```bash
cd backend
php artisan serve
```

### Step 5: Run App

```bash
cd mobile
adb reverse tcp:8000 tcp:8000
flutter run
```

---

## Comparison

| Feature | Mock Mode | Real Mode |
|---------|-----------|-----------|
| Backend needed | ❌ No | ✅ Yes |
| Internet needed | ❌ No | ✅ Yes (WiFi/USB) |
| USB setup | ❌ No | ✅ Yes (adb reverse) |
| Data persists | ❌ No | ✅ Yes (database) |
| Best for | Demo, UI testing | Development, Production |
| Build APK | ✅ Works standalone | ❌ Needs backend |

---

## Use Cases

### Mock Mode Perfect For:

1. **Client Demos**
   - Install APK on phone
   - Show UI/UX flow
   - No technical setup needed

2. **UI Development**
   - Design screens
   - Test navigation
   - Polish animations

3. **Presentations**
   - Works offline
   - No network issues
   - Consistent data

4. **Team Reviews**
   - Share APK with team
   - Get UI feedback
   - No backend required

### Real Mode Perfect For:

1. **Backend Integration**
   - Test API calls
   - Verify data flow
   - Debug issues

2. **Full Testing**
   - End-to-end testing
   - Real data scenarios
   - Performance testing

3. **Final QA**
   - Production-like testing
   - Real network conditions
   - Actual user flow

---

## Quick Commands

### Enable Mock Mode
```bash
# Edit .env
USE_MOCK_DATA=true

# Hot restart app
# Press R in terminal
```

### Build Demo APK
```bash
# Make sure mock mode enabled
cd mobile
flutter build apk --release

# APK location:
# build/app/outputs/flutter-apk/app-release.apk
```

### Disable Mock Mode
```bash
# Edit .env
USE_MOCK_DATA=false

# Start backend
cd backend
php artisan serve

# Setup USB
adb reverse tcp:8000 tcp:8000

# Run app
cd mobile
flutter run
```

---

## Troubleshooting Mock Mode

### Changes Not Applied

**Solution:** Hot restart (not hot reload)
- Press `R` (capital R) in terminal
- Or click 🔄 in Android Studio

### Mock Data Not Showing

**Solution:** Check imports
```dart
// Should import:
import '../services/mock_mobile_api.dart';

// Not:
import '../services/mobile_api.dart';
```

### APK Still Tries to Connect

**Solution:** Rebuild APK
```bash
flutter clean
flutter pub get
flutter build apk --release
```

---

## Custom Mock Data

Want different demo data? Edit `lib/services/mock_data.dart`:

```dart
class MockData {
  static const sampleAccount = {
    'name': 'Your Name Here',
    'email': 'your@email.com',
    // ... your data
  };
  
  // Add more patients, appointments, etc.
}
```

Then hot restart!

---

## Best Workflow

### For UI Development:
1. Use **Mock Mode**
2. Edit `USE_MOCK_DATA=true`
3. Run: `flutter run`
4. Focus on UI/UX

### For Backend Integration:
1. Use **Real Mode**
2. Edit `USE_MOCK_DATA=false`
3. Start backend: `php artisan serve`
4. Run: `adb reverse` + `flutter run`
5. Test API integration

### For Client Demo:
1. Use **Mock Mode**
2. Build APK: `flutter build apk --release`
3. Install on phone
4. Present anywhere!

---

## Summary

**Mock Mode = UI Demo Without Backend** 🎨
- Perfect for presentations
- No setup needed
- Works offline

**Real Mode = Full Backend Integration** 🔌
- Perfect for development
- Needs backend running
- Tests everything

**Switch anytime by editing .env!** 🔄

---

Ready to demo? Just edit `.env` and run! 🚀
