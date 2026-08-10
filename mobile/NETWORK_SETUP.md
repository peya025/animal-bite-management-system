# Mobile App Network Configuration

## Problem
When you switch WiFi networks, you need to update the API base URL to point to your computer's new IP address.

## Solution: .env File

The app now uses a `.env` file for configuration. You only need to edit one file when switching networks!

## How to Find Your Computer's IP Address

### Windows:
1. Open Command Prompt (CMD)
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your WiFi adapter
4. Example: `192.168.1.100`

### Mac/Linux:
1. Open Terminal
2. Type: `ifconfig` or `ip addr`
3. Look for "inet" under your WiFi adapter
4. Example: `192.168.1.100`

## How to Update the Configuration

1. Open the file: `mobile/.env`
2. Update the `API_BASE_URL` with your computer's IP address:

```env
API_BASE_URL=http://YOUR_IP_HERE:8000/api/mobile
CLINIC_ID=1
```

### Examples for Different Networks:

**Home WiFi:**
```env
API_BASE_URL=http://192.168.1.100:8000/api/mobile
```

**Office WiFi:**
```env
API_BASE_URL=http://192.168.0.50:8000/api/mobile
```

**School WiFi:**
```env
API_BASE_URL=http://10.0.0.25:8000/api/mobile
```

**Mobile Hotspot:**
```env
API_BASE_URL=http://192.168.43.1:8000/api/mobile
```

## Setup Steps

### First Time Setup:

1. **Install dependencies:**
   ```bash
   cd mobile
   flutter pub get
   ```

2. **Copy `.env.example` to `.env`** (if not exists):
   ```bash
   copy .env.example .env
   ```

3. **Update `.env` with your IP:**
   - Find your IP address (see above)
   - Edit `mobile/.env`
   - Replace the IP in `API_BASE_URL`

4. **Start Laravel backend:**
   ```bash
   cd backend
   php artisan serve --host=0.0.0.0
   ```

5. **Run the Flutter app:**
   ```bash
   cd mobile
   flutter run
   ```

### When Switching Networks:

1. Find your new IP address
2. Edit `mobile/.env`
3. Update `API_BASE_URL` with new IP
4. **Hot restart the app** (press `R` in terminal, or stop and restart)

## Troubleshooting

### "Could not reach the server" Error

1. **Check if backend is running:**
   ```bash
   cd backend
   php artisan serve --host=0.0.0.0
   ```

2. **Verify IP address is correct:**
   - Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Update `.env` if IP changed

3. **Check firewall:**
   - Windows: Allow port 8000 through Windows Firewall
   - Mac: System Settings → Security & Privacy → Firewall

4. **Verify both devices on same network:**
   - Computer and phone must be on the same WiFi

### "Server timed out" Error

- Backend might not be running
- Check `php artisan serve --host=0.0.0.0` is active

### Changes Not Taking Effect

- After editing `.env`, do a **hot restart** (not hot reload)
- In terminal, press `R` (capital R)
- Or stop and restart the app completely

## Important Notes

- **Never commit `.env` to Git** - it's in `.gitignore`
- **Use `.env.example`** as a template for other developers
- **Hot restart required** after changing `.env`
- **Backend must use `--host=0.0.0.0`** to accept connections from network

## Quick Reference

| File | Purpose |
|------|---------|
| `.env` | Your actual configuration (not in Git) |
| `.env.example` | Template for other developers (in Git) |
| `mobile_api.dart` | Reads configuration from `.env` |
| `main.dart` | Loads `.env` on app startup |

## Example Complete Workflow

```bash
# 1. Find your IP
ipconfig
# Example output: IPv4 Address: 192.168.1.105

# 2. Edit .env
# Change to: API_BASE_URL=http://192.168.1.105:8000/api/mobile

# 3. Start backend
cd backend
php artisan serve --host=0.0.0.0

# 4. Run mobile app (in new terminal)
cd mobile
flutter run

# 5. If you change networks, just edit .env and hot restart!
```
