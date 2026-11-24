<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Storage;

class AnnouncementController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(static function (Request $request, Closure $next) {
                abort_unless($request->user()?->isAdmin(), 403);

                return $next($request);
            }, except: ['published']),
        ];
    }

    public function published()
    {
        return Announcement::where('is_published', true)
            ->where(fn ($q) => $q->whereNull('expires_on')->orWhere('expires_on', '>=', now('Asia/Manila')->toDateString()))
            ->latest()->get()->map(fn ($item) => $this->present($item));
    }

    public function index(Request $request)
    {
        return Announcement::with('author')->where('clinic_id', $request->user()->clinic_id)
            ->latest()->get()->map(fn ($item) => $this->present($item, forManagement: true));
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->clinic_id, 403);
        return $this->save($request, new Announcement([
            'clinic_id' => $request->user()->clinic_id,
            'user_id' => $request->user()->id,
        ]));
    }

    public function update(Request $request, Announcement $announcement)
    {
        abort_unless($announcement->clinic_id === $request->user()->clinic_id, 403);
        return $this->save($request, $announcement);
    }

    public function destroy(Request $request, Announcement $announcement)
    {
        abort_unless($announcement->clinic_id === $request->user()->clinic_id, 403);
        $imagePath = $announcement->image_path;
        $announcement->delete();
        if ($imagePath) {
            Storage::disk('public')->delete($imagePath);
        }
        return response()->noContent();
    }

    private function save(Request $request, Announcement $item)
    {
        $data = $request->validate([
            'title' => 'required|string|max:160',
            'message' => 'required|string|max:1500',
            'is_published' => 'required|boolean',
            'is_urgent' => 'required|boolean',
            'target_barangay' => 'nullable|string|max:120',
            'expires_on' => 'nullable|date_format:Y-m-d',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120|dimensions:max_width=6000,max_height=6000',
            'remove_image' => 'sometimes|boolean',
        ]);
        unset($data['image'], $data['remove_image']);
        $data['expires_on'] = ($data['expires_on'] ?? '') !== '' ? $data['expires_on'] : null;
        $data['target_barangay'] = isset($data['target_barangay']) && trim((string) $data['target_barangay']) !== ''
            ? trim((string) $data['target_barangay'])
            : null;
        $oldPath = $item->image_path;
        $newPath = $request->hasFile('image') ? $request->file('image')->store('announcements', 'public') : null;
        if ($newPath || $request->boolean('remove_image')) {
            $data['image_path'] = $newPath;
        }
        try {
            $item->fill($data)->save();
        } catch (\Throwable $e) {
            if ($newPath) Storage::disk('public')->delete($newPath);
            throw $e;
        }
        if ($oldPath && $oldPath !== $item->image_path) Storage::disk('public')->delete($oldPath);

        if ($item->is_published && ($item->wasRecentlyCreated || $item->wasChanged('is_published'))) {
            $fcmService = app(\App\Services\Messaging\FcmService::class);
            \App\Models\PatientAccount::where('is_active', true)
                ->whereHas('patients', fn ($q) => $q->where('clinic_id', $item->clinic_id))
                ->limit(50)
                ->get()
                ->each(function ($acc) use ($item, $fcmService) {
                    if ($fcmService->isAccountAllowed($acc->id)) {
                        \App\Jobs\SendFcmPushNotification::dispatch(
                            patientAccountId: (int) $acc->id,
                            title: 'Clinic Announcement',
                            body: 'A new clinic announcement has been posted. Open the app to view details.',
                            data: [
                                'category'        => 'announcement',
                                'route'           => '/notifications',
                                'announcement_id' => (string) $item->id,
                            ]
                        );
                    }
                });
        }

        return response()->json($this->present($item->load('author'), forManagement: true), $item->wasRecentlyCreated ? 201 : 200);
    }

    private function present(Announcement $item, bool $forManagement = false): array
    {
        $data = $item->only(['id', 'title', 'message', 'is_urgent', 'target_barangay', 'expires_on', 'created_at']);
        $data['image_url'] = $item->image_path ? url('/api/storage/'.$item->image_path) : null;
        if ($forManagement) {
            $data['is_published'] = $item->is_published;
            $data['author_name'] = $item->author?->name ?? 'Former staff member';
            $data['can_manage'] = true;
        }
        return $data;
    }
}
