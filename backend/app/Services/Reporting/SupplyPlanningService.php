<?php

namespace App\Services\Reporting;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\VaccineInventory;
use App\Services\ProphylaxisService;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Phase 8 (BCS-08.1, BCS-08.2, BCS-08.3):
 * Supply scenario estimates, catchment population rate context, and
 * descriptive baseline forecasting with transparent epidemiological limitations.
 */
class SupplyPlanningService
{
    public const RULE_VERSION = 'bcs-phase8-supply-v1';

    /**
     * Compute full planning projections payload for the Bite Cases Summary.
     */
    public function computePlanningProjections(
        int $clinicId,
        ?Clinic $clinic,
        CarbonImmutable $from,
        CarbonImmutable $to,
        CarbonImmutable $cutoff,
        array $currentMetrics,
        array $servicePeriod,
        array $backlog,
        array $customOptions = []
    ): array {
        $supplyScenarios = $this->buildSupplyScenarios(
            $clinicId,
            $from,
            $to,
            $cutoff,
            $servicePeriod,
            $customOptions
        );

        $populationContext = $this->buildPopulationContext(
            $clinic,
            $from,
            $to,
            $currentMetrics
        );

        $veterinaryLinks = $this->buildVeterinarySurveillanceLinks(
            $currentMetrics
        );

        $baselineForecast = $this->buildBaselineForecast(
            $from,
            $to,
            $currentMetrics
        );

        return [
            'rule_version' => self::RULE_VERSION,
            'supply_scenarios' => $supplyScenarios,
            'population_context' => $populationContext,
            'veterinary_surveillance_links' => $veterinaryLinks,
            'baseline_forecast' => $baselineForecast,
        ];
    }

    /**
     * BCS-08.1: Supply scenario estimates based on usable inventory,
     * scheduled demand, historical consumption run-rate, and explicit buffer days.
     */
    public function buildSupplyScenarios(
        int $clinicId,
        CarbonImmutable $from,
        CarbonImmutable $to,
        CarbonImmutable $cutoff,
        array $servicePeriod,
        array $options = []
    ): array {
        $bufferDays = max(1, (int) ($options['buffer_days'] ?? 14));
        $cutoffDateStr = $cutoff->toDateString();

        // 1. Fetch unexpired, active inventory batches for this clinic
        $inventoryBatches = VaccineInventory::where('clinic_id', $clinicId)
            ->where('status', 'active')
            ->where('current_quantity', '>', 0)
            ->where(function ($query) use ($cutoffDateStr) {
                $query->whereNull('expiration_date')
                    ->orWhere('expiration_date', '>=', $cutoffDateStr);
            })
            ->orderBy('expiration_date', 'asc')
            ->get();

        $rigBrands = ProphylaxisService::configuredRigBrands($clinicId);

        $arvBatches = $inventoryBatches->filter(function (VaccineInventory $batch) use ($rigBrands) {
            $type = (string) $batch->vaccine_type;
            $cat = (string) $batch->vaccine_category;
            $isRig = ProphylaxisService::isRigBrand($type, $rigBrands)
                || (bool) preg_match('/(?:^|[^a-z])(?:RIG|ERIG|HRIG|immunoglobulin)(?:$|[^a-z])/i', $cat);

            return !$isRig;
        });

        $rigBatches = $inventoryBatches->filter(function (VaccineInventory $batch) use ($rigBrands) {
            $type = (string) $batch->vaccine_type;
            $cat = (string) $batch->vaccine_category;

            return ProphylaxisService::isRigBrand($type, $rigBrands)
                || (bool) preg_match('/(?:^|[^a-z])(?:RIG|ERIG|HRIG|immunoglobulin)(?:$|[^a-z])/i', $cat);
        });

        $usableArvVials = (int) $arvBatches->sum('current_quantity');
        $usableRigVials = (int) $rigBatches->sum('current_quantity');

        // Batches nearing expiration within 30 days of cutoff
        $expiryWarningThreshold = $cutoff->addDays(30)->toDateString();
        $arvExpiringSoon = $arvBatches->filter(fn ($b) => $b->expiration_date && $b->expiration_date <= $expiryWarningThreshold)->sum('current_quantity');
        $rigExpiringSoon = $rigBatches->filter(fn ($b) => $b->expiration_date && $b->expiration_date <= $expiryWarningThreshold)->sum('current_quantity');

        $earliestArvExpiry = $arvBatches->whereNotNull('expiration_date')->first()?->expiration_date?->format('Y-m-d');
        $earliestRigExpiry = $rigBatches->whereNotNull('expiration_date')->first()?->expiration_date?->format('Y-m-d');

        // 2. Scheduled committed appointments in upcoming 7, 14, and 30 day windows after cutoff
        $scheduledAppointments = Appointment::where('clinic_id', $clinicId)
            ->whereIn('status', ['scheduled', 'rescheduled'])
            ->where('appointment_date', '>', $cutoffDateStr)
            ->where('appointment_date', '<=', $cutoff->addDays(30)->toDateString())
            ->get();

        $dosesScheduled7d = $scheduledAppointments->filter(fn ($a) => $a->appointment_date <= $cutoff->addDays(7)->toDateString())->count();
        $dosesScheduled14d = $scheduledAppointments->filter(fn ($a) => $a->appointment_date <= $cutoff->addDays(14)->toDateString())->count();
        $dosesScheduled30d = $scheduledAppointments->count();

        // 3. Historical daily consumption run-rate in the selected reporting period
        $periodDays = max(1, $from->diffInDays($to) + 1);
        $localArvDosesAdministered = (int) ($servicePeriod['local_arv_events_in_service_period'] ?? 0);
        $dailyArvDosesRunRate = $periodDays > 0 ? round($localArvDosesAdministered / $periodDays, 2) : 0.0;

        // 4. Model Scenarios: Conservative (1 dose/vial) vs Intradermal (2 doses/vial)
        // Conservative (Intramuscular or 1 patient per vial)
        $conservativeDailyVials = $dailyArvDosesRunRate;
        $conservative30dNeeded = (int) ceil($conservativeDailyVials * 30);
        $conservativeBufferNeeded = (int) ceil($conservativeDailyVials * $bufferDays);
        $conservativeTotalRequired = $conservative30dNeeded + $conservativeBufferNeeded;
        $conservativeDaysRemaining = $conservativeDailyVials > 0 ? round($usableArvVials / $conservativeDailyVials, 1) : null;
        $conservativeReorderVials = max(0, $conservativeTotalRequired - $usableArvVials);

        // Intradermal Sharing (2-site ID regimen, 2 doses extracted per vial during clinic operating sessions)
        $idDailyVials = round($dailyArvDosesRunRate / 2.0, 2);
        $id30dNeeded = (int) ceil($idDailyVials * 30);
        $idBufferNeeded = (int) ceil($idDailyVials * $bufferDays);
        $idTotalRequired = $id30dNeeded + $idBufferNeeded;
        $idDaysRemaining = $idDailyVials > 0 ? round($usableArvVials / $idDailyVials, 1) : null;
        $idReorderVials = max(0, $idTotalRequired - $usableArvVials);

        // Stockout risk classification
        $stockoutRisk = 'adequate';
        if ($conservativeDaysRemaining !== null) {
            if ($conservativeDaysRemaining < 7) {
                $stockoutRisk = 'critical';
            } elseif ($conservativeDaysRemaining < 14) {
                $stockoutRisk = 'warning';
            }
        } elseif ($usableArvVials === 0 && $localArvDosesAdministered > 0) {
            $stockoutRisk = 'depleted';
        }

        return [
            'inventory_cutoff' => $cutoffDateStr,
            'buffer_days_configured' => $bufferDays,
            'usable_stock' => [
                'arv_vials' => $usableArvVials,
                'rig_vials' => $usableRigVials,
                'arv_expiring_within_30d' => (int) $arvExpiringSoon,
                'rig_expiring_within_30d' => (int) $rigExpiringSoon,
                'earliest_arv_expiry' => $earliestArvExpiry,
                'earliest_rig_expiry' => $earliestRigExpiry,
            ],
            'demand_projection' => [
                'recent_daily_doses_run_rate' => $dailyArvDosesRunRate,
                'period_doses_administered' => $localArvDosesAdministered,
                'scheduled_doses_next_7d' => $dosesScheduled7d,
                'scheduled_doses_next_14d' => $dosesScheduled14d,
                'scheduled_doses_next_30d' => $dosesScheduled30d,
            ],
            'scenarios' => [
                'conservative_im' => [
                    'label' => 'Conservative / Intramuscular (1 dose = 1 vial)',
                    'doses_per_vial' => 1.0,
                    'projected_30d_vials' => $conservative30dNeeded,
                    'buffer_vials' => $conservativeBufferNeeded,
                    'total_vials_required' => $conservativeTotalRequired,
                    'days_of_stock_remaining' => $conservativeDaysRemaining,
                    'suggested_reorder_vials' => $conservativeReorderVials,
                    'stockout_risk' => $stockoutRisk,
                ],
                'intradermal_sharing' => [
                    'label' => 'Intradermal 2-site Sharing (2 doses / vial)',
                    'doses_per_vial' => 2.0,
                    'projected_30d_vials' => $id30dNeeded,
                    'buffer_vials' => $idBufferNeeded,
                    'total_vials_required' => $idTotalRequired,
                    'days_of_stock_remaining' => $idDaysRemaining,
                    'suggested_reorder_vials' => $idReorderVials,
                ],
            ],
            'assumptions_and_limits' => [
                'vial_sharing_notice' => 'Intradermal vial sharing requires same-day utilization during clinic session hours within open-vial cold-chain limits (typically 6–8 hours).',
                'buffer_formula' => 'Buffer stock = daily run-rate × buffer days. Suggested reorder = max(0, [30-day demand + buffer] - usable unexpired stock).',
            ],
        ];
    }

    /**
     * BCS-08.2: Catchment population exposure rate context with
     * explicit facility-coverage and epidemiological limitations.
     */
    public function buildPopulationContext(
        ?Clinic $clinic,
        CarbonImmutable $from,
        CarbonImmutable $to,
        array $currentMetrics
    ): array {
        $catchmentPopulation = (int) ($clinic?->population ?? 75000);
        $recordedExposures = (int) ($currentMetrics['reconciliation']['recorded_episodes'] ?? 0);
        $periodDays = max(1, $from->diffInDays($to) + 1);

        $ratePer100k = $catchmentPopulation > 0
            ? round(($recordedExposures / $catchmentPopulation) * 100000, 1)
            : null;

        $annualizedRatePer100k = $ratePer100k !== null && $periodDays > 0
            ? round(($ratePer100k / $periodDays) * 365, 1)
            : null;

        return [
            'catchment_population' => $catchmentPopulation,
            'municipality' => $clinic?->municipality ?? 'Tagoloan',
            'recorded_exposures' => $recordedExposures,
            'period_days' => $periodDays,
            'rate_per_100k_period' => $ratePer100k,
            'annualized_rate_per_100k' => $annualizedRatePer100k,
            'facility_coverage_limitations' => [
                'presentation_bias' => 'This rate represents clinic presentations at this facility per 100,000 catchment residents, NOT community-wide rabies transmission incidence.',
                'denominator_context' => 'Denominator uses the official LGU catchment population. Exposures may include patients residing outside the municipality seeking treatment at this ABTC.',
                'underreporting_caveat' => 'Unreported minor bites or individuals seeking care at private clinics or traditional practitioners are not captured in facility statistics.',
            ],
        ];
    }

    /**
     * BCS-08.2: External veterinary surveillance links and cross-sectoral coordination notes.
     */
    public function buildVeterinarySurveillanceLinks(array $currentMetrics): array
    {
        $rec = $currentMetrics['reconciliation'] ?? [];
        $total = (int) ($rec['recorded_episodes'] ?? 0);

        return [
            'partner_agencies' => [
                [
                    'agency_name' => 'Tagoloan Municipal Agriculture Office (MAO)',
                    'role' => 'Animal Rabies Vaccination & Pet Registration',
                    'coordination_trigger' => 'Barangays with elevated dog-bite clusters',
                ],
                [
                    'agency_name' => 'Misamis Oriental Provincial Veterinary Office (PVO)',
                    'role' => 'Animal Quarantine & Laboratory Diagnosis',
                    'coordination_trigger' => 'Suspected rabid animal incidents or Category III bite deaths',
                ],
                [
                    'agency_name' => 'Barangay Rabies Coordinators',
                    'role' => 'Local Dog Catching & 14-day Observation Monitoring',
                    'coordination_trigger' => 'Routine 14-day animal health observation checks',
                ],
            ],
            'actionable_notes' => [
                'Animal observation: The 14-day observation period for biting dogs/cats requires verification by the pet owner or Barangay Rabies Coordinator.',
                'Cross-sectoral referral: Share aggregate barangay exposure summaries (with no patient identifiers) with local veterinary partners during monthly Municipal Rabies Control Committee (MRCC) meetings.',
            ],
        ];
    }

    /**
     * BCS-08.3: Descriptive baseline forecast comparing recent run-rate with historical trends.
     */
    public function buildBaselineForecast(
        CarbonImmutable $from,
        CarbonImmutable $to,
        array $currentMetrics
    ): array {
        $recorded = (int) ($currentMetrics['reconciliation']['recorded_episodes'] ?? 0);
        $periodDays = max(1, $from->diffInDays($to) + 1);

        $dailyRunRate = $periodDays > 0 ? round($recorded / $periodDays, 2) : 0.0;
        $projectedNextMonth = (int) round($dailyRunRate * 30.4);

        // Approximate 15% descriptive variation range
        $lowerBound = max(0, (int) round($projectedNextMonth * 0.85));
        $upperBound = (int) round($projectedNextMonth * 1.15);

        return [
            'forecast_model' => 'descriptive_moving_run_rate',
            'daily_presentation_run_rate' => $dailyRunRate,
            'projected_next_month_presentations' => $projectedNextMonth,
            'projected_next_month_range' => [
                'lower_bound' => $lowerBound,
                'upper_bound' => $upperBound,
            ],
            'evaluation_and_limits' => [
                'method_description' => 'Descriptive projection extrapolates observed daily presentation rates over a standard 30.4-day month.',
                'predictive_claim_disclaimer' => 'This projection does NOT claim epidemic curve forecasting, seasonal autoregression, or biological disease modeling. It is intended solely as an operational baseline for clinic staffing and vaccine reordering.',
            ],
        ];
    }
}
