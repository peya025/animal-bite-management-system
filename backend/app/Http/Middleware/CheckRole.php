<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (! $request->user()->is_active) {
            $request->user()->tokens()->delete();

            return response()->json([
                'message' => 'This account is inactive. Contact your clinic administrator.',
            ], 403);
        }

        if (!in_array($request->user()->role, $roles, true)) {
            return response()->json([
                'message' => 'Unauthorized. This action requires ' . implode(' or ', $roles) . ' role.',
            ], 403);
        }

        return $next($request);
    }
}
