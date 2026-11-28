<?php

namespace Tests\Feature\Reports;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientDetails;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase6SnapshotsActionsAndExportsTest extends TestCase
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
            'date_of_birth' => '1992-04-15',
            'gender' => 'female',
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

    private function seedAssessedPepEpisode(
        Patient $patient,
        string $caseNumber,
        string $biteDate,
        string $severity,
        string $bitePlace
    ): BiteIncident {
        $incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => $caseNumber,
            'episode_type' => 'primary',
            'bite_date' => $biteDate,
            'bite_date_is_provisional' => false,
            'bite_place' => $bitePlace,
            'severity' => $severity,
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => "{$biteDate} 10:00:00",
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);

        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => $biteDate,
            'diagnosis' => "Assessed {$severity}",
            'prescribed_vaccine_type' => 'Purified Vero Cell Rabies Vaccine',
            'prophylaxis_orders' => [
                'consultation_treatment_plan' => 'full_pep',
                'rig' => 'none',
            ],
            'administered_by' => $this->doctor->id,
        ]);

        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'plan_type' => 'full_pep',
            'ordered_dose_days' => [0, 3, 7],
            'decided_at' => "{$biteDate} 10:00:00",
            'decided_by' => $this->doctor->id,
        ]);

        return $incident;
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

    public function test_snapshot_lifecycle_immutability_and_revision_versioning(): void
    {
        // Episode 1: Form 1 Registration only (awaiting assessment)
        $p1 = $this->createPatient('ConfidentialAlpha', 'PatientOne', 'Poblacion');
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p1->patient_id,
            'case_number' => 'TAG-2026-6001',
            'episode_type' => 'pending_assessment',
            'bite_date' => '2026-11-05',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'unassessed',
            'animal_type' => 'dog',
            'status' => 'awaiting_assessment',
            'created_by' => $this->admin->id,
        ]);

        // Episode 2: Form 2 PEP prescribed, no nurse administration recorded yet
        $p2 = $this->createPatient('ConfidentialBeta', 'PatientTwo', 'Poblacion');
        $ep2 = $this->seedAssessedPepEpisode($p2, 'TAG-2026-6002', '2026-11-06', 'severe', 'Poblacion');

        // Episode 3: Form 3 Nurse D0 treatment recorded
        $p3 = $this->createPatient('ConfidentialGamma', 'PatientThree', 'Poblacion');
        $ep3 = $this->seedAssessedPepEpisode($p3, 'TAG-2026-6003', '2026-11-07', 'moderate', 'Poblacion');
        $this->addLocalArvDose($ep3, 0, '2026-11-07');

        // 1. Create a draft snapshot
        $createRes = $this->postJson('/api/reports/bite-summary/snapshots', [
            'from' => '2026-11-01',
            'to' => '2026-11-30',
            'cutoff' => '2026-11-30',
            'status' => 'draft',
            'notes' => 'Initial November review draft',
        ])->assertCreated();

        $snapshotId = $createRes->json('snapshot.snapshot_id');
        $this->assertNotNull($snapshotId);
        $this->assertSame(1, $createRes->json('snapshot.version'));
        $this->assertSame('draft', $createRes->json('snapshot.status'));
        $this->assertSame(3, $createRes->json('summary_payload.doh_summary.pep_and_biologics.recorded_exposures'));
        $this->assertSame(1, $createRes->json('summary_payload.doh_summary.pep_and_biologics.given_pep'));
        $this->assertSame(1, $createRes->json('summary_payload.doh_summary.pep_and_biologics.no_administration_recorded'));

        // 2. Finalize the snapshot
        $finRes = $this->postJson("/api/reports/bite-summary/snapshots/{$snapshotId}/finalize")
            ->assertOk();
        $this->assertSame('finalized', $finRes->json('snapshot.status'));
        $this->assertNotNull($finRes->json('snapshot.finalized_at'));

        // 3. Re-finalizing an already finalized snapshot is rejected with 422
        $this->postJson("/api/reports/bite-summary/snapshots/{$snapshotId}/finalize")
            ->assertStatus(422);

        // 4. Subsequent clinical change: Nurse records D0 vaccine for Episode 2
        $this->addLocalArvDose($ep2, 0, '2026-11-08');
        Cache::flush();

        // 5. Verify the finalized v1 snapshot remains immutable
        $getV1 = $this->getJson("/api/reports/bite-summary/snapshots/{$snapshotId}")
            ->assertOk();
        $this->assertSame(1, $getV1->json('summary_payload.doh_summary.pep_and_biologics.given_pep'));
        $this->assertSame(1, $getV1->json('summary_payload.doh_summary.pep_and_biologics.no_administration_recorded'));

        // 6. Create a versioned revision pointing to parent_snapshot_id
        $revRes = $this->postJson('/api/reports/bite-summary/snapshots', [
            'from' => '2026-11-01',
            'to' => '2026-11-30',
            'cutoff' => '2026-11-30',
            'status' => 'finalized',
            'parent_snapshot_id' => $snapshotId,
            'notes' => 'Revision after encoding late D0 administration',
        ])->assertCreated();

        $this->assertSame(2, $revRes->json('snapshot.version'));
        $this->assertSame($snapshotId, $revRes->json('snapshot.parent_snapshot_id'));
        $this->assertSame(2, $revRes->json('summary_payload.doh_summary.pep_and_biologics.given_pep'));
        $this->assertSame(0, $revRes->json('summary_payload.doh_summary.pep_and_biologics.no_administration_recorded'));
    }

    public function test_conference_privacy_mode_suppresses_small_cells_and_complementary_cells_and_strips_patient_identifiers(): void
    {
        // Seed 6 episodes in Poblacion (>=5) and 2 episodes in Casinglot (<5)
        for ($i = 1; $i <= 6; $i++) {
            $p = $this->createPatient("PobFirst{$i}", "PobLast{$i}", 'Poblacion');
            $this->seedAssessedPepEpisode($p, "TAG-2026-700{$i}", '2026-11-10', 'moderate', 'Poblacion');
        }

        for ($j = 1; $j <= 2; $j++) {
            $p = $this->createPatient("CasFirst{$j}", "CasLast{$j}", 'Casinglot');
            $this->seedAssessedPepEpisode($p, "TAG-2026-710{$j}", '2026-11-11', 'severe', 'Casinglot');
        }

        $res = $this->getJson('/api/cases/location-summary?privacy_mode=aggregate_only')
            ->assertOk();

        // Patient list must be omitted in aggregate_only mode and no patient names may appear anywhere in JSON
        $this->assertNull($res->json('cases'));
        $rawContent = $res->getContent();
        $this->assertStringNotContainsString('PobFirst1', $rawContent);
        $this->assertStringNotContainsString('CasFirst1', $rawContent);
        $this->assertStringNotContainsString('TAG-2026-7001', $rawContent);

        $locations = collect($res->json('locations'));
        $casinglot = $locations->firstWhere('normalized_barangay', 'Casinglot');
        $poblacion = $locations->firstWhere('normalized_barangay', 'Poblacion');

        $this->assertNotNull($casinglot);
        $this->assertTrue($casinglot['is_small_cell_suppressed']);
        $this->assertSame('<5', $casinglot['display_total_cases']);

        // Because only 1 barangay had <5 cases (Casinglot = 2) and total = 8,
        // complementary suppression must also suppress Poblacion so 8 - 6 = 2 cannot be deduced.
        $this->assertNotNull($poblacion);
        $this->assertTrue($poblacion['is_small_cell_suppressed']);
        $this->assertSame('<5', $poblacion['display_total_cases']);
    }

    public function test_action_register_crud_and_clinic_isolation_and_print_pack(): void
    {
        $p = $this->createPatient('PrivateName', 'DoNotLeak', 'Santa Cruz');
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $p->patient_id,
            'case_number' => 'TAG-2026-8001',
            'episode_type' => 'pending_assessment',
            'bite_date' => '2026-11-12',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Santa Cruz',
            'severity' => 'unassessed',
            'animal_type' => 'dog',
            'status' => 'awaiting_assessment',
            'created_by' => $this->admin->id,
        ]);

        $snapRes = $this->postJson('/api/reports/bite-summary/snapshots', [
            'status' => 'finalized',
            'notes' => 'Pack for LGU meeting',
        ])->assertCreated();
        $snapshotId = $snapRes->json('snapshot.snapshot_id');
        $snapshotCode = $snapRes->json('snapshot.snapshot_code');

        // Create an action item linked to the snapshot
        $actRes = $this->postJson('/api/reports/bite-summary/actions', [
            'snapshot_id' => $snapshotId,
            'finding_key' => 'awaiting_assessment_handoff',
            'observed_pattern' => '1 registered episode stopped at Form 1 awaiting assessment.',
            'supporting_metric' => '1 / 1 (100%)',
            'proposed_action' => 'Audit daily Form 1 to Form 2 triage queue before clinic closing.',
            'owner_name' => 'Nurse Maria Santos',
            'due_date' => '2026-12-05',
            'target_measure' => '0 unresolved Form 1 encounters older than 24h',
            'status' => 'open',
        ])->assertCreated();

        $actionId = $actRes->json('action.action_id');
        $this->assertSame('open', $actRes->json('action.status'));
        $this->assertSame($snapshotCode, $actRes->json('action.snapshot_code'));

        // Update action status to completed
        $updRes = $this->putJson("/api/reports/bite-summary/actions/{$actionId}", [
            'status' => 'completed',
            'review_date' => '2026-11-29',
            'review_outcome' => 'Verified intake queue; patient was assessed next morning.',
        ])->assertOk();
        $this->assertSame('completed', $updRes->json('action.status'));

        // Verify A4 Meeting Pack print view renders HTML with snapshot code & action, without patient name
        $printRes = $this->get("/api/print/reports/bite-summary?snapshot_id={$snapshotId}")
            ->assertOk();
        $html = $printRes->getContent();
        $this->assertStringContainsString('Bite Cases Summary — Reporting and Planning', $html);
        $this->assertStringContainsString($snapshotCode, $html);
        $this->assertStringContainsString('Audit daily Form 1 to Form 2 triage queue before clinic closing.', $html);
        $this->assertStringNotContainsString('PrivateName', $html);
        $this->assertStringNotContainsString('DoNotLeak', $html);

        // Verify clinic isolation: another clinic cannot view or modify our snapshot or action
        $otherClinic = Clinic::create([
            'name' => 'Other RHU',
            'municipality' => 'Villanueva',
            'province' => 'Misamis Oriental',
            'status' => 'active',
        ]);
        $otherAdmin = User::factory()->create([
            'clinic_id' => $otherClinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);
        Sanctum::actingAs($otherAdmin);

        $this->getJson("/api/reports/bite-summary/snapshots/{$snapshotId}")->assertNotFound();
        $this->putJson("/api/reports/bite-summary/actions/{$actionId}", ['status' => 'deferred'])->assertNotFound();
    }
}
