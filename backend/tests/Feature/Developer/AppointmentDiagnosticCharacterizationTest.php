<?php

namespace Tests\Feature\Developer;

use App\Http\Controllers\Developer\AppointmentDiagnosticController;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicSchedule;
use App\Models\Patient;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AppointmentDiagnosticCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $developerUser;
    private User $staffUser;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['auth:sanctum', 'active.user', 'role:developer'])->prefix('api')->group(function () {
            Route::get('/developer/diagnostics/appointments', [AppointmentDiagnosticController::class, 'scan']);
            Route::post('/developer/diagnostics/appointments/repair-all', [AppointmentDiagnosticController::class, 'repairAll']);
            Route::post('/developer/diagnostics/appointments/repair-single', [AppointmentDiagnosticController::class, 'repairSingle']);
        });

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan Animal Bite Treatment Center',
        ]);

        $this->developerUser = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Dev Specialist',
            'email'     => 'developer@abtc.test',
            'password'  => Hash::make('Password123!'),
            'role'      => 'developer',
            'is_active' => true,
        ]);

        $this->staffUser = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Nurse Staff',
            'email'     => 'nurse@abtc.test',
            'password'  => Hash::make('Password123!'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/developer/diagnostics/appointments');

        $response->assertStatus(401);
    }

    public function test_non_developer_role_is_forbidden(): void
    {
        Sanctum::actingAs($this->staffUser, ['*']);

        $response = $this->getJson('/api/developer/diagnostics/appointments');

        $response->assertStatus(403);
    }

    public function test_developer_can_scan_appointments(): void
    {
        Sanctum::actingAs($this->developerUser, ['*']);

        $response = $this->getJson('/api/developer/diagnostics/appointments');

        $response->assertOk()
            ->assertJsonStructure([
                'clinic_id',
                'scanned_at',
                'health_score',
                'summary' => [
                    'total_appointments',
                    'total_anomalies',
                    'critical_count',
                    'warning_count',
                    'info_count',
                    'fixable_count',
                ],
                'role_breakdown',
                'anomalies',
            ]);

        $this->assertEquals($this->clinic->id, $response->json('clinic_id'));
    }

    public function test_developer_can_run_repair_all(): void
    {
        Sanctum::actingAs($this->developerUser, ['*']);

        $response = $this->postJson('/api/developer/diagnostics/appointments/repair-all');

        $response->assertOk()
            ->assertJsonStructure([
                'message',
                'details' => [
                    'repaired_count',
                    'total_fixable',
                    'log',
                ],
            ]);
    }

    public function test_repair_single_validates_input(): void
    {
        Sanctum::actingAs($this->developerUser, ['*']);

        $response = $this->postJson('/api/developer/diagnostics/appointments/repair-single', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['id', 'auto_fix_action']);
    }

    public function test_repair_single_returns_422_when_unfixable(): void
    {
        Sanctum::actingAs($this->developerUser, ['*']);

        $response = $this->postJson('/api/developer/diagnostics/appointments/repair-single', [
            'id'              => 'diag-invalid-999',
            'appointment_id'  => 999999,
            'auto_fix_action' => 'invalid_action',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Unable to auto-repair this specific issue. Please inspect manual records.',
            ]);
    }

    public function test_repair_single_success_shifts_date(): void
    {
        Sanctum::actingAs($this->developerUser, ['*']);

        // Set up clinic schedule for Monday through Friday
        ClinicSchedule::create([
            'clinic_id'           => $this->clinic->id,
            'day_of_week'         => 1, // Monday
            'is_open'             => true,
            'opening_time'        => '08:00:00',
            'closing_time'        => '17:00:00',
            'max_appointments'    => 50,
            'slot_duration'       => 15,
        ]);

        $patient = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Test',
            'last_name'     => 'Patient',
            'date_of_birth' => '1995-01-01',
            'gender'        => 'Male',
        ]);

        $appointment = Appointment::create([
            'clinic_id'        => $this->clinic->id,
            'patient_id'       => $patient->patient_id,
            'appointment_type' => 'vaccination',
            'dose_number'      => 3,
            'scheduled_date'   => Carbon::tomorrow()->format('Y-m-d'),
            'appointment_date' => Carbon::tomorrow()->format('Y-m-d'),
            'status'           => 'scheduled',
        ]);

        $response = $this->postJson('/api/developer/diagnostics/appointments/repair-single', [
            'id'              => 'diag-test-123',
            'appointment_id'  => $appointment->appointment_id,
            'auto_fix_action' => 'shift_to_resolved_date',
        ]);

        $response->assertOk()
            ->assertJson([
                'message' => "Issue 'diag-test-123' repaired successfully.",
            ]);
    }
}
