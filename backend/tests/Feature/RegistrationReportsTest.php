<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\BiteLocation;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistrationReportsTest extends TestCase
{
    use RefreshDatabase;

    private User $staff;
    private Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 9, 22)->setTime(12, 0));
        $this->clinic = Clinic::create(['name' => 'Reports Test Clinic']);
        $this->staff = User::factory()->create(['clinic_id' => $this->clinic->id, 'role' => 'registration', 'is_active' => true]);
        Sanctum::actingAs($this->staff);
    }

    private function episode(string $biteDate = '2026-09-01', array $days = [0, 3, 7], ?Clinic $clinic = null): BiteIncident
    {
        $clinic ??= $this->clinic;
        $patient = Patient::create(['clinic_id' => $clinic->id, 'patient_number' => Str::uuid()->toString(),
            'first_name' => 'Test', 'last_name' => 'Patient', 'date_of_birth' => '2016-09-15',
            'gender' => 'female', 'contact_number' => '09123456789']);
        $case = BiteIncident::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id,
            'case_number' => Str::uuid()->toString(), 'bite_date' => $biteDate, 'severity' => 'moderate',
            'animal_type' => 'dog', 'animal_status' => 'owned', 'created_by' => $this->staff->id]);
        if ($days) {
            TreatmentPlan::create(['clinic_id' => $clinic->id, 'patient_id' => $patient->patient_id,
                'bite_id' => $case->bite_id, 'plan_type' => 'full_pep', 'status' => 'approved', 'ordered_dose_days' => $days,
                'decided_by' => $this->staff->id, 'decided_at' => now()]);
        }
        return $case;
    }

    private function dose(BiteIncident $case, int $day, string $date, bool $void = false): void
    {
        TreatmentRecord::create(['clinic_id' => $case->clinic_id, 'patient_id' => $case->patient_id,
            'bite_id' => $case->bite_id, 'dose_number' => $day, 'treatment_date' => $date,
            'status' => 'completed', 'voided_at' => $void ? now() : null, 'scheduled_by' => $this->staff->id]);
    }

    private function url(array $params = []): string
    {
        return '/api/reports/registration?'.http_build_query(array_merge(['from' => '2026-09-01', 'to' => '2026-09-22'], $params));
    }

    public function test_completion_uses_prescribed_live_doses_and_excludes_immature_transferred_and_unverified_courses(): void
    {
        $complete = $this->episode();
        foreach ([0 => '2026-09-01', 3 => '2026-09-04', 7 => '2026-09-08'] as $day => $date) $this->dose($complete, $day, $date);
        $this->dose($complete, 3, '2026-09-05'); // Duplicate day is not another required dose.
        $voided = $this->episode();
        $this->dose($voided, 0, '2026-09-01');
        $this->dose($voided, 3, '2026-09-04');
        $this->dose($voided, 7, '2026-09-08', true);
        $recent = $this->episode('2026-09-21');
        $this->dose($recent, 0, '2026-09-21');
        $transferred = $this->episode();
        $transferred->update(['status' => 'transferred_out']);
        $this->dose($transferred, 0, '2026-09-01');
        $unverified = $this->episode('2026-09-01', []);
        $this->dose($unverified, 0, '2026-09-01');
        $this->getJson($this->url(['report' => 'pep']))->assertOk()
            ->assertJsonPath('stats.pep_starts', 5)
            ->assertJsonPath('stats.completion.eligible', 2)
            ->assertJsonPath('stats.completion.completed', 1)
            ->assertJsonPath('stats.completion.rate', 50)
            ->assertJsonPath('stats.completion.excluded', 3)
            ->assertJsonPath('stats.overdue_patients', 1)
            ->assertJsonPath('stats.overdue_doses', 1);
    }

    public function test_followup_uses_current_schedule_and_all_dates_but_does_not_count_returned_doses(): void
    {
        $case = $this->episode('2026-08-01');
        $this->dose($case, 0, '2026-08-01');
        $this->dose($case, 3, '2026-09-01');
        Appointment::create(['clinic_id' => $this->clinic->id, 'patient_id' => $case->patient_id,
            'bite_id' => $case->bite_id, 'appointment_date' => '2026-09-24', 'dose_number' => 7,
            'appointment_type' => 'vaccination', 'status' => 'scheduled', 'created_by' => $this->staff->id]);
        $this->getJson($this->url(['report' => 'followup']))->assertOk()->assertJsonPath('records.total', 0);
        Appointment::where('bite_id', $case->bite_id)->update(['appointment_date' => '2026-09-20']);
        $this->getJson($this->url(['report' => 'followup']))->assertOk()
            ->assertJsonPath('stats.pep_starts', 0)->assertJsonPath('records.total', 1)
            ->assertJsonPath('records.rows.0.dose', 'Day 7')->assertJsonPath('records.rows.0.days_overdue', 2);
    }

    public function test_scope_filters_pagination_print_and_csv_use_the_same_records(): void
    {
        $otherClinic = Clinic::create(['name' => 'Other Clinic']);
        $this->episode('2026-09-01', [0, 3, 7], $otherClinic);
        $a = $this->episode();
        $a->patient->update(['first_name' => '=HYPERLINK("evil")']);
        $this->episode();
        $outside = $this->episode('2026-08-10');
        $this->dose($outside, 0, '2026-08-10');
        $this->getJson($this->url(['report' => 'surveillance', 'per_page' => 1, 'clinic_id' => $otherClinic->id]))->assertOk()
            ->assertJsonPath('stats.incidents', 2)->assertJsonPath('records.total', 2)->assertJsonCount(1, 'records.rows');
        $this->getJson($this->url(['report' => 'surveillance', 'format' => 'print', 'per_page' => 1]))->assertOk()->assertJsonCount(2, 'records.rows');
        $this->getJson($this->url(['category' => 'III']))->assertOk()->assertJsonPath('stats.incidents', 0);
        $csv = $this->get($this->url(['report' => 'surveillance', 'format' => 'csv']))->assertOk()->streamedContent();
        $this->assertStringContainsString("'=HYPERLINK", $csv);
        $this->assertStringNotContainsString($outside->case_number, $csv);
        $this->assertStringContainsString('Reports Test Clinic', $csv);
    }

    public function test_delay_age_location_and_referrals_are_derived_from_incidents_not_registration_dates(): void
    {
        $case = $this->episode('2026-09-01');
        $this->dose($case, 0, '2026-09-03');
        BiteLocation::create(['bite_id' => $case->bite_id, 'barangay' => 'Poblacion', 'municipality' => 'Tagoloan']);
        $case->update(['status' => 'transferred_out', 'transferred_to_facility' => 'Hospital', 'transferred_at' => '2026-09-04']);
        $this->getJson($this->url(['report' => 'surveillance']))->assertOk()
            ->assertJsonPath('stats.delay.average', 2)->assertJsonPath('stats.referral_rate', 100)
            ->assertJsonPath('records.rows.0.age_at_incident', 9)
            ->assertJsonPath('records.rows.0.barangay', 'Poblacion, Tagoloan');
    }

    public function test_empty_metrics_are_unavailable_and_invalid_dates_and_roles_are_rejected(): void
    {
        $this->getJson($this->url())->assertOk()->assertJsonPath('stats.completion.rate', null)->assertJsonPath('stats.delay.average', null);
        $this->getJson($this->url(['from' => '2026-09-23']))->assertUnprocessable();
        $this->getJson($this->url(['to' => '2026-10-01']))->assertUnprocessable();
        $this->staff->update(['role' => 'treatment']);
        $this->getJson($this->url())->assertForbidden();
        $this->staff->update(['role' => 'registration', 'clinic_id' => null]);
        $this->getJson($this->url())->assertForbidden();
    }

    public function test_statistics_include_more_than_five_hundred_cases_and_print_is_not_paginated(): void
    {
        $case = $this->episode();
        $rows = [];
        for ($i = 0; $i < 505; $i++) {
            $rows[] = ['clinic_id' => $this->clinic->id, 'patient_id' => $case->patient_id,
                'case_number' => 'REPORT-'.$i, 'bite_date' => '2026-09-01', 'severity' => 'moderate',
                'created_by' => $this->staff->id, 'status' => 'active'];
        }
        \Illuminate\Support\Facades\DB::table('bite_incidents')->insert($rows);
        $this->getJson($this->url(['report' => 'surveillance']))->assertOk()
            ->assertJsonPath('stats.incidents', 506)->assertJsonPath('stats.patients', 1)
            ->assertJsonPath('records.total', 506)->assertJsonCount(20, 'records.rows');
        $this->getJson($this->url(['report' => 'surveillance', 'format' => 'print']))->assertOk()->assertJsonCount(506, 'records.rows');
    }

    public function test_booster_course_is_checked_against_its_own_ordered_days_and_no_vaccine_is_not_awaiting_d0(): void
    {
        $single = $this->episode('2026-09-01', [0]);
        $single->treatmentPlan->update(['plan_type' => 'single_booster']);
        $this->dose($single, 0, '2026-09-01');
        $none = $this->episode();
        $none->treatmentPlan->update(['plan_type' => 'no_vaccine', 'ordered_dose_days' => [], 'status' => 'completed']);
        $this->getJson($this->url())->assertOk()->assertJsonPath('stats.completion.rate', 100)
            ->assertJsonPath('stats.completion.eligible', 1)->assertJsonPath('stats.awaiting_d0', 0);
    }
}
