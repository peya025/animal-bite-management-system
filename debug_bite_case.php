<?php
// Debug script to check bite case data
require __DIR__ . '/backend/vendor/autoload.php';

$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Checking Recent Bite Cases ===\n\n";

$cases = App\Models\BiteIncident::with(['patient', 'intake'])
    ->orderBy('created_at', 'desc')
    ->limit(5)
    ->get();

foreach ($cases as $case) {
    echo "Case #{$case->case_number}\n";
    echo "Bite ID: {$case->bite_id}\n";
    echo "Patient ID: {$case->patient_id}\n";
    echo "Patient Object: " . ($case->patient ? "Loaded" : "NULL") . "\n";
    if ($case->patient) {
        echo "  Patient first_name: " . ($case->patient->first_name ?? 'NULL') . "\n";
        echo "  Patient last_name: " . ($case->patient->last_name ?? 'NULL') . "\n";
        echo "  Patient name accessor: " . ($case->patient->name ?? 'NULL') . "\n";
    }
    echo "Bite Place: " . ($case->bite_place ?? 'NULL') . "\n";
    echo "Bite Date: " . ($case->bite_date ?? 'NULL') . "\n";
    echo "Status: {$case->status}\n";
    echo "Animal Type: " . ($case->animal_type ?? 'NULL') . "\n";
    echo "Category: " . ($case->bite_category ?? 'NULL') . "\n";
    
    if ($case->intake) {
        echo "Intake Object: Loaded\n";
        echo "  Intake bite_location: " . ($case->intake->bite_location ?? 'NULL') . "\n";
        echo "  Intake animal_type: " . ($case->intake->animal_type ?? 'NULL') . "\n";
    } else {
        echo "Intake Object: NULL\n";
    }
    
    echo "-------------------\n\n";
}
