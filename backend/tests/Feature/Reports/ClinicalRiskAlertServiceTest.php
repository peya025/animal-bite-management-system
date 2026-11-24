<?php

namespace Tests\Feature\Reports;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClinicalRiskAlertServiceTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan ABTC',
            'municipality' => 'Tagoloan',
            'province' => 'Misamis Oriental',
        ]);

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Clinic Admin',
            'email' => 'admin-alerts@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'first_name' => 'Ana',
            'last_name' => 'Santos',
            'gender' => 'female',
            'date_of_birth' => '1998-04-12',
        ]);

        Sanctum::actingAs($this->admin);
    }

    public function test_location_summary_exposes_clinical_alerts_and_supports_rig_pending_and_unassessed_over_48h_filters()
    {
        $today = Carbon::today();

        // 1. Category III case with RIG pending (<48h) and biting animal died
        $cat3RigPending = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'created_by' => $this->admin->id,
            'bite_date' => $today->toDateString(),
            'bite_place' => 'Poblacion, Tagoloan',
            'severity' => 'severe',
            'animal_type' => 'dog',
            'animal_status' => 'stray',
            'animal_observation_status' => 'died',
            'status' => 'active',
            'confirmed_at' => $today->copy()->subHours(6),
        ]);

        // 2. Category III case with verified ERIG administered (must NOT count as rig_pending)
        $cat3RigGiven = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'created_by' => $this->admin->id,
            'bite_date' => $today->toDateString(),
            'bite_place' => 'Brgy. Poblacion',
            'severity' => 'severe',
            'animal_type' => 'dog',
            'animal_status' => 'owned',
            'animal_observation_status' => 'healthy',
            'status' => 'active',
            'confirmed_at' => $today->copy()->subHours(4),
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $cat3RigGiven->bite_id,
            'dose_number' => 201, // ERIG
            'medication_given' => 'Equirab ERIG',
            'status' => 'administered',
            'treatment_date' => $today->toDateString(),
            'administered_at' => now(),
            'administered_by' => $this->admin->id,
        ]);

        // 3. Stale Form 1 awaiting assessment registered 4 days ago (>48h) with unknown place
        $staleUnassessed = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'created_by' => $this->admin->id,
            'episode_type' => 'pending_assessment',
            'bite_date' => $today->copy()->subDays(4)->toDateString(),
            'bite_place' => null,
            'severity' => 'unassessed',
            'status' => 'awaiting_assessment',
        ]);
        BiteIncident::where('bite_id', $staleUnassessed->bite_id)->update([
            'created_at' => now()->subDays(4),
        ]);

        // 4 & 5. Two more unknown-place cases to trigger data_completeness.unknown_location_warning (>=3)
        for ($i = 0; $i < 2; $i++) {
            BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->patient_id,
                'created_by' => $this->admin->id,
                'bite_date' => $today->toDateString(),
                'bite_place' => 'Unknown',
                'severity' => 'moderate',
                'status' => 'active',
            ]);
        }

        $res = $this->getJson('/api/cases/location-summary')->assertOk();

        // Verify structured clinical alerts
        $res->assertJsonPath('clinical_alerts.rig_pending.total', 1);
        $res->assertJsonPath('clinical_alerts.rig_pending.urgent_within_48h', 1);
        $res->assertJsonPath('clinical_alerts.high_risk_animals.died', 1);
        $res->assertJsonPath('clinical_alerts.workflow_pending.unassessed_over_48h', 1);
        $res->assertJsonPath('clinical_alerts.data_completeness.unknown_location_count', 3);
        $res->assertJsonPath('clinical_alerts.data_completeness.unknown_location_warning', true);

        // Poblacion has 2 finalized Cat III cases in last 7 days -> Cluster alert, and Unknown is NEVER in cluster_zones
        $clusterZones = $res->json('clinical_alerts.cluster_zones');
        $this->assertContains('Poblacion', $clusterZones);
        $this->assertNotContains('Unknown', $clusterZones);

        // Verify legacy risk_score is removed from location rows
        $locations = collect($res->json('locations'));
        $poblacionRow = $locations->firstWhere('normalized_barangay', 'Poblacion');
        $this->assertNotNull($poblacionRow);
        $this->assertArrayNotHasKey('risk_score', $poblacionRow);
        $this->assertEquals('cluster', $poblacionRow['surge_level']);

        // Verify status=rig_pending filter returns only the unadministered Cat III case
        $rigFilterRes = $this->getJson('/api/cases/location-summary?status=rig_pending')->assertOk();
        $rigCaseIds = collect($rigFilterRes->json('cases'))->pluck('bite_id')->all();
        $this->assertEquals([$cat3RigPending->bite_id], $rigCaseIds);

        // Verify status=unassessed_over_48h filter returns only the stale Form 1 case
        $staleFilterRes = $this->getJson('/api/cases/location-summary?status=unassessed_over_48h')->assertOk();
        $staleCaseIds = collect($staleFilterRes->json('cases'))->pluck('bite_id')->all();
        $this->assertEquals([$staleUnassessed->bite_id], $staleCaseIds);

        // Verify artisan command runs cleanly
        $this->artisan('clinic:sync-alerts', ['--clinic' => $this->clinic->id])
            ->assertExitCode(0);
    }

    public function test_public_community_bite_overview_excludes_pii_unknown_places_and_provisional_dates()
    {
        $today = Carbon::today();

        // 3 verified cases in Bal-ason within 7 days -> triggers elevated area notice
        for ($i = 0; $i < 3; $i++) {
            BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->patient_id,
                'created_by' => $this->admin->id,
                'bite_date' => $today->toDateString(),
                'bite_place' => 'Brgy. Bal-ason, Tagoloan',
                'severity' => 'moderate',
                'status' => 'active',
            ]);
        }

        // 4 unknown-place cases and 3 provisional-date cases -> must NEVER appear in public overview
        for ($i = 0; $i < 4; $i++) {
            BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->patient_id,
                'created_by' => $this->admin->id,
                'bite_date' => $today->toDateString(),
                'bite_place' => null,
                'severity' => 'severe',
                'status' => 'active',
            ]);
        }
        for ($i = 0; $i < 3; $i++) {
            BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->patient_id,
                'created_by' => $this->admin->id,
                'bite_date' => $today->toDateString(),
                'bite_date_is_provisional' => true,
                'bite_place' => 'Casinglot',
                'severity' => 'severe',
                'status' => 'active',
            ]);
        }

        $res = $this->getJson('/api/public/community-bite-overview?clinic_id=' . $this->clinic->id)
            ->assertOk();

        $res->assertJsonPath('status', 'caution');
        $areas = collect($res->json('elevated_areas'));
        $this->assertTrue($areas->contains('barangay', 'Bal-ason'));
        $this->assertFalse($areas->contains('barangay', 'Unknown'));
        $this->assertFalse($areas->contains('barangay', 'Casinglot'));

        // Verify zero PII or raw small counts leaked in response body
        $rawBody = $res->getContent();
        $this->assertStringNotContainsString('Ana', $rawBody);
        $this->assertStringNotContainsString('Santos', $rawBody);
        $this->assertArrayNotHasKey('total_7d', $areas->first());
    }

    public function test_admin_can_publish_barangay_advisory_announcement_for_mobile()
    {
        $res = $this->postJson('/api/announcements', [
            'title' => 'Community Bite Caution: Brgy. Bal-ason',
            'message' => 'Please keep pets leashed and wash any bite with soap and water for 15 minutes.',
            'is_published' => true,
            'is_urgent' => true,
            'target_barangay' => 'Bal-ason',
            'expires_on' => Carbon::today()->addDays(7)->toDateString(),
        ])->assertCreated();

        $res->assertJsonPath('target_barangay', 'Bal-ason');
        $res->assertJsonPath('is_urgent', true);

        $publicRes = $this->getJson('/api/public/announcements')->assertOk();
        $this->assertEquals('Bal-ason', $publicRes->json('0.target_barangay'));
    }

    public function test_phase4_header_summary_animal_observation_tracking_and_safety_notifications()
    {
        $today = Carbon::today();

        // Owned dog bite 15 days ago with unknown condition -> Day-14 Observation Check Due!
        $ownedDay15 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'created_by' => $this->admin->id,
            'bite_date' => $today->copy()->subDays(15)->toDateString(),
            'bite_place' => 'Poblacion',
            'severity' => 'moderate',
            'animal_type' => 'dog',
            'animal_status' => 'owned',
            'animal_observation_status' => 'unknown',
            'status' => 'active',
            'confirmed_at' => $today->copy()->subDays(15),
            'confirmed_by' => $this->admin->id,
        ]);

        // Stray dog bite 15 days ago -> must be tagged full_pep_required (NOT day14_check_due)
        $strayDay15 = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'created_by' => $this->admin->id,
            'bite_date' => $today->copy()->subDays(15)->toDateString(),
            'bite_place' => 'Poblacion',
            'severity' => 'severe',
            'animal_type' => 'dog',
            'animal_status' => 'stray',
            'animal_observation_status' => 'unknown',
            'status' => 'active',
            'confirmed_at' => $today->copy()->subDays(15),
            'confirmed_by' => $this->admin->id,
        ]);
        \App\Models\TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $strayDay15->bite_id,
            'plan_type' => 'full_pep',
            'ordered_dose_days' => [0, 3, 7],
            'status' => 'approved',
            'decided_at' => $today->copy()->subDays(15),
            'decided_by' => $this->admin->id,
        ]);

        // 1. Header Clinical Alert Pill summary endpoint
        $headerRes = $this->getJson('/api/cases/clinical-alerts/summary')->assertOk();
        $headerRes->assertJsonPath('rig_pending_total', 1);
        $headerRes->assertJsonPath('day14_observation_due', 1);

        // Verify episode row metadata for owned vs stray
        $locRes = $this->getJson('/api/cases/location-summary')->assertOk();
        $cases = collect($locRes->json('cases'))->keyBy('bite_id');
        $this->assertTrue($cases[$ownedDay15->bite_id]['animal_observation_due']);
        $this->assertSame('day14_check_due', $cases[$ownedDay15->bite_id]['animal_observation_policy']);
        $this->assertFalse($cases[$strayDay15->bite_id]['animal_observation_due']);
        $this->assertSame('full_pep_required', $cases[$strayDay15->bite_id]['animal_observation_policy']);

        // 2. PATCH animal-observation to 'died' -> records dates & triggers real-time animal_risk notification
        $obsRes = $this->patchJson("/api/cases/{$ownedDay15->bite_id}/animal-observation", [
            'animal_observation_status' => 'died',
            'remarks' => 'Owner reported dog died on Day 15.',
        ])->assertOk();

        $obsRes->assertJsonPath('incident.animal_observation_status', 'died');
        $this->assertNotNull($obsRes->json('incident.animal_observation_date'));
        $this->assertNotNull($obsRes->json('incident.animal_last_checked_at'));

        // Verify real-time clinical safety notifications exist & are hidden from registration role
        $this->assertDatabaseHas('notifications', [
            'clinic_id' => $this->clinic->id,
            'type' => 'animal_risk',
            'category' => 'clinical_safety',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('notifications', [
            'clinic_id' => $this->clinic->id,
            'type' => 'rig_pending',
            'category' => 'clinical_safety',
            'is_active' => true,
        ]);

        // Mark animal healthy -> animal_risk notification auto-resolves & policy becomes md_discontinuation_review
        $this->patchJson("/api/cases/{$ownedDay15->bite_id}/animal-observation", [
            'animal_observation_status' => 'healthy',
        ])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'clinic_id' => $this->clinic->id,
            'type' => 'animal_risk',
            'is_active' => false,
        ]);

        $locAfter = $this->getJson('/api/cases/location-summary')->assertOk();
        $updatedRow = collect($locAfter->json('cases'))->firstWhere('bite_id', $ownedDay15->bite_id);
        $this->assertSame('md_discontinuation_review', $updatedRow['animal_observation_policy']);
    }

    public function test_phase4_barangay_advisory_memo_and_daily_turnover_print_views()
    {
        $today = Carbon::today();
        for ($i = 0; $i < 3; $i++) {
            BiteIncident::create([
                'clinic_id' => $this->clinic->id,
                'patient_id' => $this->patient->patient_id,
                'created_by' => $this->admin->id,
                'bite_date' => $today->toDateString(),
                'bite_place' => 'Brgy. Bal-ason, Tagoloan',
                'severity' => 'severe',
                'animal_type' => 'dog',
                'animal_status' => 'stray',
                'status' => 'active',
                'confirmed_at' => $today,
                'confirmed_by' => $this->admin->id,
            ]);
        }

        // 1. Barangay / MAO Advisory Memo PDF view: strictly zero PII + small-cell <5 suppression
        $memoRes = $this->get('/api/print/reports/barangay-advisory-memo?barangay=Bal-ason')
            ->assertOk();
        $memoRes->assertSee('Brgy. Bal-ason');
        $memoRes->assertSee('Punong Barangay');
        $memoRes->assertSee('RA 10173');
        $memoRes->assertSee('< 5 (Small Cell)');
        $memoRes->assertDontSee('Ana Santos');

        // 2. Daily Shift Turnover Print Slip view
        $turnoverRes = $this->get('/api/print/reports/daily-turnover')
            ->assertOk();
        $turnoverRes->assertSee('Daily Shift Turnover Slip');
        $turnoverRes->assertSee('Morning Cold-Chain Preparation');
        $turnoverRes->assertSee('Priority Endorsement 1: Unadministered RIG');
    }
}
