# 🚀 Android Studio Development Guide

Perfect! Android Studio has everything built-in, making development even easier!

## Why Android Studio is Perfect for This

- ✅ **ADB included** - No separate installation needed
- ✅ **Device manager** - See connected devices easily
- ✅ **Flutter plugin** - Full Flutter support
- ✅ **Hot reload** - Instant code updates
- ✅ **Debugging tools** - Professional debugging
- ✅ **Terminal built-in** - Run commands directly

## First-Time Setup

### 1. Install Flutter Plugin (If Not Already)

1. Open Android Studio
2. Go to **File → Settings** (or **Preferences** on Mac)
3. Go to **Plugins**
4. Search for "**Flutter**"
5. Click **Install**
6. Restart Android Studio

### 2. Open the Mobile Project

1. Open Android Studio
2. Click **File → Open**
3. Navigate to: `C:\xampp\htdocs\abc\animal-bite-management-system\mobile`
4. Click **OK**
5. Wait for project to sync

### 3. Enable USB Debugging on Your Phone

**One-time setup on your Android phone:**

1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times rapidly
3. You'll see "You are now a developer!"
4. Go back to **Settings → Developer Options**
5. Enable **USB Debugging**
6. Enable **Install via USB** (optional, for faster installs)

### 4. Connect Phone to Computer

1. Connect your phone via USB cable
2. On your phone, tap **OK** on "Allow USB Debugging?" prompt
3. Check "**Always allow from this computer**"
4. In Android Studio, check the device dropdown (top toolbar)
5. You should see your phone model listed! ✅

### 5. Setup Port Forwarding

**Option 1: Use Our Helper Script (Easiest)**

Open Terminal in Android Studio (bottom tab) and run:

```bash
setup_android_studio.bat
```

**Option 2: Use Android Studio Terminal**

Open Terminal in Android Studio and run:

```bash
adb reverse tcp:8000 tcp:8000
```

You should see: `8000`

### 6. Configuration Check

Your `.env` file is already configured:

```env
API_BASE_URL=http://10.0.2.2:8000/api/mobile
CLINIC_ID=1
```

✅ Perfect! No changes needed!

## Daily Development Workflow

### Every Time You Want to Develop:

#### Step 1: Start Laravel Backend

Open a **Command Prompt** (outside Android Studio):

```bash
cd C:\xampp\htdocs\abc\animal-bite-management-system\backend
php artisan serve
```

Leave this running!

#### Step 2: Setup Port Forwarding

In **Android Studio → Terminal** tab (bottom):

```bash
# Option 1: Quick setup
setup_android_studio.bat

# Option 2: Manual
adb reverse tcp:8000 tcp:8000
```

#### Step 3: Run the App

**Method 1: Use Run Button**
- Click the green **▶️ (Run)** button in toolbar
- Or press **Shift + F10**

**Method 2: Use Terminal**
```bash
flutter run
```

**Method 3: Use Debug**
- Click the **🐛 (Debug)** button
- Or press **Shift + F9**

That's it! 🎉

## Android Studio Features You'll Love

### Hot Reload & Hot Restart

When you make code changes:

- **Hot Reload** (Fast): Press **Ctrl + S** or click ⚡ button
  - Updates UI without losing state
  - Use for UI changes
  
- **Hot Restart** (Full): Press **Ctrl + Shift + \** or click 🔄 button
  - Restarts app completely
  - Use for logic changes or after .env edits

### Flutter Inspector

Open from **View → Tool Windows → Flutter Inspector**

- See widget tree
- Debug layout issues
- Check widget properties
- Performance monitoring

### Logcat (Console Output)

Bottom panel shows:
- Print statements
- Error messages
- API calls
- App logs

Filter by:
- **Verbose**: All logs
- **Debug**: Debug messages
- **Info**: Information
- **Error**: Errors only

### Device Manager

**View → Tool Windows → Device Manager**

- See all connected devices
- Manage virtual devices (emulators)
- Check battery, network status

## Useful Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Run app | **Shift + F10** |
| Debug app | **Shift + F9** |
| Hot reload | **Ctrl + S** |
| Hot restart | **Ctrl + Shift + \\** |
| Stop app | **Ctrl + F2** |
| Open Terminal | **Alt + F12** |
| Find file | **Ctrl + Shift + N** |
| Search everywhere | **Double Shift** |
| Format code | **Ctrl + Alt + L** |

## Troubleshooting in Android Studio

### Device Not Showing in Dropdown

1. **Check USB connection:**
   - Unplug and replug USB cable
   - Try different USB port
   - Try different cable (some are charge-only)

2. **Check device status:**
   - Open Terminal: `adb devices`
   - Should show your device
   - If "unauthorized", check phone screen for prompt

3. **Restart ADB:**
   - Terminal: `adb kill-server`
   - Terminal: `adb start-server`
   - Refresh device dropdown

### App Can't Connect to Backend

1. **Check backend is running:**
   ```bash
   # Should be running at http://127.0.0.1:8000
   ```

2. **Re-run port forwarding:**
   ```bash
   adb reverse tcp:8000 tcp:8000
   ```

3. **Check .env file:**
   ```env
   API_BASE_URL=http://10.0.2.2:8000/api/mobile
   ```

4. **Hot restart the app:**
   - Click 🔄 button
   - Or press **Ctrl + Shift + \\**

### Build Errors

1. **Clean and rebuild:**
   - **Build → Clean Project**
   - **Build → Rebuild Project**

2. **Get dependencies:**
   - Open Terminal
   - Run: `flutter pub get`

3. **Update Flutter:**
   ```bash
   flutter upgrade
   ```

### ADB Not Found

Android Studio should have ADB built-in at:
```
C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

If missing:
1. **Tools → SDK Manager**
2. **SDK Tools** tab
3. Check **Android SDK Platform-Tools**
4. Click **Apply**

## Quick Reference Card

```
===========================================
  Android Studio Development Workflow
===========================================

1. Start Backend (External CMD):
   cd backend
   php artisan serve

2. In Android Studio Terminal:
   setup_android_studio.bat

3. Click Run button (▶️)
   Or press: Shift + F10

Done! 🚀
===========================================

Hot Reload: Ctrl + S
Hot Restart: Ctrl + Shift + \
Stop: Ctrl + F2
Terminal: Alt + F12
===========================================
```

## Advanced Tips

### Using Android Emulator

If you don't have a physical phone:

1. **Tools → Device Manager**
2. Click **Create Device**
3. Choose phone model (e.g., Pixel 6)
4. Select system image (Android 13+)
5. Click **Finish**
6. Click **▶️** to start emulator

**Note:** Emulator automatically uses `10.0.2.2` for localhost!

### Multiple Devices

If you have multiple phones/emulators connected:

```bash
# List devices
adb devices

# Use specific device
adb -s DEVICE_ID reverse tcp:8000 tcp:8000

# Or select in Android Studio device dropdown
```

### Debug with Breakpoints

1. Click left margin to add breakpoint (red dot)
2. Click **🐛 Debug** button
3. App stops at breakpoint
4. Inspect variables in Debug panel
5. Step through code with F8 (step over), F7 (step into)

### Flutter DevTools

Advanced debugging tools:

1. Run app in debug mode
2. Open Terminal
3. Run: `flutter pub global activate devtools`
4. Run: `flutter pub global run devtools`
5. Opens browser with advanced tools

## Configuration Files Location

- `.env` - API configuration (already set!)
- `pubspec.yaml` - Dependencies
- `android/` - Android-specific config
- `lib/` - Your Flutter code
- `assets/` - Images, fonts, etc.

## Performance Tips

### Faster Builds

1. **Enable Gradle Daemon:**
   - Already enabled by default in new projects

2. **Use Profile Mode:**
   ```bash
   flutter run --profile
   ```
   - Faster than debug mode
   - Good for testing performance

3. **Build APK for Testing:**
   ```bash
   flutter build apk --debug
   ```
   - Install once, test multiple times

## Ready to Start!

1. ✅ Open project in Android Studio
2. ✅ Connect phone via USB
3. ✅ Run `setup_android_studio.bat`
4. ✅ Click Run button ▶️
5. ✅ Start coding! 🎉

**Android Studio makes Flutter development a breeze!** Enjoy! 🚀

---

## Need Help?

- **Flutter Issues:** Check `pubspec.yaml` and run `flutter pub get`
- **Connection Issues:** Run `setup_android_studio.bat` again
- **USB Issues:** See `USB_DEBUGGING_SETUP.md`
- **General Help:** Check `QUICK_START_USB.md`
