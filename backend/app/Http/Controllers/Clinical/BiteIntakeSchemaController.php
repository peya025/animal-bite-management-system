<?php

namespace App\Http\Controllers\Clinical;

use App\Http\Controllers\Controller;
use App\Services\Clinic\ClinicModuleConfigService;
use App\Support\BiteIntakeContract;
use Illuminate\Http\Request;

class BiteIntakeSchemaController extends Controller
{
    public function __invoke(Request $request, ClinicModuleConfigService $configService)
    {
        $schema = BiteIntakeContract::schema();

        $clinicId = $request->query('clinic_id')
            ? (int) $request->query('clinic_id')
            : ($request->user()?->clinic_id ? (int) $request->user()->clinic_id : null);

        if ($clinicId && $clinicId > 0) {
            try {
                $config = $configService->getOrCreateConfigForClinic($clinicId);
                $optionMaps = $configService->getEnabledClinicalOptionMaps($config, true);
                $schema['options']['reported_mode_of_exposure'] = $optionMaps['reported_mode_of_exposure'];
                $schema['options']['body_part_group'] = $optionMaps['body_part_group'];
            } catch (\Throwable) {
                // Fall back to canonical contract defaults if clinic context cannot be resolved
            }
        }

        return response()->json($schema);
    }
}
