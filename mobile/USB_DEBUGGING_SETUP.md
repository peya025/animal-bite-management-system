# USB Debugging Setup Guide

## Why USB Debugging?
- ✅ No WiFi needed
- ✅ Works everywhere (home, office, anywhere)
- ✅ Faster than WiFi
- ✅ Never worry about IP addresses
- ✅ More stable connection

## Step-by-Step Setup

### Step 1: Enable Developer Options on Your Phone

#### For Most Android Phones:
1. Open **Settings**
2. Scroll down to **About Phone** (or **About Device**)
3. Find **Build Number** (might be under "Software Information")
4. **Tap "Build Number" 7 times rapidly**
5. You'll see a message: "You are now a developer!"

#### Common Locations by Brand:
- **Samsung**: Settings → About Phone → Software Information → Build Number
- **Xiaomi/POCO**: Settings → About Phone → MIUI Version (tap 7 times)
- **Oppo/Realme**: Settings → About Phone → Version → Build Number
- **Vivo**: Settings → About Phone → Software Version → Tap 7 times
- **Huawei**: Settings → About Phone → Build Number

### Step 2: Enable USB Debugging

1. Go back to **Settings**
2. You should now see **Developer Options** (or **Developer Settings**)
   - Usually under System → Advanced → Developer Options
   - Or directly in Settings menu
3. Scroll down and find **USB Debugging**
4. **Toggle it ON**
5. Accept any warning prompts

### Step 3: Connect Phone to Computer

1. **Connect your phone** to computer with USB cable
2. On your phone, you'll see a prompt:
   - "Allow USB Debugging?"
   - Check "Always allow from this computer"
   - Tap **OK** or **Allow**

### Step 4: Verify Connection

Open Command Prompt (CMD) or PowerShell and run:

```bash
adb devices
```

**Expected Output:**
```
List of devices attached
ABC123XYZ    device
```

**If you see "unauthorized":**
- Check your phone screen for USB debugging prompt
- Unplug and replug the USB cable
- Make sure you checked "Always allow"

**If you see "no devices":**
- USB cable might be charge-only (try a different cable)
- Install phone drivers (usually automatic)
- Try a different USB port

### Step 5: Setup Port Forwarding

Run this command **every time** you connect your phone:

```bash
adb reverse tcp:8000 tcp:8000
```

**Expected Output:**
```
8000
```

This tells Android: "When the app tries to connect to port 8000, forward it to my computer's port 8000"

### Step 6: Update Flutter .env Configuration

Edit `mobile/.env`:

```env
# USB Debugging Configuration
API_BASE_URL=http://10.0.2.2:8000/api/mobile
CLINIC_ID=1
```

**Important:** `10.0.2.2` is Android's special address for "the computer this phone is connected to"

### Step 7: Run Your App

```bash
cd mobile
flutter run
```

## Quick Start Workflow

Every time you want to develop:

```bash
# 1. Start Laravel backend
cd backend
php artisan serve

# 2. Connect phone via USB (enable USB debugging first time only)

# 3. Setup port forwarding
adb reverse tcp:8000 tcp:8000

# 4. Run Flutter app
cd mobile
flutter run
```

## Troubleshooting

### "adb is not recognized"

**Solution:** Install Android SDK Platform Tools

1. Download from: https://developer.android.com/tools/releases/platform-tools
2. Extract to `C:\platform-tools`
3. Add to PATH:
   - Search "Environment Variables" in Windows
   - Edit "Path" variable
   - Add: `C:\platform-tools`
   - Restart Command Prompt

**Quick Install (with Chocolatey):**
```bash
choco install adb
```

### Phone Not Detected

1. **Try different USB cable** (some are charge-only)
2. **Install phone drivers:**
   - Windows usually installs automatically
   - Check Device Manager for any warnings
3. **Change USB mode on phone:**
   - Swipe notification panel
   - Tap USB notification
   - Select "File Transfer" or "PTP"
4. **Disable and re-enable USB Debugging**

### "Connection Refused" Error in App

1. **Check backend is running:**
   ```bash
   php artisan serve
   ```

2. **Re-run port forwarding:**
   ```bash
   adb reverse tcp:8000 tcp:8000
   ```

3. **Verify .env is correct:**
   ```env
   API_BASE_URL=http://10.0.2.2:8000/api/mobile
   ```

4. **Hot restart the app** (press `R` in terminal)

### Multiple Devices Connected

If you have multiple phones or emulators:

```bash
# List devices
adb devices

# Use specific device
adb -s ABC123XYZ reverse tcp:8000 tcp:8000
```

### Port Already in Use

If port 8000 is busy:

```bash
# Use different port for backend
php artisan serve --port=8001

# Update port forwarding
adb reverse tcp:8001 tcp:8001

# Update .env
API_BASE_URL=http://10.0.2.2:8001/api/mobile
```

## Testing the Connection

### Test 1: Check ADB Connection
```bash
adb devices
# Should show your device
```

### Test 2: Check Port Forwarding
```bash
adb reverse tcp:8000 tcp:8000
# Should return: 8000
```

### Test 3: Test Backend
```bash
# On your computer browser:
http://localhost:8000

# Should show Laravel page
```

### Test 4: Test from App
Run the Flutter app - it should connect automatically!

## Common Commands Reference

```bash
# Check connected devices
adb devices

# Setup port forwarding (run after each phone connect)
adb reverse tcp:8000 tcp:8000

# Check port forwarding status
adb reverse --list

# Remove port forwarding
adb reverse --remove tcp:8000

# Remove all port forwards
adb reverse --remove-all

# Restart ADB server (if issues)
adb kill-server
adb start-server

# Run Flutter app
flutter run

# Hot restart Flutter app
# (In Flutter terminal, press: R)

# Hot reload Flutter app
# (In Flutter terminal, press: r)
```

## Advantages Over WiFi

| WiFi | USB Debugging |
|------|---------------|
| Must be on same network | Works anywhere |
| IP changes with network | Always `10.0.2.2` |
| Can be slow | Fast USB connection |
| Network issues | Stable connection |
| Firewall problems | No firewall issues |
| Need to configure | One-time setup |

## Daily Development Workflow

```bash
# Terminal 1: Backend
cd backend
php artisan serve

# Terminal 2: Port Forward + Flutter
adb reverse tcp:8000 tcp:8000
cd mobile
flutter run

# Done! You're developing! 🚀
```

## For Production

When deploying to production, change `.env` to point to your real API:

```env
API_BASE_URL=https://api.yoursite.com/api/mobile
```

But for development, USB debugging is perfect! 🎯
