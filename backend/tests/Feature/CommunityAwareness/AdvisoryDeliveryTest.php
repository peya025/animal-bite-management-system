<?php

namespace Tests\Feature\CommunityAwareness;

use App\Jobs\DeliverCommunityAdvisory;
use App\Models\Clinic;
use App\Models\CommunityAdvisory;
use App\Models\CommunityAdvisoryDelivery;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Models\Role;
use App\Models\User;
use App\Services\CommunityAwareness\AdvisoryDeliveryService;
use App\Services\Messaging\FcmService;
use App\Services\Messaging\Firebase\FcmResult;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdvisoryDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private Clinic $otherClinic;
    private User $admin;
    private User $reviewer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-11-27 10:00', 'Asia/Manila'));
        $this->clinic = Clinic::create(['name' => 'Clinic One', 'municipality' => 'Town A', 'province' => 'Province A']);
        $this->otherClinic = Clinic::create(['name' => 'Clinic Two', 'municipality' => 'Town B', 'province' => 'Province B']);
        $this->admin = User::factory()->create(['clinic_id' => $this->clinic->id, 'role' => 'admin', 'is_active' => true]);
        $this->reviewer = User::factory()->create(['clinic_id' => $this->clinic->id, 'role' => 'treatment', 'is_active' => true]);
        $doctorRole = Role::firstOrCreate(['slug' => 'doctor'], ['display_name' => 'Doctor']);
        $this->reviewer->roles()->attach($doctorRole->id);
        config(['services.firebase.allowed_patient_account_ids' => null]);
    }

    private function publishAdvisory(?string $expiresOn = null): CommunityAdvisory
    {
        config(['community_awareness.publication_enabled' => true]);
        Sanctum::actingAs($this->admin);
        $id = $this->postJson('/api/community-advisories', [
            'title' => 'Community Bite Safety Update',
            'body' => 'Wash animal bite wounds with soap and water and seek prompt clinic care.',
            'expires_on' => $expiresOn ?? now('Asia/Manila')->addDays(5)->toDateString(),
        ])->assertCreated()->json('id');
        $this->postJson("/api/community-advisories/$id/submit", ['version' => 1])->assertOk();
        Sanctum::actingAs($this->reviewer);
        $this->postJson("/api/community-advisories/$id/approve", ['version' => 2, 'review_confirmed' => true])->assertOk();
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 3])->assertOk();
        return CommunityAdvisory::findOrFail($id);
    }

    private function createOptedInAccount(Clinic $clinic, bool $optedIn = true, bool $active = true, bool $withToken = true): PatientAccount
    {
        $account = PatientAccount::create([
            'name' => 'Test Account',
            'email' => 'acc_' . uniqid() . '@example.test',
            'password' => bcrypt('Secret123!'),
            'is_active' => $active,
            'notification_preferences' => [
                'push_enabled' => true,
                'appointments' => true,
                'reminders' => true,
                'digital_card' => true,
                'announcements' => true,
                'community_advisories' => $optedIn,
            ],
        ]);
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Patient',
            'last_name' => 'One',
            'gender' => 'female',
            'date_of_birth' => '1995-01-01',
        ]);
        $account->patients()->attach($patient->patient_id, ['relationship' => 'self']);
        if ($withToken) {
            PatientDeviceToken::create([
                'patient_account_id' => $account->id,
                'fcm_token' => 'token_' . uniqid(),
                'platform' => 'android',
                'is_active' => true,
            ]);
        }
        return $account;
    }

    public function test_opt_in_default_false_and_preference_api_preserves_clinical_preferences(): void
    {
        $account = PatientAccount::create([
            'name' => 'Default Prefs',
            'email' => 'default_prefs@example.test',
            'password' => bcrypt('Secret123!'),
            'is_active' => true,
        ]);

        $this->assertFalse($account->allowsNotificationCategory('community_advisory'));
        $this->assertTrue($account->allowsNotificationCategory('reminder'));
        $this->assertTrue($account->allowsNotificationCategory('appointment'));

        Sanctum::actingAs($account, ['*']);
        $this->putJson('/api/mobile/notification-preferences', ['community_advisories' => true])
            ->assertOk()
            ->assertJsonPath('preferences.community_advisories', true)
            ->assertJsonPath('preferences.reminders', true)
            ->assertJsonPath('preferences.appointment_updates', true);

        $this->assertTrue($account->fresh()->allowsNotificationCategory('community_advisory'));

        $this->putJson('/api/mobile/notification-preferences', ['community_advisories' => false])
            ->assertOk()
            ->assertJsonPath('preferences.community_advisories', false)
            ->assertJsonPath('preferences.reminders', true);
    }

    public function test_push_gate_fails_closed_and_chunked_audience_exceeds_50_with_deduplication(): void
    {
        Queue::fake();

        // Create 55 opted-in accounts for Clinic One (exceeding old 50-account limit)
        $accounts = [];
        for ($i = 0; $i < 55; $i++) {
            $accounts[] = $this->createOptedInAccount($this->clinic, optedIn: true, active: true, withToken: false);
        }
        // Attach a second patient to account[0] to verify deduplication
        $extraPatient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'first_name' => 'Child',
            'last_name' => 'One',
            'gender' => 'male',
            'date_of_birth' => '2018-01-01',
        ]);
        $accounts[0]->patients()->attach($extraPatient->patient_id, ['relationship' => 'child']);

        // Opted-out, inactive, and other-clinic accounts must be excluded
        $this->createOptedInAccount($this->clinic, optedIn: false, active: true, withToken: false);
        $this->createOptedInAccount($this->clinic, optedIn: true, active: false, withToken: false);
        $this->createOptedInAccount($this->otherClinic, optedIn: true, active: true, withToken: false);

        // Push gate off -> nothing queued
        config(['community_awareness.push_enabled' => false]);
        $advisory = $this->publishAdvisory();
        Queue::assertNotPushed(DeliverCommunityAdvisory::class);
        $this->assertSame(0, CommunityAdvisoryDelivery::count());

        // Enable push gate and enqueue with small chunk size (20) -> all 55 unique accounts queued
        config(['community_awareness.push_enabled' => true, 'community_awareness.recipient_chunk_size' => 20]);
        $count = app(AdvisoryDeliveryService::class)->enqueueForAdvisory($advisory);
        $this->assertSame(55, $count);
        $this->assertSame(55, CommunityAdvisoryDelivery::count());
        Queue::assertPushed(DeliverCommunityAdvisory::class, 55);

        // Re-enqueueing same advisory version creates 0 duplicate outbox rows
        app(AdvisoryDeliveryService::class)->enqueueForAdvisory($advisory);
        $this->assertSame(55, CommunityAdvisoryDelivery::count());
    }

    public function test_generic_lock_screen_payload_and_last_moment_cancellation_on_withdrawal_or_opt_out(): void
    {
        Queue::fake();
        config(['community_awareness.push_enabled' => true]);

        $activeOptedIn = $this->createOptedInAccount($this->clinic, optedIn: true);
        $laterOptedOut = $this->createOptedInAccount($this->clinic, optedIn: true);

        $advisory = $this->publishAdvisory();
        $this->assertSame(2, CommunityAdvisoryDelivery::count());

        // Account opts out AFTER enqueue and BEFORE delivery runs
        $laterOptedOut->updateNotificationPreferences(['community_advisories' => false]);

        $sentPayloads = [];
        $fcmMock = $this->mock(FcmService::class);
        $fcmMock->shouldReceive('isAccountAllowed')->andReturn(true);
        $fcmMock->shouldReceive('sendToDevice')->once()->andReturnUsing(
            function ($deviceToken, $title, $body, $data) use (&$sentPayloads) {
                $sentPayloads[] = compact('title', 'body', 'data');
                return FcmResult::success(messageId: 'projects/test/messages/1', statusCode: 200);
            }
        );

        $service = app(AdvisoryDeliveryService::class);
        $d1 = CommunityAdvisoryDelivery::where('patient_account_id', $activeOptedIn->id)->firstOrFail();
        $d2 = CommunityAdvisoryDelivery::where('patient_account_id', $laterOptedOut->id)->firstOrFail();

        $this->assertSame('sent', $service->processDelivery($d1->id));
        $this->assertSame('cancelled', $service->processDelivery($d2->id));
        $this->assertSame('recipient_ineligible', $d2->fresh()->cancellation_reason);

        // Verify generic lock-screen payload contains zero clinical/location/patient details
        $this->assertCount(1, $sentPayloads);
        $this->assertSame(AdvisoryDeliveryService::PUSH_TITLE, $sentPayloads[0]['title']);
        $this->assertSame(AdvisoryDeliveryService::PUSH_BODY, $sentPayloads[0]['body']);
        $this->assertSame([
            'category' => 'community_advisory',
            'route' => '/community-advisory',
            'advisory_id' => (string) $advisory->id,
            'revision' => (string) $advisory->version,
        ], $sentPayloads[0]['data']);

        // Withdrawal cancels any remaining queued deliveries immediately
        $advisory2 = $this->publishAdvisory();
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/community-advisories/{$advisory2->id}/withdraw", [
            'version' => $advisory2->version,
            'reason' => 'Withdrawn before send',
        ])->assertOk();
        $this->assertSame(
            0,
            CommunityAdvisoryDelivery::where('advisory_id', $advisory2->id)->whereIn('status', ['queued', 'deferred'])->count()
        );
    }

    public function test_quiet_hours_defers_within_validity_and_cancels_if_expiring_before_window(): void
    {
        Queue::fake();
        config(['community_awareness.push_enabled' => true]);
        $account = $this->createOptedInAccount($this->clinic, optedIn: true);

        // Travel to 22:00 Asia/Manila (inside 20:00–08:00 quiet hours)
        $this->travelTo(CarbonImmutable::parse('2026-11-27 22:00', 'Asia/Manila'));

        $longAdvisory = $this->publishAdvisory(expiresOn: '2026-12-01');
        $expiringToday = $this->publishAdvisory(expiresOn: '2026-11-27');

        $fcmMock = $this->mock(FcmService::class);
        $fcmMock->shouldReceive('isAccountAllowed')->andReturn(true);
        $fcmMock->shouldNotReceive('sendToDevice');

        $service = app(AdvisoryDeliveryService::class);
        $dLong = CommunityAdvisoryDelivery::where('advisory_id', $longAdvisory->id)->where('patient_account_id', $account->id)->firstOrFail();
        $dShort = CommunityAdvisoryDelivery::where('advisory_id', $expiringToday->id)->where('patient_account_id', $account->id)->firstOrFail();

        $this->assertSame('deferred', $service->processDelivery($dLong->id));
        $this->assertSame('deferred', $dLong->fresh()->status);
        $this->assertSame('2026-11-28 08:00:00', $dLong->fresh()->next_attempt_at->setTimezone('Asia/Manila')->format('Y-m-d H:i:s'));

        $this->assertSame('cancelled', $service->processDelivery($dShort->id));
        $this->assertSame('expired_during_quiet_hours', $dShort->fresh()->cancellation_reason);
    }

    public function test_daily_and_weekly_caps_limit_community_push_without_affecting_reminders(): void
    {
        Queue::fake();
        config([
            'community_awareness.push_enabled' => true,
            'community_awareness.push_daily_cap' => 1,
            'community_awareness.push_weekly_cap' => 2,
        ]);
        $account = $this->createOptedInAccount($this->clinic, optedIn: true);

        $fcmMock = $this->mock(FcmService::class);
        $fcmMock->shouldReceive('isAccountAllowed')->andReturn(true);
        $fcmMock->shouldReceive('sendToDevice')->twice()
            ->andReturn(FcmResult::success(messageId: 'projects/test/messages/cap', statusCode: 200));

        $service = app(AdvisoryDeliveryService::class);

        // Day 1: 1st push succeeds, 2nd push hits daily cap
        $a1 = $this->publishAdvisory();
        $a2 = $this->publishAdvisory();
        $this->assertSame('sent', $service->processDelivery(CommunityAdvisoryDelivery::where('advisory_id', $a1->id)->firstOrFail()->id));
        $d2 = CommunityAdvisoryDelivery::where('advisory_id', $a2->id)->firstOrFail();
        $this->assertSame('cancelled', $service->processDelivery($d2->id));
        $this->assertSame('rate_cap_reached', $d2->fresh()->cancellation_reason);

        // Day 3 (48h later): 2nd weekly push succeeds, 3rd weekly push hits weekly cap
        $this->travel(2)->days();
        $a3 = $this->publishAdvisory(expiresOn: now('Asia/Manila')->addDays(5)->toDateString());
        $this->assertSame('sent', $service->processDelivery(CommunityAdvisoryDelivery::where('advisory_id', $a3->id)->firstOrFail()->id));

        $this->travel(2)->days();
        $a4 = $this->publishAdvisory(expiresOn: now('Asia/Manila')->addDays(5)->toDateString());
        $d4 = CommunityAdvisoryDelivery::where('advisory_id', $a4->id)->firstOrFail();
        $this->assertSame('cancelled', $service->processDelivery($d4->id));
        $this->assertSame('rate_cap_reached', $d4->fresh()->cancellation_reason);

        // Personal clinical reminders remain completely unaffected
        $this->assertTrue($account->fresh()->allowsNotificationCategory('reminder'));
        $this->assertTrue($account->fresh()->allowsNotificationCategory('appointment'));
    }
}
