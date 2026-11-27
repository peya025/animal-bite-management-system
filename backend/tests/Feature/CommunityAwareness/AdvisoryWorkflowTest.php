<?php

namespace Tests\Feature\CommunityAwareness;

use App\Models\Clinic;
use App\Models\CommunityAdvisory;
use App\Models\User;
use App\Services\Reporting\ClinicalRiskAlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdvisoryWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $author;
    private User $reviewer;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        $clinic = Clinic::create(['name' => 'Test clinic']);
        $this->author = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'admin', 'is_active' => true]);
        $this->reviewer = User::factory()->create(['clinic_id' => $clinic->id, 'role' => 'triage', 'is_active' => true]);
        $this->reviewer->roles()->attach(\App\Models\Role::where('slug', 'doctor')->firstOrFail()->id);
        Sanctum::actingAs($this->author);
    }

    private function draft(): int
    {
        return $this->postJson('/api/community-advisories', [
            'title' => 'Community Bite Safety Update', 'body' => 'Contact the clinic for bite-prevention information.',
            'expires_on' => now('Asia/Manila')->addDays(7)->toDateString(),
            'state' => 'published', 'approved_by' => $this->author->id,
        ])->assertCreated()->assertJsonPath('state', 'draft')->assertJsonPath('approved_by', null)->json('id');
    }

    private function approve(int $id): void
    {
        $this->postJson("/api/community-advisories/$id/submit", ['version' => 1])->assertOk();
        Sanctum::actingAs($this->reviewer);
        $this->postJson("/api/community-advisories/$id/approve", ['version' => 2, 'review_confirmed' => true])->assertOk();
        Sanctum::actingAs($this->author);
    }

    private function feed()
    {
        return $this->getJson('/api/public/community-bite-overview?clinic_id='.$this->author->clinic_id,
            ['X-Community-Awareness-Version' => '2']);
    }

    public function test_publication_requires_independent_approval_and_feature_gate_and_never_sends_push(): void
    {
        $id = $this->draft();
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 1])->assertConflict();
        $this->approve($id);
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 3])->assertConflict();
        $this->feed()->assertOk()->assertJsonCount(0, 'advisories');
        config(['community_awareness.publication_enabled' => true]);
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 3])->assertOk();
        $this->feed()->assertOk()->assertJsonCount(1, 'advisories')
            ->assertJsonMissingPath('advisories.0.author_id')->assertJsonMissingPath('advisories.0.approved_hash');
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 3])->assertConflict();
        $this->assertDatabaseCount('community_advisory_events', 4);
        Queue::assertNothingPushed();
    }

    public function test_self_approval_and_missing_review_attestation_are_rejected(): void
    {
        Sanctum::actingAs($this->reviewer);
        $id = $this->draft();
        $this->postJson("/api/community-advisories/$id/submit", ['version' => 1])->assertOk();
        $this->postJson("/api/community-advisories/$id/approve", ['version' => 2, 'review_confirmed' => true])->assertForbidden();
        $this->postJson("/api/community-advisories/$id/approve", ['version' => 2])->assertUnprocessable();
    }

    public function test_cross_clinic_and_developer_access_are_denied(): void
    {
        $id = $this->draft();
        $other = User::factory()->create(['clinic_id' => Clinic::create(['name' => 'Other clinic'])->id, 'role' => 'admin', 'is_active' => true]);
        Sanctum::actingAs($other);
        $this->postJson("/api/community-advisories/$id/submit", ['version' => 1])->assertNotFound();
        $this->getJson("/api/community-advisories/$id/history")->assertNotFound();
        $this->getJson('/api/community-advisories')->assertJsonCount(0, 'data');
        $other->update(['role' => 'developer']);
        $this->getJson('/api/community-advisories')->assertForbidden();
    }

    public function test_withdrawal_expiry_and_content_tampering_remove_public_content(): void
    {
        config(['community_awareness.publication_enabled' => true]);
        $id = $this->draft(); $this->approve($id);
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 3])->assertOk();
        $this->postJson("/api/community-advisories/$id/withdraw", ['version' => 4])->assertUnprocessable();
        $this->postJson("/api/community-advisories/$id/withdraw", ['version' => 4, 'reason' => 'Correction needed'])->assertOk();
        $this->feed()->assertJsonCount(0, 'advisories')->assertHeader('Cache-Control', 'no-store, private');
        $id = $this->draft(); $this->approve($id);
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 3])->assertOk();
        $this->travel(8)->days();
        $this->feed()->assertJsonCount(0, 'advisories');
        $this->travelBack();
        CommunityAdvisory::findOrFail($id)->update(['body' => 'Unreviewed change']);
        $this->feed()->assertJsonCount(0, 'advisories');
    }

    public function test_edited_or_revoked_approval_cannot_publish(): void
    {
        config(['community_awareness.publication_enabled' => true]);
        $id = $this->draft(); $this->approve($id);
        $this->postJson("/api/community-advisories/$id/edit", ['version' => 3])->assertUnprocessable();
        $this->reviewer->update(['is_active' => false]);
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 3])->assertConflict();
        $this->assertDatabaseCount('community_advisory_events', 3);
    }

    public function test_legacy_clients_hide_card_and_current_feed_never_calls_detector(): void
    {
        $this->mock(ClinicalRiskAlertService::class)->shouldNotReceive('detectBarangaySurges');
        $this->getJson('/api/public/community-bite-overview')->assertNoContent();
        $this->feed()->assertOk()->assertJsonPath('status', 'information')->assertJsonPath('elevated_areas', []);
        Clinic::create(['name' => 'Another clinic']);
        $this->getJson('/api/public/community-bite-overview', ['X-Community-Awareness-Version' => '2'])->assertStatus(503);
    }

    public function test_old_targeted_announcement_cannot_bypass_review(): void
    {
        $this->postJson('/api/announcements', [
            'title' => 'Area warning', 'message' => 'Unreviewed', 'is_published' => true,
            'is_urgent' => true, 'target_barangay' => 'Example',
        ])->assertUnprocessable();
        Queue::assertNothingPushed();
    }

    public function test_legacy_targeted_announcement_is_hidden_and_pending_push_is_suppressed(): void
    {
        $legacy = \App\Models\Announcement::create([
            'clinic_id' => $this->author->clinic_id, 'user_id' => $this->author->id,
            'title' => 'Old area warning', 'message' => 'Unreviewed',
            'is_published' => true, 'is_urgent' => true, 'target_barangay' => 'Example',
        ]);
        $this->getJson('/api/public/announcements')->assertOk()->assertExactJson([]);
        $transport = $this->mock(\App\Services\Messaging\FcmService::class);
        $transport->shouldNotReceive('sendToDevice');
        $transport->shouldNotReceive('isAccountAllowed');
        $job = new \App\Jobs\SendFcmPushNotification(1, 'Clinic announcement', 'Open app', [
            'category' => 'announcement', 'announcement_id' => (string) $legacy->id,
        ]);
        $job->handle($transport);
    }

    public function test_return_edit_and_stale_version_preserve_history(): void
    {
        $id = $this->draft();
        $this->postJson("/api/community-advisories/$id/submit", ['version' => 1])->assertOk();
        Sanctum::actingAs($this->reviewer);
        $this->postJson("/api/community-advisories/$id/return", ['version' => 2, 'reason' => 'Remove identifying wording'])->assertOk();
        Sanctum::actingAs($this->author);
        $content = ['version' => 3, 'title' => 'Revised update', 'body' => 'Generic education', 'expires_on' => now('Asia/Manila')->addDays(3)->toDateString()];
        $this->postJson("/api/community-advisories/$id/edit", $content)->assertOk()->assertJsonPath('version', 4);
        $this->postJson("/api/community-advisories/$id/edit", $content)->assertConflict();
        $this->getJson("/api/community-advisories/$id/history")->assertOk()->assertJsonCount(4, 'data');
    }

    public function test_official_health_advisory_requires_source_metadata_and_verification(): void
    {
        $expiry = now('Asia/Manila')->addDays(5)->toDateString();
        $today = now('Asia/Manila')->toDateString();

        // Missing source metadata rejected
        $this->postJson('/api/community-advisories', [
            'advisory_type' => 'official_health_advisory',
            'title' => 'Official notice',
            'body' => 'Read official guidance.',
            'expires_on' => $expiry,
        ])->assertUnprocessable();

        // Unsafe URL scheme rejected
        $this->postJson('/api/community-advisories', [
            'advisory_type' => 'official_health_advisory',
            'title' => 'Official notice',
            'body' => 'Read official guidance.',
            'expires_on' => $expiry,
            'source_authority' => 'Department of Health',
            'source_reference' => 'javascript:alert(1)',
            'source_issued_on' => $today,
            'source_geography_note' => 'Province-wide',
        ])->assertUnprocessable();

        // Valid official draft
        $id = $this->postJson('/api/community-advisories', [
            'advisory_type' => 'official_health_advisory',
            'title' => 'Official Rabies Prevention Notice',
            'body' => 'Seek prompt post-exposure care after any animal bite.',
            'expires_on' => $expiry,
            'source_authority' => 'Department of Health',
            'source_reference' => 'https://doh.gov.ph/advisories/2026-01',
            'source_issued_on' => $today,
            'source_geography_note' => 'Municipality-wide',
        ])->assertCreated()->json('id');

        $this->postJson("/api/community-advisories/$id/submit", ['version' => 1])->assertOk();

        // Approval without source_verified rejected
        Sanctum::actingAs($this->reviewer);
        $this->postJson("/api/community-advisories/$id/approve", [
            'version' => 2,
            'review_confirmed' => true,
        ])->assertUnprocessable();

        // Approval with source_verified succeeds
        $this->postJson("/api/community-advisories/$id/approve", [
            'version' => 2,
            'review_confirmed' => true,
            'source_verified' => true,
        ])->assertOk();

        config(['community_awareness.publication_enabled' => true]);
        Sanctum::actingAs($this->author);
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 3])->assertOk();

        $detail = $this->getJson("/api/public/community-advisories/$id")->assertOk();
        $detail->assertJsonPath('advisory.advisory_type', 'official_health_advisory')
            ->assertJsonPath('advisory.source.authority', 'Department of Health')
            ->assertJsonMissingPath('advisory.source.verified_by')
            ->assertJsonMissingPath('advisory.approved_by');

        // Tampering with source_authority invalidates approval hash and suppresses public visibility
        CommunityAdvisory::whereKey($id)->update(['source_authority' => 'Altered Authority']);
        $this->getJson('/api/public/community-advisories?clinic_id=' . $this->author->clinic_id)
            ->assertOk()->assertJsonCount(0, 'advisories');
        $this->getJson("/api/public/community-advisories/$id")->assertStatus(410);
    }

    public function test_scheduled_publication_publishes_when_due_and_revalidates(): void
    {
        $id = $this->draft();
        $this->postJson("/api/community-advisories/$id/submit", ['version' => 1])->assertOk();
        Sanctum::actingAs($this->reviewer);
        $this->postJson("/api/community-advisories/$id/approve", ['version' => 2, 'review_confirmed' => true])->assertOk();

        config(['community_awareness.publication_enabled' => true]);
        Sanctum::actingAs($this->author);
        $future = now('Asia/Manila')->addHours(2)->format('Y-m-d\TH:i');
        $this->postJson("/api/community-advisories/$id/schedule", [
            'version' => 3,
            'scheduled_for' => $future,
        ])->assertOk()->assertJsonPath('state', 'scheduled');

        // Not visible before due time (returns 404 to prevent draft/scheduled enumeration)
        $this->getJson("/api/public/community-advisories/$id")->assertNotFound();
        $this->getJson('/api/public/community-advisories?clinic_id=' . $this->author->clinic_id)
            ->assertOk()->assertJsonCount(0, 'advisories');

        // Advance past scheduled_for and run scheduled publisher
        $this->travel(3)->hours();
        $this->artisan('advisories:publish-scheduled')->assertSuccessful();

        $this->getJson('/api/public/community-advisories?clinic_id=' . $this->author->clinic_id)
            ->assertOk()->assertJsonCount(1, 'advisories')->assertJsonPath('advisories.0.id', $id);
        $this->getJson("/api/public/community-advisories/$id")->assertOk()->assertJsonPath('status', 'active');
    }

    public function test_scheduled_publication_cancels_on_revoked_reviewer_and_supports_withdrawal(): void
    {
        // Case 1: Admin withdraws a scheduled advisory before due time
        $id1 = $this->draft();
        $this->postJson("/api/community-advisories/$id1/submit", ['version' => 1])->assertOk();
        Sanctum::actingAs($this->reviewer);
        $this->postJson("/api/community-advisories/$id1/approve", ['version' => 2, 'review_confirmed' => true])->assertOk();
        config(['community_awareness.publication_enabled' => true]);
        Sanctum::actingAs($this->author);
        $this->postJson("/api/community-advisories/$id1/schedule", [
            'version' => 3,
            'scheduled_for' => now('Asia/Manila')->addHour()->format('Y-m-d\TH:i'),
        ])->assertOk();
        $this->postJson("/api/community-advisories/$id1/withdraw", [
            'version' => 4,
            'reason' => 'No longer needed before release',
        ])->assertOk()->assertJsonPath('state', 'withdrawn');

        // Case 2: Reviewer deactivated before scheduled publication runs -> cancelled safely
        $id2 = $this->draft();
        $this->postJson("/api/community-advisories/$id2/submit", ['version' => 1])->assertOk();
        Sanctum::actingAs($this->reviewer);
        $this->postJson("/api/community-advisories/$id2/approve", ['version' => 2, 'review_confirmed' => true])->assertOk();
        Sanctum::actingAs($this->author);
        $this->postJson("/api/community-advisories/$id2/schedule", [
            'version' => 3,
            'scheduled_for' => now('Asia/Manila')->addHour()->format('Y-m-d\TH:i'),
        ])->assertOk();

        $this->reviewer->update(['is_active' => false]);
        $this->travel(2)->hours();
        $this->artisan('advisories:publish-scheduled')->assertSuccessful();

        $this->assertSame('withdrawn', CommunityAdvisory::find($id2)->state);
        $this->getJson('/api/public/community-advisories?clinic_id=' . $this->author->clinic_id)
            ->assertOk()->assertJsonCount(0, 'advisories');
    }

    public function test_public_advisory_detail_hides_drafts_and_returns_tombstone_after_withdrawal_or_expiry(): void
    {
        $id = $this->draft();
        // Unreleased draft returns 404 (no enumeration)
        $this->getJson("/api/public/community-advisories/$id")->assertNotFound()->assertHeader('Cache-Control', 'no-store, private');

        $this->postJson("/api/community-advisories/$id/submit", ['version' => 1])->assertOk();
        Sanctum::actingAs($this->reviewer);
        $this->postJson("/api/community-advisories/$id/approve", ['version' => 2, 'review_confirmed' => true])->assertOk();
        config(['community_awareness.publication_enabled' => true]);
        Sanctum::actingAs($this->author);
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 3])->assertOk();

        $this->getJson("/api/public/community-advisories/$id")->assertOk()->assertJsonPath('status', 'active');

        $this->postJson("/api/community-advisories/$id/withdraw", ['version' => 4, 'reason' => 'Correction'])->assertOk();
        $this->getJson("/api/public/community-advisories/$id")
            ->assertStatus(410)
            ->assertJsonPath('status', 'withdrawn')
            ->assertJsonMissingPath('advisory');
    }

    public function test_generic_announcements_reject_advisory_fields(): void
    {
        $this->postJson('/api/announcements', [
            'title' => 'Clinic notice',
            'message' => 'Trying to spoof official advisory',
            'is_published' => true,
            'is_urgent' => false,
            'advisory_type' => 'official_health_advisory',
            'source_authority' => 'DOH',
        ])->assertUnprocessable();
        Queue::assertNothingPushed();
    }
}
