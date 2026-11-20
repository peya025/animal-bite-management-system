<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Services\Clinic\FormConfigurationProjector;
use App\Services\Mobile\MobileClinicContextResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileFormConfigurationController extends Controller
{
    public function __invoke(Request $request, MobileClinicContextResolver $resolver, FormConfigurationProjector $projector): JsonResponse
    {
        $input = $request->validate([
            'clinic_id' => ['nullable', 'integer', 'exists:clinics,id'],
            'patient_id' => ['nullable', 'integer'],
            'appointment_id' => ['nullable', 'integer'],
        ]);

        $clinicId = $resolver->resolve(
            $request->user(),
            isset($input['clinic_id']) ? (int) $input['clinic_id'] : null,
            isset($input['patient_id']) ? (int) $input['patient_id'] : null,
            isset($input['appointment_id']) ? (int) $input['appointment_id'] : null,
        );

        return response()->json($projector->forClinic($clinicId));
    }
}
