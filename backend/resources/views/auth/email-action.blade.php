<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>Tagoloan ABTC Patient Portal</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f6f5;color:#243c36;margin:0;padding:24px;">
<main style="max-width:460px;margin:auto;background:white;padding:24px;border-top:6px solid #087f6c;">
<h1 style="font-size:24px;">{{ $mode === 'activate' ? 'Activate Patient Portal' : 'Reset password' }}</h1>
@if(session('status'))<p role="status">{{ session('status') }}</p>@else
<p>Enter your registered email, the code from your email, and a new password.</p>
@if($errors->any())<div role="alert">@foreach($errors->all() as $error)<p>{{ $error }}</p>@endforeach</div>@endif
<form method="post" action="{{ url('/patient-portal/'.$mode) }}">@csrf
<label>Email<br><input type="email" name="email" required maxlength="255" autocomplete="email" style="width:95%;padding:10px;margin:8px 0 16px;"></label><br>
<label>Code<br><input id="token" name="token" required minlength="64" maxlength="64" autocomplete="off" style="width:95%;padding:10px;margin:8px 0 16px;"></label><br>
<label>New password<br><input type="password" name="password" required minlength="8" autocomplete="new-password" style="width:95%;padding:10px;margin:8px 0 16px;"></label><br>
<label>Confirm password<br><input type="password" name="password_confirmation" required minlength="8" autocomplete="new-password" style="width:95%;padding:10px;margin:8px 0 16px;"></label><br>
<button style="padding:12px 20px;background:#087f6c;color:white;border:0;" type="submit">{{ $mode === 'activate' ? 'Activate account' : 'Change password' }}</button>
</form>
<script src="{{ asset('js/email-action.js') }}" defer></script>
@endif
<p style="font-size:13px;">Tagoloan Animal Bite Treatment Center</p></main></body></html>
