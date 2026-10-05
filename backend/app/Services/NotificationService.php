<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\NotificationRead;
use App\Models\Queue;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NotificationService
{
    /**
     * Trigger notification when new stock is received for a batch.
     */
    public function notifyStockReceived(VaccineInventory $inventory, ?User $actor = null, ?int $quantity = null): Notification
    {
        $qty = $quantity ?? $inventory->current_quantity;
        $batch = $inventory->batch_number;
        $vaccine = $inventory->vaccine_type;

        $notification = Notification::create([
            'clinic_id'   => $inventory->clinic_id,
            'user_id'     => null, // Visible to all clinic staff
            'role'        => null,
            'type'        => 'inventory_stock_received',
            'category'    => 'inventory',
            'title'       => 'Stock Received',
            'message'     => "Stock received: {$qty} vials of {$vaccine} (Batch #{$batch}).",
            'action_url'  => "/inventory?tab=stockcard&batchId={$inventory->inventory_id}",
            'data'        => [
                'inventory_id' => $inventory->inventory_id,
                'vaccine_type' => $vaccine,
                'batch_number' => $batch,
                'quantity'     => $qty,
                'unit'         => 'vials',
                'actor_id'     => $actor?->id,
                'actor_name'   => $actor?->name,
            ],
            'is_active'   => false, // Historical event
            'status'      => 'sent',
            'send_time'   => now(),
        ]);

        // Evaluate if this new stock resolved any out-of-stock or low-stock alerts
        $this->syncInventoryAlerts($inventory->clinic_id);

        return $notification;
    }

    /**
     * Trigger notification when a new vaccine type preset is configured.
     */
    public function notifyVaccinePresetCreated(VaccineTypePreset $preset, ?User $actor = null): Notification
    {
        $name = $preset->vaccine_name;
        $category = $preset->category ?? 'Anti-Rabies Vaccines (ARV)';

        return Notification::create([
            'clinic_id'   => $preset->clinic_id,
            'user_id'     => null,
            'role'        => null,
            'type'        => 'vaccine_preset_created',
            'category'    => 'inventory',
            'title'       => 'New Vaccine Setup',
            'message'     => "New vaccine setup: {$name} ({$category}) registered.",
            'action_url'  => "/inventory/types?presetId={$preset->id}",
            'data'        => [
                'preset_id'    => $preset->id,
                'vaccine_name' => $name,
                'category'     => $category,
                'actor_id'     => $actor?->id,
                'actor_name'   => $actor?->name,
            ],
            'is_active'   => false, // Historical event
            'status'      => 'sent',
            'send_time'   => now(),
        ]);
    }

    /**
     * Trigger notification on actual successful queue registration or check-in.
     */
    public function notifyQueueEvent(Queue $queue, string $eventType = 'checked_in', ?User $actor = null): Notification
    {
        $patient = $queue->patient;
        $patientName = $patient ? trim("{$patient->first_name} {$patient->last_name}") : 'Patient';
        
        $isTreatment = in_array($queue->visit_type, ['vaccination', 'follow_up', 'observation', 'booster'], true);
        $stationName = $isTreatment ? 'Treatment' : 'Triage';
        $targetRole = $isTreatment ? 'treatment' : 'triage';
        $stationParam = $isTreatment ? 'treatment' : 'triage';
        $queueDate = $queue->queue_date ? Carbon::parse($queue->queue_date)->toDateString() : now()->toDateString();

        $title = $eventType === 'registered' ? "Queue Registration: {$stationName}" : "Queue Check-In: {$stationName}";
        $message = "Patient checked in: {$patientName} (Queue #{$queue->queue_number}, {$stationName}).";

        return Notification::create([
            'clinic_id'   => $queue->clinic_id,
            'patient_id'  => $queue->patient_id,
            'user_id'     => null,
            'role'        => $targetRole,
            'type'        => 'queue_event',
            'category'    => 'queue',
            'title'       => $title,
            'message'     => $message,
            'action_url'  => "/queue?station={$stationParam}&queueId={$queue->queue_id}&date={$queueDate}",
            'data'        => [
                'queue_id'     => $queue->queue_id,
                'queue_number' => $queue->queue_number,
                'patient_id'   => $queue->patient_id,
                'patient_name' => $patientName,
                'visit_type'   => $queue->visit_type,
                'station'      => $stationName,
                'queue_date'   => $queueDate,
                'event_type'   => $eventType,
                'actor_id'     => $actor?->id,
            ],
            'is_active'   => false, // Historical event
            'status'      => 'sent',
            'send_time'   => now(),
        ]);
    }

    /**
     * Trigger notification on actual successful appointment booking.
     */
    public function notifyAppointmentEvent(Appointment $appointment, string $eventType = 'booked', ?User $actor = null): Notification
    {
        $patient = $appointment->patient;
        $patientName = $patient ? trim("{$patient->first_name} {$patient->last_name}") : 'Patient';
        $dose = $appointment->dose_number ? "Dose {$appointment->dose_number}" : 'PEP vaccination';
        $dateStr = Carbon::parse($appointment->appointment_date ?? $appointment->scheduled_date)->format('M d, Y');

        return Notification::create([
            'clinic_id'      => $appointment->clinic_id,
            'patient_id'     => $appointment->patient_id,
            'appointment_id' => $appointment->appointment_id,
            'user_id'        => null,
            'role'           => null,
            'type'           => 'appointment_event',
            'category'       => 'appointment',
            'title'          => 'Appointment Scheduled',
            'message'        => "New appointment booked: {$patientName} for {$dose} on {$dateStr}.",
            'action_url'     => "/vaccinations?tab=matrix&patient_id={$appointment->patient_id}&appointment_id={$appointment->appointment_id}&dose={$appointment->dose_number}",
            'data'           => [
                'appointment_id' => $appointment->appointment_id,
                'patient_id'     => $appointment->patient_id,
                'patient_name'   => $patientName,
                'dose_number'    => $appointment->dose_number,
                'appointment_date'=> $dateStr,
                'actor_id'       => $actor?->id,
            ],
            'is_active'      => false, // Historical event
            'status'         => 'sent',
            'send_time'      => now(),
        ]);
    }

    /**
     * Synchronize condition-based alerts for a clinic (low stock, near-expiry, overdue PEP, high-risk areas).
     * Prevents duplicates and marks resolved alerts when conditions are rectified.
     */
    public function syncActiveAlerts(int $clinicId): void
    {
        $this->syncInventoryAlerts($clinicId);
        $this->syncExpiryAlerts($clinicId);
        $this->syncOverdueVaccinationAlerts($clinicId);
        $this->syncHighRiskAreaAlerts($clinicId);
    }

    /**
     * Sync low stock and out-of-stock active alerts.
     */
    public function syncInventoryAlerts(int $clinicId): void
    {
        $lowThreshold = config('inventory.low_stock_threshold', 10);
        $today = Carbon::today()->toDateString();

        // Get distinct vaccine names across active presets or batches
        $presetNames = VaccineTypePreset::where(function ($q) use ($clinicId) {
            $q->whereNull('clinic_id')->orWhere('clinic_id', $clinicId);
        })->pluck('vaccine_name')->all();

        $inventoryNames = VaccineInventory::where('clinic_id', $clinicId)
            ->whereNull('deleted_at')
            ->distinct()
            ->pluck('vaccine_type')
            ->all();

        $allVaccineNames = array_values(array_unique(array_filter(array_merge($presetNames, $inventoryNames))));

        foreach ($allVaccineNames as $vaccineName) {
            // Usable inventory: active, unexpired, non-deleted stock
            $usableQty = (int) VaccineInventory::where('clinic_id', $clinicId)
                ->where('vaccine_type', $vaccineName)
                ->where('status', 'active')
                ->whereNull('deleted_at')
                ->whereDate('expiration_date', '>=', $today)
                ->sum('current_quantity');

            $outKey = "out_of_stock:clinic_{$clinicId}:" . Str::slug($vaccineName);
            $lowKey = "low_stock:clinic_{$clinicId}:" . Str::slug($vaccineName);

            if ($usableQty === 0) {
                // Resolve low stock alert if any
                Notification::where('clinic_id', $clinicId)
                    ->where('alert_key', $lowKey)
                    ->where('is_active', true)
                    ->update(['is_active' => false, 'resolved_at' => now()]);

                // Create out-of-stock alert if not already active
                $existing = Notification::where('clinic_id', $clinicId)
                    ->where('alert_key', $outKey)
                    ->where('is_active', true)
                    ->first();

                if (!$existing) {
                    Notification::create([
                        'clinic_id'   => $clinicId,
                        'category'    => 'inventory',
                        'type'        => 'inventory_out_of_stock',
                        'title'       => 'Out of Stock Alert',
                        'message'     => "Out of Stock: {$vaccineName} has 0 usable vials remaining in inventory.",
                        'action_url'  => '/inventory?tab=table&search=' . urlencode($vaccineName) . '&statusFilter=depleted',
                        'alert_key'   => $outKey,
                        'is_active'   => true,
                        'status'      => 'sent',
                        'send_time'   => now(),
                        'data'        => [
                            'vaccine_name'     => $vaccineName,
                            'usable_quantity'  => 0,
                            'unit'             => 'vials',
                            'severity'         => 'danger',
                        ],
                    ]);
                }
            } elseif ($usableQty <= $lowThreshold) {
                // Resolve out of stock alert if any
                Notification::where('clinic_id', $clinicId)
                    ->where('alert_key', $outKey)
                    ->where('is_active', true)
                    ->update(['is_active' => false, 'resolved_at' => now()]);

                // Create low stock alert if not already active
                $existing = Notification::where('clinic_id', $clinicId)
                    ->where('alert_key', $lowKey)
                    ->where('is_active', true)
                    ->first();

                if (!$existing) {
                    Notification::create([
                        'clinic_id'   => $clinicId,
                        'category'    => 'inventory',
                        'type'        => 'inventory_low_stock',
                        'title'       => 'Vaccine Inventory Alert',
                        'message'     => "Vaccine Inventory Alert: {$vaccineName} stock is running low ({$usableQty} vials remaining).",
                        'action_url'  => '/inventory?tab=table&search=' . urlencode($vaccineName) . '&statusFilter=low-stock',
                        'alert_key'   => $lowKey,
                        'is_active'   => true,
                        'status'      => 'sent',
                        'send_time'   => now(),
                        'data'        => [
                            'vaccine_name'     => $vaccineName,
                            'usable_quantity'  => $usableQty,
                            'threshold'        => $lowThreshold,
                            'unit'             => 'vials',
                            'severity'         => 'warning',
                        ],
                    ]);
                }
            } else {
                // Stock is adequate: resolve any active alerts for this vaccine
                Notification::where('clinic_id', $clinicId)
                    ->whereIn('alert_key', [$outKey, $lowKey])
                    ->where('is_active', true)
                    ->update(['is_active' => false, 'resolved_at' => now()]);
            }
        }
    }

    /**
     * Sync near-expiry and expired batch alerts.
     */
    public function syncExpiryAlerts(int $clinicId): void
    {
        $expiryDaysThreshold = config('inventory.near_expiry_days', 30);
        $today = Carbon::today();
        $soonDate = Carbon::today()->addDays($expiryDaysThreshold);

        $activeBatches = VaccineInventory::where('clinic_id', $clinicId)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->where('current_quantity', '>', 0)
            ->get();

        $activeBatchIds = $activeBatches->pluck('inventory_id')->all();

        foreach ($activeBatches as $batch) {
            $expDate = Carbon::parse($batch->expiration_date)->startOfDay();
            $expiredKey = "batch_expired:{$batch->inventory_id}";
            $nearKey = "batch_near_expiry:{$batch->inventory_id}";

            if ($expDate->lt($today)) {
                // Batch is expired
                Notification::where('clinic_id', $clinicId)
                    ->where('alert_key', $nearKey)
                    ->where('is_active', true)
                    ->update(['is_active' => false, 'resolved_at' => now()]);

                $existing = Notification::where('clinic_id', $clinicId)
                    ->where('alert_key', $expiredKey)
                    ->where('is_active', true)
                    ->first();

                if (!$existing) {
                    Notification::create([
                        'clinic_id'   => $clinicId,
                        'category'    => 'expiry',
                        'type'        => 'batch_expired',
                        'title'       => 'Expired Vaccine Alert',
                        'message'     => "Expired Vaccine Alert: {$batch->vaccine_type} (Batch #{$batch->batch_number}) expired on {$expDate->format('M d, Y')} ({$batch->current_quantity} vials remaining).",
                        'action_url'  => "/inventory?tab=stockcard&batchId={$batch->inventory_id}",
                        'alert_key'   => $expiredKey,
                        'is_active'   => true,
                        'status'      => 'sent',
                        'send_time'   => now(),
                        'data'        => [
                            'inventory_id'    => $batch->inventory_id,
                            'vaccine_type'    => $batch->vaccine_type,
                            'batch_number'    => $batch->batch_number,
                            'current_quantity'=> $batch->current_quantity,
                            'expiration_date' => $expDate->toDateString(),
                            'days_remaining'  => 0,
                            'severity'        => 'danger',
                        ],
                    ]);
                }
            } elseif ($expDate->lte($soonDate)) {
                // Batch is expiring soon
                $daysRemaining = max(0, $today->diffInDays($expDate, false));

                $existing = Notification::where('clinic_id', $clinicId)
                    ->where('alert_key', $nearKey)
                    ->where('is_active', true)
                    ->first();

                if (!$existing) {
                    Notification::create([
                        'clinic_id'   => $clinicId,
                        'category'    => 'expiry',
                        'type'        => 'batch_near_expiry',
                        'title'       => 'Near-Expiry Stock Alert',
                        'message'     => "Near-Expiry Stock Alert: {$batch->vaccine_type} (Batch #{$batch->batch_number}) expires in {$daysRemaining} day(s) on {$expDate->format('M d, Y')} ({$batch->current_quantity} vials remaining).",
                        'action_url'  => "/inventory?tab=stockcard&batchId={$batch->inventory_id}",
                        'alert_key'   => $nearKey,
                        'is_active'   => true,
                        'status'      => 'sent',
                        'send_time'   => now(),
                        'data'        => [
                            'inventory_id'    => $batch->inventory_id,
                            'vaccine_type'    => $batch->vaccine_type,
                            'batch_number'    => $batch->batch_number,
                            'current_quantity'=> $batch->current_quantity,
                            'expiration_date' => $expDate->toDateString(),
                            'days_remaining'  => $daysRemaining,
                            'severity'        => 'warning',
                        ],
                    ]);
                }
            } else {
                // Batch expires comfortably in the future
                Notification::where('clinic_id', $clinicId)
                    ->whereIn('alert_key', [$expiredKey, $nearKey])
                    ->where('is_active', true)
                    ->update(['is_active' => false, 'resolved_at' => now()]);
            }
        }

        // Resolve alerts for batches that are no longer active, depleted, or deleted
        Notification::where('clinic_id', $clinicId)
            ->where('category', 'expiry')
            ->where('is_active', true)
            ->whereNotNull('alert_key')
            ->get()
            ->each(function ($notif) use ($activeBatchIds) {
                if (preg_match('/batch_(?:expired|near_expiry):(\d+)/', $notif->alert_key, $matches)) {
                    $batchId = (int) $matches[1];
                    if (!in_array($batchId, $activeBatchIds, true)) {
                        $notif->update(['is_active' => false, 'resolved_at' => now()]);
                    }
                }
            });
    }

    /**
     * Sync overdue vaccination active alerts.
     */
    public function syncOverdueVaccinationAlerts(int $clinicId): void
    {
        $today = Carbon::today();

        // Find overdue appointments
        $overdueAppointments = Appointment::where('clinic_id', $clinicId)
            ->where(function ($q) use ($today) {
                $q->whereDate('appointment_date', '<', $today)
                  ->orWhere(function ($sub) use ($today) {
                      $sub->whereNull('appointment_date')
                          ->whereDate('scheduled_date', '<', $today);
                  });
            })
            ->whereIn('status', ['scheduled', 'missed'])
            ->with(['patient', 'biteIncident'])
            ->get();

        $activeApptIds = [];

        foreach ($overdueAppointments as $appt) {
            $date = Carbon::parse($appt->appointment_date ?? $appt->scheduled_date)->startOfDay();
            $daysOverdue = max(1, $today->diffInDays($date));

            // Check if patient already completed this or a subsequent dose
            $alreadyAdministered = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $appt->patient_id)
                ->where('bite_id', $appt->bite_id)
                ->whereNotNull('dose_number')
                ->where('dose_number', '>=', $appt->dose_number ?? 1)
                ->whereIn('status', ['administered', 'completed'])
                ->exists();

            if ($alreadyAdministered) {
                // Dose was already received: appointment is superseded
                $appt->update(['status' => 'completed']);
                continue;
            }

            $activeApptIds[] = $appt->appointment_id;
            $alertKey = "overdue_appt:{$appt->appointment_id}";
            $patientName = $appt->patient ? trim("{$appt->patient->first_name} {$appt->patient->last_name}") : 'Patient';
            $doseLabel = $appt->dose_number ? "Dose {$appt->dose_number}" : 'PEP vaccination';

            $existing = Notification::where('clinic_id', $clinicId)
                ->where('alert_key', $alertKey)
                ->where('is_active', true)
                ->first();

            if (!$existing) {
                Notification::create([
                    'clinic_id'      => $clinicId,
                    'patient_id'     => $appt->patient_id,
                    'appointment_id' => $appt->appointment_id,
                    'category'       => 'overdue',
                    'type'           => 'vaccination_overdue',
                    'title'          => 'Overdue Vaccination Alert',
                    'message'        => "Overdue PEP Vaccination: {$patientName} is {$daysOverdue} day(s) overdue for {$doseLabel} (scheduled for {$date->format('M d, Y')}).",
                    'action_url'     => "/vaccinations?tab=missed&patient_id={$appt->patient_id}&appointment_id={$appt->appointment_id}&dose={$appt->dose_number}&status_context=overdue",
                    'alert_key'      => $alertKey,
                    'is_active'      => true,
                    'status'         => 'sent',
                    'send_time'      => now(),
                    'data'           => [
                        'appointment_id' => $appt->appointment_id,
                        'patient_id'     => $appt->patient_id,
                        'patient_name'   => $patientName,
                        'dose_number'    => $appt->dose_number,
                        'days_overdue'   => $daysOverdue,
                        'scheduled_date' => $date->toDateString(),
                        'severity'       => 'warning',
                    ],
                ]);
            }
        }

        // Resolve overdue alerts whose appointment has been completed, cancelled, or superseded
        Notification::where('clinic_id', $clinicId)
            ->where('category', 'overdue')
            ->where('is_active', true)
            ->whereNotNull('alert_key')
            ->get()
            ->each(function ($notif) use ($activeApptIds) {
                if (preg_match('/overdue_appt:(\d+)/', $notif->alert_key, $matches)) {
                    $apptId = (int) $matches[1];
                    if (!in_array($apptId, $activeApptIds, true)) {
                        $notif->update(['is_active' => false, 'resolved_at' => now()]);
                    }
                }
            });
    }

    /**
     * Sync high-risk area alerts based on Bite Incident Place of Exposure and severity score.
     * Matches Bite Map and Descriptive Analytics:
     * - Source: BiteIncident
     * - Location field: bite_place (Place of Exposure)
     * - Reporting period: current calendar month
     * - Formula: Risk Score = (Cat III * 1.5 + Cat II * 1.0) / Total * 100
     * - Threshold: Risk Score >= 65% is High Risk
     */
    public function syncHighRiskAreaAlerts(int $clinicId): void
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth()->toDateString();
        $endOfMonth = $now->copy()->endOfMonth()->toDateString();
        $periodLabel = $now->format('F Y');
        $monthKey = $now->format('Y-m');

        // Query bite cases for current month
        $cases = BiteIncident::where('clinic_id', $clinicId)
            ->whereBetween('bite_date', [$startOfMonth, $endOfMonth])
            ->whereNotNull('bite_place')
            ->where('bite_place', '!=', '')
            ->get();

        $activeHighRiskKeys = [];

        // Group by Place of Exposure (bite_place)
        $grouped = $cases->groupBy(fn ($case) => trim((string) $case->bite_place) ?: 'Unknown');

        foreach ($grouped as $location => $locationCases) {
            $total = $locationCases->count();
            if ($total === 0) continue;

            $cat1 = $locationCases->filter(fn ($c) => $c->bite_category === 'I')->count();
            $cat2 = $locationCases->filter(fn ($c) => $c->bite_category === 'II')->count();
            $cat3 = $locationCases->filter(fn ($c) => $c->bite_category === 'III')->count();

            // Severity-weighted risk score
            $riskScore = (int) round((($cat3 * 1.5) + $cat2) / $total * 100);

            $alertKey = "high_risk_area:clinic_{$clinicId}:" . Str::slug($location) . ":{$monthKey}";

            if ($riskScore >= 65) {
                $activeHighRiskKeys[] = $alertKey;

                $existing = Notification::where('clinic_id', $clinicId)
                    ->where('alert_key', $alertKey)
                    ->where('is_active', true)
                    ->first();

                if (!$existing) {
                    Notification::create([
                        'clinic_id'   => $clinicId,
                        'category'    => 'high_risk',
                        'type'        => 'high_risk_area',
                        'title'       => 'High-Risk Exposure Area Alert',
                        'message'     => "High-Risk Exposure Area Alert: {$location} is classified as High Risk ({$total} incident(s), {$riskScore}% severity score in {$periodLabel}).",
                        'action_url'  => '/bite-map?location=' . urlencode($location) . '&period=month&category=severe',
                        'alert_key'   => $alertKey,
                        'is_active'   => true,
                        'status'      => 'sent',
                        'send_time'   => now(),
                        'data'        => [
                            'location'       => $location,
                            'location_level' => 'Barangay / Place of Exposure',
                            'total_cases'    => $total,
                            'cat_3'          => $cat3,
                            'cat_2'          => $cat2,
                            'cat_1'          => $cat1,
                            'risk_score'     => $riskScore,
                            'period'         => $periodLabel,
                            'reason'         => "Severity score of {$riskScore}% reached or exceeded the 65% threshold based on reported Category II/III exposures.",
                            'disclaimer'     => 'Surveillance metric measuring severe bite exposure burden; does not represent confirmed rabies infection or predict future cases.',
                            'severity'       => 'danger',
                        ],
                    ]);
                }
            }
        }

        // If an area dropped below 65% due to record corrections or new entries, resolve its alert
        Notification::where('clinic_id', $clinicId)
            ->where('category', 'high_risk')
            ->where('is_active', true)
            ->where('alert_key', 'like', "high_risk_area:clinic_{$clinicId}:%:{$monthKey}")
            ->get()
            ->each(function ($notif) use ($activeHighRiskKeys) {
                if (!in_array($notif->alert_key, $activeHighRiskKeys, true)) {
                    $notif->update(['is_active' => false, 'resolved_at' => now()]);
                }
            });
    }

    /**
     * Mark a notification as read for a specific user.
     */
    public function markAsRead(Notification $notification, User $user): void
    {
        NotificationRead::firstOrCreate([
            'notification_id' => $notification->notification_id,
            'user_id'         => $user->id,
        ], [
            'read_at'         => now(),
        ]);
    }

    /**
     * Mark all visible notifications as read for a specific user.
     */
    public function markAllAsReadForUser(User $user): void
    {
        $clinicId = $user->clinic_id;
        $userRole = $user->role;

        // Find all notifications visible to this user
        $notifications = Notification::where('clinic_id', $clinicId)
            ->where(function ($q) use ($user) {
                $q->whereNull('user_id')->orWhere('user_id', $user->id);
            })
            ->where(function ($q) use ($userRole) {
                if ($userRole === 'registration') {
                    $q->whereNotIn('category', ['inventory', 'expiry']);
                }
                $q->where(function ($sub) use ($userRole) {
                    $sub->whereNull('role')
                        ->orWhere('role', $userRole)
                        ->orWhere('role', 'all');
                });
            })
            ->pluck('notification_id');

        $alreadyReadIds = NotificationRead::where('user_id', $user->id)
            ->whereIn('notification_id', $notifications)
            ->pluck('notification_id')
            ->all();

        $unreadIds = $notifications->diff($alreadyReadIds);

        $now = now();
        $records = [];
        foreach ($unreadIds as $id) {
            $records[] = [
                'notification_id' => $id,
                'user_id'         => $user->id,
                'read_at'         => $now,
                'created_at'      => $now,
                'updated_at'      => $now,
            ];
        }

        if (!empty($records)) {
            NotificationRead::insert($records);
        }
    }

    /**
     * Get paginated or listed notifications for a user, with is_read status computed per user.
     */
    public function getNotificationsForUser(User $user, int $limit = 50)
    {
        $clinicId = $user->clinic_id;
        $userRole = $user->role;

        // Auto-sync active alerts for this clinic on fetch
        $this->syncActiveAlerts($clinicId);

        $notifications = Notification::where('clinic_id', $clinicId)
            ->where(function ($q) use ($user) {
                $q->whereNull('user_id')->orWhere('user_id', $user->id);
            })
            ->where(function ($q) use ($userRole) {
                if ($userRole === 'registration') {
                    $q->whereNotIn('category', ['inventory', 'expiry']);
                }
                $q->where(function ($sub) use ($userRole) {
                    $sub->whereNull('role')
                        ->orWhere('role', $userRole)
                        ->orWhere('role', 'all');
                });
            })
            ->with(['reads' => function ($q) use ($user) {
                $q->where('user_id', $user->id);
            }])
            ->orderBy('created_at', 'desc')
            ->orderBy('notification_id', 'desc')
            ->limit($limit)
            ->get();

        return $notifications->map(function ($notif) use ($user) {
            $isRead = $notif->reads->isNotEmpty();
            $icon = match ($notif->category) {
                'inventory'   => 'warning',
                'expiry'      => 'warning',
                'queue'       => 'patients',
                'appointment' => 'calendar',
                'overdue'     => 'calendar',
                'high_risk'   => 'warning',
                default       => 'activity',
            };

            return [
                'id'            => $notif->notification_id,
                'title'         => $notif->title,
                'message'       => $notif->message,
                'text'          => $notif->message,
                'category'      => $notif->category,
                'type'          => $notif->type,
                'action_url'    => $notif->action_url,
                'data'          => $notif->data,
                'is_active'     => (bool) $notif->is_active,
                'is_unread'     => !$isRead,
                'is_read'       => $isRead,
                'resolved_at'   => $notif->resolved_at?->toIso8601String(),
                'created_at'    => $notif->created_at?->toIso8601String(),
                'time_ago'      => $notif->created_at ? $notif->created_at->diffForHumans() : '',
                'icon'          => $icon,
            ];
        });
    }

    /**
     * Get unread notifications count for a user.
     */
    public function getUnreadCountForUser(User $user): int
    {
        $clinicId = $user->clinic_id;
        $userRole = $user->role;

        $visibleQuery = Notification::where('clinic_id', $clinicId)
            ->where(function ($q) use ($user) {
                $q->whereNull('user_id')->orWhere('user_id', $user->id);
            })
            ->where(function ($q) use ($userRole) {
                if ($userRole === 'registration') {
                    $q->whereNotIn('category', ['inventory', 'expiry']);
                }
                $q->where(function ($sub) use ($userRole) {
                    $sub->whereNull('role')
                        ->orWhere('role', $userRole)
                        ->orWhere('role', 'all');
                });
            });

        $readIds = NotificationRead::where('user_id', $user->id)->pluck('notification_id');

        return (clone $visibleQuery)
            ->whereNotIn('notification_id', $readIds)
            ->count();
    }
}
