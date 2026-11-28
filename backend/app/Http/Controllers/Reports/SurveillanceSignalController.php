<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\BiteIncident;
use App\Models\SurveillanceRun;
use App\Models\SurveillanceSignal;
use App\Services\Surveillance\SurveillanceSignalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class SurveillanceSignalController extends Controller
{
    public function index(Request $request, SurveillanceSignalService $service)
    {
        $filter = $request->validate(['state' => 'nullable|in:new,in_review,verified,dismissed,resolved', 'page' => 'nullable|integer|min:1']);
        $query = SurveillanceSignal::where('clinic_id', $request->user()->clinic_id);
        if (!empty($filter['state'])) { $query->where('state', $filter['state']); }
        $signals = $query->latest('updated_at')->orderByDesc('id')->paginate(20);
        $signals->getCollection()->transform(fn ($item) => $this->present($item));
        $run = SurveillanceRun::where('clinic_id', $request->user()->clinic_id)->latest('id')->first();
        $summary = $run?->summary;
        if ($summary) {
            unset($summary['quality_evidence'], $summary['buckets']);
            $summary['possible_duplicate_groups'] = count($summary['possible_duplicate_groups']);
        }
        return response()->json(['signals' => $signals, 'latest_run' => $run ? ['id' => $run->id, 'cutoff' => $run->cutoff,
            'created_at' => $run->created_at, 'summary' => $summary,
            'stale' => $run->cutoff < now('Asia/Manila')->subDay()->toDateString()] : null,
            'can_review' => $service->canReview($request->user())])->header('Cache-Control', 'no-store');
    }

    public function evaluate(Request $request, SurveillanceSignalService $service)
    {
        abort_unless($service->canReview($request->user()), 403);
        $run = $service->evaluate($request->user()->clinic_id);
        return ['run_id' => $run->id];
    }

    public function review(Request $request, int $signal, SurveillanceSignalService $service)
    {
        $data = $request->validate([
            'version' => 'required|integer|min:1', 'action' => 'required|in:assign,verify,dismiss,reopen',
            'reason' => 'required|string|max:1000',
            'assigned_to' => ['nullable', 'integer'],
        ]);
        return $this->present($service->review($request->user(), $signal, $data));
    }

    public function history(Request $request, int $signal)
    {
        SurveillanceSignal::where('clinic_id', $request->user()->clinic_id)->findOrFail($signal);
        return DB::table('surveillance_signal_events')->where('signal_id', $signal)->orderByDesc('version')
            ->select(['id', 'version', 'action', 'reason', 'actor_id', 'created_at'])->paginate(20);
    }

    public function evidence(Request $request, int $signal)
    {
        $item = SurveillanceSignal::where('clinic_id', $request->user()->clinic_id)->findOrFail($signal);
        $ids = $item->metrics['current_incident_ids'];
        $cases = BiteIncident::where('clinic_id', $request->user()->clinic_id)->whereIn('bite_id', $ids)->with('patient')->orderBy('bite_id')->paginate(20);
        $cases->getCollection()->transform(function ($incident) use ($request) {
            abort_unless($incident->patient && Gate::forUser($request->user())->allows('view', $incident->patient), 403);
            return ['bite_id' => $incident->bite_id, 'bite_date' => $incident->bite_date?->toDateString(),
                'status' => $incident->status, 'record_changed_at' => $incident->updated_at];
        });
        return response()->json(['run_id' => $item->latest_run_id, 'snapshot_count' => count($ids), 'cases' => $cases])
            ->header('Cache-Control', 'no-store');
    }

    private function present(SurveillanceSignal $item): array
    {
        $data = $item->toArray();
        unset($data['metrics']['current_incident_ids'], $data['metrics']['baseline_incident_ids']);
        return $data;
    }
}
