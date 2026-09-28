<?php

namespace App\Http\Controllers;

use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\StaffSignatureService;
use Illuminate\Http\Request;

class StaffSignatureController extends Controller
{
    public function current(Request $request, StaffSignatureService $signatures)
    {
        $path = $request->user()->fresh()->signature_path;

        return response()->json(['signature_path' => $signatures->available($path) ? $path : null])
            ->header('Cache-Control', 'private, no-store');
    }

    public function profile(Request $request, StaffSignatureService $signatures, int $id)
    {
        $user = User::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);
        abort_unless($request->user()->isAdmin() || $request->user()->id === $user->id, 403);
        // A preview version must still be current; prevent consenting to a stale image.
        if ($request->filled('version')) {
            abort_unless($request->query('version') === $user->signature_path, 409, 'Signature changed. Refresh the preview.');
        }

        return $signatures->response($user->signature_path);
    }

    public function record(Request $request, StaffSignatureService $signatures, int $id)
    {
        $record = TreatmentRecord::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);

        return $signatures->response($record->signature);
    }
}
