# Animal Bite Management System - Mobile App

Flutter mobile application for managing animal bite cases and vaccination workflows on mobile devices.

## 📱 Overview

This is the mobile companion app for the Animal Bite Management System, built with Flutter for cross-platform support (Android & iOS).

### Features (Planned)
- Mobile-optimized patient registration
- Bite case documentation with camera integration
- Vaccination schedule tracking
- Queue management
- Offline-first capability
- Push notifications for appointments

## 🔧 Prerequisites

Before setting up the mobile app, ensure you have:

### Required
- **Flutter SDK** 3.12.1 or higher - [Install Flutter](https://docs.flutter.dev/get-started/install)
- **Dart SDK** (included with Flutter)
- **Git** for version control

### For Android Development
- **Android Studio** (recommended) or **VS Code with Flutter extension**
- **Android SDK** (API level 21 or higher)
- **Android Emulator** or physical Android device with USB debugging enabled

### For iOS Development (macOS only)
- **Xcode** 14.0 or higher
- **iOS Simulator** or physical iOS device
- **CocoaPods** (usually installed with Xcode)

### Verify Installation

Check if Flutter is properly installed:

```bash
flutter doctor
```

Expected output should show:
- ✅ Flutter (Channel stable, version 3.12.1+)
- ✅ Android toolchain (if developing for Android)
- ✅ Xcode (if developing for iOS on macOS)
- ✅ VS Code or Android Studio
- ✅ Connected device

Fix any issues shown by `flutter doctor` before proceeding.

## 🚀 Setup Instructions

### Step 1: Navigate to Mobile Directory

```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\mobile
```

### Step 2: Install Dependencies

Install all Flutter packages defined in `pubspec.yaml`:

```bash
flutter pub get
```

This will download all required packages and dependencies.

### Step 3: Configure API Endpoint

Create or edit the configuration file to point to your backend API:

**Option A: Create config file** (recommended for production)
Create `lib/config/api_config.dart`:
```dart
class ApiConfig {
  static const String baseUrl = 'http://10.0.2.2:8000/api'; // Android emulator
  // static const String baseUrl = 'http://localhost:8000/api'; // iOS simulator
  // static const String baseUrl = 'http://192.168.1.100:8000/api'; // Physical device
}
```

**Option B: Environment variables**
Create `.env` file in mobile root:
```
API_BASE_URL=http://10.0.2.2:8000/api
```

### Step 4: Check Connected Devices

Verify that Flutter can detect your device or emulator:

```bash
flutter devices
```

Expected output:
```
3 connected devices:

sdk gphone64 arm64 (mobile) • emulator-5554 • android-arm64  • Android 13 (API 33) (emulator)
iPhone 15 (mobile)          • iOS Simulator • ios            • iOS 17.0 (simulator)
Chrome (web)                • chrome        • web-javascript • Google Chrome 119.0.6045.199
```

If no devices are shown, start an emulator or connect a physical device.

## ▶️ Running the App

### Quick Start

Run the app on the default connected device:

```bash
flutter run
```

Flutter will automatically detect and use the first available device.

### Run on Specific Device

If you have multiple devices connected:

```bash
# List available devices
flutter devices

# Run on specific device using device ID
flutter run -d <device-id>
```

### Platform-Specific Commands

**Android Emulator:**
```bash
flutter run -d android
```

**iOS Simulator (macOS only):**
```bash
flutter run -d ios
```

**Chrome Browser (Web):**
```bash
flutter run -d chrome
```

### Development with Hot Reload

While the app is running:
- Press `r` - Hot reload (rebuild current screen)
- Press `R` - Hot restart (full app restart)
- Press `h` - Show help
- Press `q` - Quit

### Debug Mode vs Release Mode

**Debug mode** (default):
```bash
flutter run
```
Includes debugging tools, slower performance.

**Profile mode** (for performance testing):
```bash
flutter run --profile
```

**Release mode** (production-like):
```bash
flutter run --release
```

### Common Issues When Running

**Problem: No devices found**
```bash
# For Android - Start emulator from Android Studio
# Or connect physical device with USB debugging enabled

# For iOS (macOS) - Start simulator
open -a Simulator
```

**Problem: "Waiting for another flutter command to release the startup lock"**
```bash
# Kill other Flutter processes
taskkill /F /IM dart.exe
taskkill /F /IM flutter.exe

# Or on macOS/Linux:
killall -9 dart flutter
```

**Problem: Build errors**
```bash
flutter clean
flutter pub get
flutter run
```

## 📦 Building for Production

### Android APK (Universal)

Build a universal APK that works on all Android devices:

```bash
flutter build apk --release
```

**Output location:**
```
build/app/outputs/flutter-apk/app-release.apk
```

**File size:** ~40-60 MB (includes all architectures)

### Android APK (Split by Architecture)

Build smaller APKs for specific CPU architectures:

```bash
flutter build apk --split-per-abi --release
```

**Output files:**
```
build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk  (~20 MB)
build/app/outputs/flutter-apk/app-arm64-v8a-release.apk    (~20 MB)
build/app/outputs/flutter-apk/app-x86_64-release.apk       (~22 MB)
```

Upload all three to Play Store for automatic device optimization.

### Android App Bundle (AAB - for Play Store)

Build an Android App Bundle (recommended for Play Store):

```bash
flutter build appbundle --release
```

**Output location:**
```
build/app/outputs/bundle/release/app-release.aab
```

**Benefits:**
- Smaller download sizes (Play Store generates optimized APKs per device)
- Required for new apps on Google Play Store

### iOS Build (macOS only)

Build for iOS devices:

```bash
flutter build ios --release
```

Then open Xcode to archive and upload:
```bash
open ios/Runner.xcworkspace
```

In Xcode:
1. Select "Any iOS Device" as target
2. Product → Archive
3. Distribute App → App Store Connect

### Build Configuration

Before building for production:

1. **Update version in `pubspec.yaml`:**
   ```yaml
   version: 1.0.0+1
   ```

2. **Update app name and icons:**
   - Android: `android/app/src/main/AndroidManifest.xml`
   - iOS: `ios/Runner/Info.plist`

3. **Configure signing:**
   - Android: `android/app/build.gradle`
   - iOS: Xcode → Signing & Capabilities

4. **Set API endpoint to production:**
   Update `lib/config/api_config.dart` or `.env` file

## Project Structure

```
mobile/
├── lib/               # Application source code
│   └── main.dart     # App entry point
├── android/          # Android-specific files
├── ios/              # iOS-specific files
├── test/             # Unit and widget tests
└── pubspec.yaml      # Dependencies and assets
```

## 🔧 Troubleshooting

### Flutter Issues

**Problem: Dependencies not installing**
```bash
cd c:\xampp\htdocs\abc\animal-bite-management-system\mobile
flutter clean
flutter pub get
```

**Problem: Build errors or cache issues**
```bash
flutter clean
flutter pub cache repair
flutter pub get
flutter run
```

**Problem: "Gradle build failed" (Android)**
```bash
cd android
gradlew clean
cd ..
flutter clean
flutter pub get
flutter run
```

**Problem: Outdated Flutter SDK**
```bash
flutter upgrade
flutter doctor
```

---

### Device Connection Issues

**Problem: No devices detected**
```bash
flutter devices
```

If no devices shown:

**For Android:**
1. Enable USB Debugging on device:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
2. Connect device via USB
3. Accept USB debugging prompt on device
4. Run: `flutter devices`

**For Android Emulator:**
1. Open Android Studio
2. Tools → Device Manager
3. Create/Start an emulator
4. Run: `flutter devices`

**For iOS Simulator (macOS):**
```bash
open -a Simulator
flutter devices
```

**Problem: Device connected but not detected**
```bash
# Restart ADB (Android Debug Bridge)
adb kill-server
adb start-server
flutter devices
```

---

### API Connection Issues

**Problem: Cannot connect to backend from Android emulator**

Android emulator cannot access `localhost` on your computer. Use:
```
http://10.0.2.2:8000/api  (for Android emulator)
```

**Problem: Cannot connect from physical device**

Physical devices need your computer's IP address:
```bash
# Find your local IP
ipconfig  (Windows)
ifconfig  (macOS/Linux)

# Use that IP in app
http://192.168.1.100:8000/api  (replace with your IP)
```

**Important:** Ensure:
1. Backend is running: `cd backend && php artisan serve`
2. Device and computer are on same Wi-Fi network
3. Firewall allows incoming connections on port 8000

---

### Performance Issues

**Problem: App is slow in debug mode**

Debug mode includes debugging tools and is intentionally slower. For better performance:
```bash
flutter run --release
```

Or test in profile mode:
```bash
flutter run --profile
```

---

### Common Error Messages

**Error: "Waiting for another flutter command"**
```bash
# Windows
taskkill /F /IM dart.exe
taskkill /F /IM flutter.exe

# macOS/Linux
killall -9 dart flutter
```

**Error: "CocoaPods not installed" (iOS on macOS)**
```bash
sudo gem install cocoapods
pod setup
cd ios
pod install
cd ..
flutter run
```

**Error: "SDK location not found" (Android)**

Create `android/local.properties`:
```
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\sdk
```
(Replace with your actual Android SDK path)

---

### Getting Help

If issues persist:

1. **Run Flutter Doctor:**
   ```bash
   flutter doctor -v
   ```
   Fix any issues it reports.

2. **Check Flutter logs:**
   ```bash
   flutter logs
   ```

3. **Clean and rebuild:**
   ```bash
   flutter clean
   rm -rf build/
   flutter pub get
   flutter run
   ```

4. **Check Flutter version:**
   ```bash
   flutter --version
   ```
   Ensure using Flutter 3.12.1 or higher.

## 📂 Project Structure

```
mobile/
├── lib/                          # Application source code
│   ├── main.dart                 # App entry point
│   ├── config/                   # Configuration files
│   │   └── api_config.dart      # API endpoint configuration
│   ├── models/                   # Data models
│   ├── services/                 # API services
│   ├── screens/                  # UI screens/pages
│   ├── widgets/                  # Reusable widgets
│   └── utils/                    # Utility functions
│
├── android/                      # Android-specific files
│   ├── app/
│   │   ├── src/main/
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── build.gradle
│
├── ios/                          # iOS-specific files
│   ├── Runner/
│   │   └── Info.plist
│   └── Runner.xcworkspace
│
├── test/                         # Unit and widget tests
│   └── widget_test.dart
│
├── pubspec.yaml                  # Dependencies and project config
├── pubspec.lock                  # Locked dependency versions
└── README.md                     # This file
```

---

## 🧪 Testing

### Run All Tests

```bash
flutter test
```

### Run Specific Test File

```bash
flutter test test/widget_test.dart
```

### Run Tests with Coverage

```bash
flutter test --coverage
```

---

## 🔐 API Integration

The mobile app communicates with the Laravel backend API.

### Setting Up API Connection

1. **Ensure backend is running:**
   ```bash
   cd ../backend
   php artisan serve
   ```

2. **Configure API URL in mobile app:**

   For **Android Emulator**:
   ```dart
   static const String baseUrl = 'http://10.0.2.2:8000/api';
   ```

   For **iOS Simulator**:
   ```dart
   static const String baseUrl = 'http://localhost:8000/api';
   ```

   For **Physical Device**:
   ```dart
   static const String baseUrl = 'http://192.168.1.100:8000/api';
   ```
   (Replace with your computer's local IP address)

3. **Test API connectivity:**
   ```bash
   # Test from mobile app or use curl
   curl http://10.0.2.2:8000/api/test
   ```

---

## 📚 Additional Resources

### Flutter Learning
- [Flutter Documentation](https://docs.flutter.dev/) - Official docs
- [Dart Language Tour](https://dart.dev/guides/language/language-tour) - Learn Dart
- [Flutter Cookbook](https://docs.flutter.dev/cookbook) - Common patterns
- [Flutter Widget Catalog](https://docs.flutter.dev/ui/widgets) - UI components

### Development Tools
- [Flutter DevTools](https://docs.flutter.dev/tools/devtools/overview) - Debugging and profiling
- [VS Code Flutter Extension](https://marketplace.visualstudio.com/items?itemName=Dart-Code.flutter)
- [Android Studio Flutter Plugin](https://plugins.jetbrains.com/plugin/9212-flutter)

### API Documentation
- [API_REFERENCE.md](../API_REFERENCE.md) - Backend API endpoints
- [SANCTUM_CORS_SETUP.md](../SANCTUM_CORS_SETUP.md) - Authentication setup

---

## 🚀 Quick Start Summary

```bash
# 1. Navigate to mobile directory
cd c:\xampp\htdocs\abc\animal-bite-management-system\mobile

# 2. Check Flutter installation
flutter doctor

# 3. Install dependencies
flutter pub get

# 4. Check devices
flutter devices

# 5. Run app
flutter run

# 6. Build for production (Android)
flutter build apk --release
```

---

## 💡 Development Tips

### Hot Reload Best Practices
- Use `r` for hot reload after small UI changes
- Use `R` for hot restart when changing app state
- Restart app completely for major structural changes

### Debugging
```bash
# Show logs
flutter logs

# Run with verbose logging
flutter run -v

# Open DevTools
flutter pub global activate devtools
flutter pub global run devtools
```

### Performance Optimization
- Use `const` constructors where possible
- Implement `ListView.builder` for long lists
- Test with `flutter run --profile` for accurate performance
- Use Flutter DevTools for performance profiling

---

## 📞 Support

For issues specific to mobile development:

1. Run `flutter doctor -v` and fix reported issues
2. Check [Flutter troubleshooting guide](https://docs.flutter.dev/testing/debugging)
3. Review error messages in console carefully
4. Search [Flutter GitHub Issues](https://github.com/flutter/flutter/issues)

For backend API issues, refer to main [README.md](../README.md)
