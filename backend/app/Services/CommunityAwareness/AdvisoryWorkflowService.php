<?php

namespace App\Services\CommunityAwareness;

use App\Models\CommunityAdvisory;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdvisoryWorkflowService
{
    private function isReviewer(User $user): bool
    {
        return $user->role !== 'developer' && ($user->role === 'doctor' || $user->roles()->where('slug', 'doctor')->exists());
    }

    public function authorize(User $user): void
    {
        abort_unless($user->is_active && $user->clinic_id && ($user->role === 'admin' || $this->isReviewer($user)), 403);
    }

    public function create(User $user, array $content): CommunityAdvisory
    {
        $this->authorize($user);
        $normalized = $this->normalizeContent($content);
        return DB::transaction(function () use ($user, $normalized) {
            $advisory = CommunityAdvisory::create($normalized + ['clinic_id' => $user->clinic_id, 'author_id' => $user->id]);
            $this->record($advisory->refresh(), $user, 'create', null);
            return $advisory;
        });
    }

    public function transition(
        User $user,
        int $id,
        int $version,
        string $action,
        array $content = [],
        ?string $reason = null,
        ?string $scheduledFor = null,
        bool $sourceVerified = false
    ): CommunityAdvisory {
        $this->authorize($user);
        return DB::transaction(function () use ($user, $id, $version, $action, $content, $reason, $scheduledFor, $sourceVerified) {
            $item = CommunityAdvisory::where('clinic_id', $user->clinic_id)->lockForUpdate()->findOrFail($id);
            abort_unless($item->version === $version, 409, 'This advisory changed. Refresh before continuing.');
            $allowedStates = match ($action) {
                'edit', 'submit' => ['draft'],
                'approve', 'return' => ['submitted'],
                'publish', 'schedule' => ['approved'],
                'withdraw' => ['scheduled', 'published'],
                default => [],
            };
            abort_unless(in_array($item->state, $allowedStates, true), 409, 'This action is not available in the current state.');
            if (in_array($action, ['approve', 'return'], true)) {
                abort_unless($this->isReviewer($user) && $user->id !== $item->author_id, 403, 'An independent doctor must review this advisory.');
            }
            if ($action === 'edit') {
                abort_unless($user->id === $item->author_id, 403);
                $item->fill($this->normalizeContent($content));
            }
            if (in_array($action, ['submit', 'approve', 'publish', 'schedule'], true)) {
                if ($item->expires_on < now('Asia/Manila')->toDateString()) {
                    throw ValidationException::withMessages(['expires_on' => 'Choose a future validity period before submitting.']);
                }
                $this->assertOfficialSourceComplete($item);
            }
            if ($action === 'approve') {
                if ($item->isOfficial()) {
                    if (!$sourceVerified) {
                        throw ValidationException::withMessages(['source_verified' => 'Official health advisories require explicit source verification before approval.']);
                    }
                    $item->source_verified_by = $user->id;
                    $item->source_verified_at = now();
                } else {
                    $item->source_verified_by = null;
                    $item->source_verified_at = null;
                }
                $item->approved_by = $user->id;
                $item->approved_at = now();
                $item->approved_hash = $item->contentHash();
            }
            if (in_array($action, ['publish', 'schedule'], true)) {
                abort_unless(config('community_awareness.publication_enabled'), 409, 'Community publication is disabled until release verification is complete.');
                abort_unless($user->role === 'admin', 403);
                abort_unless($this->hasValidApproval($item), 409, 'Valid independent approval is required.');
            }
            if ($action === 'publish') {
                $item->scheduled_for = null;
                $item->scheduled_by = null;
                $item->published_at = now();
            }
            if ($action === 'schedule') {
                $target = CarbonImmutable::parse((string) $scheduledFor, 'Asia/Manila');
                $nowManila = CarbonImmutable::now('Asia/Manila');
                if ($target->lessThanOrEqualTo($nowManila)) {
                    throw ValidationException::withMessages(['scheduled_for' => 'Scheduled publication time must be in the future.']);
                }
                if ($target->toDateString() > $item->expires_on) {
                    throw ValidationException::withMessages(['scheduled_for' => 'Scheduled publication time must be on or before the expiry date.']);
                }
                $item->scheduled_for = $target->utc();
                $item->scheduled_by = $user->id;
            }
            if (in_array($action, ['edit', 'return'], true)) {
                $item->approved_by = $item->approved_at = $item->approved_hash = null;
                $item->source_verified_by = $item->source_verified_at = null;
                $item->scheduled_for = $item->scheduled_by = null;
            }
            if ($action === 'withdraw') {
                $item->withdrawn_at = now();
            }
            $item->state = match ($action) {
                'edit', 'return' => 'draft',
                'submit' => 'submitted',
                'approve' => 'approved',
                'schedule' => 'scheduled',
                'publish' => 'published',
                'withdraw' => 'withdrawn',
            };
            $item->version++;
            $item->save();
            $this->record($item, $user, $action, $reason);

            if ($action === 'withdraw') {
                app(AdvisoryDeliveryService::class)->cancelPendingForAdvisory($item->id, 'advisory_withdrawn');
            }
            if ($action === 'publish' && config('community_awareness.push_enabled')) {
                $advisoryId = $item->id;
                DB::afterCommit(function () use ($advisoryId) {
                    $published = CommunityAdvisory::find($advisoryId);
                    if ($published) {
                        app(AdvisoryDeliveryService::class)->enqueueForAdvisory($published);
                    }
                });
            }

            return $item;
        });
    }

    /**
     * Publish due scheduled advisories after revalidating publication flag, approval integrity,
     * reviewer/publisher permissions, official-source metadata, and validity dates.
     */
    public function publishDueScheduled(): array
    {
        $summary = ['published' => 0, 'cancelled' => 0, 'skipped' => 0];
        if (!config('community_awareness.publication_enabled')) {
            return $summary;
        }

        $ids = CommunityAdvisory::where('state', 'scheduled')
            ->whereNotNull('scheduled_for')
            ->where('scheduled_for', '<=', now())
            ->orderBy('scheduled_for')
            ->limit(100)
            ->pluck('id');

        foreach ($ids as $id) {
            DB::transaction(function () use ($id, &$summary) {
                $item = CommunityAdvisory::lockForUpdate()->find($id);
                if (!$item || $item->state !== 'scheduled' || !$item->scheduled_for || $item->scheduled_for->isFuture()) {
                    $summary['skipped']++;
                    return;
                }
                if (!config('community_awareness.publication_enabled')) {
                    $summary['skipped']++;
                    return;
                }

                $publisher = $item->scheduled_by ? User::find($item->scheduled_by) : null;
                $publisherValid = $publisher && $publisher->is_active && $publisher->role === 'admin' && $publisher->clinic_id === $item->clinic_id;
                $notExpired = $item->expires_on >= now('Asia/Manila')->toDateString();
                $approvalValid = $this->hasValidApproval($item);

                if (!$publisherValid || !$notExpired || !$approvalValid) {
                    $reason = !$notExpired
                        ? 'Scheduled publication cancelled: advisory expired before publication.'
                        : (!$publisherValid
                            ? 'Scheduled publication cancelled: scheduling admin is no longer authorized.'
                            : 'Scheduled publication cancelled: approval, reviewer, or content integrity check failed.');
                    $item->state = 'withdrawn';
                    $item->withdrawn_at = now();
                    $item->version++;
                    $item->save();
                    $actorId = $item->scheduled_by ?? $item->approved_by ?? $item->author_id;
                    $this->recordById($item, $actorId, 'schedule_cancelled', $reason);
                    $summary['cancelled']++;
                    return;
                }

                $item->state = 'published';
                $item->published_at = now();
                $item->version++;
                $item->save();
                $this->record($item, $publisher, 'publish_scheduled', null);
                if (config('community_awareness.push_enabled')) {
                    $advisoryId = $item->id;
                    DB::afterCommit(function () use ($advisoryId) {
                        $published = CommunityAdvisory::find($advisoryId);
                        if ($published) {
                            app(AdvisoryDeliveryService::class)->enqueueForAdvisory($published);
                        }
                    });
                }
                $summary['published']++;
            });
        }

        return $summary;
    }

    private function normalizeContent(array $content): array
    {
        $type = $content['advisory_type'] ?? 'community_awareness';
        $normalized = [
            'advisory_type' => $type,
            'title' => $content['title'],
            'body' => $content['body'],
            'expires_on' => $content['expires_on'],
        ];
        if ($type === 'official_health_advisory') {
            $normalized['source_authority'] = trim((string) ($content['source_authority'] ?? ''));
            $normalized['source_reference'] = trim((string) ($content['source_reference'] ?? ''));
            $normalized['source_issued_on'] = $content['source_issued_on'] ?? null;
            $normalized['source_geography_note'] = trim((string) ($content['source_geography_note'] ?? ''));
        } else {
            $normalized['source_authority'] = null;
            $normalized['source_reference'] = null;
            $normalized['source_issued_on'] = null;
            $normalized['source_geography_note'] = null;
        }
        return $normalized;
    }

    private function assertOfficialSourceComplete(CommunityAdvisory $item): void
    {
        if (!$item->isOfficial()) {
            return;
        }
        $missing = [];
        if (trim((string) $item->source_authority) === '') {
            $missing['source_authority'] = 'Official authority name is required.';
        }
        if (trim((string) $item->source_reference) === '') {
            $missing['source_reference'] = 'Official reference or HTTPS URL is required.';
        }
        if (empty($item->source_issued_on)) {
            $missing['source_issued_on'] = 'Official issue date is required.';
        }
        if (trim((string) $item->source_geography_note) === '') {
            $missing['source_geography_note'] = 'Geographical relevance note is required.';
        }
        if ($missing !== []) {
            throw ValidationException::withMessages($missing);
        }
    }

    private function hasValidApproval(CommunityAdvisory $item): bool
    {
        $reviewer = $item->approved_by ? User::find($item->approved_by) : null;
        if (!$reviewer || !$reviewer->is_active || !$this->isReviewer($reviewer)
            || $reviewer->clinic_id !== $item->clinic_id || $reviewer->id === $item->author_id
            || !hash_equals($item->approved_hash ?? '', $item->contentHash())) {
            return false;
        }
        if ($item->isOfficial()) {
            if (!$item->source_verified_by || !$item->source_verified_at
                || trim((string) $item->source_authority) === ''
                || trim((string) $item->source_reference) === ''
                || empty($item->source_issued_on)
                || trim((string) $item->source_geography_note) === '') {
                return false;
            }
        }
        return true;
    }

    private function record(CommunityAdvisory $item, User $user, string $action, ?string $reason): void
    {
        $this->recordById($item, $user->id, $action, $reason);
    }

    private function recordById(CommunityAdvisory $item, int $actorId, string $action, ?string $reason): void
    {
        DB::table('community_advisory_events')->insert([
            'advisory_id' => $item->id,
            'actor_id' => $actorId,
            'version' => $item->version,
            'action' => $action,
            'reason' => $reason,
            'snapshot' => $item->toJson(),
            'created_at' => now(),
        ]);
    }
}
