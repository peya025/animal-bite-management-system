# Animal Bite Management System - Mobile App

Flutter mobile application for the Animal Bite Management System.

## Prerequisites

Before running this app, ensure you have:

- **Flutter SDK** (3.12.1 or higher) - [Install Flutter](https://docs.flutter.dev/get-started/install)
- **Android Studio** (for Android development) or **Xcode** (for iOS development on macOS)
- **A connected device or emulator**

To verify Flutter installation:
```bash
flutter doctor
```

## Setup Instructions

1. **Navigate to the mobile directory:**
   ```bash
   cd c:\xampp\htdocs\abc\animal-bite-management-system\mobile
   ```

2. **Install dependencies:**
   ```bash
   flutter pub get
   ```

3. **Check connected devices:**
   ```bash
   flutter devices
   ```

## Running the App

### Development Mode

Run on a connected device or emulator:
```bash
flutter run
```

Run on a specific device:
```bash
flutter run -d <device-id>
```

### Run on Android Emulator
```bash
flutter run -d android
```

### Run on iOS Simulator (macOS only)
```bash
flutter run -d ios
```

### Run on Chrome (Web)
```bash
flutter run -d chrome
```

## Building the App

### Build APK (Android)
```bash
flutter build apk --release
```

The APK will be located at: `build/app/outputs/flutter-apk/app-release.apk`

### Build App Bundle (Android - for Play Store)
```bash
flutter build appbundle --release
```

### Build iOS (macOS only)
```bash
flutter build ios --release
```

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

## Troubleshooting

**Issue: Dependencies not installing**
```bash
flutter clean
flutter pub get
```

**Issue: Build errors**
```bash
flutter clean
flutter pub cache repair
flutter pub get
```

**Issue: Device not detected**
- Ensure USB debugging is enabled on Android devices
- Check device connection: `flutter devices`
- Restart ADB: `adb kill-server && adb start-server`

## Additional Resources

- [Flutter Documentation](https://docs.flutter.dev/)
- [Dart Language Tour](https://dart.dev/guides/language/language-tour)
- [Flutter Cookbook](https://docs.flutter.dev/cookbook)
