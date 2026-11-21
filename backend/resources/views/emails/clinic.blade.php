<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f3f6f5;font-family:Arial,Helvetica,sans-serif;color:#243c36;">
<div style="display:none;max-height:0;overflow:hidden;">A message from your clinic.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:white;">
<tr><td style="padding:24px;background:#087f6c;color:white;font-size:20px;">Tagoloan Animal Bite Treatment Center</td></tr>
<tr><td style="padding:24px;line-height:1.6;">
<h1 style="font-size:22px;">{{ $heading }}</h1>
@foreach($lines as $line)<p>{{ $line }}</p>@endforeach
@if($activationCode)<p><strong>Your Activation Code:</strong></p><p style="overflow-wrap:anywhere;word-break:break-all;">{{ $activationCode }}</p>@endif
@if($actionUrl)<p><a href="{{ $actionUrl }}" style="display:inline-block;background:#087f6c;color:white;padding:12px 20px;text-decoration:none;">{{ $actionLabel }}</a></p><p style="word-break:break-all;">{{ $actionUrl }}</p>@endif
</td></tr><tr><td style="padding:20px;border-top:1px solid #dde8e4;font-size:13px;">Tagoloan Animal Bite Treatment Center<br>Please contact the clinic if you need assistance.</td></tr>
</table></td></tr></table></body></html>
