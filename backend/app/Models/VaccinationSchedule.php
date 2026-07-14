<?php

namespace App\Models;

use Carbon\Carbon;

/**
 * Backwards-compatible name for vaccination treatment records.
 * The database stores these in treatment_records.
 */
class VaccinationSchedule extends TreatmentRecord
{
    public static function generateWhoSchedule(BiteIncident $incident): void
    {
        $start = Carbon::parse($incident->bite_date);
        foreach ([0, 3, 7, 14, 28] as $day) {
            static::create([
                'clinic_id' => $incident->clinic_id,
                'patient_id' => $incident->patient_id,
                'bite_id' => $incident->bite_id,
                'protocol_type' => 'standard',
                'dose_number' => $day,
                'scheduled_date' => $start->copy()->addDays($day)->toDateString(),
                'status' => 'scheduled',
                'scheduled_by' => $incident->created_by,
            ]);
        }
    }

    public function markAsCompleted(User $user, array $data): void
    {
        $this->update([
            'status' => 'completed',
            'treatment_date' => now(),
            'administered_by' => $user->id,
            'administered_at' => now(),
            'vaccine_brand' => $data['vaccine_brand'],
            'batch_no' => $data['vaccine_batch_number'],
            'expiration_date' => $data['vaccine_expiry_date'] ?? null,
            'injection_site' => $data['injection_site'],
            'dosage_ml' => $data['dosage_ml'] ?? null,
            'adverse_reaction' => $data['adverse_reaction'] ?? null,
            'administration_notes' => $data['administration_notes'] ?? null,
        ]);
    }
}
