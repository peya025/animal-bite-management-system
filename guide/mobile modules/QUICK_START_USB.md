# 🚀 Quick Start: USB Debugging

This is the **RECOMMENDED** way to develop - no WiFi needed, works everywhere!

## First-Time Setup (Do Once)

### 1️⃣ Install ADB (Android Debug Bridge)

**Run the installer:**
```bash
cd mobile
install_adb.bat
```

Choose Option 1 (Manual) or Option 2 (Chocolatey)

**Or install manually:**
1. Download: https://developer.android.com/tools/releases/platform-tools
2. Extract to `C:\platform-tools`
3. Add `C:\platform-tools` to Windows PATH
4. Restart Command Prompt

### 2️⃣ Enable USB Debugging on Your Phone

1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times (enables Developer Mode)
3. Go back to **Settings → Developer Options**
4. Enable **USB Debugging**

**Detailed guide:** See `USB_DEBUGGING_SETUP.md`

### 3️⃣ Connect Phone & Allow Debugging

1. Connect phone to computer via USB cable
2. On phone, tap **OK** when prompted "Allow USB Debugging?"
3. Check "Always allow from this computer"

## Daily Development Workflow

Every time you want to develop, follow these simple steps:

### Terminal 1: Start Backend

```bash
cd backend
php artisan serve
```

Leave this running.

### Terminal 2: Setup USB & Run App

```bash
cd mobile

# Quick setup (one command does everything!)
setup_usb.bat

# Then run Flutter
flutter run
```

**That's it!** 🎉

## Alternative: Manual Commands

If you prefer manual control:

```bash
# 1. Check phone is connected
adb devices

# 2. Setup port forwarding
adb reverse tcp:8000 tcp:8000

# 3. Run Flutter app
flutter run
```

## Configuration

Your `.env` is already configured for USB debugging:

```env
API_BASE_URL=http://10.0.2.2:8000/api/mobile
```

**What is `10.0.2.2`?**
- It's Android's special address for "the computer I'm connected to via USB"
- You never need to change this!

## Troubleshooting

### "adb is not recognized"

→ **Solution:** ADB not installed or not in PATH
```bash
# Run the installer:
cd mobile
install_adb.bat
```

### "no devices/emulators found"

→ **Solution:** Phone not connected or USB debugging not enabled

1. Check USB cable is connected
2. Enable USB Debugging (see Setup step 2)
3. Try different USB port
4. Try different USB cable (some are charge-only)

### "unauthorized"

→ **Solution:** Need to allow on phone

1. Look at your phone screen
2. Tap "OK" on "Allow USB Debugging?" prompt
3. Check "Always allow from this computer"
4. Unplug and replug USB cable

### "reverse: closed" error

→ **Solution:** Run port forwarding again
```bash
adb reverse tcp:8000 tcp:8000
```

### App can't connect to backend

→ **Solution:** Check all these:

1. **Backend running?**
   ```bash
   cd backend
   php artisan serve
   ```

2. **Port forwarding set?**
   ```bash
   adb reverse tcp:8000 tcp:8000
   ```

3. **Correct .env?**
   ```env
   API_BASE_URL=http://10.0.2.2:8000/api/mobile
   ```

4. **Hot restart app** (press `R` in Flutter terminal)

## Why USB Debugging is Best

| Feature | USB | WiFi |
|---------|-----|------|
| Setup complexity | One-time | Every network change |
| IP configuration | Never changes (`10.0.2.2`) | Changes with network |
| Speed | Fast (USB 2.0/3.0) | Depends on WiFi |
| Reliability | Very stable | Can drop connection |
| Works without WiFi | ✅ Yes | ❌ No |
| Works at any location | ✅ Yes | ❌ Only on same network |
| Firewall issues | ✅ None | ⚠️ Possible |

## Test Your Setup

Run this test to verify everything works:

```bash
# 1. Check ADB
adb version
# Should show ADB version

# 2. Check phone connection
adb devices
# Should show your device

# 3. Setup port forwarding
adb reverse tcp:8000 tcp:8000
# Should return: 8000

# 4. Start backend (new terminal)
cd backend
php artisan serve
# Should start on http://127.0.0.1:8000

# 5. Run Flutter app (new terminal)
cd mobile
flutter run
# Should build and run on your phone
```

## Helper Scripts

We created these scripts to make your life easier:

| Script | Purpose |
|--------|---------|
| `install_adb.bat` | Install ADB (first time only) |
| `setup_usb.bat` | Quick setup port forwarding |
| `USB_DEBUGGING_SETUP.md` | Detailed setup guide |

## Quick Reference Card

Print this or save it as a sticky note:

```
=================================
  Daily Flutter Development
=================================

Terminal 1:
  cd backend
  php artisan serve

Terminal 2:
  cd mobile
  setup_usb.bat
  flutter run

Done! 🚀
=================================
```

## Next Steps

1. **Install ADB** (if not done): Run `install_adb.bat`
2. **Enable USB Debugging** on phone (one-time)
3. **Connect phone** via USB
4. **Run setup**: `setup_usb.bat`
5. **Start coding!** 🎉

**Need help?** Check `USB_DEBUGGING_SETUP.md` for detailed troubleshooting.
