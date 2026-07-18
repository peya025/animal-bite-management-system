<?php

namespace App\Http\Middleware;

use App\Models\PatientAccount;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePatientAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() instanceof PatientAccount) {
            return response()->json(['message' => 'Patient account authentication is required.'], 403);
        }

        return $next($request);
    }
}
