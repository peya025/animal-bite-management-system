<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\NotificationRead;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationBellTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic;
    protected User $admin;
    protected User $doctor;
    protected User $nurse;
    protected NotificationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan Animal Bite Center',
            'code' => 'TABC',
            'email' => 'clinic@test.com',
            'phone' => '09123456789',
            'address' => 'Poblacion, Tagoloan, Misamis Oriental',
            'status' => 'active',
        ]);

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->doctor = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Dr. Smith',
            'email' => 'doctor@test.com',
            'password' => bcrypt('password'),
            'role' => 'triage',
            'is_active' => true,
        ]);

        $this->nurse = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Nurse Joy',
            'email' => 'nurse@test.com',
            'password' => bcrypt('password'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $this->service = app(NotificationService::class);
    }

    public function test_new_vaccine_preset_creates_setup_notification()
    {
        $preset = VaccineTypePreset::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_name' => 'Rabipur PCECV',
            'category' => 'Anti-Rabies Vaccines (ARV)',
            'default_open_vial_hours' => 8,
        ]);

        $notif = $this->service->notifyVaccinePresetCreated($preset, $this->admin);

        $this->assertDatabaseHas('notifications', [
            'notification_id' => $notif->notification_id,
            'category' => 'inventory',
            'title' => 'New Vaccine Setup',
        ]);
        $this->assertStringContainsString('New vaccine setup: Rabipur PCECV', $notif->message);
    }

    public function test_stock_received_creates_distinct_stock_notification()
    {
        $inventory = VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Verorab 0.5ml',
            'batch_number' => 'VR-BATCH-99',
            'current_quantity' => 50,
            'expiration_date' => Carbon::now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        $notif = $this->service->notifyStockReceived($inventory, $this->admin, 50);

        $this->assertDatabaseHas('notifications', [
            'notification_id' => $notif->notification_id,
            'category' => 'inventory',
            'title' => 'Stock Received',
        ]);
        $this->assertStringContainsString('50 vials of Verorab 0.5ml (Batch #VR-BATCH-99)', $notif->message);
    }

    public function test_near_expiry_and_expired_batch_detection_and_resolution()
    {
        // Batch 1: Expired yesterday with 10 vials remaining
        $expiredBatch = VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Verorab',
            'batch_number' => 'VR-EXP-1',
            'current_quantity' => 10,
            'expiration_date' => Carbon::yesterday()->toDateString(),
            'status' => 'active',
        ]);

        // Batch 2: Expiring in 10 days with 20 vials
        $nearBatch = VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Rabipur',
            'batch_number' => 'RP-NEAR-1',
            'current_quantity' => 20,
            'expiration_date' => Carbon::today()->addDays(10)->toDateString(),
            'status' => 'active',
        ]);

        $this->service->syncExpiryAlerts($this->clinic->id);

        $this->assertDatabaseHas('notifications', [
            'clinic_id' => $this->clinic->id,
            'alert_key' => "batch_expired:{$expiredBatch->inventory_id}",
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('notifications', [
            'clinic_id' => $this->clinic->id,
            'alert_key' => "batch_near_expiry:{$nearBatch->inventory_id}",
            'is_active' => true,
        ]);

        // When near batch is depleted (quantity = 0), alert is resolved
        $nearBatch->update(['current_quantity' => 0, 'status' => 'depleted']);
        $this->service->syncExpiryAlerts($this->clinic->id);

        $this->assertDatabaseHas('notifications', [
            'alert_key' => "batch_near_expiry:{$nearBatch->inventory_id}",
            'is_active' => false,
        ]);
    }

    public function test_low_stock_and_out_of_stock_alert_lifecycle()
    {
        VaccineTypePreset::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_name' => 'Speeda',
            'default_open_vial_hours' => 8,
        ]);

        // Speeda has 0 inventory -> should trigger Out of Stock
        $this->service->syncInventoryAlerts($this->clinic->id);

        $this->assertDatabaseHas('notifications', [
            'clinic_id' => $this->clinic->id,
            'alert_key' => "out_of_stock:clinic_{$this->clinic->id}:speeda",
            'is_active' => true,
        ]);

        // Stock received: 5 vials (<= low threshold 10) -> transitions to Low Stock
        $batch = VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'SP-001',
            'current_quantity' => 5,
            'expiration_date' => Carbon::today()->addMonths(5)->toDateString(),
            'status' => 'active',
        ]);

        $this->service->syncInventoryAlerts($this->clinic->id);

        // Out of stock alert should be resolved
        $this->assertDatabaseHas('notifications', [
            'alert_key' => "out_of_stock:clinic_{$this->clinic->id}:speeda",
            'is_active' => false,
        ]);
        // Low stock alert should be active
        $this->assertDatabaseHas('notifications', [
            'alert_key' => "low_stock:clinic_{$this->clinic->id}:speeda",
            'is_active' => true,
        ]);

        // Add 50 more vials -> total 55 > 10 threshold -> all alerts resolved
        $batch->update(['current_quantity' => 55]);
        $this->service->syncInventoryAlerts($this->clinic->id);

        $this->assertDatabaseHas('notifications', [
            'alert_key' => "low_stock:clinic_{$this->clinic->id}:speeda",
            'is_active' => false,
        ]);
    }

    public function test_overdue_vaccination_alert_and_resolution()
    {
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'first_name' => 'Pedro',
            'last_name' => 'Penduko',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
        ]);

        $incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'created_by' => $this->doctor->id,
            'bite_date' => Carbon::now()->subDays(10)->toDateString(),
            'severity' => 'severe',
            'status' => 'active',
        ]);

        $appt = Appointment::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'appointment_date' => Carbon::yesterday()->toDateString(),
            'scheduled_date' => Carbon::yesterday()->toDateString(),
            'dose_number' => 2,
            'status' => 'scheduled',
        ]);

        $this->service->syncOverdueVaccinationAlerts($this->clinic->id);

        $this->assertDatabaseHas('notifications', [
            'clinic_id' => $this->clinic->id,
            'alert_key' => "overdue_appt:{$appt->appointment_id}",
            'is_active' => true,
        ]);

        // When dose is administered, the alert resolves
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => 2,
            'status' => 'administered',
            'treatment_date' => Carbon::today()->toDateString(),
        ]);

        $this->service->syncOverdueVaccinationAlerts($this->clinic->id);

        $this->assertDatabaseHas('notifications', [
            'alert_key' => "overdue_appt:{$appt->appointment_id}",
            'is_active' => false,
        ]);
    }

    public function test_high_risk_area_alert_matches_bite_map_analytics()
    {
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'first_name' => 'Maria',
            'last_name' => 'Clara',
            'gender' => 'female',
            'date_of_birth' => '1995-05-05',
        ]);

        // Create 2 Category III incidents in Poblacion this month
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'created_by' => $this->doctor->id,
            'bite_date' => Carbon::now()->toDateString(),
            'bite_place' => 'Poblacion',
            'severity' => 'severe', // Cat III
            'status' => 'active',
        ]);
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'created_by' => $this->doctor->id,
            'bite_date' => Carbon::now()->toDateString(),
            'bite_place' => 'Poblacion',
            'severity' => 'severe', // Cat III
            'status' => 'active',
        ]);

        $this->service->syncHighRiskAreaAlerts($this->clinic->id);

        $monthKey = Carbon::now()->format('Y-m');
        $this->assertDatabaseHas('notifications', [
            'clinic_id' => $this->clinic->id,
            'alert_key' => "high_risk_area:clinic_{$this->clinic->id}:poblacion:{$monthKey}",
            'category' => 'high_risk',
            'is_active' => true,
        ]);
    }

    public function test_per_user_read_unread_persistence_and_badge_count()
    {
        $notif1 = Notification::create([
            'clinic_id' => $this->clinic->id,
            'type' => 'test',
            'category' => 'system',
            'title' => 'Test Notification 1',
            'message' => 'Message 1',
            'is_active' => true,
        ]);
        $notif2 = Notification::create([
            'clinic_id' => $this->clinic->id,
            'type' => 'test',
            'category' => 'system',
            'title' => 'Test Notification 2',
            'message' => 'Message 2',
            'is_active' => true,
        ]);

        // Initial unread count for Doctor: 2
        $this->assertEquals(2, $this->service->getUnreadCountForUser($this->doctor));
        $this->assertEquals(2, $this->service->getUnreadCountForUser($this->nurse));

        // Doctor marks notif1 as read
        $this->service->markAsRead($notif1, $this->doctor);

        // Doctor should have 1 unread; Nurse still has 2 unread
        $this->assertEquals(1, $this->service->getUnreadCountForUser($this->doctor));
        $this->assertEquals(2, $this->service->getUnreadCountForUser($this->nurse));

        // Doctor marks all as read
        $this->service->markAllAsReadForUser($this->doctor);
        $this->assertEquals(0, $this->service->getUnreadCountForUser($this->doctor));
        $this->assertEquals(2, $this->service->getUnreadCountForUser($this->nurse));
    }

    public function test_api_notification_endpoints()
    {
        Notification::create([
            'clinic_id' => $this->clinic->id,
            'type' => 'test',
            'category' => 'inventory',
            'title' => 'Low Stock',
            'message' => 'Speeda is low',
            'action_url' => '/inventory',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/notifications');

        $response->assertOk()
            ->assertJsonStructure(['notifications', 'unread_count'])
            ->assertJsonPath('unread_count', 1);

        $notifId = $response->json('notifications.0.id');

        // Mark as read via API
        $readResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/notifications/{$notifId}/read");

        $readResponse->assertOk();

        // Check unread count is now 0
        $countResponse = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/notifications/unread-count');
        $countResponse->assertOk()->assertJsonPath('unread_count', 0);
    }

    public function test_queue_check_in_creates_notification()
    {
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'first_name' => 'Juana',
            'last_name' => 'Cruz',
            'gender' => 'female',
            'date_of_birth' => '1998-08-08',
        ]);

        $queue = Queue::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'queue_number' => 12,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'waiting',
            'checked_in_at' => now(),
            'checked_in_by' => $this->admin->id,
        ]);

        $notif = $this->service->notifyQueueEvent($queue->load('patient'), 'checked_in', $this->admin);

        $this->assertDatabaseHas('notifications', [
            'notification_id' => $notif->notification_id,
            'category' => 'queue',
            'role' => 'triage',
        ]);
        $this->assertStringContainsString('Queue #12, Triage', $notif->message);
    }

    public function test_duplicate_prevention_on_repeated_syncs()
    {
        VaccineTypePreset::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_name' => 'Speeda',
            'default_open_vial_hours' => 8,
        ]);

        // Sync 5 times in a row
        for ($i = 0; $i < 5; $i++) {
            $this->service->syncActiveAlerts($this->clinic->id);
        }

        // Only 1 out_of_stock alert should exist for Speeda
        $count = Notification::where('clinic_id', $this->clinic->id)
            ->where('alert_key', "out_of_stock:clinic_{$this->clinic->id}:speeda")
            ->where('is_active', true)
            ->count();

        $this->assertEquals(1, $count);
    }

    public function test_role_visibility_filtering()
    {
        // Notification for triage only
        Notification::create([
            'clinic_id' => $this->clinic->id,
            'role' => 'triage',
            'type' => 'test_triage',
            'category' => 'queue',
            'title' => 'Triage Only',
            'message' => 'For Doctor',
            'is_active' => true,
        ]);

        // Notification for treatment only
        Notification::create([
            'clinic_id' => $this->clinic->id,
            'role' => 'treatment',
            'type' => 'test_treatment',
            'category' => 'queue',
            'title' => 'Treatment Only',
            'message' => 'For Nurse',
            'is_active' => true,
        ]);

        $doctorNotifs = $this->service->getNotificationsForUser($this->doctor);
        $nurseNotifs = $this->service->getNotificationsForUser($this->nurse);

        $this->assertTrue($doctorNotifs->contains('title', 'Triage Only'));
        $this->assertFalse($doctorNotifs->contains('title', 'Treatment Only'));

        $this->assertTrue($nurseNotifs->contains('title', 'Treatment Only'));
        $this->assertFalse($nurseNotifs->contains('title', 'Triage Only'));

        $registrationStaff = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Reg Staff',
            'email' => 'reg@test.com',
            'password' => bcrypt('password'),
            'role' => 'registration',
            'is_active' => true,
        ]);

        Notification::create([
            'clinic_id' => $this->clinic->id,
            'role' => null,
            'type' => 'inventory_low_stock',
            'category' => 'inventory',
            'title' => 'Low Stock Notice',
            'message' => 'Inventory is low',
            'is_active' => true,
        ]);

        $regNotifs = $this->service->getNotificationsForUser($registrationStaff);
        $this->assertFalse($regNotifs->contains('title', 'Low Stock Notice'));
    }

    public function test_high_risk_area_resolution_when_records_corrected()
    {
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'first_name' => 'Maria',
            'last_name' => 'Clara',
            'gender' => 'female',
            'date_of_birth' => '1995-05-05',
        ]);

        $incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'created_by' => $this->doctor->id,
            'bite_date' => Carbon::now()->toDateString(),
            'bite_place' => 'Barangay Central',
            'severity' => 'severe', // Cat III -> 150% score
            'status' => 'active',
        ]);

        $this->service->syncHighRiskAreaAlerts($this->clinic->id);

        $monthKey = Carbon::now()->format('Y-m');
        $alertKey = "high_risk_area:clinic_{$this->clinic->id}:barangay-central:{$monthKey}";

        $this->assertDatabaseHas('notifications', [
            'alert_key' => $alertKey,
            'is_active' => true,
        ]);

        // Record correction: incident changed to minor (Cat I), so score drops to 0%
        $incident->update(['severity' => 'minor']);

        $this->service->syncHighRiskAreaAlerts($this->clinic->id);

        $this->assertDatabaseHas('notifications', [
            'alert_key' => $alertKey,
            'is_active' => false,
        ]);
    }

    public function test_notifications_isolation_and_sorting_newest_first()
    {
        $olderNotif = Notification::create([
            'clinic_id'  => $this->clinic->id,
            'type'       => 'test_older',
            'category'   => 'system',
            'title'      => 'Older Notification',
            'message'    => 'Older message',
            'created_at' => Carbon::now()->subHours(2),
        ]);

        $newerNotif = Notification::create([
            'clinic_id'  => $this->clinic->id,
            'type'       => 'test_newer',
            'category'   => 'system',
            'title'      => 'Newer Notification',
            'message'    => 'Newer message',
            'created_at' => Carbon::now()->subMinutes(5),
        ]);

        // Verify sorting: newer notification should come first
        $docNotifs = $this->service->getNotificationsForUser($this->doctor);
        $this->assertGreaterThanOrEqual(2, $docNotifs->count());
        $this->assertEquals($newerNotif->notification_id, $docNotifs[0]['id']);

        // Doctor marks the newer notification as read
        $this->service->markAsRead($newerNotif, $this->doctor);

        // Doctor's view: newerNotif is read, olderNotif is unread
        $docNotifsAfter = $this->service->getNotificationsForUser($this->doctor);
        $docNewer = collect($docNotifsAfter)->firstWhere('id', $newerNotif->notification_id);
        $docOlder = collect($docNotifsAfter)->firstWhere('id', $olderNotif->notification_id);
        $this->assertTrue($docNewer['is_read']);
        $this->assertFalse($docNewer['is_unread']);
        $this->assertFalse($docOlder['is_read']);
        $this->assertTrue($docOlder['is_unread']);

        // Nurse's view: both remain unread; doctor's read action has ZERO effect on nurse
        $nurseNotifs = $this->service->getNotificationsForUser($this->nurse);
        $nurseNewer = collect($nurseNotifs)->firstWhere('id', $newerNotif->notification_id);
        $nurseOlder = collect($nurseNotifs)->firstWhere('id', $olderNotif->notification_id);
        $this->assertFalse($nurseNewer['is_read']);
        $this->assertTrue($nurseNewer['is_unread']);
        $this->assertFalse($nurseOlder['is_read']);
        $this->assertTrue($nurseOlder['is_unread']);
    }
}

