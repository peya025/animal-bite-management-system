<?php

namespace Tests\Feature\CommunityAwareness;

use App\Models\{BarangayCoordinate, BiteIncident, Clinic, Patient, SurveillanceRun, SurveillanceSignal, TreatmentRecord, User};
use App\Services\Surveillance\{ExposureDatasetBuilder, ExposureGeographyResolver, SurveillanceSignalService, SurveillanceThresholdEvaluator};
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SurveillanceTest extends TestCase
{
    use RefreshDatabase;
    private Clinic $clinic;
    private User $user;
    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-11-27 12:00', 'Asia/Manila'));
        Queue::fake();
        $this->clinic = Clinic::create(['name' => 'Test clinic', 'municipality' => 'Town A', 'province' => 'Province A']);
        $this->user = User::factory()->create(['clinic_id' => $this->clinic->id, 'role' => 'admin', 'is_active' => true]);
        $this->patient = Patient::create(['clinic_id' => $this->clinic->id, 'first_name' => 'Private', 'last_name' => 'Patient', 'gender' => 'female', 'date_of_birth' => '1990-01-01']);
        foreach ([['Town A', 'Province A'], ['Town B', 'Province A'], ['Town A', 'Province B']] as [$town, $province]) {
            BarangayCoordinate::create(['barangay' => 'Common', 'municipality' => $town, 'province' => $province, 'latitude' => 1, 'longitude' => 1, 'source' => 'manual']);
        }
        Sanctum::actingAs($this->user);
    }

    private function incident(array $attributes = []): BiteIncident
    {
        return BiteIncident::create($attributes + [
            'clinic_id' => $this->clinic->id, 'patient_id' => $this->patient->patient_id,
            'created_by' => $this->user->id, 'bite_date' => '2026-11-25',
            'bite_place' => 'Common, Town A, Province A', 'status' => 'active', 'severity' => 'moderate',
        ]);
    }

    private function analyze(): SurveillanceRun
    {
        return app(SurveillanceSignalService::class)->evaluate($this->clinic->id);
    }

    public function test_unique_episodes_not_visits_and_quality_exclusions(): void
    {
        $incident = $this->incident();
        foreach ([0, 3, 7] as $dose) {
            TreatmentRecord::create(['clinic_id' => $this->clinic->id, 'patient_id' => $this->patient->patient_id,
                'bite_id' => $incident->bite_id, 'dose_number' => $dose, 'status' => 'administered', 'treatment_date' => '2026-11-25', 'administered_by' => $this->user->id]);
        }
        $this->incident(); // A separate exposure for the same patient is retained.
        $this->incident(['status' => 'duplicate']);
        $this->incident(['status' => 'voided']);
        $this->incident(['bite_date_is_provisional' => true]);
        $this->incident(['bite_place' => 'Unknown']);
        $this->incident(['bite_place' => 'Common']); // Never guess residence or clinic locality.
        $future = $this->incident(['bite_date' => '2026-12-01']);
        $future->forceFill(['created_at' => '2026-11-26 08:00:00'])->save();
        $summary = $this->analyze()->summary;
        $this->assertSame(2, $summary['buckets'][0]['current_count']);
        $this->assertSame(['void_or_duplicate' => 2, 'uncertain_date' => 1, 'after_cutoff' => 1, 'unknown_or_ambiguous_location' => 2], $summary['exclusions']);
        $this->assertCount(1, $summary['possible_duplicate_groups']);
        $this->assertEquals(50, $summary['unknown_location_pct']);
        $this->assertDatabaseCount('surveillance_signals', 0);
        Queue::assertNothingPushed();
    }

    public function test_geography_aliases_are_exact_and_same_names_do_not_collide(): void
    {
        $this->incident(['bite_place' => 'brgy. COMMON, town a, province a']);
        $this->incident(['bite_place' => 'Common, Town B, Province A']);
        $this->incident(['bite_place' => 'Common, Town A, Province B']);
        $this->incident(['bite_place' => 'Common, Town B']); // Outside municipality needs explicit province.
        $summary = $this->analyze()->summary;
        $this->assertCount(3, $summary['buckets']);
        $this->assertCount(3, array_unique(array_column($summary['buckets'], 'geography_key')));
        $this->assertSame(1, $summary['exclusions']['unknown_or_ambiguous_location']);
        $this->assertDatabaseCount('surveillance_signals', 0);
    }

    public function test_window_boundaries_and_incomplete_baseline(): void
    {
        foreach (['2026-10-21', '2026-10-22', '2026-11-19', '2026-11-20', '2026-11-26'] as $date) { $this->incident(['bite_date' => $date]); }
        $summary = $this->analyze()->summary;
        $this->assertSame(['start' => '2026-11-20', 'end' => '2026-11-26', 'baseline_start' => '2026-10-21', 'baseline_end' => '2026-11-19'], $summary['period']);
        $this->assertSame(2, $summary['buckets'][0]['current_count']);
        $this->assertSame(3, $summary['buckets'][0]['baseline_count']);
        $this->assertNull($summary['buckets'][0]['ratio']);
        config(['surveillance.coverage_start_by_clinic' => [$this->clinic->id => '2026-10-01']]);
        $summary = $this->analyze()->summary;
        $this->assertSame('trend_for_review', $summary['buckets'][0]['priority']);
    }

    public function test_threshold_boundaries_do_not_round_before_comparison(): void
    {
        $evaluator = new SurveillanceThresholdEvaluator(); $rules = config('surveillance');
        $this->assertNull($evaluator->evaluate(1, 0, 1, true, $rules)['priority']);
        $this->assertSame('priority_review', $evaluator->evaluate(3, 0, 100, false, $rules)['priority']);
        $this->assertSame('priority_review', $evaluator->evaluate(2, 2, 100, false, $rules)['priority']);
        $this->assertNull($evaluator->evaluate(2, 0, 0, true, $rules)['ratio']);
        $this->assertNull($evaluator->evaluate(2, 0, 5, true, $rules)['priority']);
        $this->assertSame('trend_for_review', $evaluator->evaluate(2, 0, 4, true, $rules)['priority']);
        $rules['trend_ratio'] = 2.143;
        $this->assertNull($evaluator->evaluate(2, 0, 4, true, $rules)['priority']);
    }

    public function test_idempotency_reversions_and_two_distinct_day_resolution(): void
    {
        $incidents = collect([ $this->incident(), $this->incident(), $this->incident() ]);
        $first = $this->analyze();
        $this->assertSame($first->id, $this->analyze()->id);
        $signal = SurveillanceSignal::firstOrFail();
        $this->assertSame('new', $signal->state);
        $incidents[0]->update(['status' => 'duplicate']);
        $this->analyze();
        $this->assertSame(1, $signal->fresh()->below_threshold_days);
        $incidents[0]->update(['status' => 'active']);
        $reverted = $this->analyze();
        $this->assertSame($reverted->id, $this->analyze()->id);
        $incidents[0]->update(['status' => 'duplicate']); $this->analyze();
        $this->analyze();
        $this->assertSame('new', $signal->fresh()->state);
        $this->travelTo(CarbonImmutable::parse('2026-11-28 12:00', 'Asia/Manila'));
        $this->analyze();
        $this->assertSame('resolved', $signal->fresh()->state);
        Queue::assertNothingPushed();
    }

    public function test_review_permissions_conflicts_history_and_material_reopening(): void
    {
        for ($i = 0; $i < 3; $i++) { $this->incident(); }
        $this->analyze(); $signal = SurveillanceSignal::firstOrFail();
        $url = '/api/reports/surveillance/signals/'.$signal->id;
        $this->postJson($url.'/reviews', ['version' => 1, 'action' => 'dismiss'])->assertUnprocessable();
        $this->postJson($url.'/reviews', ['version' => 1, 'action' => 'assign', 'reason' => 'Review records'])->assertOk()->assertJsonPath('state', 'in_review');
        $this->postJson($url.'/reviews', ['version' => 1, 'action' => 'verify', 'reason' => 'Checked'])->assertConflict();
        $this->postJson($url.'/reviews', ['version' => 2, 'action' => 'dismiss', 'reason' => 'Reporting backlog'])->assertOk();
        $this->analyze(); $this->assertSame('dismissed', $signal->fresh()->state);
        $this->incident(); $this->analyze();
        $this->assertSame('new', $signal->fresh()->state);
        $this->getJson($url.'/history')->assertOk()->assertJsonCount(4, 'data')->assertJsonMissingPath('data.0.snapshot');
        $this->getJson($url.'/evidence')->assertOk()->assertJsonPath('snapshot_count', 4)->assertJsonMissingPath('cases.data.0.patient_name');
        $reader = User::factory()->create(['clinic_id' => $this->clinic->id, 'role' => 'registration', 'is_active' => true]);
        Sanctum::actingAs($reader);
        $this->getJson('/api/reports/surveillance/signals')->assertOk()->assertJsonPath('can_review', false)->assertJsonMissingPath('signals.data.0.metrics.current_incident_ids');
        $this->postJson($url.'/reviews', ['version' => 4, 'action' => 'verify', 'reason' => 'Checked'])->assertForbidden();
        $reader->update(['clinic_id' => Clinic::create(['name' => 'Other'])->id]);
        $this->getJson($url.'/history')->assertNotFound();
        $this->getJson($url.'/evidence')->assertNotFound();
        Queue::assertNothingPushed();
    }

    public function test_finalized_categories_and_suspicious_volume_changes(): void
    {
        $this->incident(['severity' => 'severe', 'confirmed_at' => '2026-11-25 10:00:00']);
        $this->incident(['severity' => 'severe', 'confirmed_at' => '2026-11-25 10:00:00']);
        $run = $this->analyze();
        $this->assertSame(2, $run->summary['buckets'][0]['finalized_category_iii']);
        $this->assertSame('priority_review', $run->summary['buckets'][0]['priority']);
        for ($i = 0; $i < 3; $i++) { $this->incident(); }
        $this->assertTrue($this->analyze()->summary['suspicious_count_change']);
        $this->assertDatabaseCount('community_advisories', 0);
    }

    public function test_failed_or_historical_evaluation_cannot_overwrite_current_state(): void
    {
        $this->incident(); $run = $this->analyze();
        $this->mock(ExposureDatasetBuilder::class)->shouldReceive('build')->andThrow(new \RuntimeException('Synthetic source failure'));
        try { app(SurveillanceSignalService::class)->evaluate($this->clinic->id); $this->fail('Expected exception'); }
        catch (\RuntimeException $exception) { $this->assertSame('Synthetic source failure', $exception->getMessage()); }
        $this->assertDatabaseCount('surveillance_runs', 1);
        $this->assertSame($run->id, SurveillanceRun::latest('id')->first()->id);
    }

    public function test_lost_location_evidence_cannot_automatically_resolve_a_signal(): void
    {
        $items = [$this->incident(), $this->incident(), $this->incident()];
        $this->analyze();
        foreach ($items as $item) { $item->update(['bite_place' => 'Unknown']); }
        $this->analyze();
        $this->travelTo(CarbonImmutable::parse('2026-11-28 12:00', 'Asia/Manila'));
        $this->analyze();
        $this->assertSame('new', SurveillanceSignal::first()->state);
        $this->assertSame(0, SurveillanceSignal::first()->below_threshold_days);
    }

    public function test_current_day_and_historical_replay_are_rejected_and_leap_window_is_exact(): void
    {
        $this->analyze();
        foreach (['2026-11-27', '2026-11-25'] as $date) {
            try { app(SurveillanceSignalService::class)->evaluate($this->clinic->id, $date); $this->fail('Expected rejection'); }
            catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
                $this->assertContains($exception->getStatusCode(), [409, 422]);
            }
        }
        $summary = app(ExposureDatasetBuilder::class)->build($this->clinic, CarbonImmutable::parse('2024-03-01', 'Asia/Manila'));
        $this->assertSame('2024-02-24', $summary['period']['start']);
        $this->assertSame('2024-02-23', $summary['period']['baseline_end']);
        $this->assertSame('2024-01-25', $summary['period']['baseline_start']);
    }
}
