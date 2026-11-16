<?php

use App\Http\Middleware\CheckRole;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsurePatientAccount;
use App\Http\Middleware\EnsurePublicSetupIsAvailable;
use App\Http\Middleware\RequestIdMiddleware;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        __DIR__.'/../app/Console/Commands',
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        // Apply Request ID, CORS, and Security Headers globally
        $middleware->use([
            RequestIdMiddleware::class,
            HandleCors::class,
            SecurityHeaders::class,
        ]);

        $middleware->alias([
            'verified' => EnsureEmailIsVerified::class,
            'role' => CheckRole::class,
            'patient.account' => EnsurePatientAccount::class,
            'active.user' => EnsureActiveUser::class,
            'public.setup' => EnsurePublicSetupIsAvailable::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash(['token', 'password', 'password_confirmation', 'current_password']);
        $exceptions->render(function (\Illuminate\Database\QueryException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'The service is temporarily unavailable. Please contact the system administrator.'], 503);
            }
        });
        $exceptions->report(function (\Illuminate\Database\QueryException $e) {
            if (request()->is('api/*invitations*', 'patient-portal/*')) {
                \Illuminate\Support\Facades\Log::error('Invitation database operation failed.', ['sqlstate' => $e->getCode()]);
                return false; // Do not write SQL bindings containing activation credentials.
            }
        });

        // Ensure all API routes render consistent JSON responses
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e): bool {
            return $request->is('api/*') || $request->expectsJson();
        });
    })->create();
