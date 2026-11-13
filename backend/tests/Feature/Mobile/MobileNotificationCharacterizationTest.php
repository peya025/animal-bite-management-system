<?php

namespace Tests\Feature\Mobile;

use App\Models\Clinic;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobileNotificationCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private PatientAccount $patientAccount;
    private PatientAccount $otherAccount;
    private User $staffUser;
    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan Animal Bite Treatment Center',
        ]);

        $this->patientAccount = PatientAccount::create([
            'name'      => 'Maria Santos',
            'email'     => 'maria@example.com',
            'phone'     => '09171234567',
            'password'  => Hash::make('Password123!'),
            'is_active' => true,
        ]);

        $this->otherAccount = PatientAccount::create([
            'name'      => 'Other User',
            'email'     => 'other@example.com',
            'phone'     => '09179999999',
            'password'  => Hash::make('Password123!'),
            'is_active' => true,
        ]);

        $this->staffUser = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Staff Nurse',
            'email'     => 'nurse@clinic.gov.ph',
            'password'  => Hash::make('Password123!'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Baby',
            'last_name'     => 'Santos',
            'date_of_birth' => '2024-01-01',
            'gender'        => 'Female',
        ]);

        $this->patientAccount->patients()->attach($this->patient->patient_id, [
            'relationship' => 'child',
        ]);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/mobile/notifications')->assertStatus(401);
        $this->patchJson('/api/mobile/notifications/read-all')->assertStatus(401);
        $this->patchJson('/api/mobile/notifications/1/read')->assertStatus(401);
    }

    public function test_staff_users_are_forbidden(): void
    {
        Sanctum::actingAs($this->staffUser);

        $this->getJson('/api/mobile/notifications')
            ->assertStatus(403)
            ->assertJson(['message' => 'Patient account authentication is required.']);
    }

    public function test_index_returns_paginated_notifications_with_relationship(): void
    {
        // Notification for linked child patient
        Notification::create([
            'clinic_id'          => $this->clinic->id,
            'patient_account_id' => $this->patientAccount->id,
            'patient_id'         => $this->patient->patient_id,
            'type'               => 'appointment_reminder',
            'title'              => 'Upcoming Booster',
            'message'            => 'Reminder for Day 3 dose',
            'status'             => 'unread',
        ]);

        // General notification without patient_id
        Notification::create([
            'clinic_id'          => $this->clinic->id,
            'patient_account_id' => $this->patientAccount->id,
            'type'               => 'system_alert',
            'title'              => 'Clinic Announcement',
            'message'            => 'Holiday operating hours update',
            'status'             => 'unread',
        ]);

        Sanctum::actingAs($this->patientAccount);

        $response = $this->getJson('/api/mobile/notifications');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'notification_id',
                        'patient_account_id',
                        'title',
                        'message',
                        'status',
                        'relationship',
                    ],
                ],
                'current_page',
                'total',
            ]);

        $items = $response->json('data');
        $this->assertCount(2, $items);

        // Find child notification and assert relationship injected
        $childNotification = collect($items)->firstWhere('patient_id', $this->patient->patient_id);
        $this->assertNotNull($childNotification);
        $this->assertEquals('child', $childNotification['relationship']);

        // General notification defaults to 'self'
        $generalNotification = collect($items)->firstWhere('patient_id', null);
        $this->assertNotNull($generalNotification);
        $this->assertEquals('self', $generalNotification['relationship']);
    }

    public function test_mark_as_read_updates_status_and_invalidates_cache(): void
    {
        $notification = Notification::create([
            'clinic_id'          => $this->clinic->id,
            'patient_account_id' => $this->patientAccount->id,
            'type'               => 'reminder',
            'title'              => 'Dose due',
            'message'            => 'Dose due tomorrow',
            'status'             => 'unread',
        ]);

        Sanctum::actingAs($this->patientAccount);

        // Prime cache
        $this->getJson('/api/mobile/notifications');
        $this->assertTrue(Cache::has("mobile:notifications:account:{$this->patientAccount->id}:page:1"));

        // Mark as read
        $response = $this->patchJson("/api/mobile/notifications/{$notification->notification_id}/read");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'read')
            ->assertJsonPath('notification_id', $notification->notification_id);

        $notification->refresh();
        $this->assertEquals('read', $notification->status);
        $this->assertNotNull($notification->read_at);

        // Cache was invalidated
        $this->assertFalse(Cache::has("mobile:notifications:account:{$this->patientAccount->id}:page:1"));
    }

    public function test_mark_as_read_returns_404_for_notification_of_another_account(): void
    {
        $otherNotification = Notification::create([
            'clinic_id'          => $this->clinic->id,
            'patient_account_id' => $this->otherAccount->id,
            'type'               => 'reminder',
            'title'              => 'Other notification',
            'message'            => 'Not for you',
            'status'             => 'unread',
        ]);

        Sanctum::actingAs($this->patientAccount);

        $this->patchJson("/api/mobile/notifications/{$otherNotification->notification_id}/read")
            ->assertStatus(404);
    }

    public function test_mark_all_as_read_updates_all_unread_and_clears_cache(): void
    {
        Notification::create([
            'clinic_id'          => $this->clinic->id,
            'patient_account_id' => $this->patientAccount->id,
            'type'               => 'reminder',
            'title'              => 'Item 1',
            'message'            => 'Msg 1',
            'status'             => 'unread',
        ]);

        Notification::create([
            'clinic_id'          => $this->clinic->id,
            'patient_account_id' => $this->patientAccount->id,
            'type'               => 'reminder',
            'title'              => 'Item 2',
            'message'            => 'Msg 2',
            'status'             => 'unread',
        ]);

        Sanctum::actingAs($this->patientAccount);

        // Prime cache
        $this->getJson('/api/mobile/notifications');
        $this->assertTrue(Cache::has("mobile:notifications:account:{$this->patientAccount->id}:page:1"));

        $response = $this->patchJson('/api/mobile/notifications/read-all');

        $response->assertStatus(200)
            ->assertJson(['message' => 'All notifications marked as read.']);

        $unreadCount = Notification::where('patient_account_id', $this->patientAccount->id)
            ->where('status', 'unread')
            ->count();

        $this->assertEquals(0, $unreadCount);
        $this->assertFalse(Cache::has("mobile:notifications:account:{$this->patientAccount->id}:page:1"));
    }
}
