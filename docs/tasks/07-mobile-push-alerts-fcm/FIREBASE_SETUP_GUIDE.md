# Firebase Setup Guide (Free & Step-by-Step)

This guide shows you exactly how to set up Google Firebase for mobile push notifications.

> [!NOTE]
> **Is it free?** **YES, 100% free.**  
> Google Firebase Cloud Messaging (FCM) is completely free with unlimited messages on the free "Spark" plan.  
> You do **not** need a credit card.
>
> **Does it work with APKs?** **YES, 100%.**  
> You do **not** need to publish to Google Play Store. Any APK you build (`flutter build apk`) and install directly on a phone will receive push notifications properly.

---

## Step 1: Open Firebase & Create a Free Project

1. Open your web browser and go to: **[https://console.firebase.google.com/](https://console.firebase.google.com/)**
2. Sign in with your standard Google / Gmail account.
3. Click the **Add project** (or **Create a project**) button.
4. Type a name for your project:
   - **Project name:** `ABTC Clinic` (or any name you like)
   - Click **Continue**.
5. When asked about Google Analytics:
   - Turn the switch **OFF** (this keeps setup fast and simple).
6. Click **Create project**. Wait ~10 seconds for it to finish, then click **Continue**.

---

## Step 2: Add Your Android App

1. On your new project dashboard, click the round **Android icon** (the little green robot).
2. Fill in the app details:
   - **Android package name:** Type exactly: `com.example.mobile`  
     *(This must match `mobile/android/app/build.gradle.kts`)*
   - **App nickname:** Type: `ABTC Mobile`
   - **Debug signing certificate SHA-1:** Leave this blank for now.
3. Click the blue **Register app** button.

---

## Step 3: Download `google-services.json`

1. Click the blue button: **Download google-services.json**.
2. Save this file to your computer.
3. Place this file into the project folder:
   ```text
   c:\xampp\htdocs\abtc\mobile\android\app\google-services.json
   ```
4. Back in the browser wizard, click **Next** $\rightarrow$ **Next** $\rightarrow$ **Continue to console**.

---

## Step 4: Download the Server Key (For the Backend)

1. Look at the top left navigation menu.
2. Click the **Gear icon (⚙️)** next to *Project Overview*, then click **Project settings**.
3. Along the top tabs, click **Service accounts**.
4. Click the blue button **Generate new private key**, then click **Generate key**.
5. A `.json` file will download to your computer (its name will look like `abtc-clinic-firebase-adminsdk-xxxxx.json`).
6. Rename this file to `firebase-credentials.json` and place it here:
   ```text
   c:\xampp\htdocs\abtc\backend\storage\app\firebase-credentials.json
   ```

---

## Summary of Files Needed

| File Name | Downloaded From | Where to put it |
| :--- | :--- | :--- |
| `google-services.json` | Firebase Console → Android App | `mobile/android/app/google-services.json` |
| `firebase-credentials.json` | Firebase Console → Project Settings → Service Accounts | `backend/storage/app/firebase-credentials.json` |

Once these two files are placed, the backend and mobile app are ready to send and receive live push notifications!
