<?php

declare(strict_types=1);

use App\Services\VaccineInventoryUsageService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Validation\ValidationException;

require dirname(__DIR__, 2) . '/vendor/autoload.php';

$app = require dirname(__DIR__, 2) . '/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (app()->environment() !== 'testing' || getenv('MYSQL_CONCURRENCY_TESTING') !== '1') {
    fwrite(STDERR, "This worker is restricted to the enabled MySQL concurrency test environment.\n");
    exit(2);
}

[$clinicId, $staffId, $treatmentId, $vaccineType, $quantity] = array_slice($argv, 1, 5);

if ($clinicId === null || $staffId === null || $treatmentId === null || $vaccineType === null || $quantity === null) {
    fwrite(STDERR, "Missing worker arguments.\n");
    exit(2);
}

echo "ready\n";
flush();

try {
    app(VaccineInventoryUsageService::class)->deductForTreatment(
        (int) $clinicId,
        (int) $staffId,
        (int) $treatmentId,
        (string) $vaccineType,
        (int) $quantity,
    );

    echo "deduction_succeeded\n";
    exit(0);
} catch (ValidationException $exception) {
    echo "validation_error\n";
    exit(1);
}
