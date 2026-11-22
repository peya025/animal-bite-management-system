<?php

namespace App\Console\Commands;

use App\Models\Clinic;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SyncClinicAlerts extends Command
{
    protected $signature = 'clinic:sync-alerts {--clinic= : Sync alerts for a specific clinic ID}';

    protected $description = 'Synchronize clinic-wide active alerts (inventory, expiry, overdue PEP, and 7-day barangay surge/cluster detection)';

    public function handle(NotificationService $notificationService): int
    {
        $clinicOption = $this->option('clinic');
        $query = Clinic::query();
        if ($clinicOption !== null && $clinicOption !== '') {
            $query->where('id', (int) $clinicOption);
        }

        $clinics = $query->pluck('id');
        if ($clinics->isEmpty()) {
            $this->warn('No matching clinics found to sync alerts.');

            return self::SUCCESS;
        }

        foreach ($clinics as $clinicId) {
            $notificationService->syncActiveAlerts((int) $clinicId);
        }

        $this->info("Synchronized clinic alerts for {$clinics->count()} clinic(s).");

        return self::SUCCESS;
    }
}
