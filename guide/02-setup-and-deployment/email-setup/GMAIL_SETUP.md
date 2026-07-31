# Gmail Email Setup Guide (Production)

## ⚠️ Important Security Note

Gmail requires **App Passwords** for applications. NEVER use your regular Gmail password in .env files!

## Prerequisites

- Gmail account
- 2-Factor Authentication enabled

## Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Scroll to **"How you sign in to Google"**
3. Click **"2-Step Verification"**
4. Follow the setup wizard to enable it
5. **This is required** - you cannot create App Passwords without 2FA

## Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. You'll see **"App passwords"** section
3. Click **"Select app"** dropdown
   - Choose **"Mail"**
4. Click **"Select device"** dropdown
   - Choose **"Other (Custom name)"**
   - Type: **"Animal Bite Center"**
5. Click **"Generate"**
6. Google will show you a 16-character password like: `abcd efgh ijkl mnop`
7. **COPY THIS PASSWORD** - you'll only see it once!

## Step 3: Update Your .env File

Open `backend/.env` and update these lines:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=abcdefghijklmnop
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="your-email@gmail.com"
MAIL_FROM_NAME="Animal Bite Center"

FRONTEND_URL=https://your-production-domain.com
```

**Replace:**
- `your-email@gmail.com` with your actual Gmail address
- `abcdefghijklmnop` with your 16-character App Password (remove spaces!)
- `https://your-production-domain.com` with your actual domain

**⚠️ Security Tips:**
- Remove all spaces from the App Password
- Never commit .env to git
- Keep .env file secure (owner-only read permissions)
- Use environment variables on production servers

## Step 4: Clear Config Cache

```bash
cd backend
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

## Step 5: Test Email Sending

### Test via Tinker
```bash
cd backend
php artisan tinker

# Inside tinker:
Mail::raw('Production test from Animal Bite Center', function($msg) {
    $msg->to('your-test-email@gmail.com')->subject('Production Test');
});

# Exit tinker
exit
```

**Check your email inbox** - you should receive the test email!

### Test via Staff Invitation
1. Log in as Admin
2. Go to **Users** → **Invite Staff**
3. Enter a real email address
4. Send invitation
5. Check that email inbox

## Gmail Sending Limits

**Free Gmail Account:**
- 500 emails per day
- 100 recipients per email

**Google Workspace (Paid):**
- 2,000 emails per day
- 100 recipients per email

## Troubleshooting

### Error: "Username and Password not accepted"
1. Make sure 2FA is enabled
2. Regenerate App Password
3. Copy it exactly (no spaces!)
4. Clear Laravel config cache

### Error: "Could not authenticate"
1. Check MAIL_USERNAME is your full email
2. Check MAIL_PASSWORD is the App Password (not your regular password)
3. Remove any spaces from the password

### Emails going to Spam
Add these to improve deliverability:
1. **SPF Record** (add to DNS):
   ```
   v=spf1 include:_spf.google.com ~all
   ```

2. **DKIM** - Enable in Google Workspace Admin

3. **From Address** - Use your actual Gmail address

### Email not sending
```bash
# Check Laravel logs
tail -f backend/storage/logs/laravel.log

# Clear all caches
cd backend
php artisan config:clear
php artisan cache:clear
php artisan view:clear
```

## Alternative: Gmail API (Advanced)

For higher sending limits, consider using Gmail API:
- Higher rate limits
- Better deliverability
- More complex setup
- Requires OAuth 2.0

See: https://developers.google.com/gmail/api

## Production Recommendations

### Option 1: Gmail (Small Clinics)
✅ Good for: <100 emails/day
✅ Cost: FREE
❌ Limited to 500 emails/day

### Option 2: Google Workspace
✅ Good for: <500 emails/day
✅ Cost: ~$6/user/month
✅ Professional email address
✅ 2,000 emails/day

### Option 3: SendGrid (Recommended for Production)
✅ Good for: High volume
✅ Cost: FREE tier (100 emails/day), then paid
✅ 100 emails/day free
✅ Better deliverability
✅ Email analytics

### Option 4: Amazon SES
✅ Good for: Very high volume
✅ Cost: $0.10 per 1,000 emails
✅ Unlimited sending
✅ Requires AWS account

## Security Best Practices

1. **Never commit .env to version control**
   ```bash
   # .gitignore should include:
   .env
   .env.*
   ```

2. **Use environment variables on server**
   ```bash
   # On production server, use:
   export MAIL_PASSWORD="your-app-password"
   ```

3. **Rotate App Passwords periodically**
   - Every 90 days recommended
   - After team member leaves

4. **Monitor sending activity**
   - Check Gmail sent folder
   - Look for unauthorized sending

## Converting from Mailtrap to Gmail

1. Update .env with Gmail settings (above)
2. Clear config cache
3. Test with a single email first
4. Monitor for 24 hours
5. Enable for all users

## Support

- Gmail Help: https://support.google.com/mail
- App Passwords: https://support.google.com/accounts/answer/185833
- Laravel Mail Docs: https://laravel.com/docs/11.x/mail

---

**Status**: ✅ Production-ready
**Cost**: FREE (Gmail) or $6/month (Workspace)
**Limit**: 500-2,000 emails/day
**Setup Time**: 10 minutes
