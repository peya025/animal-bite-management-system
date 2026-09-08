# Mobile App Setup Guide (USB + Wi‑Fi/Hotspot)

This guide is for the **Flutter mobile app** in the `mobile/` folder.

It covers two ways to connect the app to your Laravel backend:

1. **USB debugging** with a real Android phone
2. **Same network** using Wi‑Fi or mobile hotspot

---

## Important

This setup is for the **mobile app**, not the web frontend.

The mobile app already reads its API URL from:

- `mobile/.env`

Relevant app files:

- `mobile/lib/main.dart`
- `mobile/lib/services/mobile_api.dart`

The API URL format for the app should be:

```env
API_BASE_URL=http://...:8000/api/mobile
```

Notice the `/api/mobile` part.

---

# Option 1: USB Setup (Recommended)

This is the best option if you want a stable setup without changing IP addresses.

## Use this in `mobile/.env`

```env
API_BASE_URL=http://127.0.0.1:8000/api/mobile
CLINIC_ID=1
USE_MOCK_DATA=false
```

## Why this works

When using a real Android phone over USB, `adb reverse` forwards the phone's local port to your computer.

So:

- phone `127.0.0.1:8000`
- points to your PC `127.0.0.1:8000`

That means you do **not** need to change IP addresses when switching networks.

## Step-by-step

### 1. Enable Developer Options on your phone

- Open **Settings**
- Go to **About Phone**
- Tap **Build Number** 7 times
- Go back to **Developer Options**
- Enable **USB Debugging**

### 2. Connect your phone with a data cable

Use a USB cable that supports **data**, not just charging.

### 3. Check that ADB detects the phone

```bash
adb devices
```

Expected result: your device should appear in the list.

If it says `unauthorized`:

- check your phone screen
- tap **Allow USB Debugging**
- optionally check **Always allow from this computer**

### 4. Forward port 8000

```bash
adb reverse tcp:8000 tcp:8000
```

### 5. Start the Laravel backend

From the backend folder:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

### 6. Run the Flutter app

From the `mobile` folder:

```bash
flutter run
```

### 7. If `.env` changed

Do a **hot restart** or rerun the app.

---

# Option 2: Same Network Setup (Wi‑Fi or Hotspot)

Use this when testing without USB.

## Use this in `mobile/.env`

Example:

```env
API_BASE_URL=http://192.168.1.5:8000/api/mobile
CLINIC_ID=1
USE_MOCK_DATA=false
```

Replace `192.168.1.5` with your computer's current IP address.

## Step-by-step

### 1. Connect phone and computer to the same network

Either:

- both on the same **Wi‑Fi**
- or computer connected to your phone's **hotspot**

### 2. Find your computer's IP address

On Windows:

```bash
ipconfig
```

Look for:

```txt
IPv4 Address
```

Example:

```txt
192.168.1.5
```

### 3. Update `mobile/.env`

```env
API_BASE_URL=http://192.168.1.5:8000/api/mobile
CLINIC_ID=1
USE_MOCK_DATA=false
```

### 4. Start the Laravel backend

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

### 5. Run the Flutter app

```bash
flutter run
```

### 6. If you switch networks

You must:

1. find the new IP address
2. update `mobile/.env`
3. hot restart or rerun the app

---

# Recommended Workflow

If you want to use both USB and Wi‑Fi/hotspot, keep separate env templates.

## `mobile/.env.usb`

```env
API_BASE_URL=http://127.0.0.1:8000/api/mobile
CLINIC_ID=1
USE_MOCK_DATA=false
```

## `mobile/.env.network`

```env
API_BASE_URL=http://192.168.1.5:8000/api/mobile
CLINIC_ID=1
USE_MOCK_DATA=false
```

## Active file: `mobile/.env`

Before running the app, copy the mode you want into:

- `mobile/.env`

---

# Daily Usage

## If using USB today

1. Put USB values in `mobile/.env`
2. Run:

```bash
adb reverse tcp:8000 tcp:8000
```

3. Start backend:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

4. Run app:

```bash
flutter run
```

## If using Wi‑Fi/hotspot today

1. Run:

```bash
ipconfig
```

2. Update `mobile/.env` with your PC IP
3. Start backend:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

4. Run app:

```bash
flutter run
```

---

# Troubleshooting

## 1. `adb` not recognized

ADB is not installed or not in PATH.

Check:

```bash
adb version
```

If not found, install Android platform-tools and add them to PATH.

## 2. Device not showing in `adb devices`

Possible causes:

- USB debugging is not enabled
- cable is charge-only
- USB permission not accepted on phone

Try:

- reconnect cable
- accept debug prompt on phone
- try another USB port
- try another cable

## 3. App cannot connect to backend in USB mode

Check all of these:

```bash
adb reverse tcp:8000 tcp:8000
php artisan serve --host=0.0.0.0 --port=8000
```

And verify `mobile/.env` contains:

```env
API_BASE_URL=http://127.0.0.1:8000/api/mobile
```

## 4. App cannot connect in Wi‑Fi/hotspot mode

Check all of these:

- phone and PC are on the same network
- backend is running with `--host=0.0.0.0`
- IP in `mobile/.env` is correct
- firewall is not blocking port `8000`

## 5. Changes to `.env` are ignored

After changing `.env`, do a **hot restart** or stop and run again.

---

# Important Notes

## Use `10.0.2.2` only for Android Emulator

`10.0.2.2` is for the Android emulator only.

Do **not** use it for a real Android phone over USB.

For a real device:

- USB mode → `127.0.0.1`
- Wi‑Fi/hotspot mode → `YOUR-PC-IP`

---

# Quick Reference

## USB mode

```env
API_BASE_URL=http://127.0.0.1:8000/api/mobile
```

```bash
adb reverse tcp:8000 tcp:8000
php artisan serve --host=0.0.0.0 --port=8000
flutter run
```

## Wi‑Fi / hotspot mode

```env
API_BASE_URL=http://YOUR-PC-IP:8000/api/mobile
```

```bash
php artisan serve --host=0.0.0.0 --port=8000
flutter run
```
