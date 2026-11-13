<?php

namespace Tests\Feature\Landing;

use App\Models\Announcement;
use App\Models\Clinic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnnouncementTest extends TestCase
{
    use RefreshDatabase;

    private function staff(string $role = 'registration'): User
    {
        return User::factory()->create(['clinic_id' => Clinic::firstOrCreate(['name' => 'Test Clinic'])->id, 'role' => $role, 'is_active' => true]);
    }

    private function payload(array $extra = []): array
    {
        return array_merge(['title' => 'Clinic update', 'message' => 'Please check the updated schedule.', 'is_published' => true, 'is_urgent' => false], $extra);
    }

    public function test_staff_can_upload_publish_replace_and_unpublish(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->staff());
        $created = $this->postJson('/api/announcements', $this->payload(['image' => UploadedFile::fake()->image('notice.png')]))->assertCreated();
        $id = $created->json('id');
        $path = Announcement::findOrFail($id)->image_path;
        Storage::disk('public')->assertExists($path);
        $this->getJson('/api/public/announcements')->assertOk()->assertJsonCount(1)->assertJsonMissingPath('0.author_name');
        $this->postJson('/api/announcements/'.$id, $this->payload(['is_published' => false, 'remove_image' => true]))->assertOk()->assertJsonPath('image_url', null);
        Storage::disk('public')->assertMissing($path);
        $this->getJson('/api/public/announcements')->assertOk()->assertExactJson([]);
        $this->getJson('/api/announcements')->assertOk()->assertJsonPath('0.can_manage', true);
    }

    public function test_expiration_uses_philippine_calendar_day_and_hides_drafts(): void
    {
        $this->travelTo(\Carbon\Carbon::parse('2026-11-11 16:01:00', 'UTC'));
        Sanctum::actingAs($this->staff());
        $this->postJson('/api/announcements', $this->payload(['expires_on' => '2026-11-11']))->assertCreated();
        $this->postJson('/api/announcements', $this->payload(['expires_on' => '2026-11-12', 'title' => 'Today']))->assertCreated();
        $this->postJson('/api/announcements', $this->payload(['is_published' => false]))->assertCreated();
        $this->getJson('/api/public/announcements')->assertOk()->assertJsonCount(1)->assertJsonPath('0.title', 'Today');
    }

    public function test_staff_cannot_edit_other_authors_or_other_clinics(): void
    {
        Sanctum::actingAs($this->staff());
        $id = $this->postJson('/api/announcements', $this->payload())->assertCreated()->json('id');
        Sanctum::actingAs($this->staff('treatment'));
        $this->postJson('/api/announcements/'.$id, $this->payload())->assertForbidden();
        $this->getJson('/api/announcements')->assertJsonPath('0.can_manage', false);
        $admin = $this->staff('admin');
        Sanctum::actingAs($admin);
        $this->postJson('/api/announcements/'.$id, $this->payload())->assertOk();
        $admin->update(['clinic_id' => Clinic::create(['name' => 'Other clinic'])->id]);
        $this->postJson('/api/announcements/'.$id, $this->payload())->assertForbidden();
        $this->getJson('/api/announcements')->assertExactJson([]);
    }

    public function test_guests_inactive_staff_and_invalid_uploads_are_rejected(): void
    {
        $this->postJson('/api/announcements', $this->payload())->assertUnauthorized();
        $user = $this->staff();
        Sanctum::actingAs($user);
        $this->postJson('/api/announcements', $this->payload(['image' => UploadedFile::fake()->create('bad.html', 1, 'text/html')]))->assertUnprocessable();
        $this->postJson('/api/announcements', $this->payload(['title' => '', 'expires_on' => 'not-a-date']))->assertUnprocessable();
        $user->update(['is_active' => false]);
        $this->postJson('/api/announcements', $this->payload())->assertForbidden();
    }

    public function test_patient_accounts_cannot_manage_announcements(): void
    {
        $patient = \App\Models\PatientAccount::create([
            'name' => 'Test patient', 'email' => 'announcement-patient@example.test',
            'password' => 'test-password', 'is_active' => true,
        ]);
        Sanctum::actingAs($patient);
        $this->getJson('/api/announcements')->assertForbidden();
        $this->postJson('/api/announcements', $this->payload())->assertForbidden();
    }
}
