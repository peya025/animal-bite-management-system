<?php

namespace App\Services;

use App\Models\BiteIncident;
use App\Models\TreatmentRecord;
use App\Models\VaccineInventory;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class ProphylaxisService
{
    public const GROUPS = [
        'tetanus_vaccine' => ['TT'],
        'tetanus_passive' => ['ATS'],
        'rig' => ['ERIG'],
    ];

    public static function isTetanusBrand(string $vaccineType, array $knownBrands = []): bool
    {
        $name = trim($vaccineType);
        if ($name === '') return false;
        if (preg_match('/(?:^|[^a-z])ATS(?:$|[^a-z])|anti[- ]?tetanus serum|tetanus serum/i', $name)) {
            return false;
        }
        foreach ($knownBrands as $brand) {
            if (strcasecmp($brand, $name) === 0) {
                return true;
            }
        }
        return (bool) preg_match('/(?:^|[^a-z])(?:TT|Td|Tdap|DTaP)(?:$|[^a-z])|tetan|toxoid|tetavax/i', $name);
    }

    public static function isAtsBrand(string $vaccineType, array $knownBrands = []): bool
    {
        $name = trim($vaccineType);
        if ($name === '') return false;
        foreach ($knownBrands as $brand) {
            if (strcasecmp($brand, $name) === 0) {
                return true;
            }
        }
        return (bool) preg_match('/(?:^|[^a-z])ATS(?:$|[^a-z])|anti[- ]?tetanus serum|tetanus serum/i', $name);
    }

    public static function inventoryMedication(string $vaccineType, array $knownBrands = []): ?string
    {
        $name = trim($vaccineType);
        if (preg_match('/(?:^|[^a-z])ERIG(?:$|[^a-z])|equine rabies immunoglobulin|equine rabies immune globulin/i', $name)) return 'ERIG';
        if (self::isAtsBrand($name, $knownBrands)) return 'ATS';
        if (self::isTetanusBrand($name, $knownBrands)) {
            foreach ($knownBrands as $brand) {
                if (strcasecmp($brand, $name) === 0) {
                    return $brand;
                }
            }
            return 'TT';
        }
        return null;
    }

    public static function orderRules(): array
    {
        return [
            'prophylaxis_orders' => 'nullable|array:tetanus_category,tetanus_vaccine,tetanus_passive,rig,tetanus_history,tetanus_last_dose,rig_weight_kg,rig_indication,notes',
            'prophylaxis_orders.tetanus_category' => 'nullable|in:ats,tt,ats_tt,not_indicated',
            'prophylaxis_orders.tetanus_vaccine' => 'nullable|string|max:100',
            'prophylaxis_orders.tetanus_passive' => 'nullable|string|max:100',
            'prophylaxis_orders.rig' => 'nullable|in:none,ERIG',
            'prophylaxis_orders.tetanus_history' => 'nullable|in:unknown,incomplete,complete',
            'prophylaxis_orders.tetanus_last_dose' => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'prophylaxis_orders.rig_weight_kg' => 'nullable|numeric|gt:0|max:700',
            'prophylaxis_orders.rig_indication' => 'nullable|in:category_iii,immunocompromised',
            'prophylaxis_orders.notes' => 'nullable|string|max:4000',
        ];
    }

    public function validateOrders(array $orders, string $planType): void
    {
        $cat = $orders['tetanus_category'] ?? null;
        if ($cat === 'ats' && (empty($orders['tetanus_passive']) || $orders['tetanus_passive'] === 'none')) {
            $this->fail('Please select an available ATS product.');
        }
        if ($cat === 'tt' && (empty($orders['tetanus_vaccine']) || $orders['tetanus_vaccine'] === 'none')) {
            $this->fail('Please select an available TT vaccine product.');
        }
        if ($cat === 'ats_tt') {
            if (empty($orders['tetanus_passive']) || $orders['tetanus_passive'] === 'none') {
                $this->fail('Please select an available ATS product.');
            }
            if (empty($orders['tetanus_vaccine']) || $orders['tetanus_vaccine'] === 'none') {
                $this->fail('Please select an available TT vaccine product.');
            }
        }

        if (in_array($orders['rig'] ?? null, self::GROUPS['rig'], true)) {
            if ($planType !== 'full_pep') {
                $this->fail('RIG requires a full PEP order; it is not part of a booster-only or no-vaccine plan.');
            }
            if (empty($orders['rig_weight_kg']) || empty($orders['rig_indication'])) {
                $this->fail('Record verified weight and a clinical indication before prescribing RIG.');
            }
        }
        if (($orders['tetanus_passive'] ?? 'none') !== 'none' && !empty($orders['tetanus_passive']) && empty(trim($orders['notes'] ?? ''))) {
            $this->fail('ATS requires product-specific dose and precaution instructions from the doctor.');
        }
    }

    /** Called inside the vaccination transaction while holding the episode lock. */
    public function administer(BiteIncident $incident, string $planType, array $administrations, int $userId): void
    {
        if (!$administrations) {
            return;
        }
        $consultation = TreatmentRecord::where('clinic_id', $incident->clinic_id)
            ->where('patient_id', $incident->patient_id)->where('bite_id', $incident->bite_id)
            ->whereNotNull('nature_of_visit')->where('status', 'completed')->live()
            ->latest('treatment_id')->first();
        $orders = $consultation?->prophylaxis_orders ?? [];
        $this->validateOrders($orders, $planType);

        foreach ($administrations as $item) {
            $medication = $item['medication'];
            $isTetanus = self::isTetanusBrand($medication, array_filter([$orders['tetanus_vaccine'] ?? null]));
            $isAts = self::isAtsBrand($medication, array_filter([$orders['tetanus_passive'] ?? null]));
            $group = $isTetanus ? 'tetanus_vaccine' : ($isAts ? 'tetanus_passive' : collect(self::GROUPS)->search(fn ($products) => in_array($medication, $products, true)));
            if (!$group || ($orders[$group] ?? null) !== $medication) {
                $this->fail("{$medication} has no matching doctor prescription in Form 2.");
            }
            $existing = TreatmentRecord::where('clinic_id', $incident->clinic_id)
                ->where('patient_id', $incident->patient_id)->where('bite_id', $incident->bite_id)
                ->where(function ($query) use ($group, $medication, $orders) {
                    $query->whereIn('medication_given', match ($group) {
                        'rig' => ['ERIG', 'HRIG'],
                        'tetanus_vaccine' => array_values(array_unique(array_filter(['TT', 'Td', 'Tdap', 'DTaP', $medication, $orders['tetanus_vaccine'] ?? null]))),
                        default => ['ATS', 'TIG'],
                    });
                    // Preserve compatibility with historical treatment-card dose markers.
                    $query->orWhereIn('dose_number', match ($group) {
                        'rig' => [200, 201], 'tetanus_vaccine' => [300], default => [400, 401],
                    });
                })->where('status', 'completed')->live()->exists();
            if ($existing) {
                $this->fail("{$medication}: this prophylaxis group is already recorded for this episode. Review the existing administration.");
            }

            $date = Carbon::parse($item['date'])->startOfDay();
            if ($consultation->consultation_date && $date->lt(Carbon::parse($consultation->consultation_date)->startOfDay())) {
                $this->fail('Prophylaxis administration cannot precede the doctor prescription date.');
            }
            if ($incident->bite_date && $date->lt($incident->bite_date->copy()->startOfDay())) {
                $this->fail('Prophylaxis administration cannot precede the exposure date.');
            }
            if ($group === 'rig') {
                $category = $incident->severity;
                $immuneException = ($orders['rig_indication'] ?? '') === 'immunocompromised';
                if (!in_array($category, $immuneException ? ['moderate', 'severe'] : ['severe'], true)) {
                    $this->fail('RIG requires verified Category III exposure, or Category II/III with a documented immunocompromised indication.');
                }
                if ($incident->is_previously_vaccinated && !$immuneException) {
                    $this->fail('RIG is not indicated for previously immunized patients without a documented immunocompromised assessment.');
                }
                $firstVaccine = TreatmentRecord::where('clinic_id', $incident->clinic_id)
                    ->where('patient_id', $incident->patient_id)->where('bite_id', $incident->bite_id)
                    ->whereIn('dose_number', [0, 3, 7, 14, 21, 28, 90, 365])
                    ->where('status', 'completed')->whereNotNull('treatment_date')->live()->min('treatment_date');
                if (!$firstVaccine) {
                    $this->fail('Record the first rabies vaccine (including a verified external dose) before or together with RIG.');
                }
                $start = Carbon::parse($firstVaccine)->startOfDay();
                if ($date->lt($start) || $date->gt($start->copy()->addDays(7))) {
                    $this->fail('RIG must be administered from day 0 through day 7 after the first rabies vaccine, not after day 7.');
                }
                $maximum = (float) $orders['rig_weight_kg'] * 40;
                if (empty($item['dose_iu']) || (float) $item['dose_iu'] > $maximum + 0.001) {
                    $this->fail("{$medication} requires a dose in IU no greater than the weight-based maximum of {$maximum} IU.");
                }
                if (($item['route'] ?? 'wound_infiltration') !== 'wound_infiltration') {
                    $this->fail('RIG must be documented as wound infiltration.');
                }
            } else {
                $item['route'] = !empty($item['route']) ? $item['route'] : 'IM';
                if ($item['route'] !== 'IM') {
                    $this->fail('Tetanus prophylaxis must be documented as IM administration.');
                }
                $item['injection_site'] = !empty($item['injection_site']) ? $item['injection_site'] : 'Right deltoid';
                $item['dosage_ml'] = !empty($item['dosage_ml']) ? $item['dosage_ml'] : '0.5';
            }
            if ($group === 'tetanus_passive' && empty($item['dose_iu'])) {
                $this->fail('Record the administered ATS dose in IU.');
            }

            $batch = VaccineInventory::where('clinic_id', $incident->clinic_id)
                ->whereKey($item['inventory_id'])->where('status', 'active')
                ->where('current_quantity', '>=', $item['inventory_units_used'])->lockForUpdate()->first();
            $batchMedication = self::inventoryMedication($batch?->vaccine_type ?? '', [$medication]);
            $medicationMatches = ($batchMedication === $medication)
                || (strcasecmp($batch?->vaccine_type ?? '', $medication) === 0)
                || ($isTetanus && self::isTetanusBrand($batch?->vaccine_type ?? ''));
            if (!$batch || !$medicationMatches
                || !$batch->expiration_date || $batch->expiration_date->startOfDay()->lt($date)) {
                $this->fail("{$medication} requires a matching, unexpired clinic inventory batch with enough stock.");
            }

            $dosageML = (isset($item['dosage_ml']) && $item['dosage_ml'] !== '' && $item['dosage_ml'] !== null) ? $item['dosage_ml'] : null;
            $doseIU = (isset($item['dose_iu']) && $item['dose_iu'] !== '' && $item['dose_iu'] !== null) ? $item['dose_iu'] : null;

            $record = TreatmentRecord::create([
                'clinic_id' => $incident->clinic_id, 'patient_id' => $incident->patient_id,
                'bite_id' => $incident->bite_id, 'medication_given' => $medication,
                'treatment_date' => $item['date'], 'administered_by' => $userId,
                'administered_at' => now(), 'status' => 'completed',
                'vaccine_brand' => $batch->vaccine_type,
                'route' => $item['route'], 'injection_site' => $item['injection_site'],
                'dosage_ml' => $dosageML, 'dose_iu' => $doseIU,
                'remarks' => 'Prophylaxis administered against Form 2 order #'.$consultation->treatment_id,
            ]);
            $usage = app(VaccineInventoryUsageService::class)->deductForTreatment(
                (int) $incident->clinic_id, $userId, (int) $record->treatment_id,
                $batch->vaccine_type, (int) $item['inventory_units_used'], (int) $batch->inventory_id
            );
            $record->update([
                'inventory_id' => $batch->inventory_id,
                'inventory_units_used' => $usage['quantity_used'],
                'batch_no' => $batch->batch_number,
                'expiration_date' => $batch->expiration_date,
            ]);
        }
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['prophylaxis' => $message]);
    }
}
