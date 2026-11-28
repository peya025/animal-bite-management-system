<?php

namespace App\Http\Controllers\Clinical;

use App\Http\Controllers\Controller;
use App\Models\RegistrationEncounter;
use App\Models\RegistrationFee;
use App\Services\RegistrationFeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegistrationFeeController extends Controller
{
    public function __construct(
        protected RegistrationFeeService $feeService
    ) {}

    /**
     * Get fee details and payment history for an encounter.
     * Access: Authenticated clinic staff (admin, registration, triage, treatment, doctor, nurse).
     */
    public function show(Request $request, int $encounterId): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;

        $encounter = RegistrationEncounter::where('clinic_id', $clinicId)
            ->where('id', $encounterId)
            ->firstOrFail();

        $fee = RegistrationFee::where('clinic_id', $clinicId)
            ->where('encounter_id', $encounter->id)
            ->with(['items', 'payments.recordedBy', 'payments.voidedBy'])
            ->first();

        return response()->json([
            'encounter_id' => $encounter->id,
            'fee'          => $this->feeService->formatFeeResponse($fee),
        ]);
    }

    /**
     * Record subsequent payment / balance settlement.
     * Access: admin, registration.
     */
    public function recordPayment(Request $request, int $feeId): JsonResponse
    {
        $user = $request->user();
        if (! $user->isAdmin() && ! $user->hasRole('registration')) {
            return response()->json(['message' => 'Unauthorized. Only registration staff and admins can record payments.'], 403);
        }

        $result = $this->feeService->recordPayment(
            $user->clinic_id,
            $feeId,
            $request->all(),
            $user
        );

        $payment = $result['payment'];
        $isReplay = (bool) ($result['is_replay'] ?? false);

        $fee = RegistrationFee::where('clinic_id', $user->clinic_id)
            ->where('id', $feeId)
            ->with(['items', 'payments.recordedBy', 'payments.voidedBy'])
            ->firstOrFail();

        return response()->json([
            'message'   => $isReplay ? 'Payment already recorded' : 'Payment recorded successfully',
            'is_replay' => $isReplay,
            'payment'   => [
                'id'                     => $payment->id,
                'amount'                 => $this->feeService->toDecimal($payment->amount_cents),
                'payment_method'         => $payment->payment_method,
                'payment_method_details' => $payment->payment_method_details,
                'reference_number'       => $payment->reference_number,
                'collected_at'           => $payment->collected_at?->toISOString(),
            ],
            'fee' => $this->feeService->formatFeeResponse($fee),
        ], $isReplay ? 200 : 201);
    }

    /**
     * Void a mistaken payment.
     * Access: admin only.
     */
    public function voidPayment(Request $request, int $feeId, int $paymentId): JsonResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin access required to void payments.'], 403);
        }

        $reason = $request->input('void_reason', $request->input('reason', ''));

        $this->feeService->voidPayment(
            $user->clinic_id,
            $feeId,
            $paymentId,
            (string) $reason,
            $user
        );

        $fee = RegistrationFee::where('clinic_id', $user->clinic_id)
            ->where('id', $feeId)
            ->with(['items', 'payments.recordedBy', 'payments.voidedBy'])
            ->firstOrFail();

        return response()->json([
            'message' => 'Payment voided successfully',
            'fee'     => $this->feeService->formatFeeResponse($fee),
        ]);
    }

    /**
     * Correct registration fee items.
     * Access: admin only.
     */
    public function correctFee(Request $request, int $feeId): JsonResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin access required to correct fee records.'], 403);
        }

        $reason = $request->input('reason', '');

        $fee = $this->feeService->correctFee(
            $user->clinic_id,
            $feeId,
            $request->all(),
            (string) $reason,
            $user
        );

        return response()->json([
            'message' => 'Fee record corrected successfully',
            'fee'     => $this->feeService->formatFeeResponse($fee),
        ]);
    }
}
