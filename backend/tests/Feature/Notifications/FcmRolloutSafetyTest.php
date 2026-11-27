<?php

namespace Tests\Feature\Notifications;

use App\Events\AppointmentStatusChanged;
use App\Jobs\SendFcmPushNotification;
use App\Listeners\SendAppointmentFcmNotification;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\User;
use App\Services\Messaging\FcmService;
use App\Services\Messaging\Firebase\FcmResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FcmRolloutSafetyTest extends TestCase
{
    use RefreshDatabase;

    private PatientAccount $account;
    private Patient $patient;
    private Appointment $appointment;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        config(['services.firebase.allowed_patient_account_ids' => '*']);
        $clinic = Clinic::create(['name' => 'Test clinic']);
        $this->account = $this->account('primary');
        $this->patient = Patient::create(['clinic_id' => $clinic->id, 'patient_number' => 'TEST-1',
            'first_name' => 'Test', 'last_name' => 'Patient', 'gender' => 'female', 'status' => 'active']);
        $this->account->patients()->attach($this->patient->patient_id, ['status' => 'verified', 'relationship' => 'self', 'is_primary' => true]);
        $this->appointment = Appointment::create(['clinic_id' => $clinic->id, 'patient_id' => $this->patient->patient_id,
            'booked_by_account_id' => $this->account->id, 'appointment_type' => 'vaccination',
            'status' => 'scheduled', 'appointment_date' => today()->addDay(), 'scheduled_date' => today()->addDay()]);
        $this->device('first');
    }

    private function account(string $suffix): PatientAccount
    {
        return PatientAccount::create(['name' => 'Test', 'email' => $suffix.'@example.test', 'password' => 'password', 'is_active' => true]);
    }

    private function device(string $suffix)
    {
        return $this->account->deviceTokens()->create(['fcm_token' => 'fake-token-'.$suffix, 'device_type' => 'android', 'is_active' => true]);
    }

    private function job(): SendFcmPushNotification
    {
        return new SendFcmPushNotification($this->account->id, 'Vaccination Reminder', 'Generic', [
            'category' => 'appointment_reminder', 'appointment_id' => (string) $this->appointment->appointment_id,
        ]);
    }

    private function assertSkipped(SendFcmPushNotification $job): void
    {
        $service = $this->createMock(FcmService::class);
        $service->expects($this->never())->method('sendToDevice');
        $service->expects($this->never())->method('sendToAccount');
        $job->handle($service);
    }

    public function test_revoked_link_is_checked_at_dispatch_and_delivery(): void
    {
        $job = $this->job();
        $this->account->patients()->updateExistingPivot($this->patient->patient_id, ['status' => 'pending']);
        $this->assertSkipped($job);
        Queue::fake();
        app(SendAppointmentFcmNotification::class)->handle(AppointmentStatusChanged::fromModel($this->appointment, 'confirmed', $this->account->id));
        Queue::assertNotPushed(SendFcmPushNotification::class);
    }

    public function test_changed_schedule_status_or_booking_owner_invalidates_queued_job(): void
    {
        foreach (['scheduled_date' => now()->addDays(3), 'status' => 'completed', 'booked_by_account_id' => $this->account('other')->id] as $field => $value) {
            $job = $this->job();
            $old = $this->appointment->{$field};
            $this->appointment->update([$field => $value]);
            $this->assertSkipped($job);
            $this->appointment->update([$field => $old]);
        }
    }

    public function test_inactive_account_and_preferences_changed_after_enqueue_are_respected(): void
    {
        $job = $this->job();
        $this->account->update(['is_active' => false]);
        $this->assertSkipped($job);
        $this->account->update(['is_active' => true]);
        foreach (['push_enabled', 'reminders'] as $preference) {
            $job = $this->job();
            $this->account->updateNotificationPreferences([$preference => false]);
            $this->assertSkipped($job);
            $this->account->updateNotificationPreferences([$preference => true]);
        }
    }

    public function test_expired_and_legacy_jobs_are_not_replayed(): void
    {
        $job = $this->job();
        $job->expiresAt = now()->subSecond()->timestamp;
        $this->assertSkipped($job);
        $job = $this->job();
        $job->stateSnapshot = null;
        $job->expiresAt = null;
        $this->assertSkipped(unserialize(serialize($job)));
    }

    public function test_reassigned_and_inactive_devices_are_not_contacted(): void
    {
        $job = $this->job();
        $this->account->deviceTokens()->update(['patient_account_id' => $this->account('new-owner')->id]);
        $this->device('disabled')->update(['is_active' => false]);
        $this->assertSkipped($job);
    }

    public function test_duplicate_event_jobs_send_once_but_later_schedule_change_sends_again(): void
    {
        Queue::fake();
        $event = AppointmentStatusChanged::fromModel($this->appointment, 'rescheduled', $this->account->id);
        $listener = app(SendAppointmentFcmNotification::class);
        $listener->handle($event);
        $listener->handle($event);
        $jobs = Queue::pushed(SendFcmPushNotification::class);
        $this->assertCount(2, $jobs);
        $this->assertSame($jobs[0]->idempotencyKey, $jobs[1]->idempotencyKey);
        $service = $this->createMock(FcmService::class);
        $service->expects($this->exactly(2))->method('sendToDevice')->willReturn(FcmResult::success('fake-accepted'));
        $jobs[0]->handle($service);
        $jobs[1]->handle($service);
        $this->travel(2)->seconds();
        $this->appointment->update(['scheduled_date' => now()->addDays(3)]);
        $listener->handle(AppointmentStatusChanged::fromModel($this->appointment, 'rescheduled', $this->account->id));
        Queue::pushed(SendFcmPushNotification::class)->last()->handle($service);
    }

    public function test_first_device_is_checkpointed_before_second_device_crashes(): void
    {
        $second = $this->device('second');
        $job = $this->job();
        $serialized = serialize($job);
        $service = $this->createMock(FcmService::class);
        $service->expects($this->exactly(2))->method('sendToDevice')->willReturnCallback(function ($device) use ($second) {
            if ($device->id === $second->id) {
                throw new \RuntimeException('simulated interruption');
            }
            return FcmResult::success('fake-accepted');
        });
        try {
            $job->handle($service);
            $this->fail('Expected interruption');
        } catch (\RuntimeException $e) {
            $this->assertSame('simulated interruption', $e->getMessage());
        }
        $retry = $this->createMock(FcmService::class);
        $retry->expects($this->once())->method('sendToDevice')
            ->with($this->callback(fn ($device) => $device->id === $second->id))
            ->willReturn(FcmResult::success('fake-accepted-2'));
        unserialize($serialized)->handle($retry);
    }

    public function test_concurrent_duplicate_waits_for_delivery_lock(): void
    {
        $job = $this->job();
        $lock = Cache::lock($job->getDeliveredCacheKey().':lock', 90);
        $this->assertTrue($lock->get());
        $this->assertSkipped($job);
        $lock->release();
        $service = $this->createMock(FcmService::class);
        $service->expects($this->once())->method('sendToDevice')->willReturn(FcmResult::success('fake'));
        $job->handle($service);
    }

    public function test_automatic_payload_rejects_free_text_nested_phi_and_arbitrary_routes(): void
    {
        $job = new SendFcmPushNotification($this->account->id, 'SECRET_NAME', 'SECRET_DIAGNOSIS', [
            'category' => 'appointment_reminder', 'appointment_id' => (string) $this->appointment->appointment_id,
            'patient_name' => 'SECRET_NAME', 'nested' => ['diagnosis' => 'SECRET_DIAGNOSIS'],
            'route' => '/SECRET_ADDRESS',
        ]);
        $this->assertStringNotContainsString('SECRET', json_encode([$job->title, $job->body, $job->data]));
        $this->assertSame('/calendar', $job->data['route']);
        $this->assertSame('fcm', $job->queue);
        $this->assertNotNull($job->stateSnapshot);
    }

    public function test_vaccination_schedule_and_card_jobs_recheck_patient_authorization(): void
    {
        $schedule = new SendFcmPushNotification($this->account->id, 'Title', 'Body', [
            'category' => 'vaccination_schedule', 'appointment_id' => (string) $this->appointment->appointment_id,
        ]);
        $card = new SendFcmPushNotification($this->account->id, 'Title', 'Body', [
            'category' => 'digital_card', 'patient_id' => (string) $this->patient->patient_id,
        ]);
        $this->assertNotNull($schedule->stateSnapshot);
        $this->assertNotNull($card->stateSnapshot);
        $this->account->patients()->detach($this->patient->patient_id);
        $this->assertSkipped($schedule);
        $this->assertSkipped($card);
    }

    public function test_authorization_revoked_between_devices_stops_remaining_delivery(): void
    {
        $this->device('second');
        $job = $this->job();
        $service = $this->createMock(FcmService::class);
        $service->expects($this->once())->method('sendToDevice')->willReturnCallback(function () {
            $this->account->patients()->detach($this->patient->patient_id);
            return FcmResult::success('fake');
        });
        $job->handle($service);
    }

    public function test_delayed_event_with_old_schedule_is_not_enqueued(): void
    {
        $event = AppointmentStatusChanged::fromModel($this->appointment, 'rescheduled', $this->account->id);
        $this->appointment->update(['appointment_date' => today()->addDays(4)]);
        Queue::fake();
        app(SendAppointmentFcmNotification::class)->handle($event);
        Queue::assertNotPushed(SendFcmPushNotification::class);
    }

    public function test_announcements_include_more_than_fifty_verified_eligible_accounts_once(): void
    {
        Queue::fake();
        $admin = User::factory()->create(['clinic_id' => $this->patient->clinic_id, 'role' => 'admin', 'is_active' => true]);
        Sanctum::actingAs($admin);
        for ($i = 0; $i < 105; $i++) {
            $account = $this->account('recipient-'.$i);
            $account->patients()->attach($this->patient->patient_id, ['status' => 'verified', 'relationship' => 'dependent']);
        }
        $pending = $this->account('pending');
        $pending->patients()->attach($this->patient->patient_id, ['status' => 'pending', 'relationship' => 'dependent']);
        $this->account->updateNotificationPreferences(['announcements' => false]);
        $id = $this->postJson('/api/announcements', ['title' => 'Test', 'message' => 'Test', 'is_published' => true, 'is_urgent' => false])
            ->assertCreated()->json('id');
        Queue::assertPushed(SendFcmPushNotification::class, 105);
        $jobs = Queue::pushed(SendFcmPushNotification::class);
        $this->assertCount(105, $jobs->pluck('patientAccountId')->unique());
        $this->assertSkippedAfterAnnouncementWithdrawal($jobs->first(), $id);
    }

    private function assertSkippedAfterAnnouncementWithdrawal(SendFcmPushNotification $job, int $id): void
    {
        \App\Models\Announcement::whereKey($id)->update(['is_published' => false]);
        $this->assertSkipped($job);
    }

    private function pendingMobileBooking(): Appointment
    {
        Queue::fake();
        $this->account->patients()->updateExistingPivot($this->patient->patient_id, ['status' => 'pending']);
        Sanctum::actingAs($this->account);
        // Client-provided ownership fields must not become the persisted booking owner.
        $response = $this->postJson('/api/mobile/appointments', [
            'patient_id' => $this->patient->patient_id,
            'appointment_type' => 'vaccination',
            'scheduled_date' => today()->addDays(5)->toDateString(),
            'booked_by_account_id' => 999999,
            'patientAccountId' => 999999,
        ])->assertCreated();
        $appointment = Appointment::findOrFail($response->json('appointment_id'));
        $this->assertSame($this->account->id, (int) $appointment->booked_by_account_id);
        $this->assertDatabaseHas('notifications', [
            'type' => 'booking_confirmation', 'appointment_id' => $appointment->getKey(),
            'patient_account_id' => $this->account->id, 'patient_id' => $this->patient->getKey(),
        ]);
        return $appointment;
    }

    private function bookingJob(Appointment $appointment, string $category = 'appointment'): SendFcmPushNotification
    {
        return new SendFcmPushNotification($this->account->id, 'Untrusted title', 'Untrusted body', [
            'category' => $category, 'appointment_id' => (string) $appointment->getKey(),
        ]);
    }

    public function test_pending_mobile_owner_receives_confirmation_reschedule_and_cancellation(): void
    {
        $appointment = $this->pendingMobileBooking();
        $service = $this->createMock(FcmService::class);
        $service->expects($this->exactly(3))->method('sendToDevice')->willReturn(FcmResult::success('fake'));
        foreach (['confirmed' => 'confirmed', 'rescheduled' => 'scheduled', 'cancelled' => 'cancelled'] as $action => $status) {
            Queue::fake();
            $appointment->update(['status' => $status]);
            app(SendAppointmentFcmNotification::class)->handle(
                AppointmentStatusChanged::fromModel($appointment->fresh(), $action, $this->account->id)
            );
            Queue::assertPushed(SendFcmPushNotification::class, 1);
            $job = Queue::pushed(SendFcmPushNotification::class)->first();
            $this->assertNotNull($job->stateSnapshot);
            $this->assertSame('/appointments', $job->data['route']);
            unserialize(serialize($job))->handle($service);
        }
    }

    public function test_pending_link_and_owner_column_without_server_booking_evidence_are_insufficient(): void
    {
        $this->account->patients()->updateExistingPivot($this->patient->getKey(), ['status' => 'pending']);
        $job = $this->bookingJob($this->appointment);
        $this->assertNull($job->stateSnapshot);
        $this->assertSkipped($job);
    }

    public function test_supplied_recipient_and_matching_profile_do_not_authorize_another_pending_account(): void
    {
        $appointment = $this->pendingMobileBooking();
        $other = $this->account('lookalike');
        $other->update(['name' => $this->account->name, 'phone' => $this->account->phone]);
        $other->patients()->attach($this->patient->getKey(), ['status' => 'pending', 'relationship' => 'dependent']);
        Queue::fake();
        app(SendAppointmentFcmNotification::class)->handle(AppointmentStatusChanged::fromModel($appointment, 'confirmed', $other->id));
        Queue::assertNotPushed(SendFcmPushNotification::class);
        $job = new SendFcmPushNotification($other->id, 'Title', 'Body', ['category' => 'appointment', 'appointment_id' => (string) $appointment->getKey()]);
        $this->assertNull($job->stateSnapshot);
        $this->assertSkipped($job);
    }

    public function test_removed_or_transferred_booking_ownership_invalidates_pending_owner_jobs(): void
    {
        $appointment = $this->pendingMobileBooking();
        $other = $this->account('new-booking-owner');
        $other->patients()->attach($this->patient->getKey(), ['status' => 'pending', 'relationship' => 'dependent']);
        foreach ([null, $other->id] as $owner) {
            $appointment->update(['booked_by_account_id' => $this->account->id]);
            $job = $this->bookingJob($appointment);
            $this->assertNotNull($job->stateSnapshot);
            $appointment->update(['booked_by_account_id' => $owner]);
            $this->assertSkipped($job);
        }
        // Changing the owner column does not transfer the original authenticated booking proof.
        $transferred = new SendFcmPushNotification($other->id, 'Title', 'Body', ['category' => 'appointment', 'appointment_id' => (string) $appointment->getKey()]);
        $this->assertNull($transferred->stateSnapshot);
        $this->assertSkipped($transferred);
    }

    public function test_pending_booking_exception_never_authorizes_clinical_notifications(): void
    {
        $appointment = $this->pendingMobileBooking();
        foreach (['appointment_reminder', 'vaccination_due', 'dose_reminder', 'vaccination_schedule'] as $category) {
            $job = $this->bookingJob($appointment, $category);
            $this->assertNull($job->stateSnapshot);
            $this->assertSkipped($job);
        }
        $card = new SendFcmPushNotification($this->account->id, 'Title', 'Body', ['category' => 'digital_card', 'patient_id' => (string) $this->patient->getKey()]);
        $this->assertNull($card->stateSnapshot);
        $this->assertSkipped($card);
    }

    public function test_pending_owner_link_revocation_and_stale_appointment_still_block_delivery(): void
    {
        $appointment = $this->pendingMobileBooking();
        $job = $this->bookingJob($appointment);
        $this->account->patients()->updateExistingPivot($this->patient->getKey(), ['status' => 'rejected']);
        $this->assertSkipped($job);
        $this->assertNull($this->bookingJob($appointment)->stateSnapshot);
        $this->account->patients()->updateExistingPivot($this->patient->getKey(), ['status' => 'pending']);
        foreach (['status' => 'cancelled', 'scheduled_date' => today()->addDays(7)] as $field => $value) {
            $old = $appointment->{$field};
            $job = $this->bookingJob($appointment);
            $appointment->update([$field => $value]);
            $this->assertSkipped($job);
            $appointment->update([$field => $old]);
        }
        $job = $this->bookingJob($appointment);
        $this->account->patients()->detach($this->patient->getKey());
        $this->assertSkipped($job);
    }

    public function test_booking_evidence_is_rechecked_but_marking_confirmation_read_does_not_revoke_it(): void
    {
        $appointment = $this->pendingMobileBooking();
        $job = $this->bookingJob($appointment);
        $proof = \App\Models\Notification::where('type', 'booking_confirmation')->where('appointment_id', $appointment->getKey())->firstOrFail();
        $proof->update(['read_at' => now(), 'status' => 'read']);
        $service = $this->createMock(FcmService::class);
        $service->expects($this->once())->method('sendToDevice')->willReturn(FcmResult::success('fake'));
        $job->handle($service);
        $job = $this->bookingJob($appointment);
        $job->deviceTokenId = $this->account->deviceTokens()->firstOrFail()->id;
        $proof->delete();
        $this->assertSkipped($job);
    }

    public function test_pending_booking_owner_still_requires_active_account_allowlist_and_preferences(): void
    {
        $appointment = $this->pendingMobileBooking();
        $job = $this->bookingJob($appointment);
        $this->account->update(['is_active' => false]);
        $this->assertSkipped($job);
        $this->account->update(['is_active' => true]);
        foreach (['push_enabled', 'appointment_updates'] as $pref) {
            $job = $this->bookingJob($appointment);
            $this->account->updateNotificationPreferences([$pref => false]);
            $this->assertSkipped($job);
            $this->account->updateNotificationPreferences([$pref => true]);
        }
        $job = $this->bookingJob($appointment);
        config(['services.firebase.allowed_patient_account_ids' => '999999']);
        $this->assertSkipped($job);
    }

    public function test_legacy_pending_owner_jobs_without_snapshot_are_not_upgraded_implicitly(): void
    {
        $appointment = $this->pendingMobileBooking();
        $job = $this->bookingJob($appointment);
        $job->stateSnapshot = null;
        $job->expiresAt = null;
        $this->assertSkipped(unserialize(serialize($job)));
    }
}
