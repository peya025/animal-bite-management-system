<?php

namespace Tests\Feature\CommunityAwareness;

use App\Models\BarangayCoordinate;
use App\Models\BiteIncident;
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
use App\Services\Reporting\ClinicalRiskAlertService;
use App\Services\Surveillance\SurveillanceSignalService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdvisoryPrivacyAndAccessTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private User $reviewer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-11-27 10:00', 'Asia/Manila'));
        $this->clinic = Clinic::create(['name' => 'Clinic Privacy Test', 'municipality' => 'Town A', 'province' => 'Province A']);
        $this->admin = User::factory()->create(['clinic_id' => $this->clinic->id, 'role' => 'admin', 'is_active' => true, 'name' => 'MARKER_ADMIN_NAME']);
        $this->reviewer = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'treatment',
            'is_active' => true,
            'name' => 'MARKER_REVIEWER_NAME',
            'email' => 'marker_reviewer@example.test',
        ]);
        $doctorRole = Role::firstOrCreate(['slug' => 'doctor'], ['display_name' => 'Doctor']);
        $this->reviewer->roles()->attach($doctorRole->id);
        config(['services.firebase.allowed_patient_account_ids' => null]);
    }

    public function test_p7_t01_end_to_end_disclosure_audit_never_leaks_synthetic_markers(): void
    {
        Queue::fake();
        BarangayCoordinate::create([
            'barangay' => 'MARKER_BARANGAY',
            'municipality' => 'Town A',
            'province' => 'Province A',
            'latitude' => 8.5,
            'longitude' => 124.7,
            'source' => 'manual',
        ]);
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'first_name' => 'MARKER_PATIENT_FIRST',
            'last_name' => 'MARKER_PATIENT_LAST',
            'gender' => 'female',
            'date_of_birth' => '1992-05-05',
        ]);
        for ($i = 1; $i <= 3; $i++) {
            BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $patient->patient_id,
                'created_by' => $this->admin->id,
                'bite_date' => now('Asia/Manila')->subDays($i)->toDateString(),
                'bite_place' => 'MARKER_BARANGAY, Town A, Province A',
                'status' => 'active',
                'severity' => 'moderate',
            ]);
        }

        app(SurveillanceSignalService::class)->evaluate($this->clinic->id);

        $account = PatientAccount::create([
            'name' => 'MARKER_ACCOUNT_NAME',
            'email' => 'marker_account@example.test',
            'password' => bcrypt('Secret123!'),
            'is_active' => true,
            'notification_preferences' => [
                'push_enabled' => true,
                'reminders' => true,
                'community_advisories' => true,
            ],
        ]);
        $account->patients()->attach($patient->patient_id, ['relationship' => 'self']);
        PatientDeviceToken::create([
            'patient_account_id' => $account->id,
            'fcm_token' => 'MARKER_FCM_TOKEN_SECRET',
            'platform' => 'android',
            'is_active' => true,
        ]);

        // Create, submit, approve, and publish an advisory
        Sanctum::actingAs($this->admin);
        $draftId = $this->postJson('/api/community-advisories', [
            'title' => 'Community Bite Safety Update',
            'body' => 'Wash any bite wound with soap and water and seek clinic assessment.',
            'expires_on' => now('Asia/Manila')->addDays(5)->toDateString(),
        ])->assertCreated()->json('id');

        $this->postJson("/api/community-advisories/$draftId/submit", ['version' => 1])->assertOk();
        Sanctum::actingAs($this->reviewer);
        $this->postJson("/api/community-advisories/$draftId/approve", ['version' => 2, 'review_confirmed' => true])->assertOk();

        config(['community_awareness.publication_enabled' => true, 'community_awareness.push_enabled' => true]);
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/community-advisories/$draftId/publish", ['version' => 3])->assertOk();

        $markers = [
            'MARKER_PATIENT_FIRST',
            'MARKER_PATIENT_LAST',
            'MARKER_BARANGAY',
            'MARKER_ACCOUNT_NAME',
            'MARKER_FCM_TOKEN_SECRET',
            'MARKER_ADMIN_NAME',
            'MARKER_REVIEWER_NAME',
            'marker_reviewer@example.test',
            'MARKER_WITHDRAW_REASON',
        ];

        // Inspect all public endpoints
        $surfaces = [
            $this->getJson('/api/public/community-bite-overview?clinic_id=' . $this->clinic->id, ['X-Community-Awareness-Version' => '2'])
                ->assertOk()->assertHeader('Cache-Control', 'no-store, private')->getContent(),
            $this->getJson('/api/public/community-advisories?clinic_id=' . $this->clinic->id)
                ->assertOk()->assertHeader('Cache-Control', 'no-store, private')->getContent(),
            $this->getJson("/api/public/community-advisories/$draftId")
                ->assertOk()->assertHeader('Cache-Control', 'no-store, private')->getContent(),
        ];

        // Capture FCM push payload
        $capturedPush = '';
        $fcmMock = $this->mock(FcmService::class);
        $fcmMock->shouldReceive('isAccountAllowed')->andReturn(true);
        $fcmMock->shouldReceive('sendToDevice')->once()->andReturnUsing(
            function ($token, $title, $body, $data) use (&$capturedPush) {
                $capturedPush = json_encode(compact('title', 'body', 'data'));
                return FcmResult::success(messageId: 'projects/test/messages/p7', statusCode: 200);
            }
        );
        $delivery = CommunityAdvisoryDelivery::firstOrFail();
        app(AdvisoryDeliveryService::class)->processDelivery($delivery->id);
        $surfaces[] = $capturedPush;

        // Withdraw with an internal reason marker and inspect 410 tombstone
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/community-advisories/$draftId/withdraw", [
            'version' => 4,
            'reason' => 'MARKER_WITHDRAW_REASON',
        ])->assertOk();
        $surfaces[] = $this->getJson("/api/public/community-advisories/$draftId")
            ->assertStatus(410)->assertHeader('Cache-Control', 'no-store, private')->getContent();

        foreach ($surfaces as $payload) {
            foreach ($markers as $marker) {
                $this->assertStringNotContainsString($marker, (string) $payload);
            }
        }
    }

    public function test_p7_t03_withdrawal_and_rollback_drill_preserves_history_and_clinical_reminders(): void
    {
        Queue::fake();
        config(['community_awareness.publication_enabled' => true, 'community_awareness.push_enabled' => true]);

        $account = PatientAccount::create([
            'name' => 'Rollback Patient',
            'email' => 'rollback@example.test',
            'password' => bcrypt('Secret123!'),
            'is_active' => true,
            'notification_preferences' => [
                'push_enabled' => true,
                'reminders' => true,
                'appointment_updates' => true,
                'community_advisories' => true,
            ],
        ]);
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'first_name' => 'Roll',
            'last_name' => 'Back',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
        ]);
        $account->patients()->attach($patient->patient_id, ['relationship' => 'self']);

        Sanctum::actingAs($this->admin);
        $id = $this->postJson('/api/community-advisories', [
            'title' => 'Active Notice',
            'body' => 'Clinic prevention guidance.',
            'expires_on' => now('Asia/Manila')->addDays(4)->toDateString(),
        ])->assertCreated()->json('id');
        $this->postJson("/api/community-advisories/$id/submit", ['version' => 1])->assertOk();
        Sanctum::actingAs($this->reviewer);
        $this->postJson("/api/community-advisories/$id/approve", ['version' => 2, 'review_confirmed' => true])->assertOk();
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/community-advisories/$id/publish", ['version' => 3])->assertOk();

        // Rollback drill: disable both flags -> public feed empties, detector is NEVER called, history & reminders remain intact
        config(['community_awareness.publication_enabled' => false, 'community_awareness.push_enabled' => false]);
        $this->mock(ClinicalRiskAlertService::class)->shouldNotReceive('detectBarangaySurges');

        $this->getJson('/api/public/community-bite-overview?clinic_id=' . $this->clinic->id, ['X-Community-Awareness-Version' => '2'])
            ->assertOk()
            ->assertJsonPath('status', 'information')
            ->assertJsonPath('elevated_areas', [])
            ->assertJsonCount(0, 'advisories');
        $this->getJson('/api/public/community-advisories?clinic_id=' . $this->clinic->id)
            ->assertOk()->assertJsonCount(0, 'advisories');
        $this->getJson("/api/public/community-advisories/$id")->assertStatus(410);

        // Audit history is preserved
        $this->assertSame(4, DB::table('community_advisory_events')->where('advisory_id', $id)->count());

        // Pending delivery cancels safely when flags are disabled
        $delivery = CommunityAdvisoryDelivery::firstOrFail();
        $this->assertSame('cancelled', app(AdvisoryDeliveryService::class)->processDelivery($delivery->id));
        $this->assertSame('feature_disabled', $delivery->fresh()->cancellation_reason);

        // Personal clinical reminders remain completely operational
        $this->assertTrue($account->fresh()->allowsNotificationCategory('reminder'));
        $this->assertTrue($account->fresh()->allowsNotificationCategory('appointment'));

        // Operational health check succeeds with 0 integrity mismatches
        $this->artisan('advisories:health-check')->assertSuccessful();
    }
}
