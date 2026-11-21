<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\ClinicModuleConfig;
use App\Models\RegistrationEncounter;
use App\Models\RegistrationFee;
use App\Models\RegistrationFeeItem;
use App\Models\RegistrationFeePayment;
use App\Models\User;
use App\Services\Clinic\ClinicModuleConfigService;
use App\Services\Clinic\EffectiveFieldRuleComposer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class RegistrationFeeService
{
    public const MAX_AMOUNT_CENTS = 99999999; // ₱999,999.99

    public function __construct(
        protected ClinicModuleConfigService $configService,
        protected EffectiveFieldRuleComposer $composer,
    ) {}

    /**
     * Convert decimal amount (string or number) to integer centavos.
     * Rejects negatives, excess precision (> 2 decimal places), and overflow.
     *
     * @throws ValidationException
     */
    public function toCentavos(mixed $value, string $fieldLabel = 'Amount'): int
    {
        if ($value === null || $value === '') {
            throw ValidationException::withMessages([
                $fieldLabel => ["{$fieldLabel} is required."],
            ]);
        }

        $str = trim((string) $value);

        if (! preg_match('/^\d+(\.\d{1,2})?$/', $str)) {
            throw ValidationException::withMessages([
                $fieldLabel => ["{$fieldLabel} must be a valid non-negative number with at most two decimal places."],
            ]);
        }

        $parts = explode('.', $str);
        $pesos = (int) $parts[0];
        $centavos = isset($parts[1]) ? (int) str_pad($parts[1], 2, '0', STR_PAD_RIGHT) : 0;
        $totalCents = ($pesos * 100) + $centavos;

        if ($totalCents < 0 || $totalCents > self::MAX_AMOUNT_CENTS) {
            throw ValidationException::withMessages([
                $fieldLabel => ["{$fieldLabel} cannot exceed ₱999,999.99."],
            ]);
        }

        return $totalCents;
    }

    /**
     * Convert integer centavos to decimal string (e.g. 15000 -> "150.00").
     */
    public function toDecimal(?int $cents): ?string
    {
        if ($cents === null) {
            return null;
        }

        return number_format($cents / 100, 2, '.', '');
    }

    /**
     * Resolve effective fee rules for a clinic context.
     *
     * @return array{rig_fee: string, anti_rabies_fee: string, additional_fees: string}
     */
    public function getEffectiveFeeRules(int $clinicId): array
    {
        $config = $this->configService->getOrCreateConfigForClinic($clinicId);
        $isRegistrationEnabled = (bool) ($config->registration_module_enabled ?? true);

        if (! $isRegistrationEnabled) {
            return [
                'rig_fee'         => 'hidden',
                'anti_rabies_fee' => 'hidden',
                'additional_fees' => 'hidden',
            ];
        }

        $fieldRules = $config->field_rules ?: $this->configService->getDefaultFieldRules();

        return [
            'rig_fee'         => $fieldRules['rig_fee'] ?? 'hidden',
            'anti_rabies_fee' => $fieldRules['anti_rabies_fee'] ?? 'hidden',
            'additional_fees' => $fieldRules['additional_fees'] ?? 'hidden',
        ];
    }

    /**
     * Validate and parse submitted registration fee payload against effective rules.
     *
     * @throws ValidationException
     */
    public function validateAndParsePayload(int $clinicId, ?array $payload): ?array
    {
        $rules = $this->getEffectiveFeeRules($clinicId);
        $allHidden = ($rules['rig_fee'] === 'hidden' && $rules['anti_rabies_fee'] === 'hidden' && $rules['additional_fees'] === 'hidden');

        // If all three are hidden: reject nonempty fee/payment data
        if ($allHidden) {
            if (! empty($payload) && (
                ! empty($payload['items']) ||
                ! empty($payload['payment']) ||
                ! empty($payload['rig_fee']) ||
                ! empty($payload['anti_rabies_fee']) ||
                ! empty($payload['additional_fees'])
            )) {
                throw ValidationException::withMessages([
                    'registration_fee' => ['Registration fees and payment recording is currently disabled for this clinic.'],
                ]);
            }

            return null;
        }

        if (empty($payload)) {
            // Check if any rule requires fees
            $errors = [];
            if ($rules['rig_fee'] === 'required') {
                $errors['registration_fee.rig_fee'] = ['RIG Fee is required. Please provide an amount, Not Applicable, or Pending Assessment.'];
            }
            if ($rules['anti_rabies_fee'] === 'required') {
                $errors['registration_fee.anti_rabies_fee'] = ['Anti-Rabies Vaccine Fee is required. Please provide an amount, Not Applicable, or Pending Assessment.'];
            }
            if ($rules['additional_fees'] === 'required') {
                $errors['registration_fee.additional_fees'] = ['Additional Fees is required. Please record items or check "No additional fees".'];
            }

            if (! empty($errors)) {
                throw ValidationException::withMessages($errors);
            }

            return null;
        }

        $parsedItems = [];
        $errors = [];
        $isComplete = true;

        // 1. Validate RIG Fee
        $rigRule = $rules['rig_fee'];
        $rigInput = $payload['rig_fee'] ?? ($payload['items']['rig'] ?? null);

        if ($rigRule === 'hidden') {
            if (! empty($rigInput) && (isset($rigInput['amount']) || isset($rigInput['disposition']))) {
                $errors['registration_fee.rig_fee'] = ['RIG Fee is configured as Hidden and cannot be submitted.'];
            }
        } elseif ($rigRule === 'required') {
            $parsed = $this->parseFeeItem('rig', 'RIG Fee', $rigInput, true, $errors);
            if ($parsed) {
                $parsedItems[] = $parsed;
                if ($parsed['disposition'] === 'pending_assessment') {
                    $isComplete = false;
                }
            }
        } elseif ($rigRule === 'optional') {
            $parsed = $this->parseFeeItem('rig', 'RIG Fee', $rigInput, false, $errors);
            if ($parsed) {
                $parsedItems[] = $parsed;
                if ($parsed['disposition'] === 'pending_assessment') {
                    $isComplete = false;
                }
            } else {
                $isComplete = false; // Visible optional left blank is incomplete
            }
        }

        // 2. Validate Anti-Rabies Vaccine Fee
        $arRule = $rules['anti_rabies_fee'];
        $arInput = $payload['anti_rabies_fee'] ?? ($payload['items']['anti_rabies'] ?? null);

        if ($arRule === 'hidden') {
            if (! empty($arInput) && (isset($arInput['amount']) || isset($arInput['disposition']))) {
                $errors['registration_fee.anti_rabies_fee'] = ['Anti-Rabies Vaccine Fee is configured as Hidden and cannot be submitted.'];
            }
        } elseif ($arRule === 'required') {
            $parsed = $this->parseFeeItem('anti_rabies', 'Anti-Rabies Vaccine Fee', $arInput, true, $errors);
            if ($parsed) {
                $parsedItems[] = $parsed;
                if ($parsed['disposition'] === 'pending_assessment') {
                    $isComplete = false;
                }
            }
        } elseif ($arRule === 'optional') {
            $parsed = $this->parseFeeItem('anti_rabies', 'Anti-Rabies Vaccine Fee', $arInput, false, $errors);
            if ($parsed) {
                $parsedItems[] = $parsed;
                if ($parsed['disposition'] === 'pending_assessment') {
                    $isComplete = false;
                }
            } else {
                $isComplete = false; // Visible optional left blank is incomplete
            }
        }

        // 3. Validate Additional Fees
        $addRule = $rules['additional_fees'];
        $addInput = $payload['additional_fees'] ?? ($payload['items']['additional'] ?? null);
        $noAdditional = filter_var($payload['no_additional_fees'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($addRule === 'hidden') {
            if (! empty($addInput) || $noAdditional) {
                $errors['registration_fee.additional_fees'] = ['Additional Fees is configured as Hidden and cannot be submitted.'];
            }
        } elseif ($addRule === 'required') {
            if ($noAdditional) {
                // Explicit "No additional fees" response
                if (! empty($addInput) && is_array($addInput) && count($addInput) > 0) {
                    $errors['registration_fee.additional_fees'] = ['Cannot select "No additional fees" while submitting additional fee rows.'];
                }
            } else {
                if (empty($addInput) || ! is_array($addInput) || count($addInput) === 0) {
                    $errors['registration_fee.additional_fees'] = ['Additional Fees is required. Enter at least one item or select "No additional fees".'];
                } else {
                    $parsedRows = $this->parseAdditionalRows($addInput, $errors);
                    foreach ($parsedRows as $pRow) {
                        $parsedItems[] = $pRow;
                        if ($pRow['disposition'] === 'pending_assessment') {
                            $isComplete = false;
                        }
                    }
                }
            }
        } elseif ($addRule === 'optional') {
            if (! empty($addInput) && is_array($addInput)) {
                $parsedRows = $this->parseAdditionalRows($addInput, $errors);
                foreach ($parsedRows as $pRow) {
                    $parsedItems[] = $pRow;
                    if ($pRow['disposition'] === 'pending_assessment') {
                        $isComplete = false;
                    }
                }
            }
        }

        // 4. Validate Payment if requested
        $parsedPayment = null;
        $paymentInput = $payload['payment'] ?? null;
        $recordPayment = filter_var($payload['record_payment'] ?? false, FILTER_VALIDATE_BOOLEAN) || ! empty($paymentInput);

        // Calculate recorded total cents from parsed items
        $totalCents = 0;
        foreach ($parsedItems as $item) {
            if ($item['disposition'] === 'recorded' && $item['amount_cents'] !== null) {
                $totalCents += $item['amount_cents'];
            }
        }

        if ($recordPayment && ! empty($paymentInput)) {
            $paymentAmountRaw = $paymentInput['amount'] ?? null;
            if ($paymentAmountRaw === null || trim((string) $paymentAmountRaw) === '') {
                $errors['registration_fee.payment.amount'] = ['Payment amount is required when recording payment.'];
            } else {
                try {
                    $payCents = $this->toCentavos($paymentAmountRaw, 'registration_fee.payment.amount');
                    if ($payCents <= 0) {
                        $errors['registration_fee.payment.amount'] = ['Payment amount must be greater than zero.'];
                    } elseif ($payCents > $totalCents) {
                        $errors['registration_fee.payment.amount'] = ['Payment amount cannot exceed the recorded total fee.'];
                    } else {
                        $method = trim((string) ($paymentInput['payment_method'] ?? 'cash'));
                        if (! in_array($method, ['cash', 'other'], true)) {
                            $errors['registration_fee.payment.payment_method'] = ['Payment method must be cash or other.'];
                        }

                        $methodDetails = trim((string) ($paymentInput['payment_method_details'] ?? ''));
                        if ($method === 'other' && empty($methodDetails)) {
                            $errors['registration_fee.payment.payment_method_details'] = ['Payment method description is required when method is Other.'];
                        }

                        $parsedPayment = [
                            'amount_cents'           => $payCents,
                            'payment_method'         => $method,
                            'payment_method_details' => $method === 'other' ? $methodDetails : null,
                            'reference_number'       => ! empty($paymentInput['reference_number']) ? trim((string) $paymentInput['reference_number']) : null,
                            'notes'                  => ! empty($paymentInput['notes']) ? trim((string) $paymentInput['notes']) : null,
                            'idempotency_key'        => ! empty($paymentInput['idempotency_key']) ? trim((string) $paymentInput['idempotency_key']) : null,
                        ];
                    }
                } catch (ValidationException $ve) {
                    foreach ($ve->errors() as $k => $msgs) {
                        $errors['registration_fee.payment.amount'] = $msgs;
                    }
                }
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }

        // If no items were entered and none required, return null
        if (empty($parsedItems) && ! $noAdditional && empty($parsedPayment)) {
            return null;
        }

        return [
            'total_cents'        => $totalCents,
            'is_complete'        => $isComplete,
            'no_additional_fees' => $noAdditional,
            'notes'              => ! empty($payload['notes']) ? trim((string) $payload['notes']) : null,
            'config_snapshot'    => $rules,
            'items'              => $parsedItems,
            'payment'            => $parsedPayment,
        ];
    }

    /**
     * Parse single fee item (e.g. RIG, Anti-Rabies).
     */
    protected function parseFeeItem(string $type, string $label, mixed $input, bool $isRequired, array &$errors): ?array
    {
        if (empty($input)) {
            if ($isRequired) {
                $errors["registration_fee.{$type}"] = ["{$label} is required. Provide an amount or an explicit status."];
            }
            return null;
        }

        // Support both scalar amount or structured object
        if (is_numeric($input) || is_string($input)) {
            $disposition = 'recorded';
            $amountRaw = $input;
            $reason = null;
        } elseif (is_array($input)) {
            $disposition = $input['disposition'] ?? 'recorded';
            $amountRaw = $input['amount'] ?? null;
            $reason = ! empty($input['reason']) ? trim((string) $input['reason']) : null;
        } else {
            if ($isRequired) {
                $errors["registration_fee.{$type}"] = ["Invalid {$label} input."];
            }
            return null;
        }

        if (! in_array($disposition, ['recorded', 'not_applicable', 'pending_assessment'], true)) {
            $errors["registration_fee.{$type}.disposition"] = ["Invalid disposition for {$label}."];
            return null;
        }

        if ($disposition === 'recorded') {
            if ($amountRaw === null || trim((string) $amountRaw) === '') {
                if ($isRequired) {
                    $errors["registration_fee.{$type}.amount"] = ["{$label} amount is required."];
                }
                return null;
            }

            try {
                $cents = $this->toCentavos($amountRaw, "registration_fee.{$type}.amount");
                return [
                    'fee_type'     => $type,
                    'label'        => $label,
                    'disposition'  => 'recorded',
                    'amount_cents' => $cents,
                    'reason'       => null,
                ];
            } catch (ValidationException $ve) {
                foreach ($ve->errors() as $k => $msgs) {
                    $errors["registration_fee.{$type}.amount"] = $msgs;
                }
                return null;
            }
        }

        // Non-amount dispositions require reason
        if (empty($reason)) {
            $errors["registration_fee.{$type}.reason"] = ["Reason is required when {$label} is marked as " . ($disposition === 'not_applicable' ? 'Not Applicable' : 'Pending Assessment') . '.'];
            return null;
        }

        return [
            'fee_type'     => $type,
            'label'        => $label,
            'disposition'  => $disposition,
            'amount_cents' => null,
            'reason'       => $reason,
        ];
    }

    /**
     * Parse repeatable additional fee rows.
     */
    protected function parseAdditionalRows(array $rows, array &$errors): array
    {
        $parsed = [];

        foreach ($rows as $idx => $row) {
            if (! is_array($row)) {
                continue;
            }

            $label = trim((string) ($row['label'] ?? ($row['description'] ?? '')));
            $disposition = $row['disposition'] ?? 'recorded';
            $amountRaw = $row['amount'] ?? null;
            $reason = ! empty($row['reason']) ? trim((string) $row['reason']) : null;

            if (empty($label)) {
                $errors["registration_fee.additional_fees.{$idx}.label"] = ['Description is required for additional fee item.'];
                continue;
            }

            if (! in_array($disposition, ['recorded', 'not_applicable', 'pending_assessment'], true)) {
                $errors["registration_fee.additional_fees.{$idx}.disposition"] = ['Invalid disposition for additional fee item.'];
                continue;
            }

            if ($disposition === 'recorded') {
                if ($amountRaw === null || trim((string) $amountRaw) === '') {
                    $errors["registration_fee.additional_fees.{$idx}.amount"] = ["Amount is required for '{$label}'."];
                    continue;
                }

                try {
                    $cents = $this->toCentavos($amountRaw, "registration_fee.additional_fees.{$idx}.amount");
                    $parsed[] = [
                        'fee_type'     => 'additional',
                        'label'        => $label,
                        'disposition'  => 'recorded',
                        'amount_cents' => $cents,
                        'reason'       => null,
                    ];
                } catch (ValidationException $ve) {
                    foreach ($ve->errors() as $k => $msgs) {
                        $errors["registration_fee.additional_fees.{$idx}.amount"] = $msgs;
                    }
                }
            } else {
                if (empty($reason)) {
                    $errors["registration_fee.additional_fees.{$idx}.reason"] = ["Reason is required when '{$label}' is marked as non-amount."];
                } else {
                    $parsed[] = [
                        'fee_type'     => 'additional',
                        'label'        => $label,
                        'disposition'  => $disposition,
                        'amount_cents' => null,
                        'reason'       => $reason,
                    ];
                }
            }
        }

        return $parsed;
    }

    /**
     * Create or retrieve a registration encounter anchor.
     */
    public function getOrCreateEncounter(
        int $clinicId,
        int $patientId,
        string $encounterType,
        ?int $biteId = null,
        ?int $intakeId = null,
        ?int $appointmentId = null,
        ?int $userId = null
    ): RegistrationEncounter {
        // Idempotency: look up existing active encounter for this specific operation
        $query = RegistrationEncounter::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->where('status', 'active');

        if ($intakeId) {
            $existing = (clone $query)->where('intake_id', $intakeId)->first();
            if ($existing) {
                return $existing;
            }
        }

        if ($biteId) {
            $existing = (clone $query)->where('bite_id', $biteId)->first();
            if ($existing) {
                return $existing;
            }
        }

        return RegistrationEncounter::create([
            'clinic_id'      => $clinicId,
            'patient_id'     => $patientId,
            'encounter_type' => $encounterType,
            'bite_id'        => $biteId,
            'intake_id'      => $intakeId,
            'appointment_id' => $appointmentId,
            'status'         => 'active',
            'created_by'     => $userId,
        ]);
    }

    /**
     * Save registration fee, items, and optional initial payment.
     * All inside the active transaction.
     */
    public function recordEncounterFee(
        RegistrationEncounter $encounter,
        ?array $parsedData,
        User $user
    ): ?RegistrationFee {
        if (! $parsedData) {
            return null;
        }

        $clinicId = $encounter->clinic_id;
        $patientId = $encounter->patient_id;

        // Ensure unique registration fee per encounter
        $existingFee = RegistrationFee::where('clinic_id', $clinicId)
            ->where('encounter_id', $encounter->id)
            ->first();

        if ($existingFee) {
            // Already recorded for this encounter: return existing
            return $existingFee->load(['items', 'payments']);
        }

        $totalCents = (int) $parsedData['total_cents'];
        $amountPaidCents = 0;
        $initialPayment = $parsedData['payment'] ?? null;

        if ($initialPayment) {
            $amountPaidCents = (int) $initialPayment['amount_cents'];
        }

        $balanceCents = max(0, $totalCents - $amountPaidCents);

        // Derive initial status
        if ($totalCents === 0 && $parsedData['is_complete']) {
            $status = 'no_fee';
        } elseif ($totalCents > 0 && $amountPaidCents === 0) {
            $status = 'unpaid';
        } elseif ($amountPaidCents > 0 && $amountPaidCents < $totalCents) {
            $status = 'partially_paid';
        } elseif ($amountPaidCents >= $totalCents && $totalCents > 0) {
            $status = 'paid';
        } else {
            $status = 'not_recorded';
        }

        $fee = RegistrationFee::create([
            'clinic_id'          => $clinicId,
            'patient_id'         => $patientId,
            'encounter_id'       => $encounter->id,
            'currency'           => 'PHP',
            'total_cents'        => $totalCents,
            'amount_paid_cents'  => $amountPaidCents,
            'balance_cents'      => $balanceCents,
            'status'             => $status,
            'is_complete'        => (bool) $parsedData['is_complete'],
            'no_additional_fees' => (bool) $parsedData['no_additional_fees'],
            'notes'              => $parsedData['notes'] ?? null,
            'config_snapshot'    => $parsedData['config_snapshot'] ?? null,
            'created_by'         => $user->id,
        ]);

        // Create line items
        foreach ($parsedData['items'] as $item) {
            RegistrationFeeItem::create([
                'registration_fee_id' => $fee->id,
                'clinic_id'           => $clinicId,
                'fee_type'            => $item['fee_type'],
                'label'               => $item['label'],
                'disposition'         => $item['disposition'],
                'amount_cents'        => $item['amount_cents'],
                'reason'              => $item['reason'] ?? null,
                'created_by'          => $user->id,
            ]);
        }

        // Create initial payment if present
        if ($initialPayment) {
            RegistrationFeePayment::create([
                'registration_fee_id'    => $fee->id,
                'clinic_id'              => $clinicId,
                'amount_cents'           => $initialPayment['amount_cents'],
                'payment_method'         => $initialPayment['payment_method'],
                'payment_method_details' => $initialPayment['payment_method_details'],
                'reference_number'       => $initialPayment['reference_number'],
                'notes'                  => $initialPayment['notes'],
                'idempotency_key'        => $initialPayment['idempotency_key'],
                'is_voided'              => false,
                'collected_at'           => now(),
                'recorded_by'            => $user->id,
            ]);
        }

        AuditLog::log('registration_fee.created', 'RegistrationFee', $fee->id, [
            'new_values' => [
                'encounter_id'      => $encounter->id,
                'total_cents'       => $totalCents,
                'amount_paid_cents' => $amountPaidCents,
                'balance_cents'     => $balanceCents,
                'status'            => $status,
                'is_complete'       => $fee->is_complete,
            ],
            'description' => "Registration fee created: ₱{$this->toDecimal($totalCents)} (Status: {$status})",
        ]);

        return $fee->load(['items', 'payments']);
    }

    /**
     * Record subsequent payment (balance settlement) with row locking.
     *
     * @throws ValidationException|ConflictHttpException
     */
    public function recordPayment(int $clinicId, int $feeId, array $data, User $user): array
    {
        return DB::transaction(function () use ($clinicId, $feeId, $data, $user) {
            /** @var RegistrationFee $fee */
            $fee = RegistrationFee::where('clinic_id', $clinicId)
                ->where('id', $feeId)
                ->lockForUpdate()
                ->firstOrFail();

            $idempotencyKey = ! empty($data['idempotency_key']) ? trim((string) $data['idempotency_key']) : null;

            if ($idempotencyKey) {
                $existingPayment = RegistrationFeePayment::where('clinic_id', $clinicId)
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($existingPayment) {
                    $reqAmount = $this->toCentavos($data['amount'] ?? 0, 'amount');
                    if ($existingPayment->amount_cents === $reqAmount && $existingPayment->registration_fee_id === $fee->id) {
                        return [
                            'payment'   => $existingPayment,
                            'is_replay' => true,
                        ];
                    }
                    throw new ConflictHttpException('A payment with this idempotency key already exists with different details.');
                }
            }

            $amountCents = $this->toCentavos($data['amount'] ?? null, 'amount');

            if ($amountCents <= 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Payment amount must be greater than zero.'],
                ]);
            }

            if ($amountCents > $fee->balance_cents) {
                $formattedBal = $this->toDecimal($fee->balance_cents);
                throw ValidationException::withMessages([
                    'amount' => ["Payment amount (₱{$this->toDecimal($amountCents)}) cannot exceed the remaining balance (₱{$formattedBal})."],
                ]);
            }

            $method = trim((string) ($data['payment_method'] ?? 'cash'));
            if (! in_array($method, ['cash', 'other'], true)) {
                throw ValidationException::withMessages([
                    'payment_method' => ['Payment method must be cash or other.'],
                ]);
            }

            $details = trim((string) ($data['payment_method_details'] ?? ''));
            if ($method === 'other' && empty($details)) {
                throw ValidationException::withMessages([
                    'payment_method_details' => ['Payment method details are required when Other is selected.'],
                ]);
            }

            $payment = RegistrationFeePayment::create([
                'registration_fee_id'    => $fee->id,
                'clinic_id'              => $clinicId,
                'amount_cents'           => $amountCents,
                'payment_method'         => $method,
                'payment_method_details' => $method === 'other' ? $details : null,
                'reference_number'       => ! empty($data['reference_number']) ? trim((string) $data['reference_number']) : null,
                'notes'                  => ! empty($data['notes']) ? trim((string) $data['notes']) : null,
                'idempotency_key'        => $idempotencyKey,
                'is_voided'              => false,
                'collected_at'           => now(),
                'recorded_by'            => $user->id,
            ]);

            $this->recalculateFeeBalances($fee);

            AuditLog::log('registration_fee.payment_received', 'RegistrationFeePayment', $payment->id, [
                'new_values' => [
                    'fee_id'       => $fee->id,
                    'amount_cents' => $amountCents,
                    'new_balance'  => $fee->balance_cents,
                    'status'       => $fee->status,
                ],
                'description' => "Payment of ₱{$this->toDecimal($amountCents)} received for fee #{$fee->id}",
            ]);

            return [
                'payment'   => $payment,
                'is_replay' => false,
            ];
        });
    }

    /**
     * Void a mistaken payment record (Admin only).
     *
     * @throws ValidationException
     */
    public function voidPayment(int $clinicId, int $feeId, int $paymentId, string $reason, User $user): RegistrationFeePayment
    {
        if (! $user->isAdmin()) {
            abort(403, 'Unauthorized. Admin access required to void payments.');
        }

        $reason = trim($reason);
        if (empty($reason)) {
            throw ValidationException::withMessages([
                'void_reason' => ['A void reason is required.'],
            ]);
        }

        return DB::transaction(function () use ($clinicId, $feeId, $paymentId, $reason, $user) {
            /** @var RegistrationFee $fee */
            $fee = RegistrationFee::where('clinic_id', $clinicId)
                ->where('id', $feeId)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var RegistrationFeePayment $payment */
            $payment = RegistrationFeePayment::where('clinic_id', $clinicId)
                ->where('registration_fee_id', $fee->id)
                ->where('id', $paymentId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($payment->is_voided) {
                throw ValidationException::withMessages([
                    'payment' => ['This payment has already been voided.'],
                ]);
            }

            $payment->update([
                'is_voided'   => true,
                'voided_at'   => now(),
                'voided_by'   => $user->id,
                'void_reason' => $reason,
            ]);

            $this->recalculateFeeBalances($fee);

            AuditLog::log('registration_fee.payment_voided', 'RegistrationFeePayment', $payment->id, [
                'old_values'  => ['is_voided' => false],
                'new_values'  => ['is_voided' => true, 'void_reason' => $reason],
                'description' => "Payment #{$payment->id} (₱{$this->toDecimal($payment->amount_cents)}) voided: {$reason}",
            ]);

            return $payment;
        });
    }

    /**
     * Admin correction of fee items with audit trail.
     * New total cannot be lower than active received payments.
     *
     * @throws ValidationException
     */
    public function correctFee(int $clinicId, int $feeId, array $payload, string $reason, User $user): RegistrationFee
    {
        if (! $user->isAdmin()) {
            abort(403, 'Unauthorized. Admin access required to correct fee records.');
        }

        $reason = trim($reason);
        if (empty($reason)) {
            throw ValidationException::withMessages([
                'reason' => ['A reason is required when correcting fee amounts.'],
            ]);
        }

        return DB::transaction(function () use ($clinicId, $feeId, $payload, $reason, $user) {
            /** @var RegistrationFee $fee */
            $fee = RegistrationFee::where('clinic_id', $clinicId)
                ->where('id', $feeId)
                ->lockForUpdate()
                ->firstOrFail();

            $feePayload = $payload['registration_fee'] ?? $payload;
            $parsed = $this->validateAndParsePayload($clinicId, $feePayload);
            if (! $parsed) {
                throw ValidationException::withMessages([
                    'items' => ['Valid fee items are required.'],
                ]);
            }

            $newTotalCents = (int) $parsed['total_cents'];
            $activePaidCents = (int) $fee->payments()->where('is_voided', false)->sum('amount_cents');

            if ($newTotalCents < $activePaidCents) {
                $paidDec = $this->toDecimal($activePaidCents);
                $newDec = $this->toDecimal($newTotalCents);
                throw ValidationException::withMessages([
                    'total' => ["Corrected total (₱{$newDec}) cannot be less than payments already collected (₱{$paidDec}). Void mistaken payments first if necessary."],
                ]);
            }

            $oldTotal = $fee->total_cents;

            // Replace items
            $fee->items()->delete();
            foreach ($parsed['items'] as $item) {
                RegistrationFeeItem::create([
                    'registration_fee_id' => $fee->id,
                    'clinic_id'           => $clinicId,
                    'fee_type'            => $item['fee_type'],
                    'label'               => $item['label'],
                    'disposition'         => $item['disposition'],
                    'amount_cents'        => $item['amount_cents'],
                    'reason'              => $item['reason'] ?? null,
                    'created_by'          => $user->id,
                ]);
            }

            $fee->update([
                'total_cents'        => $newTotalCents,
                'is_complete'        => (bool) $parsed['is_complete'],
                'no_additional_fees' => (bool) $parsed['no_additional_fees'],
                'updated_by'         => $user->id,
            ]);

            $this->recalculateFeeBalances($fee);

            AuditLog::log('registration_fee.corrected', 'RegistrationFee', $fee->id, [
                'old_values'  => ['total_cents' => $oldTotal],
                'new_values'  => ['total_cents' => $newTotalCents, 'correction_reason' => $reason],
                'description' => "Fee #{$fee->id} corrected from ₱{$this->toDecimal($oldTotal)} to ₱{$this->toDecimal($newTotalCents)}: {$reason}",
            ]);

            return $fee->load(['items', 'payments.recordedBy', 'payments.voidedBy']);
        });
    }

    /**
     * Recalculate derived totals, balances, and status on a fee model.
     */
    protected function recalculateFeeBalances(RegistrationFee $fee): void
    {
        $totalCents = (int) $fee->items()
            ->where('disposition', 'recorded')
            ->sum('amount_cents');

        $paidCents = (int) $fee->payments()
            ->where('is_voided', false)
            ->sum('amount_cents');

        $balanceCents = max(0, $totalCents - $paidCents);

        // Derive status
        if ($totalCents === 0 && $fee->is_complete) {
            $status = 'no_fee';
        } elseif ($totalCents > 0 && $paidCents === 0) {
            $status = 'unpaid';
        } elseif ($paidCents > 0 && $paidCents < $totalCents) {
            $status = 'partially_paid';
        } elseif ($paidCents >= $totalCents && $totalCents > 0) {
            $status = 'paid';
        } else {
            $status = 'not_recorded';
        }

        $fee->update([
            'total_cents'       => $totalCents,
            'amount_paid_cents' => $paidCents,
            'balance_cents'     => $balanceCents,
            'status'            => $status,
        ]);
    }

    /**
     * Format a RegistrationFee instance for frontend JSON consumption.
     */
    public function formatFeeResponse(?RegistrationFee $fee): ?array
    {
        if (! $fee) {
            return null;
        }

        $items = $fee->items->map(function (RegistrationFeeItem $item) {
            return [
                'id'           => $item->id,
                'fee_type'     => $item->fee_type,
                'label'        => $item->label,
                'disposition'  => $item->disposition,
                'amount'       => $this->toDecimal($item->amount_cents),
                'amount_cents' => $item->amount_cents,
                'reason'       => $item->reason,
                'created_at'   => $item->created_at?->toISOString(),
            ];
        })->values()->all();

        $payments = $fee->payments->map(function (RegistrationFeePayment $payment) {
            return [
                'id'                     => $payment->id,
                'amount'                 => $this->toDecimal($payment->amount_cents),
                'amount_cents'           => $payment->amount_cents,
                'payment_method'         => $payment->payment_method,
                'payment_method_details' => $payment->payment_method_details,
                'reference_number'       => $payment->reference_number,
                'notes'                  => $payment->notes,
                'is_voided'              => (bool) $payment->is_voided,
                'voided_at'              => $payment->voided_at?->toISOString(),
                'void_reason'            => $payment->void_reason,
                'collected_at'           => $payment->collected_at?->toISOString(),
                'recorded_by_name'       => $payment->recordedBy?->name ?? 'Staff',
                'voided_by_name'         => $payment->voidedBy?->name,
                'created_at'             => $payment->created_at?->toISOString(),
            ];
        })->values()->all();

        return [
            'id'                 => $fee->id,
            'encounter_id'       => $fee->encounter_id,
            'clinic_id'          => $fee->clinic_id,
            'patient_id'         => $fee->patient_id,
            'currency'           => $fee->currency,
            'total'              => $this->toDecimal($fee->total_cents),
            'total_cents'        => $fee->total_cents,
            'amount_paid'        => $this->toDecimal($fee->amount_paid_cents),
            'amount_paid_cents'  => $fee->amount_paid_cents,
            'balance'            => $this->toDecimal($fee->balance_cents),
            'balance_cents'      => $fee->balance_cents,
            'status'             => $fee->status,
            'is_complete'        => (bool) $fee->is_complete,
            'no_additional_fees' => (bool) $fee->no_additional_fees,
            'notes'              => $fee->notes,
            'items'              => $items,
            'payments'           => $payments,
            'created_at'         => $fee->created_at?->toISOString(),
            'updated_at'         => $fee->updated_at?->toISOString(),
        ];
    }
}
