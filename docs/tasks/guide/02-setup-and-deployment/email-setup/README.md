# Email Setup Guide

## Overview

The Animal Bite Management System uses email to send staff invitations. When an admin invites a new staff member, they receive an email with a secure link to create their account.

## Choose Your Email Service

### For Development/Testing 🧪
**Use Mailtrap** - Fake SMTP server that captures emails
- ✅ Free forever
- ✅ No real emails sent
- ✅ Perfect for testing
- ✅ 5-minute setup
- 📖 Guide: [MAILTRAP_SETUP.md](./MAILTRAP_SETUP.md)

### For Production 🚀
**Use Gmail** - Real email sending
- ✅ Free (500 emails/day)
- ✅ Professional and reliable
- ✅ Easy to set up
- ⚠️ Requires App Password
- 📖 Guide: [GMAIL_SETUP.md](./GMAIL_SETUP.md)

## Quick Start

### 1. Development Setup (Mailtrap)

```bash
# 1. Sign up at https://mailtrap.io/ (FREE)
# 2. Get your SMTP credentials
# 3. Update backend/.env:

MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username_here
MAIL_PASSWORD=your_password_here
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@animalbitecenter.com"
MAIL_FROM_NAME="Animal Bite Center"

FRONTEND_URL=http://localhost:5173

# 4. Clear cache
cd backend
php artisan config:clear
```

### 2. Production Setup (Gmail)

```bash
# 1. Enable 2FA on Gmail
# 2. Generate App Password at https://myaccount.google.com/apppasswords
# 3. Update backend/.env:

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your_16_char_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="your-email@gmail.com"
MAIL_FROM_NAME="Animal Bite Center"

FRONTEND_URL=https://your-domain.com

# 4. Clear cache
cd backend
php artisan config:clear
```

## Testing Email

### Method 1: Command Line Test
```bash
cd backend
php artisan tinker

Mail::raw('Test email', function($msg) {
    $msg->to('test@example.com')->subject('Test');
});

exit
```

### Method 2: Staff Invitation Test
1. Login as admin (admin@clinic.com / password123)
2. Go to **Users** page
3. Click **"Invite Staff"**
4. Enter email and role
5. Send invitation

**Mailtrap**: Check https://mailtrap.io/
**Gmail**: Check the actual email inbox

## Email Templates

The system includes a professional invitation email template:
- Located at: `backend/resources/views/emails/staff-invitation.blade.php`
- Includes clinic name, role, invitation link
- Responsive design
- Expires in 7 days

## Features

✅ **Staff Invitations** - Admin invites staff via email
✅ **Secure Links** - Unique token per invitation (64 characters)
✅ **Expiration** - Links expire after 7 days
✅ **Email Preview** - Beautiful HTML template
✅ **Auto-Login** - New staff automatically logged in after signup

## How It Works

```
Admin sends invitation
    ↓
Email sent with secure link
    ↓
Staff clicks link → /accept-invitation/{token}
    ↓
Frontend validates token
    ↓
Staff fills in name & password
    ↓
Account created
    ↓
Auto-login to dashboard
```

## Configuration Files

- **Email Config**: `backend/config/mail.php`
- **Environment**: `backend/.env`
- **Mail Template**: `backend/resources/views/emails/staff-invitation.blade.php`
- **Mailable Class**: `backend/app/Mail/StaffInvitationMail.php`
- **Controller**: `backend/app/Http/Controllers/StaffInvitationController.php`

## API Endpoints

```
POST   /api/staff-invitations          # Send invitation (admin only)
GET    /api/staff-invitations          # List invitations (admin only)
GET    /api/staff-invitations/validate/{token}  # Validate token (public)
POST   /api/staff-invitations/accept/{token}    # Accept invitation (public)
DELETE /api/staff-invitations/{id}     # Cancel invitation (admin only)
```

## Frontend Pages

- **Accept Invitation**: `/accept-invitation/:token`
- **User List**: `/users` (shows invitations)
- **Invite Staff**: `/users` → "Invite Staff" button

## Troubleshooting

### Emails not sending
```bash
# Check logs
tail -f backend/storage/logs/laravel.log

# Clear cache
cd backend
php artisan config:clear
php artisan cache:clear
```

### "Connection refused"
- Check MAIL_HOST and MAIL_PORT
- Verify internet connection
- Check firewall settings

### "Authentication failed"
- Gmail: Make sure you're using App Password (not regular password)
- Mailtrap: Verify username/password are correct
- Clear config cache

### Invalid invitation token
- Link may have expired (7 days)
- Token already used
- Check database: `staff_invitations` table

## Migration to Production

When moving from Mailtrap to Gmail:

1. Update .env with Gmail settings
2. Clear config cache
3. Test with a single invitation
4. Monitor for 24 hours
5. Enable for all users

## Support & Docs

- **Mailtrap**: https://mailtrap.io/
- **Gmail Setup**: https://support.google.com/mail
- **Laravel Mail**: https://laravel.com/docs/11.x/mail

---

**Need Help?** Check the detailed guides:
- 📖 [Mailtrap Setup](./MAILTRAP_SETUP.md)
- 📖 [Gmail Setup](./GMAIL_SETUP.md)
