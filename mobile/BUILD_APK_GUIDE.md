# 📦 Building APK Guide

Complete guide to building an APK for demo/installation.

## Prerequisites

### Enable Windows Developer Mode (Required Once)

Flutter needs Developer Mode enabled on Windows to create symlinks.

**Method 1: Automatic (Just Ran)**
```bash
start ms-settings:developers
```
This should have opened Windows Settings.

**Method 2: Manual Steps**
1. Press **Windows Key**
2. Type "**Developer settings**"
3. Click "**Developer settings**"
4. Toggle "**Developer Mode**" to **ON**
5. Click "**Yes**" if prompted
6. Restart if prompted (usually not needed)

**Why needed?**
Flutter uses symlinks for plugin management. Developer Mode allows creating symlinks without admin privileges.

---

## Building APK

### Step 1: Clean Build (If Previous Build Failed)

```bash
cd mobile
flutter clean
```

### Step 2: Choose APK Type

#### **Option A: Debug APK (Faster, Larger)**

**Best for:** Quick testing, demo on your own phone

```bash
flutter build apk --debug
```

**Pros:**
- ✅ Builds in ~2-3 minutes
- ✅ Easier to debug
- ✅ Includes debugging tools

**Cons:**
- ❌ Larger file size (~40-60 MB)
- ❌ Slower performance
- ❌ Shows "Debug" banner

**Output:**
```
build/app/outputs/flutter-apk/app-debug.apk
```

#### **Option B: Release APK (Optimized, Smaller)**

**Best for:** Client demos, production testing, distribution

```bash
flutter build apk --release
```

**Pros:**
- ✅ Smaller file size (~20-30 MB per architecture)
- ✅ Better performance
- ✅ No debug banner
- ✅ Production-ready

**Cons:**
- ❌ Takes longer to build (~5-10 minutes)
- ❌ Harder to debug

**Output:**
```
build/app/outputs/flutter-apk/app-release.apk
```

#### **Option C: Split APKs (Smallest)**

**Best for:** Play Store upload, optimized distribution

```bash
flutter build apk --split-per-abi --release
```

Creates 3 APKs:
```
app-armeabi-v7a-release.apk  (~15-20 MB) - Older phones
app-arm64-v8a-release.apk    (~15-20 MB) - Modern phones (most common)
app-x86_64-release.apk       (~18-22 MB) - Emulators
```

**How to use:**
- Install `arm64-v8a` on most phones (2017+)
- Install `armeabi-v7a` on older phones
- Upload all 3 to Play Store

---

## Common Build Issues & Solutions

### Issue 1: Developer Mode Not Enabled

**Error:**
```
Building with plugins requires symlink support.
Please enable Developer Mode in your system settings.
```

**Solution:**
```bash
# Opens Developer Settings
start ms-settings:developers

# Toggle "Developer Mode" ON
```

Then try building again.

---

### Issue 2: File Being Used by Another Process

**Error:**
```
java.io.FileNotFoundException: ... (The process cannot access the file because it is being used by another process)
```

**Solution:**
```bash
# 1. Clean build
flutter clean

# 2. Close Android Studio if open

# 3. Kill Gradle processes
taskkill /F /IM java.exe

# 4. Try again
flutter build apk --debug
```

---

### Issue 3: Gradle Build Failed

**Error:**
```
BUILD FAILED in XXs
Gradle task assembleRelease failed with exit code 1
```

**Solution 1: Clean Gradle Cache**
```bash
cd mobile
flutter clean
cd android
gradlew clean
cd ..
flutter build apk --debug
```

**Solution 2: Clear Gradle Cache Completely**
```bash
# Delete Gradle cache
rmdir /s /q %USERPROFILE%\.gradle\caches

# Rebuild
flutter clean
flutter pub get
flutter build apk --debug
```

**Solution 3: Update Gradle (If Very Old)**
```bash
cd android
gradlew wrapper --gradle-version 7.6
cd ..
flutter build apk --debug
```

---

### Issue 4: OutOfMemoryError

**Error:**
```
java.lang.OutOfMemoryError: Java heap space
```

**Solution:**

Edit `android/gradle.properties`, add:
```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

Then rebuild.

---

### Issue 5: SDK Not Found

**Error:**
```
SDK location not found
```

**Solution:**

Create `android/local.properties`:
```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\sdk
```

Replace `YOUR_USERNAME` with your actual username.

---

## APK Installation

### Method 1: USB Cable (Direct Install)

```bash
# Build APK
flutter build apk --debug

# Install directly
flutter install
```

Or:
```bash
adb install build/app/outputs/flutter-apk/app-debug.apk
```

### Method 2: File Transfer

**Transfer APK to phone:**

1. **USB Cable:**
   - Connect phone
   - Copy APK to phone's Download folder
   - Disconnect

2. **Email:**
   - Email APK to yourself
   - Open email on phone
   - Download APK

3. **Google Drive/Dropbox:**
   - Upload APK to cloud
   - Download on phone

4. **WhatsApp/Telegram:**
   - Send APK to yourself
   - Download on phone

**Install APK:**

1. Open APK file on phone
2. Tap "**Install**"
3. If prompted:
   - "**Install Unknown Apps**" → Allow
   - "**Play Protect**" warning → Install anyway
4. Tap "**Open**" to launch app

---

## Signed Release APK (For Distribution)

For production or wider distribution, you should sign the APK.

### Step 1: Create Keystore

```bash
keytool -genkey -v -keystore C:\Users\YOUR_USERNAME\upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Answer the prompts and **remember your password**!

### Step 2: Configure Signing

Create `android/key.properties`:
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=upload
storeFile=C:/Users/YOUR_USERNAME/upload-keystore.jks
```

### Step 3: Update Build Configuration

Edit `android/app/build.gradle`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### Step 4: Build Signed APK

```bash
flutter build apk --release
```

**Important:** Add `key.properties` to `.gitignore`!

---

## Quick Reference

### Debug APK (Quick Demo)
```bash
flutter clean
flutter build apk --debug

# APK: build/app/outputs/flutter-apk/app-debug.apk
```

### Release APK (Client Demo)
```bash
flutter clean
flutter build apk --release

# APK: build/app/outputs/flutter-apk/app-release.apk
```

### Split APKs (Play Store)
```bash
flutter build apk --split-per-abi --release

# APKs:
# build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk
# build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
# build/app/outputs/flutter-apk/app-x86_64-release.apk
```

### Direct Install
```bash
flutter build apk --debug
flutter install
```

---

## Troubleshooting Checklist

Before asking for help, try these:

- [ ] Developer Mode enabled? (`start ms-settings:developers`)
- [ ] Ran `flutter clean`?
- [ ] Closed Android Studio?
- [ ] Killed Gradle processes? (`taskkill /F /IM java.exe`)
- [ ] Updated dependencies? (`flutter pub get`)
- [ ] Enough disk space? (Need ~5GB free)
- [ ] Internet connection for dependencies?
- [ ] Antivirus not blocking? (Try disabling temporarily)

---

## APK Size Comparison

| Type | Size | Build Time | Best For |
|------|------|------------|----------|
| Debug | ~40-60 MB | ~2-3 min | Quick testing |
| Release | ~20-30 MB | ~5-10 min | Distribution |
| Split (each) | ~15-20 MB | ~5-10 min | Play Store |

---

## Next Steps

1. **Enable Developer Mode** (one-time)
2. **Build debug APK** for quick test
3. **Install on your phone**
4. **Test the app!**
5. **Build release APK** for client demo
6. **Share and present!** 🎉

---

Ready to build? Follow the steps above! 🚀
