<?php

namespace Tests\Feature;

use App\Models\{Appointment, BiteIncident, BiteIncidentIntake, Clinic, Patient, PatientAccount, TreatmentPlan, TreatmentRecord, User};
use App\Services\Clinical\BiteIncidentIntakeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OngoingCourseCheckInTest extends TestCase
{
    use RefreshDatabase;

    private function course(): array
    {
        $clinic = Clinic::create(['name' => 'Test Clinic']);
        $patient = Patient::create(['clinic_id' => $clinic->id, 'first_name' => 'Test', 'last_name' => 'Patient', 'gender' => 'male']);
        $staff = User::create(['clinic_id' => $clinic->id, 'name' => 'Staff', 'email' => 'staff@test.com', 'password' => bcrypt('password'), 'role' => 'registration', 'is_active' => true]);
        $bite = BiteIncident::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_date' => today(), 'created_by' => $staff->id, 'episode_number' => 1, 'episode_type' => 'primary', 'status' => 'active', 'site_washed' => true, 'exposure_type' => 'transdermal_bite', 'severity' => 'moderate', 'animal_status' => 'owned']);
        TreatmentPlan::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $bite->bite_id, 'plan_type' => 'full_pep', 'status' => 'approved', 'ordered_dose_days' => [0, 3, 7]]);
        TreatmentRecord::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $bite->bite_id, 'dose_number' => 0, 'status' => 'completed', 'treatment_date' => today()]);
        return [$clinic, $patient, $staff, $bite];
    }

    public function test_scheduled_dated_doses_do_not_complete_primary_course(): void
    {
        [$clinic, $patient, , $bite] = $this->course();
        foreach ([3, 7] as $dose) {
            TreatmentRecord::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $bite->bite_id, 'dose_number' => $dose, 'status' => 'scheduled', 'treatment_date' => today()->addDays($dose)]);
        }
        $this->assertFalse($patient->fresh()->has_completed_primary);
    }

    public function test_mobile_intake_cannot_create_another_exposure_after_day_zero(): void
    {
        [$clinic, $patient, $staff, $bite] = $this->course();
        $account = PatientAccount::create(['name' => 'Test', 'email' => 'patient@test.com', 'password' => bcrypt('password'), 'phone' => '09123456789']);
        $appointment = Appointment::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'booked_by_account_id' => $account->id, 'appointment_type' => 'consultation', 'status' => 'scheduled', 'scheduled_date' => today(), 'appointment_date' => today()]);
        $intake = BiteIncidentIntake::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'patient_account_id' => $account->id, 'appointment_id' => $appointment->appointment_id, 'bite_date' => today(), 'site_washed' => true, 'exposure_type' => 'bite', 'animal_type' => 'dog', 'animal_status' => 'owned', 'status' => 'pending']);
        $result = app(BiteIncidentIntakeService::class)->checkIn($intake, $staff);
        $this->assertSame(422, $result['status']);
        $this->assertSame('ongoing_treatment_course', $result['data']['code']);
        $this->assertDatabaseCount('bite_incidents', 1);
        $this->assertDatabaseCount('queues', 0);
        $this->assertNull($intake->fresh()->bite_id);
        $this->assertSame('scheduled', $appointment->fresh()->status);
    }

    public function test_follow_up_keeps_the_existing_exposure_and_repeated_check_in_is_safe(): void
    {
        [$clinic, $patient, $staff, $bite] = $this->course();
        $appointment = Appointment::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $bite->bite_id, 'appointment_type' => 'follow_up_vaccination', 'dose_number' => 3, 'status' => 'missed', 'scheduled_date' => today(), 'appointment_date' => today()]);
        $course = $patient->fresh()->ongoing_course;
        $this->assertSame($appointment->appointment_id, $course['appointment_id']);
        $this->assertSame(3, $course['next_dose']);
        $service = app(\App\Services\AppointmentService::class);
        foreach ([1, 2] as $attempt) {
            $response = $service->processCheckIn($clinic->id, $staff, $patient->patient_id, $appointment, today()->toDateString());
            $this->assertSame(200, $response->getStatusCode());
            $this->assertSame($bite->bite_id, $response->getData(true)['queue']['bite_id']);
        }
        $this->assertDatabaseCount('bite_incidents', 1);
        $this->assertDatabaseCount('queues', 1);
        $this->assertDatabaseHas('queues', ['bite_id' => $bite->bite_id, 'visit_type' => 'follow_up']);
    }

    public function test_completed_course_is_not_blocked_and_voided_doses_do_not_complete_it(): void
    {
        [$clinic, $patient, , $bite] = $this->course();
        foreach ([3, 7] as $dose) {
            $record = TreatmentRecord::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $bite->bite_id, 'dose_number' => $dose, 'status' => 'completed', 'treatment_date' => today()]);
        }
        $this->assertTrue($patient->fresh()->has_completed_primary);
        $this->assertNull($patient->fresh()->ongoing_course);
        $record->forceFill(['voided_at' => now()])->save();
        $this->assertFalse($patient->fresh()->has_completed_primary);
        $this->assertSame(7, $patient->fresh()->ongoing_course['next_dose']);
    }

    public function test_registration_check_in_returns_follow_up_direction_after_day_zero(): void
    {
        [$clinic, $patient, $staff] = $this->course();
        $result = app(\App\Services\Clinical\PatientService::class)->checkInReturningPatient($clinic->id, $patient->patient_id, $staff);
        $this->assertSame(422, $result['status']);
        $this->assertSame('ongoing_treatment_course', $result['data']['code']);
        $this->assertDatabaseCount('bite_incidents', 1);
        $this->assertDatabaseCount('queues', 0);
    }

    public function test_past_primary_completion_does_not_allow_new_exposure_during_current_course(): void
    {
        [$clinic, $patient, $staff, $bite] = $this->course();
        foreach ([3, 7] as $dose) {
            TreatmentRecord::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $bite->bite_id, 'dose_number' => $dose, 'status' => 'completed', 'treatment_date' => today()]);
        }
        $current = $bite->replicate(['case_number']);
        $current->episode_number = 2;
        $current->save();
        TreatmentPlan::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $current->bite_id, 'plan_type' => 'two_dose_booster', 'status' => 'approved', 'ordered_dose_days' => [0, 3]]);
        TreatmentRecord::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id, 'bite_id' => $current->bite_id, 'dose_number' => 0, 'status' => 'completed', 'treatment_date' => today()]);
        $result = app(\App\Services\Clinical\BiteCaseService::class)->registerNewExposure($clinic->id, ['patient_id' => $patient->patient_id, 'bite_date' => today()->toDateString()], $staff, []);
        $this->assertSame(422, $result['status']);
        $this->assertSame('ongoing_treatment_course', $result['data']['code']);
        $this->assertDatabaseCount('bite_incidents', 2);
    }
}
