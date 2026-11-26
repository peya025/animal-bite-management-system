<?php

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Services\CommunityAwareness\PublishedAdvisoryFeed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicCommunityAdvisoryController extends Controller
{
    public function index(Request $request, PublishedAdvisoryFeed $feed): JsonResponse
    {
        $validated = $request->validate([
            'clinic_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $clinic = null;
        if (!empty($validated['clinic_id'])) {
            $clinic = Clinic::find($validated['clinic_id']);
        } elseif (Clinic::count() === 1) {
            $clinic = Clinic::first();
        }

        if (!$clinic) {
            return response()->json([
                'status' => 'unavailable',
                'clinic_id' => null,
                'clinic_name' => null,
                'advisories' => [],
                'disclaimer' => PublishedAdvisoryFeed::DISCLAIMER,
                'generated_at' => now()->toIso8601String(),
            ], 200)->header('Cache-Control', 'no-store');
        }

        return response()->json([
            'status' => 'available',
            'clinic_id' => $clinic->id,
            'clinic_name' => $clinic->name,
            'advisories' => $feed->forClinic($clinic->id),
            'disclaimer' => PublishedAdvisoryFeed::DISCLAIMER,
            'generated_at' => now()->toIso8601String(),
        ], 200)->header('Cache-Control', 'no-store');
    }

    public function show(int $advisory, PublishedAdvisoryFeed $feed): JsonResponse
    {
        $result = $feed->findPublicDetail($advisory);

        if ($result['status'] === 'not_found') {
            return response()->json(['message' => 'Advisory not found.'], 404)
                ->header('Cache-Control', 'no-store');
        }

        if ($result['status'] !== 'active') {
            return response()->json([
                'id' => $result['id'],
                'status' => $result['status'],
                'message' => 'This clinic advisory is no longer active. Check current clinic guidance if you need help.',
                'disclaimer' => PublishedAdvisoryFeed::DISCLAIMER,
            ], 410)->header('Cache-Control', 'no-store');
        }

        return response()->json([
            'status' => 'active',
            'advisory' => $result['advisory'],
            'disclaimer' => PublishedAdvisoryFeed::DISCLAIMER,
        ], 200)->header('Cache-Control', 'no-store');
    }
}
