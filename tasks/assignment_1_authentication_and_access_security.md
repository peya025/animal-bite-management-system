# Assignment 1 — Authentication & Access Security

**System:** Animal Bite Management System  
**Branch:** `security-fix/auth-and-access`  
**Audit source:** `tasks/pre_deployment_system_change_audit.md`  
**Priority items:** P0-1 · P0-2 · P0-3 · P0-4 (+ supporting P1-2, P1-3)  
**Estimated complexity:** High — involves backend routes, middleware, config, and frontend changes  

---

## Objective

Lock down the publicly accessible entry points of the application so that an attacker who discovers the demo URL **cannot create privileged accounts, steal tokens from URLs, use tokens indefinitely, or brute-force credentials**. This assignment also removes the developer-tools route group and tightens CORS/security-header configuration for internet deployment.

All work must be done on a dedicated `security-fix/auth-and-access` branch. **Do not push directly to `main`.**

---

## Scope

| Area | Files/Concepts |
|---|---|
| Public registration route | `backend/routes/api.php`, `AuthController::register()` |
| Print token-in-URL auth | `PrintController::enrolment()`, frontend print trigger |
| Sanctum token expiry | `backend/config/sanctum.php`, token revocation |
| Rate limiting | `backend/routes/api.php`, `RouteServiceProvider`, or `bootstrap/app.php` |
| Developer routes | `backend/routes/api.php` developer route group |
| CORS configuration | `backend/config/cors.php`, `.env.example` |
| Security headers | Render/nginx config or Laravel middleware |
| Frontend print flow | `frontend/src` — wherever `?token=` is appended to a print URL |

---

## Step-by-Step Tasks

### TASK 1 — Disable public registration in production (P0-1)

**Goal:** An unauthenticated request cannot create a clinic, staff user, or administrator on the deployed API.

1. Open `backend/routes/api.php` and locate the `POST /api/register` route.
2. Wrap it in an environment check or feature flag:

```php
// Only allow registration if explicitly enabled (default: false in production)
if (config('app.public_registration_enabled', false)) {
    Route::post('/register', [AuthController::class, 'register']);
}
```

3. Add the config value in `backend/config/app.php`:

```php
'public_registration_enabled' => env('PUBLIC_REGISTRATION_ENABLED', false),
```

4. Add `PUBLIC_REGISTRATION_ENABLED=false` to `.env.example` with a comment explaining this must stay `false` in all deployed environments.
5. In `AuthController::register()`, add an explicit guard at the top of the method as a defense-in-depth measure:

```php
if (!config('app.public_registration_enabled')) {
    abort(403, 'Public registration is disabled.');
}
```

6. Verify the admin-controlled invitation flow in the existing codebase still works and is the intended path for new staff accounts.
7. Write a PHPUnit feature test in `backend/tests/Feature/Auth/PublicRegistrationTest.php`:
   - `test_registration_is_blocked_when_flag_is_false()` — POST to `/api/register`, expect 403 or 404.
   - `test_admin_invite_flow_still_works()` — Confirm the admin invitation route remains functional.

---

### TASK 2 — Remove token-in-URL authentication from the print route (P0-2)

**Goal:** A URL containing a `?token=` query parameter cannot authenticate a request.

1. Open `backend/app/Http/Controllers/PrintController.php`, find `enrolment()` (or whichever method calls `PersonalAccessToken::findToken()`), and **delete the `?token=` authentication path entirely**.
2. Add `auth:sanctum` middleware to the print route in `api.php` instead:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/print/patient/{id}/enrolment', [PrintController::class, 'enrolment']);
});
```

3. Search the entire `frontend/src` directory for any code that builds a print URL with `?token=`. Change it to an authenticated blob approach:

```ts
const response = await apiClient.get(`/print/patient/${id}/enrolment`, {
  responseType: 'blob',
});
const url = URL.createObjectURL(response.data);
window.open(url, '_blank');
```

4. After deploying this fix, revoke **all existing demo tokens** via `php artisan tinker`:

```php
\Laravel\Sanctum\PersonalAccessToken::truncate();
```

5. Write PHPUnit tests in `backend/tests/Feature/Print/PrintAuthTest.php`:
   - `test_print_route_rejects_token_in_query_string()` — GET `/api/print/patient/1/enrolment?token=abc`, expect 401.
   - `test_print_route_works_with_authorization_header()` — Pass a valid bearer token in the header, expect 200.

---

### TASK 3 — Enforce server-side Sanctum token expiry (P0-3)

**Goal:** An expired or revoked token cannot call any protected endpoint.

1. Open `backend/config/sanctum.php`. Change:

```php
'expiration' => null,
```

to:

```php
// Tokens expire after 24 hours (1440 minutes). Adjust for production needs.
'expiration' => env('SANCTUM_TOKEN_EXPIRY_MINUTES', 1440),
```

2. Add `SANCTUM_TOKEN_EXPIRY_MINUTES=1440` to `.env.example`.
3. In the scheduler, add a prune command. In `routes/console.php` or equivalent:

```php
Schedule::command('sanctum:prune-expired --hours=24')->daily();
```

4. Add token revocation in two places:
   - When admin **disables** a staff account: `$user->tokens()->delete();`
   - When a user **changes password**: `$user->tokens()->where('id', '!=', $currentToken->id)->delete();`
5. Write PHPUnit tests in `backend/tests/Feature/Auth/TokenExpiryTest.php`:
   - `test_expired_token_cannot_access_protected_route()` — Use `$this->travel(25)->hours()`, call `/api/me`, expect 401.
   - `test_revoked_token_returns_401()` — Create a token, delete it, call `/api/me`, expect 401.

---

### TASK 4 — Add rate limiting to login and public auth endpoints (P0-4)

**Goal:** Repeated failed attempts receive HTTP 429. Legitimate users can still log in after the cooldown.

1. In `backend/routes/api.php`, add the `throttle:login` middleware to all public auth routes:

```php
Route::middleware('throttle:login')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/patient-login', [AuthController::class, 'patientLogin']);
    Route::post('/password/reset', [ForgotPasswordController::class, 'reset']);
    Route::post('/invite/activate', [InviteController::class, 'activate']);
});
```

2. Define the `login` rate limiter in `bootstrap/app.php` or `AppServiceProvider.php`:

```php
RateLimiter::for('login', function (Request $request) {
    return [
        Limit::perMinute(5)->by($request->input('email') . '|' . $request->ip()),
        Limit::perMinute(20)->by($request->ip()),
    ];
});
```

3. In `AuthController::login()`, use a uniform invalid-login response — do not reveal whether the email exists:

```php
return response()->json(['message' => 'Invalid credentials.'], 401);
```

4. Write PHPUnit tests in `backend/tests/Feature/Auth/RateLimitTest.php`:
   - `test_login_throttled_after_five_failures()` — 6th POST must return 429.
   - `test_valid_login_succeeds_after_cooldown()` — After cooldown, correct credentials return 200.
   - `test_login_does_not_reveal_email_existence()` — Both "no such email" and "wrong password" return the same 401 body.

---

### TASK 5 — Remove developer routes and tools from deployed build (P1-2)

**Goal:** No developer introspection or repair endpoints are reachable on the deployed instance.

1. In `backend/routes/api.php`, wrap the developer route group in an environment check:

```php
if (app()->environment('local', 'testing')) {
    Route::middleware(['auth:sanctum', 'role:developer'])->prefix('developer')->group(function () {
        // existing developer routes
    });
}
```

2. Add `DEVELOPER_TOOLS_ENABLED=false` to `.env.example`.
3. Document that no `developer` role account should be seeded in the demo database.
4. Write a test: `test_developer_routes_are_not_accessible_in_production()` — expect 404 in non-local environments.

---

### TASK 6 — Tighten CORS and add HTTP security headers (P1-3)

**Goal:** Only the exact deployed HTTPS origin is allowed. Localhost origins are removed from production config.

1. Open `backend/config/cors.php`. Set:

```php
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
'allowed_origins_patterns' => [],
```

2. Create `backend/app/Http/Middleware/SecurityHeaders.php`:

```php
public function handle(Request $request, Closure $next): Response
{
    $response = $next($request);
    $response->headers->set('X-Content-Type-Options', 'nosniff');
    $response->headers->set('X-Frame-Options', 'DENY');
    $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
    $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    return $response;
}
```

3. Register the middleware globally in `bootstrap/app.php`.
4. After deployment, verify with `curl -I https://your-deployed-api.com/api/health`.

---

## Verification Plan

### Automated (run before PR merge)

```bash
cd backend
php artisan test --filter=PublicRegistrationTest
php artisan test --filter=PrintAuthTest
php artisan test --filter=TokenExpiryTest
php artisan test --filter=RateLimitTest
php artisan test   # Full suite — 0 failures required
```

### Manual (run on deployed URL)

| Check | Action | Expected Result |
|---|---|---|
| Public registration blocked | `curl -X POST https://API/api/register -d '{...}'` | 403 or 404 |
| URL-token print blocked | `curl https://API/api/print/patient/1/enrolment?token=abc` | 401 |
| Token expiry working | Wait >24h then call `/api/me` with old token | 401 |
| Rate limiter active | 6× rapid POST to `/api/login` | 6th = 429 |
| CORS origin restricted | Send request from unauthorized origin | Blocked |
| Developer routes hidden | GET `/api/developer/anything` | 404 |
| Security headers present | `curl -I https://API/` | `X-Content-Type-Options: nosniff` |

---

## Success Criteria

- [ ] `POST /api/register` returns 403/404 when `PUBLIC_REGISTRATION_ENABLED=false`
- [ ] `GET /api/print/...?token=abc` returns 401
- [ ] Sanctum expiry is set to = 1440 minutes in config
- [ ] `/api/login` returns 429 after 5 rapid failed attempts
- [ ] All developer routes return 404 in non-local environments
- [ ] `config/cors.php` has no `localhost` when `FRONTEND_URL` is a production domain
- [ ] All new PHPUnit tests pass
- [ ] `php artisan test` exits with 0 failures
