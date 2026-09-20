<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePublicSetupIsAvailable
{
    /**
     * Initial provisioning is useful locally, but must not expose a route that
     * can create the first administrator on a deployed application.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (app()->environment('production') && ! config('app.public_setup_enabled', false)) {
            abort(404);
        }

        return $next($request);
    }
}
