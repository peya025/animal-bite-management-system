# Free Hosting Deployment Guide - Testing Environment

**Date:** September 4, 2026  
**Purpose:** Deploy Animal Bite Management System for free testing  
**Stack:** Laravel 12 + React 19 + MySQL

---

## 📊 YOUR CURRENT STACK

### Backend:
- **Framework:** Laravel 12 (PHP 8.2+)
- **Database:** MySQL
- **Authentication:** Laravel Sanctum (JWT)
- **Queue:** Database driver
- **Session:** Database driver
- **Cache:** Database driver

### Frontend:
- **Framework:** React 19.2.6
- **Build Tool:** Vite 8.0.12
- **UI Library:** Material-UI 9.1.1
- **Routing:** React Router 6.21.0
- **Map:** Leaflet 1.9.4

### Requirements:
- PHP 8.2+
- MySQL 8.0+
- Node.js 18+
- Composer 2.x

---

## 🎯 RECOMMENDED FREE HOSTING OPTIONS

### ⭐ OPTION 1: Railway.app (HIGHLY RECOMMENDED) 

**Why Best for Your Stack:**
- ✅ Native support for Laravel + React monorepo
- ✅ Free MySQL database included
- ✅ Automatic HTTPS
- ✅ GitHub integration (auto-deploy)
- ✅ Environment variables management
- ✅ Custom domain support
- ✅ 500 hours/month free ($5 credit)

**Free Tier Limits:**
- $5 credit/month (~500 execution hours)
- 512MB RAM
- 1GB disk storage
- Shared CPU

**Perfect For:** 
- ✅ Your Laravel 12 + React 19 stack
- ✅ Full-stack apps with database
- ✅ Real testing environment

**Deployment Steps:** See Section 3 below

---

### 🥈 OPTION 2: Render.com

**Why Good:**
- ✅ Native Laravel support
- ✅ Free PostgreSQL/MySQL database
- ✅ Automatic HTTPS
- ✅ GitHub auto-deploy
- ✅ Environment variables

**Free Tier Limits:**
- 750 hours/month
- 512MB RAM
- Sleeps after 15min inactivity (wakes on request)

**Drawback:**
- ⚠️ Sleep mode causes 30-60s delay on first request

**Perfect For:**
- ✅ Testing/demo environments
- ✅ Low-traffic testing

**Deployment Steps:** See Section 4 below

---

### 🥉 OPTION 3: Vercel (Frontend) + Railway (Backend)

**Why Consider:**
- ✅ Best React/Vite performance (Vercel)
- ✅ Free MySQL on Railway
- ✅ Unlimited bandwidth (Vercel)
- ✅ Global CDN

**Free Tier:**
- Vercel: 100GB bandwidth, unlimited builds
- Railway: $5 credit/month

**Perfect For:**
- ✅ Maximum frontend performance
- ✅ Global testing with fast load times

**Deployment Steps:** See Section 5 below

---

### ❌ NOT RECOMMENDED OPTIONS

**Heroku:**
- ❌ No free tier anymore (minimum $5/month)

**000webhost, InfinityFree:**
- ❌ PHP 7.4 max (you need 8.2+)
- ❌ No Laravel support
- ❌ No SSH access
- ❌ No Composer

**Netlify:**
- ❌ Static sites only (no PHP/Laravel)
- ✅ Frontend only (would need separate backend)

---

## 🚀 DEPLOYMENT OPTION 1: Railway.app (RECOMMENDED)

### Prerequisites:
1. GitHub account
2. Railway account (sign up at railway.app)
3. Push your code to GitHub

### Step 1: Prepare Your Repository

```bash
# 1. Initialize git (if not already done)
cd c:\xampp\htdocs\abc\animal-bite-management-system
git init

# 2. Create .gitignore in root
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore
echo "backend/vendor/" >> .gitignore
echo "backend/storage/logs/*" >> .gitignore
echo "frontend/dist/" >> .gitignore
echo "frontend/node_modules/" >> .gitignore

# 3. Add all files
git add .
git commit -m "Initial commit for Railway deployment"

# 4. Push to GitHub
# Create new repo on GitHub: animal-bite-management-system
git remote add origin https://github.com/YOUR_USERNAME/animal-bite-management-system.git
git branch -M main
git push -u origin main
```

### Step 2: Create Railway Configuration

Create `railway.json` in project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && php artisan serve --host=0.0.0.0 --port=$PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Create `nixpacks.toml` in project root:

```toml
[phases.setup]
nixPkgs = ['php82', 'php82Packages.composer', 'nodejs-18_x']

[phases.install]
cmds = [
  'cd backend && composer install --no-dev --optimize-autoloader',
  'cd frontend && npm install',
  'cd frontend && npm run build'
]

[phases.build]
cmds = [
  'cd backend && php artisan config:cache',
  'cd backend && php artisan route:cache',
  'cd backend && php artisan view:cache'
]

[start]
cmd = 'cd backend && php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=$PORT'
```

### Step 3: Deploy on Railway

1. **Go to Railway.app** → Click "Start New Project"

2. **Deploy from GitHub** → Select your repository

3. **Add MySQL Database:**
   - Click "+ New" → "Database" → "MySQL"
   - Railway will auto-provision MySQL 8.0

4. **Configure Environment Variables:**
   Click on your service → "Variables" → Add:

```env
# App
APP_NAME="Animal Bite Treatment Center"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-app.up.railway.app
APP_TIMEZONE=Asia/Manila

# Generate this: php artisan key:generate --show
APP_KEY=base64:YOUR_GENERATED_KEY_HERE

# Frontend URL (will be same as backend in Railway)
FRONTEND_URL=https://your-app.up.railway.app

# Sanctum
SANCTUM_STATEFUL_DOMAINS=your-app.up.railway.app

# Database (Railway auto-injects these, but verify)
DB_CONNECTION=mysql
DB_HOST=${{MYSQLHOST}}
DB_PORT=${{MYSQLPORT}}
DB_DATABASE=${{MYSQLDATABASE}}
DB_USERNAME=${{MYSQLUSER}}
DB_PASSWORD=${{MYSQLPASSWORD}}

# Seeding (set false for fresh install)
SEED_DEFAULT_CLINIC=true

# Session
SESSION_DRIVER=database
SESSION_LIFETIME=120

# Queue & Cache
QUEUE_CONNECTION=database
CACHE_STORE=database

# Mail (optional - use log for testing)
MAIL_MAILER=log

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=error
```

5. **Deploy:**
   - Railway will auto-deploy on every git push
   - First deployment takes 5-10 minutes

6. **Run Migrations:**
   - Click on your service → "Deploy" tab
   - Once deployed, open Terminal
   - Run: `cd backend && php artisan migrate --force`

7. **Access Your App:**
   - Copy the Railway URL: `https://your-app.up.railway.app`
   - Visit in browser
   - Login with default credentials:
     - Email: `admin@clinic.com`
     - Password: `password123`

### Step 4: Custom Domain (Optional)

1. Buy domain on Namecheap/GoDaddy (~$1-10/year)
2. In Railway → Settings → Domains
3. Add custom domain: `abts.yourdomain.com`
4. Update DNS CNAME record to Railway URL

---

## 🌐 DEPLOYMENT OPTION 2: Render.com

### Step 1: Prepare Repository (Same as Railway)

### Step 2: Create Render Configuration

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: animal-bite-api
    env: docker
    region: oregon
    plan: free
    buildCommand: |
      cd backend
      composer install --no-dev --optimize-autoloader
      cd ../frontend
      npm install
      npm run build
    startCommand: |
      cd backend
      php artisan migrate --force
      php artisan config:cache
      php artisan route:cache
      php artisan serve --host=0.0.0.0 --port=$PORT
    envVars:
      - key: APP_ENV
        value: production
      - key: APP_DEBUG
        value: false
      - key: APP_KEY
        generateValue: true
      - key: DB_CONNECTION
        value: mysql
      - key: DB_HOST
        fromDatabase:
          name: animal-bite-db
          property: host
      - key: DB_DATABASE
        fromDatabase:
          name: animal-bite-db
          property: database
      - key: DB_USERNAME
        fromDatabase:
          name: animal-bite-db
          property: user
      - key: DB_PASSWORD
        fromDatabase:
          name: animal-bite-db
          property: password

databases:
  - name: animal-bite-db
    databaseName: abts_db
    user: abts_user
    plan: free
```

### Step 3: Deploy on Render

1. Go to **render.com** → Sign up with GitHub
2. Click "New +" → "Blueprint"
3. Select your GitHub repository
4. Render reads `render.yaml` and provisions services
5. Wait 10-15 minutes for deployment
6. Access at `https://animal-bite-api.onrender.com`

**Note:** Free tier sleeps after 15 minutes of inactivity. First request wakes it (30-60s delay).

---

## ⚡ DEPLOYMENT OPTION 3: Vercel + Railway Split

### Frontend on Vercel, Backend on Railway

#### Step 1: Deploy Backend to Railway
Follow "OPTION 1" steps above for backend only.

#### Step 2: Deploy Frontend to Vercel

Create `vercel.json` in `/frontend`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_API_URL": "https://your-backend.up.railway.app"
  }
}
```

Update `frontend/.env.production`:

```env
VITE_API_URL=https://your-backend.up.railway.app
```

Update `frontend/src/shared/config/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

**Deploy:**
1. Go to **vercel.com** → "Add New Project"
2. Import from GitHub → Select your repo
3. Root Directory: `frontend`
4. Framework Preset: Vite
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Deploy!

**Result:**
- Frontend: `https://your-app.vercel.app` (Fast global CDN)
- Backend: `https://your-backend.up.railway.app`

---

## 🔧 PRE-DEPLOYMENT CHECKLIST

### ✅ Backend Preparation

```bash
# 1. Update CORS allowed origins for production
# backend/config/cors.php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173'),
    // Add your production domains
],

# 2. Disable debug in production
# backend/.env.production
APP_DEBUG=false
APP_ENV=production

# 3. Set strong APP_KEY
php artisan key:generate

# 4. Optimize for production
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 5. Set correct session domain
# backend/config/session.php
'domain' => env('SESSION_DOMAIN', null),
```

### ✅ Frontend Preparation

```bash
# 1. Create production environment file
# frontend/.env.production
VITE_API_URL=https://your-backend-url.com

# 2. Update API base URL
# frontend/src/shared/config/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

# 3. Build for production
npm run build

# 4. Test production build locally
npm run preview
```

### ✅ Security Fixes (CRITICAL - Fix before deploying!)

**Do NOT deploy without fixing these 4 critical issues:**

```bash
# 1. Fix race condition
# See SECURITY_FIX_CHECKLIST.md item #1

# 2. Enforce FIFO on backend
# See SECURITY_FIX_CHECKLIST.md item #2

# 3. Restrict delete to admin only
# See SECURITY_FIX_CHECKLIST.md item #3

# 4. Add audit logging
# See SECURITY_FIX_CHECKLIST.md item #4
```

⚠️ **WARNING:** The security audit found 4 CRITICAL vulnerabilities. Fix these before deploying online, even for testing!

---

## 📝 POST-DEPLOYMENT STEPS

### 1. Verify Deployment

```bash
# Test API health
curl https://your-app.up.railway.app/api/health

# Test database connection
curl https://your-app.up.railway.app/api/setup/status

# Test authentication
curl -X POST https://your-app.up.railway.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinic.com","password":"password123"}'
```

### 2. Run Database Migrations

```bash
# Railway: Open terminal in dashboard
cd backend && php artisan migrate --force

# Seed default data (if needed)
php artisan db:seed --class=DefaultClinicSeeder
```

### 3. Update Default Passwords

```bash
# Login to app → Settings → Users
# Change all default passwords:
# - admin@clinic.com
# - treatment@clinic.com
# - etc.
```

### 4. Configure Production Settings

1. **App Name:** Update in `.env` → `APP_NAME="Tagoloan ABTC"`
2. **Timezone:** `APP_TIMEZONE=Asia/Manila`
3. **Email:** Configure SMTP (optional)
4. **Backups:** Enable Railway scheduled backups

---

## 💰 COST COMPARISON

| Platform | Free Tier | Limit | Sleep Mode | Best For |
|----------|-----------|-------|------------|----------|
| **Railway** | $5/mo credit | ~500 hours | ❌ No | Full production testing |
| **Render** | 750 hours | 512MB RAM | ✅ Yes (15min) | Demo/low-traffic |
| **Vercel** | Unlimited | 100GB bandwidth | ❌ No | Frontend only |
| **Fly.io** | $5 credit | 3 shared VMs | ❌ No | Microservices |

**Recommendation:** Railway for best balance of features and ease of use.

---

## 🐛 TROUBLESHOOTING

### Issue: "500 Internal Server Error"

```bash
# Check logs
# Railway: Click service → Logs tab

# Common causes:
# 1. Missing APP_KEY
php artisan key:generate

# 2. Database not connected
# Verify DB_* environment variables

# 3. Storage permissions
chmod -R 775 storage bootstrap/cache
```

### Issue: "CORS Error" in Frontend

```bash
# backend/config/cors.php
'allowed_origins' => [
    env('FRONTEND_URL'),
    'https://your-frontend.vercel.app',
],

# Update .env
FRONTEND_URL=https://your-frontend.vercel.app
```

### Issue: "Route Not Found"

```bash
# Clear and rebuild cache
php artisan config:clear
php artisan route:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache
```

### Issue: Database Connection Failed

```bash
# Railway: Verify MySQL service is running
# Check environment variables match MySQL credentials

# Test connection
php artisan tinker
>>> DB::connection()->getPdo();
```

### Issue: "Sleep Mode Delay" (Render)

**Solutions:**
1. Use Railway instead (no sleep mode)
2. Keep alive with cron: `curl https://your-app.onrender.com` every 10min
3. Upgrade to paid plan ($7/month)

---

## 📊 PERFORMANCE OPTIMIZATION

### 1. Enable Caching

```php
// backend/.env
CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=database
```

### 2. Optimize Images

```bash
# Frontend: Use WebP format
# Compress images before upload
```

### 3. Enable Gzip Compression

```php
// backend/public/.htaccess (if using Apache)
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
```

### 4. CDN for Static Assets (Optional)

Use Cloudflare (free):
1. Point domain to Cloudflare
2. Enable CDN caching
3. Minify CSS/JS automatically

---

## 🔐 PRODUCTION SECURITY CHECKLIST

Before going live:

- [ ] Fix 4 critical vulnerabilities (see `SECURITY_FIX_CHECKLIST.md`)
- [ ] Change all default passwords
- [ ] Set `APP_DEBUG=false`
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set token expiration (24 hours)
- [ ] Enable HTTPS only
- [ ] Configure proper session security
- [ ] Set up database backups
- [ ] Enable audit logging
- [ ] Review user permissions

---

## 📞 SUPPORT RESOURCES

**Railway:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

**Render:**
- Docs: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com

**Vercel:**
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord
- Status: https://vercel-status.com

---

## 🎯 RECOMMENDED DEPLOYMENT PATH

### For Testing (Your Use Case):

```
1. Fix 4 critical security issues (1-2 days)
   → See SECURITY_FIX_CHECKLIST.md

2. Deploy to Railway.app (30 minutes)
   → Best free option for your Laravel + React stack
   → No sleep mode
   → Free MySQL included

3. Share URL with testers
   → https://your-app.up.railway.app

4. Monitor usage (stay within $5/month free credit)
   → ~500 hours = 20 days of 24/7 uptime
   → Perfect for testing phase

5. Upgrade to paid if needed (after testing)
   → Railway: $5-10/month
   → Or migrate to VPS (DigitalOcean $6/month)
```

### Timeline:
- **Day 1-2:** Fix security issues
- **Day 3:** Deploy to Railway
- **Week 1-4:** Testing phase (free)
- **Month 2+:** Evaluate upgrade needs

---

## 🚀 QUICK START COMMAND

```bash
# 1. Fix critical security issues first!
# Read: SECURITY_FIX_CHECKLIST.md

# 2. Push to GitHub
git init
git add .
git commit -m "Initial deployment"
git remote add origin https://github.com/YOUR_USERNAME/animal-bite-system.git
git push -u origin main

# 3. Deploy to Railway
# Go to railway.app → New Project → Deploy from GitHub

# 4. Add MySQL database
# Railway dashboard → Add Database → MySQL

# 5. Configure environment variables
# Copy from .env.example, update for production

# 6. Access your deployed app!
# https://your-app.up.railway.app
```

---

**Good luck with deployment! 🎉**

**Important:** Fix the 4 critical security vulnerabilities before deploying, even for testing. See `SECURITY_FIX_CHECKLIST.md` for details.

**Estimated Setup Time:** 2-3 hours (including security fixes)  
**Monthly Cost:** $0 (within free tier limits)  
**Recommended Platform:** Railway.app ⭐
