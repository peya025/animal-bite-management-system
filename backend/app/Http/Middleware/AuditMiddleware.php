<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditMiddleware
{
    /**
     * Handle an incoming request and log it
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log authenticated requests
        if ($request->user()) {
            // Determine action based on HTTP method
            $action = match($request->method()) {
                'POST' => 'created',
                'PUT', 'PATCH' => 'updated',
                'DELETE' => 'deleted',
                'GET' => 'viewed',
                default => 'unknown',
            };

            // Skip logging certain routes
            $skipRoutes = [
                '/api/me',
                '/api/test',
                '/api/setup/check-needed',
            ];

            $shouldSkip = false;
            foreach ($skipRoutes as $route) {
                if (str_contains($request->path(), $route)) {
                    $shouldSkip = true;
                    break;
                }
            }

            if (!$shouldSkip && $response->isSuccessful()) {
                AuditLog::log($action, null, null, [
                    'description' => "{$request->method()} {$request->path()}",
                    'metadata' => [
                        'response_status' => $response->getStatusCode(),
                    ],
                ]);
            }
        }

        return $response;
    }
}
