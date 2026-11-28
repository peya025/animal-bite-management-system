<?php

namespace Tests\Feature\Reports;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientDetails;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Models\VaccineInventory;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase8AdvancedPlanningAndSupplyScenariosTest extends TestCase
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

    private function createPatient(string $firstName, string $lastName): Patient
    {
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'date_of_birth' => '1995-05-10',
            'gender' => 'female',
            'contact_number' => '09171234567',
        ]);

        PatientDetails::create([
            'patient_id' => $patient->patient_id,
            'address_barangay' => 'Poblacion',
            'address_city_municipality' => 'Tagoloan',
            'address_province' => 'Misamis Oriental',
        ]);

        return $patient;
    }

    public function test_supply_scenario_estimates_distinguish_arv_and_rig_and_evaluate_reorder(): void
    {
        // 1. Seed Inventory batches for the clinic:
        // Batch 1: Speeda (ARV) - 20 vials (unexpired)
        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'SPD-2026-001',
            'current_quantity' => 20,
            'doses_per_vial' => 1,
            'expiration_date' => '2027-05-30',
            'status' => 'active',
        ]);

        // Batch 2: Verorab (ARV) - 6 vials (nearing expiry in 20 days)
        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Verorab',
            'batch_number' => 'VRB-2026-002',
            'current_quantity' => 6,
            'doses_per_vial' => 1,
            'expiration_date' => '2026-12-20',
            'status' => 'active',
        ]);

        // Batch 3: Equirab (ERIG) - 12 vials (unexpired)
        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Equirab',
            'batch_number' => 'EQR-2026-003',
            'current_quantity' => 12,
            'doses_per_vial' => 1,
            'expiration_date' => '2027-08-15',
            'status' => 'active',
        ]);

        // Batch 4: Expired batch (expired on 2026-10-31) -> must NOT be counted as usable stock
        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'SPD-EXP-004',
            'current_quantity' => 10,
            'doses_per_vial' => 1,
            'expiration_date' => '2026-10-31',
            'status' => 'active',
        ]);

        // Batch 5: Depleted batch (0 quantity) -> must not add to count
        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'SPD-DEP-005',
            'current_quantity' => 0,
            'doses_per_vial' => 1,
            'expiration_date' => '2027-01-01',
            'status' => 'depleted',
        ]);

        // 2. Seed clinical episode and administered ARV doses in November
        $p1 = $this->createPatient('Supply', 'PatientOne');
        $ep1 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'case_number' => 'TAG-2026-8001',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-10',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'category_3',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-10 09:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);

        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $ep1->bite_id,
            'plan_type' => 'full_pep',
            'ordered_dose_days' => [0, 3, 7],
            'decided_at' => '2026-11-10 09:00:00',
            'decided_by' => $this->doctor->id,
        ]);

        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $ep1->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-10',
            'diagnosis' => 'Assessed Category III',
            'prescribed_vaccine_type' => 'Speeda',
            'prophylaxis_orders' => ['consultation_treatment_plan' => 'full_pep', 'rig' => 'erig'],
            'administered_by' => $this->doctor->id,
        ]);

        // 2 doses administered locally in November
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $ep1->bite_id,
            'dose_number' => 0,
            'medication_given' => 'Speeda',
            'status' => 'completed',
            'treatment_date' => '2026-11-10',
            'is_external' => false,
            'administered_by' => $this->nurse->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $ep1->bite_id,
            'dose_number' => 3,
            'medication_given' => 'Speeda',
            'status' => 'completed',
            'treatment_date' => '2026-11-13',
            'is_external' => false,
            'administered_by' => $this->nurse->id,
        ]);

        // 3. Seed scheduled appointments in upcoming 7 and 14 days after cutoff (2026-11-30)
        Appointment::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $ep1->bite_id,
            'dose_number' => 7,
            'appointment_date' => '2026-12-05',
            'status' => 'scheduled',
            'created_by' => $this->admin->id,
        ]);

        Appointment::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'bite_id' => $ep1->bite_id,
            'dose_number' => 14,
            'appointment_date' => '2026-12-12',
            'status' => 'scheduled',
            'created_by' => $this->admin->id,
        ]);

        $res = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30');
        $res->assertOk();

        $projections = $res->json('planning_projections');
        $this->assertNotNull($projections);

        // BCS-08.1 Usable stock assertions:
        // ARV = 20 (Speeda) + 6 (Verorab) = 26 vials (expired batch of 10 is excluded)
        $this->assertSame(26, $projections['supply_scenarios']['usable_stock']['arv_vials']);
        // RIG = 12 (Equirab)
        $this->assertSame(12, $projections['supply_scenarios']['usable_stock']['rig_vials']);
        // 6 vials of Verorab expire on 2026-12-20, within 30 days of cutoff 2026-11-30
        $this->assertSame(6, $projections['supply_scenarios']['usable_stock']['arv_expiring_within_30d']);

        // Scheduled demand
        $this->assertSame(1, $projections['supply_scenarios']['demand_projection']['scheduled_doses_next_7d']);
        $this->assertSame(2, $projections['supply_scenarios']['demand_projection']['scheduled_doses_next_14d']);
        $this->assertSame(2, $projections['supply_scenarios']['demand_projection']['scheduled_doses_next_30d']);

        // Model scenarios
        $this->assertArrayHasKey('conservative_im', $projections['supply_scenarios']['scenarios']);
        $this->assertArrayHasKey('intradermal_sharing', $projections['supply_scenarios']['scenarios']);
        $this->assertSame(1.0, (float) $projections['supply_scenarios']['scenarios']['conservative_im']['doses_per_vial']);
        $this->assertSame(2.0, (float) $projections['supply_scenarios']['scenarios']['intradermal_sharing']['doses_per_vial']);

        // A4 Print Pack includes the Phase 8 supply table
        $printRes = $this->get('/api/print/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30');
        $printRes->assertOk();
        $printRes->assertSee('Supply Scenario Projections &amp; Catchment Population Context', false);
        $printRes->assertSee('26 vials');
        $printRes->assertSee('12 vials');
    }

    public function test_population_rates_and_facility_coverage_limitations_disclosure(): void
    {
        $patient = $this->createPatient('PopTest', 'Patient');
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'TAG-2026-8002',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-15',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'category_2',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-15 09:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);

        $res = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30');
        $res->assertOk();

        $popCtx = $res->json('planning_projections.population_context');
        $this->assertSame(75000, $popCtx['catchment_population']);
        $this->assertSame(1, $popCtx['recorded_exposures']);
        // 1 case in 75,000 population = (1 / 75,000) * 100,000 = 1.3 per 100k
        $this->assertSame(1.3, $popCtx['rate_per_100k_period']);
        $this->assertNotNull($popCtx['annualized_rate_per_100k']);

        // BCS-08.2: Transparent facility-coverage limitations
        $limitations = $popCtx['facility_coverage_limitations'];
        $this->assertStringContainsString('clinic presentations at this facility per 100,000 catchment residents', $limitations['presentation_bias']);
        $this->assertStringContainsString('NOT community-wide rabies transmission incidence', $limitations['presentation_bias']);

        // Veterinary surveillance coordination links
        $vetLinks = $res->json('planning_projections.veterinary_surveillance_links');
        $agencies = collect($vetLinks['partner_agencies'])->pluck('agency_name')->all();
        $this->assertContains('Tagoloan Municipal Agriculture Office (MAO)', $agencies);
        $this->assertContains('Misamis Oriental Provincial Veterinary Office (PVO)', $agencies);
    }

    public function test_baseline_forecast_evaluation_and_simulation_endpoint(): void
    {
        $patient = $this->createPatient('SimTest', 'Patient');
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'TAG-2026-8003',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-12',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'category_2',
            'animal_type' => 'cat',
            'status' => 'active',
            'confirmed_at' => '2026-11-12 09:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);

        $res = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30');
        $res->assertOk();

        // BCS-08.3: Baseline forecast evaluation and disclaimer
        $forecast = $res->json('planning_projections.baseline_forecast');
        $this->assertSame('descriptive_moving_run_rate', $forecast['forecast_model']);
        $this->assertGreaterThanOrEqual(1, $forecast['projected_next_month_presentations']);
        $this->assertStringContainsString('does NOT claim epidemic curve forecasting', $forecast['evaluation_and_limits']['predictive_claim_disclaimer']);

        // Interactive simulation endpoint: custom buffer_days = 30
        $simRes = $this->postJson('/api/reports/bite-summary/supply-projection', [
            'from' => '2026-11-01',
            'to' => '2026-11-30',
            'cutoff' => '2026-11-30',
            'buffer_days' => 30,
        ]);
        $simRes->assertOk();
        $this->assertSame(30, $simRes->json('supply_scenarios.buffer_days_configured'));
    }

    public function test_followup_vial_schedule_enforces_per_day_open_vial_ceil_waiting_d0_and_fifo_expiry_cutoff(): void
    {
        // Reference date is 2026-11-30 (set in setUp).
        // Seed 2 ARV batches with doses_per_vial = 2:
        // - Batch A: 3 vials expiring 2026-12-02 (expires BEFORE Dec 3 -> cannot cover Dec 3!)
        // - Batch B: 2 vials expiring 2027-06-30 (usable after Dec 2)
        // Total starting ARV stock = 5 vials.
        // Also seed 1 TT batch (50 vials) -> must be excluded from ARV count!
        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Verorab',
            'batch_number' => 'VRB-EXP-SOON',
            'current_quantity' => 3,
            'doses_per_vial' => 2,
            'expiration_date' => '2026-12-02',
            'status' => 'active',
        ]);
        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Verorab',
            'batch_number' => 'VRB-LONG',
            'current_quantity' => 2,
            'doses_per_vial' => 2,
            'expiration_date' => '2027-06-30',
            'status' => 'active',
        ]);
        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'TT',
            'batch_number' => 'TT-EXCLUDED',
            'current_quantity' => 50,
            'doses_per_vial' => 1,
            'expiration_date' => '2027-06-30',
            'status' => 'active',
        ]);

        // 1. Seed 1 Form 1 waiting patient registered today (2026-11-30) -> feeds Today's waiting D0 demand
        $waitingPatient = $this->createPatient('Waiting', 'FormOne');
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $waitingPatient->patient_id,
            'case_number' => 'TAG-2026-9001',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-30',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'pending',
            'animal_type' => 'dog',
            'status' => 'active',
            'created_by' => $this->admin->id,
        ]);

        // 2. Seed 1 Category III pending RIG episode (no RIG stock -> RIG shortfall!)
        $cat3Patient = $this->createPatient('Rig', 'Pending');
        $cat3Episode = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $cat3Patient->patient_id,
            'case_number' => 'TAG-2026-9002',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-30',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'severe',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-30 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $cat3Patient->patient_id,
            'bite_id' => $cat3Episode->bite_id,
            'plan_type' => 'full_pep',
            'ordered_dose_days' => [0, 3, 7],
            'decided_at' => '2026-11-30 10:00:00',
            'decided_by' => $this->doctor->id,
        ]);

        // 3. Seed scheduled follow-ups across 3 days (doses_per_vial = 2):
        // - Dec 1: 5 follow-ups -> ceil(5/2) = 3 vials (brand unknown -> Unspecified ARV pool!)
        // - Dec 2: 1 follow-up  -> ceil(1/2) = 1 vial (high wastage risk: 1 leftover dose)
        // - Dec 3: 4 follow-ups -> ceil(4/2) = 2 vials (total committed vials = 3 + 1 + 2 = 6, NOT ceil(10/2) = 5!)
        $schedulePlan = [
            '2026-12-01' => 5,
            '2026-12-02' => 1,
            '2026-12-03' => 4,
        ];
        foreach ($schedulePlan as $dateStr => $count) {
            for ($i = 0; $i < $count; $i++) {
                $p = $this->createPatient("Appt{$dateStr}", "Num{$i}");
                Appointment::create([
                    'clinic_id' => $this->clinic->id,
                    'patient_id' => $p->patient_id,
                    'dose_number' => 3,
                    'scheduled_date' => $dateStr,
                    'appointment_date' => $dateStr,
                    'status' => 'scheduled',
                    'created_by' => $this->admin->id,
                ]);
            }
        }

        $res = $this->getJson('/api/inventory/supply-forecast?horizon=14')->assertOk();

        // TT batch (50 vials) must NOT be counted in ARV usable stock (only 3 + 2 = 5 Verorab vials)
        $res->assertJsonPath('usable_stock.arv_vials', 5);
        $res->assertJsonPath('effective_doses_per_vial', 2);

        // Same-day waiting queue captured (1 Form 1 awaiting today + 1 Form 2 prescribed unstarted = 2 est. D0 doses)
        $res->assertJsonPath('same_day_waiting_demand.form1_awaiting_today', 1);
        $res->assertJsonPath('same_day_waiting_demand.form2_prescribed_unstarted', 1);
        $res->assertJsonPath('same_day_waiting_demand.estimated_waiting_d0_doses', 2);

        // Per-day open-vial ceil check: Dec 1 (5 -> 3), Dec 2 (1 -> 1), Dec 3 (4 -> 2) => 6 committed vials
        $days = collect($res->json('daily_schedule'))->keyBy('date');
        $this->assertSame(3, $days['2026-12-01']['vials_committed_only']);
        $this->assertSame(1, $days['2026-12-02']['vials_committed_only']);
        $this->assertTrue($days['2026-12-02']['high_wastage_risk']);
        $this->assertSame(2, $days['2026-12-03']['vials_committed_only']);
        $res->assertJsonPath('vial_readiness.next_7d_vials_committed_only', 6);

        // Unspecified ARV brand fallback pool retained all 10 unbranded appointments
        $brandPool = collect($res->json('brand_summary'))->firstWhere('brand', 'Unspecified / Any Active ARV');
        $this->assertNotNull($brandPool);
        $this->assertSame(10, $brandPool['scheduled_doses_7d']);

        // Stockout detected (5 vials total, Today needs 1 + Dec 1 needs 3 + Dec 2 needs 1 = 5 -> Dec 3 shortfall!)
        $res->assertJsonPath('vial_readiness.status', 'shortfall');
        $res->assertJsonPath('vial_readiness.projected_stockout_date', '2026-12-03');
        $res->assertJsonPath('vial_readiness.rig_status', 'shortfall');
        $res->assertJsonPath('rig_readiness.immediate_pending_cases', 1);

        // /api/cases/location-summary surfaces compact vial_readiness inside clinical_alerts
        $summaryRes = $this->getJson('/api/cases/location-summary')->assertOk();
        $summaryRes->assertJsonPath('clinical_alerts.vial_readiness.status', 'shortfall');
        $summaryRes->assertJsonPath('clinical_alerts.vial_readiness.usable_arv_vials', 5);
        $summaryRes->assertJsonPath('clinical_alerts.has_critical_alerts', true);
    }
}
