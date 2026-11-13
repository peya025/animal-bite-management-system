<?php

namespace App\Services\Clinic;

use App\Models\Queue;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

/**
 * Centralized operational station capability and transition policy (Person 4).
 *
 * Keeps operational station checks cleanly decoupled from role authorization:
 * role middleware enforces WHO can attempt an action (403); this policy
 * enforces WHETHER the clinic's active station configuration permits it (422).
 */
class StationCapabilityPolicy
{
    public const STATION_REGISTRATION = 'registration';
    public const STATION_TRIAGE = 'triage';
    public const STATION_TREATMENT = 'treatment';

    public const ACTIVE_QUEUE_STATUSES = [
        'waiting',
        'called',
        'in_consultation',
        'serving',
        'second_chance',
        'final_recall',
    ];

    public const TRIAGE_VISIT_TYPES = [
        'new_case',
        'consultation',
        'booster',
    ];

    public const TREATMENT_VISIT_TYPES = [
        'vaccination',
        'follow_up',
        'observation',
    ];

    public function __construct(
        protected ClinicModuleConfigService $configService
    ) {}

    /**
     * Resolve effective station flags for a clinic context.
     *
     * @return array{registration_module_enabled: bool, triage_module_enabled: bool, treatment_module_enabled: bool}
     */
    public function getStationsForClinic(?int $clinicId): array
    {
        if (empty($clinicId) || $clinicId <= 0) {
            return [
                'registration_module_enabled' => false,
                'triage_module_enabled'       => false,
                'treatment_module_enabled'    => false,
            ];
        }

        $config = $this->configService->getOrCreateConfigForClinic($clinicId);

        return [
            'registration_module_enabled' => (bool) ($config->registration_module_enabled ?? true),
            'triage_module_enabled'       => (bool) ($config->triage_module_enabled ?? true),
            'treatment_module_enabled'    => (bool) ($config->treatment_module_enabled ?? true),
        ];
    }

    /**
     * Check whether a specific operational station is enabled for a clinic.
     */
    public function isStationEnabled(?int $clinicId, string $station): bool
    {
        if (empty($clinicId) || $clinicId <= 0) {
            return false;
        }

        $stations = $this->getStationsForClinic($clinicId);

        return match ($station) {
            self::STATION_REGISTRATION => $stations['registration_module_enabled'],
            self::STATION_TRIAGE       => $stations['triage_module_enabled'],
            self::STATION_TREATMENT    => $stations['treatment_module_enabled'],
            default                    => false,
        };
    }

    /**
     * Validate a proposed station configuration transition against the 8-combination
     * clinical matrix and active queue safety rules.
     *
     * Returns an associative array keyed by field name => error message.
     * Empty array means the transition is valid.
     *
     * @param int $clinicId
     * @param array<string, bool> $proposedStations
     * @return array<string, string>
     */
    public function validateConfigTransition(int $clinicId, array $proposedStations): array
    {
        $reg = (bool) ($proposedStations['registration_module_enabled'] ?? true);
        $tri = (bool) ($proposedStations['triage_module_enabled'] ?? true);
        $tx  = (bool) ($proposedStations['treatment_module_enabled'] ?? true);

        $errors = [];

        // 000: All stations disabled
        if (! $reg && ! $tri && ! $tx) {
            $msg = 'At least one operational station (Registration, Triage, or Treatment) must remain enabled.';
            $errors['registration_module_enabled'] = $msg;
            $errors['triage_module_enabled'] = $msg;
            $errors['treatment_module_enabled'] = $msg;
            return $errors;
        }

        // 101: Registration ON + Triage OFF + Treatment ON (unsafe triage bypass)
        if ($reg && ! $tri && $tx) {
            $errors['triage_module_enabled'] =
                'Triage cannot be disabled while Registration and Treatment are enabled. New exposures and Day 0 patients require Doctor assessment before treatment.';
            return $errors;
        }

        // 100: Registration ON + Triage OFF + Treatment OFF (strands newly registered patients)
        if ($reg && ! $tri && ! $tx) {
            $errors['triage_module_enabled'] =
                'Triage cannot be disabled while Registration is enabled because newly registered patients require clinical triage routing.';
            return $errors;
        }

        // 001: Disabling Triage (Follow-up Treatment Only mode) requires 0 active triage queue entries
        if (! $tri) {
            $activeTriageCount = $this->countActiveTriageQueueEntries($clinicId);
            if ($activeTriageCount > 0) {
                $errors['triage_module_enabled'] =
                    "Cannot disable Triage while {$activeTriageCount} patient(s) are active in today's Triage queue. Complete or cancel active triage tickets first.";
                return $errors;
            }
        }

        return $errors;
    }

    /**
     * Count active Triage queue entries for today in the given clinic.
     */
    public function countActiveTriageQueueEntries(int $clinicId): int
    {
        $todayDate = Carbon::today()->toDateString();

        return Queue::where('clinic_id', $clinicId)
            ->where('queue_date', $todayDate)
            ->whereNull('deleted_at')
            ->whereIn('status', self::ACTIVE_QUEUE_STATUSES)
            ->whereIn('visit_type', self::TRIAGE_VISIT_TYPES)
            ->count();
    }

    /**
     * Resolve which station owns a Queue entry based on visit_type.
     */
    public function resolveQueueStation(Queue $queue): string
    {
        if (in_array($queue->visit_type, self::TREATMENT_VISIT_TYPES, true)) {
            return self::STATION_TREATMENT;
        }

        return self::STATION_TRIAGE;
    }

    /**
     * Resolve which station owns a visit_type string.
     */
    public function resolveStationForVisitType(string $visitType): string
    {
        $normalized = strtolower(trim($visitType));
        if (in_array($normalized, self::TREATMENT_VISIT_TYPES, true)) {
            return self::STATION_TREATMENT;
        }

        return self::STATION_TRIAGE;
    }

    /**
     * Return a standardized 422 JsonResponse if the given station is disabled, or null if allowed.
     */
    public function guardStation(?int $clinicId, string $station, ?string $actionDescription = null): ?JsonResponse
    {
        if (empty($clinicId) || $clinicId <= 0) {
            return response()->json([
                'success' => false,
                'code'    => 'missing_clinic_context',
                'message' => 'Authenticated user has no associated clinic context.',
            ], 422);
        }

        if ($this->isStationEnabled($clinicId, $station)) {
            return null;
        }

        $label = match ($station) {
            self::STATION_REGISTRATION => 'Registration',
            self::STATION_TRIAGE       => 'Triage',
            self::STATION_TREATMENT    => 'Treatment',
            default                    => ucfirst($station),
        };

        $detail = $actionDescription
            ? "Cannot {$actionDescription} because the {$label} station is currently disabled for this clinic."
            : "The {$label} station is currently disabled for this clinic.";

        return response()->json([
            'success' => false,
            'code'    => 'station_disabled',
            'station' => $station,
            'message' => $detail,
        ], 422);
    }

    /**
     * Guard multiple required stations; returns the first failing 422 JsonResponse or null.
     *
     * @param array<int, string> $stations
     */
    public function guardStations(?int $clinicId, array $stations, ?string $actionDescription = null): ?JsonResponse
    {
        foreach ($stations as $station) {
            $denied = $this->guardStation($clinicId, $station, $actionDescription);
            if ($denied !== null) {
                return $denied;
            }
        }

        return null;
    }
}
