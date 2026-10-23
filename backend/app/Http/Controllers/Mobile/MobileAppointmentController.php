<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mobile\CancelMobileAppointmentRequest;
use App\Http\Requests\Mobile\StoreMobileAppointmentRequest;
use App\Services\Mobile\MobileAppointmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileAppointmentController extends Controller
{
    public function __construct(
        protected MobileAppointmentService $appointmentService
    ) {}

    /**
     * List appointments for authenticated patient account and family members
     */
    public function index(Request $request): JsonResponse
    {
        $appointments = $this->appointmentService->getAppointmentsForAccount($request->user());

        return response()->json($appointments);
    }

    /**
     * Book a new appointment (consultation, vaccination, or booster)
     */
    public function store(StoreMobileAppointmentRequest $request): JsonResponse
    {
        $appointment = $this->appointmentService->bookAppointment(
            $request->user(),
            $request->validated()
        );

        return response()->json($appointment, 201);
    }

    /**
     * Cancel an existing scheduled appointment
     */
    public function cancel(CancelMobileAppointmentRequest $request, int $appointment): JsonResponse
    {
        $cancelled = $this->appointmentService->cancelAppointment(
            $request->user(),
            $notificationId = $appointment,
            $request->validated('reason')
        );

        return response()->json($cancelled);
    }
}
