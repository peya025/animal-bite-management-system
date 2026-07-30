<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Invitation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            background-color: #f3f4f6;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 32px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .content {
            padding: 32px;
        }
        .content p {
            margin: 0 0 16px;
            font-size: 15px;
        }
        .info-box {
            background: #ecfdf5;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        .info-box strong {
            color: #064e3b;
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-box div {
            font-size: 16px;
            font-weight: 600;
            color: #059669;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
            text-align: center;
        }
        .footer {
            background: #f9fafb;
            padding: 24px 32px;
            text-align: center;
            font-size: 13px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
        .footer a {
            color: #10b981;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 You're Invited!</h1>
        </div>
        
        <div class="content">
            <p>Hello!</p>
            
            <p>You've been invited by <strong>{{ $invitation->inviter->name }}</strong> to join <strong>{{ $invitation->clinic->name }}</strong> as a staff member.</p>
            
            <div class="info-box">
                <strong>Your Role:</strong>
                <div>{{ ucfirst($invitation->role) }} Staff</div>
            </div>
            
            <p>Click the button below to accept this invitation and create your account:</p>
            
            <a href="{{ $invitationLink }}" class="button">Accept Invitation</a>
            
            <p style="font-size: 13px; color: #6b7280;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 13px; color: #059669; word-break: break-all;">{{ $invitationLink }}</p>
            
            <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
                <strong>Note:</strong> This invitation will expire on {{ $invitation->expires_at->format('F d, Y \a\t g:i A') }}.
            </p>
        </div>
        
        <div class="footer">
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>&copy; {{ date('Y') }} {{ $invitation->clinic->name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
