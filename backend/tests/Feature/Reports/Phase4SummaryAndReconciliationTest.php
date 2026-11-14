<?php

namespace Tests\Feature\Reports;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientDetails;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\Reporting\ReportingMetricService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase4SummaryAndReconciliationTest extends TestCase
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
        $this->travelTo(Carbon::create(2026, 12, 31, 16, 0, 0));

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
        string $firstName = 'Patient',
        string $lastName = 'Fixture',
        string $gender = 'male',
        string $dob = '1995-05-10',
        ?string $resBarangay = 'Poblacion',
        ?string $resCity = 'Tagoloan',
        ?string $resProvince = 'Misamis Oriental'
    ): Patient {
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => Str::uuid()->toString(),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'date_of_birth' => $dob,
            'gender' => $gender,
            'contact_number' => '09170000001',
        ]);

        if ($resBarangay !== null || $resCity !== null) {
            PatientDetails::create([
                'patient_id' => $patient->patient_id,
                'address_barangay' => $resBarangay,
                'address_city_municipality' => $resCity,
                'address_province' => $resProvince,
            ]);
        }

        return $patient;
    }

    private function seedPhase1SeventeenEpisodeFixture(): array
    {
        $patients = [];
        for ($i = 1; $i <= 16; $i++) {
            $code = sprintf('P%02d', $i);
            $patients[$code] = $this->createPatient(
                "First{$code}",
                "Last{$code}",
                $i % 2 === 0 ? 'female' : 'male',
                $i <= 4 ? '2016-05-01' : '1994-05-01',
                $i === 16 ? 'Baluarte' : 'Poblacion'
            );
        }

        $episodes = [];

        // E01: Form 1 registration only (no assessment)
        $episodes['E01'] = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P01']->patient_id,
            'case_number' => 'E01-2026',
            'episode_type' => 'pending_assessment',
            'bite_date' => '2026-11-01',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'unassessed',
            'animal_type' => 'dog',
            'status' => 'awaiting_assessment',
            'created_by' => $this->admin->id,
            'created_at' => '2026-11-01 09:00:00',
        ]);

        // E02: Form 2 draft in progress (category null, decision undetermined)
        $episodes['E02'] = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P02']->patient_id,
            'case_number' => 'E02-2026',
            'episode_type' => 'pending_assessment',
            'bite_date' => '2026-11-02',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Sta. Cruz, Tagoloan',
            'severity' => 'unassessed',
            'animal_type' => 'cat',
            'status' => 'awaiting_assessment',
            'created_by' => $this->admin->id,
            'created_at' => '2026-11-02 09:00:00',
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P02']->patient_id,
            'bite_id' => $episodes['E02']->bite_id,
            'dose_number' => null,
            'status' => 'draft',
            'consultation_date' => '2026-11-02',
            'chief_complaints' => 'Draft assessment pending completion',
            'scheduled_by' => $this->doctor->id,
        ]);

        // E03: Finalized assessment, missing category & missing PEP decision
        $episodes['E03'] = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P03']->patient_id,
            'case_number' => 'E03-2026',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-03',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Casinglot',
            'severity' => 'unassessed',
            'animal_type' => 'dog',
            'status' => 'active',
            'confirmed_at' => '2026-11-03 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
            'created_at' => '2026-11-03 09:00:00',
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P03']->patient_id,
            'bite_id' => $episodes['E03']->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-03',
            'diagnosis' => 'Exposed - incomplete category/decision entry',
            'administered_by' => $this->doctor->id,
        ]);

        // E04: Cat I explicit No PEP, encounter closed
        $episodes['E04'] = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P04']->patient_id,
            'case_number' => 'E04-2026',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-04',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Brgy. Poblacion, Tagoloan, Misamis Oriental',
            'severity' => 'minor',
            'animal_type' => 'dog',
            'status' => 'completed_no_pep',
            'confirmed_at' => '2026-11-04 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P04']->patient_id,
            'bite_id' => $episodes['E04']->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-04',
            'diagnosis' => 'Category I intact skin lick',
            'outcome' => 'completed_without_injection',
            'prophylaxis_orders' => ['consultation_treatment_plan' => 'no_vaccine', 'rig' => 'none'],
            'administered_by' => $this->doctor->id,
        ]);

        // E05: Cat I explicit No PEP, encounter open with pending TT care
        $episodes['E05'] = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P05']->patient_id,
            'case_number' => 'E05-2026',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-05',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'minor',
            'animal_type' => 'cat',
            'status' => 'active',
            'confirmed_at' => '2026-11-05 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P05']->patient_id,
            'bite_id' => $episodes['E05']->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-05',
            'diagnosis' => 'Category I minor scratch - TT only',
            'prophylaxis_orders' => [
                'consultation_treatment_plan' => 'no_vaccine',
                'tetanus_vaccine' => 'TT',
                'rig' => 'none',
            ],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P05']->patient_id,
            'bite_id' => $episodes['E05']->bite_id,
            'dose_number' => 300,
            'medication_given' => 'Tetanus Toxoid',
            'status' => 'scheduled',
            'scheduled_date' => '2026-11-05',
            'scheduled_by' => $this->doctor->id,
        ]);

        // E06: Cat II full PEP prescribed, NO administration recorded (C06)
        $episodes['E06'] = $this->seedEpisodeWithPlan(
            $patients['P06'],
            'E06-2026',
            '2026-11-06',
            'moderate',
            'Poblacion',
            'full_pep',
            [0, 3, 7],
            '2026-11-06'
        );

        // E07: Cat III full PEP + RIG indicated, transferred/referred, NO administration (C07)
        $episodes['E07'] = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P07']->patient_id,
            'case_number' => 'E07-2026',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-07',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Baluarte, Tagoloan',
            'severity' => 'severe',
            'animal_type' => 'dog',
            'status' => 'transferred_out',
            'transferred_to_facility' => 'NMMC',
            'transferred_at' => '2026-11-07 12:00:00',
            'rig_decision_reason' => 'ERIG indicated',
            'confirmed_at' => '2026-11-07 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P07']->patient_id,
            'bite_id' => $episodes['E07']->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-07',
            'diagnosis' => 'Category III bite - referred with PEP + RIG order',
            'prescribed_vaccine_type' => 'Purified Vero Cell Rabies Vaccine',
            'prophylaxis_orders' => ['consultation_treatment_plan' => 'full_pep', 'rig' => 'ERIG'],
            'outcome' => 'Transferred/Referred',
            'referred_to' => 'NMMC',
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P07']->patient_id,
            'bite_id' => $episodes['E07']->bite_id,
            'plan_type' => 'full_pep',
            'ordered_dose_days' => [0, 3, 7],
            'decided_at' => '2026-11-07 10:00:00',
            'decided_by' => $this->doctor->id,
        ]);

        // E08 (C08): Cat II full PEP completed locally on 11-08, 11-11, 11-15
        $episodes['E08'] = $this->seedEpisodeWithPlan(
            $patients['P08'],
            'E08-2026',
            '2026-11-08',
            'moderate',
            'Poblacion',
            'full_pep',
            [0, 3, 7],
            '2026-11-08'
        );
        $this->addLocalArvDose($episodes['E08'], 0, '2026-11-08');
        $this->addLocalArvDose($episodes['E08'], 3, '2026-11-11');
        $this->addLocalArvDose($episodes['E08'], 7, '2026-11-15');

        // E09 (C09): Cat III full PEP + local RIG; D0 on 11-09, D3 cancelled 11-12, D7 voided 11-16
        $episodes['E09'] = $this->seedEpisodeWithPlan(
            $patients['P09'],
            'E09-2026',
            '2026-11-09',
            'severe',
            'Sta. Cruz',
            'full_pep',
            [0, 3, 7],
            '2026-11-09',
            'ERIG'
        );
        $this->addLocalArvDose($episodes['E09'], 0, '2026-11-09');
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P09']->patient_id,
            'bite_id' => $episodes['E09']->bite_id,
            'dose_number' => 3,
            'medication_given' => 'Speeda',
            'status' => 'cancelled',
            'scheduled_date' => '2026-11-12',
            'scheduled_by' => $this->nurse->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P09']->patient_id,
            'bite_id' => $episodes['E09']->bite_id,
            'dose_number' => 7,
            'medication_given' => 'Speeda',
            'status' => 'completed',
            'treatment_date' => '2026-11-16',
            'scheduled_date' => '2026-11-16',
            'voided_at' => '2026-11-16 14:00:00',
            'void_reason' => 'Duplicate entry voided',
            'administered_by' => $this->nurse->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P09']->patient_id,
            'bite_id' => $episodes['E09']->bite_id,
            'dose_number' => 201,
            'medication_given' => 'Equirab ERIG',
            'status' => 'completed',
            'treatment_date' => '2026-11-09',
            'administered_by' => $this->nurse->id,
        ]);

        // E10 (C10): Cat II full PEP spanning Nov -> Dec (D0 11-29, D3 12-02, D7 12-06)
        $episodes['E10'] = $this->seedEpisodeWithPlan(
            $patients['P10'],
            'E10-2026',
            '2026-11-29',
            'moderate',
            'Natumolan',
            'full_pep',
            [0, 3, 7],
            '2026-11-29'
        );
        $this->addLocalArvDose($episodes['E10'], 0, '2026-11-29');
        $this->addLocalArvDose($episodes['E10'], 3, '2026-12-02');
        $this->addLocalArvDose($episodes['E10'], 7, '2026-12-06');

        // E11 (C11): Cat II two-dose booster on 11-11 and 11-14
        $episodes['E11'] = $this->seedEpisodeWithPlan(
            $patients['P11']->patient_id === null ? $patients['P11'] : $patients['P11'],
            'E11-2026',
            '2026-11-11',
            'moderate',
            'Casinglot',
            'two_dose_booster',
            [0, 3],
            '2026-11-11',
            null,
            true
        );
        $this->addLocalArvDose($episodes['E11'], 0, '2026-11-11');
        $this->addLocalArvDose($episodes['E11'], 3, '2026-11-14');

        // E12 (C12): Cat III full PEP + verified external ARV + verified external RIG
        $episodes['E12'] = $this->seedEpisodeWithPlan(
            $patients['P12'],
            'E12-2026',
            '2026-11-12',
            'severe',
            'Mohon',
            'full_pep',
            [0, 3, 7],
            '2026-11-12',
            'HRIG'
        );
        $episodes['E12']->update([
            'verification_source' => 'referral_slip_verified',
            'external_proof_reviewed_at' => '2026-11-19 10:00:00',
        ]);
        $this->addExternalArvDose($episodes['E12'], 0, '2026-11-12');
        $this->addExternalArvDose($episodes['E12'], 3, '2026-11-15');
        $this->addExternalArvDose($episodes['E12'], 7, '2026-11-19');
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P12']->patient_id,
            'bite_id' => $episodes['E12']->bite_id,
            'dose_number' => 200,
            'medication_given' => 'HRIG',
            'status' => 'completed',
            'treatment_date' => '2026-11-12',
            'is_external' => true,
            'administered_by' => $this->nurse->id,
        ]);

        // E13 (C13): Cat II full_pep prescribed after prior primary, NO administration recorded
        $episodes['E13'] = $this->seedEpisodeWithPlan(
            $patients['P13'],
            'E13-2026',
            '2026-11-13',
            'moderate',
            'Gracia',
            'full_pep',
            [0, 3, 7],
            '2026-11-13',
            null,
            true
        );

        // E14 (C14): Oct 31 exposure, D0 10-31, D3 11-03, D7 11-07
        $episodes['E14'] = $this->seedEpisodeWithPlan(
            $patients['P14'],
            'E14-2026',
            '2026-10-31',
            'moderate',
            'Sugbongcogon',
            'full_pep',
            [0, 3, 7],
            '2026-10-31'
        );
        $this->addLocalArvDose($episodes['E14'], 0, '2026-10-31');
        $this->addLocalArvDose($episodes['E14'], 3, '2026-11-03');
        $this->addLocalArvDose($episodes['E14'], 7, '2026-11-07');

        // E15 (C15): Dec 01 exposure, D0 12-01, D3 12-04, D7 12-08
        $episodes['E15'] = $this->seedEpisodeWithPlan(
            $patients['P15'],
            'E15-2026',
            '2026-12-01',
            'moderate',
            'Rosario',
            'full_pep',
            [0, 3, 7],
            '2026-12-01'
        );
        $this->addLocalArvDose($episodes['E15'], 0, '2026-12-01');
        $this->addLocalArvDose($episodes['E15'], 3, '2026-12-04');
        $this->addLocalArvDose($episodes['E15'], 7, '2026-12-08');

        // E16: Registered 2026-11-13 with provisional bite_date
        $episodes['E16'] = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P16']->patient_id,
            'case_number' => 'E16-2026',
            'episode_type' => 'pending_assessment',
            'bite_date' => '2026-11-13',
            'bite_date_is_provisional' => true,
            'bite_place' => 'Baluarte',
            'severity' => 'unassessed',
            'animal_type' => 'dog',
            'status' => 'awaiting_assessment',
            'created_by' => $this->admin->id,
        ]);
        $episodes['E16']->forceFill([
            'created_at' => '2026-11-13 09:00:00',
            'updated_at' => '2026-11-13 09:00:00',
        ])->saveQuietly();

        // E17: Continuing-course exposure on P08 linked to C08/E08 (must NOT double-count C08)
        $episodes['E17'] = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P08']->patient_id,
            'case_number' => 'E17-2026',
            'episode_type' => 'reexposure_within_90d',
            'bite_date' => '2026-11-15',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'moderate',
            'animal_type' => 'dog',
            'status' => 'completed',
            'confirmed_at' => '2026-11-15 10:00:00',
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P08']->patient_id,
            'bite_id' => $episodes['E17']->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => '2026-11-15',
            'diagnosis' => 'Re-exposure covered by active course C08',
            'prophylaxis_orders' => ['consultation_treatment_plan' => 'continue_existing_schedule'],
            'administered_by' => $this->doctor->id,
        ]);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patients['P08']->patient_id,
            'bite_id' => $episodes['E17']->bite_id,
            'plan_type' => 'continue_existing_schedule',
            'continued_from_bite_id' => $episodes['E08']->bite_id,
            'decided_at' => '2026-11-15 10:00:00',
            'decided_by' => $this->doctor->id,
        ]);

        // Excluded inputs: BOOK01 (booking only), DRAFT01 (voided draft), PERSON01 (demographic only)
        $excludedPatient = $this->createPatient('Excluded', 'PersonOnly', 'female', '1991-03-03');
        Appointment::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $excludedPatient->patient_id,
            'bite_id' => null,
            'dose_number' => 0,
            'appointment_date' => '2026-11-10',
            'status' => 'scheduled',
            'created_by' => $this->admin->id,
        ]);
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $excludedPatient->patient_id,
            'case_number' => 'DRAFT01',
            'episode_type' => 'pending_assessment',
            'bite_date' => '2026-11-10',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Poblacion',
            'severity' => 'unassessed',
            'animal_type' => 'dog',
            'status' => 'voided',
            'created_by' => $this->admin->id,
        ]);

        return $episodes;
    }

    private function seedEpisodeWithPlan(
        Patient $patient,
        string $caseNumber,
        string $biteDate,
        string $severity,
        string $bitePlace,
        string $planType,
        array $orderedDoseDays,
        string $consultationDate,
        ?string $rigOrder = null,
        bool $isReExposure = false
    ): BiteIncident {
        $incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => $caseNumber,
            'episode_type' => $isReExposure ? 'reexposure_after_90d' : 'primary',
            'bite_date' => $biteDate,
            'bite_date_is_provisional' => false,
            'bite_place' => $bitePlace,
            'severity' => $severity,
            'animal_type' => 'dog',
            'rig_decision_reason' => $rigOrder ? "{$rigOrder} indicated" : null,
            'status' => 'active',
            'confirmed_at' => "{$consultationDate} 10:00:00",
            'confirmed_by' => $this->doctor->id,
            'created_by' => $this->admin->id,
        ]);

        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => null,
            'status' => 'completed',
            'consultation_date' => $consultationDate,
            'diagnosis' => "Assessed {$severity}",
            'prescribed_vaccine_type' => 'Purified Vero Cell Rabies Vaccine',
            'prophylaxis_orders' => [
                'consultation_treatment_plan' => $planType,
                'rig' => $rigOrder ?: 'none',
            ],
            'administered_by' => $this->doctor->id,
        ]);

        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'plan_type' => $planType,
            'ordered_dose_days' => $orderedDoseDays,
            'decided_at' => "{$consultationDate} 10:00:00",
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

    private function addExternalArvDose(BiteIncident $incident, int $doseNumber, string $date): void
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
            'is_external' => true,
            'administered_by' => $this->nurse->id,
        ]);
    }

    public function test_phase1_seventeen_episode_fixture_reconciles_all_five_endpoints_for_november_and_q4(): void
    {
        $this->seedPhase1SeventeenEpisodeFixture();

        // 1. November exposure report with November cutoff (2026-11-01..2026-11-30, cutoff 2026-11-30)
        $novSummary = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&no_cache=1')
            ->assertOk();

        $novSummary->assertJsonPath('scope.rule_version', ReportingMetricService::RULE_VERSION)
            ->assertJsonPath('indicators.recorded_exposures.value', 14)
            ->assertJsonPath('indicators.unique_patients.value', 13)
            ->assertJsonPath('indicators.unknown_exposure_date_episodes.value', 1)
            ->assertJsonPath('indicators.finalized_assessments.value', 12)
            ->assertJsonPath('indicators.unassessed_episodes.value', 2)
            ->assertJsonPath('breakdowns.by_category.I', 2)
            ->assertJsonPath('breakdowns.by_category.II', 6)
            ->assertJsonPath('breakdowns.by_category.III', 3)
            ->assertJsonPath('breakdowns.by_category.not_yet_assessed', 2)
            ->assertJsonPath('breakdowns.by_category.assessed_category_missing', 1)
            ->assertJsonPath('indicators.new_course_prescribed.value', 8)
            ->assertJsonPath('indicators.new_course_started.value', 5)
            ->assertJsonPath('indicators.no_administration_recorded.value', 3)
            ->assertJsonPath('indicators.continuing_episodes.value', 1)
            ->assertJsonPath('indicators.mature_started_courses.value', 4)
            ->assertJsonPath('indicators.completed_mature_courses.value', 3)
            ->assertJsonPath('indicators.ongoing_not_mature_courses.value', 1)
            ->assertJsonPath('indicators.overdue_episodes.value', 1)
            ->assertJsonPath('indicators.outstanding_dose_slots.value', 2)
            ->assertJsonPath('indicators.rig_indicated.value', 3)
            ->assertJsonPath('indicators.rig_verified.value', 2)
            ->assertJsonPath('indicators.transferred_referred.value', 1)
            ->assertJsonPath('indicators.local_arv_events_in_service_period.value', 9)
            ->assertJsonPath('indicators.external_arv_events_in_service_period.value', 3)
            ->assertJsonPath('reconciliation.recorded_episodes_bridge.total_recorded_episodes', 14)
            ->assertJsonPath('reconciliation.recorded_episodes_bridge.continuing_episodes', 1)
            ->assertJsonPath('reconciliation.abtc_monthly_form.cases_total', 14)
            ->assertJsonPath('reconciliation.abtc_monthly_form.given_pep', 5)
            ->assertJsonPath('reconciliation.abtc_monthly_form.completed_cat_I', 0)
            ->assertJsonPath('reconciliation.abtc_monthly_form.completed_cat_II', 2)
            ->assertJsonPath('reconciliation.abtc_monthly_form.completed_cat_III', 1)
            ->assertJsonPath('reconciliation.abtc_monthly_form.completed_total', 3)
            ->assertJsonPath('reconciliation.abtc_monthly_form.given_rig', 2)
            ->assertJsonPath('reconciliation.cohort_quarterly_form_slice.cases_total', 11)
            ->assertJsonPath('reconciliation.cohort_quarterly_form_slice.excluded_unassessed_or_missing_cat', 3)
            ->assertJsonPath('reconciliation.cohort_quarterly_form_slice.given_pep_total', 5)
            ->assertJsonPath('reconciliation.cohort_quarterly_form_slice.completed_total', 3)
            ->assertJsonPath('reconciliation.cohort_quarterly_form_slice.given_rig_total', 2);

        // Reconcile Existing 4 Endpoints on November cutoff
        $this->getJson('/api/reports/exposure-registry?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30')
            ->assertOk()
            ->assertJsonPath('rule_version', ReportingMetricService::RULE_VERSION)
            ->assertJsonPath('totals.total', 14)
            ->assertJsonPath('totals.cat_1', 2)
            ->assertJsonPath('totals.cat_2', 6)
            ->assertJsonPath('totals.cat_3', 3)
            ->assertJsonPath('totals.cat_unassessed', 3)
            ->assertJsonPath('unknown_exposure_date_count', 1)
            ->assertJsonPath('reconciliation_bridge.recorded_episodes_bridge.total_recorded_episodes', 14)
            ->assertJsonPath('service_period_metrics.local_arv_events_in_service_period', 9)
            ->assertJsonPath('service_period_metrics.external_arv_events_in_service_period', 3);

        $this->getJson('/api/reports/monthly?month=2026-11&cutoff=2026-11-30')
            ->assertOk()
            ->assertJsonPath('rule_version', ReportingMetricService::RULE_VERSION)
            ->assertJsonPath('total_cases', 14)
            ->assertJsonPath('given_pep', 5)
            ->assertJsonPath('cat_1', 2)
            ->assertJsonPath('cat_2', 6)
            ->assertJsonPath('cat_3', 3)
            ->assertJsonPath('unassessed_cases', 3)
            ->assertJsonPath('completed_cat_1', 0)
            ->assertJsonPath('completed_cat_2', 2)
            ->assertJsonPath('completed_cat_3', 1)
            ->assertJsonPath('total_completed', 3)
            ->assertJsonPath('given_rig', 2)
            ->assertJsonPath('unknown_exposure_date_count', 1)
            ->assertJsonPath('reconciliation_bridge.abtc_monthly_form.given_pep', 5)
            ->assertJsonPath('reconciliation_bridge.abtc_monthly_form.completed_total', 3);

        $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30')
            ->assertOk()
            ->assertJsonPath('rule_version', ReportingMetricService::RULE_VERSION)
            ->assertJsonPath('summary.total_cases', 14)
            ->assertJsonPath('summary.unknown_exposure_date_count', 1)
            ->assertJsonPath('reconciliation_bridge.recorded_episodes_bridge.total_recorded_episodes', 14)
            ->assertJsonPath('d0_cohort_metrics.completed_mature_courses', 3)
            ->assertJsonPath('service_period_metrics.local_arv_events_in_service_period', 9);

        // 2. Q4 exposure report with December cutoff (2026-10-01..2026-12-31, cutoff 2026-12-31)
        $q4Summary = $this->getJson('/api/reports/bite-summary?from=2026-10-01&to=2026-12-31&cutoff=2026-12-31&no_cache=1')
            ->assertOk();

        $q4Summary->assertJsonPath('indicators.recorded_exposures.value', 16)
            ->assertJsonPath('indicators.unique_patients.value', 15)
            ->assertJsonPath('indicators.unknown_exposure_date_episodes.value', 1)
            ->assertJsonPath('indicators.finalized_assessments.value', 14)
            ->assertJsonPath('indicators.unassessed_episodes.value', 2)
            ->assertJsonPath('breakdowns.by_category.I', 2)
            ->assertJsonPath('breakdowns.by_category.II', 8)
            ->assertJsonPath('breakdowns.by_category.III', 3)
            ->assertJsonPath('breakdowns.by_category.assessed_category_missing', 1)
            ->assertJsonPath('indicators.new_course_prescribed.value', 10)
            ->assertJsonPath('indicators.new_course_started.value', 7)
            ->assertJsonPath('indicators.no_administration_recorded.value', 3)
            ->assertJsonPath('indicators.continuing_episodes.value', 1)
            ->assertJsonPath('indicators.mature_started_courses.value', 7)
            ->assertJsonPath('indicators.completed_mature_courses.value', 6)
            ->assertJsonPath('indicators.ongoing_not_mature_courses.value', 0)
            ->assertJsonPath('indicators.overdue_episodes.value', 1)
            ->assertJsonPath('indicators.outstanding_dose_slots.value', 2)
            ->assertJsonPath('indicators.rig_indicated.value', 3)
            ->assertJsonPath('indicators.rig_verified.value', 2)
            ->assertJsonPath('indicators.transferred_referred.value', 1)
            ->assertJsonPath('indicators.local_arv_events_in_service_period.value', 15)
            ->assertJsonPath('indicators.external_arv_events_in_service_period.value', 3)
            ->assertJsonPath('reconciliation.abtc_monthly_form.cases_total', 16)
            ->assertJsonPath('reconciliation.abtc_monthly_form.given_pep', 7)
            ->assertJsonPath('reconciliation.abtc_monthly_form.completed_cat_II', 5)
            ->assertJsonPath('reconciliation.abtc_monthly_form.completed_cat_III', 1)
            ->assertJsonPath('reconciliation.abtc_monthly_form.completed_total', 6);

        $this->getJson('/api/reports/cohort?year=2026&cutoff=2026-12-31')
            ->assertOk()
            ->assertJsonPath('rule_version', ReportingMetricService::RULE_VERSION)
            ->assertJsonPath('quarters.q4.cat_I.cases', 2)
            ->assertJsonPath('quarters.q4.cat_II.cases', 8)
            ->assertJsonPath('quarters.q4.cat_III.cases', 3)
            ->assertJsonPath('quarters.q4.total.cases', 13)
            ->assertJsonPath('quarters.q4.unassessed_cases', 3)
            ->assertJsonPath('quarters.q4.unknown_exposure_date_count', 1)
            ->assertJsonPath('quarters.q4.cat_II.given_pep', 5)
            ->assertJsonPath('quarters.q4.cat_III.given_pep', 2)
            ->assertJsonPath('quarters.q4.total.given_pep', 7)
            ->assertJsonPath('quarters.q4.cat_II.completed', 5)
            ->assertJsonPath('quarters.q4.cat_III.completed', 1)
            ->assertJsonPath('quarters.q4.total.completed', 6)
            ->assertJsonPath('quarters.q4.cat_III.given_rig', 2)
            ->assertJsonPath('quarters.q4.reconciliation_bridge.recorded_episodes_bridge.total_recorded_episodes', 16)
            ->assertJsonPath('quarters.q4.reconciliation_bridge.cohort_quarterly_form_slice.given_pep_total', 7)
            ->assertJsonPath('quarters.q4.reconciliation_bridge.cohort_quarterly_form_slice.completed_total', 6);
    }

    public function test_aggregate_only_privacy_and_authorized_drilldown_endpoints_a15(): void
    {
        $this->seedPhase1SeventeenEpisodeFixture();

        $summaryRes = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&privacy_mode=aggregate_only')
            ->assertOk()
            ->assertJsonPath('scope.privacy_mode', 'aggregate_only');

        $encoded = json_encode($summaryRes->json(), JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString('FirstP01', $encoded);
        $this->assertStringNotContainsString('LastP08', $encoded);
        $this->assertStringNotContainsString('E08-2026', $encoded);
        $this->assertStringNotContainsString('patient_cases', $encoded);
        $this->assertArrayNotHasKey('cases', $summaryRes->json());

        // Existing 4 endpoints honor aggregate_only=1
        $regAgg = $this->getJson('/api/reports/exposure-registry?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&aggregate_only=1')->assertOk();
        $this->assertArrayNotHasKey('patient_cases', $regAgg->json());
        $this->assertArrayNotHasKey('clinic_model', $regAgg->json());

        $monAgg = $this->getJson('/api/reports/monthly?month=2026-11&cutoff=2026-11-30&aggregate_only=1')->assertOk();
        $this->assertArrayNotHasKey('patient_cases', $monAgg->json());
        $this->assertArrayNotHasKey('clinic_model', $monAgg->json());

        $cohAgg = $this->getJson('/api/reports/cohort?year=2026&cutoff=2026-11-30&aggregate_only=1')->assertOk();
        $this->assertArrayNotHasKey('patient_cases', $cohAgg->json());
        $this->assertArrayNotHasKey('clinic_model', $cohAgg->json());

        $locAgg = $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&aggregate_only=1')->assertOk();
        $this->assertArrayNotHasKey('cases', $locAgg->json());

        // Separate authorized drill-down endpoint returns bucketed case details
        $drillRes = $this->getJson('/api/reports/bite-summary/cases?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&bucket=no_administration_recorded')
            ->assertOk()
            ->assertJsonPath('pagination.total', 3);

        $caseNumbers = collect($drillRes->json('cases'))->pluck('case_number')->sort()->values()->all();
        $this->assertSame(['E06-2026', 'E07-2026', 'E13-2026'], $caseNumbers);

        // Unauthorized PatientAccount and cross-clinic admin are blocked
        $patientUser = PatientAccount::create([
            'name' => 'Portal Patient',
            'email' => 'portal@example.test',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);
        Sanctum::actingAs($patientUser);
        $this->getJson('/api/reports/bite-summary')->assertForbidden();
        $this->getJson('/api/reports/bite-summary/cases')->assertForbidden();

        $otherClinic = Clinic::create([
            'name' => 'Other Clinic',
            'municipality' => 'Balingasag',
            'province' => 'Misamis Oriental',
            'status' => 'active',
        ]);
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/reports/bite-summary?clinic_id=' . $otherClinic->id)->assertForbidden();
    }

    public function test_comparison_filter_parity_and_prior_zero_handling_a16(): void
    {
        $patient = $this->createPatient('Parity', 'Subject');

        // Prior period: 2026-10-01..2026-10-31 -> one awaiting_treatment case (prescribed PEP, no administration)
        $priorIncident = $this->seedEpisodeWithPlan(
            $patient,
            'PAR-PRIOR-1',
            '2026-10-15',
            'moderate',
            'Poblacion',
            'full_pep',
            [0, 3, 7],
            '2026-10-15'
        );
        // Raw DB status stays 'active', resolved_status is 'awaiting_treatment'
        $this->assertSame('active', $priorIncident->status);

        // Current period: 2026-11-01..2026-11-30 -> one awaiting_treatment in Poblacion, one in newly appearing Mohon
        $this->seedEpisodeWithPlan(
            $patient,
            'PAR-CUR-1',
            '2026-11-10',
            'moderate',
            'Poblacion',
            'full_pep',
            [0, 3, 7],
            '2026-11-10'
        );
        $this->seedEpisodeWithPlan(
            $patient,
            'PAR-CUR-2',
            '2026-11-12',
            'severe',
            'Mohon',
            'full_pep',
            [0, 3, 7],
            '2026-11-12'
        );

        // With status=awaiting_treatment filter, prior period MUST also match resolved_status='awaiting_treatment'
        $summaryRes = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&comparison=previous_period&status=awaiting_treatment&no_cache=1')
            ->assertOk()
            ->assertJsonPath('comparison.enabled', true)
            ->assertJsonPath('comparison.prior_record_count', 1)
            ->assertJsonPath('comparison.indicators.recorded_exposures.current', 2)
            ->assertJsonPath('comparison.indicators.recorded_exposures.prior', 1)
            ->assertJsonPath('comparison.indicators.recorded_exposures.delta', 1)
            ->assertJsonPath('comparison.indicators.recorded_exposures.pct_change', 100)
            ->assertJsonPath('comparison.indicators.documented_pep_initiation_pct.current', 0)
            ->assertJsonPath('comparison.indicators.documented_pep_initiation_pct.prior', 0);

        $locRes = $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&status=awaiting_treatment')
            ->assertOk();

        $locations = collect($locRes->json('locations'));
        $poblacion = $locations->firstWhere('location', 'Poblacion');
        $mohon = $locations->firstWhere('location', 'Mohon');

        $this->assertNotNull($poblacion);
        $this->assertSame(1, $poblacion['previous_total']);
        $this->assertSame(0, $poblacion['change']);
        $this->assertEquals(0, $poblacion['pct_change']);

        $this->assertNotNull($mohon);
        $this->assertSame(0, $mohon['previous_total']);
        $this->assertSame(1, $mohon['change']);
        $this->assertNull($mohon['pct_change']);
        $this->assertSame('prior_period_zero', $mohon['pct_change_reason']);

        // Partial period elapsed-day matching: 2026-11-01..2026-11-30 with cutoff 2026-11-15 -> 15 elapsed days vs Oct 17..Oct 31
        $partialRes = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-15&comparison=previous_period&no_cache=1')
            ->assertOk()
            ->assertJsonPath('scope.is_partial_period', true)
            ->assertJsonPath('comparison.is_partial_matched', true)
            ->assertJsonPath('comparison.matched_elapsed_days', 15);
        $this->assertSame('2026-10-17', $partialRes->json('comparison.prior_start'));
        $this->assertSame('2026-10-31', $partialRes->json('comparison.prior_end'));
    }

    public function test_geography_separation_without_residence_fallback_and_animal_other_vs_unknown_a12(): void
    {
        $residentPatient = $this->createPatient(
            'Resident',
            'Poblacion',
            'female',
            '1998-01-01',
            'Poblacion',
            'Tagoloan',
            'Misamis Oriental'
        );

        // Blank exposure place on patient living in Poblacion -> MUST stay 'Unknown' in exposure breakdown!
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $residentPatient->patient_id,
            'case_number' => 'GEO-UNK-EXP',
            'episode_type' => 'pending_assessment',
            'bite_date' => '2026-11-10',
            'bite_date_is_provisional' => false,
            'bite_place' => '',
            'severity' => 'unassessed',
            'animal_type' => null,
            'status' => 'awaiting_assessment',
            'created_by' => $this->admin->id,
        ]);

        // Outside municipality exposure place + 'cow' animal (true 'other')
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $residentPatient->patient_id,
            'case_number' => 'GEO-OUTSIDE-COW',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-12',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Lapasan, Cagayan de Oro City',
            'severity' => 'moderate',
            'animal_type' => 'cow',
            'status' => 'active',
            'confirmed_at' => '2026-11-12 10:00:00',
            'created_by' => $this->admin->id,
        ]);

        // Two raw variants normalizing to Sta. Cruz
        BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $residentPatient->patient_id,
            'case_number' => 'GEO-VAR-1',
            'episode_type' => 'primary',
            'bite_date' => '2026-11-14',
            'bite_date_is_provisional' => false,
            'bite_place' => 'Brgy. Sta. Cruz, Tagoloan, Misamis Oriental',
            'severity' => 'minor',
            'animal_type' => 'dog',
            'status' => 'completed_no_pep',
            'confirmed_at' => '2026-11-14 10:00:00',
            'created_by' => $this->admin->id,
        ]);

        $summary = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&no_cache=1')
            ->assertOk()
            ->assertJsonPath('breakdowns.by_animal.dog', 1)
            ->assertJsonPath('breakdowns.by_animal.other', 1)
            ->assertJsonPath('breakdowns.by_animal.unknown', 1);

        $expBarangays = collect($summary->json('breakdowns.by_exposure_barangay'));
        $resBarangays = collect($summary->json('breakdowns.by_residence_barangay'));

        $this->assertNotNull($expBarangays->firstWhere('barangay', 'Unknown'));
        $this->assertNull($expBarangays->firstWhere('barangay', 'Poblacion'));
        $this->assertSame('outside_municipality', $expBarangays->firstWhere('barangay', 'Lapasan')['scope']);
        $this->assertSame('within_municipality', $expBarangays->firstWhere('barangay', 'Sta. Cruz')['scope']);
        $this->assertSame(3, $resBarangays->firstWhere('barangay', 'Poblacion')['total_cases']);

        // Animal='other' filter MUST only match 'cow' (1 case), NOT null/'unknown' (A12)
        $otherSummary = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&animal=other&no_cache=1')
            ->assertOk()
            ->assertJsonPath('indicators.recorded_exposures.value', 1)
            ->assertJsonPath('breakdowns.by_animal.other', 1)
            ->assertJsonPath('breakdowns.by_animal.unknown', 0);

        $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&animal=other')
            ->assertOk()
            ->assertJsonPath('summary.total_cases', 1)
            ->assertJsonPath('locations.0.normalized_barangay', 'Lapasan')
            ->assertJsonPath('locations.0.other_animals', 1)
            ->assertJsonPath('locations.0.unknown_animals', 0);
    }

    public function test_cache_isolation_and_query_benchmark(): void
    {
        $patient = $this->createPatient('Bench', 'Patient');
        for ($i = 1; $i <= 40; $i++) {
            $inc = $this->seedEpisodeWithPlan(
                $patient,
                "BM-{$i}",
                sprintf('2026-11-%02d', (($i - 1) % 28) + 1),
                $i % 3 === 0 ? 'severe' : 'moderate',
                $i % 2 === 0 ? 'Poblacion' : 'Baluarte',
                'full_pep',
                [0, 3, 7],
                '2026-11-10'
            );
            if ($i <= 25) {
                $this->addLocalArvDose($inc, 0, '2026-11-10');
            }
        }

        // Other clinic must be completely isolated in cache
        $clinic2 = Clinic::create([
            'name' => 'Clinic Two',
            'municipality' => 'Balingasag',
            'province' => 'Misamis Oriental',
            'status' => 'active',
        ]);
        $user2 = User::factory()->create([
            'clinic_id' => $clinic2->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        // Measure cold query count & latency
        DB::flushQueryLog();
        DB::enableQueryLog();
        $t0 = microtime(true);
        $cold = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30')
            ->assertOk()
            ->assertJsonPath('indicators.recorded_exposures.value', 40);
        $coldMs = round((microtime(true) - $t0) * 1000, 2);
        $coldQueries = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Warm hit from scoped cache should execute far fewer queries
        DB::flushQueryLog();
        DB::enableQueryLog();
        $t1 = microtime(true);
        $warm = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30')
            ->assertOk()
            ->assertJsonPath('indicators.recorded_exposures.value', 40);
        $warmMs = round((microtime(true) - $t1) * 1000, 2);
        $warmQueries = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertLessThanOrEqual(25, $coldQueries, "Expected bounded query count, got {$coldQueries}");
        $this->assertLessThan($coldQueries, $warmQueries);

        // Cutoff variance invalidates/isolates cache key
        $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-05')
            ->assertOk()
            ->assertJsonPath('indicators.recorded_exposures.value', 40)
            ->assertJsonPath('indicators.finalized_assessments.value', 0);

        // Second clinic cannot see first clinic's cached numbers
        Sanctum::actingAs($user2);
        $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30')
            ->assertOk()
            ->assertJsonPath('indicators.recorded_exposures.value', 0);

        // Record observed metrics via output annotation for benchmark traceability
        $this->addToAssertionCount(1);
        fwrite(STDOUT, sprintf("\n[Phase4 Benchmark] 40 episodes: cold=%d queries (%.2f ms), warm=%d queries (%.2f ms)\n", $coldQueries, $coldMs, $warmQueries, $warmMs));
    }

    public function test_bite_cases_location_summary_exposes_doh_summary_stage_matrix_and_stage_filters(): void
    {
        $this->seedPhase1SeventeenEpisodeFixture();

        $res = $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30')
            ->assertOk()
            ->assertJsonPath('doh_summary.categories.I', 2)
            ->assertJsonPath('doh_summary.categories.II', 6)
            ->assertJsonPath('doh_summary.categories.III', 3)
            ->assertJsonPath('doh_summary.categories.not_yet_assessed', 2)
            ->assertJsonPath('doh_summary.categories.assessed_category_missing', 1)
            ->assertJsonPath('doh_summary.pep_and_biologics.recorded_exposures', 14)
            ->assertJsonPath('doh_summary.pep_and_biologics.finalized_assessments', 12)
            ->assertJsonPath('doh_summary.pep_and_biologics.awaiting_assessment', 2)
            ->assertJsonPath('doh_summary.pep_and_biologics.given_pep', 5)
            ->assertJsonPath('doh_summary.pep_and_biologics.no_administration_recorded', 3)
            ->assertJsonPath('doh_summary.pep_and_biologics.given_rig', 2)
            ->assertJsonPath('doh_summary.completion_and_outcomes.completed_cat_I', 0)
            ->assertJsonPath('doh_summary.completion_and_outcomes.completed_cat_II', 2)
            ->assertJsonPath('doh_summary.completion_and_outcomes.completed_cat_III', 1)
            ->assertJsonPath('doh_summary.completion_and_outcomes.completed_total', 3)
            ->assertJsonPath('doh_summary.cohort_by_category.excluded_unassessed_or_missing_cat', 3);

        $matrix = collect($res->json('doh_summary.stage_matrix'));
        $this->assertCount(5, $matrix);
        $this->assertSame('Form 1: Registration only', $matrix[0]['stage']);
        $this->assertSame(2, $matrix[0]['count']);
        $this->assertSame('No administration recorded', str_contains($matrix[1]['missing_info_display'], 'No administration recorded') ? 'No administration recorded' : '');

        $narrative = (string) $res->json('doh_summary.meeting_narrative');
        $this->assertStringContainsString('Of 14 recorded exposure episodes', $narrative);
        $this->assertStringContainsString('no administration recorded as of the reporting cutoff', $narrative);

        // Verify demographics sums equal total recorded episodes
        $demo = $res->json('doh_summary.demographics');
        $this->assertSame(14, $demo['male'] + $demo['female'] + $demo['unknown_sex']);
        $this->assertSame(14, $demo['age_below_15'] + $demo['age_15_above'] + $demo['age_unknown']);

        // Verify location rows carry DOH summary counts
        $firstLocation = collect($res->json('locations'))->first();
        $this->assertArrayHasKey('male', $firstLocation);
        $this->assertArrayHasKey('female', $firstLocation);
        $this->assertArrayHasKey('given_pep', $firstLocation);
        $this->assertArrayHasKey('no_administration_recorded', $firstLocation);
        $this->assertArrayHasKey('completed', $firstLocation);
        $this->assertArrayHasKey('given_rig', $firstLocation);
        $this->assertArrayHasKey('erig', $firstLocation);
        $this->assertArrayHasKey('hrig', $firstLocation);

        // Verify per-case DOH & stage fields
        $firstCase = collect($res->json('cases'))->first();
        $this->assertArrayHasKey('age', $firstCase);
        $this->assertArrayHasKey('gender', $firstCase);
        $this->assertArrayHasKey('animal_status', $firstCase);
        $this->assertArrayHasKey('completed_doses_count', $firstCase);
        $this->assertArrayHasKey('required_doses_count', $firstCase);

        // Filter: status=no_administration_recorded returns exactly the 3 PEP-prescribed episodes without administration
        $noAdmin = $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&status=no_administration_recorded')
            ->assertOk()
            ->assertJsonPath('summary.total_cases', 3);
        $noAdminCases = collect($noAdmin->json('cases'))->pluck('case_number')->sort()->values()->all();
        $this->assertSame(['E06-2026', 'E07-2026', 'E13-2026'], $noAdminCases);

        // Filter: status=treatment_recorded returns Form 3 treatment-recorded episodes
        $treated = $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&status=treatment_recorded')
            ->assertOk();
        $this->assertGreaterThanOrEqual(5, $treated->json('summary.total_cases'));
        foreach ($treated->json('cases') as $row) {
            $this->assertSame('form_3_treatment_recorded', $row['last_completed_stage']);
        }

        // Verify Phase 4 cross-form reconciliation bridge, data quality/aging, period comparison, and unresolved review age fields
        $res->assertJsonPath('doh_summary.reconciliation_bridge.form_1_exposure_registry.recorded_episodes', 14)
            ->assertJsonPath('doh_summary.reconciliation_bridge.form_2_abtc_monthly.reconciles_recorded_to_assessed', true)
            ->assertJsonPath('doh_summary.period_comparison.indicators.recorded_episodes.current', 14)
            ->assertJsonPath('doh_summary.data_quality_and_aging.unresolved_review_age_buckets.total', 6);
        $this->assertArrayHasKey('is_unresolved_review', $firstCase);
        $this->assertArrayHasKey('review_age_days', $firstCase);
        $this->assertArrayHasKey('review_age_bucket', $firstCase);

        // Verify status=unresolved_review filter on location-summary
        $unresolvedLocation = $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&status=unresolved_review')
            ->assertOk()
            ->assertJsonPath('summary.total_cases', 6);
        foreach ($unresolvedLocation->json('cases') as $row) {
            $this->assertTrue($row['is_unresolved_review']);
            $this->assertIsInt($row['review_age_days']);
            $this->assertContains($row['review_age_bucket'], ['0_7_days', '8_30_days', 'over_30_days']);
        }

        // Verify privacy_mode=aggregate_only strips cases while retaining doh_summary
        $aggregateLocation = $this->getJson('/api/cases/location-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&privacy_mode=aggregate_only')
            ->assertOk()
            ->assertJsonPath('privacy_mode', 'aggregate_only')
            ->assertJsonPath('doh_summary.pep_and_biologics.recorded_exposures', 14);
        $this->assertArrayNotHasKey('cases', $aggregateLocation->json());

        // Verify /api/reports/bite-summary exposes stage_matrix and unresolved_review_age_buckets.total
        $biteSummary = $this->getJson('/api/reports/bite-summary?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30')
            ->assertOk()
            ->assertJsonPath('data_quality.unresolved_review_age_buckets.total', 6);
        $this->assertCount(5, $biteSummary->json('journey_progress.stage_matrix'));

        // Verify /api/reports/bite-summary/cases supports bucket=unresolved_review and includes review_age_days
        $unresolvedDrilldown = $this->getJson('/api/reports/bite-summary/cases?from=2026-11-01&to=2026-11-30&cutoff=2026-11-30&bucket=unresolved_review')
            ->assertOk()
            ->assertJsonPath('pagination.total', 6);
        foreach ($unresolvedDrilldown->json('cases') as $row) {
            $this->assertTrue($row['is_unresolved_review']);
            $this->assertIsInt($row['review_age_days']);
            $this->assertContains($row['review_age_bucket'], ['0_7_days', '8_30_days', 'over_30_days']);
        }
    }
}
