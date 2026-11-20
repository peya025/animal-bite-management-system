<?php

namespace App\Http\Requests\Mobile\Concerns;

use App\Services\Clinic\MobileFormPolicy;
use App\Services\Mobile\MobileClinicContextResolver;
use App\Support\BiteIntakeContract;
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
        if ($update && ! $policy->intakeEnabled()) {
            throw ValidationException::withMessages(['intake' => ['Bite intake is disabled for this clinic.']]);
        }
        $input = $this->input('intake');
        if ($update && ! is_array($input)) {
            $input = $this->except(['intake']);
        }
        if (is_array($input)) {
            $filtered = $policy->filterIntake($input);
            $this->merge(['intake' => $policy->intakeEnabled() ? BiteIntakeContract::normalize($filtered) : null]);
        }
    }
}
