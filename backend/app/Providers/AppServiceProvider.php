<?php

namespace App\Providers;

use App\Services\Messaging\BrevoEmailService;
use App\Services\Messaging\EmailTransportInterface;
use App\Services\Messaging\SmtpEmailService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
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
     *
     * Binds EmailTransportInterface to BrevoEmailService when BREVO_API_KEY is
     * present in config, and to SmtpEmailService otherwise (local dev / testing).
     *
     * The binding is intentionally explicit: there is no silent fallback on
     * Railway. If BREVO_API_KEY is absent on Railway, BrevoEmailService's own
     * configurationError() will return 'brevo_api_key_missing' and all delivery
     * attempts will be blocked at the DeliveryPolicy level before any HTTP call
     * is made.
     */
    public function register(): void
    {
        $this->app->bind(EmailTransportInterface::class, function () {
            if (! empty(config('services.brevo.key'))) {
                return new BrevoEmailService();
            }

            return new SmtpEmailService();
        });

        $this->app->afterResolving('queue', function ($manager, $app) {
            $manager->addConnector('database', fn () => new \App\Queue\QuarantineDatabaseConnector($app['db']));
        });
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

        \App\Models\Appointment::observe(\App\Observers\AppointmentEmailObserver::class);

        Gate::policy(Patient::class, PatientPolicy::class);
        Gate::policy(PatientAccount::class, PatientAccountPolicy::class);
        Gate::policy(Queue::class, QueuePolicy::class);
        Gate::policy(TreatmentRecord::class, TreatmentRecordPolicy::class);
        Gate::policy(VaccineInventory::class, VaccineInventoryPolicy::class);

        // SendAppointmentFcmNotification is auto-discovered by Laravel 12 via its
        // type-hinted handle(AppointmentStatusChanged) method; avoid duplicate Event::listen().

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
