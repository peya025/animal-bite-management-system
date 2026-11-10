<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;

class EnsureStaffAccount
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless($request->user() instanceof User, 403, 'Staff access required.');
        return $next($request);
    }
}
