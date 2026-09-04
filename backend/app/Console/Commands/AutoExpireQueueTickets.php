<?php

namespace App\Console\Commands;

use App\Models\Queue;
use App\Models\QueueHistory;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class AutoExpireQueueTickets extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'queue:auto-expire';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Auto-expire unserved queue tickets from prior clinic days';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $todayDate = Carbon::today()->toDateString();
        $this->info("🧹 Starting Daily Queue Auto-Expiry Sweep for tickets prior to {$todayDate}...");

        $staleStatuses = ['waiting', 'called', 'in_consultation', 'serving', 'second_chance', 'final_recall'];

        $staleTickets = Queue::where('queue_date', '<', $todayDate)
            ->whereIn('status', $staleStatuses)
            ->whereNull('deleted_at')
            ->get();

        $count = 0;
        $affectedClinics = [];

        foreach ($staleTickets as $ticket) {
            $prevStatus = $ticket->status;
            $ticket->update([
                'status'             => 'no_response',
                'no_response_at'     => now(),
                'consultation_notes' => 'Auto-expired: patient did not complete visit before clinic closed',
            ]);

            QueueHistory::create([
                'queue_id'     => $ticket->queue_id,
                'clinic_id'    => $ticket->clinic_id,
                'patient_id'   => $ticket->patient_id,
                'action'       => 'auto_expired',
                'from_status'  => $prevStatus,
                'to_status'    => 'no_response',
                'call_count'   => $ticket->call_count ?? 0,
                'performed_by' => null,
                'notes'        => 'Auto-expired at end of clinic day',
                'occurred_at'  => now(),
            ]);

            $affectedClinics[$ticket->clinic_id] = true;
            $count++;
        }

        // Flush caches for affected clinics
        foreach (array_keys($affectedClinics) as $clinicId) {
            Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");
        }

        $this->info("✅ Auto-expired {$count} stale unserved queue tickets across " . count($affectedClinics) . " clinics.");

        return Command::SUCCESS;
    }
}
