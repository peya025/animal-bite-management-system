# Cloud Storage Provider Setup Guides (R2, S3, & Spaces)

This guide provides exact step-by-step instructions for creating and connecting an S3-compatible cloud object storage bucket to the Animal Bite Management System.

---

## Guide 1: Cloudflare R2 (Recommended #1)

### Why Cloudflare R2?
- **100% Free Tier:** 10 GB storage free every month, 1,000,000 Class A operations (writes), and 10,000,000 Class B operations (reads).
- **$0.00 Egress Fees:** Cloudflare never charges bandwidth egress fees (unlike AWS which charges \$0.09/GB).
- **Global Low Latency:** Assets are cached on Cloudflare's edge network worldwide.

---

### Step 1: Create a Cloudflare Account & Enable R2
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) and log in (or create a free account).
2. In the left-hand navigation menu, click **R2**.
3. If prompted, click **Enable R2** (it may require entering payment details for verification, but you will not be charged within the generous free tier limits).

---

### Step 2: Create Your R2 Storage Bucket
1. Inside the R2 dashboard, click **Create bucket**.
2. **Bucket name:** Enter a lowercase name, e.g., `abtc-storage`.
3. **Location:** Select **Automatic** (or choose a region closest to the Philippines, e.g., `WNAM` or `APAC`).
4. Click **Create bucket**.

---

### Step 3: Enable Public Access / Custom Domain (For Public Logos & Media)
1. In your bucket page, click the **Settings** tab.
2. Scroll down to **Public Access**.
3. Under **R2.dev subdomain**, click **Allow Access**.
   - Type `allow` to confirm.
   - Copy the public URL provided (e.g., `https://pub-a1b2c3d4e5f6.r2.dev`).
4. *(Optional & Recommended for Production)* Under **Custom Domains**, click **Connect Domain** and bind a custom subdomain (e.g., `cdn.abtc-clinic.ph`).

---

### Step 4: Configure CORS (Cross-Origin Resource Sharing)
To ensure the web app and mobile app can load videos and images smoothly:
1. In the **Settings** tab, scroll to **CORS Policy**.
2. Click **Add CORS Policy** and paste:
```json
[
  {
    "AllowedOrigins": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type",
      "Content-Range"
    ],
    "MaxAgeSeconds": 3600
  }
]
```
3. Click **Save**.

---

### Step 5: Generate S3 API Credentials
1. In the left sidebar under **R2**, click **Manage R2 API Tokens**.
2. Click **Create API token**.
3. **Token name:** `abtc-railway-backend`.
4. **Permissions:** Select **Object Read & Write**.
5. **Apply to:** Select your bucket (`abtc-storage`).
6. Click **Create API Token**.
7. Cloudflare will display:
   - **Access Key ID:** (e.g., `09a8b7c6d5e4...`)
   - **Secret Access Key:** (e.g., `f1e2d3c4...`)
   - **Endpoint:** (e.g., `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)
   > [!IMPORTANT]
   > Copy both keys immediately! Cloudflare will never show the Secret Access Key again.

---

### Step 6: Configure Environment Variables in Railway
Go to your **Railway Project > Backend Service > Variables**, and add:

```dotenv
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=<your-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
AWS_DEFAULT_REGION=auto
AWS_BUCKET=abtc-storage
AWS_URL=https://pub-a1b2c3d4e5f6.r2.dev
AWS_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
AWS_USE_PATH_STYLE_ENDPOINT=false
```

Deploy the backend. All uploads will now persist in Cloudflare R2!

---

## Guide 2: Amazon Web Services (AWS S3)

### Step 1: Create an S3 Bucket
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/s3/).
2. Click **Create bucket**.
3. **Bucket name:** e.g., `abtc-clinic-production`.
4. **AWS Region:** Choose `ap-southeast-1` (Singapore) for lowest latency in the Philippines.
5. **Object Ownership:** ACLs enabled (or ACLs disabled if using Bucket Policies).
6. Click **Create bucket**.

---

### Step 2: Create an IAM User for Least-Privilege Access
1. Open the [IAM Console](https://console.aws.amazon.com/iam/).
2. Click **Users > Create user**.
3. User name: `abtc-s3-app-user`. Do NOT check "Provide user access to the AWS Management Console".
4. In Permissions, click **Attach policies directly** > **Create policy**.
5. Paste the following JSON policy (replace `abtc-clinic-production` with your bucket name):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ABTCBucketAccess",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": "arn:aws:s3:::abtc-clinic-production"
        },
        {
            "Sid": "ABTCObjectAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:GetObjectAcl",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::abtc-clinic-production/*"
        }
    ]
}
```
6. Name the policy `ABTC_S3_Storage_Policy` and create it.
7. Return to the user creation tab, attach `ABTC_S3_Storage_Policy`, and create the user.
8. Click on the newly created user > **Security credentials** tab > **Create access key** > **Application running outside AWS**.
9. Save the **Access Key ID** and **Secret Access Key**.

---

### Step 3: Railway Environment Variables for AWS S3
```dotenv
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrXUtn...
AWS_DEFAULT_REGION=ap-southeast-1
AWS_BUCKET=abtc-clinic-production
AWS_URL=https://abtc-clinic-production.s3.ap-southeast-1.amazonaws.com
AWS_USE_PATH_STYLE_ENDPOINT=false
```

---

## Guide 3: DigitalOcean Spaces

### Step 1: Create a Space
1. Log in to [cloud.digitalocean.com](https://cloud.digitalocean.com/).
2. In the top navigation, click **Create > Spaces**.
3. **Region:** Select `Singapore` (SGP1).
4. **Enable CDN:** Toggle ON (CDN is included at no extra cost).
5. **File Listing:** Select **Restricted**.
6. **Space Name:** e.g., `abtc-spaces`.
7. Click **Create Space**.

---

### Step 2: Generate Access Keys
1. In the left navigation, click **API > Spaces Keys**.
2. Click **Generate New Key**.
3. Name: `abtc-backend-key`.
4. Copy the **Key** and **Secret**.

---

### Step 3: Railway Environment Variables for DigitalOcean Spaces
```dotenv
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=<your-spaces-key>
AWS_SECRET_ACCESS_KEY=<your-spaces-secret>
AWS_DEFAULT_REGION=sgp1
AWS_BUCKET=abtc-spaces
AWS_URL=https://abtc-spaces.sgp1.cdn.digitaloceanspaces.com
AWS_ENDPOINT=https://sgp1.digitaloceanspaces.com
AWS_USE_PATH_STYLE_ENDPOINT=false
```

---

## Step 4: Verification After Setup

To verify your storage connection from your terminal or server:

```bash
php artisan tinker
```
Inside Tinker:
```php
Illuminate\Support\Facades\Storage::disk('s3')->put('test.txt', 'ABTC Cloud Storage is working!');
echo Illuminate\Support\Facades\Storage::disk('s3')->get('test.txt');
Illuminate\Support\Facades\Storage::disk('s3')->delete('test.txt');
```
If this prints `"ABTC Cloud Storage is working!"` without errors, your cloud object storage setup is 100% verified and ready for production!
