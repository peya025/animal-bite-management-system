<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && ! $user->is_active) {
            $user->tokens()->delete();

            return response()->json([
                'message' => 'This account is inactive. Contact your clinic administrator.',
            ], 403);
        }

        return $next($request);
    }
}
