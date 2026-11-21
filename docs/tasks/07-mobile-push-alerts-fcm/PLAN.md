# Implementation Plan: Mobile Push Alerts (FCM)

**Feature:** Mobile Push Alerts (Firebase Cloud Messaging)  
**Status:** 🔴 Not Integrated (In-app fetch only)  
**Issue:** ❌ No background phone alerts  
**Tool / Service:** Firebase Cloud Messaging (FCM)  

---

## 1. Simple Summary (What is this and why do we need it?)

### The Problem Today
Right now, the mobile app only downloads notifications when a user opens the app and navigates to the notifications screen.

If the patient's phone is inside their pocket, screen is off, or the app is closed:
- The phone will **not ring**.
- The phone will **not vibrate**.
- No notification banner appears on the lock screen.

Because of this, patients can easily miss critical rabies vaccination dates (Day 0, Day 3, Day 7, Day 14/28) or appointment updates.

### The Goal
Connect the mobile app to **Firebase Cloud Messaging (FCM)**. When the clinic sends an alert, the patient's phone receives a real push notification popup immediately, even when the app is completely closed.

---

## 2. How Push Notifications Work (In Simple Words)

```
[Patient's Phone]                          [Firebase Cloud]                  [ABTC Clinic Backend]
      │                                           │                                    │
      │ 1. Opens app and asks permission         │                                    │
      │──────────────────────────────────────────>│                                    │
      │                                           │                                    │
      │ 2. Firebase gives phone a unique address  │                                    │
      │    (called an FCM Token)                  │                                    │
      │<──────────────────────────────────────────│                                    │
      │                                           │                                    │
      │ 3. Phone sends this address to our server │                                    │
      │───────────────────────────────────────────────────────────────────────────────>│
      │                                           │                                    │
      │                                           │   4. Tomorrow is Day 3 Vaccine!    │
      │                                           │      Server asks Firebase to push  │
      │                                           │<───────────────────────────────────│
      │                                           │                                    │
      │ 5. Firebase sends popup to phone lockscreen                                    │
      │<──────────────────────────────────────────│                                    │
      │                                           │                                    │
      │ * BEEP! "Reminder: Day 3 Dose Tomorrow" * │                                    │
```

---

## 3. Step-by-Step Implementation Plan

### Step 1: Set up Firebase Project (Google Firebase Console)

> [!NOTE]
> **Cost:** 100% Free. No credit card required. Firebase Cloud Messaging (FCM) is completely free on the Spark plan.  
> 👉 See detailed guide: [`FIREBASE_SETUP_GUIDE.md`](./FIREBASE_SETUP_GUIDE.md)

1. Open your browser and go to [https://console.firebase.google.com/](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **Add project** (or **Create a project**).
   - Project name: `ABTC Clinic`
   - Disable Google Analytics (optional, keeps setup simple).
   - Click **Create project** and then **Continue**.
3. Under project settings, click the **Android icon** (the little green robot) to add an Android app.
4. Enter the registration details:
   - **Android package name:** Type exactly: `com.example.mobile` (matches `mobile/android/app/build.gradle.kts`).
   - **App nickname:** `ABTC Mobile`.
   - **SHA-1:** Leave blank for now.
   - Click **Register app**.
5. Download the file named **`google-services.json`**.
6. Put this `google-services.json` file inside the project folder:
   ```text
   mobile/android/app/google-services.json
   ```
7. Click **Next** → **Next** → **Continue to console**.
8. Go to **Project Settings (⚙️)** → **Service Accounts** tab in Firebase Console:
   - Click **Generate new private key** → **Generate key**.
   - A `.json` credentials file will download.
   - Rename it to `firebase-credentials.json` and save it here:
     ```text
     backend/storage/app/firebase-credentials.json
     ```

---

### Step 2: Configure Android Files in Flutter

1. Open `mobile/android/settings.gradle.kts`:
   Add the Google Services plugin under `plugins { ... }`:
   ```kotlin
   plugins {
       id("dev.flutter.flutter-plugin-loader") version "1.0.0"
       id("com.android.application") version "9.0.1" apply false
       id("org.jetbrains.kotlin.android") version "2.3.20" apply false
       id("com.google.gms.google-services") version "4.4.2" apply false
   }
   ```

2. Open `mobile/android/app/build.gradle.kts`:
   Apply the plugin in the `plugins` block:
   ```kotlin
   plugins {
       id("com.android.application")
       id("kotlin-android")
       id("dev.flutter.flutter-gradle-plugin")
       id("com.google.gms.google-services")
   }
   ```

3. Open `mobile/android/app/src/main/AndroidManifest.xml`:
   Make sure notification permission is added inside `<manifest>`:
   ```xml
   <uses-permission android:name="android.permission.INTERNET"/>
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
   <uses-permission android:name="android.permission.VIBRATE"/>
   <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
   ```

---

### Step 3: Add Flutter Packages & Code

1. In `mobile/pubspec.yaml`, add the required packages:
   ```yaml
   dependencies:
     flutter:
       sdk: flutter
     firebase_core: ^3.6.0
     firebase_messaging: ^15.1.3
     flutter_local_notifications: ^17.2.2
   ```
   Run `flutter pub get`.

2. Create a new service file: `mobile/lib/services/push_notification_service.dart`.
   This file will do four simple things:
   - **Ask permission:** Pop up a dialog asking the user: *"Allow ABTC to send you notifications?"*
   - **Get Device Token:** Ask Firebase for the phone's unique address token.
   - **Send Token to Backend:** Call `api.saveDeviceToken(fcmToken)`.
   - **Handle Clicks:** When the user taps a notification banner, open the right screen (e.g. notifications page or appointment page).

3. In `mobile/lib/main.dart`:
   - Initialize Firebase before `runApp()`:
     ```dart
     WidgetsFlutterBinding.ensureInitialized();
     await Firebase.initializeApp();
     await PushNotificationService.initialize();
     ```
   - Register the background message handler:
     ```dart
     @pragma('vm:entry-point')
     Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
       await Firebase.initializeApp();
       // Handles notification when app is killed or in background
     }
     ```

4. In `mobile/lib/services/mobile_api.dart`:
   Add two simple API calls:
   ```dart
   Future<void> saveDeviceToken(String token) async {
     await _send('POST', '/mobile/device-token', {'token': token});
   }

   Future<void> deleteDeviceToken() async {
     await _send('DELETE', '/mobile/device-token');
   }
   ```

---

### Step 4: Backend Setup (Laravel API)

1. **Add `fcm_token` column to database:**
   Create a database migration:
   ```bash
   php artisan make:migration add_fcm_token_to_patient_accounts_table
   ```
   In the migration file:
   ```php
   public function up(): void
   {
       Schema::table('patient_accounts', function (Blueprint $table) {
           $table->text('fcm_token')->nullable()->after('google_id');
       });
   }
   ```
   Run `php artisan migrate`.

2. **Add API Routes in `backend/routes/api.php`:**
   Inside the protected mobile patient route group:
   ```php
   Route::post('/mobile/device-token', [PatientDeviceTokenController::class, 'store']);
   Route::delete('/mobile/device-token', [PatientDeviceTokenController::class, 'destroy']);
   ```

3. **Create `PatientDeviceTokenController.php`:**
   - `store()`: Saves the token to `auth()->user()->update(['fcm_token' => $request->token])`.
   - `destroy()`: Clears the token on logout so the phone stops receiving notifications for that account.

4. **Create Firebase Push Sender Service (`App\Services\Notification\FcmService.php`):**
   - Reads the Firebase Service Account JSON key.
   - Sends HTTP POST request to Firebase API:
     `https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`
   - Payload includes:
     - `title`: e.g., *"Rabies Dose 3 Reminder"*
     - `body`: e.g., *"Your next vaccination is scheduled for tomorrow at 9:00 AM."*
     - `data`: e.g., `{"screen": "/notifications", "id": "12"}`

5. **Connect Push to Clinic Events:**
   Whenever a notification is saved to the `notifications` table for a patient, also call:
   ```php
   $fcmService->sendToPatientAccount($patientAccount, $title, $message);
   ```

---

## 4. How to Test (Testing Guide)

| Test # | What to do | Expected Result |
| :--- | :--- | :--- |
| **Test 1** | Open app for the first time. | App shows standard permission popup: *"Allow notifications?"*. Clicking Allow generates an FCM token. |
| **Test 2** | Check database `patient_accounts` table. | The `fcm_token` column has the long token string saved. |
| **Test 3** | Keep app **open on screen** and send a test message from backend. | In-app banner appears at the top of the screen. |
| **Test 4** | Press Home button (app is **minimized in background**). Send test message. | Phone vibrates/chimes. Notification icon appears in phone status bar. |
| **Test 5** | Swipe away the app (app is **completely closed/killed**). Send test message. | Notification still arrives on lock screen! |
| **Test 6** | Tap the notification banner on lock screen. | App opens directly to the Notifications screen. |
| **Test 7** | Log out of the mobile app. | `fcm_token` is cleared in database so user no longer gets notifications after logging out. |

---

## 5. Action Checklist

- [ ] **Step 1: Firebase Console**
  - [ ] Create project in Firebase Console.
  - [ ] Add Android app with package name `com.example.mobile`.
  - [ ] Download `google-services.json` and put into `mobile/android/app/`.
  - [ ] Download Firebase Service Account JSON for backend.
- [ ] **Step 2: Flutter App**
  - [ ] Add `firebase_core`, `firebase_messaging`, `flutter_local_notifications` to `pubspec.yaml`.
  - [ ] Update `settings.gradle.kts` and `app/build.gradle.kts`.
  - [ ] Create `push_notification_service.dart`.
  - [ ] Initialize Firebase in `main.dart`.
  - [ ] Test token generation on phone/emulator.
- [ ] **Step 3: Backend API**
  - [ ] Run migration to add `fcm_token` to `patient_accounts`.
  - [ ] Create `POST /api/mobile/device-token` and `DELETE /api/mobile/device-token`.
  - [ ] Create `FcmService.php` to push alerts to Firebase.
  - [ ] Connect FCM service to notification creation events.
- [ ] **Step 4: Verification**
  - [ ] Test with app in foreground.
  - [ ] Test with app in background.
  - [ ] Test with app completely closed.
