<?php

namespace App\Http\Requests\Mobile\Concerns;

use App\Services\Clinic\FormConfigurationProjector;
use App\Services\Clinic\MobileFormPolicy;
use App\Services\Mobile\MobileClinicContextResolver;
use App\Support\BiteIntakeContract;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

trait UsesMobileIntakePolicy
{
    private ?MobileFormPolicy $mobileIntakePolicy = null;

    protected function intakePolicy(bool $update): MobileFormPolicy
    {
        if ($this->mobileIntakePolicy) {
            return $this->mobileIntakePolicy;
        }
        $clinicId = app(MobileClinicContextResolver::class)->resolve(
            $this->user(), null,
            $update ? null : (is_numeric($this->input('patient_id')) ? (int) $this->input('patient_id') : null),
            $update ? (int) $this->route('appointment') : null,
        );
        return $this->mobileIntakePolicy = app()->makeWith(MobileFormPolicy::class, ['clinicId' => $clinicId]);
    }

    protected function prepareConfiguredIntake(bool $update): void
    {
        if (! $update && $this->input('appointment_type') !== 'consultation') {
            return;
        }
        $policy = $this->intakePolicy($update);

        $suppliedRevision = $this->input('config_revision');
        if ($suppliedRevision !== null && $suppliedRevision !== '') {
            $currentRevision = $policy->revision();
            if (! is_numeric($suppliedRevision) || (int) $suppliedRevision !== $currentRevision) {
                throw new HttpResponseException(response()->json([
                    'code' => 'form_configuration_changed',
                    'message' => 'Clinic form requirements were updated. Please review the form and try again.',
                    'current_revision' => $currentRevision,
                    'supplied_revision' => is_numeric($suppliedRevision) ? (int) $suppliedRevision : null,
                    'configuration' => app(FormConfigurationProjector::class)->forClinic($policy->clinicId()),
                ], 409));
            }
        }

        if ($update && ! $policy->intakeEnabled()) {
            throw ValidationException::withMessages(['intake' => ['Bite intake is disabled for this clinic.']]);
        }
        $input = $this->input('intake');
        if ($update && ! is_array($input)) {
            $input = $this->except(['intake', 'config_revision']);
        }
        if (is_array($input)) {
            $filtered = $policy->filterIntake($input);
            $this->merge(['intake' => $policy->intakeEnabled() ? BiteIntakeContract::normalize($filtered) : null]);
        }
    }
}
