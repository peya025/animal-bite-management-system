<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;

use App\Http\Resources\Auth\CurrentStaffSignatureResource;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\StaffSignatureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StaffSignatureController extends Controller
{
    public function __construct(
        protected StaffSignatureService $signatures
    ) {}

    /**
     * Get the active signature path of the currently authenticated staff member.
     */
    public function current(Request $request): JsonResponse
    {
        $path = $request->user()->fresh()->signature_path;
        $resolvedPath = $this->signatures->available($path) ? $path : null;

        return response()->json((new CurrentStaffSignatureResource($resolvedPath))->resolve())
            ->header('Cache-Control', 'private, no-store');
    }

    /**
     * Preview or retrieve the binary PNG signature of a specific staff user.
     */
    public function profile(Request $request, int $id): Response
    {
        $user = User::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);
        abort_unless($request->user()->isAdmin() || $request->user()->id === $user->id, 403);

        // A preview version must still be current; prevent consenting to a stale image.
        if ($request->filled('version')) {
            abort_unless($request->query('version') === $user->signature_path, 409, 'Signature changed. Refresh the preview.');
        }

        return $this->signatures->response($user->signature_path);
    }

    /**
     * Retrieve the binary PNG signature captured at the time of a treatment record administration.
     */
    public function record(Request $request, int $id): Response
    {
        $record = TreatmentRecord::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);

        return $this->signatures->response($record->signature);
    }
}
