<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AnnouncementController extends Controller
{
    public function published()
    {
        return Announcement::where('is_published', true)
            ->where(fn ($q) => $q->whereNull('expires_on')->orWhere('expires_on', '>=', now('Asia/Manila')->toDateString()))
            ->latest()->get()->map(fn ($item) => $this->present($item));
    }

    public function index(Request $request)
    {
        return Announcement::with('author')->where('clinic_id', $request->user()->clinic_id)
            ->latest()->get()->map(fn ($item) => $this->present($item, $request));
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
        abort_unless($announcement->clinic_id === $request->user()->clinic_id && $this->canManage($announcement, $request), 403);
        return $this->save($request, $announcement);
    }

    private function canManage(Announcement $item, Request $request): bool
    {
        return $item->user_id === $request->user()->id || $request->user()->isAdmin() || $request->user()->role === 'developer';
    }

    private function save(Request $request, Announcement $item)
    {
        $data = $request->validate([
            'title' => 'required|string|max:160',
            'message' => 'required|string|max:1500',
            'is_published' => 'required|boolean',
            'is_urgent' => 'required|boolean',
            'expires_on' => 'nullable|date_format:Y-m-d',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120|dimensions:max_width=6000,max_height=6000',
            'remove_image' => 'sometimes|boolean',
        ]);
        unset($data['image'], $data['remove_image']);
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
        return response()->json($this->present($item->load('author'), $request), $item->wasRecentlyCreated ? 201 : 200);
    }

    private function present(Announcement $item, ?Request $request = null): array
    {
        $data = $item->only(['id', 'title', 'message', 'is_urgent', 'expires_on', 'created_at']);
        $data['image_url'] = $item->image_path ? url('/api/storage/'.$item->image_path) : null;
        if ($request) {
            $data['is_published'] = $item->is_published;
            $data['author_name'] = $item->author?->name ?? 'Former staff member';
            $data['can_manage'] = $this->canManage($item, $request);
        }
        return $data;
    }
}
