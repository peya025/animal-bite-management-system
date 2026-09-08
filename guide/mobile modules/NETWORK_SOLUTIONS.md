# Network Configuration Solutions

## Problem
Changing IP addresses every time you switch WiFi networks is annoying!

## Solutions (Best to Worst)

### ✅ **Solution 1: Use Hostname (RECOMMENDED)**

Use your computer's hostname instead of IP address. This works on any network!

**Setup:**
1. Find your computer name:
   ```bash
   hostname
   ```
   Example output: `hazelslaptop`

2. Edit `.env`:
   ```env
   API_BASE_URL=http://hazelslaptop.local:8000/api/mobile
   ```

**Pros:**
- ✅ Works on any WiFi network
- ✅ Never need to change it
- ✅ No IP hunting

**Cons:**
- ❌ Might not work on some routers (try it first!)
- ❌ `.local` domain might not resolve on all Android devices

**Test it:**
```bash
# On your phone browser, try:
http://hazelslaptop.local:8000

# If it works, you're good!
```

---

### ✅ **Solution 2: USB Debugging (NO WIFI NEEDED)**

Connect phone via USB and forward the port. No network configuration needed!

#### **For Android:**

1. **Enable USB Debugging on phone:**
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect phone via USB**

3. **Forward the port:**
   ```bash
   adb reverse tcp:8000 tcp:8000
   ```

4. **Edit `.env`:**
   ```env
   API_BASE_URL=http://10.0.2.2:8000/api/mobile
   ```
   (10.0.2.2 is Android's special address for host computer)

5. **Run app:**
   ```bash
   flutter run
   ```

**Pros:**
- ✅ No WiFi needed
- ✅ Works anywhere
- ✅ Faster connection
- ✅ No IP changes

**Cons:**
- ❌ Phone must be plugged in
- ❌ Requires ADB setup

---

### ✅ **Solution 3: Use ngrok (Works from Internet)**

Expose your local server to the internet temporarily.

1. **Install ngrok:** https://ngrok.com/download

2. **Start backend:**
   ```bash
   cd backend
   php artisan serve
   ```

3. **Start ngrok:**
   ```bash
   ngrok http 8000
   ```
   You'll get: `https://abc123.ngrok.io`

4. **Edit `.env`:**
   ```env
   API_BASE_URL=https://abc123.ngrok.io/api/mobile
   ```

**Pros:**
- ✅ Works on any network
- ✅ Works from anywhere (even mobile data)
- ✅ HTTPS included

**Cons:**
- ❌ URL changes every time ngrok restarts (free plan)
- ❌ Slower (goes through internet)
- ❌ Requires ngrok to be running

---

### ✅ **Solution 4: Set Static IP**

Make your computer use the same IP on your home network.

**Windows:**
1. Open Settings → Network & Internet → WiFi
2. Click your network → IP Settings → Edit
3. Change to "Manual"
4. Set IP: `192.168.1.100` (or similar)
5. Set Subnet: `255.255.255.0`
6. Set Gateway: `192.168.1.1` (your router)
7. Set DNS: `8.8.8.8`

**Edit `.env`:**
```env
API_BASE_URL=http://192.168.1.100:8000/api/mobile
```

**Pros:**
- ✅ Same IP every time on home network
- ✅ Fast connection

**Cons:**
- ❌ Only works on home network
- ❌ Still need to change when on different WiFi
- ❌ Might conflict with other devices

---

### ⚠️ **Solution 5: Use .env file (CURRENT)**

What we just implemented - edit file when switching networks.

**Edit `.env`:**
```env
API_BASE_URL=http://192.168.18.53:8000/api/mobile
```

**Pros:**
- ✅ Simple
- ✅ Works everywhere

**Cons:**
- ❌ Must update when changing networks
- ❌ Need to find IP each time

---

## Recommended Setup by Use Case

### **For Development at Home:**
→ **Use Hostname** (`hazelslaptop.local`)
- If it doesn't work, use USB Debugging

### **For Testing at Multiple Locations:**
→ **Use USB Debugging** (ADB reverse)
- No network hassle

### **For Demo/Client Testing:**
→ **Use ngrok**
- Client can test from their own phone

### **For Production:**
→ **Deploy backend to real server** (VPS/Cloud)
- Use permanent domain: `https://api.yoursite.com`

---

## Quick Test Commands

### Test Hostname:
```bash
# On phone browser:
http://hazelslaptop.local:8000

# If this works, use hostname!
```

### Test USB Debugging:
```bash
# Connect phone, enable USB debugging, then:
adb devices
adb reverse tcp:8000 tcp:8000

# Should show your device
```

### Test ngrok:
```bash
# Start backend:
php artisan serve

# New terminal:
ngrok http 8000

# Copy URL and test in phone browser
```

---

## My Recommendation

**Try this order:**

1. **First, try hostname** (`hazelslaptop.local`)
   - Edit `.env` and test
   - If it works → You're done! ✅

2. **If hostname doesn't work, use USB**
   - Run `adb reverse tcp:8000 tcp:8000`
   - Use `10.0.2.2:8000` in `.env`
   - You'll never worry about networks again! ✅

3. **If you need wireless, use ngrok**
   - Great for demos and client testing

---

## Current Status

Your `.env` is configured to use hostname:
```env
API_BASE_URL=http://hazelslaptop.local:8000/api/mobile
```

**Test it now:**
1. Make sure backend is running: `php artisan serve --host=0.0.0.0`
2. On your phone browser, visit: `http://hazelslaptop.local:8000`
3. If it works → Perfect! Hot restart your Flutter app
4. If not → Use USB debugging method (Solution 2)

**Want me to help you set up USB debugging instead?**
