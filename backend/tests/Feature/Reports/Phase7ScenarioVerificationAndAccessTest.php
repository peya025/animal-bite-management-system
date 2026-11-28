<?php

namespace Tests\Feature\Reports;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientDetails;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase7ScenarioVerificationAndAccessTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private User $doctor;
    private User $nurse;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->travelTo(Carbon::create(2026, 11, 30, 14, 0, 0));

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan ABTC',
            'municipality' => 'Tagoloan',
            'province' => 'Misamis Oriental',
            'population' => 75000,
            'health_officer_name' => 'Dr. Jennifer Advincula',
            'status' => 'active',
        ]);

        $this->admin = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->doctor = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'triage',
            'is_active' => true,
        ]);

        $this->nurse = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);
    }

    private function createPatient(
        string $firstName,
        string $lastName,
        string $barangay = 'Poblacion'
    ): Patient {
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'date_of_birth' => '1990-06-15',
            'gender' => 'male',
            'contact_number' => '09171234567',
        ]);

        PatientDetails::create([
            'patient_id' => $patient->patient_id,
            'address_barangay' => $barangay,
            'address_city_municipality' => 'Tagoloan',
            'address_province' => 'Misamis Oriental',
        ]);

        return $patient;
    }

    private function addLocalArvDose(BiteIncident $incident, int $doseNumber, string $date): void
    {
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $incident->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => $doseNumber,
            'medication_given' => 'Speeda',
            'status' => 'completed',
            'treatment_date' => $date,
            'scheduled_date' => $date,
            'is_external' => false,
            'administered_by' => $this->nurse->id,
        ]);
    }

    public function test_empty_dataset_zero_denominators_and_partial_period_flagging(): void
    {
        // 1. Empty period with 0 episodes returns 0 counts and null rates (never 0% or division by zero)
        $emptyRes = $this->getJson('/api/reports/bite-summary?from=2026-08-01&to=2026-08-31&cutoff=2026-08-31');
        $emptyRes->assertOk();

        $this->assertSame(0, $emptyRes->json('scope.record_count'));
        $this->assertFalse((bool) $emptyRes->json('scope.is_partial_period'));
        $this->assertSame(0, $emptyRes->json('indicators.recorded_exposures.value'));
        $this->assertNull($emptyRes->json('indicators.assessment_completion_pct.value'));
        $this->assertSame('no_data', $emptyRes->json('indicators.assessment_completion_pct.unavailable_reason'));
        $this->assertNull($emptyRes->json('indicators.category_III_share_pct.value'));
        $this->assertSame('not_applicable', $emptyRes->json('indicators.category_III_share_pct.unavailable_reason'));
        $this->assertNull($emptyRes->json('indicators.documented_pep_initiation_pct.value'));
        $this->assertSame('not_applicable', $emptyRes->json('indicators.documented_pep_initiation_pct.unavailable_reason'));
        $this->assertNull($emptyRes->json('indicators.mature_course_completion_pct.value'));
        $this->assertNull($emptyRes->json('indicators.rig_receipt_pct.value'));
        $this->assertNull($emptyRes->json('comparison.metrics.recorded_exposures.pct_change'));

        // 2. Partial period (cutoff earlier than period_end) flags is_partial_period = true
        $partialRes = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-15');
        $partialRes->assertOk();
        $this->assertTrue((bool) $partialRes->json('scope.is_partial_period'));

        // 3. Location summary endpoint handles 0 episodes without division by zero
        $locRes = $this->getJson('/api/cases/location-summary?from=2026-08-01&to=2026-08-31&cutoff=2026-08-31');
        $locRes->assertOk();
        $this->assertSame(0, $locRes->json('summary.total_cases'));
        $this->assertSame(0, $locRes->json('doh_summary.pep_and_biologics.recorded_exposures'));
        $this->assertNull($locRes->json('doh_summary.completion_and_outcomes.completion_rate_pct'));

        // 4. Snapshot and A4 Meeting Pack print view render cleanly for an empty dataset
        $snapRes = $this->postJson('/api/reports/bite-summary/snapshots', [
            'from' => '2026-08-01',
            'to' => '2026-08-31',
            'cutoff' => '2026-08-31',
            'title' => 'Empty August 2026 Baseline Snapshot',
        ]);
        $snapRes->assertStatus(201);

        $printRes = $this->get('/api/print/reports/bite-summary?from=2026-08-01&to=2026-08-31&cutoff=2026-08-31');
        $printRes->assertOk();
        $printRes->assertSee('Bite Cases Summary — Reporting and Planning');
    }

    public function test_booster_regimens_continue_existing_schedule_evidence_conflict_and_multi_record_transfer_single_counting(): void
    {
        // Episode 1: Two-dose booster (D0, D3) -> completed against 2-dose booster schedule
        $p1 = $this->createPatient('Booster', 'TwoDose', 'Poblacion');
        $ep1 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'case_number' => 'TAG-2026-7001',
            'episode_type' => 'repeat_exposure',
            'bite_date' => '2026-11-01',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'category_2',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-01 09:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $ep1->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-01',
            'diagnosis' => 'Repeat exposure - 2 dose booster',
            'prescribed_vaccine_type' => 'Speeda',
            'prophylaxis_orders' => ['consultation_treatment_plan' => 'two_dose_booster', 'rig' => 'none'],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $ep1->bite_id,
            'plan_type' => 'two_dose_booster',
            'ordered_dose_days' => [0, 3],
            'decided_at' => '2026-11-01 09:00:00',
            'decided_by' => $this->doctor->id,
        ]);
        $this->addLocalArvDose($ep1, 0, '2026-11-01');
        $this->addLocalArvDose($ep1, 3, '2026-11-04');

        // Episode 2: Single booster (D0) -> completed against 1-dose booster schedule
        $p2 = $this->createPatient('Booster', 'SingleDose', 'Baluarte');
        $ep2 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p2->patient_id,
            'case_number' => 'TAG-2026-7002',
            'episode_type' => 'repeat_exposure',
            'bite_date' => '2026-11-02',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Baluarte',
            'severity' => 'category_2',
            'animal_type' => 'cat',
            'status' => 'active',
            'confirmed_at' => '2026-11-02 09:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p2->patient_id,
            'bite_id' => $ep2->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-02',
            'diagnosis' => 'Repeat exposure - single booster',
            'prescribed_vaccine_type' => 'Speeda',
            'prophylaxis_orders' => ['consultation_treatment_plan' => 'single_booster', 'rig' => 'none'],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p2->patient_id,
            'bite_id' => $ep2->bite_id,
            'plan_type' => 'single_booster',
            'ordered_dose_days' => [0],
            'decided_at' => '2026-11-02 09:00:00',
            'decided_by' => $this->doctor->id,
        ]);
        $this->addLocalArvDose($ep2, 0, '2026-11-02');

        // Episode 3: Continue existing schedule (linked to Episode 1) -> counted as continuing_episodes, not duplicating new_course_prescribed
        $ep3 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'case_number' => 'TAG-2026-7003',
            'episode_type' => 'repeat_exposure',
            'bite_date' => '2026-11-03',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'category_2',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-03 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $ep3->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-03',
            'diagnosis' => 'Continue existing schedule',
            'prophylaxis_orders' => ['consultation_treatment_plan' => 'continue_existing_schedule', 'rig' => 'none'],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $ep3->bite_id,
            'plan_type' => 'continue_existing_schedule',
            'continued_from_bite_id' => $ep1->bite_id,
            'ordered_dose_days' => [0, 3],
            'decided_at' => '2026-11-03 10:00:00',
            'decided_by' => $this->doctor->id,
        ]);

        // Episode 4: Conflict between explicit No PEP decision and actual vaccine administration
        $p4 = $this->createPatient('Conflict', 'NoPepWithDose', 'Casinglot');
        $ep4 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p4->patient_id,
            'case_number' => 'TAG-2026-7004',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-06',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Casinglot',
            'severity' => 'category_1',
            'animal_type' => 'dog',
            'status' => 'completed_no_pep',
            'confirmed_at' => '2026-11-06 09:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p4->patient_id,
            'bite_id' => $ep4->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-06',
            'diagnosis' => 'Category I - No PEP required',
            'outcome' => 'completed_without_injection',
            'prophylaxis_orders' => ['consultation_treatment_plan' => 'no_vaccine', 'rig' => 'none'],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p4->patient_id,
            'bite_id' => $ep4->bite_id,
            'plan_type' => 'no_vaccine',
            'ordered_dose_days' => [],
            'decided_at' => '2026-11-06 09:00:00',
            'decided_by' => $this->doctor->id,
        ]);
        // Conflicting vaccine dose recorded on the same episode
        $this->addLocalArvDose($ep4, 1, '2026-11-06');

        // Episode 5: Multiple treatment records + transfer on a single episode -> counted once, no double counting
        $p5 = $this->createPatient('MultiRecord', 'TransferEpisode', 'Natumolan');
        $ep5 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p5->patient_id,
            'case_number' => 'TAG-2026-7005',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-08',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Natumolan',
            'severity' => 'category_3',
            'animal_type' => 'dog',
            'status' => 'transferred_out',
            'transferred_to_facility' => 'NMMC Regional ABTC',
            'transferred_at' => '2026-11-08 15:00:00',
            'confirmed_at' => '2026-11-08 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p5->patient_id,
            'bite_id' => $ep5->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-08',
            'diagnosis' => 'Initial consultation',
            'prophylaxis_orders' => ['consultation_treatment_plan' => 'full_pep', 'rig' => 'erig'],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p5->patient_id,
            'bite_id' => $ep5->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-08',
            'diagnosis' => 'Referred to NMMC after D0',
            'outcome' => 'Transferred/Referred',
            'referred_to' => 'NMMC Regional ABTC',
            'prophylaxis_orders' => ['consultation_treatment_plan' => 'full_pep', 'rig' => 'erig'],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p5->patient_id,
            'bite_id' => $ep5->bite_id,
            'plan_type' => 'full_pep',
            'ordered_dose_days' => [0, 3, 7],
            'decided_at' => '2026-11-08 10:00:00',
            'decided_by' => $this->doctor->id,
        ]);
        $this->addLocalArvDose($ep5, 1, '2026-11-08');

        $res = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30');
        $res->assertOk();

        // 5 total episodes recorded, 4 unique patients (p1 had 2 episodes)
        $this->assertSame(5, $res->json('indicators.recorded_exposures.value'));
        $this->assertSame(4, $res->json('indicators.unique_patients.value'));
        $this->assertSame(5, $res->json('indicators.finalized_assessments.value'));

        // Continuing episode (ep3) is separated from new_course_prescribed (ep1, ep2, ep5 = 3)
        $this->assertSame(3, $res->json('indicators.new_course_prescribed.value'));
        $this->assertSame(1, $res->json('indicators.continuing_episodes.value'));

        // Both booster regimens (ep1 2-dose booster, ep2 single booster) matured and completed
        $this->assertSame(2, $res->json('indicators.completed_mature_courses.value'));

        // Episode 4 conflict is surfaced in data_quality.documentation_gaps.conflicting_records
        $this->assertSame(1, $res->json('data_quality.documentation_gaps.conflicting_records'));

        // Episode 5 is counted once in transferred_referred
        $this->assertSame(1, $res->json('indicators.transferred_referred.value'));
    }

    public function test_role_permissions_unassigned_clinic_cross_clinic_isolation_and_print_token_authentication(): void
    {
        $patient = $this->createPatient('ClinicA', 'ProtectedPatient', 'Poblacion');
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'TAG-2026-7101',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-10',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'category_2',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-10 09:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);

        $snapRes = $this->postJson('/api/reports/bite-summary/snapshots', [
            'from' => '2026-11-01',
            'to' => '2026-11-30',
            'cutoff' => '2026-11-30',
            'notes' => 'Clinic A Protected Snapshot',
        ]);
        $snapRes->assertStatus(201);
        $snapshotId = $snapRes->json('snapshot.snapshot_id');

        $actionRes = $this->postJson('/api/reports/bite-summary/actions', [
            'snapshot_id' => $snapshotId,
            'category' => 'iec_campaign',
            'barangay' => 'Poblacion',
            'observed_pattern' => 'Elevated Category II exposures in Poblacion',
            'proposed_action' => 'Conduct barangay IEC campaign and dog vaccination coordination',
        ]);
        $actionRes->assertStatus(201);
        $actionId = $actionRes->json('action.action_id');

        // 1. Unauthenticated requests are rejected with 401
        Auth::forgetGuards();
        $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30')->assertStatus(401);
        $this->getJson('/api/reports/bite-summary/cases?from=2026-11-01&to=2026-11-30')->assertStatus(401);
        $this->getJson('/api/reports/bite-summary/snapshots')->assertStatus(401);
        $this->getJson('/api/reports/bite-summary/actions')->assertStatus(401);
        $this->get('/print/reports/bite-summary?from=2026-11-01&to=2026-11-30')->assertStatus(401);

        // 2. Unauthorized mobile PatientAccount & inactive staff user are forbidden (403)
        $patientAccount = PatientAccount::create([
            'name' => 'Mobile Patient',
            'email' => 'patient.mobile@example.com',
            'phone' => '09179998888',
            'password' => 'password123',
            'is_active' => true,
        ]);
        Sanctum::actingAs($patientAccount);
        $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30')->assertStatus(403);
        $this->getJson('/api/reports/bite-summary/cases?from=2026-11-01&to=2026-11-30')->assertStatus(403);
        $this->getJson('/api/reports/bite-summary/snapshots')->assertStatus(403);
        $this->getJson('/api/reports/bite-summary/actions')->assertStatus(403);

        $inactiveStaff = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'admin',
            'is_active' => false,
        ]);
        Sanctum::actingAs($inactiveStaff);
        $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30')->assertStatus(403);

        // 3. Unassigned clinic staff user (clinic_id = null) is denied (403)
        $unassignedStaff = User::factory()->create([
            'clinic_id' => null,
            'role' => 'admin',
            'is_active' => true,
        ]);
        Sanctum::actingAs($unassignedStaff);
        $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30')->assertStatus(403);
        $this->get('/api/print/reports/bite-summary?from=2026-11-01&to=2026-11-30')->assertStatus(403);

        // 4. Cross-clinic isolation: Clinic B staff cannot read or mutate Clinic A data even with ?clinic_id override
        $clinicB = Clinic::create([
            'name' => 'Villanueva ABTC',
            'municipality' => 'Villanueva',
            'province' => 'Misamis Oriental',
            'status' => 'active',
        ]);
        $clinicBAdmin = User::factory()->create([
            'clinic_id' => $clinicB->id,
            'role' => 'admin',
            'is_active' => true,
        ]);
        Sanctum::actingAs($clinicBAdmin);

        // Explicit cross-clinic query parameter override is rejected with 403
        $this->getJson("/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&clinic_id={$this->clinic->id}")
            ->assertStatus(403);
        $this->getJson("/api/reports/bite-summary/cases?from=2026-11-01&to=2026-11-30&clinic_id={$this->clinic->id}")
            ->assertStatus(403);

        // Default clinic-scoped query returns only Clinic B data (0 episodes)
        $crossSummary = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30');
        $crossSummary->assertOk();
        $this->assertSame($clinicB->id, $crossSummary->json('scope.clinic_id'));
        $this->assertSame(0, $crossSummary->json('indicators.recorded_exposures.value'));

        $crossCases = $this->getJson('/api/reports/bite-summary/cases?from=2026-11-01&to=2026-11-30');
        $crossCases->assertOk();
        $this->assertCount(0, $crossCases->json('cases'));

        $this->getJson("/api/reports/bite-summary/snapshots/{$snapshotId}")->assertStatus(404);
        $this->putJson("/api/reports/bite-summary/actions/{$actionId}", ['status' => 'Completed'])->assertStatus(404);
        $this->patchJson("/api/reports/bite-summary/actions/{$actionId}", ['status' => 'Completed'])->assertStatus(404);

        // 5. Web & API print token authentication (?token=...) succeeds for valid token and rejects expired token
        Auth::forgetGuards();
        $validToken = $this->admin->createToken('print-token')->plainTextToken;

        $webPrintRes = $this->get("/print/reports/bite-summary?snapshot_id={$snapshotId}&token=" . urlencode($validToken));
        $webPrintRes->assertOk();
        $webPrintRes->assertSee('Tagoloan ABTC');
        $webPrintRes->assertSee((string) $snapRes->json('snapshot.snapshot_code'));
        $webPrintRes->assertDontSee('ProtectedPatient');

        $expiredTokenModel = $this->admin->createToken('expired-print-token');
        $expiredTokenModel->accessToken->forceFill(['expires_at' => now()->subHour()])->save();

        $this->get("/print/reports/bite-summary?snapshot_id={$snapshotId}&token=" . urlencode($expiredTokenModel->plainTextToken))
            ->assertStatus(401);
    }
}
