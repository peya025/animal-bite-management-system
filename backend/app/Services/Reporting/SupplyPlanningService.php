<?php

namespace App\Services\Reporting;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\ClinicSchedule;
use App\Models\ClinicScheduleException;
use App\Models\TreatmentRecord;
use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use App\Services\ClinicScheduleService;
use App\Services\ProphylaxisService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Phase 8 + Phase 3 Supply Planning:
 * Follow-up-driven per-day open-vial (ceil) scheduling, same-day waiting-room D0 demand,
 * expiry-aware FIFO batch simulation, brand pools (with Unspecified ARV fallback),
 * RIG readiness, catchment population rate context, and descriptive baseline forecasting.
 */
class SupplyPlanningService
{
    public const RULE_VERSION = 'bcs-phase8-supply-v2';
    public const UNSPECIFIED_ARV_BRAND = 'Unspecified / Any Active ARV';

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
            array_merge($customOptions, ['clinic' => $clinic])
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
        $clinic = ($options['clinic'] ?? null) instanceof Clinic ? $options['clinic'] : null;

        // 1. Fetch upcoming scheduled appointments [cutoff .. cutoff + 30d] in ONE query
        $allUpcomingAppointments = Appointment::where('clinic_id', $clinicId)
            ->whereIn('status', ['scheduled', 'rescheduled'])
            ->whereRaw('DATE(COALESCE(scheduled_date, appointment_date)) >= ?', [$cutoffDateStr])
            ->whereRaw('DATE(COALESCE(scheduled_date, appointment_date)) <= ?', [$cutoff->addDays(30)->toDateString()])
            ->get();

        $afterCutoffAppointments = $allUpcomingAppointments->filter(
            fn (Appointment $a) => $this->resolveAppointmentDate($a) > $cutoffDateStr
        );
        $dosesScheduled7d = $afterCutoffAppointments->filter(fn ($a) => $this->resolveAppointmentDate($a) <= $cutoff->addDays(7)->toDateString())->count();
        $dosesScheduled14d = $afterCutoffAppointments->filter(fn ($a) => $this->resolveAppointmentDate($a) <= $cutoff->addDays(14)->toDateString())->count();
        $dosesScheduled30d = $afterCutoffAppointments->count();

        // 2. Phase 3 Follow-Up-Driven Daily Vial Schedule (single batched query pass)
        $followupSchedule = $this->buildFollowupVialSchedule(
            $clinicId,
            14,
            $cutoff,
            [
                'clinic' => $clinic,
                'appointments' => $allUpcomingAppointments,
                'resolved_items' => ($options['resolved_covers_recent_30d'] ?? false) ? ($options['resolved_items'] ?? null) : null,
            ]
        );
        $vialReadiness = $followupSchedule['vial_readiness'];
        $usableStock = $followupSchedule['usable_stock'];
        $usableArvVials = (int) $usableStock['arv_vials'];
        $usableRigVials = (int) $usableStock['rig_vials'];

        // 3. Historical daily consumption run-rate in the selected reporting period
        $periodDays = max(1, $from->diffInDays($to) + 1);
        $localArvDosesAdministered = (int) ($servicePeriod['local_arv_events_in_service_period'] ?? 0);
        $dailyArvDosesRunRate = $periodDays > 0 ? round($localArvDosesAdministered / $periodDays, 2) : 0.0;

        // 4. Model Scenarios: Conservative (1 dose/vial) vs Intradermal (2 doses/vial)
        $conservativeDailyVials = $dailyArvDosesRunRate;
        $conservative30dNeeded = (int) ceil($conservativeDailyVials * 30);
        $conservativeBufferNeeded = (int) ceil($conservativeDailyVials * $bufferDays);
        $conservativeTotalRequired = $conservative30dNeeded + $conservativeBufferNeeded;
        $conservativeDaysRemaining = $conservativeDailyVials > 0 ? round($usableArvVials / $conservativeDailyVials, 1) : null;
        $conservativeReorderVials = max(0, $conservativeTotalRequired - $usableArvVials);

        $idDailyVials = round($dailyArvDosesRunRate / 2.0, 2);
        $id30dNeeded = (int) ceil($idDailyVials * 30);
        $idBufferNeeded = (int) ceil($idDailyVials * $bufferDays);
        $idTotalRequired = $id30dNeeded + $idBufferNeeded;
        $idDaysRemaining = $idDailyVials > 0 ? round($usableArvVials / $idDailyVials, 1) : null;
        $idReorderVials = max(0, $idTotalRequired - $usableArvVials);

        // Stockout risk classification (incorporating follow-up shortfall if worse)
        $stockoutRisk = 'adequate';
        if ($vialReadiness['status'] === 'shortfall') {
            $stockoutRisk = $usableArvVials === 0 ? 'depleted' : 'critical';
        } elseif ($conservativeDaysRemaining !== null) {
            if ($conservativeDaysRemaining < 7) {
                $stockoutRisk = 'critical';
            } elseif ($conservativeDaysRemaining < 14 || $vialReadiness['status'] === 'tight') {
                $stockoutRisk = 'warning';
            }
        } elseif ($usableArvVials === 0 && $localArvDosesAdministered > 0) {
            $stockoutRisk = 'depleted';
        } elseif ($vialReadiness['status'] === 'tight') {
            $stockoutRisk = 'warning';
        }

        return [
            'inventory_cutoff' => $cutoffDateStr,
            'buffer_days_configured' => $bufferDays,
            'usable_stock' => $usableStock,
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
            'vial_readiness' => $vialReadiness,
            'followup_vial_schedule' => $followupSchedule,
            'assumptions_and_limits' => [
                'vial_sharing_notice' => 'Intradermal vial sharing requires same-day utilization during clinic session hours within open-vial cold-chain limits (typically 6–8 hours). Daily vial counts apply ceil(day_doses / doses_per_vial) per clinic day without carrying opened vials across days.',
                'buffer_formula' => 'Buffer stock = daily run-rate × buffer days. Follow-up projections combine scheduled D3/D7/D14/D28 visits, same-day waiting-room D0 demand, operating-day walk-in D0 run-rate, and FIFO batch expiry cutoffs.',
            ],
        ];
    }

    /**
     * Phase 3: Build daily follow-up-driven vial schedule (7/14/30 days) with:
     * - Per-day ceil(doses / doses_per_vial) respecting same-day open-vial discard
     * - Brand splits with "Unspecified / Any Active ARV" fallback pool
     * - Same-day Form 1 waiting + Form 2 prescribed unstarted D0 queue demand
     * - Historical 30-day operating-day walk-in D0 baseline
     * - Expiry-aware FIFO batch simulation (exact stockout & expiring-unused detection)
     * - RIG pending + 7-day Category III demand readiness check
     */
    public function buildFollowupVialSchedule(
        int $clinicId,
        int $horizonDays = 14,
        ?CarbonImmutable $referenceDate = null,
        array $preloaded = []
    ): array {
        $horizonDays = max(7, min(30, $horizonDays));
        $start = ($referenceDate ?? CarbonImmutable::today())->startOfDay();
        $end = $start->addDays($horizonDays - 1);
        $startStr = $start->toDateString();
        $endStr = $end->toDateString();

        // 1. Load active unexpired inventory batches first; only load presets if batches exist
        $inventoryBatches = VaccineInventory::where('clinic_id', $clinicId)
            ->where('status', 'active')
            ->where('current_quantity', '>', 0)
            ->where(function ($query) use ($startStr) {
                $query->whereNull('expiration_date')
                    ->orWhere('expiration_date', '>=', $startStr);
            })
            ->orderByRaw('CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END ASC')
            ->orderBy('expiration_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->get();

        $presets = $inventoryBatches->isNotEmpty()
            ? VaccineTypePreset::where(fn ($q) => $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId))
                ->get()
                ->keyBy(fn (VaccineTypePreset $p) => strtolower(trim((string) $p->vaccine_name)))
            : collect();

        // Derive RIG brands in-memory from already-loaded presets + inventory (0 extra queries)
        $rigBrands = ['ERIG'];
        foreach ($presets as $preset) {
            $cat = (string) ($preset->category ?? '');
            $vName = trim((string) $preset->vaccine_name);
            if ($vName !== '' && (
                preg_match('/(?:^|[^a-z])(?:RIG|ERIG|HRIG|immunoglobulin)(?:$|[^a-z])/i', $cat)
                || ProphylaxisService::isRigBrand($vName)
            )) {
                $rigBrands[] = $vName;
            }
        }
        foreach ($inventoryBatches as $batch) {
            $bType = trim((string) $batch->vaccine_type);
            if ($bType !== '' && ProphylaxisService::isRigBrand($bType, $rigBrands)) {
                $rigBrands[] = $bType;
            }
        }
        $rigBrands = array_values(array_unique($rigBrands));

        $arvBatches = $inventoryBatches
            ->filter(fn (VaccineInventory $b) => $this->classifyBatchGroup($b, $rigBrands, $presets) === 'arv')
            ->values();
        $rigBatches = $inventoryBatches
            ->filter(fn (VaccineInventory $b) => $this->classifyBatchGroup($b, $rigBrands, $presets) === 'rig')
            ->values();

        $usableArvVials = (int) $arvBatches->sum('current_quantity');
        $usableRigVials = (int) $rigBatches->sum('current_quantity');

        // Resolve effective doses_per_vial per ARV batch & per brand
        $brandStockMap = [];
        $weightedDoseSum = 0;
        foreach ($arvBatches as $batch) {
            $brandName = trim((string) $batch->vaccine_type) ?: 'ARV';
            $brandKey = strtolower($brandName);
            $dpv = $this->resolveBatchDosesPerVial($batch, $presets);
            $qty = (int) $batch->current_quantity;
            $weightedDoseSum += ($qty * $dpv);

            if (!isset($brandStockMap[$brandKey])) {
                $brandStockMap[$brandKey] = [
                    'brand' => $brandName,
                    'usable_vials' => 0,
                    'doses_per_vial' => $dpv,
                    'weighted_dpv_sum' => 0,
                    'earliest_expiry' => null,
                    'scheduled_doses_7d' => 0,
                    'scheduled_doses_14d' => 0,
                    'scheduled_doses_horizon' => 0,
                ];
            }
            $brandStockMap[$brandKey]['usable_vials'] += $qty;
            $brandStockMap[$brandKey]['weighted_dpv_sum'] += ($qty * $dpv);
            $expStr = $batch->expiration_date?->format('Y-m-d');
            if ($expStr !== null && ($brandStockMap[$brandKey]['earliest_expiry'] === null || $expStr < $brandStockMap[$brandKey]['earliest_expiry'])) {
                $brandStockMap[$brandKey]['earliest_expiry'] = $expStr;
            }
        }

        foreach ($brandStockMap as $key => $meta) {
            $brandStockMap[$key]['doses_per_vial'] = $meta['usable_vials'] > 0
                ? max(1, (int) round($meta['weighted_dpv_sum'] / $meta['usable_vials']))
                : 1;
        }

        $effectiveDosesPerVial = $usableArvVials > 0
            ? max(1.0, round($weightedDoseSum / $usableArvVials, 2))
            : 2.0;

        $expiry30Str = $start->addDays(30)->toDateString();
        $arvExpiring30d = (int) $arvBatches->filter(fn ($b) => $b->expiration_date && $b->expiration_date->toDateString() <= $expiry30Str)->sum('current_quantity');
        $rigExpiring30d = (int) $rigBatches->filter(fn ($b) => $b->expiration_date && $b->expiration_date->toDateString() <= $expiry30Str)->sum('current_quantity');
        $earliestArvExpiry = $arvBatches->whereNotNull('expiration_date')->first()?->expiration_date?->format('Y-m-d');
        $earliestRigExpiry = $rigBatches->whereNotNull('expiration_date')->first()?->expiration_date?->format('Y-m-d');

        // 2. Preload clinic schedule & exceptions in 2 batch queries (ZERO per-day queries)
        $clinic = ($preloaded['clinic'] ?? null) instanceof Clinic ? $preloaded['clinic'] : Clinic::find($clinicId);
        $closeOnHolidays = (bool) ($clinic?->close_on_ph_holidays ?? true);
        $weeklySchedule = ClinicSchedule::where('clinic_id', $clinicId)->get()->keyBy('day_of_week');
        $scheduleExceptions = ClinicScheduleException::where('clinic_id', $clinicId)
            ->whereBetween('exception_date', [$start->subDays(30)->toDateString(), $endStr])
            ->get()
            ->keyBy(fn (ClinicScheduleException $e) => $e->exception_date instanceof \Carbon\CarbonInterface ? $e->exception_date->toDateString() : substr((string) $e->exception_date, 0, 10));

        $scheduleService = app(ClinicScheduleService::class);
        $holidays = [];
        if ($closeOnHolidays) {
            $years = array_unique([(int) $start->subDays(30)->year, (int) $start->year, (int) $end->year]);
            foreach ($years as $yr) {
                $holidays += $scheduleService->getPhilippineRegularHolidays($yr);
            }
        }

        $isDateOpen = static function (CarbonImmutable $date) use ($scheduleExceptions, $holidays, $weeklySchedule): bool {
            $dateStr = $date->toDateString();
            if ($scheduleExceptions->has($dateStr)) {
                return (bool) $scheduleExceptions->get($dateStr)->is_open;
            }
            if (isset($holidays[$dateStr])) {
                return false;
            }
            if ($weeklySchedule->has($date->dayOfWeek)) {
                return (bool) $weeklySchedule->get($date->dayOfWeek)->is_open;
            }

            return !in_array($date->dayOfWeek, [0, 6], true);
        };

        $openDaysLast30 = 0;
        for ($i = 1; $i <= 30; $i++) {
            if ($isDateOpen($start->subDays($i))) {
                $openDaysLast30++;
            }
        }
        $openDaysLast30 = max(1, $openDaysLast30);

        // 3. Reuse preloaded resolved episodes when available (0 extra queries), else load once with intake+plan+records+appointments
        $historyStart = $start->subDays(30)->toDateString();
        $resolvedRecent = [];
        $usedPreloadedEpisodes = false;
        if (isset($preloaded['resolved_items']) && $preloaded['resolved_items'] instanceof Collection) {
            $usedPreloadedEpisodes = true;
            $recentEpisodes = collect();
            foreach ($preloaded['resolved_items'] as $item) {
                $ep = $item['incident'] ?? null;
                $st = $item['state'] ?? null;
                if ($ep instanceof BiteIncident && is_array($st)) {
                    $createdStr = $ep->created_at?->toDateString();
                    $biteDateStr = $ep->bite_date ? substr((string) $ep->bite_date, 0, 10) : null;
                    if (($createdStr !== null && $createdStr >= $historyStart) || ($biteDateStr !== null && $biteDateStr >= $historyStart)) {
                        $recentEpisodes->push($ep);
                        $resolvedRecent[$ep->bite_id] = [
                            'episode' => $ep,
                            'state' => $st,
                        ];
                    }
                }
            }
        } else {
            $recentEpisodes = BiteIncident::where('clinic_id', $clinicId)
                ->whereNotIn('status', ['void', 'voided', 'duplicate', 'cancelled'])
                ->where(function ($q) use ($historyStart) {
                    $q->whereDate('created_at', '>=', $historyStart)
                        ->orWhereDate('bite_date', '>=', $historyStart);
                })
                ->with(['intake', 'treatmentPlan', 'treatmentRecords', 'appointments'])
                ->get();

            $stateResolver = new EpisodeReportingStateResolver(new TreatmentOutcomeResolver());
            $cutoffEnd = $start->endOfDay();
            foreach ($recentEpisodes as $ep) {
                $resolvedRecent[$ep->bite_id] = [
                    'episode' => $ep,
                    'state' => $stateResolver->resolve($ep, $cutoffEnd),
                ];
            }
        }

        if ($usedPreloadedEpisodes) {
            $d0Last30d = 0;
            foreach ($recentEpisodes as $ep) {
                if (!$ep->relationLoaded('treatmentRecords')) {
                    continue;
                }
                foreach ($ep->treatmentRecords as $rec) {
                    if ($rec->voided_at !== null || (int) ($rec->dose_number ?? -1) !== 0) {
                        continue;
                    }
                    if (strtolower(trim((string) ($rec->status ?? ''))) !== 'completed' || (bool) ($rec->is_external ?? false)) {
                        continue;
                    }
                    $tDate = $rec->treatment_date ? substr((string) $rec->treatment_date, 0, 10) : null;
                    if ($tDate !== null && $tDate >= $historyStart && $tDate < $startStr) {
                        $d0Last30d++;
                    }
                }
            }
        } else {
            $d0Last30d = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('dose_number', 0)
                ->where('status', 'completed')
                ->where(function ($q) {
                    $q->where('is_external', false)->orWhereNull('is_external');
                })
                ->whereDate('treatment_date', '>=', $historyStart)
                ->whereDate('treatment_date', '<', $startStr)
                ->count();
        }

        $walkinDailyD0Rate = round($d0Last30d / $openDaysLast30, 2);

        $sameDayWaiting = $this->computeSameDayWaitingD0Demand($resolvedRecent, $start);

        // 4. Upcoming committed appointments over [start .. end]
        if (isset($preloaded['appointments']) && $preloaded['appointments'] instanceof Collection) {
            $appointments = $preloaded['appointments']
                ->filter(fn (Appointment $a) => $this->resolveAppointmentDate($a) >= $startStr && $this->resolveAppointmentDate($a) <= $endStr)
                ->values();
        } else {
            $appointments = Appointment::where('clinic_id', $clinicId)
                ->whereIn('status', ['scheduled', 'rescheduled'])
                ->whereRaw('DATE(COALESCE(scheduled_date, appointment_date)) >= ?', [$startStr])
                ->whereRaw('DATE(COALESCE(scheduled_date, appointment_date)) <= ?', [$endStr])
                ->get();
        }

        $biteIds = $appointments->pluck('bite_id')->filter()->unique()->values()->all();
        $brandByBiteId = $this->resolveEpisodeBrands($clinicId, $biteIds, $rigBrands, $recentEpisodes);

        // Group appointments by date
        $appointmentsByDate = [];
        $day7EndStr = $start->addDays(6)->toDateString();
        $day14EndStr = $start->addDays(13)->toDateString();
        $unspecifiedSummary = [
            'brand' => self::UNSPECIFIED_ARV_BRAND,
            'usable_vials' => null,
            'doses_per_vial' => (int) max(1, round($effectiveDosesPerVial)),
            'earliest_expiry' => null,
            'scheduled_doses_7d' => 0,
            'scheduled_doses_14d' => 0,
            'scheduled_doses_horizon' => 0,
        ];

        foreach ($appointments as $appt) {
            $apptDate = $this->resolveAppointmentDate($appt);
            if ($apptDate < $startStr || $apptDate > $endStr) {
                continue;
            }
            $rawBrand = $appt->bite_id ? ($brandByBiteId[$appt->bite_id] ?? null) : null;
            $matchedKey = $rawBrand !== null ? strtolower(trim($rawBrand)) : null;

            if ($matchedKey !== null && isset($brandStockMap[$matchedKey])) {
                $brandLabel = $brandStockMap[$matchedKey]['brand'];
                $brandStockMap[$matchedKey]['scheduled_doses_horizon']++;
                if ($apptDate <= $day7EndStr) {
                    $brandStockMap[$matchedKey]['scheduled_doses_7d']++;
                }
                if ($apptDate <= $day14EndStr) {
                    $brandStockMap[$matchedKey]['scheduled_doses_14d']++;
                }
            } else {
                $brandLabel = self::UNSPECIFIED_ARV_BRAND;
                $unspecifiedSummary['scheduled_doses_horizon']++;
                if ($apptDate <= $day7EndStr) {
                    $unspecifiedSummary['scheduled_doses_7d']++;
                }
                if ($apptDate <= $day14EndStr) {
                    $unspecifiedSummary['scheduled_doses_14d']++;
                }
            }

            $doseNum = $appt->dose_number !== null ? (int) $appt->dose_number : null;
            $bucket = match ($doseNum) {
                0 => 'd0',
                3 => 'd3',
                7 => 'd7',
                14 => 'd14',
                28 => 'd28',
                default => 'other',
            };

            if (!isset($appointmentsByDate[$apptDate])) {
                $appointmentsByDate[$apptDate] = [
                    'count' => 0,
                    'dose_breakdown' => ['d0' => 0, 'd3' => 0, 'd7' => 0, 'd14' => 0, 'd28' => 0, 'other' => 0],
                    'brand_doses' => [],
                ];
            }
            $appointmentsByDate[$apptDate]['count']++;
            $appointmentsByDate[$apptDate]['dose_breakdown'][$bucket]++;
            $appointmentsByDate[$apptDate]['brand_doses'][$brandLabel] = ($appointmentsByDate[$apptDate]['brand_doses'][$brandLabel] ?? 0) + 1;
        }

        // 5. Day-by-day open-vial ceil + FIFO expiry-aware stock simulation
        $fifoRealistic = [];
        $fifoCommitted = [];
        foreach ($arvBatches as $batch) {
            $entry = [
                'inventory_id' => (int) $batch->inventory_id,
                'vaccine_type' => (string) $batch->vaccine_type,
                'batch_number' => (string) ($batch->batch_number ?? 'N/A'),
                'initial_quantity' => (int) $batch->current_quantity,
                'remaining' => (int) $batch->current_quantity,
                'expiration_date' => $batch->expiration_date?->format('Y-m-d'),
                'doses_per_vial' => $this->resolveBatchDosesPerVial($batch, $presets),
            ];
            $fifoRealistic[] = $entry;
            $fifoCommitted[] = $entry;
        }

        $dailySchedule = [];
        $projectedStockoutDate = null;
        $committedStockoutDate = null;
        $expiredDuringHorizon = [];

        $next7dCommittedFollowups = 0;
        $next7dExpectedWalkinD0 = 0.0;
        $next7dVialsCommitted = 0;
        $next7dVialsRealistic = 0;
        $next7dVialsConservativeIm = 0;
        $next7dHighWastageDays = 0;
        $next14dCommittedFollowups = 0;
        $next14dVialsRealistic = 0;

        for ($offset = 0; $offset < $horizonDays; $offset++) {
            $day = $start->addDays($offset);
            $dayStr = $day->toDateString();
            $isOpen = $isDateOpen($day);

            // Expire batches whose expiration_date < current dayStr
            $expiredTodayVials = 0;
            foreach ($fifoRealistic as &$b) {
                if ($b['remaining'] > 0 && $b['expiration_date'] !== null && $b['expiration_date'] < $dayStr) {
                    $expiredTodayVials += $b['remaining'];
                    $expiredDuringHorizon[$b['inventory_id']] = [
                        'inventory_id' => $b['inventory_id'],
                        'vaccine_type' => $b['vaccine_type'],
                        'batch_number' => $b['batch_number'],
                        'expiration_date' => $b['expiration_date'],
                        'current_quantity' => $b['initial_quantity'],
                        'projected_unused_vials' => $b['remaining'],
                        'days_until_expiry' => (int) $start->diffInDays(CarbonImmutable::parse($b['expiration_date']), false),
                    ];
                    $b['remaining'] = 0;
                }
            }
            unset($b);

            foreach ($fifoCommitted as &$bc) {
                if ($bc['remaining'] > 0 && $bc['expiration_date'] !== null && $bc['expiration_date'] < $dayStr) {
                    $bc['remaining'] = 0;
                }
            }
            unset($bc);

            $dayAppts = $appointmentsByDate[$dayStr] ?? [
                'count' => 0,
                'dose_breakdown' => ['d0' => 0, 'd3' => 0, 'd7' => 0, 'd14' => 0, 'd28' => 0, 'other' => 0],
                'brand_doses' => [],
            ];

            $committedFollowups = (int) $dayAppts['count'];
            $waitingD0Today = $offset === 0 ? (int) $sameDayWaiting['estimated_waiting_d0_doses'] : 0;
            $walkinD0 = $offset === 0
                ? ($isOpen ? max((float) $waitingD0Today, $walkinDailyD0Rate) : (float) $waitingD0Today)
                : ($isOpen ? $walkinDailyD0Rate : 0.0);
            $walkinD0 = round($walkinD0, 1);

            $totalExpectedDoses = round($committedFollowups + $walkinD0, 1);

            // Per-day open-vial ceil respecting brand splits + Unspecified ARV pool
            $committedCalc = $this->calculateDayVialsRequired($dayAppts['brand_doses'], 0.0, $brandStockMap, $effectiveDosesPerVial);
            $realisticCalc = $this->calculateDayVialsRequired($dayAppts['brand_doses'], $walkinD0, $brandStockMap, $effectiveDosesPerVial);

            $vialsCommitted = $committedCalc['vials'];
            $vialsRealistic = $realisticCalc['vials'];
            $vialsConservativeIm = $totalExpectedDoses > 0 ? (int) ceil($totalExpectedDoses) : 0;
            $leftoverDoses = $realisticCalc['leftover_doses'];

            // FIFO deduction (committed-only track)
            $usableStartCommitted = array_sum(array_column($fifoCommitted, 'remaining'));
            if ($vialsCommitted > $usableStartCommitted && $committedStockoutDate === null) {
                $committedStockoutDate = $dayStr;
            }
            $this->deductFifoVials($fifoCommitted, $vialsCommitted);

            // FIFO deduction (realistic track)
            $usableStartRealistic = array_sum(array_column($fifoRealistic, 'remaining'));
            $shortfallVials = max(0, $vialsRealistic - $usableStartRealistic);
            if ($shortfallVials > 0 && $projectedStockoutDate === null) {
                $projectedStockoutDate = $dayStr;
            }
            $this->deductFifoVials($fifoRealistic, $vialsRealistic);
            $projectedAfterRealistic = array_sum(array_column($fifoRealistic, 'remaining'));

            $highWastageRisk = $effectiveDosesPerVial >= 2.0
                && $vialsRealistic > 0
                && $totalExpectedDoses > 0
                && $leftoverDoses >= max(1.0, floor($effectiveDosesPerVial / 2));

            $dayStatus = 'ok';
            if (!$isOpen && $committedFollowups === 0 && $waitingD0Today === 0) {
                $dayStatus = 'closed';
            } elseif ($shortfallVials > 0) {
                $dayStatus = 'shortfall';
            } elseif ($vialsRealistic > 0 && $projectedAfterRealistic <= max(2, $vialsRealistic)) {
                $dayStatus = 'tight';
            }

            if ($offset < 7) {
                $next7dCommittedFollowups += $committedFollowups;
                $next7dExpectedWalkinD0 += $walkinD0;
                $next7dVialsCommitted += $vialsCommitted;
                $next7dVialsRealistic += $vialsRealistic;
                $next7dVialsConservativeIm += $vialsConservativeIm;
                if ($highWastageRisk) {
                    $next7dHighWastageDays++;
                }
            }
            if ($offset < 14) {
                $next14dCommittedFollowups += $committedFollowups;
                $next14dVialsRealistic += $vialsRealistic;
            }

            $dailySchedule[] = [
                'date' => $dayStr,
                'day_label' => $day->format('D, M j'),
                'is_today' => $offset === 0,
                'is_open' => $isOpen,
                'committed_followups' => $committedFollowups,
                'dose_breakdown' => $dayAppts['dose_breakdown'],
                'brand_doses' => $dayAppts['brand_doses'],
                'waiting_room_d0' => $waitingD0Today,
                'expected_walkin_d0' => $walkinD0,
                'total_expected_doses' => $totalExpectedDoses,
                'vials_committed_only' => $vialsCommitted,
                'vials_realistic' => $vialsRealistic,
                'vials_conservative_im' => $vialsConservativeIm,
                'open_vial_leftover_doses' => $leftoverDoses,
                'high_wastage_risk' => $highWastageRisk,
                'expired_before_day_vials' => $expiredTodayVials,
                'usable_stock_start' => $usableStartRealistic,
                'projected_stock_after' => $projectedAfterRealistic,
                'shortfall_vials' => $shortfallVials,
                'status' => $dayStatus,
            ];
        }

        // Check remaining batches expiring within 30 days beyond the horizon
        $dailyAvgVials = $horizonDays > 0 ? ($next14dVialsRealistic / min(14, $horizonDays)) : 0.0;
        $expiringBeforeUseBatches = array_values($expiredDuringHorizon);
        $alreadyListedIds = array_column($expiringBeforeUseBatches, 'inventory_id');

        foreach ($fifoRealistic as $b) {
            if ($b['remaining'] <= 0 || $b['expiration_date'] === null) {
                continue;
            }
            if ($b['expiration_date'] > $expiry30Str || in_array($b['inventory_id'], $alreadyListedIds, true)) {
                continue;
            }
            $expDate = CarbonImmutable::parse($b['expiration_date']);
            $extraDaysAfterHorizon = max(0, (int) $end->diffInDays($expDate, false));
            $projectedExtraUse = (int) floor($extraDaysAfterHorizon * $dailyAvgVials);
            $projectedUnused = max(0, $b['remaining'] - $projectedExtraUse);
            if ($projectedUnused > 0) {
                $expiringBeforeUseBatches[] = [
                    'inventory_id' => $b['inventory_id'],
                    'vaccine_type' => $b['vaccine_type'],
                    'batch_number' => $b['batch_number'],
                    'expiration_date' => $b['expiration_date'],
                    'current_quantity' => $b['initial_quantity'],
                    'projected_unused_vials' => $projectedUnused,
                    'days_until_expiry' => (int) $start->diffInDays($expDate, false),
                ];
            }
        }

        usort($expiringBeforeUseBatches, fn ($a, $b) => strcmp((string) $a['expiration_date'], (string) $b['expiration_date']));
        $expiringUnusedTotal = (int) array_sum(array_column($expiringBeforeUseBatches, 'projected_unused_vials'));

        // 6. RIG Readiness Check (pending Category III / RIG-indicated + 7-day Category III demand)
        $rigReadiness = $this->computeRigReadiness($resolvedRecent, $usableRigVials);

        // 7. Brand summary list
        $brandSummary = array_values(array_map(function (array $meta) {
            unset($meta['weighted_dpv_sum']);
            return $meta;
        }, $brandStockMap));
        if ($unspecifiedSummary['scheduled_doses_horizon'] > 0) {
            $brandSummary[] = $unspecifiedSummary;
        }

        // 8. Compact 7-day vial_readiness summary for /bite-cases & inventory banner
        $stockAfter7d = $dailySchedule[min(6, count($dailySchedule) - 1)]['projected_stock_after'] ?? $usableArvVials;
        $hasShortfall7d = $projectedStockoutDate !== null && $projectedStockoutDate <= $day7EndStr;
        $hasShortfall14d = $projectedStockoutDate !== null;

        $readinessStatus = 'ok';
        $readinessSeverity = 'ok';
        if ($hasShortfall7d || $rigReadiness['status'] === 'shortfall') {
            $readinessStatus = 'shortfall';
            $readinessSeverity = 'critical';
        } elseif ($hasShortfall14d || $rigReadiness['status'] === 'tight' || ($next7dVialsRealistic > 0 && $stockAfter7d <= max(3, (int) ceil($next7dVialsRealistic * 0.5)))) {
            $readinessStatus = 'tight';
            $readinessSeverity = 'warning';
        } elseif ($expiringUnusedTotal > 0 || $arvExpiring30d > 0) {
            $readinessStatus = 'expiring';
            $readinessSeverity = 'warning';
        }

        $headline = $this->buildVialReadinessHeadline(
            $readinessStatus,
            $usableArvVials,
            $next7dCommittedFollowups,
            $next7dVialsRealistic,
            $projectedStockoutDate,
            $expiringUnusedTotal,
            $rigReadiness
        );

        $vialReadiness = [
            'status' => $readinessStatus,
            'severity' => $readinessSeverity,
            'usable_arv_vials' => $usableArvVials,
            'usable_rig_vials' => $usableRigVials,
            'effective_doses_per_vial' => $effectiveDosesPerVial,
            'next_7d_committed_followups' => $next7dCommittedFollowups,
            'today_waiting_d0_doses' => (int) $sameDayWaiting['estimated_waiting_d0_doses'],
            'next_7d_expected_walkin_d0' => round($next7dExpectedWalkinD0, 1),
            'next_7d_vials_committed_only' => $next7dVialsCommitted,
            'next_7d_vials_realistic' => $next7dVialsRealistic,
            'next_7d_vials_conservative_im' => $next7dVialsConservativeIm,
            'next_14d_committed_followups' => $next14dCommittedFollowups,
            'next_14d_vials_realistic' => $next14dVialsRealistic,
            'projected_stock_after_7d' => $stockAfter7d,
            'projected_stockout_date' => $projectedStockoutDate,
            'committed_stockout_date' => $committedStockoutDate,
            'expiring_within_30d_vials' => $arvExpiring30d,
            'expiring_unused_vials' => $expiringUnusedTotal,
            'rig_pending_cases' => $rigReadiness['immediate_pending_cases'],
            'rig_projected_7d_vials' => $rigReadiness['projected_7d_rig_vials'],
            'rig_status' => $rigReadiness['status'],
            'high_wastage_days_next_7d' => $next7dHighWastageDays,
            'headline' => $headline,
        ];

        return [
            'rule_version' => self::RULE_VERSION,
            'reference_date' => $startStr,
            'horizon_days' => $horizonDays,
            'effective_doses_per_vial' => $effectiveDosesPerVial,
            'usable_stock' => [
                'arv_vials' => $usableArvVials,
                'rig_vials' => $usableRigVials,
                'arv_expiring_within_30d' => $arvExpiring30d,
                'rig_expiring_within_30d' => $rigExpiring30d,
                'earliest_arv_expiry' => $earliestArvExpiry,
                'earliest_rig_expiry' => $earliestRigExpiry,
            ],
            'same_day_waiting_demand' => $sameDayWaiting,
            'walkin_baseline' => [
                'd0_last_30d' => $d0Last30d,
                'open_days_last_30d' => $openDaysLast30,
                'daily_walkin_d0_rate' => $walkinDailyD0Rate,
            ],
            'daily_schedule' => $dailySchedule,
            'brand_summary' => $brandSummary,
            'expiring_before_use_batches' => $expiringBeforeUseBatches,
            'rig_readiness' => $rigReadiness,
            'vial_readiness' => $vialReadiness,
        ];
    }

    private function classifyBatchGroup(VaccineInventory $batch, array $rigBrands, Collection $presets): string
    {
        $type = (string) $batch->vaccine_type;
        $preset = $presets->get(strtolower(trim($type)));
        $cat = (string) ($preset?->category ?? '');

        if (
            ProphylaxisService::isRigBrand($type, $rigBrands)
            || (bool) preg_match('/(?:^|[^a-z])(?:RIG|ERIG|HRIG|immunoglobulin)(?:$|[^a-z])/i', $cat)
        ) {
            return 'rig';
        }

        if (
            ProphylaxisService::isTetanusBrand($type)
            || ProphylaxisService::isAtsBrand($type)
            || (bool) preg_match('/(?:^|[^a-z])(?:Tetanus|Toxoid|ATS|serum)(?:$|[^a-z])/i', $cat)
        ) {
            return 'other_prophylaxis';
        }

        return 'arv';
    }

    private function resolveBatchDosesPerVial(VaccineInventory $batch, Collection $presets): int
    {
        $batchDpv = (int) ($batch->doses_per_vial ?? 0);
        if ($batchDpv > 1) {
            return $batchDpv;
        }
        $preset = $presets->get(strtolower(trim((string) $batch->vaccine_type)));
        if ($preset && $preset->is_multidose && (int) ($preset->doses_per_vial ?? 0) > 1) {
            return (int) $preset->doses_per_vial;
        }

        return max(1, $batchDpv > 0 ? $batchDpv : 1);
    }

    private function resolveAppointmentDate(Appointment $appointment): string
    {
        $date = $appointment->scheduled_date ?? $appointment->appointment_date;
        if ($date instanceof \Carbon\CarbonInterface) {
            return $date->toDateString();
        }

        return substr((string) $date, 0, 10);
    }

    /**
     * Compute today's waiting-room D0 ARV demand from already-resolved recent episodes:
     * - Form 2 prescribed PEP with 0 ARV doses administered (recent 7 days): 100% weight
     * - Today's Form 1 unassessed registrations: multiplied by 30-day historical PEP initiation rate (default 85%)
     *
     * @param  array<int, array{episode: BiteIncident, state: array}>  $resolvedRecent
     */
    private function computeSameDayWaitingD0Demand(array $resolvedRecent, CarbonImmutable $start): array
    {
        $startStr = $start->toDateString();
        $recentCutoff = $start->subDays(7)->toDateString();

        $form1AwaitingToday = 0;
        $form2PrescribedUnstarted = 0;
        $finalized30d = 0;
        $pepPrescribed30d = 0;

        foreach ($resolvedRecent as $entry) {
            /** @var BiteIncident $episode */
            $episode = $entry['episode'];
            $state = $entry['state'];
            $assessment = (string) ($state['assessment'] ?? 'awaiting_assessment');
            $pepDecision = (string) ($state['pep_decision'] ?? '');
            $hasVaccineAdmin = (bool) ($state['administration_evidence']['has_vaccine_administration'] ?? false);
            $disposition = (string) ($state['encounter_disposition'] ?? 'open');
            $resolvedStatus = (string) ($state['resolved_status'] ?? '');
            $createdStr = $episode->created_at?->toDateString();
            $biteDateStr = $episode->bite_date ? substr((string) $episode->bite_date, 0, 10) : null;

            if ($assessment !== 'finalized') {
                if ($createdStr === $startStr || $biteDateStr === $startStr) {
                    $form1AwaitingToday++;
                }
                continue;
            }

            $isPepPrescribed = in_array($pepDecision, ['new_course_prescribed', 'continue_course'], true);
            $finalized30d++;
            if ($isPepPrescribed) {
                $pepPrescribed30d++;
            }

            if (
                $isPepPrescribed
                && !$hasVaccineAdmin
                && $disposition !== 'transferred_referred'
                && !in_array($resolvedStatus, ['transferred', 'completed', 'completed_no_pep'], true)
                && (($createdStr !== null && $createdStr >= $recentCutoff) || ($biteDateStr !== null && $biteDateStr >= $recentCutoff))
            ) {
                $form2PrescribedUnstarted++;
            }
        }

        $initiationRate = $finalized30d >= 5
            ? max(0.5, min(1.0, $pepPrescribed30d / $finalized30d))
            : 0.85;

        $estimatedFromForm1 = $form1AwaitingToday > 0 ? (int) ceil($form1AwaitingToday * $initiationRate) : 0;
        $estimatedWaitingD0 = $form2PrescribedUnstarted + $estimatedFromForm1;

        return [
            'form1_awaiting_today' => $form1AwaitingToday,
            'form2_prescribed_unstarted' => $form2PrescribedUnstarted,
            'estimated_waiting_d0_doses' => $estimatedWaitingD0,
            'historical_pep_initiation_rate_pct' => round($initiationRate * 100, 1),
        ];
    }

    /**
     * Resolve prescribed or previously administered ARV brand per episode ID.
     * Reuses already-loaded treatmentRecords from recentEpisodes before querying older episodes.
     *
     * @param  array<int>  $biteIds
     * @return array<int, string>
     */
    private function resolveEpisodeBrands(int $clinicId, array $biteIds, array $rigBrands, Collection $recentEpisodes): array
    {
        if (empty($biteIds)) {
            return [];
        }

        $brandMap = [];
        $recentById = $recentEpisodes->keyBy('bite_id');
        $missingBiteIds = [];

        $extractBrandFromRecords = static function (Collection $records) use ($rigBrands): ?string {
            $sorted = $records->sortByDesc(fn (TreatmentRecord $r) => sprintf(
                '%s-%010d',
                $r->treatment_date ? substr((string) $r->treatment_date, 0, 10) : '0000-00-00',
                (int) $r->treatment_id
            ));
            foreach ($sorted as $record) {
                $candidates = [
                    trim((string) ($record->medication_given ?? '')),
                    trim((string) ($record->prescribed_vaccine_type ?? '')),
                ];
                foreach ($candidates as $cand) {
                    if ($cand === '') {
                        continue;
                    }
                    if (
                        ProphylaxisService::isRigBrand($cand, $rigBrands)
                        || ProphylaxisService::isTetanusBrand($cand)
                        || ProphylaxisService::isAtsBrand($cand)
                    ) {
                        continue;
                    }

                    return $cand;
                }
            }

            return null;
        };

        foreach ($biteIds as $biteId) {
            $ep = $recentById->get($biteId);
            if ($ep && $ep->relationLoaded('treatmentRecords')) {
                $found = $extractBrandFromRecords($ep->treatmentRecords);
                if ($found !== null) {
                    $brandMap[(int) $biteId] = $found;
                }
            } else {
                $missingBiteIds[] = (int) $biteId;
            }
        }

        if (!empty($missingBiteIds)) {
            $recordsByBite = TreatmentRecord::where('clinic_id', $clinicId)
                ->whereIn('bite_id', $missingBiteIds)
                ->get(['treatment_id', 'bite_id', 'medication_given', 'prescribed_vaccine_type', 'treatment_date'])
                ->groupBy('bite_id');

            foreach ($recordsByBite as $biteId => $records) {
                $found = $extractBrandFromRecords($records);
                if ($found !== null) {
                    $brandMap[(int) $biteId] = $found;
                }
            }
        }

        return $brandMap;
    }

    /**
     * Calculate total vials needed for a single clinic day applying per-brand ceil()
     * (cannot mix brands in one vial or carry opened vials across days), while letting
     * unspecified/walk-in doses absorb spare capacity in already-opened vials first.
     *
     * @return array{vials: int, leftover_doses: float}
     */
    private function calculateDayVialsRequired(
        array $brandDoses,
        float $walkinD0,
        array $brandStockMap,
        float $effectiveDpv
    ): array {
        $totalVials = 0;
        $sparePortions = 0.0;
        $unspecifiedDoses = $walkinD0;

        foreach ($brandDoses as $brandLabel => $count) {
            $count = (int) $count;
            if ($count <= 0) {
                continue;
            }
            if ($brandLabel === self::UNSPECIFIED_ARV_BRAND) {
                $unspecifiedDoses += $count;
                continue;
            }
            $key = strtolower(trim($brandLabel));
            $dpv = max(1, (int) ($brandStockMap[$key]['doses_per_vial'] ?? round($effectiveDpv)));
            $vials = (int) ceil($count / $dpv);
            $totalVials += $vials;
            $sparePortions += max(0, ($vials * $dpv) - $count);
        }

        $remainingUnspecified = max(0.0, $unspecifiedDoses - $sparePortions);
        $leftoverFromOpened = max(0.0, $sparePortions - $unspecifiedDoses);

        if ($remainingUnspecified > 0.0) {
            $extraVials = (int) ceil($remainingUnspecified / max(1.0, $effectiveDpv));
            $totalVials += $extraVials;
            $leftoverFromOpened += max(0.0, ($extraVials * $effectiveDpv) - $remainingUnspecified);
        }

        return [
            'vials' => $totalVials,
            'leftover_doses' => round($leftoverFromOpened, 1),
        ];
    }

    private function deductFifoVials(array &$batches, int $vialsToDeduct): void
    {
        $remainingNeed = max(0, $vialsToDeduct);
        foreach ($batches as &$batch) {
            if ($remainingNeed <= 0) {
                break;
            }
            if ($batch['remaining'] <= 0) {
                continue;
            }
            $take = min($batch['remaining'], $remainingNeed);
            $batch['remaining'] -= $take;
            $remainingNeed -= $take;
        }
        unset($batch);
    }

    /**
     * @param  array<int, array{episode: BiteIncident, state: array}>  $resolvedRecent
     */
    private function computeRigReadiness(array $resolvedRecent, int $usableRigVials): array
    {
        $alertService = new ClinicalRiskAlertService();
        $pendingRigCount = 0;
        $recent30dCat3 = 0;
        foreach ($resolvedRecent as $entry) {
            $state = $entry['state'];
            if ($alertService->isRigPending($state)) {
                $pendingRigCount++;
            }
            if (($state['assessment'] ?? null) === 'finalized' && ($state['category'] ?? null) === 'III') {
                $recent30dCat3++;
            }
        }

        $projected7dCat3 = round(($recent30dCat3 / 30.0) * 7.0, 1);
        $projected7dRigVials = $pendingRigCount + (int) ceil($projected7dCat3);

        $status = 'ok';
        if ($usableRigVials < $pendingRigCount || ($usableRigVials === 0 && $projected7dRigVials > 0)) {
            $status = 'shortfall';
        } elseif ($usableRigVials < $projected7dRigVials) {
            $status = 'tight';
        }

        $headline = match ($status) {
            'shortfall' => $pendingRigCount > 0
                ? "RIG shortfall: {$usableRigVials} usable vial(s) for {$pendingRigCount} pending Category III patient(s)."
                : "RIG depleted: 0 usable RIG vials with ~{$projected7dCat3} weekly Category III presentation(s).",
            'tight' => "RIG stock tight: {$usableRigVials} usable vial(s) vs ~{$projected7dRigVials} projected 7-day need ({$pendingRigCount} pending now).",
            default => "RIG stock adequate: {$usableRigVials} usable vial(s) ({$pendingRigCount} pending now).",
        };

        return [
            'usable_rig_vials' => $usableRigVials,
            'immediate_pending_cases' => $pendingRigCount,
            'recent_30d_cat3_cases' => $recent30dCat3,
            'projected_7d_cat3_cases' => $projected7dCat3,
            'projected_7d_rig_vials' => $projected7dRigVials,
            'status' => $status,
            'headline' => $headline,
        ];
    }

    private function buildVialReadinessHeadline(
        string $status,
        int $usableArvVials,
        int $next7dFollowups,
        int $next7dVialsRealistic,
        ?string $projectedStockoutDate,
        int $expiringUnusedTotal,
        array $rigReadiness
    ): string {
        if ($status === 'shortfall') {
            if ($projectedStockoutDate !== null) {
                return "ARV shortfall projected on {$projectedStockoutDate}: {$usableArvVials} usable vial(s) vs ~{$next7dVialsRealistic} needed over next 7 days ({$next7dFollowups} scheduled follow-ups + walk-ins).";
            }

            return $rigReadiness['headline'];
        }
        if ($status === 'tight') {
            if ($rigReadiness['status'] === 'tight') {
                return $rigReadiness['headline'];
            }

            return "Next 7 days: {$next7dFollowups} scheduled follow-ups (~{$next7dVialsRealistic} ARV vials incl. walk-ins). Current stock: {$usableArvVials} vial(s) — reorder recommended.";
        }
        if ($status === 'expiring') {
            return $expiringUnusedTotal > 0
                ? "{$expiringUnusedTotal} ARV vial(s) projected to expire before consumption within 30 days — prioritize FIFO scheduling."
                : "Usable ARV stock covers next 7 days ({$usableArvVials} vials), with batches expiring within 30 days.";
        }

        return "Next 7 days covered: {$usableArvVials} usable ARV vial(s) for {$next7dFollowups} scheduled follow-ups (~{$next7dVialsRealistic} vials incl. walk-ins).";
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
