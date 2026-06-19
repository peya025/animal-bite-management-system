# Controller Update Guide

## Overview
This guide shows exactly what needs to be changed in existing controllers to work with the new merged schema.

---

## 1. QueueController.php

### ❌ OLD CODE (Remove):
```php
use App\Models\PatientQueue;

$queue = PatientQueue::create([
    'clinic_id' => $clinicId,
    'patient_id' => $patientId,
    'bite_incident_id' => $biteId,
    'queue_number' => $queueNumber,
    'queue_date' => now()->toDateString(),
    'visit_type' => 'new_case',
    'priority' => 'normal',
    'status' => 'waiting',
    'checked_in_by' => auth()->id(),
]);
```

### ✅ NEW CODE (Replace with):
```php
use App\Models\Queue;
use Illuminate\Support\Str;

$queue = Queue::create([
    'queue_id' => 'Q-' . Str::uuid(),
    'clinic_id' => $clinicId,
    'patient_id' => $patientId,
    'appointment_id' => $appointmentId, // if from appointment
    'bite_id' => $biteId, // changed from bite_incident_id
    'queue_number' => $queueNumber,
    'queue_date' => now()->toDateString(),
    'visit_type' => 'new_case',
    'priority' => 'normal',
    'status' => 'waiting',
    'checked_in_by' => auth()->id(),
]);
```

### Changes Summary:
- Model: `PatientQueue` → `Queue`
- Add: `queue_id` (string UUID)
- Change: `bite_incident_id` → `bite_id`
- Add: `appointment_id` (nullable)

---

## 2. VaccinationController.php

### ❌ OLD CODE (Remove):
```php
use App\Models\VaccinationSchedule;

// Create vaccination schedule
$schedule = VaccinationSchedule::create([
    'clinic_id' => $clinicId,
    'bite_incident_id' => $biteId,
    'patient_id' => $patientId,
    'protocol_type' => 'standard',
    'dose_number' => 0,
    'scheduled_date' => $biteDate,
    'status' => 'scheduled',
    'scheduled_by' => auth()->id(),
]);

// Administer vaccination
$schedule->update([
    'status' => 'completed',
    'administered_at' => now(),
    'administered_by' => auth()->id(),
    'vaccine_brand' => $request->vaccine_brand,
    'vaccine_batch_number' => $request->batch_number,
]);
```

### ✅ NEW CODE (Replace with):
```php
use App\Models\TreatmentRecord;
use Illuminate\Support\Str;

// Create vaccination schedule (same as treatment record with status='scheduled')
$schedule = TreatmentRecord::create([
    'treatment_id' => 'TR-' . Str::uuid(),
    'clinic_id' => $clinicId,
    'bite_id' => $biteId, // changed from bite_incident_id
    'patient_id' => $patientId,
    'appointment_id' => $appointmentId, // nullable
    'inventory_id' => null, // will be set when administered
    'protocol_type' => 'standard',
    'dose_number' => 0,
    'scheduled_date' => $biteDate,
    'status' => 'scheduled',
    'scheduled_by' => auth()->id(),
]);

// Administer vaccination
$schedule->update([
    'status' => 'completed',
    'treatment_date' => now(), // NEW: actual administration datetime
    'administered_at' => now(),
    'administered_by' => auth()->id(),
    'vaccine_brand' => $request->vaccine_brand,
    'batch_no' => $request->batch_number, // changed from vaccine_batch_number
    'inventory_id' => $request->inventory_id, // NEW: track which inventory used
    'injection_site' => $request->injection_site, // NEW
    'dosage_ml' => $request->dosage_ml, // NEW
]);
```

### Changes Summary:
- Model: `VaccinationSchedule` → `TreatmentRecord`
- Add: `treatment_id` (string UUID)
- Change: `bite_incident_id` → `bite_id`
- Add: `appointment_id`, `inventory_id`
- Add: `treatment_date` (actual administration time)
- Change: `vaccine_batch_number` → `batch_no`
- Add: `injection_site`, `dosage_ml`

---

## 3. BiteCaseController.php

### ❌ OLD CODE (Remove):
```php
$biteCase = BiteIncident::create([
    'clinic_id' => $clinicId,
    'patient_id' => $patientId,
    'case_number' => $caseNumber,
    'bite_date' => $request->bite_date,
    'bite_place' => $request->bite_place, // Just string description
    // ... other fields
]);

// Get vaccinations for this case
$vaccinations = $biteCase->vaccinationSchedules;
```

### ✅ NEW CODE (Replace with):
```php
use App\Models\BiteLocation;
use Illuminate\Support\Str;

// Create bite case
$biteCase = BiteIncident::create([
    'clinic_id' => $clinicId,
    'patient_id' => $patientId,
    'case_number' => $caseNumber,
    'bite_date' => $request->bite_date,
    'bite_place' => $request->bite_place, // Keep for reference
    // ... other fields
]);

// Create geographic location (NEW)
if ($request->has('latitude') || $request->has('address')) {
    BiteLocation::create([
        'location_id' => 'LOC-' . Str::uuid(),
        'bite_id' => $biteCase->bite_id,
        'bite_address' => $request->bite_address,
        'latitude' => $request->latitude,
        'longitude' => $request->longitude,
        'barangay' => $request->barangay,
        'municipality' => $request->municipality,
    ]);
}

// Get treatment records (vaccinations) for this case
$treatments = $biteCase->treatmentRecords; // changed from vaccinationSchedules
```

### Changes Summary:
- Add: BiteLocation creation for geographic tracking
- Change: `$biteCase->vaccinationSchedules` → `$biteCase->treatmentRecords`
- Add: Support for GPS coordinates and detailed location

---

## 4. PatientController.php

### ❌ OLD CODE (Remove):
```php
// Get patient with vaccinations
$patient = Patient::with(['biteIncidents', 'vaccinationSchedules', 'queueEntries'])->find($id);

// Get pending vaccinations
$pending = $patient->vaccinationSchedules()
    ->where('status', 'scheduled')
    ->get();
```

### ✅ NEW CODE (Replace with):
```php
// Get patient with new relationships
$patient = Patient::with([
    'biteIncidents',
    'treatmentRecords', // changed from vaccinationSchedules
    'queues', // changed from queueEntries
    'appointments', // NEW
    'notifications' // NEW
])->find($id);

// Get pending vaccinations (same helper method, different table)
$pending = $patient->treatmentRecords()
    ->where('status', 'scheduled')
    ->get();
```

### Changes Summary:
- Change: `vaccinationSchedules` → `treatmentRecords`
- Change: `queueEntries` → `queues`
- Add: `appointments`, `notifications` relationships

---

## 5. NEW Controllers Needed

### AppointmentController.php
```php
<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AppointmentController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'patient_id' => 'required|exists:patients,patient_id',
            'scheduled_date' => 'required|date',
            'staff_id' => 'nullable|exists:users,id',
        ]);

        $appointment = Appointment::create([
            'appointment_id' => 'APT-' . Str::uuid(),
            'patient_id' => $request->patient_id,
            'staff_id' => $request->staff_id ?? auth()->id(),
            'scheduled_date' => $request->scheduled_date,
            'status' => 'scheduled',
        ]);

        // Send notification
        Notification::create([
            'notification_id' => 'NOTIF-' . Str::uuid(),
            'patient_id' => $request->patient_id,
            'appointment_id' => $appointment->appointment_id,
            'type' => 'sms',
            'status' => 'pending',
        ]);

        return response()->json($appointment, 201);
    }

    // Add: index, show, update, destroy methods
}
```

### VaccineInventoryController.php
```php
<?php

namespace App\Http\Controllers;

use App\Models\VaccineInventory;
use App\Models\InventoryTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VaccineInventoryController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'vaccine_type' => 'required|string',
            'batch_number' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'expiration_date' => 'required|date',
        ]);

        $inventory = VaccineInventory::create([
            'inventory_id' => 'INV-' . Str::uuid(),
            'clinic_id' => auth()->user()->clinic_id,
            'vaccine_type' => $request->vaccine_type,
            'batch_number' => $request->batch_number,
            'current_quantity' => $request->quantity,
            'expiration_date' => $request->expiration_date,
            'status' => 'active',
        ]);

        // Log transaction
        InventoryTransaction::create([
            'transaction_id' => 'TXN-' . Str::uuid(),
            'inventory_id' => $inventory->inventory_id,
            'staff_id' => auth()->id(),
            'transaction_type' => 'received',
            'quantity' => $request->quantity,
            'transaction_date' => now(),
            'remarks' => 'Initial stock',
        ]);

        return response()->json($inventory, 201);
    }

    // Add: index, show, update, destroy, deduct methods
}
```

---

## API Route Updates

### ❌ OLD ROUTES (Remove):
```php
Route::prefix('vaccinations')->group(function () {
    Route::get('/', [VaccinationController::class, 'index']);
    // ...
});

Route::prefix('queue')->group(function () {
    Route::get('/', [QueueController::class, 'index']);
    // ...
});
```

### ✅ NEW ROUTES (Replace with):
```php
// Treatments (replaces vaccinations)
Route::prefix('treatments')->group(function () {
    Route::get('/', [TreatmentController::class, 'index']); // Renamed controller
    Route::post('/', [TreatmentController::class, 'store']);
    Route::get('/{id}', [TreatmentController::class, 'show']);
    Route::put('/{id}', [TreatmentController::class, 'update']);
    Route::post('/{id}/administer', [TreatmentController::class, 'administer']);
});

// Queues (replaces queue)
Route::prefix('queues')->group(function () {
    Route::get('/', [QueueController::class, 'index']);
    Route::post('/', [QueueController::class, 'store']);
    Route::get('/{id}', [QueueController::class, 'show']);
    Route::post('/{id}/call', [QueueController::class, 'call']);
    Route::post('/{id}/complete', [QueueController::class, 'complete']);
});

// NEW: Appointments
Route::prefix('appointments')->group(function () {
    Route::get('/', [AppointmentController::class, 'index']);
    Route::post('/', [AppointmentController::class, 'store']);
    Route::get('/{id}', [AppointmentController::class, 'show']);
    Route::put('/{id}', [AppointmentController::class, 'update']);
    Route::post('/{id}/cancel', [AppointmentController::class, 'cancel']);
});

// NEW: Inventory
Route::prefix('inventory')->group(function () {
    Route::get('/', [VaccineInventoryController::class, 'index']);
    Route::post('/', [VaccineInventoryController::class, 'store']);
    Route::get('/{id}', [VaccineInventoryController::class, 'show']);
    Route::put('/{id}', [VaccineInventoryController::class, 'update']);
    Route::post('/{id}/deduct', [VaccineInventoryController::class, 'deduct']);
    Route::get('/{id}/transactions', [VaccineInventoryController::class, 'transactions']);
});

// NEW: Notifications
Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::post('/', [NotificationController::class, 'store']);
    Route::post('/{id}/send', [NotificationController::class, 'send']);
});
```

---

## Testing Commands

After updating controllers, test with:

```bash
# Test queue creation
curl -X POST http://localhost:8000/api/queues \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "patient_id=P-2026-0001&visit_type=new_case"

# Test treatment record creation
curl -X POST http://localhost:8000/api/treatments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "patient_id=P-2026-0001&dose_number=0&scheduled_date=2026-06-19"

# Test appointment creation
curl -X POST http://localhost:8000/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "patient_id=P-2026-0001&scheduled_date=2026-06-20 09:00:00"
```

---

*Controller Update Guide: June 19, 2026*
*Follow this guide to update all controllers for the new merged schema*
