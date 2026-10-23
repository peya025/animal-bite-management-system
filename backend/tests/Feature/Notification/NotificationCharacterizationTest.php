<?php

namespace Tests\Feature\Notification;

use App\Models\Clinic;
use App\Models\Notification;
use App\Models\NotificationRead;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private Clinic $otherClinic;
    private User $admin;
    private User $nurse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create([
            'name'   => 'Tagoloan ABTC',
            'code'   => 'TABC',
            'status' => 'active',
        ]);

        $this->otherClinic = Clinic::create([
            'name'   => 'Other Clinic',
            'code'   => 'OC',
            'status' => 'active',
        ]);

        $roleAdmin = Role::firstOrCreate(['slug' => 'clinic_admin'], [
            'name' => 'clinic_admin',
            'display_name' => 'Clinic Admin',
            'default_route' => '/dashboard',
        ]);

        $roleNurse = Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'name' => 'intake_nurse',
            'display_name' => 'Intake Nurse',
            'default_route' => '/queue',
        ]);

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Dr. Admin',
            'email'     => 'admin@tagoloan.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        $this->nurse = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Nurse Joy',
            'email'     => 'joy@tagoloan.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);
        $this->nurse->roles()->attach($roleNurse->id, ['assigned_at' => now()]);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/notifications')->assertStatus(401);
        $this->getJson('/api/notifications/unread-count')->assertStatus(401);
        $this->postJson('/api/notifications/1/read')->assertStatus(401);
        $this->postJson('/api/notifications/read-all')->assertStatus(401);
    }

    public function test_index_returns_user_notifications_and_unread_count(): void
    {
        Notification::create([
            'clinic_id' => $this->clinic->id,
            'type'      => 'system',
            'category'  => 'inventory',
            'title'     => 'Low Stock Alert',
            'message'   => 'Rabies vaccine stock is low',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/notifications');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'notifications' => [
                    '*' => [
                        'id',
                        'title',
                        'message',
                        'text',
                        'category',
                        'type',
                        'is_active',
                        'is_unread',
                        'is_read',
                        'icon',
                    ],
                ],
                'unread_count',
            ]);

        $this->assertCount(1, $response->json('notifications'));
        $this->assertEquals(1, $response->json('unread_count'));
        $this->assertTrue($response->json('notifications.0.is_unread'));
        $this->assertFalse($response->json('notifications.0.is_read'));
    }

    public function test_index_respects_limit_parameter(): void
    {
        Sanctum::actingAs($this->admin);

        for ($i = 1; $i <= 5; $i++) {
            Notification::create([
                'clinic_id' => $this->clinic->id,
                'type'      => 'system',
                'category'  => 'inventory',
                'title'     => "Alert {$i}",
                'message'   => "Message {$i}",
                'is_active' => true,
            ]);
        }

        $response = $this->getJson('/api/notifications?limit=2');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('notifications'));
        $this->assertEquals(5, $response->json('unread_count'));
    }

    public function test_unread_count_returns_correct_number(): void
    {
        Sanctum::actingAs($this->admin);

        Notification::create([
            'clinic_id' => $this->clinic->id,
            'type'      => 'system',
            'category'  => 'inventory',
            'title'     => 'Stock 1',
            'message'   => 'Msg 1',
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/notifications/unread-count');

        $response->assertStatus(200)
            ->assertExactJson([
                'unread_count' => 1,
            ]);
    }

    public function test_mark_as_read_successfully_marks_notification(): void
    {
        $notif = Notification::create([
            'clinic_id' => $this->clinic->id,
            'type'      => 'system',
            'category'  => 'inventory',
            'title'     => 'Low Stock Alert',
            'message'   => 'Rabies vaccine stock is low',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/notifications/{$notif->notification_id}/read");

        $response->assertStatus(200)
            ->assertExactJson([
                'success' => true,
                'message' => 'Notification marked as read.',
            ]);

        $this->assertDatabaseHas('notification_reads', [
            'notification_id' => $notif->notification_id,
            'user_id'         => $this->admin->id,
        ]);

        // Verify unread count is now 0 for admin
        $countResponse = $this->getJson('/api/notifications/unread-count');
        $countResponse->assertStatus(200)->assertJson(['unread_count' => 0]);
    }

    public function test_mark_as_read_returns_404_when_notification_does_not_exist(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/notifications/99999/read');
        $response->assertStatus(404);
    }

    public function test_mark_as_read_returns_404_when_notification_belongs_to_another_clinic(): void
    {
        $notifOtherClinic = Notification::create([
            'clinic_id' => $this->otherClinic->id,
            'type'      => 'system',
            'category'  => 'inventory',
            'title'     => 'Other Clinic Alert',
            'message'   => 'Other Clinic Message',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/notifications/{$notifOtherClinic->notification_id}/read");
        $response->assertStatus(404);
    }

    public function test_mark_all_as_read_marks_all_visible_notifications_for_user(): void
    {
        $notif1 = Notification::create([
            'clinic_id' => $this->clinic->id,
            'type'      => 'system',
            'category'  => 'inventory',
            'title'     => 'Alert 1',
            'message'   => 'Message 1',
            'is_active' => true,
        ]);

        $notif2 = Notification::create([
            'clinic_id' => $this->clinic->id,
            'type'      => 'system',
            'category'  => 'inventory',
            'title'     => 'Alert 2',
            'message'   => 'Message 2',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/notifications/read-all');

        $response->assertStatus(200)
            ->assertExactJson([
                'success' => true,
                'message' => 'All notifications marked as read.',
            ]);

        $this->assertDatabaseHas('notification_reads', [
            'notification_id' => $notif1->notification_id,
            'user_id'         => $this->admin->id,
        ]);

        $this->assertDatabaseHas('notification_reads', [
            'notification_id' => $notif2->notification_id,
            'user_id'         => $this->admin->id,
        ]);

        $countResponse = $this->getJson('/api/notifications/unread-count');
        $countResponse->assertStatus(200)->assertJson(['unread_count' => 0]);
    }
}
