# USB Debugging Setup & Troubleshooting Guide

## Why USB Debugging?
- ✅ **No WiFi network needed** (works anywhere)
- ✅ **Zero latency** (faster and more reliable than WiFi)
- ✅ **No IP address changes** when switching networks/routers
- ✅ **Stable connection** for testing real camera, NFC, and physical phone hardware

---

## ⚡ Important: Physical Phone vs. Emulator IP Address

| Environment | Connection Method | Required `API_BASE_URL` in `mobile/.env` |
|-------------|-------------------|------------------------------------------|
| **Physical Android Phone (USB)** | USB Cable + `adb reverse tcp:8000 tcp:8000` | `http://127.0.0.1:8000/api/mobile` *(or localhost)* |
| **Android Studio Emulator** | Virtual Device (AVD) | `http://10.0.2.2:8000/api/mobile` |
| **WiFi Network (No USB)** | Same WiFi Network | `http://<YOUR_COMPUTER_IP>:8000/api/mobile` |

> ⚠️ **Common Mistake**: `10.0.2.2` is **ONLY** for the Android Studio virtual emulator. If you connect a **physical phone** via USB and use `10.0.2.2`, the connection will **FAIL**. For physical phones with `adb reverse`, always use `127.0.0.1` or `localhost`.

---

## Step-by-Step Setup for Physical Phone

### Step 1: Enable Developer Options on Your Phone

1. Open **Settings** on your phone.
2. Scroll to **About Phone** (or **About Device** / **System Information**).
3. Find **Build Number** (on Xiaomi: **MIUI/HyperOS Version**; on Oppo/Realme: **Version → Build Number**).
4. **Tap "Build Number" 7 times rapidly** until it says *"You are now a developer!"*.

---

### Step 2: Enable USB Debugging

1. Go back to **Settings → System → Developer Options** (or **Additional Settings → Developer Options**).
2. Find and turn **ON**:
   - **USB Debugging**
   - *(Xiaomi/MIUI only)*: Turn ON **"Install via USB"** and **"USB Debugging (Security settings)"**.
   - *(Oppo/Realme/Vivo only)*: Turn ON **"Disable Permission Monitoring"** if app installation prompts freeze.

---

### Step 3: Connect Phone to PC & Authorize

1. Connect your phone to your PC using a **data-capable USB cable** (not a charge-only cable).
2. On your phone screen, look for the popup prompt:
   - *"Allow USB debugging?"*
   - Check the box: ☑ **"Always allow from this computer"**
   - Tap **Allow** or **OK**.

---

### Step 4: Verify ADB Connection

Open PowerShell or Command Prompt on your computer:

```bash
adb devices
```

**Expected Output:**
```
List of devices attached
988a1b4247544d324d    device
```

---

### Step 5: Setup Reverse Port Forwarding

Run this command:

```bash
adb reverse tcp:8000 tcp:8000
```

**Expected Output:**
```
8000
```

> **What this does**: It routes requests from the phone's `http://127.0.0.1:8000` through the USB cable directly to your computer's Laravel server running on port `8000`.

---

### Step 6: Configure `mobile/.env`

Open `c:\xampp\htdocs\abtc\mobile\.env` and set:

```env
USE_MOCK_DATA=false
API_BASE_URL=http://127.0.0.1:8000/api/mobile
CLINIC_ID=1
```

---

### Step 7: Run Laravel & Flutter App

1. **Terminal 1 (Backend):**
   ```bash
   cd c:\xampp\htdocs\abtc\backend
   php artisan serve --port=8000
   ```

2. **Terminal 2 (Mobile App):**
   ```bash
   cd c:\xampp\htdocs\abtc\mobile
   flutter run
   ```

---

## 🛠️ Complete Troubleshooting Guide

### 1. `adb reverse` drops when phone disconnects or laptop sleeps
- **Symptom**: App was working, but after unplugging/replugging the phone or waking up PC, app shows "Connection Refused" or "SocketException".
- **Why**: `adb reverse` port mapping is stored in memory and resets whenever the USB connection drops.
- **Solution**: Simply re-run:
  ```bash
  adb reverse tcp:8000 tcp:8000
  ```
  Check active forwards anytime with:
  ```bash
  adb reverse --list
  ```

---

### 2. Device shows as `unauthorized`
- **Symptom**: `adb devices` outputs:
  ```
  ABC123XYZ    unauthorized
  ```
- **Solution**:
  1. Unplug the USB cable.
  2. On your phone: **Settings → Developer Options → Revoke USB debugging authorizations**.
  3. Re-plug the USB cable.
  4. Unlock your phone screen and tap **"Always allow from this computer"** → **Allow**.
  5. Restart ADB on PC:
     ```bash
     adb kill-server
     adb devices
     ```

---

### 3. Device shows as `offline` or doesn't appear at all (`List of devices attached` is empty)
- **Possible Causes & Solutions**:
  1. **Charge-Only Cable**: Many cheap cables only have power wires. Test with another cable that supports data transfer.
  2. **USB Connection Mode**: Pull down phone notification shade → Tap **Charging this device via USB** → Select **File Transfer (MTP)** or **MIDI / PTP**.
  3. **Windows Missing OEM Drivers**:
     - Open Windows **Device Manager**.
     - Look for yellow `!` warning under *Portable Devices* or *Other Devices* (e.g. `Android` or `SAMSUNG_Android`).
     - Right-click → **Update driver** → **Search automatically for drivers** (or install your phone's official USB driver from Samsung/Xiaomi/Google).
  4. **USB Hub / Port**: Plug directly into a motherboard USB port on your PC rather than an unpowered USB hub.

---

### 4. Xiaomi / Redmi / POCO (MIUI / HyperOS) Specific Issues
- **Symptom**: ADB commands fail or app cannot install via USB.
- **Solution**:
  1. In **Developer Options**, you MUST enable:
     - **USB Debugging**
     - **Install via USB** *(requires Xiaomi account login & SIM card inserted)*
     - **USB Debugging (Security Settings)**
  2. Turn OFF **"MIUI Optimization"** if Flutter installation hangs.

---

### 5. `10.0.2.2` Connection Refused on Real Phone
- **Symptom**: Flutter app shows `SocketException: Connection refused (OS Error: Connection refused, errno = 111), address = 10.0.2.2`.
- **Cause**: `10.0.2.2` only exists inside the emulator router.
- **Solution**: In `mobile/.env`, change:
  ```env
  API_BASE_URL=http://127.0.0.1:8000/api/mobile
  ```
  Then run `adb reverse tcp:8000 tcp:8000` and restart the Flutter app with `R`.

---

### 6. Multiple Devices Connected Error
- **Symptom**: `adb reverse: more than one device/emulator`.
- **Solution**:
  1. Check attached device IDs:
     ```bash
     adb devices
     ```
  2. Target your specific device using `-s`:
     ```bash
     adb -s <DEVICE_SERIAL_ID> reverse tcp:8000 tcp:8000
     ```

---

### 7. Port 8000 Already in Use by Another Application
- **Symptom**: Laravel fails to start on port 8000.
- **Solution**:
  1. Run Laravel on port 8001:
     ```bash
     php artisan serve --port=8001
     ```
  2. Forward port 8001 to the phone:
     ```bash
     adb reverse tcp:8001 tcp:8001
     ```
  3. Update `mobile/.env`:
     ```env
     API_BASE_URL=http://127.0.0.1:8001/api/mobile
     ```

---

## ⚡ 1-Click Helper Script (Windows)

To avoid typing ADB commands every time, you can create and run `run_usb_debug.bat` inside `mobile/`:

```bat
@echo off
echo ===========================================
echo  Animal Bite Center - USB Debugging Starter
echo ===========================================
echo.

adb devices
echo.
echo Setting up reverse port forward for port 8000...
adb reverse tcp:8000 tcp:8000

echo.
echo Active port forwards:
adb reverse --list

echo.
echo Setup complete! You can now run: flutter run
pause
```

---

## Summary Checklist Before Testing
1. [ ] Phone Developer Options and USB Debugging are **ON**.
2. [ ] Phone is connected via USB and allowed on computer.
3. [ ] `adb reverse tcp:8000 tcp:8000` returned `8000`.
4. [ ] `mobile/.env` has `API_BASE_URL=http://127.0.0.1:8000/api/mobile`.
5. [ ] Laravel backend is running (`php artisan serve --port=8000`).
