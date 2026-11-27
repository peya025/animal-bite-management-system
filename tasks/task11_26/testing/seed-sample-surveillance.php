<?php

// Local-only synthetic sample seeder for testing the Surveillance Insights UI.
// Usage:
//   php tasks/task11_26/testing/seed-sample-surveillance.php           (seeds 2 sample areas + evaluates)
//   php tasks/task11_26/testing/seed-sample-surveillance.php --cleanup (removes all synthetic sample data + re-evaluates)

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

$samples = [
    ['barangay' => 'Sample Poblacion (UI Test)', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'count' => 3, 'lat' => 8.5380, 'lng' => 124.7530, 'tag' => 'SURVEILLANCE_UI_TEST'],
    ['barangay' => 'Sample Baluarte (UI Test)', 'municipality' => 'Tagoloan', 'province' => 'Misamis Oriental', 'count' => 4, 'lat' => 8.5415, 'lng' => 124.7602, 'tag' => 'SURVEILLANCE_UI_TEST_2'],
];

$clinic = App\Models\Clinic::orderBy('id')->first();
$admin = App\Models\User::where('clinic_id', $clinic?->id)->orderBy('id')->first();

if (!$clinic || !$admin) {
    throw new RuntimeException('No local clinic or user found.');
}

$service = app(App\Services\Surveillance\SurveillanceSignalService::class);

if (in_array('--cleanup', $argv, true)) {
    Illuminate\Support\Facades\DB::transaction(function () use ($clinic, $samples) {
        foreach ($samples as $sample) {
            $signalIds = App\Models\SurveillanceSignal::where('clinic_id', $clinic->id)
                ->where('barangay', $sample['barangay'])
                ->pluck('id');
            if ($signalIds->isNotEmpty()) {
                Illuminate\Support\Facades\DB::table('surveillance_signal_events')->whereIn('signal_id', $signalIds)->delete();
                App\Models\SurveillanceSignal::whereIn('id', $signalIds)->delete();
            }
            $patientIds = App\Models\Patient::where('clinic_id', $clinic->id)
                ->where('first_name', $sample['tag'])
                ->pluck('patient_id');
            if ($patientIds->isNotEmpty()) {
                App\Models\BiteIncident::whereIn('patient_id', $patientIds)->delete();
                App\Models\Patient::whereIn('patient_id', $patientIds)->delete();
            }
            App\Models\BarangayCoordinate::where('barangay', $sample['barangay'])
                ->where('municipality', $sample['municipality'])
                ->where('province', $sample['province'])
                ->delete();
        }
    });
    $run = $service->evaluate($clinic->id);
    echo "All synthetic UI test samples cleaned up. Re-evaluated run #{$run->id}.\n";
    exit(0);
}

$today = Carbon\CarbonImmutable::now('Asia/Manila');

foreach ($samples as $sample) {
    $existing = App\Models\Patient::where('clinic_id', $clinic->id)
        ->where('first_name', $sample['tag'])
        ->count();
    if ($existing > 0) {
        echo "Sample '{$sample['barangay']}' already exists ({$existing} patients); keeping existing.\n";
        continue;
    }

    Illuminate\Support\Facades\DB::transaction(function () use ($clinic, $admin, $sample, $today) {
        App\Models\BarangayCoordinate::firstOrCreate(
            ['barangay' => $sample['barangay'], 'municipality' => $sample['municipality'], 'province' => $sample['province']],
            ['latitude' => $sample['lat'], 'longitude' => $sample['lng'], 'source' => 'manual']
        );

        for ($i = 1; $i <= $sample['count']; $i++) {
            $patient = App\Models\Patient::create([
                'clinic_id' => $clinic->id,
                'first_name' => $sample['tag'],
                'last_name' => 'Sample ' . $i,
                'gender' => $i % 2 === 0 ? 'male' : 'female',
                'date_of_birth' => '1995-01-0' . $i,
            ]);
            App\Models\BiteIncident::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->patient_id,
                'created_by' => $admin->id,
                'bite_date' => $today->subDays($i)->toDateString(),
                'bite_place' => "{$sample['barangay']}, {$sample['municipality']}, {$sample['province']}",
                'status' => 'active',
                'severity' => 'moderate',
            ]);
        }
    });
    echo "Seeded {$sample['count']} synthetic bite incidents in '{$sample['barangay']}, {$sample['municipality']}, {$sample['province']}'.\n";
}

$run = $service->evaluate($clinic->id);
$signals = App\Models\SurveillanceSignal::where('clinic_id', $clinic->id)
    ->whereIn('barangay', array_column($samples, 'barangay'))
    ->get()
    ->map(fn ($s) => [
        'id' => $s->id,
        'location' => "{$s->barangay}, {$s->municipality}, {$s->province}",
        'state' => $s->state,
        'current_count' => $s->metrics['current_count'] ?? null,
    ])->values()->all();

echo json_encode(['run_id' => $run->id, 'cutoff' => $run->cutoff, 'signals' => $signals], JSON_PRETTY_PRINT) . PHP_EOL;
