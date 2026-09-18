<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\Queue;
use App\Models\TreatmentRecord;
use App\Models\VaccineInventory;
use App\Policies\PatientAccountPolicy;
use App\Policies\PatientPolicy;
use App\Policies\QueuePolicy;
use App\Policies\TreatmentRecordPolicy;

use App\Policies\VaccineInventoryPolicy;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Prevent N+1 query bugs during development
        Model::preventLazyLoading(! $this->app->isProduction());

        Gate::policy(Patient::class, PatientPolicy::class);
        Gate::policy(PatientAccount::class, PatientAccountPolicy::class);
        Gate::policy(Queue::class, QueuePolicy::class);
        Gate::policy(TreatmentRecord::class, TreatmentRecordPolicy::class);
        Gate::policy(VaccineInventory::class, VaccineInventoryPolicy::class);
    }
}
