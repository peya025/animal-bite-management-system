<?php

namespace Tests\Feature\Clinic;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicSchedule;
use App\Models\ClinicScheduleException;
use App\Models\Patient;
use App\Models\Role;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClinicScheduleCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan Animal Bite Treatment Center',
            'schedule_drift_policy' => 'forward_only',
            'backward_max_days' => 1,
            'urgent_access_policy' => 'walk_ins_accepted_outside_hours',
        ]);

        $roleAdmin = Role::firstOrCreate(['slug' => 'admin'], [
            'name'          => 'admin',
            'display_name'  => 'Administrator',
            'default_route' => '/admin',
        ]);

        $roleStaff = Role::firstOrCreate(['slug' => 'treatment'], [
            'name'          => 'treatment',
            'display_name'  => 'Treatment Nurse',
            'default_route' => '/queue',
        ]);

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Admin User',
            'email'     => 'admin@clinic.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        $this->staff = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Staff User',
            'email'     => 'staff@clinic.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);
        $this->staff->roles()->attach($roleStaff->id, ['assigned_at' => now()]);
    }

    private function getValidWeeklyPayload(): array
    {
        $days = [];
        for ($i = 0; $i <= 6; $i++) {
            $isOpen = in_array($i, [1, 2, 3, 4, 5]);
            $days[] = [
                'day_of_week'           => $i,
                'is_open'               => $isOpen,
                'open_time'             => $isOpen ? '08:00:00' : null,
                'close_time'            => $isOpen ? '17:00:00' : null,
                'slot_interval_minutes' => 30,
                'max_patients_per_slot' => 10,
            ];
        }

        return ['schedules' => $days];
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/clinics/schedule')->assertStatus(401);
        $this->putJson('/api/clinics/schedule/weekly', [])->assertStatus(401);
        $this->postJson('/api/clinics/schedule/exceptions', [])->assertStatus(401);
        $this->deleteJson('/api/clinics/schedule/exceptions/1')->assertStatus(401);
        $this->putJson('/api/clinics/schedule/policies', [])->assertStatus(401);
        $this->postJson('/api/clinics/schedule/recalculate')->assertStatus(401);
    }

    public function test_non_admin_cannot_access_clinic_schedule_management(): void
    {
        Sanctum::actingAs($this->staff);

        $this->getJson('/api/clinics/schedule')->assertStatus(403);
        $this->putJson('/api/clinics/schedule/weekly', $this->getValidWeeklyPayload())->assertStatus(403);
        $this->postJson('/api/clinics/schedule/exceptions', [
            'exception_date' => '2026-12-25',
            'is_open' => false,
            'reason' => 'Christmas Day',
        ])->assertStatus(403);
    }

    public function test_public_and_staff_can_view_schedule_summary(): void
    {
        // Mobile public endpoint without auth
        $response = $this->getJson('/api/mobile/schedule-summary');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'open_days_of_week',
                'schedules',
                'exceptions',
                'urgent_policy',
                'clinic_info',
            ]);

        // Authenticated staff endpoints
        Sanctum::actingAs($this->staff);

        $clinicSummaryPublic = $this->getJson('/api/clinics/schedule-summary');
        $clinicSummaryPublic->assertStatus(200)
            ->assertJsonStructure([
                'open_days_of_week',
                'schedules',
                'exceptions',
                'urgent_policy',
                'clinic_info',
            ]);

        // Specific clinic endpoint
        $clinicSummary = $this->getJson("/api/clinics/{$this->clinic->id}/schedule-summary");
        $clinicSummary->assertStatus(200)
            ->assertJsonPath('clinic_info.name', 'Tagoloan Animal Bite Treatment Center');
    }

    public function test_admin_can_get_schedule_and_auto_initializes_missing_days(): void
    {
        Sanctum::actingAs($this->admin);

        // Before request, no schedules exist
        $this->assertEquals(0, ClinicSchedule::where('clinic_id', $this->clinic->id)->count());

        $response = $this->getJson('/api/clinics/schedule');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'clinic' => [
                    'id',
                    'name',
                    'schedule_drift_policy',
                    'backward_max_days',
                    'urgent_access_policy',
                ],
                'schedules',
                'exceptions',
            ]);

        // Verifies all 7 days were generated
        $this->assertEquals(7, ClinicSchedule::where('clinic_id', $this->clinic->id)->count());
        $schedules = $response->json('schedules');
        $this->assertCount(7, $schedules);
    }

    public function test_admin_updating_weekly_schedule_validates_input(): void
    {
        Sanctum::actingAs($this->admin);

        // Missing schedules
        $this->putJson('/api/clinics/schedule/weekly', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['schedules']);

        // Incomplete days (size must be 7)
        $this->putJson('/api/clinics/schedule/weekly', ['schedules' => [
            ['day_of_week' => 1, 'is_open' => true],
        ]])->assertStatus(422)
            ->assertJsonValidationErrors(['schedules']);

        // Invalid day_of_week or slot intervals
        $payload = $this->getValidWeeklyPayload();
        $payload['schedules'][0]['day_of_week'] = 99;
        $payload['schedules'][0]['slot_interval_minutes'] = 2; // min is 5

        $this->putJson('/api/clinics/schedule/weekly', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'schedules.0.day_of_week',
                'schedules.0.slot_interval_minutes',
            ]);
    }

    public function test_admin_can_update_weekly_schedule_successfully(): void
    {
        Sanctum::actingAs($this->admin);

        $payload = $this->getValidWeeklyPayload();
        // Modify Saturday to open
        $payload['schedules'][6]['is_open'] = true;
        $payload['schedules'][6]['open_time'] = '09:00:00';
        $payload['schedules'][6]['close_time'] = '14:00:00';

        $response = $this->putJson('/api/clinics/schedule/weekly', $payload);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'schedules',
                'shifted_count',
            ]);

        $this->assertDatabaseHas('clinic_schedules', [
            'clinic_id'   => $this->clinic->id,
            'day_of_week' => 6,
            'is_open'     => 1,
            'open_time'   => '09:00:00',
            'close_time'  => '14:00:00',
        ]);
    }

    public function test_admin_can_store_and_delete_schedule_exception(): void
    {
        Sanctum::actingAs($this->admin);

        // Validation failure
        $this->postJson('/api/clinics/schedule/exceptions', [
            'exception_date' => 'invalid-date',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['exception_date', 'is_open', 'reason']);

        // Valid store
        $storeResponse = $this->postJson('/api/clinics/schedule/exceptions', [
            'exception_date' => '2026-12-25',
            'is_open'        => false,
            'reason'         => 'Christmas Day Holiday',
        ]);

        $storeResponse->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'exception' => ['id', 'exception_date', 'is_open', 'reason'],
                'shifted_count',
            ]);

        $exceptionId = $storeResponse->json('exception.id');

        $this->assertDatabaseHas('clinic_schedule_exceptions', [
            'id'             => $exceptionId,
            'clinic_id'      => $this->clinic->id,
            'exception_date' => '2026-12-25',
            'is_open'        => 0,
            'reason'         => 'Christmas Day Holiday',
        ]);

        // Delete exception
        $deleteResponse = $this->deleteJson("/api/clinics/schedule/exceptions/{$exceptionId}");

        $deleteResponse->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'shifted_count',
            ]);

        $this->assertDatabaseMissing('clinic_schedule_exceptions', [
            'id' => $exceptionId,
        ]);
    }

    public function test_admin_can_list_schedule_exceptions(): void
    {
        Sanctum::actingAs($this->admin);

        ClinicScheduleException::create([
            'clinic_id'      => $this->clinic->id,
            'exception_date' => '2026-11-30',
            'is_open'        => false,
            'reason'         => 'Bonifacio Day',
        ]);

        $response = $this->getJson('/api/clinics/schedule/exceptions');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.reason', 'Bonifacio Day');
    }

    public function test_admin_can_update_policies(): void
    {
        Sanctum::actingAs($this->admin);

        // Validation error on invalid policy enum
        $this->putJson('/api/clinics/schedule/policies', [
            'schedule_drift_policy' => 'invalid_drift',
            'backward_max_days' => 10,
            'urgent_access_policy' => 'invalid_access',
        ])->assertStatus(422)
            ->assertJsonValidationErrors([
                'schedule_drift_policy',
                'backward_max_days',
                'urgent_access_policy',
            ]);

        // Valid update
        $response = $this->putJson('/api/clinics/schedule/policies', [
            'schedule_drift_policy'            => 'nearest',
            'backward_max_days'                => 3,
            'urgent_access_policy'             => 'refer_to_alternate_facility',
            'urgent_referral_facility_name'    => 'Northern Mindanao Medical Center',
            'urgent_referral_facility_address' => 'Capitol Compound, Cagayan de Oro City',
            'urgent_referral_facility_contact' => '09123456780',
            'urgent_referral_instructions'     => 'Proceed to Emergency Room if outside clinic operating hours.',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'clinic' => [
                    'schedule_drift_policy',
                    'backward_max_days',
                    'urgent_access_policy',
                    'urgent_referral_facility_name',
                ],
                'shifted_count',
            ]);

        $this->assertDatabaseHas('clinics', [
            'id'                            => $this->clinic->id,
            'schedule_drift_policy'         => 'nearest',
            'backward_max_days'             => 3,
            'urgent_access_policy'          => 'refer_to_alternate_facility',
            'urgent_referral_facility_name' => 'Northern Mindanao Medical Center',
        ]);
    }

    public function test_admin_can_trigger_recalculation(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/clinics/schedule/recalculate');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'shifted_count',
            ]);
    }

    public function test_schedule_exception_recalculates_and_shifts_scheduled_appointments(): void
    {
        Sanctum::actingAs($this->admin);

        // Ensure baseline Mon-Fri open schedule
        $this->getJson('/api/clinics/schedule');

        // Create a patient with Day 0 treatment and Day 3 scheduled appointment
        $patient = Patient::create([
            'clinic_id'      => $this->clinic->id,
            'first_name'     => 'Juan',
            'last_name'      => 'Dela Cruz',
            'date_of_birth'  => '1990-01-01',
            'gender'         => 'Male',
        ]);

        // Monday Day 0
        $monday = Carbon::parse('2026-11-02'); // Nov 2, 2026 is a Monday
        TreatmentRecord::create([
            'clinic_id'      => $this->clinic->id,
            'patient_id'     => $patient->patient_id,
            'dose_number'    => 0,
            'treatment_date' => $monday->toDateString(),
            'status'         => 'completed',
        ]);

        // Thursday Day 3 scheduled
        $thursday = Carbon::parse('2026-11-05'); // Nov 5, 2026 is a Thursday
        $appointment = Appointment::create([
            'clinic_id'        => $this->clinic->id,
            'patient_id'       => $patient->patient_id,
            'dose_number'      => 3,
            'appointment_date' => $thursday->toDateString(),
            'scheduled_date'   => $thursday->toDateString(),
            'status'           => 'scheduled',
        ]);

        // Admin adds holiday closure exception for Thursday Nov 5
        $response = $this->postJson('/api/clinics/schedule/exceptions', [
            'exception_date' => '2026-11-05',
            'is_open'        => false,
            'reason'         => 'Special Public Holiday',
        ]);

        $response->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $response->json('shifted_count'));

        // Appointment should now be shifted to Friday Nov 6
        $appointment->refresh();
        $this->assertEquals('2026-11-06', Carbon::parse($appointment->scheduled_date)->format('Y-m-d'));
    }
}
