<?php

namespace Tests\Feature\Audit;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\ClinicSchedule;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditLogCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private User $nurse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create(['name' => 'Tagoloan ABTC']);

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
        $this->getJson('/api/audit-logs')->assertStatus(401);
        $this->getJson('/api/audit-logs/summary')->assertStatus(401);
        $this->getJson('/api/audit-logs/user/' . $this->admin->id)->assertStatus(401);
    }

    public function test_non_admin_users_are_forbidden(): void
    {
        Sanctum::actingAs($this->nurse);

        $this->getJson('/api/audit-logs')->assertStatus(403);
        $this->getJson('/api/audit-logs/summary')->assertStatus(403);
        $this->getJson('/api/audit-logs/user/' . $this->nurse->id)->assertStatus(403);
    }

    public function test_index_returns_paginated_staff_audit_logs_only(): void
    {
        Sanctum::actingAs($this->admin);

        // Staff log
        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->admin->id,
            'action'      => 'login',
            'ip_address'  => '192.168.1.10',
            'description' => 'Admin logged in',
        ]);

        // Anonymous/system log (user_id = null)
        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => null,
            'action'      => 'public.view',
            'ip_address'  => '192.168.1.99',
            'description' => 'Anonymous page viewed',
        ]);

        $response = $this->getJson('/api/audit-logs');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'current_page',
                'data' => [
                    '*' => [
                        'id',
                        'clinic_id',
                        'user_id',
                        'action',
                        'ip_address',
                        'description',
                        'user' => [
                            'id',
                            'name',
                            'email',
                            'role',
                        ],
                    ],
                ],
                'first_page_url',
                'from',
                'last_page',
                'total',
            ]);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($this->admin->id, $data[0]['user_id']);
        $this->assertEquals('Admin logged in', $data[0]['description']);
    }

    public function test_index_filters_by_user_id(): void
    {
        Sanctum::actingAs($this->admin);

        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->admin->id,
            'action'      => 'created',
            'ip_address'  => '10.0.0.1',
            'description' => 'Admin created a record',
        ]);

        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->nurse->id,
            'action'      => 'updated',
            'ip_address'  => '10.0.0.2',
            'description' => 'Nurse updated a record',
        ]);

        $response = $this->getJson('/api/audit-logs?user_id=' . $this->nurse->id);

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($this->nurse->id, $data[0]['user_id']);
        $this->assertEquals('Nurse updated a record', $data[0]['description']);
    }

    public function test_index_filters_by_action(): void
    {
        Sanctum::actingAs($this->admin);

        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->admin->id,
            'action'      => 'login',
            'ip_address'  => '10.0.0.1',
            'description' => 'Login event',
        ]);

        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->admin->id,
            'action'      => 'logout',
            'ip_address'  => '10.0.0.1',
            'description' => 'Logout event',
        ]);

        $response = $this->getJson('/api/audit-logs?action=login');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('login', $data[0]['action']);
    }

    public function test_index_filters_by_date_range(): void
    {
        Sanctum::actingAs($this->admin);

        // Created 5 days ago
        $logOld = AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->admin->id,
            'action'      => 'old_event',
            'ip_address'  => '10.0.0.1',
            'description' => 'Old event',
        ]);
        $logOld->created_at = Carbon::now()->subDays(5);
        $logOld->save();

        // Created today
        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->admin->id,
            'action'      => 'recent_event',
            'ip_address'  => '10.0.0.1',
            'description' => 'Recent event',
        ]);

        $yesterday = Carbon::yesterday()->toDateString();
        $tomorrow = Carbon::tomorrow()->toDateString();

        $response = $this->getJson("/api/audit-logs?date_from={$yesterday}&date_to={$tomorrow}");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('recent_event', $data[0]['action']);
    }

    public function test_index_filters_by_search_matching_ip_or_description(): void
    {
        Sanctum::actingAs($this->admin);

        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->admin->id,
            'action'      => 'check_ip',
            'ip_address'  => '172.16.254.1',
            'description' => 'Normal activity',
        ]);

        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->admin->id,
            'action'      => 'check_desc',
            'ip_address'  => '10.0.0.1',
            'description' => 'Suspicious inventory override',
        ]);

        // Search IP
        $resIp = $this->getJson('/api/audit-logs?search=172.16.254');
        $resIp->assertStatus(200);
        $this->assertCount(1, $resIp->json('data'));
        $this->assertEquals('check_ip', $resIp->json('data.0.action'));

        // Search Description
        $resDesc = $this->getJson('/api/audit-logs?search=inventory');
        $resDesc->assertStatus(200);
        $this->assertCount(1, $resDesc->json('data'));
        $this->assertEquals('check_desc', $resDesc->json('data.0.action'));
    }

    public function test_index_respects_custom_per_page(): void
    {
        Sanctum::actingAs($this->admin);

        for ($i = 1; $i <= 6; $i++) {
            AuditLog::create([
                'clinic_id'   => $this->clinic->id,
                'user_id'     => $this->admin->id,
                'action'      => "action_{$i}",
                'ip_address'  => '10.0.0.1',
                'description' => "Event {$i}",
            ]);
        }

        $response = $this->getJson('/api/audit-logs?per_page=3');

        $response->assertStatus(200);
        $this->assertCount(3, $response->json('data'));
        $this->assertEquals(3, $response->json('per_page'));
        $this->assertEquals(6, $response->json('total'));
        $this->assertEquals(2, $response->json('last_page'));
    }

    public function test_summary_calculates_daily_weekly_and_operating_hours_metrics(): void
    {
        Sanctum::actingAs($this->admin);

        // Ensure clinic schedule exists for today: 08:00:00 to 17:00:00
        ClinicSchedule::updateOrCreate(
            ['clinic_id' => $this->clinic->id, 'day_of_week' => today()->dayOfWeek],
            ['is_open' => true, 'open_time' => '08:00:00', 'close_time' => '17:00:00']
        );

        // 1. In-hours action today by admin
        $log1 = AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->admin->id,
            'action'      => 'login',
            'ip_address'  => '10.0.0.1',
            'description' => 'Admin morning login',
        ]);
        $log1->created_at = today()->setTime(9, 0, 0);
        $log1->save();

        // 2. Another in-hours action today by nurse
        $log2 = AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->nurse->id,
            'action'      => 'login',
            'ip_address'  => '10.0.0.2',
            'description' => 'Nurse login',
        ]);
        $log2->created_at = today()->setTime(10, 0, 0);
        $log2->save();

        // 3. Second action today by nurse (making nurse most active: 2 actions)
        $log3 = AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->nurse->id,
            'action'      => 'updated',
            'ip_address'  => '10.0.0.2',
            'description' => 'Nurse updated patient',
        ]);
        $log3->created_at = today()->setTime(11, 0, 0);
        $log3->save();

        // 4. After-hours action today (22:30:00) by nurse
        $log4 = AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->nurse->id,
            'action'      => 'viewed',
            'ip_address'  => '10.0.0.2',
            'description' => 'Nurse late night access',
        ]);
        $log4->created_at = today()->setTime(22, 30, 0);
        $log4->save();

        $response = $this->getJson('/api/audit-logs/summary');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'today_actions',
                'week_actions',
                'today_logins',
                'most_active_user' => [
                    'user_id',
                    'action_count',
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'role',
                    ],
                ],
                'suspicious_after_hours',
                'operating_hours' => [
                    'is_open',
                    'open_time',
                    'close_time',
                ],
            ]);

        $this->assertEquals(4, $response->json('today_actions'));
        $this->assertEquals(2, $response->json('today_logins'));
        $this->assertEquals(1, $response->json('suspicious_after_hours'));
        $this->assertEquals($this->nurse->id, $response->json('most_active_user.user_id'));
        $this->assertEquals(3, $response->json('most_active_user.action_count'));
        $this->assertTrue($response->json('operating_hours.is_open'));
        $this->assertEquals('08:00:00', $response->json('operating_hours.open_time'));
        $this->assertEquals('17:00:00', $response->json('operating_hours.close_time'));
    }

    public function test_user_activity_returns_paginated_history_for_specific_user(): void
    {
        Sanctum::actingAs($this->admin);

        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->admin->id,
            'action'      => 'admin_action',
            'ip_address'  => '10.0.0.1',
            'description' => 'Admin did something',
        ]);

        AuditLog::create([
            'clinic_id'   => $this->clinic->id,
            'user_id'     => $this->nurse->id,
            'action'      => 'nurse_action',
            'ip_address'  => '10.0.0.2',
            'description' => 'Nurse did something',
        ]);

        $response = $this->getJson('/api/audit-logs/user/' . $this->nurse->id);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'current_page',
                'data' => [
                    '*' => [
                        'id',
                        'clinic_id',
                        'user_id',
                        'action',
                        'description',
                        'user',
                    ],
                ],
                'per_page',
                'total',
            ]);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($this->nurse->id, $data[0]['user_id']);
        $this->assertEquals('nurse_action', $data[0]['action']);
    }
}
