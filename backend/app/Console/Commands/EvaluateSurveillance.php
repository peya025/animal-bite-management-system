<?php

namespace App\Console\Commands;

use App\Models\Clinic;
use App\Services\Surveillance\SurveillanceSignalService;
use Illuminate\Console\Command;

class EvaluateSurveillance extends Command
{
    protected $signature = 'surveillance:evaluate {--clinic= : Clinic ID}';
    protected $description = 'Evaluate completed-day internal surveillance; never publish or notify patients';

    public function handle(SurveillanceSignalService $service): int
    {
        $clinics = Clinic::query()->when($this->option('clinic'), fn ($q) => $q->whereKey($this->option('clinic')))->pluck('id');
        if ($clinics->isEmpty()) { $this->error('No matching clinics.'); return self::FAILURE; }
        foreach ($clinics as $id) {
            $run = $service->evaluate($id);
            $this->info("Clinic {$id}: internal run {$run->id}, cutoff {$run->cutoff}.");
        }
        return self::SUCCESS;
    }
}
