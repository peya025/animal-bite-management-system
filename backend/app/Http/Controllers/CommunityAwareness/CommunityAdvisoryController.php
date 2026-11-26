<?php

namespace App\Http\Controllers\CommunityAwareness;

use App\Http\Controllers\Controller;
use App\Models\CommunityAdvisory;
use App\Services\CommunityAwareness\AdvisoryWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CommunityAdvisoryController extends Controller
{
    public function index(Request $request, AdvisoryWorkflowService $workflow)
    {
        $workflow->authorize($request->user());
        return CommunityAdvisory::where('clinic_id', $request->user()->clinic_id)->latest('id')->paginate(20);
    }

    public function store(Request $request, AdvisoryWorkflowService $workflow)
    {
        $workflow->authorize($request->user());
        return response()->json($workflow->create($request->user(), $this->content($request)), 201);
    }

    public function history(Request $request, int $advisory, AdvisoryWorkflowService $workflow)
    {
        $workflow->authorize($request->user());
        CommunityAdvisory::where('clinic_id', $request->user()->clinic_id)->findOrFail($advisory);
        return DB::table('community_advisory_events')->where('advisory_id', $advisory)->orderByDesc('version')->paginate(20);
    }

    public function transition(Request $request, int $advisory, string $action, AdvisoryWorkflowService $workflow)
    {
        $workflow->authorize($request->user());
        $data = $request->validate([
            'version' => 'required|integer|min:1',
            'reason' => [Rule::requiredIf(in_array($action, ['return', 'withdraw'], true)), 'nullable', 'string', 'max:1000'],
            'review_confirmed' => $action === 'approve' ? ['required', 'accepted'] : ['prohibited'],
            'source_verified' => $action === 'approve' ? ['sometimes', 'boolean'] : ['prohibited'],
            'scheduled_for' => $action === 'schedule' ? ['required', 'date'] : ['prohibited'],
        ]);
        return $workflow->transition(
            $request->user(),
            $advisory,
            $data['version'],
            $action,
            $action === 'edit' ? $this->content($request) : [],
            $data['reason'] ?? null,
            $data['scheduled_for'] ?? null,
            (bool) ($data['source_verified'] ?? false)
        );
    }

    private function content(Request $request): array
    {
        $type = $request->input('advisory_type', 'community_awareness');
        $isOfficial = $type === 'official_health_advisory';
        $today = now('Asia/Manila')->toDateString();

        return $request->validate([
            'advisory_type' => ['sometimes', Rule::in(CommunityAdvisory::TYPES)],
            'title' => ['required', 'string', 'max:160', 'not_regex:/[<>]/'],
            'body' => ['required', 'string', 'max:1500', 'not_regex:/[<>]/'],
            'expires_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:' . $today, 'before_or_equal:' . now('Asia/Manila')->addDays(30)->toDateString()],
            'source_authority' => $isOfficial
                ? ['required', 'string', 'max:160', 'not_regex:/[<>]/']
                : ['nullable', 'prohibited'],
            'source_reference' => $isOfficial
                ? ['required', 'string', 'max:500', 'not_regex:/[<>]/', 'not_regex:/^\s*(javascript|data|vbscript|http):/i']
                : ['nullable', 'prohibited'],
            'source_issued_on' => $isOfficial
                ? ['required', 'date_format:Y-m-d', 'before_or_equal:' . $today]
                : ['nullable', 'prohibited'],
            'source_geography_note' => $isOfficial
                ? ['required', 'string', 'max:200', 'not_regex:/[<>]/']
                : ['nullable', 'prohibited'],
        ]);
    }
}
