<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class RequestIdMiddleware
{
    /**
     * Handle an incoming request.
     * Attach a unique Request ID to the request, logging context, and outgoing response.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->header('X-Request-ID');

        if (empty($requestId) || !is_string($requestId)) {
            $requestId = (string) Str::uuid();
        }

        // Bind request_id to structured logging context
        Log::shareContext(['request_id' => $requestId]);
        Log::withContext(['request_id' => $requestId]);

        $response = $next($request);

        // Attach X-Request-ID to outgoing response headers
        $response->headers->set('X-Request-ID', $requestId);

        return $response;
    }
}
