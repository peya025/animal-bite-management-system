<?php

namespace App\Http\Requests\Mobile\Concerns;

use App\Models\Patient;
use App\Services\Clinic\FormConfigurationProjector;
use App\Services\Clinic\MobileFormPolicy;
use App\Services\Mobile\MobileClinicContextResolver;
use Illuminate\Http\Exceptions\HttpResponseException;

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

        $suppliedRevision = $this->input('config_revision');
        if ($suppliedRevision !== null && $suppliedRevision !== '') {
            $currentRevision = $this->profilePolicy->revision();
            if (! is_numeric($suppliedRevision) || (int) $suppliedRevision !== $currentRevision) {
                throw new HttpResponseException(response()->json([
                    'code' => 'form_configuration_changed',
                    'message' => 'Clinic form requirements were updated. Please review the form and try again.',
                    'current_revision' => $currentRevision,
                    'supplied_revision' => is_numeric($suppliedRevision) ? (int) $suppliedRevision : null,
                    'configuration' => app(FormConfigurationProjector::class)->forClinic($this->policyClinicId),
                ], 409));
            }
        }

        $filtered = $this->profilePolicy->filterProfile($this->all());
        unset($filtered['config_revision']);
        $this->replace($filtered);
    }

    protected function configuredProfileRules(array $base, bool $update): array
    {
        return $this->profilePolicy->profileRules($base, $this->all(), $update);
    }
}
