<?php

namespace App\Http\Requests\Mobile\Concerns;

use App\Models\Patient;
use App\Services\Clinic\MobileFormPolicy;
use App\Services\Mobile\MobileClinicContextResolver;

trait UsesMobileProfilePolicy
{
    private ?int $policyClinicId = null;
    private ?MobileFormPolicy $profilePolicy = null;

    protected function prepareConfiguredProfile(): void
    {
        $patient = $this->route('patient');
        $clinicId = $this->input('clinic_id');
        $this->policyClinicId = app(MobileClinicContextResolver::class)->resolve(
            $this->user(),
            is_numeric($clinicId) ? (int) $clinicId : null,
            $patient instanceof Patient ? (int) $patient->patient_id : null,
            null,
        );
        $this->profilePolicy = app()->makeWith(MobileFormPolicy::class, ['clinicId' => $this->policyClinicId]);
        $this->replace($this->profilePolicy->filterProfile($this->all()));
    }

    protected function configuredProfileRules(array $base, bool $update): array
    {
        return $this->profilePolicy->profileRules($base, $this->all(), $update);
    }
}
