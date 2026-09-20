<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
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

        if ($this->app->environment('production')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }

        Gate::policy(Patient::class, PatientPolicy::class);
        Gate::policy(PatientAccount::class, PatientAccountPolicy::class);
        Gate::policy(Queue::class, QueuePolicy::class);
        Gate::policy(TreatmentRecord::class, TreatmentRecordPolicy::class);
        Gate::policy(VaccineInventory::class, VaccineInventoryPolicy::class);

        // Define rate limiters tailored to endpoint risk profiles
        \Illuminate\Support\Facades\RateLimiter::for('login', function (\Illuminate\Http\Request $request) {
            return [
                \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by((string) $request->input('email') . '|' . $request->ip()),
                \Illuminate\Cache\RateLimiting\Limit::perMinute(20)->by($request->ip()),
            ];
        });

        \Illuminate\Support\Facades\RateLimiter::for('password-reset', function (\Illuminate\Http\Request $request) {
            return [
                \Illuminate\Cache\RateLimiting\Limit::perHour(3)->by((string) $request->input('email') . '|' . $request->ip()),
                \Illuminate\Cache\RateLimiting\Limit::perHour(10)->by($request->ip()),
            ];
        });

        \Illuminate\Support\Facades\RateLimiter::for('invite-activation', function (\Illuminate\Http\Request $request) {
            return [
                \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($request->ip()),
            ];
        });
    }
}
