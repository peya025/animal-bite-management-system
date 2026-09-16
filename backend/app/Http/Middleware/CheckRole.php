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
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userDirectRole = $user->role;
        $userAssignedRoles = $user->relationLoaded('roles') ? $user->roles->pluck('slug')->toArray() : $user->roles()->pluck('slug')->toArray();
        $allUserRoles = array_filter(array_unique(array_merge([$userDirectRole], $userAssignedRoles)));

        // Nursing aliases: 'nurse' or 'treatment' match any nursing duty
        if (in_array('nurse', $roles) || in_array('treatment', $roles) || in_array('intake_nurse', $roles) || in_array('follow_up_nurse', $roles)) {
            if ($user->isNursing()) {
                return $next($request);
            }
        }

        // Admin alias
        if (in_array('admin', $roles) && ($user->isAdmin() || in_array('clinic_admin', $allUserRoles))) {
            return $next($request);
        }

        $hasRole = false;
        foreach ($roles as $r) {
            if (in_array($r, $allUserRoles)) {
                $hasRole = true;
                break;
            }
        }

        if (!$hasRole) {
            return response()->json([
                'message' => 'Unauthorized. This action requires ' . implode(' or ', $roles) . ' role.',
            ], 403);
        }

        return $next($request);
    }
}
