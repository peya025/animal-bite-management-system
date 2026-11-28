# Implementation Plan: Cloud File Storage (S3 / Cloudflare R2 / Spaces)

**Feature:** Cloud File Storage & Ephemeral Persistence  
**Status:** 🟢 Integrated & Live Verified (Cloudflare R2)  
**Issue:** ⚠️ Risk of file loss on redeploy — *Remediated*  
**Tool / Service:** Cloudflare R2 (Connected & Verified)  

---

## 1. Simple Summary (What is this and why is it red?)

### The Problem in Simple Words (The "Hotel Room" Analogy)
Right now, whenever someone uploads a file in the app (like a clinic logo or a nurse's digital signature), our system saves it directly on the server's local hard drive.

When our app is hosted online (like on Railway), the server acts like a **hotel room**:
- Every time we update the app, restart the server, or push new code, Railway **wipes the room clean and gives us a fresh one**.
- Any files saved on the local hard drive get **permanently erased**!
- The database still has the file's name saved, but when a user tries to see the clinic logo, watch a video, or print a DOH report, the picture is missing and shows a broken **"404 Not Found"** error.

### What Files Are in Danger?
1. ✍️ **Nurse & Doctor Signatures:** Used on patient vaccination cards and legal bite treatment records.
2. 🏥 **Clinic Logos & Seals:** Official DOH, Provincial, and RHU crests on patient forms.
3. 📢 **Announcement Banners:** Public notices and holiday clinic schedules.
4. 🎥 **Educational Videos:** Rabies awareness and bite care videos streamed to patients.

---

## 2. The Solution (An Online Cloud Locker)

Instead of leaving files inside the temporary hotel room, we put them into a permanent **online storage locker** (Cloud Object Storage):
- Whenever a file is uploaded, our server sends it straight to the cloud locker.
- When the server restarts or updates, **no files are lost** because they live safely outside the server.

```
[User Uploads File] ──▶ [ABTC Server] ──▶ [Cloud Storage Locker (Cloudflare R2 / AWS S3)]
                                                     ▲
                                                     │ (Files stay safe forever,
[Server Restarts / Updates]                          │  even when server restarts!)
```

### Which Cloud Locker Should We Use?
We can use any of these three, but **Cloudflare R2 is the clear winner**:
- 🥇 **Cloudflare R2 (Recommended):**
  - **100% Free** (gives 10 Gigabytes of storage free every month).
  - **Free Downloads (\$0.00):** Other services charge money every time a patient watches an educational video. Cloudflare charges **\$0.00**.
- 🥈 **AWS S3:** The famous Amazon service. Gives 5 GB free for 1 year, then you pay.
- 🥉 **DigitalOcean Spaces:** Costs \$5 every month (no free tier).

---

## 3. Executive Summary & Technical Details

All three candidates implement the standard AWS S3 API, meaning Laravel interacts with them using the exact same S3 driver.

| Criteria | 🥇 Cloudflare R2 (Recommended) | 🥈 AWS S3 | 🥉 DigitalOcean Spaces |
| :--- | :--- | :--- | :--- |
| **Free Tier / Demo Cost** | **10 GB free forever**, 1M write ops, 10M read ops/mo | 5 GB free for first 12 months only | No free tier ($5/month minimum) |
| **Data Egress (Bandwidth) Fees** | **$0.00 / GB (Zero egress fees)** | \$0.09 / GB (can get costly for videos) | \$0.01 / GB after 1TB included |
| **Laravel Compatibility** | 100% S3 API compatible | Native standard | 100% S3 API compatible |
| **Setup Complexity** | Very low (API Token + Account ID) | Moderate (IAM roles, Bucket policies, CORS) | Low (Spaces key + secret) |
| **Public Asset CDN** | Built-in free Cloudflare CDN & custom domain | Requires CloudFront setup for custom domain | Built-in CDN included |
| **Verdict for ABTC** | **Top Recommendation** (Free, zero-egress, ideal for videos and clinic logos) | Standard enterprise choice | Great if already hosting on DigitalOcean |

> [!TIP]
> **Recommended Strategy:** Standardize the code on Laravel's standard S3 driver so that the project can switch between **Cloudflare R2**, **AWS S3**, and **DigitalOcean Spaces** simply by changing `.env` variables without modifying a single line of PHP code!

---

## 3. Architecture Overview

### 3.1 Current Ephemeral Architecture (Failure Mode)
```
[User / Browser]
       │ (Uploads Logo / Signature / Video)
       ▼
[Railway Container (Ephemeral Disk)]  ───▶  Files stored in /storage/app/...
       │                                           │
       │ (Redeploy / Restart occurs)                │
       ▼                                           ▼
[New Railway Container]                💥 ALL LOCAL FILES ERASED! 💥
       │
       ▼
[Database still holds paths] ─────────▶ ❌ 404 File Not Found (Broken Images & Signatures)
```

### 3.2 Target Cloud Storage Architecture
```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  Cloud Object Storage                  │
                                  │             (Cloudflare R2 / AWS S3 / DO)              │
                                  │                                                        │
[Public Assets]                   │   ┌────────────────────────────────────────────────┐   │
- Clinic Logos                    │   │ Public Bucket / Prefix:                        │   │
- Header Crests                   │   │ clinic-logos/                                  │   │
- Announcements                   │   │ clinic-resources/ (thumbnails & videos)        │   │
- Educational Media               │   │ announcements/                                 │   │
       │                          │   └───────────────────────┬────────────────────────┘   │
       │ (Direct CDN Delivery)    │                           │                            │
       └──────────────────────────┼───────────────────────────┘                            │
                                  │                                                        │
[Private Assets]                  │   ┌────────────────────────────────────────────────┐   │
- Staff E-Signatures (Legal/PEP)  │   │ Private Bucket / Prefix:                       │   │
       │                          │   │ staff-signatures/signatures/*.png              │   │
       │                          │   └───────────────────────▲────────────────────────┘   │
       │                          └───────────────────────────┼────────────────────────────┘
       │                                                      │
       │ (Must be Authenticated)                              │ (Internal Private S3 Access)
       ▼                                                      │
[Laravel Backend Controller] ─────────────────────────────────┘
 (Verifies Session / Token / Role & streams file or returns temporary pre-signed URL)
       │
       ▼
[Authenticated Nurse / Doctor Browser / Mobile App]
```

---

## 4. Asset Inventory & Security Architecture

The application handles two distinct security categories of files:

### 4.1 Public Assets (Direct CDN / S3 Delivery)
These assets contain no Protected Health Information (PHI) and should be fast, cacheable, and directly streamable:
- **Clinic Logos & Print Letterheads:** `clinic-logos/` (Used on dashboard headers and DOH print receipts)
- **Clinic Resources (Videos & Thumbnails):** `clinic-resources/videos/`, `clinic-resources/thumbnails/` (Educational rabies videos streamed to patient phones)
- **Announcements:** `announcements/` (Public clinic advisories)

**Access Policy:** Public Read (`visibility => 'public'`). In Cloudflare R2 or S3, files are assigned public read visibility or served directly via the bucket's public domain URL / CDN.

### 4.2 Private Clinical Assets (Staff Electronic Signatures)
- **Storage Location:** `staff-signatures/signatures/{uuid}.png`
- **Sensitivity:** Staff signatures are legally binding medical authorizations for rabies biologicals (RIG and Rabies Vaccine). They must **never** be world-readable or indexed by search engines.
- **Access Policy:** Private (`visibility => 'private'`).
- **Delivery Mechanism:** 
  1. **Option A (Current Pattern - Authenticated Proxy):** Kept intact. The frontend and mobile apps request `/api/staff-signature` or `/api/users/{id}/signature`. Laravel validates the Bearer token and permissions (`isAdmin` or matching staff ID), fetches the binary data from the private S3 disk, and streams it back with `Cache-Control: private, no-store`.
  2. **Option B (Temporary Pre-Signed URLs):** Alternatively, Laravel can generate an S3 temporary pre-signed URL valid for 5 minutes (`Storage::disk('signatures')->temporaryUrl($path, now()->addMinutes(5))`).

---

## 5. Step-by-Step Implementation Plan

### Phase 1: Install Composer Dependencies
Laravel 12 does not package the AWS S3 Flysystem adapter by default. The official Flysystem S3 package must be installed.

**Action Item:**
Run inside `backend/`:
```bash
composer require league/flysystem-aws-s3-v3 "^3.0"
```
*Note:* This single package powers **AWS S3**, **Cloudflare R2**, and **DigitalOcean Spaces** seamlessly.

---

### Phase 2: Update Configuration (`backend/config/filesystems.php`)
Configure standard S3 disk settings and add support for independent private signatures disk when running on cloud storage.

**File to Edit:** `backend/config/filesystems.php`

```php
'disks' => [

    // Local / fallback disks remain unchanged for offline development
    'local' => [
        'driver' => 'local',
        'root' => storage_path('app/private'),
        'serve' => true,
        'throw' => false,
        'report' => false,
    ],

    'public' => [
        'driver' => env('FILESYSTEM_DISK', 'local') === 's3' ? 's3' : 'local',
        'root' => storage_path('app/public'),
        'url' => env('FILESYSTEM_DISK', 'local') === 's3' 
            ? env('AWS_URL', rtrim((string) config('app.url'), '/').'/storage')
            : rtrim((string) config('app.url'), '/').'/storage',
        'visibility' => 'public',
        'throw' => false,
        'report' => false,
    ],

    // Private Staff Signatures Disk
    'signatures' => [
        'driver' => env('SIGNATURES_DISK', env('FILESYSTEM_DISK', 'local') === 's3' ? 's3_signatures' : 'local'),
        'root' => storage_path('app/private/staff-signatures'),
        'visibility' => 'private',
        'throw' => true,
    ],

    // Universal S3 Disk (AWS S3, Cloudflare R2, DigitalOcean Spaces)
    's3' => [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'auto'),
        'bucket' => env('AWS_BUCKET'),
        'url' => env('AWS_URL'),
        'endpoint' => env('AWS_ENDPOINT'),
        'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
        'throw' => true,
        'report' => false,
    ],

    // Dedicated Private Signatures S3 Disk (Optional prefix or separate bucket)
    's3_signatures' => [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'auto'),
        'bucket' => env('AWS_SIGNATURES_BUCKET', env('AWS_BUCKET')),
        'prefix' => env('AWS_SIGNATURES_PREFIX', 'private-staff-signatures'),
        'endpoint' => env('AWS_ENDPOINT'),
        'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
        'visibility' => 'private',
        'throw' => true,
    ],

],
```

---

### Phase 3: Update Environment Templates

#### 3.1 `backend/.env.example`
Add the cloud storage template variables:
```dotenv
# Filesystem Configuration
FILESYSTEM_DISK=local
SIGNATURES_DISK=local

# S3 / Cloudflare R2 / DigitalOcean Spaces Settings (When FILESYSTEM_DISK=s3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=auto
AWS_BUCKET=abtc-storage
AWS_URL=
AWS_ENDPOINT=
AWS_USE_PATH_STYLE_ENDPOINT=false
```

#### 3.2 `backend/.env.railway.example`
Add the production cloud storage variables required on Railway:
```dotenv
# Cloud File Storage (Required for persistent logos, media, and signatures on ephemeral containers)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_DEFAULT_REGION=auto
AWS_BUCKET=abtc-production
AWS_URL=https://pub-your-id.r2.dev
AWS_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
AWS_USE_PATH_STYLE_ENDPOINT=false
```

---

### Phase 4: Modernize Backend Services & Models

#### 4.1 `backend/app/Models/Clinic.php`
Ensure logo URLs resolve correctly whether using local disk or cloud storage:
```php
public function getLogoUrlAttribute(): ?string
{
    if (!$this->logo_path) {
        return null;
    }
    if (config('filesystems.default') === 's3' || env('FILESYSTEM_DISK') === 's3') {
        return Storage::disk('public')->url($this->logo_path);
    }
    return asset('storage/' . $this->logo_path);
}

public function getLeftPrintLogoUrlAttribute(): ?string
{
    if (!$this->left_print_logo_path) {
        return null;
    }
    if (config('filesystems.default') === 's3' || env('FILESYSTEM_DISK') === 's3') {
        return Storage::disk('public')->url($this->left_print_logo_path);
    }
    return url('api/storage/' . $this->left_print_logo_path);
}

public function getRightPrintLogoUrlAttribute(): ?string
{
    if (!$this->right_print_logo_path) {
        return null;
    }
    if (config('filesystems.default') === 's3' || env('FILESYSTEM_DISK') === 's3') {
        return Storage::disk('public')->url($this->right_print_logo_path);
    }
    return url('api/storage/' . $this->right_print_logo_path);
}
```

#### 4.2 `backend/app/Services/StaffSignatureService.php`
Ensure `StaffSignatureService` continues to work cleanly with either local storage or private cloud object storage:
```php
public function response(?string $path)
{
    abort_unless($this->available($path), 404, 'No signature image is available.');

    $disk = Storage::disk(config('filesystems.disks.signatures.driver') === 's3_signatures' ? 's3_signatures' : 'signatures');

    return response($disk->get($path), 200, [
        'Content-Type' => 'image/png',
        'Cache-Control' => 'private, no-store, max-age=0',
        'X-Content-Type-Options' => 'nosniff',
        'Content-Disposition' => 'inline; filename="signature.png"',
    ]);
}
```

#### 4.3 `backend/app/Http/Controllers/Support/PublicStorageController.php` & `PublicStorageService.php`
When `FILESYSTEM_DISK=s3`, the fallback route `/api/storage/{path}` can either:
- Redirect directly to the public S3/CDN URL (`return redirect()->away(Storage::disk('public')->url($path));`), OR
- Stream the S3 resource directly if custom domain headers/CORS need enforcement.

---

### Phase 5: One-Click Cloud Migration Artisan Command
To prevent losing existing clinic logos, educational videos, and staff signatures already on the local disk when switching to cloud storage, create a migration command:

**File:** `backend/app/Console/Commands/MigrateStorageToCloud.php`

**Command Usage:**
```bash
php artisan storage:migrate-to-cloud
```

**Functionality:**
1. Connects to the local disks (`public` and `signatures`).
2. Iterates over all files:
   - `clinic-logos/*`
   - `clinic-resources/*`
   - `announcements/*`
   - `signatures/*`
3. Checks if the file already exists on the destination S3 disk (skips if existing and MD5 matches).
4. Uploads each file to S3 with appropriate visibility (`public` for logos/media, `private` for signatures).
5. Displays a progress bar and outputs a summary report.

---

## 6. Provider-Specific Quick Reference

### Cloudflare R2 (Recommended #1)
- **Account ID:** Found in Cloudflare Dashboard URL or Overview page.
- **Endpoint:** `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- **Region:** `auto`
- **Path Style Endpoint:** `false`
- **Public Domain:** Enable **Public Access** on bucket (e.g. `https://pub-xxxx.r2.dev` or custom domain `https://cdn.yourdomain.com`).
- **Cost:** Free up to 10 GB storage and $0 egress.

### AWS S3
- **Region:** e.g. `ap-southeast-1` (Singapore) or `ap-southeast-2` (Sydney).
- **Endpoint:** Leave blank (Laravel computes it from region).
- **Path Style Endpoint:** `false`
- **Bucket Policy:** Configure public read for public folder, block public read for signatures prefix.

### DigitalOcean Spaces
- **Region:** e.g. `sgp1` (Singapore)
- **Endpoint:** `https://sgp1.digitaloceanspaces.com`
- **Path Style Endpoint:** `false`
- **URL:** `https://<bucket-name>.sgp1.digitaloceanspaces.com` (or CDN endpoint)

---

## 7. Verification & Testing Checklist

- [ ] **Package Verification:**
  - [ ] `league/flysystem-aws-s3-v3` installed in `backend/composer.json`.
  - [ ] `composer check-platform-reqs` passes.
- [ ] **Unit & Feature Tests:**
  - [ ] Staff signature upload test passes with `Storage::fake('s3_signatures')`.
  - [ ] Clinic logo upload test passes with `Storage::fake('s3')`.
  - [ ] Clinic educational video upload test passes with `Storage::fake('s3')`.
  - [ ] Announcement image upload test passes with `Storage::fake('s3')`.
- [ ] **Redeploy Persistence Test:**
  1. Upload clinic logo in Admin Clinic Profile.
  2. Upload a staff signature in Staff Profile.
  3. Upload an educational video in Clinic Resources.
  4. Trigger a backend redeploy / container restart on Railway.
  5. Reload the application and verify:
     - [ ] Clinic logo displays properly without 404.
     - [ ] DOH report PDF exports render the official clinic logos.
     - [ ] Staff signature loads on treatment administration records.
     - [ ] Educational video streams smoothly to patient mobile app.

---

## 8. Summary of Files Changed & Created

| Path | Purpose |
| :--- | :--- |
| `backend/composer.json` | Add `league/flysystem-aws-s3-v3` dependency |
| `backend/config/filesystems.php` | Add S3 and S3 Signatures disk configurations |
| `backend/.env.example` | Document S3 / R2 environment variables |
| `backend/.env.railway.example` | Production Railway cloud storage variables |
| `backend/app/Models/Clinic.php` | Dynamic cloud URL resolver for logos |
| `backend/app/Services/StaffSignatureService.php` | Cloud-aware private signature handling |
| `backend/app/Console/Commands/MigrateStorageToCloud.php` | CLI tool to migrate local assets to S3 |
| `docs/tasks/09-cloud-file-storage-s3-r2/PROVIDER_SETUP_GUIDES.md` | Step-by-step credentials guide for R2, S3, & Spaces |
| `docs/tasks/README.md` | Registered in master tasks index |
