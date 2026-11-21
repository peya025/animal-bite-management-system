# Mailtrap Email Setup Guide (Development/Testing)

## What is Mailtrap?

Mailtrap is a **fake SMTP server** for development and testing. It captures all outgoing emails so you can test email functionality without sending real emails to users.

**Perfect for:**
- Development environment
- Testing email templates
- QA testing
- Demo presentations

## Step 1: Create Mailtrap Account

1. Go to https://mailtrap.io/
2. Click **"Sign Up"** (it's FREE!)
3. Sign up with:
   - Email address
   - OR GitHub account
   - OR Google account

## Step 2: Get Your SMTP Credentials

1. After signing in, you'll see your **Inbox**
2. Click on your inbox (usually named "My Inbox")
3. Click the **"SMTP Settings"** tab
4. Select **"Laravel 9+"** from the dropdown
5. You'll see credentials like:

```
Host: sandbox.smtp.mailtrap.io
Port: 2525
Username: 1a2b3c4d5e6f7g
Password: 1a2b3c4d5e6f7g
```

## Step 3: Update Your .env File

Open `backend/.env` and update these lines:

```env
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username_here
MAIL_PASSWORD=your_mailtrap_password_here
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@animalbitecenter.com"
MAIL_FROM_NAME="Animal Bite Center"

FRONTEND_URL=http://localhost:5173
```

**Replace:**
- `your_mailtrap_username_here` with your actual username
- `your_mailtrap_password_here` with your actual password

## Step 4: Clear Config Cache

```bash
cd backend
php artisan config:clear
php artisan cache:clear
```

## Step 5: Test Email Sending

### Option A: Test via Tinker (Command Line)
```bash
cd backend
php artisan tinker

# Inside tinker:
Mail::raw('Test email from Animal Bite Center', function($msg) {
    $msg->to('test@example.com')->subject('Test Email');
});

# Press Ctrl+C to exit tinker
```

### Option B: Test via Staff Invitation (Frontend)
1. Log in as Admin (admin@clinic.com / password123)
2. Go to **Users** page
3. Click **"Invite Staff"**
4. Fill in:
   - Email: any-email@example.com
   - Role: Registration Staff
5. Click **"Send Invitation"**

## Step 6: Check Email in Mailtrap

1. Go back to https://mailtrap.io/
2. Click on your inbox
3. You should see the email!
4. Click on it to view the HTML/text version

## Features You Can Test

✅ **Email Preview** - See exactly how emails look
✅ **HTML Check** - View HTML source
✅ **Spam Score** - Check if email looks spammy
✅ **Validation** - Check HTML validity
✅ **No Real Emails** - Nothing goes to real inboxes

## Troubleshooting

### Error: "Connection refused"
- Check if MAIL_HOST is `sandbox.smtp.mailtrap.io`
- Check if MAIL_PORT is `2525`
- Check your internet connection

### Error: "Authentication failed"
- Double-check your username/password
- Make sure there are no extra spaces
- Try regenerating credentials in Mailtrap

### Email not appearing in Mailtrap
- Check the correct inbox (you might have multiple)
- Wait a few seconds and refresh
- Check Laravel logs: `backend/storage/logs/laravel.log`

### Config not updating
```bash
cd backend
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

## Mailtrap Inbox Features

1. **Email Preview** - See how it renders
2. **HTML/Text Tabs** - View both versions
3. **Raw** - See raw email source
4. **Spam Analysis** - Check spam score
5. **Forward to Email** - Test on real email client

## Switching to Production (Gmail)

When ready for production, see: `guide/email-setup/GMAIL_SETUP.md`

---

**Status**: ✅ Perfect for development and testing
**Cost**: FREE (up to 500 emails/month)
**Setup Time**: 5 minutes
