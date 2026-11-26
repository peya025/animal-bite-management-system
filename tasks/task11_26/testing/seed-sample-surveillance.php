<?php

// Local-only synthetic sample seeder for testing the Surveillance Insights UI.
// Usage:
//   php tasks/task11_26/testing/seed-sample-surveillance.php           (seeds 3 synthetic cases + evaluates)
//   php tasks/task11_26/testing/seed-sample-surveillance.php --cleanup (removes synthetic sample data + re-evaluates)

$root = dirname(__DIR__, 3);
require $root . '/backend/vendor/autoload.php';
$app = require $root . '/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$connection = config('database.default');
$settings = config('database.connections.' . $connection);
$host = $settings['host'] ?? null;

if (!app()->environment('local') || config('community_awareness.publication_enabled') || !empty($settings['url'])) {
    throw new RuntimeException('Refusing sample seed: local environment, disabled publication, and explicit local connection required.');
}
if ($connection !== 'mysql' || !in_array($host, ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Refusing sample seed: expected local MySQL connection.');
}

$barangay = 'Sample Poblacion (UI Test)';
$municipality = 'Tagoloan';
$province = 'Misamis Oriental';
$clinic = App\Models\Clinic::orderBy('id')->first();
$admin = App\Models\User::where('clinic_id', $clinic?->id)->orderBy('id')->first();

if (!$clinic || !$admin) {
    throw new RuntimeException('No local clinic or user found.');
}

$service = app(App\Services\Surveillance\SurveillanceSignalService::class);

if (in_array('--cleanup', $argv, true)) {
    Illuminate\Support\Facades\DB::transaction(function () use ($clinic, $barangay, $municipality, $province) {
        $signalIds = App\Models\SurveillanceSignal::where('clinic_id', $clinic->id)
            ->where('barangay', $barangay)
            ->pluck('id');
        if ($signalIds->isNotEmpty()) {
            Illuminate\Support\Facades\DB::table('surveillance_signal_events')->whereIn('signal_id', $signalIds)->delete();
            App\Models\SurveillanceSignal::whereIn('id', $signalIds)->delete();
        }
        $patientIds = App\Models\Patient::where('clinic_id', $clinic->id)
            ->where('first_name', 'SURVEILLANCE_UI_TEST')
            ->pluck('patient_id');
        if ($patientIds->isNotEmpty()) {
            App\Models\BiteIncident::whereIn('patient_id', $patientIds)->delete();
            App\Models\Patient::whereIn('patient_id', $patientIds)->delete();
        }
        App\Models\BarangayCoordinate::where('barangay', $barangay)
            ->where('municipality', $municipality)
            ->where('province', $province)
            ->delete();
    });
    $run = $service->evaluate($clinic->id);
    echo "Synthetic UI test sample cleaned up. Re-evaluated run #{$run->id}.\n";
    exit(0);
}

$existing = App\Models\Patient::where('clinic_id', $clinic->id)
    ->where('first_name', 'SURVEILLANCE_UI_TEST')
    ->count();

if ($existing === 0) {
    Illuminate\Support\Facades\DB::transaction(function () use ($clinic, $admin, $barangay, $municipality, $province) {
        App\Models\BarangayCoordinate::firstOrCreate(
            ['barangay' => $barangay, 'municipality' => $municipality, 'province' => $province],
            ['latitude' => 8.5380, 'longitude' => 124.7530, 'source' => 'manual']
        );

        $today = Carbon\CarbonImmutable::now('Asia/Manila');
        for ($i = 1; $i <= 3; $i++) {
            $patient = App\Models\Patient::create([
                'clinic_id' => $clinic->id,
                'first_name' => 'SURVEILLANCE_UI_TEST',
                'last_name' => 'Sample ' . $i,
                'gender' => $i % 2 === 0 ? 'male' : 'female',
                'date_of_birth' => '1995-01-0' . $i,
            ]);
            App\Models\BiteIncident::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->patient_id,
                'created_by' => $admin->id,
                'bite_date' => $today->subDays($i)->toDateString(),
                'bite_place' => "{$barangay}, {$municipality}, {$province}",
                'status' => 'active',
                'severity' => 'moderate',
            ]);
        }
    });
    echo "Seeded 3 synthetic UI test bite incidents in '{$barangay}, {$municipality}, {$province}'.\n";
} else {
    echo "Synthetic UI test patients already exist ({$existing}); skipping duplicate creation.\n";
}

$run = $service->evaluate($clinic->id);
$signal = App\Models\SurveillanceSignal::where('clinic_id', $clinic->id)
    ->where('barangay', $barangay)
    ->first();

echo json_encode([
    'run_id' => $run->id,
    'cutoff' => $run->cutoff,
    'signal_id' => $signal?->id,
    'location' => $signal ? "{$signal->barangay}, {$signal->municipality}, {$signal->province}" : null,
    'priority' => $signal?->priority,
    'state' => $signal?->state,
    'current_count' => $signal?->metrics['current_count'] ?? null,
], JSON_PRETTY_PRINT) . PHP_EOL;
