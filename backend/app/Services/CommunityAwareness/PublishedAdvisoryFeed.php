<?php

namespace App\Services\CommunityAwareness;

use App\Models\CommunityAdvisory;
use Carbon\CarbonImmutable;

class PublishedAdvisoryFeed
{
    public const DISCLAIMER = 'Facility-reviewed clinic guidance only. Reports of animal bites do not by themselves confirm rabies infection.';

    public function forClinic(int $clinicId): array
    {
        if (!config('community_awareness.publication_enabled')) {
            return [];
        }
        return CommunityAdvisory::where('clinic_id', $clinicId)
            ->where('state', 'published')->whereNotNull('approved_at')->whereNotNull('published_at')
            ->whereNull('withdrawn_at')->where('expires_on', '>=', now('Asia/Manila')->toDateString())
            ->latest('published_at')->limit(20)->get()
            ->filter(fn ($item) => $this->passesPublicIntegrity($item))
            ->map(fn ($item) => $this->project($item))
            ->values()->all();
    }

    /**
     * Resolve a single advisory for public detail routes.
     * Draft/submitted/approved/scheduled items that have never been published return 'not_found' (404)
     * so internal draft IDs cannot be enumerated.
     */
    public function findPublicDetail(int $id): array
    {
        $item = CommunityAdvisory::find($id);
        if (!$item || $item->published_at === null) {
            return ['status' => 'not_found', 'advisory' => null];
        }
        if ($item->state === 'withdrawn' || $item->withdrawn_at !== null) {
            return ['status' => 'withdrawn', 'id' => $item->id, 'advisory' => null];
        }
        if ($item->expires_on < now('Asia/Manila')->toDateString()) {
            return ['status' => 'expired', 'id' => $item->id, 'advisory' => null];
        }
        if (!config('community_awareness.publication_enabled') || $item->state !== 'published' || !$this->passesPublicIntegrity($item)) {
            return ['status' => 'unavailable', 'id' => $item->id, 'advisory' => null];
        }

        return ['status' => 'active', 'id' => $item->id, 'advisory' => $this->project($item)];
    }

    private function passesPublicIntegrity(CommunityAdvisory $item): bool
    {
        if ($item->approved_by === null || $item->approved_at === null || $item->approved_by === $item->author_id) {
            return false;
        }
        if (!hash_equals($item->approved_hash ?? '', $item->contentHash())) {
            return false;
        }
        if ($item->isOfficial()) {
            return $item->source_verified_at !== null
                && trim((string) $item->source_authority) !== ''
                && trim((string) $item->source_reference) !== ''
                && !empty($item->source_issued_on)
                && trim((string) $item->source_geography_note) !== '';
        }
        return true;
    }

    public function project(CommunityAdvisory $item): array
    {
        $source = null;
        if ($item->isOfficial()) {
            $source = [
                'authority' => $item->source_authority,
                'reference' => $item->source_reference,
                'issued_on' => $item->source_issued_on,
                'geography_note' => $item->source_geography_note,
                'verified_at' => $item->source_verified_at?->toIso8601String(),
            ];
        }

        return [
            'id' => $item->id,
            'revision' => $item->version,
            'advisory_type' => $item->advisory_type ?? 'community_awareness',
            'title' => $item->title,
            'body' => $item->body,
            'scope_label' => 'Clinic community',
            'reviewed_at' => $item->approved_at->toIso8601String(),
            'published_at' => $item->published_at->toIso8601String(),
            'expires_at' => CarbonImmutable::parse($item->expires_on, 'Asia/Manila')->endOfDay()->toIso8601String(),
            'source' => $source,
        ];
    }
}
